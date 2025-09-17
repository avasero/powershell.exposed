-- Add API key fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN api_key TEXT NULL UNIQUE,
ADD COLUMN api_key_name TEXT NULL DEFAULT 'Default API Key',
ADD COLUMN api_key_created_at TIMESTAMPTZ NULL,
ADD COLUMN api_key_last_used_at TIMESTAMPTZ NULL,
ADD COLUMN api_key_usage_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN api_key_is_active BOOLEAN NOT NULL DEFAULT false;

-- Create index for fast API key lookups
CREATE INDEX idx_profiles_api_key ON public.profiles(api_key) WHERE api_key IS NOT NULL AND api_key_is_active = true;

-- Function to increment API key usage count
CREATE OR REPLACE FUNCTION increment_api_key_usage_count(api_key_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE public.profiles 
    SET 
        api_key_usage_count = api_key_usage_count + 1,
        api_key_last_used_at = NOW()
    WHERE api_key = api_key_param AND api_key_is_active = true;
    
    SELECT api_key_usage_count INTO new_count
    FROM public.profiles 
    WHERE api_key = api_key_param AND api_key_is_active = true;
    
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_api_key_usage_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_api_key_usage_count(TEXT) TO service_role;

-- Comment on new columns
COMMENT ON COLUMN public.profiles.api_key IS 'User API key for external API access (format: pse_xxxxx)';
COMMENT ON COLUMN public.profiles.api_key_name IS 'Human readable name for the API key';
COMMENT ON COLUMN public.profiles.api_key_created_at IS 'When the API key was created';
COMMENT ON COLUMN public.profiles.api_key_last_used_at IS 'When the API key was last used';
COMMENT ON COLUMN public.profiles.api_key_usage_count IS 'Number of times the API key has been used';
COMMENT ON COLUMN public.profiles.api_key_is_active IS 'Whether the API key is active and can be used';
