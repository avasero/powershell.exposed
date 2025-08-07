-- Execute este script no SQL Editor do Supabase

-- 1. PRIMEIRO: Remover view que depende de risk_score
DROP VIEW IF EXISTS user_analysis_stats;

-- 2. Alterar risk_score para DECIMAL
ALTER TABLE powershell_analyses 
ALTER COLUMN risk_score TYPE DECIMAL(4,1);

-- 3. Remover coluna severity
ALTER TABLE powershell_analyses 
DROP COLUMN IF EXISTS severity;

-- 4. Adicionar novas colunas
ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS signature_file TEXT;

ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS tactics JSONB DEFAULT '[]'::jsonb;

ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS techniques JSONB DEFAULT '[]'::jsonb;

-- 5. Remover índice antigo
DROP INDEX IF EXISTS idx_powershell_analyses_severity;

-- 6. Adicionar novos índices
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_signature_file ON powershell_analyses(signature_file);
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_tactics ON powershell_analyses USING GIN(tactics);
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_techniques ON powershell_analyses USING GIN(techniques);

-- 7. Recriar view com novas faixas de score
CREATE VIEW user_analysis_stats AS
SELECT 
  user_id,
  COUNT(*) as total_analyses,
  COUNT(*) FILTER (WHERE risk_score >= 8.1) as critical_count,
  COUNT(*) FILTER (WHERE risk_score >= 6.1 AND risk_score <= 8.0) as high_count,
  COUNT(*) FILTER (WHERE risk_score >= 4.1 AND risk_score <= 6.0) as medium_count,
  COUNT(*) FILTER (WHERE risk_score >= 2.1 AND risk_score <= 4.0) as low_count,
  COUNT(*) FILTER (WHERE risk_score >= 1.0 AND risk_score <= 2.0) as very_low_count,
  AVG(risk_score) as avg_risk_score,
  MAX(created_at) as last_analysis_date,
  COUNT(*) FILTER (WHERE tactics ? 'Persistence') as persistence_count,
  COUNT(*) FILTER (WHERE tactics ? 'Defense Evasion') as defense_evasion_count,
  COUNT(*) FILTER (WHERE tactics ? 'Execution') as execution_count,
  COUNT(*) FILTER (WHERE tactics ? 'Privilege Escalation') as privilege_escalation_count
FROM powershell_analyses
GROUP BY user_id;
