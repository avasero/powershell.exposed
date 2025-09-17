# 🚀 Deploy na Vercel - Guia de Troubleshooting

## 🔧 Correções Aplicadas

### 1. **main.py com imports condicionais**
- ✅ Imports protegidos com try/catch
- ✅ Fallback routes se imports falharem
- ✅ PYTHONPATH configurado no vercel.json

### 2. **requirements.txt simplificado**
- ✅ Removidas versões específicas que podem causar conflito
- ✅ Mantidas apenas dependências essenciais

### 3. **vercel.json otimizado**
- ✅ Timeout aumentado para 30s
- ✅ PYTHONPATH configurado

## 📋 Checklist para Deploy

### ✅ Antes do deploy:
1. **Variáveis de ambiente configuradas na Vercel:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET` (opcional)
   - `SUPABASE_ANON_KEY` (opcional)

2. **Migração executada no Supabase:**
   ```sql
   -- Execute: supabase/migrations/20250117000002_add_api_key_to_profiles.sql
   ```

### 🚀 Após o deploy:

1. **Teste básico:**
   ```bash
   curl https://sua-api-vercel.app/health
   ```

2. **Teste análise:**
   ```bash
   curl -X POST https://sua-api-vercel.app/analyze-pcre2 \
     -H "Content-Type: application/json" \
     -d '{"command": "Get-Process"}'
   ```

## 🐛 Troubleshooting

### Erro: "FUNCTION_INVOCATION_FAILED"

**Possíveis causas:**
1. **Import errors** - Alguns módulos não carregaram
2. **Timeout** - Função demorou mais que 30s
3. **Variáveis de ambiente** - Faltando configs do Supabase

**Soluções:**
1. **Verificar logs da Vercel:**
   - Vá para Vercel Dashboard
   - Functions → View Function Logs
   - Procure por erros de import

2. **Testar endpoints básicos:**
   ```bash
   # Deve funcionar mesmo com imports limitados
   curl https://sua-api-vercel.app/
   curl https://sua-api-vercel.app/health
   ```

3. **Configurar variáveis de ambiente:**
   - Vercel Dashboard → Settings → Environment Variables
   - Adicionar todas as variáveis do Supabase

### Erro: "Module not found"

**Solução:**
- O main.py agora tem fallbacks para imports que falharem
- Endpoints básicos funcionam mesmo sem todos os módulos

### Erro: "Timeout"

**Soluções:**
1. **Aumentar timeout** (já configurado para 30s)
2. **Otimizar queries** do Supabase
3. **Usar cache** para assinaturas

## 📊 Status dos Endpoints

### ✅ Sempre disponíveis:
- `GET /` - Root endpoint
- `GET /health` - Health check

### ⚠️ Dependem de imports:
- `POST /analyze-pcre2` - Análise de comandos
- `GET /user-analyses` - Análises do usuário
- Endpoints de API Keys

### 🔍 Como verificar:

```bash
# Verificar status dos imports
curl https://sua-api-vercel.app/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "basic_routes": true,
  "advanced_features": true
}
```

## 🚀 Deploy Rápido

1. **Commit e push:**
   ```bash
   git add .
   git commit -m "Fix Vercel serverless deployment"
   git push
   ```

2. **Aguardar build da Vercel**

3. **Testar:**
   ```bash
   curl https://sua-api-vercel.app/health
   ```

## 💡 Dicas

- **Logs da Vercel**: Sempre verifique os logs para erros específicos
- **Cold starts**: Primeira requisição pode ser mais lenta
- **Timeout**: Funções serverless têm limite de tempo
- **Memory**: Imports pesados podem causar problemas

## 🆘 Se ainda não funcionar

1. **Verificar logs detalhados na Vercel**
2. **Testar localmente:** `python main.py` (deve funcionar)
3. **Simplificar ainda mais** removendo funcionalidades complexas temporariamente
