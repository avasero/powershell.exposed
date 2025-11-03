ALTER TABLE public.powershell_analyses
DROP COLUMN IF EXISTS ip_city,
DROP COLUMN IF EXISTS ip_region,
DROP COLUMN IF EXISTS ip_timezone;
