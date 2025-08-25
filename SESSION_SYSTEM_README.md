# Sistema de Sessões para Análises Anônimas

## Visão Geral

Este sistema implementa um mecanismo de rastreamento de sessões para análises anônimas, permitindo agrupar análises por sessão mesmo quando o usuário não está autenticado.

## Estrutura do Banco de Dados

### Tabela `sessions`
```sql
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  ip inet NULL,
  browser text NULL,
  location text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);
```

### Tabela `powershell_analyses` (modificada)
- Adicionada coluna `session_id uuid NULL`
- Criado índice `idx_powershell_analyses_session_id`

## Como Funciona

### 1. Criação de Sessão
- **Frontend**: Quando um usuário anônimo faz uma análise, o sistema automaticamente cria ou reutiliza uma sessão
- **Backend**: A sessão é criada baseada no IP, user agent e localização
- **Duração**: Sessões duram 24 horas

### 2. Rastreamento de Análises
- Cada análise anônima é associada a uma `session_id`
- Análises da mesma sessão podem ser agrupadas para análise de comportamento
- Permite identificar padrões de uso mesmo sem autenticação

### 3. Gerenciamento de Sessões
- **LocalStorage**: Sessões são armazenadas no navegador do usuário
- **Renovação**: Sessões são automaticamente renovadas a cada atividade
- **Expiração**: Sessões expiradas são automaticamente removidas

## Implementação

### Backend (Python/FastAPI)
```python
async def get_or_create_session(supabase, user_id=None, ip_address=None, user_agent=None, country=None, city=None, region=None):
    # Busca sessão existente nas últimas 24 horas
    # Cria nova sessão se não encontrar
    # Retorna session_id
```

### Frontend (JavaScript)
```javascript
import { getOrCreateSession } from '../../utils/session';

// Obter ou criar sessão automaticamente
const sessionId = getOrCreateSession();

// Incluir na requisição
body: JSON.stringify({
  command: command,
  session_id: sessionId,
  // ... outros campos
})
```

## Benefícios

1. **Rastreabilidade**: Análises anônimas podem ser agrupadas por sessão
2. **Análise de Comportamento**: Identificar padrões de uso suspeitos
3. **Estatísticas**: Melhor compreensão do uso da plataforma
4. **Segurança**: Rastrear tentativas de abuso ou uso malicioso

## Casos de Uso

### Análise de Padrões
```sql
-- Análises por sessão
SELECT 
  s.id as session_id,
  s.ip,
  s.location,
  COUNT(pa.id) as analysis_count,
  AVG(pa.risk_score) as avg_risk_score
FROM sessions s
JOIN powershell_analyses pa ON s.id = pa.session_id
WHERE s.user_id IS NULL
GROUP BY s.id, s.ip, s.location
ORDER BY analysis_count DESC;
```

### Detecção de Abuso
```sql
-- Sessões com muitas análises suspeitas
SELECT 
  s.id,
  s.ip,
  COUNT(pa.id) as suspicious_count
FROM sessions s
JOIN powershell_analyses pa ON s.id = pa.session_id
WHERE pa.is_malicious = true
  AND s.created_at > NOW() - INTERVAL '1 hour'
GROUP BY s.id, s.ip
HAVING COUNT(pa.id) > 10;
```

## Configuração

### 1. Executar Migração
```bash
# Executar o arquivo de migração
psql -d your_database -f database_migration_add_session_table.sql
```

### 2. Verificar Tabelas
```sql
-- Verificar se a tabela sessions foi criada
SELECT * FROM information_schema.tables WHERE table_name = 'sessions';

-- Verificar se session_id foi adicionado
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'powershell_analyses' AND column_name = 'session_id';
```

### 3. Testar Funcionamento
```sql
-- Inserir análise de teste
INSERT INTO powershell_analyses (command, session_id, search_type) 
VALUES ('Get-Process', 'test-session-id', 'TEST');

-- Verificar se foi inserida
SELECT * FROM powershell_analyses WHERE session_id = 'test-session-id';
```

## Monitoramento

### Logs do Backend
- `✅ Sessão existente encontrada: {session_id}`
- `✅ Nova sessão criada: {session_id}`
- `✅ Sessão gerenciada: {session_id}`

### Logs do Frontend
- `🔑 Sessão existente encontrada: {session_id}`
- `🔑 Nova sessão criada: {session_id}`
- `🔑 Sessão renovada: {session_id}`

## Considerações de Privacidade

- **IPs**: São armazenados para rastreamento de sessão
- **Localização**: Baseada em IP, não GPS
- **Duração**: Sessões expiram automaticamente após 24 horas
- **Anonimização**: Não há link direto com identidade pessoal

## Troubleshooting

### Problema: Sessões não estão sendo criadas
- Verificar se a tabela `sessions` foi criada
- Verificar logs do backend para erros de inserção
- Confirmar se o `session_id` está sendo enviado do frontend

### Problema: Análises não estão sendo associadas a sessões
- Verificar se a coluna `session_id` foi adicionada
- Confirmar se o backend está recebendo o `session_id`
- Verificar logs de inserção no banco

### Problema: Sessões expiram muito rapidamente
- Verificar configuração de `SESSION_DURATION` no frontend
- Confirmar se o `localStorage` está funcionando
- Verificar se há problemas de timezone
