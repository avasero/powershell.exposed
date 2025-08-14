-- Inserir todos os cmdlets PowerShell fornecidos pelo usuário
-- Usando ON CONFLICT DO NOTHING para evitar duplicatas baseado no cmdlet_name

INSERT INTO powershell_cmdlets (alias, cmdlet_name, description, basescore, patterns, severity, tactics, techniques, reference, is_active) 
VALUES
-- Get-ChildItem (dir, gci, ls)
('dir', 'Get-ChildItem', 'Gets the files and folders in a file system drive.', 0.1, '["\\bdir\\b", "\\bgci\\b", "\\bls\\b", "\\bGet-ChildItem\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem"]'::jsonb, true),
('gci', 'Get-ChildItem', 'Gets the files and folders in a file system drive.', 0.1, '["\\bdir\\b", "\\bgci\\b", "\\bls\\b", "\\bGet-ChildItem\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem"]'::jsonb, true),
('ls', 'Get-ChildItem', 'Gets the files and folders in a file system drive.', 0.1, '["\\bdir\\b", "\\bgci\\b", "\\bls\\b", "\\bGet-ChildItem\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-childitem"]'::jsonb, true),

-- Invoke-Command (icm)
('icm', 'Invoke-Command', 'Runs commands on local and remote computers.', 0.3, '["\\bicm\\b", "\\bInvoke-Command\\b"]'::jsonb, 'low', '["Execution", "Lateral Movement"]'::jsonb, '["T1059.001", "T1021.006"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/invoke-command"]'::jsonb, true),

-- Import-Module (ipmo)
('ipmo', 'Import-Module', 'Adds modules to the current session.', 0.1, '["\\bipmo\\b", "\\bImport-Module\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/import-module"]'::jsonb, true),

-- Export-Csv (epcsv)
('epcsv', 'Export-Csv', 'Converts objects into a series of comma-separated (CSV) strings and saves the strings in a CSV file.', 0.1, '["\\bepcsv\\b", "\\bExport-Csv\\b"]'::jsonb, 'very_low', '["Collection"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-csv"]'::jsonb, true),

-- Write-Host
('', 'Write-Host', 'Writes customized output to a host.', 0.1, '["\\bWrite-Host\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-host"]'::jsonb, true),

-- Get-WmiObject (gwmi)
('gwmi', 'Get-WmiObject', 'Gets instances of WMI classes or information about the available classes.', 0.2, '["\\bgwmi\\b", "\\bGet-WmiObject\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1047", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-wmiobject"]'::jsonb, true),

-- Get-Content (cat, gc, type)
('cat', 'Get-Content', 'Gets the contents of a file.', 0.1, '["\\bcat\\b", "\\bgc\\b", "\\btype\\b", "\\bGet-Content\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content"]'::jsonb, true),
('gc', 'Get-Content', 'Gets the contents of a file.', 0.1, '["\\bcat\\b", "\\bgc\\b", "\\btype\\b", "\\bGet-Content\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content"]'::jsonb, true),
('type', 'Get-Content', 'Gets the contents of a file.', 0.1, '["\\bcat\\b", "\\bgc\\b", "\\btype\\b", "\\bGet-Content\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-content"]'::jsonb, true),

-- Get-Date
('', 'Get-Date', 'Gets the current date and time.', 0.1, '["\\bGet-Date\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1082", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-date"]'::jsonb, true),

-- Invoke-WebRequest (curl, iwr, wget)
('curl', 'Invoke-WebRequest', 'Gets content from a web page on the Internet.', 0.3, '["\\bcurl\\b", "\\biwr\\b", "\\bwget\\b", "\\bInvoke-WebRequest\\b"]'::jsonb, 'low', '["Command and Control"]'::jsonb, '["T1105", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest"]'::jsonb, true),
('iwr', 'Invoke-WebRequest', 'Gets content from a web page on the Internet.', 0.3, '["\\bcurl\\b", "\\biwr\\b", "\\bwget\\b", "\\bInvoke-WebRequest\\b"]'::jsonb, 'low', '["Command and Control"]'::jsonb, '["T1105", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest"]'::jsonb, true),
('wget', 'Invoke-WebRequest', 'Gets content from a web page on the Internet.', 0.3, '["\\bcurl\\b", "\\biwr\\b", "\\bwget\\b", "\\bInvoke-WebRequest\\b"]'::jsonb, 'low', '["Command and Control"]'::jsonb, '["T1105", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest"]'::jsonb, true),

-- Start-Process (saps, start)
('saps', 'Start-Process', 'Starts one or more processes on the local computer.', 0.2, '["\\bsaps\\b", "\\bstart\\b", "\\bStart-Process\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process"]'::jsonb, true),
('start', 'Start-Process', 'Starts one or more processes on the local computer.', 0.2, '["\\bsaps\\b", "\\bstart\\b", "\\bStart-Process\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process"]'::jsonb, true),

