-- Script para verificar se a coluna short_id foi adicionada corretamente
-- Execute este script no Supabase SQL Editor

-- Verificar se a coluna existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' 
AND column_name = 'short_id';

-- Verificar alguns registros com short_id
SELECT id, uuid, short_id, command 
FROM powershell_analyses 
WHERE short_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Verificar todos os registros (incluindo os com short_id NULL)
SELECT id, uuid, short_id, command 
FROM powershell_analyses 
ORDER BY created_at DESC
LIMIT 10;

