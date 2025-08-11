# PowerShell.Exposed - Backend Migration to Supabase

Este projeto foi migrado para usar Supabase Edge Functions no backend para análise de comandos PowerShell.

## 🏗️ Arquitetura

- **Frontend**: Next.js
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth

## 🚀 Deploy das Edge Functions

### Pré-requisitos

1. **Supabase CLI** instalado:
   ```bash
   npm install -g supabase
   ```

2. **Conta no Supabase** e projeto criado

3. **Variáveis de ambiente** configuradas no projeto Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Deploy Step-by-Step

1. **Login no Supabase**:
   ```bash
   supabase login
   ```

2. **Obter Project Reference**:
   - Vá ao dashboard do Supabase
   - Copie o Project Reference (formato: `abcdefghijklmnop`)

3. **Deploy das Functions**:

   **No Linux/Mac**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   **No Windows (PowerShell)**:
   ```powershell
   .\deploy.ps1
   ```

   **Ou manualmente**:
   ```bash
   supabase functions deploy analyze-command --project-ref YOUR_PROJECT_REF
   supabase functions deploy get-user-analyses --project-ref YOUR_PROJECT_REF
   ```

## 📋 Edge Functions

### 1. analyze-command
**Endpoint**: `/functions/v1/analyze-command`
**Método**: POST
**Autenticação**: JWT Bearer Token

**Request**:
```json
{
  "command": "Get-Process | Where-Object CPU -gt 100"
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "id": "uuid",
    "user_id": "uuid",
    "command": "Get-Process | Where-Object CPU -gt 100",
    "analysis_result": {
      "is_malicious": false,
      "risk_score": 2.1,
      "severity": "low",
      "signatures_detected": [],
      "tactics": [],
      "techniques": [],
      "decoded_command": null,
      "analysis_details": {
        "indicators": [],
        "patterns_found": [],
        "recommendations": ["✅ Command appears to be safe"]
      }
    },
    "created_at": "2025-01-01T12:00:00.000Z"
  }
}
```

### 2. get-user-analyses
**Endpoint**: `/functions/v1/get-user-analyses`
**Método**: GET
**Autenticação**: JWT Bearer Token
**Query Params**: `page`, `limit`

**Response**:
```json
{
  "analyses": [...],
  "stats": {
    "total_analyses": 10,
    "critical_count": 1,
    "high_count": 2,
    "medium_count": 3,
    "low_count": 2,
    "very_low_count": 2,
    "avg_risk_score": 4.5
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "has_more": false
  }
}
```

## 🔧 Configuração do Frontend

### Variáveis de Ambiente (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Uso no Frontend
```javascript
import { analyzeCommand, getUserAnalyses } from './lib/supabase';

// Analisar comando
const result = await analyzeCommand("Get-Process");

// Buscar análises do usuário
const { analyses, stats } = await getUserAnalyses(1, 10);
```

## 🗄️ Estrutura do Banco

As tabelas já existem no seu projeto:
- `profiles` - Perfis de usuários
- `powershell_analyses` - Análises de comandos
- `user_analysis_stats` - View com estatísticas

## 🛡️ Segurança

- **Row Level Security (RLS)** habilitado
- **JWT Authentication** em todas as Edge Functions
- **Políticas de acesso** baseadas no `user_id`

## 🔍 Assinaturas de Detecção

As Edge Functions incluem assinaturas para detectar:

1. **Invoke-Expression** (IEX, Invoke-Expression)
2. **Base64 Encoding** (FromBase64String, -EncodedCommand)
3. **Web Downloads** (WebClient, DownloadString)
4. **Service Creation** (New-Service, sc create)
5. **Scheduled Tasks** (schtasks, Register-ScheduledTask)
6. **Windows Defender Tampering** (Set-MpPreference)

## 📊 Sistema de Scoring

- **1.0-2.0**: Very Low
- **2.1-4.0**: Low  
- **4.1-6.0**: Medium
- **6.1-8.0**: High
- **8.1-10.0**: Critical

## 🧪 Teste

Para testar as functions após o deploy:

1. **Comando Seguro**:
   ```powershell
   Get-Process
   ```

2. **Comando com Base64**:
   ```powershell
   [Convert]::FromBase64String("SGVsbG8gV29ybGQ=")
   ```

3. **Comando com Download**:
   ```powershell
   IWR -Uri "https://example.com/script.ps1"
   ```

## 🐛 Troubleshooting

### Erro de CORS
- Verifique se os headers CORS estão corretos nas Edge Functions

### Erro de Autenticação
- Confirme que o JWT token está sendo enviado corretamente
- Verifique as políticas RLS no Supabase

### Timeout na Function
- Edge Functions têm limite de 60 segundos
- Otimize a lógica de análise se necessário

### Deploy Falha
- Verifique se o Project Reference está correto
- Confirme que você tem permissões no projeto Supabase
