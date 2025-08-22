-- =====================================================
-- CORREÇÃO DA TABELA powershell_signatures
-- =====================================================
-- Este script corrige os dados incorretos onde:
-- - patterns está sendo preenchido com URLs em vez de regex
-- - tactics e techniques estão sendo preenchidos com URLs
-- =====================================================

-- 1. PRIMEIRO: Limpar todos os campos incorretos
UPDATE public.powershell_signatures 
SET 
  patterns = '[]'::jsonb,
  tactics = '[]'::jsonb,
  techniques = '[]'::jsonb,
  reference = '[]'::jsonb,
  updated_at = NOW()
WHERE 
  patterns::text LIKE '%http%' 
  OR tactics::text LIKE '%http%' 
  OR techniques::text LIKE '%http%'
  OR reference::text LIKE '%http%';

-- 2. CORRIGIR: Invoke-Expression Cmdlet
UPDATE public.powershell_signatures 
SET 
  patterns = '["Invoke-Expression", "iex", "\\bInvoke-Expression\\b", "\\biex\\b"]'::jsonb,
  tactics = '["Execution", "Defense Evasion"]'::jsonb,
  techniques = '["T1059.001", "T1027"]'::jsonb,
  reference = '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'::jsonb,
  updated_at = NOW()
WHERE name = 'Invoke-Expression Cmdlet';

-- 3. CORRIGIR: Long base64 string
UPDATE public.powershell_signatures 
SET 
  patterns = '["(?i)[a-z0-9+/=]{100,}", "(?i)^(?!.*[-]e(nc*o*d*e*d*c*o*m*m*a*n*d*)*\\s).*"]'::jsonb,
  tactics = '["Defense Evasion", "Execution"]'::jsonb,
  techniques = '["T1027.001", "T1059.001"]'::jsonb,
  reference = '["https://blogs.vmware.com/security/2023/03/how-to-detect-poshc2-powershell-implants.html", "https://gist.github.com/githubfoam/0f6691b47a71486b25502e4e456d735e"]'::jsonb,
  updated_at = NOW()
WHERE name = 'Long base64 string';

-- 4. CORRIGIR: Potential tampering with MS Defender
UPDATE public.powershell_signatures 
SET 
  patterns = '["Set-MpPreference", "Set-MpComputerStatus", "Set-MpThreatDetection", "\\bSet-Mp\\w+\\b"]'::jsonb,
  tactics = '["Defense Evasion", "Persistence"]'::jsonb,
  techniques = '["T1562.001", "T1055"]'::jsonb,
  reference = '["https://github.com/mdecrevoisier/SIGMA-detection-rules/blob/main/windows-defender/defender-critical%20security%20components%20disabled%20(PowerShell).yaml"]'::jsonb,
  updated_at = NOW()
WHERE name = 'Potential tampering with MS Defender';

-- 5. CORRIGIR: Scheduled Task modification
UPDATE public.powershell_signatures 
SET 
  patterns = '["Register-ScheduledJob", "New-JobTrigger", "Set-JobTrigger", "\\bRegister-Scheduled\\w+\\b", "\\bNew-Job\\w+\\b", "\\bSet-Job\\w+\\b"]'::jsonb,
  tactics = '["Execution", "Persistence", "Privilege Escalation"]'::jsonb,
  techniques = '["T1053.005", "T1059.001"]'::jsonb,
  reference = '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/powershell/powershell_script/posh_ps_cmdlet_scheduled_task.yml", "https://github.com/redcanaryco/atomic-red-team/blob/f339e7da7d05f6057fdfcdd3742bfcf365fee2a9/atomics/T1053.005/T1053.005.md#atomic-test-4---powershell-cmdlet-scheduled-task"]'::jsonb,
  updated_at = NOW()
WHERE name = 'Scheduled Task modification';

