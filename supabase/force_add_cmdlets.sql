-- Verificar o que já existe na tabela
SELECT COUNT(*) as total_current FROM powershell_cmdlets;

-- Ver alguns aliases específicos que queremos adicionar
SELECT alias, cmdlet_name FROM powershell_cmdlets WHERE alias IN ('write', 'echo', 'sleep', 'start', 'sort', 'where') ORDER BY alias;

-- Ver se cmdlets específicos já existem
SELECT alias, cmdlet_name FROM powershell_cmdlets WHERE cmdlet_name IN ('Write-Host', 'Get-Date', 'Test-Connection') ORDER BY cmdlet_name;

-- Adicionar cmdlets que definitivamente não existem (usando cmdlet_name como chave)
INSERT INTO powershell_cmdlets (alias, cmdlet_name, description, basescore, patterns, severity, tactics, techniques, reference, is_active) 
SELECT * FROM (VALUES
    ('', 'Get-Date', 'Gets the current date and time.', 0.1, '["\\bGet-Date\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-date"]'::jsonb, true),
    ('', 'Set-ExecutionPolicy', 'Changes the user preference for the Windows PowerShell execution policy.', 0.1, '["\\bSet-ExecutionPolicy\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-executionpolicy"]'::jsonb, true),
    ('', 'Out-File', 'Sends output to a file.', 0.1, '["\\bOut-File\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/out-file"]'::jsonb, true),
    ('', 'Send-MailMessage', 'Sends an email message.', 0.1, '["\\bSend-MailMessage\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/send-mailmessage"]'::jsonb, true),
    ('', 'New-Object', 'Creates an instance of a Microsoft .NET Framework or COM object.', 0.1, '["\\bNew-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/new-object"]'::jsonb, true),
    ('sls', 'Select-String', 'Finds text in strings and files.', 0.1, '["\\bsls\\b", "\\bSelect-String\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-string"]'::jsonb, true),
    ('', 'Test-Path', 'Determines whether all elements of a file or directory path exist.', 0.1, '["\\bTest-Path\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-path"]'::jsonb, true),
    ('', 'Install-Package', 'Installs one or more software packages.', 0.1, '["\\bInstall-Package\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/packagemanagement/install-package"]'::jsonb, true),
    ('', 'Test-Connection', 'Sends ICMP echo request packets ("pings") to one or more computers.', 0.1, '["\\bTest-Connection\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1018", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-connection"]'::jsonb, true),
    ('', 'Get-EventLog', 'Gets the events in an event log, or a list of the event logs, on the local or remote computers.', 0.1, '["\\bGet-EventLog\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-eventlog"]'::jsonb, true),
    ('', 'Get-WinEvent', 'Gets events from event logs and event tracing log files on local and remote computers.', 0.1, '["\\bGet-WinEvent\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent"]'::jsonb, true),
    ('', 'Install-Module', 'Downloads one or more modules from an online gallery, and installs them on the local computer.', 0.1, '["\\bInstall-Module\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/powershellget/install-module"]'::jsonb, true),
    ('', 'Get-Credential', 'Gets a credential object based on a user name and password.', 0.1, '["\\bGet-Credential\\b"]'::jsonb, 'very_low', '["Credential Access"]'::jsonb, '["T1552", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-credential"]'::jsonb, true),
    ('', 'Read-Host', 'Reads a line of input from the console.', 0.1, '["\\bRead-Host\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/read-host"]'::jsonb, true),
    ('', 'Get-Help', 'Displays information about Windows PowerShell commands and concepts.', 0.1, '["\\bGet-Help\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help"]'::jsonb, true),
    ('sleep2', 'Start-Sleep', 'Suspends the activity in a script or session for the specified period of time.', 0.1, '["\\bsleep\\b", "\\bStart-Sleep\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/start-sleep"]'::jsonb, true),
    ('', 'Restart-Computer', 'Restarts ("reboots") the operating system on local and remote computers.', 0.1, '["\\bRestart-Computer\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1529", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/restart-computer"]'::jsonb, true),
    ('write2', 'Write-Host', 'Writes customized output to a host.', 0.1, '["\\bwrite\\b", "\\bWrite-Host\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-host"]'::jsonb, true),
    ('echo2', 'Write-Output', 'Sends the specified objects to the next command in the pipeline.', 0.1, '["\\becho\\b", "\\bWrite-Output\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-output"]'::jsonb, true),
    ('sort2', 'Sort-Object', 'Sorts objects by property values.', 0.1, '["\\bsort\\b", "\\bSort-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/sort-object"]'::jsonb, true)
) AS new_cmdlets(alias, cmdlet_name, description, basescore, patterns, severity, tactics, techniques, reference, is_active)
WHERE NOT EXISTS (SELECT 1 FROM powershell_cmdlets WHERE cmdlet_name = new_cmdlets.cmdlet_name);

-- Verificar quantos foram inseridos
SELECT COUNT(*) as total_after FROM powershell_cmdlets;

-- Mostrar os novos adicionados
SELECT alias, cmdlet_name FROM powershell_cmdlets WHERE cmdlet_name IN ('Get-Date', 'Test-Connection', 'Install-Module', 'Write-Host', 'Start-Sleep') ORDER BY cmdlet_name;
