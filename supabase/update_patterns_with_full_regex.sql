-- Verificar os patterns atuais na tabela
SELECT name, patterns FROM powershell_signatures ORDER BY name;

-- Atualizar com os regex completos dos arquivos YAML
UPDATE powershell_signatures SET patterns = '["Invoke-Expression|\\\\biex\\\\b"]'
WHERE name = 'Invoke-Expression Cmdlet';

UPDATE powershell_signatures SET patterns = '["(?i)[a-z0-9+/=]{100,}", "(?i)^(?!.*[-]e(nc*o*d*e*d*c*o*m*m*a*n*d*)*\\\\s).*"]'
WHERE name = 'Long base64 string';

UPDATE powershell_signatures SET patterns = '["Disable(RealtimeMonitoring|BehaviorMonitoring|IOAVProtection|ScriptScanning|IntrusionPreventionSystem|AntiSpyware)|EnableControlledFolderAccess\\\\s+disabled|MAPSReporting\\\\s+0|SubmitSamplesConsent\\\\s+2"]'
WHERE name = 'Potential tampering with MS Defender';

UPDATE powershell_signatures SET patterns = '["\\\\bRegister-ScheduledTask|New-(ScheduledTaskTrigger|ScheduledTaskAction)|Win32_ScheduledJob.+create|schtasks.+\\\\s\\/create|Schedule\\\\.Service.+\\\\.create"]'
WHERE name = 'Scheduled Task modification';

UPDATE powershell_signatures SET patterns = '["\\\\bnew-service\\\\s|\\\\bsc(.exe)*\\\\s+create\\\\s"]'
WHERE name = 'Service Creation';

UPDATE powershell_signatures SET patterns = '["RestMethod|[\\\\.-]webclient|WebRequest|Net.Sockets.TcpClient|InternetExplorer\\\\.Application|(win|Xml)Http|\\\\b(curl|wget|iwr|irm)\\\\s+"]'
WHERE name = 'Web Client traces';

-- Verificar as atualizações
SELECT name, patterns FROM powershell_signatures ORDER BY name;
