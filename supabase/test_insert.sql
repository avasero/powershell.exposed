-- PASSO 1: Garantir que a estrutura da tabela está correta
ALTER TABLE powershell_cmdlets 
ADD COLUMN IF NOT EXISTS patterns JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'very_low',
ADD COLUMN IF NOT EXISTS tactics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS techniques JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS reference JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- PASSO 2: Inserir um cmdlet simples de teste
INSERT INTO powershell_cmdlets (alias, cmdlet_name, description, basescore) VALUES
('test-cmd', 'Test-Command', 'Test command for verification', 0.1)
ON CONFLICT (alias) DO NOTHING;

-- PASSO 3: Verificar se o insert funcionou
SELECT alias, cmdlet_name FROM powershell_cmdlets WHERE alias = 'test-cmd';
