# PowerShell Signatures Structure

## 📁 Nova Estrutura de Arquivos

### Diretório de Signatures
```
/frontend/public/signatures/
├── ps_indicator_scheduled_task_modification.yaml
├── ps_indicator_ms_defender_tampering.yaml
├── ps_indicator_web_client_traces.yaml
├── ps_indicator_service_creation.yaml
└── ps_indicator_invoke_expression.yaml
```

### Formato dos Arquivos YAML
Cada arquivo de signature segue este formato:
```yaml
name: Nome da Signature
description: Descrição do que a signature detecta
regex: (?i)padrão_regex_aqui
basescore: 9.7
tactic: [Tática1, Tática2]  # ou string única para uma tática
technique: [T1234.567, T8901.234]  # ou string única
reference:
  - https://link-referencia-1
  - https://link-referencia-2
```

## 🗄️ Estrutura do Banco de Dados

### Tabela `powershell_analyses`
- `risk_score`: DECIMAL(3,1) - Score da signature (ex: 9.7)
- `signature_file`: TEXT - Nome do arquivo YAML que detectou
- `tactics`: JSONB - Array com táticas MITRE ATT&CK
- `techniques`: JSONB - Array com técnicas MITRE ATT&CK
- `signatures_detected`: JSONB - Detalhes das signatures detectadas

### Tabela `signature_cache` (opcional)
Cache das signatures carregadas para performance.

## 🎯 Sistema de Scores

### Faixas de Cores (1-10):
- 🟢 **1.0-2.0**: Very Low (Verde)
- 🔵 **2.1-4.0**: Low (Azul)
- 🟡 **4.1-6.0**: Medium (Amarelo)  
- 🟠 **6.1-8.0**: High (Laranja)
- 🔴 **8.1-10.0**: Critical (Vermelho)

### Signatures Atuais:
- `scheduled_task_modification`: 9.7 🔴 (Critical)
- `ms_defender_tampering`: 9.7 🔴 (Critical)
- `web_client_traces`: 7.5 🟠 (High)
- `service_creation`: 7.6 🟠 (High)
- `invoke_expression`: 5.0 🟡 (Medium)

## 🚀 Como Usar

### 1. Executar Update do Banco
Execute o arquivo `database/update_schema.sql` no Supabase SQL Editor.

### 2. Carregar Signatures
O sistema deve ler os arquivos YAML individuais da pasta `/signatures/` dinamicamente.

### 3. Análise de Comandos
1. Para cada comando PowerShell, itere pelos arquivos YAML
2. Teste o regex de cada signature
3. Se houver match, armazene:
   - `risk_score`: basescore da signature
   - `signature_file`: nome do arquivo YAML
   - `tactics`: array das táticas
   - `techniques`: array das técnicas

## 📊 Vantagens da Nova Estrutura

✅ **Modular**: Cada signature é um arquivo independente
✅ **Escalável**: Fácil adicionar/remover signatures
✅ **MITRE ATT&CK**: Mapeamento completo de táticas e técnicas
✅ **Performance**: Sistema de cache opcional
✅ **Flexível**: Scores decimais precisos (9.7, 8.2, etc.)
✅ **Rastreável**: Saber qual signature detectou cada ameaça
