-- Fix para os problemas de segurança: Function Search Path Mutable
-- Execute este SQL no SQL Editor do Supabase

-- 1. Atualizar a função update_updated_at_column com search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Atualizar a função handle_new_user com search_path seguro  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Comentários sobre as mudanças:
-- - SECURITY DEFINER: garante que a função roda com privilégios do proprietário
-- - SET search_path = public, pg_temp: define um search_path fixo e seguro
-- - Para handle_new_user: adicionei 'auth' ao search_path para acessar auth.users

-- 4. Verificar se as funções ainda funcionam corretamente
-- Teste criando um novo usuário para verificar se o trigger ainda funciona
