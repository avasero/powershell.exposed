-- Verificar se os dados estão na tabela powershell_cmdlets
SELECT COUNT(*) as total_cmdlets FROM powershell_cmdlets;

-- Verificar se o alias 'ls' existe
SELECT alias, cmdlet_name, description, basescore 
FROM powershell_cmdlets 
WHERE alias = 'ls' OR alias = 'dir';

-- Verificar os primeiros 10 cmdlets para ver se estão lá
SELECT alias, cmdlet_name, basescore 
FROM powershell_cmdlets 
ORDER BY alias 
LIMIT 10;
