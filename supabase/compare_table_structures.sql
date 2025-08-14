-- Comparar estruturas das duas tabelas
SELECT 'powershell_signatures' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'powershell_signatures'
UNION ALL
SELECT 'powershell_cmdlets' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'powershell_cmdlets'
ORDER BY table_name, column_name;
