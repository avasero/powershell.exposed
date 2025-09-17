# 🚀 Guia de Setup da Vercel - API Python

## 🚨 PROBLEMA IDENTIFICADO

Seu repositório tem dois projetos:
- **Frontend** (Next.js) na pasta `frontend/`
- **API** (Python FastAPI) na pasta `api/`

A Vercel está confusa sobre qual projeto fazer deploy.

## ✅ SOLUÇÃO RECOMENDADA: Dois projetos separados

### **1. Projeto para Frontend (já existe)**
- URL: `https://powershell-exposed.vercel.app`
- Framework: Next.js
- Root Directory: `frontend/`

### **2. Projeto para API (criar novo)**

#### **Passo 1: Criar novo projeto na Vercel**
1. Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique em "Add New..." → "Project"
3. Selecione o mesmo repositório
4. **Nome**: `powershell-exposed-api`

#### **Passo 2: Configurar o projeto da API**
- **Framework Preset**: `Other`
- **Root Directory**: `api/`
- **Build Command**: (deixar vazio)
- **Output Directory**: (deixar vazio)
- **Install Command**: `pip install -r requirements.txt`

#### **Passo 3: Variáveis de ambiente**
Adicionar na API:
```
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

#### **Passo 4: Configurar vercel.json na pasta api/**
```json
{
  "builds": [
    {
      "src": "main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "main.py"
    }
  ]
}
```

## 🔄 ALTERNATIVA: Monorepo (mais complexo)

Se quiser manter tudo em um projeto:

### **1. Configuração do vercel.json na raiz:**
```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "api/main.py", 
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/main.py"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

### **2. Atualizar URLs no frontend:**
```javascript
// Em vez de:
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Usar:
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
```

## 🎯 RECOMENDAÇÃO

**Use a Opção 1** (dois projetos separados):
- ✅ Mais simples de configurar
- ✅ Deploys independentes
- ✅ Menos chance de conflitos
- ✅ URLs claras:
  - Frontend: `https://powershell-exposed.vercel.app`
  - API: `https://powershell-exposed-api.vercel.app`

## 📋 Checklist

### ✅ Para funcionar:
1. **Criar projeto separado** para API na Vercel
2. **Root Directory**: `api/`
3. **Variáveis de ambiente** configuradas
4. **vercel.json** na pasta `api/`
5. **requirements.txt** simples

### 🔍 Como verificar se funcionou:
```bash
# Deve funcionar depois do deploy
curl https://powershell-exposed-api.vercel.app/health
```

## 💡 Dica Rápida

Se quiser testar rapidamente:
1. **Delete o vercel.json da raiz**
2. **Crie novo projeto na Vercel** só para a API
3. **Configure Root Directory** como `api/`
4. **Faça deploy**

Isso deve resolver o problema de não iniciar o deployment! 🚀
