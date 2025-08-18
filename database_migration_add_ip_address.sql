-- Migration: Add IP Address column to powershell_analyses table
-- Date: 2024-12-19
-- Description: Add IP address tracking for security analysis

-- Add the IP address column
ALTER TABLE public.powershell_analyses 
ADD COLUMN ip_address inet NULL;

-- Create index for the new column (recommended for queries)
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_ip_address 
ON public.powershell_analyses USING btree (ip_address) 
TABLESPACE pg_default;

-- Add comment to document the column
COMMENT ON COLUMN public.powershell_analyses.ip_address IS 'IP address of the computer that performed the analysis';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' 
AND column_name = 'ip_address';

-- Show table structure
\d+ public.powershell_analyses
