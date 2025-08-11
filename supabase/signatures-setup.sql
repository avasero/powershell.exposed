-- Criar tabela para armazenar as signatures YAML
CREATE TABLE powershell_signatures (
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

-- Inserir as 6 signatures YAML
INSERT INTO powershell_signatures (name, description, patterns, basescore, severity, tactics, techniques, reference) VALUES
(
    'Invoke-Expression Cmdlet',
    'Spots potential use of Invoke-Expression cmdlet and its alias.',
    '["Invoke-Expression", "\\\\biex\\\\b"]',
    5.0,
    'medium',
    '["Execution"]',
    '["T1059.001"]',
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'
),
(
    'Long base64 string',
    'Because attackers stuff all kinds of badness into base64 blobs even when they are not using -EncodedCommand. Watching for long base64 inside PowerShell catches a bunch of common tradecraft.',
    '["(?i)[a-z0-9+/=]{100,}", "(?i)^(?!.*[-]e(nc*o*d*e*d*c*o*m*m*a*n*d*)*\\\\s).*"]',
    6.0,
    'medium',
    '["Defense Evasion", "Execution"]',
    '["T1027.001", "T1059.001"]',
    '["https://blogs.vmware.com/security/2023/03/how-to-detect-poshc2-powershell-implants.html", "https://gist.github.com/githubfoam/0f6691b47a71486b25502e4e456d735e"]'
),
(
    'Potential tampering with MS Defender',
    'Spots potential attempts to tamper with MS Defender. Be aware of legit/FP cases (ex.: Get- instead of Set-MpPreference calls).',
    '["Disable(RealtimeMonitoring|BehaviorMonitoring|IOAVProtection|ScriptScanning|IntrusionPreventionSystem|AntiSpyware)", "EnableControlledFolderAccess\\\\s+disabled", "MAPSReporting\\\\s+0", "SubmitSamplesConsent\\\\s+2"]',
    9.7,
    'critical',
    '["Defense Evasion"]',
    '["T1562.001", "T1059.001"]',
    '["https://github.com/mdecrevoisier/SIGMA-detection-rules/blob/main/windows-defender/defender-critical%20security%20components%20disabled%20(PowerShell).yaml"]'
),
(
    'Scheduled Task modification',
    'Spots potential Windows Task creation/modification via the most common forms/cmdlets.',
    '["\\\\bRegister-ScheduledTask", "New-(ScheduledTaskTrigger|ScheduledTaskAction)", "Win32_ScheduledJob.+create", "schtasks.+\\\\s\\/create", "Schedule\\\\.Service.+\\\\.create"]',
    9.7,
    'critical',
    '["Persistence", "Privilege Escalation"]',
    '["T1053.005", "T1059.001"]',
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/powershell/powershell_script/posh_ps_cmdlet_scheduled_task.yml", "https://github.com/redcanaryco/atomic-red-team/blob/f339e7da7d05f6057fdfcdd3742bfcf365fee2a9/atomics/T1053.005/T1053.005.md#atomic-test-4---powershell-cmdlet-scheduled-task"]'
),
(
    'Service Creation',
    'Spots potential service creation via New-Service PS cmdlet and sc.exe.',
    '["\\\\bnew-service\\\\s", "\\\\bsc(.exe)*\\\\s+create\\\\s"]',
    7.6,
    'high',
    '["Persistence", "Privilege Escalation"]',
    '["T1543.003", "T1059.001"]',
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_service_creation.yml"]'
),
(
    'Web Client traces',
    'Spots potential attempts to use PS as a web client to access network resources.',
    '["RestMethod", "[\\\\.-]webclient", "WebRequest", "Net.Sockets.TcpClient", "InternetExplorer\\\\.Application", "(win|Xml)Http", "\\\\b(curl|wget|iwr|irm)\\\\s+"]',
    7.5,
    'high',
    '["Execution"]',
    '["T1105", "T1059.001"]',
    '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'
);

-- Criar índices para performance
CREATE INDEX idx_powershell_signatures_active ON powershell_signatures(is_active);
CREATE INDEX idx_powershell_signatures_severity ON powershell_signatures(severity);

-- Adicionar RLS policy
ALTER TABLE powershell_signatures ENABLE ROW LEVEL SECURITY;

-- Policy para leitura (todas as signatures ativas são públicas para análise)
CREATE POLICY "Allow read access to active signatures" ON powershell_signatures
    FOR SELECT USING (is_active = true);
