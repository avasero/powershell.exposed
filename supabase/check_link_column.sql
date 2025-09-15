-- Script para verificar se a coluna link foi adicionada corretamente
-- Execute este script no Supabase SQL Editor

-- Verificar se a coluna existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'powershell_signatures' 
AND column_name = 'link';

-- Verificar alguns registros com links
SELECT id, name, link 
FROM powershell_signatures 
WHERE link IS NOT NULL;

-- Verificar todos os registros (incluindo os com link NULL)
SELECT id, name, link 
FROM powershell_signatures 
ORDER BY id;
