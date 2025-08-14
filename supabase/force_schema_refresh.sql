-- Forçar atualização do cache do schema do Supabase
-- Fazemos uma pequena alteração e depois revertemos para forçar o cache a se atualizar

-- 1. Adicionar um comentário à tabela (isso força o Supabase a recarregar o schema)
COMMENT ON TABLE powershell_analyses IS 'Table for storing PowerShell command analysis results with cmdlets detection';

-- 2. Verificar todas as colunas da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses'
ORDER BY ordinal_position;

-- 3. Verificar se há políticas RLS que possam estar interferindo
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'powershell_analyses';
