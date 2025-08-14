-- Adicionar cmdlets adicionais à tabela powershell_cmdlets
-- Inserir apenas os que ainda não existem

INSERT INTO powershell_cmdlets (alias, cmdlet_name, description, basescore, patterns, severity, tactics, techniques, reference, is_active) VALUES
-- Cmdlets que podem não estar na tabela ainda
('write', 'Write-Host', 'Writes customized output to a host.', 0.1, '["\\bwrite\\b", "\\bWrite-Host\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-host"]'::jsonb, true),
('', 'Get-Date', 'Gets the current date and time.', 0.1, '["\\bGet-Date\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-date"]'::jsonb, true),
('wget', 'Invoke-WebRequest', 'Gets content from a web page on the Internet.', 0.1, '["\\bwget\\b", "\\bInvoke-WebRequest\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1105", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest"]'::jsonb, true),
('start', 'Start-Process', 'Starts one or more processes on the local computer.', 0.1, '["\\bstart\\b", "\\bStart-Process\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process"]'::jsonb, true),
('copy', 'Copy-Item', 'Copies an item from one location to another.', 0.1, '["\\bcopy\\b", "\\bCopy-Item\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/copy-item"]'::jsonb, true),
('', 'Set-ExecutionPolicy', 'Changes the user preference for the Windows PowerShell execution policy.', 0.1, '["\\bSet-ExecutionPolicy\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-executionpolicy"]'::jsonb, true),
('', 'Out-File', 'Sends output to a file.', 0.1, '["\\bOut-File\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/out-file"]'::jsonb, true),
('where', 'Where-Object', 'Selects objects from a collection based on their property values.', 0.1, '["\\bwhere\\b", "\\bWhere-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object"]'::jsonb, true),
('', 'Send-MailMessage', 'Sends an email message.', 0.1, '["\\bSend-MailMessage\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/send-mailmessage"]'::jsonb, true),
('', 'New-Object', 'Creates an instance of a Microsoft .NET Framework or COM object.', 0.1, '["\\bNew-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/new-object"]'::jsonb, true),
('sls', 'Select-String', 'Finds text in strings and files.', 0.1, '["\\bsls\\b", "\\bSelect-String\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-string"]'::jsonb, true),
('select', 'Select-Object', 'Selects objects or object properties.', 0.1, '["\\bselect\\b", "\\bSelect-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us powershell/module/microsoft.powershell.utility/select-object"]'::jsonb, true),
('', 'Test-Path', 'Determines whether all elements of a file or directory path exist.', 0.1, '["\\bTest-Path\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-path"]'::jsonb, true),
('', 'Install-Package', 'Installs one or more software packages.', 0.1, '["\\bInstall-Package\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/packagemanagement/install-package"]'::jsonb, true),
('foreach', 'ForEach-Object', 'Performs an operation against each item in a collection of input objects.', 0.1, '["\\bforeach\\b", "\\bForEach-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/foreach-object"]'::jsonb, true),
('echo', 'Write-Output', 'Sends the specified objects to the next command in the pipeline.', 0.1, '["\\becho\\b", "\\bWrite-Output\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-output"]'::jsonb, true),
('sort', 'Sort-Object', 'Sorts objects by property values.', 0.1, '["\\bsort\\b", "\\bSort-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/sort-object"]'::jsonb, true),
('', 'Test-Connection', 'Sends ICMP echo request packets ("pings") to one or more computers.', 0.1, '["\\bTest-Connection\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1018", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-connection"]'::jsonb, true),
('', 'Get-EventLog', 'Gets the events in an event log, or a list of the event logs, on the local or remote computers.', 0.1, '["\\bGet-EventLog\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-eventlog"]'::jsonb, true),
('', 'Get-WinEvent', 'Gets events from event logs and event tracing log files on local and remote computers.', 0.1, '["\\bGet-WinEvent\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent"]'::jsonb, true),
('', 'Install-Module', 'Downloads one or more modules from an online gallery, and installs them on the local computer.', 0.1, '["\\bInstall-Module\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/powershellget/install-module"]'::jsonb, true),
('', 'Get-Credential', 'Gets a credential object based on a user name and password.', 0.1, '["\\bGet-Credential\\b"]'::jsonb, 'very_low', '["Credential Access"]'::jsonb, '["T1552", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-credential"]'::jsonb, true),
('', 'Read-Host', 'Reads a line of input from the console.', 0.1, '["\\bRead-Host\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/read-host"]'::jsonb, true),
('', 'Get-Help', 'Displays information about Windows PowerShell commands and concepts.', 0.1, '["\\bGet-Help\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help"]'::jsonb, true),
('sleep', 'Start-Sleep', 'Suspends the activity in a script or session for the specified period of time.', 0.1, '["\\bsleep\\b", "\\bStart-Sleep\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/start-sleep"]'::jsonb, true),
('', 'Restart-Computer', 'Restarts ("reboots") the operating system on local and remote computers.', 0.1, '["\\bRestart-Computer\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1529", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/restart-computer"]'::jsonb, true)
ON CONFLICT (alias) DO NOTHING;

-- Atualizar cmdlets existentes que podem não ter os novos campos
UPDATE powershell_cmdlets SET
  patterns = CASE 
    -- Para aliases de uma letra, ser mais restritivo
    WHEN alias IN ('r', 'h', '?', '%') THEN 
      jsonb_build_array(
        '^' || alias || '$',  -- Match exato do comando inteiro
        '^' || alias || '\s',  -- Match no início seguido de espaço
        '\s' || alias || '$',  -- Match no final precedido de espaço
        '\s' || alias || '\s', -- Match no meio com espaços
        '^' || cmdlet_name || '$'  -- Match exato do cmdlet completo
      )
    -- Para outros aliases, usar word boundaries
    ELSE 
      jsonb_build_array(
        '\b' || alias || '\b',
        '\b' || cmdlet_name || '\b'
      )
  END,
  severity = COALESCE(severity, 'very_low'),
  tactics = COALESCE(tactics, '["Execution"]'::jsonb),
  techniques = COALESCE(techniques, '["T1059.001"]'::jsonb),
  reference = COALESCE(reference, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_aliases"]'::jsonb),
  is_active = COALESCE(is_active, true)
WHERE patterns IS NULL OR jsonb_array_length(patterns) = 0;

-- Verificar quantos cmdlets temos agora
SELECT COUNT(*) as total_cmdlets FROM powershell_cmdlets WHERE is_active = true;

-- Mostrar alguns exemplos dos novos cmdlets
SELECT alias, cmdlet_name, severity, jsonb_array_length(patterns) as pattern_count 
FROM powershell_cmdlets 
WHERE alias IN ('write', 'echo', 'sleep', 'start', 'sort') OR cmdlet_name IN ('Get-Date', 'Test-Connection', 'Install-Module')
ORDER BY cmdlet_name;
