-- Padronizar estrutura da tabela powershell_cmdlets para ser igual à powershell_signatures
-- Adicionar colunas que estão em powershell_signatures mas não em powershell_cmdlets

ALTER TABLE powershell_cmdlets 
ADD COLUMN IF NOT EXISTS patterns JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'very_low',
ADD COLUMN IF NOT EXISTS tactics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS techniques JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS reference JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualizar os cmdlets existentes para terem dados padronizados
UPDATE powershell_cmdlets SET
  patterns = jsonb_build_array(alias, cmdlet_name), -- Patterns serão o alias e o nome do cmdlet
  severity = 'very_low', -- Cmdlets comuns são muito baixo risco
  tactics = '["Execution"]'::jsonb, -- Todos os cmdlets são de execução
  techniques = '["T1059.001"]'::jsonb, -- PowerShell execution
  reference = jsonb_build_array('https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_aliases')
WHERE patterns IS NULL OR jsonb_array_length(patterns) = 0;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_powershell_cmdlets_patterns ON powershell_cmdlets USING GIN (patterns);
CREATE INDEX IF NOT EXISTS idx_powershell_cmdlets_severity ON powershell_cmdlets(severity);
CREATE INDEX IF NOT EXISTS idx_powershell_cmdlets_active ON powershell_cmdlets(is_active);

-- Atualizar comentários
COMMENT ON TABLE powershell_cmdlets IS 'PowerShell cmdlets with standardized structure matching powershell_signatures';
COMMENT ON COLUMN powershell_cmdlets.patterns IS 'Array of patterns to match (alias and cmdlet name)';
COMMENT ON COLUMN powershell_cmdlets.severity IS 'Risk severity level (very_low for common cmdlets)';
COMMENT ON COLUMN powershell_cmdlets.tactics IS 'MITRE ATT&CK tactics';
COMMENT ON COLUMN powershell_cmdlets.techniques IS 'MITRE ATT&CK techniques';
