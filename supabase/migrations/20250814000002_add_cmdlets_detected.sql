-- Add cmdlets_detected column to powershell_analyses table
ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS cmdlets_detected JSONB DEFAULT '[]'::jsonb;

-- Create index for cmdlets_detected column for better performance
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_cmdlets_detected ON powershell_analyses USING GIN (cmdlets_detected);

-- Add comment to explain the purpose
COMMENT ON COLUMN powershell_analyses.cmdlets_detected IS 'Array of detected PowerShell cmdlets with their details (alias, cmdlet_name, score, description)';
