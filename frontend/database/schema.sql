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
  risk_score DECIMAL(3,1) DEFAULT 0.0, -- Score baseado nas signatures YAML
  signatures_detected JSONB DEFAULT '[]'::jsonb,
  signature_file TEXT, -- Nome do arquivo YAML da signature que detectou
  tactics JSONB DEFAULT '[]'::jsonb, -- Táticas MITRE ATT&CK
  techniques JSONB DEFAULT '[]'::jsonb, -- Técnicas MITRE ATT&CK
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
CREATE INDEX idx_powershell_analyses_risk_score ON powershell_analyses(risk_score DESC);
CREATE INDEX idx_powershell_analyses_signature_file ON powershell_analyses(signature_file);
CREATE INDEX idx_powershell_analyses_tactics ON powershell_analyses USING GIN(tactics);
CREATE INDEX idx_powershell_analyses_techniques ON powershell_analyses USING GIN(techniques);

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
  COUNT(*) FILTER (WHERE risk_score >= 8.1) as critical_count,
  COUNT(*) FILTER (WHERE risk_score >= 6.1 AND risk_score <= 8.0) as high_count,
  COUNT(*) FILTER (WHERE risk_score >= 4.1 AND risk_score <= 6.0) as medium_count,
  COUNT(*) FILTER (WHERE risk_score >= 2.1 AND risk_score <= 4.0) as low_count,
  COUNT(*) FILTER (WHERE risk_score >= 1.0 AND risk_score <= 2.0) as very_low_count,
  AVG(risk_score) as avg_risk_score,
  MAX(created_at) as last_analysis_date,
  -- Estatísticas por táticas MITRE ATT&CK
  COUNT(*) FILTER (WHERE tactics ? 'Persistence') as persistence_count,
  COUNT(*) FILTER (WHERE tactics ? 'Defense Evasion') as defense_evasion_count,
  COUNT(*) FILTER (WHERE tactics ? 'Execution') as execution_count,
  COUNT(*) FILTER (WHERE tactics ? 'Privilege Escalation') as privilege_escalation_count
FROM powershell_analyses
GROUP BY user_id;

-- Nota: Views não suportam políticas RLS diretamente, 
-- a segurança é herdada da tabela powershell_analyses
