#!/usr/bin/env node

/**
 * Script de exemplo para usar as Edge Functions que substituem os scripts Python
 * Este script demonstra como migrar de setup_database.py e update_database.py
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Exemplo de dados de indicadores (normalmente viriam de arquivos YAML)
const exampleIndicators = [
  {
    name: "PowerShell Invoke-Expression Usage",
    description: "Detecta uso suspeito do cmdlet Invoke-Expression",
    regex: [
      "Invoke-Expression",
      "IEX\\s+",
      "\\|\\s*iex"
    ],
    basescore: 7.5,
    tactic: ["execution"],
    technique: ["T1059.001"],
    reference: [
      "https://attack.mitre.org/techniques/T1059/001/",
      "https://docs.microsoft.com/en-us/powershell/"
    ]
  },
  {
    name: "Base64 Encoded PowerShell Command",
    description: "Detecta comandos PowerShell codificados em Base64",
    regex: [
      "-EncodedCommand\\s+[A-Za-z0-9+/=]{20,}",
      "-enc\\s+[A-Za-z0-9+/=]{20,}",
      "-e\\s+[A-Za-z0-9+/=]{20,}"
    ],
    basescore: 8.0,
    tactic: ["defense-evasion"],
    technique: ["T1027"],
    reference: [
      "https://attack.mitre.org/techniques/T1027/"
    ]
  }
];

async function setupDatabase() {
 
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/setup-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        indicators: exampleIndicators
      })
    });

    const result = await response.json();
    
    if (response.ok) {
     
    } else {
      console.error('❌ Erro:', result.error);
      if (result.errors) {
        result.errors.forEach(error => console.error('  -', error));
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    throw error;
  }
}

async function updateDatabase(changedFiles = [], indicators = []) {
  
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/update-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        changed_files: changedFiles,
        indicators: indicators
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      
      
      if (result.errors && result.errors.length > 0) {
       
        result.errors.forEach(error => console.error('  -', error));
      }
    } else {
      console.error('❌ Erro:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    throw error;
  }
}

async function parseYamlIndicator(yamlContent, filePath = null) {
 
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-yaml-indicator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        yaml_content: yamlContent,
        file_path: filePath
      })
    });

    const result = await response.json();
    
    if (response.ok) {
     
    } else {
      console.error('❌ Erro:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    throw error;
  }
}

// Exemplo de uso
async function main() {
  
 

  // Verificar configuração
  if (SUPABASE_URL === 'https://your-project.supabase.co' || SUPABASE_ANON_KEY === 'your-anon-key') {
    console.error('❌ Configure as variáveis de ambiente:');
    console.error('  export SUPABASE_URL="https://your-project.supabase.co"');
    console.error('  export SUPABASE_ANON_KEY="your-anon-key"');
    process.exit(1);
  }

  try {
    // 1. Configurar banco de dados (equivalente ao setup_database.py)
    await setupDatabase();
    

    // 2. Exemplo de atualização (equivalente ao update_database.py)
    const updatedIndicator = {
      ...exampleIndicators[0],
      description: "Descrição atualizada - Detecta uso suspeito do cmdlet Invoke-Expression",
      basescore: 8.5
    };

    await updateDatabase(
      ['ps_indicator_invoke_expression.yaml'], 
      [updatedIndicator]
    );
   

    // 3. Exemplo de parse de YAML
    const yamlExample = `
name: "Test Indicator"
description: "Indicador de teste"
regex:
  - "test-pattern"
  - "another-pattern"
basescore: 6.0
tactic:
  - "execution"
technique:
  - "T1059"
reference:
  - "https://example.com"
`;

    await parseYamlIndicator(yamlExample, 'test_indicator.yaml');

    
   

  } catch (error) {
    console.error('❌ Demo falhou:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

// Exportar funções para uso em outros scripts
module.exports = {
  setupDatabase,
  updateDatabase,
  parseYamlIndicator
};