-- 6. CORRIGIR: Service Creation
UPDATE public.powershell_signatures 
SET 
  patterns = '["\\bnew-service\\s", "\\bsc(.exe)*\\s+create\\s"]'::jsonb,
  tactics = '["Persistence", "Privilege Escalation"]'::jsonb,
  techniques = '["T1543.003", "T1059.001"]'::jsonb,
  reference = '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_service_creation.yml"]'::jsonb,
  updated_at = NOW()
WHERE name = 'Service Creation';

-- 7. CORRIGIR: Web Client traces
UPDATE public.powershell_signatures 
SET 
  patterns = '["Invoke-WebRequest", "Invoke-RestMethod", "\\bInvoke-Web\\w+\\b", "\\bInvoke-Rest\\w+\\b"]'::jsonb,
  tactics = '["Command and Control", "Execution"]'::jsonb,
  techniques = '["T1071.001", "T1059.001"]'::jsonb,
  reference = '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'::jsonb,
  updated_at = NOW()
WHERE name = 'Web Client traces';

-- 8. CORRIGIR: Fairly suspicious keywords
UPDATE public.powershell_signatures 
SET 
  patterns = '["shell\\.application|password|dump|Obfuscation|sploit|scanner|rundll|Reflection|icm\\s+|base64|discover-|IsInRole|Get-WinSystemLocale|Set-Wallpaper|etsn\\s+.+ComputerName|(start|get)-Service.+ComputerName|gsv\\s+.+ComputerName|get-Credential|(ps|Get-Process)\\s+.+ComputerName|PasswordSettings|localadmin|downloaddata|get-\\S+(credent|password)|\\[byte\\]|System\\.Convert|InteropServices|Get-LocalUser|\\b-useb\\s|binPath|GetTempFileName|SecurityProtocol|get-netfirewall|winsystemlocale|RemoteConnection|AntiVirusProduct|ldap://|ActiveDirectory\\.Domain|\\b(tnc|Test-NetConnection)\\s+\\S+\\.\\S+\\s+[-]port\\s+\\d+|\\bcmd(\\.exe)*\\s+/c\\b|Stop-Process\\s.*-force|taskkill.+/f|[^\\-]encoded"]'::jsonb,
  tactics = '["Execution"]'::jsonb,
  techniques = '["T1059.001"]'::jsonb,
  reference = '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/powershell/powershell_script/posh_ps_susp_keywords.yml", "https://github.com/SigmaHQ/sigma/blob/master/rules/windows/powershell/powershell_script/posh_ps_malicious_keywords.yml"]'::jsonb,
  updated_at = NOW()
WHERE name = 'Fairly suspicious keywords';

-- 9. VERIFICAÇÃO: Mostrar o resultado das correções
SELECT 
  id,
  name,
  patterns,
  tactics,
  techniques,
  reference,
  updated_at
FROM public.powershell_signatures 
ORDER BY id;

-- 10. VERIFICAÇÃO: Contar quantos registros foram corrigidos
SELECT 
  COUNT(*) as total_signatures,
  COUNT(CASE WHEN patterns::text NOT LIKE '%http%' THEN 1 END) as patterns_corretos,
  COUNT(CASE WHEN tactics::text NOT LIKE '%http%' THEN 1 END) as tactics_corretos,
  COUNT(CASE WHEN techniques::text NOT LIKE '%http%' THEN 1 END) as techniques_corretos,
  COUNT(CASE WHEN reference::text LIKE '%http%' THEN 1 END) as references_corretos
FROM public.powershell_signatures;

-- =====================================================
-- EXPLICAÇÃO DAS CORREÇÕES:
-- =====================================================
-- 1. Limpeza inicial: Remove todas as URLs incorretas
-- 2. Cada signature é corrigida com:
--    - patterns: Padrões regex reais para detecção
--    - tactics: Táticas MITRE ATT&CK reais
--    - techniques: Técnicas MITRE ATT&CK reais
--    - reference: URLs de referência mantidas (corretas)
-- =====================================================
