-- MIGRATION: Reorganize powershell_analyses table - remove redundancy
-- Consolidates duplicated data (analysis_result JSONB + individual columns)

-- 1. Remove duplicate/redundant columns and keep only essential ones
ALTER TABLE public.powershell_analyses DROP COLUMN IF EXISTS analysis_result;
ALTER TABLE public.powershell_analyses DROP COLUMN IF EXISTS signature_file;

-- 2. Ensure all analysis data is in dedicated columns (remove nested duplicates)
ALTER TABLE public.powershell_analyses 
  ALTER COLUMN risk_score SET DEFAULT 0.0,
  ALTER COLUMN is_malicious SET DEFAULT false,
  ALTER COLUMN severity SET DEFAULT 'very_low',
  ALTER COLUMN signatures_detected SET DEFAULT '[]'::jsonb,
  ALTER COLUMN tactics SET DEFAULT '[]'::jsonb,
  ALTER COLUMN techniques SET DEFAULT '[]'::jsonb,
  ALTER COLUMN cmdlets_detected SET DEFAULT '[]'::jsonb,
  ALTER COLUMN search_type SET DEFAULT 'WEB';

-- 3. Make NOT NULL constraints where appropriate
ALTER TABLE public.powershell_analyses
  ALTER COLUMN command SET NOT NULL,
  ALTER COLUMN uuid SET NOT NULL,
  ALTER COLUMN search_type SET NOT NULL;

-- 4. Remove duplicate/redundant indexes
DROP INDEX IF EXISTS idx_powershell_analyses_short_id_lookup;
DROP INDEX IF EXISTS idx_powershell_analyses_signature_file;

-- 5. Consolidate short_id indexes
DROP INDEX IF EXISTS idx_powershell_analyses_short_id;
CREATE UNIQUE INDEX idx_powershell_analyses_short_id 
  ON public.powershell_analyses(short_id) 
  WHERE short_id IS NOT NULL;

-- 6. Keep only essential indexes (remove duplicates and recreate cleanly)
DROP INDEX IF EXISTS idx_powershell_analyses_uuid;
DROP INDEX IF EXISTS idx_powershell_analyses_user_id;
DROP INDEX IF EXISTS idx_powershell_analyses_session_id;
DROP INDEX IF EXISTS idx_powershell_analyses_created_at;
DROP INDEX IF EXISTS idx_powershell_analyses_risk_score;
DROP INDEX IF EXISTS idx_powershell_analyses_is_malicious;
DROP INDEX IF EXISTS idx_powershell_analyses_severity;
DROP INDEX IF EXISTS idx_powershell_analyses_tactics;
DROP INDEX IF EXISTS idx_powershell_analyses_techniques;
DROP INDEX IF EXISTS idx_powershell_analyses_cmdlets;
DROP INDEX IF EXISTS idx_powershell_analyses_search_type;
DROP INDEX IF EXISTS idx_powershell_analyses_is_cache;

-- Recreate indexes cleanly
CREATE INDEX idx_powershell_analyses_uuid ON public.powershell_analyses(uuid);
CREATE INDEX idx_powershell_analyses_user_id ON public.powershell_analyses(user_id);
CREATE INDEX idx_powershell_analyses_session_id ON public.powershell_analyses(session_id);
CREATE INDEX idx_powershell_analyses_created_at ON public.powershell_analyses(created_at DESC);
CREATE INDEX idx_powershell_analyses_risk_score ON public.powershell_analyses(risk_score DESC);
CREATE INDEX idx_powershell_analyses_is_malicious ON public.powershell_analyses(is_malicious);
CREATE INDEX idx_powershell_analyses_severity ON public.powershell_analyses(severity);
CREATE INDEX idx_powershell_analyses_tactics ON public.powershell_analyses USING GIN(tactics);
CREATE INDEX idx_powershell_analyses_techniques ON public.powershell_analyses USING GIN(techniques);
CREATE INDEX idx_powershell_analyses_cmdlets ON public.powershell_analyses USING GIN(cmdlets_detected);
CREATE INDEX idx_powershell_analyses_search_type ON public.powershell_analyses(search_type);
CREATE INDEX idx_powershell_analyses_is_cache ON public.powershell_analyses(is_cache);

-- 7. Add composite indexes for common queries
DROP INDEX IF EXISTS idx_analyses_user_created;
CREATE INDEX idx_analyses_user_created 
  ON public.powershell_analyses(user_id, created_at DESC);

DROP INDEX IF EXISTS idx_analyses_session_created;
CREATE INDEX idx_analyses_session_created 
  ON public.powershell_analyses(session_id, created_at DESC);

DROP INDEX IF EXISTS idx_analyses_malicious_score;
CREATE INDEX idx_analyses_malicious_score 
  ON public.powershell_analyses(is_malicious, risk_score DESC);

-- 8. Update column comments to clarify what should be stored
COMMENT ON TABLE public.powershell_analyses IS 
'PowerShell command analysis results. Clean structure: no duplicate data between columns.';

COMMENT ON COLUMN public.powershell_analyses.risk_score IS 
'Numeric risk score (0.0-10.0). Single source of truth for risk level.';

COMMENT ON COLUMN public.powershell_analyses.is_malicious IS 
'Boolean flag: true if risk_score >= 5.0, false otherwise. Derived from risk_score.';

COMMENT ON COLUMN public.powershell_analyses.severity IS 
'Text representation of risk level: very_low (1-2), low (2-4), medium (4-6), high (6-8), critical (8-10).';

COMMENT ON COLUMN public.powershell_analyses.signatures_detected IS 
'JSONB array of detected signature objects. Only array, no nested duplication.';

COMMENT ON COLUMN public.powershell_analyses.tactics IS 
'JSONB array of MITRE ATT&CK tactics (strings only).';

COMMENT ON COLUMN public.powershell_analyses.techniques IS 
'JSONB array of MITRE ATT&CK techniques (strings only).';

COMMENT ON COLUMN public.powershell_analyses.cmdlets_detected IS 
'JSONB array of detected PowerShell cmdlets (strings only).';

COMMENT ON COLUMN public.powershell_analyses.uuid IS 
'Globally unique identifier for sharing/referencing this analysis.';

COMMENT ON COLUMN public.powershell_analyses.short_id IS 
'Short URL-friendly identifier (8 chars alphanumeric) for sharing links.';

-- 9. Recreate trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_powershell_analyses_updated_at ON public.powershell_analyses;
CREATE TRIGGER update_powershell_analyses_updated_at 
  BEFORE UPDATE ON public.powershell_analyses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.powershell_analyses TO authenticated;
GRANT SELECT, INSERT ON public.powershell_analyses TO anon;
GRANT ALL ON public.powershell_analyses TO service_role;
