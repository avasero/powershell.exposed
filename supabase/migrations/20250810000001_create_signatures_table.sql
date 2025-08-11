-- Criar tabela para armazenar as signatures YAML
CREATE TABLE IF NOT EXISTS powershell_signatures (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    patterns JSONB NOT NULL,
    basescore DECIMAL(3,1) NOT NULL,
    severity TEXT NOT NULL,
    tactics JSONB NOT NULL,
    techniques JSONB NOT NULL,
    reference JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Inserir as 6 signatures YAML se não existirem
INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques, reference) 
SELECT 
    'Invoke-Expression Cmdlet',
    'Spots potential use of Invoke-Expression cmdlet and its alias.',
    '["Invoke-Expression", "\\\\biex\\\\b"]'::jsonb,
    5.0,
    'medium',
    '["Execution"]'::jsonb,
    '["T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM powershell_signatures WHERE name = 'Invoke-Expression Cmdlet');

INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques, reference) 
SELECT
    'Long base64 string',
    'Because attackers stuff all kinds of badness into base64 blobs even when they are not using -EncodedCommand.',
    '["[a-z0-9+/=]{100,}", "FromBase64String"]'::jsonb,
    6.0,
    'medium',
    '["Defense Evasion", "Execution"]'::jsonb,
    '["T1027.001", "T1059.001"]'::jsonb,
    '["https://blogs.vmware.com/security/2023/03/how-to-detect-poshc2-powershell-implants.html"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM powershell_signatures WHERE name = 'Long base64 string');

INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques, reference)
SELECT
    'Potential tampering with MS Defender',
    'Spots potential attempts to tamper with MS Defender.',
    '["DisableRealtimeMonitoring", "DisableBehaviorMonitoring", "Set-MpPreference"]'::jsonb,
    9.7,
    'critical',
    '["Defense Evasion"]'::jsonb,
    '["T1562.001", "T1059.001"]'::jsonb,
    '["https://github.com/mdecrevoisier/SIGMA-detection-rules/"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM powershell_signatures WHERE name = 'Potential tampering with MS Defender');

INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques, reference)
SELECT
    'Scheduled Task modification',
    'Spots potential Windows Task creation/modification via the most common forms/cmdlets.',
    '["Register-ScheduledTask", "New-ScheduledTaskTrigger", "schtasks"]'::jsonb,
    9.7,
    'critical',
    '["Persistence", "Privilege Escalation"]'::jsonb,
    '["T1053.005", "T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/powershell/"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM powershell_signatures WHERE name = 'Scheduled Task modification');

INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques, reference)
SELECT
    'Service Creation',
    'Spots potential service creation via New-Service PS cmdlet and sc.exe.',
    '["New-Service", "sc create", "sc.exe create"]'::jsonb,
    7.6,
    'high',
    '["Persistence", "Privilege Escalation"]'::jsonb,
    '["T1543.003", "T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM powershell_signatures WHERE name = 'Service Creation');

INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques, reference)
SELECT
    'Web Client traces',
    'Spots potential attempts to use PS as a web client to access network resources.',
    '["Invoke-RestMethod", "Invoke-WebRequest", "WebClient", "iwr", "irm", "curl", "wget"]'::jsonb,
    7.5,
    'high',
    '["Execution"]'::jsonb,
    '["T1105", "T1059.001"]'::jsonb,
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM powershell_signatures WHERE name = 'Web Client traces');

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_powershell_signatures_active ON powershell_signatures(is_active);
CREATE INDEX IF NOT EXISTS idx_powershell_signatures_severity ON powershell_signatures(severity);

-- Adicionar RLS policy
ALTER TABLE powershell_signatures ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todas as signatures ativas são públicas para análise)
DROP POLICY IF EXISTS "Allow read access to active signatures" ON powershell_signatures;
CREATE POLICY "Allow read access to active signatures" ON powershell_signatures
    FOR SELECT USING (is_active = true);
