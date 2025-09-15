-- Script para executar a migration e adicionar a coluna link
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna link à tabela powershell_signatures
ALTER TABLE public.powershell_signatures 
ADD COLUMN link text NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.powershell_signatures.link IS 'Manual link to the YAML indicator file in the repository';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_powershell_signatures_link 
ON public.powershell_signatures USING btree (link) 
WHERE link IS NOT NULL;

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'powershell_signatures' 
AND column_name = 'link';
