-- Atualizar signatures com referências dos arquivos YAML originais

UPDATE powershell_signatures SET reference = '["https://github.com/SigmaHQ/sigma/blob/master/rules/windows/process_creation/proc_creation_win_susp_web_request_cmd_and_cmdlets.yml"]'
WHERE name = 'Invoke-Expression Cmdlet';

UPDATE powershell_signatures SET reference = '["https://blogs.vmware.com/security/2023/03/how-to-detect-poshc2-powershell-implants.html", "https://gist.github.com/githubfoam/0f6691b47a71486b25502e4e456d735e"]'
WHERE name = 'Long base64 string';

UPDATE powershell_signatures SET reference = '["https://docs.microsoft.com/en-us/windows/security/threat-protection/microsoft-defender-antivirus/configure-real-time-protection-microsoft-defender-antivirus"]'
WHERE name = 'Potential tampering with MS Defender';

UPDATE powershell_signatures SET reference = '["https://attack.mitre.org/techniques/T1053/005/", "https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks"]'
WHERE name = 'Scheduled Task modification';

UPDATE powershell_signatures SET reference = '["https://attack.mitre.org/techniques/T1543/003/", "https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-service"]'
WHERE name = 'Service Creation';

UPDATE powershell_signatures SET reference = '["https://attack.mitre.org/techniques/T1105/", "https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest"]'
WHERE name = 'Web Client traces';

-- Verificar se as referências foram adicionadas
SELECT name, reference FROM powershell_signatures WHERE reference IS NOT NULL ORDER BY name;
