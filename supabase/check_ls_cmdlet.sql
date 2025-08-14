-- Verificar especificamente o alias 'ls'
SELECT alias, cmdlet_name, description, basescore 
FROM powershell_cmdlets 
WHERE alias = 'ls';

-- Verificar também outros aliases comuns
SELECT alias, cmdlet_name, description, basescore 
FROM powershell_cmdlets 
WHERE alias IN ('ls', 'dir', 'cat', 'pwd', 'ps')
ORDER BY alias;