-- Copy-Item (copy, cp, cpi)
('copy', 'Copy-Item', 'Copies an item from one location to another.', 0.1, '["\\bcopy\\b", "\\bcp\\b", "\\bcpi\\b", "\\bCopy-Item\\b"]'::jsonb, 'very_low', '["Collection"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/copy-item"]'::jsonb, true),
('cp', 'Copy-Item', 'Copies an item from one location to another.', 0.1, '["\\bcopy\\b", "\\bcp\\b", "\\bcpi\\b", "\\bCopy-Item\\b"]'::jsonb, 'very_low', '["Collection"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/copy-item"]'::jsonb, true),
('cpi', 'Copy-Item', 'Copies an item from one location to another.', 0.1, '["\\bcopy\\b", "\\bcp\\b", "\\bcpi\\b", "\\bCopy-Item\\b"]'::jsonb, 'very_low', '["Collection"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/copy-item"]'::jsonb, true),

-- Set-ExecutionPolicy
('', 'Set-ExecutionPolicy', 'Changes the user preference for the Windows PowerShell execution policy.', 0.4, '["\\bSet-ExecutionPolicy\\b"]'::jsonb, 'low', '["Defense Evasion"]'::jsonb, '["T1562.001", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-executionpolicy"]'::jsonb, true),

-- Out-File
('', 'Out-File', 'Sends output to a file.', 0.1, '["\\bOut-File\\b"]'::jsonb, 'very_low', '["Collection"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/out-file"]'::jsonb, true),

-- Where-Object (?, where)
('?', 'Where-Object', 'Selects objects from a collection based on their property values.', 0.1, '["\\b\\?\\b", "\\bwhere\\b", "\\bWhere-Object\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object"]'::jsonb, true),
('where', 'Where-Object', 'Selects objects from a collection based on their property values.', 0.1, '["\\b\\?\\b", "\\bwhere\\b", "\\bWhere-Object\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object"]'::jsonb, true),

-- Import-Csv (ipcsv)
('ipcsv', 'Import-Csv', 'Creates table-like custom objects from the items in a CSV file.', 0.1, '["\\bipcsv\\b", "\\bImport-Csv\\b"]'::jsonb, 'very_low', '["Collection"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/import-csv"]'::jsonb, true),

-- Send-MailMessage
('', 'Send-MailMessage', 'Sends an email message.', 0.2, '["\\bSend-MailMessage\\b"]'::jsonb, 'very_low', '["Exfiltration"]'::jsonb, '["T1041", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/send-mailmessage"]'::jsonb, true),

-- New-Object
('', 'New-Object', 'Creates an instance of a Microsoft .NET Framework or COM object.', 0.2, '["\\bNew-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/new-object"]'::jsonb, true),

-- Select-String (sls)
('sls', 'Select-String', 'Finds text in strings and files.', 0.1, '["\\bsls\\b", "\\bSelect-String\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-string"]'::jsonb, true),

-- Remove-Item (del, erase, rd, ri, rm, rmdir)
('del', 'Remove-Item', 'Deletes files and folders.', 0.2, '["\\bdel\\b", "\\berase\\b", "\\brd\\b", "\\bri\\b", "\\brm\\b", "\\brmdir\\b", "\\bRemove-Item\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1070.004", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item"]'::jsonb, true),
('erase', 'Remove-Item', 'Deletes files and folders.', 0.2, '["\\bdel\\b", "\\berase\\b", "\\brd\\b", "\\bri\\b", "\\brm\\b", "\\brmdir\\b", "\\bRemove-Item\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1070.004", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item"]'::jsonb, true),
('rd', 'Remove-Item', 'Deletes files and folders.', 0.2, '["\\bdel\\b", "\\berase\\b", "\\brd\\b", "\\bri\\b", "\\brm\\b", "\\brmdir\\b", "\\bRemove-Item\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1070.004", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item"]'::jsonb, true),
('ri', 'Remove-Item', 'Deletes files and folders.', 0.2, '["\\bdel\\b", "\\berase\\b", "\\brd\\b", "\\bri\\b", "\\brm\\b", "\\brmdir\\b", "\\bRemove-Item\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1070.004", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item"]'::jsonb, true),
('rm', 'Remove-Item', 'Deletes files and folders.', 0.2, '["\\bdel\\b", "\\berase\\b", "\\brd\\b", "\\bri\\b", "\\brm\\b", "\\brmdir\\b", "\\bRemove-Item\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1070.004", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item"]'::jsonb, true),
('rmdir', 'Remove-Item', 'Deletes files and folders.', 0.2, '["\\bdel\\b", "\\berase\\b", "\\brd\\b", "\\bri\\b", "\\brm\\b", "\\brmdir\\b", "\\bRemove-Item\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1070.004", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item"]'::jsonb, true),

