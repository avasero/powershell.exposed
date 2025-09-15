-- Script para adicionar coluna short_id à tabela powershell_analyses
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna short_id
ALTER TABLE public.powershell_analyses 
ADD COLUMN short_id text NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.powershell_analyses.short_id IS 'Short 8-character ID for easier sharing and shorter URLs';

-- Criar índice único para short_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_powershell_analyses_short_id 
ON public.powershell_analyses USING btree (short_id) 
WHERE short_id IS NOT NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_short_id_lookup 
ON public.powershell_analyses USING btree (short_id);

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' 
AND column_name = 'short_id';
