-- Corrigir patterns dos cmdlets para evitar matches incorretos
-- Tornar os patterns mais específicos para evitar falsos positivos

-- Atualizar os patterns para serem mais específicos
UPDATE powershell_cmdlets SET
  patterns = CASE 
    -- Para aliases de uma letra, ser mais restritivo
    WHEN alias IN ('r', 'h', '?', '%') THEN 
      jsonb_build_array(
        '^' || alias || '$',  -- Match exato do comando inteiro
        '^' || alias || '\s',  -- Match no início seguido de espaço
        '\s' || alias || '$',  -- Match no final precedido de espaço
        '\s' || alias || '\s', -- Match no meio com espaços
        '^' || cmdlet_name || '$'  -- Match exato do cmdlet completo
      )
    -- Para outros aliases, usar word boundaries
    ELSE 
      jsonb_build_array(
        '\b' || alias || '\b',
        '\b' || cmdlet_name || '\b'
      )
  END
WHERE patterns IS NOT NULL;

-- Verificar alguns exemplos dos patterns atualizados
SELECT alias, cmdlet_name, patterns 
FROM powershell_cmdlets 
WHERE alias IN ('r', 'rujb', 'ls', 'dir', 'cat')
ORDER BY alias;
