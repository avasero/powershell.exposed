-- Migration: Add is_cache column to powershell_analyses table
-- This column indicates whether the analysis result came from cache or was freshly analyzed

-- Add the is_cache column with default value false
ALTER TABLE public.powershell_analyses 
ADD COLUMN IF NOT EXISTS is_cache boolean NOT NULL DEFAULT false;

-- Create index for cache queries (to analyze cache effectiveness)
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_is_cache 
ON public.powershell_analyses USING btree (is_cache) TABLESPACE pg_default;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.powershell_analyses.is_cache IS 'Indicates whether this analysis result came from cache (true) or was freshly analyzed (false)';

-- Example queries for cache analysis:
-- SELECT COUNT(*) as total_analyses, 
--        SUM(CASE WHEN is_cache THEN 1 ELSE 0 END) as cache_hits,
--        ROUND(100.0 * SUM(CASE WHEN is_cache THEN 1 ELSE 0 END) / COUNT(*), 2) as cache_hit_rate
-- FROM powershell_analyses 
-- WHERE created_at >= NOW() - INTERVAL '24 hours';