-- Select-Object (select)
('select', 'Select-Object', 'Selects objects or object properties.', 0.1, '["\\bselect\\b", "\\bSelect-Object\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/select-object"]'::jsonb, true),

-- Test-Path
('', 'Test-Path', 'Determines whether all elements of a file or directory path exist.', 0.1, '["\\bTest-Path\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-path"]'::jsonb, true),

-- Invoke-RestMethod (irm)
('irm', 'Invoke-RestMethod', 'Sends an HTTP or HTTPS request to a RESTful web service.', 0.3, '["\\birm\\b", "\\bInvoke-RestMethod\\b"]'::jsonb, 'low', '["Command and Control"]'::jsonb, '["T1105", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-restmethod"]'::jsonb, true),

-- Install-Package
('', 'Install-Package', 'Installs one or more software packages.', 0.2, '["\\bInstall-Package\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/packagemanagement/install-package"]'::jsonb, true),

-- ForEach-Object (%, foreach)
('%', 'ForEach-Object', 'Performs an operation against each item in a collection of input objects.', 0.1, '["\\b%\\b", "\\bforeach\\b", "\\bForEach-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/foreach-object"]'::jsonb, true),
('foreach', 'ForEach-Object', 'Performs an operation against each item in a collection of input objects.', 0.1, '["\\b%\\b", "\\bforeach\\b", "\\bForEach-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/foreach-object"]'::jsonb, true),

-- Write-Output (echo, write)
('echo', 'Write-Output', 'Sends the specified objects to the next command in the pipeline.', 0.1, '["\\becho\\b", "\\bwrite\\b", "\\bWrite-Output\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-output"]'::jsonb, true),
('write', 'Write-Output', 'Sends the specified objects to the next command in the pipeline.', 0.1, '["\\becho\\b", "\\bwrite\\b", "\\bWrite-Output\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/write-output"]'::jsonb, true),

-- Get-Process (gps, ps)
('gps', 'Get-Process', 'Gets the processes that are running on the local computer or a remote computer.', 0.1, '["\\bgps\\b", "\\bps\\b", "\\bGet-Process\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process"]'::jsonb, true),
('ps', 'Get-Process', 'Gets the processes that are running on the local computer or a remote computer.', 0.1, '["\\bgps\\b", "\\bps\\b", "\\bGet-Process\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process"]'::jsonb, true),

-- Get-Service (gsv)
('gsv', 'Get-Service', 'Gets the services on a local or remote computer.', 0.1, '["\\bgsv\\b", "\\bGet-Service\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1007", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service"]'::jsonb, true),

-- Format-Table (ft)
('ft', 'Format-Table', 'Formats the output as a table.', 0.1, '["\\bft\\b", "\\bFormat-Table\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/format-table"]'::jsonb, true),

-- Test-Connection
('', 'Test-Connection', 'Sends ICMP echo request packets ("pings") to one or more computers.', 0.1, '["\\bTest-Connection\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1018", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-connection"]'::jsonb, true),

-- New-Item (ni)
('ni', 'New-Item', 'Creates a new item.', 0.1, '["\\bni\\b", "\\bNew-Item\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-item"]'::jsonb, true),

-- Get-EventLog
('', 'Get-EventLog', 'Gets the events in an event log, or a list of the event logs, on the local or remote computers.', 0.1, '["\\bGet-EventLog\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-eventlog"]'::jsonb, true),

-- Get-WinEvent
('', 'Get-WinEvent', 'Gets events from event logs and event tracing log files on local and remote computers.', 0.1, '["\\bGet-WinEvent\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent"]'::jsonb, true),

-- Install-Module
('', 'Install-Module', 'Downloads one or more modules from an online gallery, and installs them on the local computer.', 0.2, '["\\bInstall-Module\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/powershellget/install-module"]'::jsonb, true),

-- Enter-PSSession (etsn)
('etsn', 'Enter-PSSession', 'Starts an interactive session with a remote computer.', 0.3, '["\\betsn\\b", "\\bEnter-PSSession\\b"]'::jsonb, 'low', '["Lateral Movement"]'::jsonb, '["T1021.006", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/enter-pssession"]'::jsonb, true),

-- Get-Credential
('', 'Get-Credential', 'Gets a credential object based on a user name and password.', 0.2, '["\\bGet-Credential\\b"]'::jsonb, 'very_low', '["Credential Access"]'::jsonb, '["T1552", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-credential"]'::jsonb, true),

