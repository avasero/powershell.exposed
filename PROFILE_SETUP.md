# Configuração da Tabela de Perfis

Este documento explica como configurar a criação automática de perfis quando um usuário se registra.

## 🎯 **Problema**
Quando um usuário se registra via magic link, o Supabase cria o registro em `auth.users`, mas não cria automaticamente o perfil em `profiles`.

## 🔧 **Solução Implementada**

### 1. **Trigger do Banco (Automático)**
Execute no **SQL Editor** do Supabase:

```sql
-- Create a function to handle new user profile creation
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop the trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS on profiles table
alter table public.profiles enable row level security;

-- Create RLS policies for profiles
create policy "Users can view their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);
```

### 2. **Fallback no Código (Backup)**
O `AuthContext.js` também foi atualizado para criar o perfil via código caso o trigger falhe.

## 🚀 **Como Funciona**

### **Registro via Magic Link:**
1. Usuário preenche email + username no `/register`
2. Supabase envia magic link com `user_metadata: {username, full_name}`
3. Usuário clica no link → Criação automática em `auth.users`
4. **Trigger automático** → Cria perfil em `profiles`
5. **Fallback no código** → Verifica e cria perfil se necessário

### **Dados do Perfil:**
- `id`: UUID do usuário (foreign key para `auth.users`)
- `username`: Do metadata ou email como fallback
- `full_name`: Do metadata ou username como fallback
- `avatar_url`: Do metadata (null por padrão)

## 🔍 **Verificação**

Para testar se está funcionando:

```sql
-- Verificar usuários e perfis
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'username' as metadata_username,
  p.username,
  p.full_name,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
```

## 🐛 **Troubleshooting**

### **Perfil não foi criado:**
1. Verifique se o trigger está ativo: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';`
2. Verifique logs do console do navegador para fallback
3. Execute manualmente: `INSERT INTO profiles (id, username, full_name) VALUES ('user-uuid', 'username', 'Full Name');`

### **Erro de permissão:**
- Certifique-se que RLS está configurado corretamente
- Verifique se as policies permitem inserção

### **Username duplicado:**
- A constraint `profiles_username_key` garante usernames únicos
- Se houver conflito, o sistema usará o email como fallback
