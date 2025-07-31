-- Estrutura do banco de dados para o Supabase
-- Execute estes comandos no SQL Editor do Supabase

-- 1. Criar tabela de perfis de usuário
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela para análises de PowerShell
CREATE TABLE powershell_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  command TEXT NOT NULL,
  analysis_result JSONB,
  risk_score INTEGER DEFAULT 0,
  severity TEXT CHECK (severity IN ('info', 'medium', 'high', 'critical')) DEFAULT 'info',
  signatures_detected JSONB DEFAULT '[]'::jsonb,
  decoded_command TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE powershell_analyses ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS para perfis
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Criar políticas RLS para análises
CREATE POLICY "Users can view own analyses" ON powershell_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON powershell_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON powershell_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON powershell_analyses FOR DELETE USING (auth.uid() = user_id);

-- 6. Criar índices para performance
CREATE INDEX idx_powershell_analyses_user_id ON powershell_analyses(user_id);
CREATE INDEX idx_powershell_analyses_created_at ON powershell_analyses(created_at DESC);
CREATE INDEX idx_powershell_analyses_severity ON powershell_analyses(severity);
CREATE INDEX idx_powershell_analyses_risk_score ON powershell_analyses(risk_score DESC);

-- 7. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Criar triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_powershell_analyses_updated_at BEFORE UPDATE ON powershell_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Criar função para criar perfil automaticamente após registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Criar trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Criar view para estatísticas do usuário
CREATE VIEW user_analysis_stats AS
SELECT 
  user_id,
  COUNT(*) as total_analyses,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_count,
  COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE severity = 'info') as info_count,
  AVG(risk_score) as avg_risk_score,
  MAX(created_at) as last_analysis_date
FROM powershell_analyses
GROUP BY user_id;

-- Nota: Views não suportam políticas RLS diretamente, 
-- a segurança é herdada da tabela powershell_analyses
