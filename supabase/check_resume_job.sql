-- Verificar se Resume-Job existe na tabela
SELECT alias, cmdlet_name, description, basescore 
FROM powershell_cmdlets 
WHERE cmdlet_name ILIKE '%Resume-Job%' OR alias = 'rujb';

-- Verificar se há algum match parcial
SELECT alias, cmdlet_name, description, basescore 
FROM powershell_cmdlets 
WHERE cmdlet_name ILIKE '%Resume%' OR cmdlet_name ILIKE '%Job%';
