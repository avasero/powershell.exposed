# Sistema de Rate Limiting e Captcha

## Visão Geral

Implementamos um sistema completo de rate limiting e captcha para proteger a aplicação contra uso excessivo de recursos e ataques automatizados.

## Configuração Backend (FastAPI)

### Rate Limiting
- **Limite**: 5 requisições por 60 segundos por IP
- **Captcha obrigatório**: A partir da 6ª requisição
- **Armazenamento**: Em memória (para produção, recomendamos Redis)

### Endpoints Adicionados

#### `POST /generate-captcha`
Gera um novo desafio de captcha matemático.

**Resposta de sucesso:**
```json
{
  "success": true,
  "captcha": {
    "token": "unique_token_here",
    "question": "5 + 3 = ?"
  }
}
```

#### `POST /verify-captcha`
Verifica a resposta do captcha.

**Request:**
```json
{
  "token": "unique_token_here",
  "answer": "8"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Captcha resolvido com sucesso"
}
```

#### `POST /analyze-pcre2` (Modificado)
Endpoint principal de análise agora inclui verificação de rate limiting e captcha.

**Request com captcha:**
```json
{
  "command": "Get-Process",
  "captcha_token": "unique_token_here",
  "captcha_answer": "8",
  "ip_address": "192.168.1.1",
  "country": "Brazil"
}
```

**Resposta de rate limit excedido:**
```json
{
  "error": "Rate limit excedido",
  "rate_limit_info": {
    "current_count": 6,
    "limit": 5,
    "window_seconds": 60,
    "requires_captcha": true
  }
}
```

## Configuração Frontend (Next.js)

### Componentes Adicionados

#### `CaptchaModal`
Modal que exibe o desafio de captcha quando necessário.

**Props:**
- `isOpen`: Boolean - Se o modal está aberto
- `onClose`: Function - Callback para fechar o modal
- `onSolved`: Function - Callback quando captcha é resolvido
- `apiUrl`: String - URL da API (opcional)

#### Hook `useRateLimit`
Hook personalizado para gerenciar estado de rate limiting.

**Retorna:**
- `rateLimitInfo`: Informações sobre o limite atual
- `showCaptcha`: Boolean - Se deve mostrar o captcha
- `captchaSolution`: Solução do captcha resolvido
- `handleRateLimitResponse`: Função para processar respostas da API
- `handleCaptchaSolved`: Callback quando captcha é resolvido
- `closeCaptcha`: Função para fechar captcha
- `reset`: Função para resetar estado

### Integração na Página Principal

A página principal (`page.js`) foi modificada para:

1. **Verificar rate limiting** antes de enviar requisições
2. **Mostrar modal de captcha** quando necessário
3. **Incluir dados do captcha** nas requisições subsequentes
4. **Exibir informações de rate limiting** para o usuário
5. **Desabilitar botão** quando limite é atingido

## Fluxo de Funcionamento

### Requisições Normais (1-5)
1. Usuário digita comando e clica "Analyze"
2. Frontend envia requisição para `/analyze-pcre2`
3. Backend verifica rate limit (OK)
4. Análise é processada normalmente
5. Resultado é retornado

### Requisições com Captcha (6+)
1. Usuário digita comando e clica "Analyze"
2. Frontend envia requisição para `/analyze-pcre2`
3. Backend detecta rate limit excedido
4. Backend retorna erro com `requires_captcha: true`
5. Frontend mostra modal de captcha
6. Usuário resolve captcha
7. Frontend reenvia requisição com dados do captcha
8. Backend verifica captcha e processa análise

### Rate Limit Excedido
1. Backend retorna erro 429 (Too Many Requests)
2. Frontend mostra mensagem de aviso
3. Botão de análise é desabilitado
4. Usuário deve aguardar 60 segundos

## Variáveis de Ambiente

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env.local)
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Melhorias Futuras

1. **Redis para Rate Limiting**: Usar Redis em produção para persistir dados entre reinicializações
2. **Captcha Mais Sofisticado**: Implementar reCAPTCHA ou hCaptcha
3. **Rate Limiting por Usuário**: Diferentes limites para usuários autenticados
4. **Whitelist de IPs**: Permitir IPs específicos sem rate limiting
5. **Logs de Segurança**: Registrar tentativas de abuse
6. **Rate Limiting Adaptativo**: Ajustar limites baseado no comportamento

## Segurança

- Tokens de captcha expiram em 5 minutos
- Verificação de IP para tokens de captcha
- Limpeza automática de dados expirados
- Validação de entrada rigorosa
- Headers de segurança apropriados

## Monitoramento

Para monitorar o sistema em produção, recomendamos:

1. **Métricas de Rate Limiting**: Quantas requisições são bloqueadas
2. **Taxa de Sucesso de Captcha**: % de captchas resolvidos corretamente
3. **IPs Mais Ativos**: Identificar possíveis abusadores
4. **Tempo de Resposta**: Impacto do rate limiting na performance
