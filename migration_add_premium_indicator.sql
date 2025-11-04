-- Add is_premium_indicator column to powershell_signatures table
ALTER TABLE public.powershell_signatures 
ADD COLUMN is_premium_indicator BOOLEAN NOT NULL DEFAULT FALSE;
