-- Migration: Add link column to powershell_signatures table
-- Date: 2025-01-15

-- Add link column to store manual YAML links
ALTER TABLE public.powershell_signatures 
ADD COLUMN link text NULL;

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.powershell_signatures.link IS 'Manual link to the YAML indicator file in the repository';

-- Create index on link column for better performance
CREATE INDEX IF NOT EXISTS idx_powershell_signatures_link 
ON public.powershell_signatures USING btree (link) 
WHERE link IS NOT NULL;
