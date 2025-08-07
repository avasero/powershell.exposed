-- Scripts de UPDATE para as tabelas existentes do Supabase
-- Execute estes comandos no SQL Editor do Supabase

-- 1. Atualizar a tabela powershell_analyses
-- Alterar risk_score de INTEGER para DECIMAL(3,1)
ALTER TABLE powershell_analyses 
ALTER COLUMN risk_score TYPE DECIMAL(3,1);

-- Remover a coluna severity (agora usamos apenas basescore)
ALTER TABLE powershell_analyses 
DROP COLUMN IF EXISTS severity;

-- Adicionar coluna para armazenar o nome do arquivo de signature detectado
ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS signature_file TEXT;

-- Adicionar coluna para táticas MITRE ATT&CK
ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS tactics JSONB DEFAULT '[]'::jsonb;

-- Adicionar coluna para técnicas MITRE ATT&CK  
ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS techniques JSONB DEFAULT '[]'::jsonb;

-- 2. Remover índices antigos relacionados ao severity
DROP INDEX IF EXISTS idx_powershell_analyses_severity;

-- 3. Adicionar novos índices
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_signature_file ON powershell_analyses(signature_file);
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_tactics ON powershell_analyses USING GIN(tactics);
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_techniques ON powershell_analyses USING GIN(techniques);

-- 4. Recriar a view com as novas faixas de score baseadas em cores
DROP VIEW IF EXISTS user_analysis_stats;

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
  -- Estatísticas por táticas mais comuns
  COUNT(*) FILTER (WHERE tactics ? 'Persistence') as persistence_count,
  COUNT(*) FILTER (WHERE tactics ? 'Defense Evasion') as defense_evasion_count,
  COUNT(*) FILTER (WHERE tactics ? 'Execution') as execution_count,
  COUNT(*) FILTER (WHERE tactics ? 'Privilege Escalation') as privilege_escalation_count
FROM powershell_analyses
GROUP BY user_id;

-- 5. Criar tabela para cache de signatures carregadas (opcional para performance)
CREATE TABLE IF NOT EXISTS signature_cache (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  regex_pattern TEXT NOT NULL,
  basescore DECIMAL(3,1) NOT NULL,
  tactic JSONB DEFAULT '[]'::jsonb,
  technique JSONB DEFAULT '[]'::jsonb,
  reference JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar índices para a tabela de cache
CREATE INDEX IF NOT EXISTS idx_signature_cache_filename ON signature_cache(filename);
CREATE INDEX IF NOT EXISTS idx_signature_cache_basescore ON signature_cache(basescore DESC);
CREATE INDEX IF NOT EXISTS idx_signature_cache_tactic ON signature_cache USING GIN(tactic);

-- 7. Função para popular o cache de signatures (executar após criar os arquivos)
CREATE OR REPLACE FUNCTION refresh_signature_cache()
RETURNS void AS $$
BEGIN
  -- Limpar cache existente
  TRUNCATE signature_cache;
  
  -- Popular com as 5 signatures principais
  INSERT INTO signature_cache (filename, name, description, regex_pattern, basescore, tactic, technique, reference) VALUES
  (
    'ps_indicator_scheduled_task_modification.yaml',
    'Scheduled Task modification',
    'Spots potential Windows Task creation/modification via the most common forms/cmdlets.',
    '(?i)\bRegister-ScheduledTask|New-(ScheduledTaskTrigger|ScheduledTaskAction)|Win32_ScheduledJob.+create|schtasks.+\s/create|Schedule\.Service.+\.create',
    9.7,
    '["Persistence", "Privilege Escalation"]'::jsonb,
    '["T1053.005", "T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/powershell/powershell_script/posh_ps_cmdlet_scheduled_task.yml"]'::jsonb
  ),
  (
    'ps_indicator_ms_defender_tampering.yaml',
    'Potential tampering with MS Defender',
    'Spots potential attempts to tamper with MS Defender. Be aware of legit/FP cases (ex.: Get- instead of Set-MpPreference calls).',
    '(?i)Disable(RealtimeMonitoring|BehaviorMonitoring|IOAVProtection|ScriptScanning|IntrusionPreventionSystem|AntiSpyware)|EnableControlledFolderAccess\s+disabled|MAPSReporting\s+0|SubmitSamplesConsent\s+2',
    9.7,
    '["Defense Evasion"]'::jsonb,
    '["T1562.001", "T1059.001"]'::jsonb,
    '["https://github.com/mdecrevoisier/SIGMA-detection-rules/blob/main/windows-defender/defender-critical%20security%20components%20disabled%20(PowerShell).yaml"]'::jsonb
  ),
  (
    'ps_indicator_web_client_traces.yaml',
    'Web Client traces',
    'Spots potential attempts to use PS as a web client to access network resources.',
    '(?i)RestMethod|[\.-]webclient|WebRequest|Net.Sockets.TcpClient|InternetExplorer\.Application|(win|Xml)Http|\b(curl|wget|iwr|irm)\s+',
    7.5,
    '["Execution"]'::jsonb,
    '["T1105", "T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'::jsonb
  ),
  (
    'ps_indicator_service_creation.yaml',
    'Service Creation',
    'Spots potential service creation via New-Service PS cmdlet and sc.exe.',
    '(?i)\bnew-service\s|\bsc(.exe)*\s+create\s',
    7.6,
    '["Persistence", "Privilege Escalation"]'::jsonb,
    '["T1543.003", "T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_service_creation.yml"]'::jsonb
  ),
  (
    'ps_indicator_invoke_expression.yaml',
    'Invoke-Expression Cmdlet',
    'Spots potential use of Invoke-Expression cmdlet and its alias.',
    '(?i)Invoke-Expression|\biex\b',
    5.0,
    '["Execution"]'::jsonb,
    '["T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'::jsonb
  );
  
  RAISE NOTICE 'Signature cache refreshed with % entries', (SELECT COUNT(*) FROM signature_cache);
END;
$$ LANGUAGE plpgsql;

-- 8. Executar a função para popular o cache
SELECT refresh_signature_cache();

-- 9. Comentário sobre migração de dados existentes (opcional)
-- Para migrar dados antigos, descomente e execute:
/*
UPDATE powershell_analyses 
SET risk_score = CASE 
  WHEN severity = 'critical' THEN 9.5
  WHEN severity = 'high' THEN 7.5
  WHEN severity = 'medium' THEN 5.0
  WHEN severity = 'info' THEN 2.5
  ELSE risk_score
END
WHERE risk_score = 0 OR risk_score IS NULL;
*/
