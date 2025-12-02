-- Migration: Create login_attempts table for rate limiting magic link requests
-- This prevents abuse of the magic link email system by tracking attempts per email

BEGIN;

-- Create table to track login/signup attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    attempt_type TEXT NOT NULL DEFAULT 'login', -- 'login' or 'signup'
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Create index for efficient lookups by email and time
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
    ON public.login_attempts (email, attempted_at DESC);

-- Create index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at 
    ON public.login_attempts (attempted_at);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert attempts (needed for login/signup pages)
CREATE POLICY "allow_insert_login_attempts"
    ON public.login_attempts
    FOR INSERT
    WITH CHECK (true);

-- Only allow reading own attempts (by matching email in JWT or service role)
-- For security, we don't allow public SELECT - only service role can read
CREATE POLICY "service_role_select_login_attempts"
    ON public.login_attempts
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Create function to check rate limit (returns true if allowed, false if rate limited)
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
    p_email TEXT,
    p_attempt_type TEXT DEFAULT 'login',
    p_window_minutes INTEGER DEFAULT 3
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_attempt TIMESTAMP WITH TIME ZONE;
    seconds_remaining INTEGER;
    result JSON;
BEGIN
    -- Get the most recent attempt for this email and type within the window
    SELECT attempted_at INTO last_attempt
    FROM public.login_attempts
    WHERE email = LOWER(p_email)
      AND attempt_type = p_attempt_type
      AND attempted_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL
    ORDER BY attempted_at DESC
    LIMIT 1;

    IF last_attempt IS NOT NULL THEN
        -- Calculate seconds remaining
        seconds_remaining := EXTRACT(EPOCH FROM (last_attempt + (p_window_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER;
        
        IF seconds_remaining > 0 THEN
            result := json_build_object(
                'allowed', false,
                'seconds_remaining', seconds_remaining,
                'last_attempt', last_attempt
            );
            RETURN result;
        END IF;
    END IF;

    -- Rate limit passed
    result := json_build_object(
        'allowed', true,
        'seconds_remaining', 0,
        'last_attempt', last_attempt
    );
    RETURN result;
END;
$$;

-- Create function to record a login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
    p_email TEXT,
    p_attempt_type TEXT DEFAULT 'login',
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.login_attempts (email, attempt_type, ip_address, user_agent)
    VALUES (LOWER(p_email), p_attempt_type, p_ip_address, p_user_agent);
END;
$$;

-- Create function to cleanup old attempts (run periodically)
-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS public.cleanup_old_login_attempts();

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete attempts older than 24 hours
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant execute permissions on functions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;

-- Notes:
-- - Rate limit window is configurable (default 3 minutes)
-- - Attempts are tracked by email (lowercased for consistency)
-- - Old attempts are automatically cleaned up after 24 hours
-- - Functions use SECURITY DEFINER to bypass RLS for internal operations