-- Read-Host
('', 'Read-Host', 'Reads a line of input from the console.', 0.1, '["\\bRead-Host\\b"]'::jsonb, 'very_low', '["Collection"]'::jsonb, '["T1005", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/read-host"]'::jsonb, true),

-- Get-Help
('', 'Get-Help', 'Displays information about Windows PowerShell commands and concepts.', 0.1, '["\\bGet-Help\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1057", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help"]'::jsonb, true),

-- Start-Sleep (sleep)
('sleep', 'Start-Sleep', 'Suspends the activity in a script or session for the specified period of time.', 0.1, '["\\bsleep\\b", "\\bStart-Sleep\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/start-sleep"]'::jsonb, true),

-- Restart-Computer
('', 'Restart-Computer', 'Restarts ("reboots") the operating system on local and remote computers.', 0.3, '["\\bRestart-Computer\\b"]'::jsonb, 'low', '["Impact"]'::jsonb, '["T1529", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/restart-computer"]'::jsonb, true),

-- Sort-Object (sort)
('sort', 'Sort-Object', 'Sorts objects by property values.', 0.1, '["\\bsort\\b", "\\bSort-Object\\b"]'::jsonb, 'very_low', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/sort-object"]'::jsonb, true),

-- Set-Location (cd, chdir, sl)
('cd', 'Set-Location', 'Sets the current working location to a specified location.', 0.1, '["\\bcd\\b", "\\bchdir\\b", "\\bsl\\b", "\\bSet-Location\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location"]'::jsonb, true),
('chdir', 'Set-Location', 'Sets the current working location to a specified location.', 0.1, '["\\bcd\\b", "\\bchdir\\b", "\\bsl\\b", "\\bSet-Location\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location"]'::jsonb, true),
('sl', 'Set-Location', 'Sets the current working location to a specified location.', 0.1, '["\\bcd\\b", "\\bchdir\\b", "\\bsl\\b", "\\bSet-Location\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-location"]'::jsonb, true),

-- Get-Location (gl, pwd)
('gl', 'Get-Location', 'Gets information about the current working location or a location stack.', 0.1, '["\\bgl\\b", "\\bpwd\\b", "\\bGet-Location\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-location"]'::jsonb, true),
('pwd', 'Get-Location', 'Gets information about the current working location or a location stack.', 0.1, '["\\bgl\\b", "\\bpwd\\b", "\\bGet-Location\\b"]'::jsonb, 'very_low', '["Discovery"]'::jsonb, '["T1083", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-location"]'::jsonb, true),

-- Clear-Host (clear, cls)
('clear', 'Clear-Host', 'Clears the display in the host program.', 0.1, '["\\bclear\\b", "\\bcls\\b", "\\bClear-Host\\b"]'::jsonb, 'very_low', '["Defense Evasion"]'::jsonb, '["T1070.003", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/clear-host"]'::jsonb, true),
('cls', 'Clear-Host', 'Clears the display in the host program.', 0.1, '["\\bclear\\b", "\\bcls\\b", "\\bClear-Host\\b"]'::jsonb, 'very_low', '["Defense Evasion"]'::jsonb, '["T1070.003", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/clear-host"]'::jsonb, true),

-- Stop-Process (kill, spps)
('kill', 'Stop-Process', 'Stops one or more running processes.', 0.2, '["\\bkill\\b", "\\bspps\\b", "\\bStop-Process\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1489", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/stop-process"]'::jsonb, true),
('spps', 'Stop-Process', 'Stops one or more running processes.', 0.2, '["\\bkill\\b", "\\bspps\\b", "\\bStop-Process\\b"]'::jsonb, 'very_low', '["Impact"]'::jsonb, '["T1489", "T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/stop-process"]'::jsonb, true),

-- Invoke-Expression (iex) - Alta prioridade de segurança
('iex', 'Invoke-Expression', 'Runs commands or expressions on the local computer.', 0.8, '["\\biex\\b", "\\bInvoke-Expression\\b"]'::jsonb, 'high', '["Execution"]'::jsonb, '["T1059.001"]'::jsonb, '["https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-expression"]'::jsonb, true)

ON CONFLICT (cmdlet_name, alias) DO NOTHING;

-- Verificar quantos cmdlets foram inseridos
SELECT COUNT(*) as total_cmdlets FROM powershell_cmdlets;

-- Mostrar alguns dos cmdlets adicionados
SELECT alias, cmdlet_name, basescore FROM powershell_cmdlets 
WHERE cmdlet_name IN ('Get-ChildItem', 'Invoke-Expression', 'Test-Connection', 'Set-ExecutionPolicy') 
ORDER BY cmdlet_name;
