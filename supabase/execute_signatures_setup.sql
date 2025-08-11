-- Execute este script no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/vluiqlsotcncfpizwmhb/sql/new

-- 1. Criar tabela para signatures
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

-- 2. Limpar tabela se existir
DELETE FROM powershell_signatures;

-- 3. Inserir as 6 signatures YAML
INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques) VALUES
('Invoke-Expression Cmdlet', 'Spots potential use of Invoke-Expression cmdlet and its alias.', '["Invoke-Expression", "iex"]', 5.0, 'medium', '["Execution"]', '["T1059.001"]'),
('Long base64 string', 'Because attackers stuff all kinds of badness into base64 blobs.', '["FromBase64String", "-EncodedCommand", "[a-zA-Z0-9+/]{50,}"]', 6.0, 'medium', '["Defense Evasion", "Execution"]', '["T1027.001", "T1059.001"]'),
('Potential tampering with MS Defender', 'Spots potential attempts to tamper with MS Defender.', '["Set-MpPreference", "DisableRealtimeMonitoring", "DisableBehaviorMonitoring"]', 9.7, 'critical', '["Defense Evasion"]', '["T1562.001", "T1059.001"]'),
('Scheduled Task modification', 'Spots potential Windows Task creation/modification.', '["Register-ScheduledTask", "New-ScheduledTaskTrigger", "schtasks"]', 9.7, 'critical', '["Persistence", "Privilege Escalation"]', '["T1053.005", "T1059.001"]'),
('Service Creation', 'Spots potential service creation via New-Service PS cmdlet and sc.exe.', '["New-Service", "sc create", "sc.exe create"]', 7.6, 'high', '["Persistence", "Privilege Escalation"]', '["T1543.003", "T1059.001"]'),
('Web Client traces', 'Spots potential attempts to use PS as a web client.', '["Invoke-RestMethod", "Invoke-WebRequest", "WebClient", "iwr", "irm", "curl", "wget"]', 7.5, 'high', '["Execution"]', '["T1105", "T1059.001"]');

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_powershell_signatures_active ON powershell_signatures(is_active);
CREATE INDEX IF NOT EXISTS idx_powershell_signatures_severity ON powershell_signatures(severity);

-- 5. Configurar RLS
ALTER TABLE powershell_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to active signatures" ON powershell_signatures;
CREATE POLICY "Allow read access to active signatures" ON powershell_signatures FOR SELECT USING (is_active = true);

-- 6. Verificar se foi inserido corretamente
SELECT name, severity, basescore, patterns FROM powershell_signatures WHERE is_active = true ORDER BY basescore DESC;
