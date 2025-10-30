-- MIGRATION: Fix cache_results phash column to accept CRC32 hash values
-- The problem: phash was defined as IDENTITY (auto-increment) instead of accepting the calculated hash

-- 1. Drop existing table and recreate with correct structure
DROP TABLE IF EXISTS public.cache_results CASCADE;

-- 2. Recreate table with phash as regular BIGINT (not IDENTITY)
CREATE TABLE public.cache_results (
  phash BIGINT NOT NULL,  -- CRC32 hash value (NOT auto-increment)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  indicators_matched JSON NULL,
  results_blob JSONB NULL,
  CONSTRAINT cache_results_pkey PRIMARY KEY (phash)
);

-- 3. Recreate indexes
CREATE INDEX idx_cache_results_phash ON public.cache_results USING BTREE (phash);
CREATE INDEX idx_cache_results_created_at ON public.cache_results USING BTREE (created_at DESC);

-- 4. Add comment explaining the fix
COMMENT ON TABLE public.cache_results IS 
'Cache table for PowerShell analysis results. FIXED: phash now accepts CRC32 hash values instead of auto-incrementing.';

COMMENT ON COLUMN public.cache_results.phash IS 
'CRC32 hash of the PowerShell command (calculated value, NOT auto-increment)';
