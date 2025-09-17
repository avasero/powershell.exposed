# 🔑 Setup de API Keys - Guia Rápido

## 📋 Passos para implementar API Keys

### 1. **Executar migração no Supabase**

Execute o SQL da migração na sua instância do Supabase:

```sql
-- Arquivo: supabase/migrations/20250117000002_add_api_key_to_profiles.sql

-- Add API key fields to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN api_key TEXT NULL UNIQUE,
ADD COLUMN api_key_name TEXT NULL DEFAULT 'Default API Key',
ADD COLUMN api_key_created_at TIMESTAMPTZ NULL,
ADD COLUMN api_key_last_used_at TIMESTAMPTZ NULL,
ADD COLUMN api_key_usage_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN api_key_is_active BOOLEAN NOT NULL DEFAULT false;

-- Create index for fast API key lookups
CREATE INDEX idx_profiles_api_key ON public.profiles(api_key) WHERE api_key IS NOT NULL AND api_key_is_active = true;

-- Function to increment API key usage count
CREATE OR REPLACE FUNCTION increment_api_key_usage_count(api_key_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE public.profiles 
    SET 
        api_key_usage_count = api_key_usage_count + 1,
        api_key_last_used_at = NOW()
    WHERE api_key = api_key_param AND api_key_is_active = true;
    
    SELECT api_key_usage_count INTO new_count
    FROM public.profiles 
    WHERE api_key = api_key_param AND api_key_is_active = true;
    
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;
```

### 2. **Verificar se funcionou**

Execute o teste:
```sql
-- Arquivo: supabase/test_profiles_structure.sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name LIKE 'api_key%'
ORDER BY column_name;
```

Deve retornar:
```
api_key               | text
api_key_created_at    | timestamp with time zone
api_key_is_active     | boolean
api_key_last_used_at  | timestamp with time zone
api_key_name          | text
api_key_usage_count   | integer
```

### 3. **Iniciar o servidor**

```bash
cd api
python main.py
```

### 4. **Testar no frontend**

1. Fazer login no frontend
2. Ir para `http://localhost:3000/api-keys`
3. Criar API Key
4. Copiar a key gerada

### 5. **Testar no Postman**

```
GET http://localhost:8000/user/command-evaluations
Authorization: Bearer pse_sua_api_key_aqui
```

## 🔍 Endpoints disponíveis com API Key

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/analyze-pcre2` | POST | Analisar comando PowerShell |
| `/user/command-evaluations` | GET | Buscar suas análises |
| `/user/profile` | GET | Ver perfil (JWT + API Key) |
| `/user/statistics` | GET | Estatísticas (JWT + API Key) |

## 🚫 Endpoints só com JWT (não API Key)

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/user/api-key` | GET | Ver API Key atual |
| `/user/api-key` | POST | Criar API Key |
| `/user/api-key` | PUT | Regenerar API Key |
| `/user/api-key` | DELETE | Revogar API Key |

## 📊 Estrutura da tabela profiles

Depois da migração, a tabela `profiles` terá:

```sql
CREATE TABLE public.profiles (
  id uuid not null,
  username text null,
  full_name text null,
  avatar_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  
  -- Novos campos para API Keys
  api_key text null unique,
  api_key_name text null default 'Default API Key',
  api_key_created_at timestamptz null,
  api_key_last_used_at timestamptz null,
  api_key_usage_count integer not null default 0,
  api_key_is_active boolean not null default false,
  
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign key (id) references auth.users (id)
);
```

## ✅ Validação

Para testar se está funcionando:

1. **Backend**: Logs devem mostrar "✅ API Key criada para usuário"
2. **Frontend**: Página `/api-keys` deve mostrar a key
3. **Postman**: Deve conseguir acessar endpoints protegidos
4. **Banco**: Tabela `profiles` deve ter dados nas colunas `api_key_*`

## 🚨 Troubleshooting

**Erro "column api_key does not exist":**
- Execute a migração SQL no Supabase

**API Key não funciona:**
- Verifique se `api_key_is_active = true`
- Confirme que a key começa com `pse_`

**Frontend não carrega API Keys:**
- Verifique se o usuário está logado
- Confirme se o backend está rodando na porta 8000
