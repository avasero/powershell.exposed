-- Migration: Add IP Location columns to powershell_analyses table
-- Date: 2024-12-19
-- Description: Add IP location tracking for security analysis

-- Add the IP location columns
ALTER TABLE public.powershell_analyses 
ADD COLUMN ip_country text NULL;

ALTER TABLE public.powershell_analyses 
ADD COLUMN ip_city text NULL;

ALTER TABLE public.powershell_analyses 
ADD COLUMN ip_region text NULL;

ALTER TABLE public.powershell_analyses 
ADD COLUMN ip_timezone text NULL;

-- Create indexes for the new columns (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_ip_country 
ON public.powershell_analyses USING btree (ip_country) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_powershell_analyses_ip_city 
ON public.powershell_analyses USING btree (ip_city) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_powershell_analyses_ip_region 
ON public.powershell_analyses USING btree (ip_region) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_powershell_analyses_ip_timezone 
ON public.powershell_analyses USING btree (ip_timezone) 
TABLESPACE pg_default;

-- Add comments to document the columns
COMMENT ON COLUMN public.powershell_analyses.ip_country IS 'Country of the IP address that performed the analysis';
COMMENT ON COLUMN public.powershell_analyses.ip_city IS 'City of the IP address that performed the analysis';
COMMENT ON COLUMN public.powershell_analyses.ip_region IS 'Region/State of the IP address that performed the analysis';
COMMENT ON COLUMN public.powershell_analyses.ip_timezone IS 'Timezone of the IP address that performed the analysis';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' 
AND column_name IN ('ip_address', 'ip_country', 'ip_city', 'ip_region', 'ip_timezone')
ORDER BY ordinal_position;

-- Show table structure
\d+ public.powershell_analyses
