-- Testar se a função Edge tem acesso à tabela powershell_cmdlets
-- Execute isso no SQL Editor do Supabase

-- 1. Verificar se a tabela existe
SELECT schemaname, tablename, tableowner, hasindexes, hasrules, hastriggers 
FROM pg_tables 
WHERE tablename = 'powershell_cmdlets';

-- 2. Verificar as permissões na tabela
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'powershell_cmdlets';

-- 3. Verificar se há políticas RLS que podem estar bloqueando
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'powershell_cmdlets';

-- 4. Testar uma query simples igual à da função
SELECT alias, cmdlet_name, basescore, description 
FROM powershell_cmdlets 
LIMIT 5;
