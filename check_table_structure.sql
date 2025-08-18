-- Verificar se a coluna ip_address existe na tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar estrutura completa da tabela
\d+ public.powershell_analyses

-- Verificar se há dados na coluna ip_address
SELECT 
    id,
    command,
    ip_address,
    created_at
FROM public.powershell_analyses 
WHERE ip_address IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Verificar total de registros com e sem IP
SELECT 
    COUNT(*) as total_records,
    COUNT(ip_address) as records_with_ip,
    COUNT(*) - COUNT(ip_address) as records_without_ip
FROM public.powershell_analyses;
