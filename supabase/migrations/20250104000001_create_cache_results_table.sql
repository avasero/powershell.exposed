-- Migration: Create cache_results table for PowerShell analysis caching
-- This table stores cached analysis results to avoid redundant processing

-- Create the cache_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cache_results (
  phash bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  indicators_matched json NULL,
  results_blob jsonb NULL,
  CONSTRAINT cache_results_pkey PRIMARY KEY (phash)
) TABLESPACE pg_default;

-- Create index for faster lookups on phash (primary key already creates this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_cache_results_phash 
ON public.cache_results USING btree (phash) TABLESPACE pg_default;

-- Create index for cache cleanup/maintenance based on creation date
CREATE INDEX IF NOT EXISTS idx_cache_results_created_at 
ON public.cache_results USING btree (created_at DESC) TABLESPACE pg_default;

-- Add comment to document the table purpose
COMMENT ON TABLE public.cache_results IS 'Cache table for PowerShell analysis results to avoid redundant processing of identical commands';
COMMENT ON COLUMN public.cache_results.phash IS 'CRC32 hash of the normalized PowerShell command';
COMMENT ON COLUMN public.cache_results.created_at IS 'Timestamp when the cache entry was created';
COMMENT ON COLUMN public.cache_results.indicators_matched IS 'JSON array of matched indicators/signatures';
COMMENT ON COLUMN public.cache_results.results_blob IS 'Complete analysis results in JSONB format';

-- Optional: Create a function to clean old cache entries (older than N days)
CREATE OR REPLACE FUNCTION clean_old_cache_entries(days_old integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.cache_results 
    WHERE created_at < (NOW() - INTERVAL '1 day' * days_old);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION clean_old_cache_entries(integer) IS 'Cleanup function to remove cache entries older than specified days (default: 30 days)';

-- Example usage:
-- SELECT clean_old_cache_entries(30); -- Remove entries older than 30 days
-- SELECT clean_old_cache_entries(7);  -- Remove entries older than 7 days