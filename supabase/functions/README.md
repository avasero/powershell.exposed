# Edge Functions para PSExposed

Este diretório contém as Edge Functions do Supabase que substituem os scripts Python originais, mantendo exatamente a mesma funcionalidade.

## Functions Disponíveis

### 1. setup-database
**Substitui:** `setup_database.py`  
**Propósito:** Configurar e inicializar o banco de dados Supabase, criando a tabela e inserindo indicadores iniciais.

**Endpoint:** `/functions/v1/setup-database`  
**Método:** POST  
**Body:**
```json
{
  "indicators": [
    {
      "name": "Nome do indicador",
      "description": "Descrição do indicador",
      "regex": ["padrão1", "padrão2"],
      "basescore": 7.5,
      "tactic": ["tática1"],
      "technique": ["técnica1"],
      "reference": ["ref1", "ref2"]
    }
  ]
}
```

**Exemplo de uso:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/setup-database \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"indicators": [...]}'
```

### 2. update-database
**Substitui:** `update_database.py`  
**Propósito:** Atualizar o banco de dados com novos indicadores ou modificações em indicadores existentes.

**Endpoint:** `/functions/v1/update-database`  
**Método:** POST  
**Body:**
```json
{
  "changed_files": ["arquivo1.yaml", "arquivo2.yaml"],
  "indicators": [
    {
      "name": "Nome do indicador",
      "description": "Descrição atualizada",
      "regex": ["padrão_atualizado"],
      "basescore": 8.0,
      "tactic": ["nova_tática"],
      "technique": ["nova_técnica"],
      "reference": ["nova_ref"]
    }
  ]
}
```

**Exemplo de uso:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/update-database \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"changed_files": ["ps_indicator_test.yaml"], "indicators": [...]}'
```

### 3. parse-yaml-indicator
**Propósito:** Utilitário para fazer parse e validar arquivos YAML de indicadores antes da inserção.

**Endpoint:** `/functions/v1/parse-yaml-indicator`  
**Método:** POST  
**Body:**
```json
{
  "yaml_content": "name: test\ndescription: teste...",
  "file_path": "opcional/caminho/arquivo.yaml"
}
```

## Migração dos Scripts Python

### Antes (Python)
```bash
# Configurar banco
cd psexposed/scripts
python setup_database.py

# Atualizar indicadores
CHANGED_FILES="indicator.yaml" python update_database.py
```

### Depois (Edge Functions)
```bash
# Configurar banco
curl -X POST https://your-project.supabase.co/functions/v1/setup-database \
  -H "Content-Type: application/json" \
  -d @indicators_payload.json

# Atualizar indicadores
curl -X POST https://your-project.supabase.co/functions/v1/update-database \
  -H "Content-Type: application/json" \
  -d @update_payload.json
```

## Vantagens das Edge Functions

1. **Serverless:** Não requer servidor Python dedicado
2. **Escalabilidade:** Escala automaticamente conforme demanda
3. **Integração:** Nativa com Supabase
4. **Segurança:** Acesso direto às variáveis de ambiente do Supabase
5. **Performance:** Runtime Deno otimizado
6. **Custos:** Paga apenas pelo uso

## Variáveis de Ambiente

As seguintes variáveis são configuradas automaticamente:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deploy

Para fazer deploy das functions:

```bash
cd powershell.exposed/supabase
supabase functions deploy setup-database
supabase functions deploy update-database
supabase functions deploy parse-yaml-indicator
```

## Estrutura do Banco

A tabela `powershell_signatures` mantém exatamente a mesma estrutura:

```sql
CREATE TABLE powershell_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    patterns JSONB,
    basescore DECIMAL(4,1),
    severity TEXT,
    tactics JSONB,
    techniques JSONB,
    reference JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

## Logs e Monitoramento

Para ver logs das functions:
```bash
supabase functions logs setup-database
supabase functions logs update-database
```

## Troubleshooting

### Erro de Conexão
Verifique se as variáveis de ambiente estão configuradas corretamente no dashboard do Supabase.

### Erro de Parse YAML
Use a function `parse-yaml-indicator` para testar o conteúdo YAML antes de enviar para as outras functions.

### Erro de Basescore
O sistema automaticamente ajusta valores fora do range permitido (0-999.9).
