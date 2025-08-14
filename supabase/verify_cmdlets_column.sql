-- Verificar se a coluna cmdlets_detected existe na tabela powershell_analyses
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' 
  AND column_name = 'cmdlets_detected';

-- Se não existir, criar a coluna
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'powershell_analyses' 
          AND column_name = 'cmdlets_detected'
    ) THEN
        ALTER TABLE powershell_analyses 
        ADD COLUMN cmdlets_detected JSONB DEFAULT '[]'::jsonb;
        
        -- Criar índice
        CREATE INDEX IF NOT EXISTS idx_powershell_analyses_cmdlets_detected 
        ON powershell_analyses USING GIN (cmdlets_detected);
        
        RAISE NOTICE 'Column cmdlets_detected added successfully';
    ELSE
        RAISE NOTICE 'Column cmdlets_detected already exists';
    END IF;
END $$;
