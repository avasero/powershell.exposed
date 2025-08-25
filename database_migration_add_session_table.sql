-- Migração para adicionar tabela de sessões e relacionar com análises
-- Data: 2024-12-19

-- 1. Criar tabela de sessões
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  ip inet NULL,
  browser text NULL,
  location text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2. Adicionar coluna session_id na tabela powershell_analyses (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'powershell_analyses' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.powershell_analyses ADD COLUMN session_id uuid NULL;
  END IF;
END $$;

-- 3. Criar índices para a tabela sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON public.sessions USING btree (ip) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions USING btree (created_at DESC) TABLESPACE pg_default;

-- 4. Criar índice para session_id na tabela powershell_analyses (se não existir)
CREATE INDEX IF NOT EXISTS idx_powershell_analyses_session_id ON public.powershell_analyses USING btree (session_id) TABLESPACE pg_default;

-- 5. Adicionar trigger para atualizar updated_at na tabela sessions
CREATE OR REPLACE FUNCTION update_sessions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_sessions_updated_at_column();

-- 6. Adicionar foreign key constraint (opcional, para manter integridade referencial)
-- ALTER TABLE public.powershell_analyses 
--   ADD CONSTRAINT fk_powershell_analyses_session_id 
--   FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;

-- 7. Comentários para documentar as tabelas
COMMENT ON TABLE public.sessions IS 'Tabela para rastrear sessões de usuários (autenticados e anônimos)';
COMMENT ON COLUMN public.sessions.user_id IS 'ID do usuário autenticado (NULL para sessões anônimas)';
COMMENT ON COLUMN public.sessions.ip IS 'Endereço IP da sessão';
COMMENT ON COLUMN public.sessions.browser IS 'Informações do navegador (user agent)';
COMMENT ON COLUMN public.sessions.location IS 'Localização geográfica baseada no IP';

COMMENT ON COLUMN public.powershell_analyses.session_id IS 'ID da sessão que gerou esta análise';
