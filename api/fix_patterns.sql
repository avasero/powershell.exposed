-- Corrigir patterns corrompidos no banco
-- Execute este SQL no Supabase para corrigir os patterns

-- 1. Corrigir Invoke-Expression (remover \x08 e adicionar \b)
UPDATE powershell_signatures 
SET patterns = '["Invoke-Expression|\\biex\\b"]'
WHERE name = 'Invoke-Expression Cmdlet';

-- 2. Verificar se foi corrigido
SELECT name, patterns FROM powershell_signatures WHERE name = 'Invoke-Expression Cmdlet';

-- 3. Opcional: Corrigir outros patterns que podem estar com problemas similares
-- UPDATE powershell_signatures 
-- SET patterns = regexp_replace(patterns::text, '\\x08', '\\b', 'g')::jsonb
-- WHERE patterns::text LIKE '%\\x08%';
