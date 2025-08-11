-- Atualizar signatures com os regex patterns corretos dos arquivos YAML
-- Execute no SQL Editor: https://supabase.com/dashboard/project/vluiqlsotcncfpizwmhb/sql/new

-- 1. ps_indicator_invoke_expression.yaml
UPDATE powershell_signatures 
SET patterns = '["Invoke-Expression", "\\\\biex\\\\b"]'::jsonb
WHERE name = 'Invoke-Expression Cmdlet';

-- 2. ps_indicator_long_base64_string.yaml  
UPDATE powershell_signatures 
SET patterns = '["(?i)[a-z0-9+/=]{100,}", "(?i)^(?!.*[-]e(nc*o*d*e*d*c*o*m*m*a*n*d*)*\\\\s).*"]'::jsonb
WHERE name = 'Long base64 string';

-- 3. ps_indicator_ms_defender_tampering.yaml
UPDATE powershell_signatures 
SET patterns = '["Disable(RealtimeMonitoring|BehaviorMonitoring|IOAVProtection|ScriptScanning|IntrusionPreventionSystem|AntiSpyware)", "EnableControlledFolderAccess\\\\s+disabled", "MAPSReporting\\\\s+0", "SubmitSamplesConsent\\\\s+2"]'::jsonb
WHERE name = 'Potential tampering with MS Defender';

-- 4. ps_indicator_scheduled_task_modification.yaml
UPDATE powershell_signatures 
SET patterns = '["\\\\bRegister-ScheduledTask", "New-(ScheduledTaskTrigger|ScheduledTaskAction)", "Win32_ScheduledJob.+create", "schtasks.+\\\\s\\/create", "Schedule\\\\.Service.+\\\\.create"]'::jsonb
WHERE name = 'Scheduled Task modification';

-- 5. ps_indicator_service_creation.yaml
UPDATE powershell_signatures 
SET patterns = '["\\\\bnew-service\\\\s", "\\\\bsc(.exe)*\\\\s+create\\\\s"]'::jsonb
WHERE name = 'Service Creation';

-- 6. ps_indicator_web_client_traces.yaml
UPDATE powershell_signatures 
SET patterns = '["RestMethod", "[\\\\.-]webclient", "WebRequest", "Net.Sockets.TcpClient", "InternetExplorer\\\\.Application", "(win|Xml)Http", "\\\\b(curl|wget|iwr|irm)\\\\s+"]'::jsonb
WHERE name = 'Web Client traces';

-- Verificar se os patterns foram atualizados corretamente
SELECT id, name, patterns FROM powershell_signatures ORDER BY id;
