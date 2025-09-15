-- Migration: Add short_id column to powershell_analyses table
-- Date: 2025-01-15

-- Add short_id column to store short analysis IDs
ALTER TABLE public.powershell_analyses 
ADD COLUMN short_id text NULL;

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.powershell_analyses.short_id IS 'Short 8-character ID for easier sharing and shorter URLs';

-- Create unique index on short_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_powershell_analyses_short_id 
ON public.powershell_analyses USING btree (short_id) 
WHERE short_id IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_short_id_lookup 
ON public.powershell_analyses USING btree (short_id);
