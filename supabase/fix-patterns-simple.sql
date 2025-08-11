-- Corrigir patterns com escape correto para JavaScript regex
-- Execute no SQL Editor: https://supabase.com/dashboard/project/vluiqlsotcncfpizwmhb/sql/new

-- 1. ps_indicator_invoke_expression.yaml - patterns simples para testar
UPDATE powershell_signatures 
SET patterns = '["Invoke-Expression", "iex"]'::jsonb
WHERE name = 'Invoke-Expression Cmdlet';

-- 2. ps_indicator_long_base64_string.yaml - pattern simplificado
UPDATE powershell_signatures 
SET patterns = '["[a-z0-9+/=]{50,}", "FromBase64String"]'::jsonb
WHERE name = 'Long base64 string';

-- 3. ps_indicator_ms_defender_tampering.yaml - patterns simples
UPDATE powershell_signatures 
SET patterns = '["Set-MpPreference", "DisableRealtimeMonitoring", "DisableBehaviorMonitoring"]'::jsonb
WHERE name = 'Potential tampering with MS Defender';

-- 4. ps_indicator_scheduled_task_modification.yaml - patterns simples
UPDATE powershell_signatures 
SET patterns = '["Register-ScheduledTask", "New-ScheduledTaskTrigger", "schtasks"]'::jsonb
WHERE name = 'Scheduled Task modification';

-- 5. ps_indicator_service_creation.yaml - patterns simples
UPDATE powershell_signatures 
SET patterns = '["New-Service", "sc create"]'::jsonb
WHERE name = 'Service Creation';

-- 6. ps_indicator_web_client_traces.yaml - patterns simples
UPDATE powershell_signatures 
SET patterns = '["Invoke-RestMethod", "Invoke-WebRequest", "WebClient", "iwr", "irm"]'::jsonb
WHERE name = 'Web Client traces';

-- Verificar se os patterns foram atualizados
SELECT id, name, patterns FROM powershell_signatures ORDER BY id;
