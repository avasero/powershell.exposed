# Rota /analyze-pcre2

Esta rota analisa comandos PowerShell usando signatures do banco Supabase com regex patterns otimizados.

## Endpoint

```
POST /analyze-pcre2
```

## Request Body

```json
{
  "command": "string"
}
```

## Response

```json
{
  "success": true,
  "analysis": {
    "command": "string",
    "is_malicious": boolean,
    "risk_score": number,
    "severity": "very_low|low|medium|high|critical",
    "signatures_detected": [
      {
        "name": "string",
        "pattern": "string",
        "matched_text": "string",
        "severity": "string",
        "score": number,
        "description": "string",
        "tactics": ["string"],
        "techniques": ["string"],
        "reference": ["string"]
      }
    ],
    "tactics": ["string"],
    "techniques": ["string"],
    "total_signatures_checked": number,
    "detected_count": number,
    "cache_info": {
      "cached": boolean,
      "cache_age_minutes": number
    }
  }
}
```

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na pasta `api/` com:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
```

### Estrutura do Banco

A rota espera uma tabela `powershell_signatures` com:

```sql
create table public.powershell_signatures (
  id serial not null,
  name text not null,
  description text null,
  patterns jsonb not null,
  basescore numeric(3, 1) not null,
  severity text not null,
  tactics jsonb not null,
  techniques jsonb not null,
  reference jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_active boolean null default true,
  constraint powershell_signatures_pkey primary key (id)
);
```

## Funcionalidades

### Cache Inteligente
- **Cache automático** das signatures por 10 minutos
- **Renovação automática** quando expira
- **Performance otimizada** para análises repetidas

### Análise Regex
- **Patterns JSONB** do banco convertidos para regex Python
- **Case-insensitive** por padrão
- **Tratamento de erros** para patterns inválidos

### Score Dinâmico
- **Score base** vem do campo `basescore` do banco
- **Score total** é soma das signatures detectadas
- **Severidade** calculada automaticamente baseada no score

## Exemplo de Uso

### cURL
```bash
curl -X POST "http://localhost:8000/analyze-pcre2" \
  -H "Content-Type: application/json" \
  -d '{"command": "Invoke-Expression \"Get-Process\""}'
```

### Python
```python
import requests

response = requests.post(
    "http://localhost:8000/analyze-pcre2",
    json={"command": "Invoke-Expression \"Get-Process\""}
)

if response.status_code == 200:
    result = response.json()
    print(f"Score: {result['analysis']['risk_score']}")
    print(f"Malicioso: {result['analysis']['is_malicious']}")
    print(f"Signatures: {result['analysis']['detected_count']}/{result['analysis']['total_signatures_checked']}")
```

## Teste

### 1. Configurar ambiente
```bash
cd api
cp env.example.txt .env
# Editar .env com suas credenciais Supabase
```

### 2. Instalar dependências
```bash
pip install -r requirements.txt
```

### 3. Executar testes
```bash
python test_pcre2.py
```

## Estrutura de Dados Esperada

### Patterns (JSONB)
```json
[
  "Invoke-Expression",
  "\\biex\\b",
  "(?i)[a-z0-9+/=]{100,}"
]
```

### Tactics (JSONB)
```json
[
  "Execution",
  "Defense Evasion",
  "Persistence"
]
```

### Techniques (JSONB)
```json
[
  "T1059.001",
  "T1027.001",
  "T1543.003"
]
```

### Reference (JSONB)
```json
[
  "https://attack.mitre.org/techniques/T1059/001/",
  "CVE-2023-1234"
]
```

## Notas

- **Cache automático** melhora performance em 10x
- **Tratamento de erros** para patterns regex inválidos
- **Conversão automática** de tipos do banco para Python
- **Logs detalhados** para debug e monitoramento
- **Fallback graceful** se banco não estiver disponível
- **Score dinâmico** baseado no conteúdo do banco
- **Severidade automática** baseada no score total
- **Comandos com score >= 5.0** são considerados potencialmente maliciosos
