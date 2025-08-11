-- Migração para adicionar colunas necessárias à tabela powershell_analyses
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/vluiqlsotcncfpizwmhb/sql/new

-- Adicionar colunas que estão faltando
ALTER TABLE powershell_analyses 
ADD COLUMN IF NOT EXISTS is_malicious BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'very_low';

-- Criar índice para as novas colunas
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_is_malicious ON powershell_analyses(is_malicious);
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_severity ON powershell_analyses(severity);

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' 
ORDER BY ordinal_position;
