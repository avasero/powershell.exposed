# Teste de Sincronização de Sessões

## Como Testar

### 1. Limpar Dados Existentes
```bash
# No navegador, abrir DevTools > Application > Local Storage
# Remover a chave 'anonymous_session_id' se existir
```

### 2. Fazer Uma Análise Anônima
1. Abrir a página de análise sem estar logado
2. Inserir um comando PowerShell (ex: `Get-Process`)
3. Clicar em "Analyze"

### 3. Verificar Logs do Console
**Frontend deve mostrar:**
```
🔑 getOrCreateSession: localStorage não disponível (SSR)
🔑 getOrCreateSession: nenhuma sessão encontrada, aguardando criação pelo backend
🔑 Salvando session_id do backend: [UUID_REAL]
```

**Backend deve mostrar:**
```
🔍 Session ID não fornecido, criando/obtendo sessão...
✅ Nova sessão criada: [UUID_REAL]
✅ Sessão gerenciada: [UUID_REAL]
✅ Incluindo session_id: [UUID_REAL]
```

### 4. Verificar LocalStorage
- Abrir DevTools > Application > Local Storage
- Deve existir uma chave `anonymous_session_id`
- O valor deve ser um JSON com o ID real da sessão

### 5. Verificar Banco de Dados
```sql
-- Verificar se a sessão foi criada
SELECT * FROM sessions WHERE id = '[UUID_REAL]';

-- Verificar se a análise foi associada
SELECT command, session_id FROM powershell_analyses 
WHERE session_id = '[UUID_REAL]';
```

## Fluxo Esperado

1. **Primeira análise**: Frontend não tem sessão → Backend cria → Frontend salva
2. **Análises subsequentes**: Frontend usa sessão existente → Backend reutiliza
3. **Sessão expira**: Frontend remove → Backend cria nova

## Problemas Comuns

### ❌ Sessão não aparece no localStorage
- Verificar se `saveSessionFromBackend` está sendo chamada
- Verificar se `response.session_id` está sendo retornado pelo backend

### ❌ Sessão não é salva no banco
- Verificar logs do backend para erros de inserção
- Verificar se a tabela `sessions` foi criada

### ❌ ID da sessão não é o mesmo
- Frontend deve usar o ID retornado pelo backend
- Não deve criar IDs locais

## Logs de Debug

### Frontend
```javascript
// Verificar sessão atual
console.log('Sessão atual:', localStorage.getItem('anonymous_session_id'));

// Verificar se saveSessionFromBackend foi chamada
// Deve aparecer: 🔑 Sessão salva do backend: [UUID]
```

### Backend
```python
# Verificar se get_or_create_session está funcionando
# Deve aparecer: ✅ Nova sessão criada: [UUID]

# Verificar se session_id está sendo incluído
# Deve aparecer: ✅ Incluindo session_id: [UUID]
```
