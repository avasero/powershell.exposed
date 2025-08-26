# Correção do Erro: `captcha_token` não definido

## 🚨 **Problema Identificado**

**Erro**: `Internal error: cannot access local variable 'captcha_token' where it is not associated with a value`

**Causa**: A variável `captcha_token` estava sendo usada **antes** de ser definida no endpoint `/analyze-pcre2`.

### **Ordem Incorreta (ANTES):**
```python
# Linha 508: USANDO captcha_token ANTES de definir
if not (captcha_token and captcha_answer):  # ❌ ERRO: variável não definida

# Linha 532: DEFININDO captcha_token DEPOIS
captcha_token = body.get("captcha_token")   # ✅ Definição muito tarde
```

## ✅ **Solução Aplicada**

### **Nova Ordem Correta (DEPOIS):**
```python
# 1. Obter IP do cliente
client_ip = getattr(request.state, 'client_ip', None)

# 2. LER O BODY PRIMEIRO (para ter acesso aos dados do captcha)
body = await request.json()

# 3. DEFINIR TODAS AS VARIÁVEIS
command = body.get("command", "")
user_id = body.get("user_id")
captcha_token = body.get("captcha_token")      # ✅ Definido ANTES de usar
captcha_answer = body.get("captcha_answer")    # ✅ Definido ANTES de usar

# 4. VERIFICAR RATE LIMIT (agora pode usar as variáveis)
if client_ip:
    rate_limit_info = check_rate_limit(client_ip)
    
    if not rate_limit_info["within_limit"]:
        # ✅ Agora pode usar captcha_token e captcha_answer
        if not (captcha_token and captcha_answer):
            return JSONResponse(...)
```

## 🔧 **Mudanças Específicas**

### **Arquivo**: `api/main.py` (linha ~500-535)

**ANTES** (ordem incorreta):
```python
# Verificar rate limit primeiro
if client_ip:
    rate_limit_info = check_rate_limit(client_ip)
    
    if not rate_limit_info["within_limit"]:
        if not (captcha_token and captcha_answer):  # ❌ ERRO
            return JSONResponse(...)

body = await request.json()  # Muito tarde
captcha_token = body.get("captcha_token")  # Muito tarde
```

**DEPOIS** (ordem correta):
```python
# Ler o body primeiro para ter acesso aos dados do captcha
body = await request.json()
captcha_token = body.get("captcha_token")
captcha_answer = body.get("captcha_answer")

# Verificar rate limit depois de ter os dados do captcha
if client_ip:
    rate_limit_info = check_rate_limit(client_ip)
    
    if not rate_limit_info["within_limit"]:
        if not (captcha_token and captcha_answer):  # ✅ OK
            return JSONResponse(...)
```

## 🎯 **Resultado**

- ✅ **Erro eliminado**: `captcha_token` é definido antes de ser usado
- ✅ **Lógica preservada**: Rate limiting funciona igual
- ✅ **Captcha funciona**: Verificação de captcha continua funcionando
- ✅ **Performance**: Sem impacto negativo (apenas mudança de ordem)

## 🚀 **Fluxo Correto Agora**

1. **Obter IP** do cliente
2. **Ler body** da requisição 
3. **Extrair variáveis** (incluindo `captcha_token` e `captcha_answer`)
4. **Verificar rate limit** 
5. **Usar variáveis** já definidas na lógica de rate limiting
6. **Processar** a análise normalmente

O erro estava causando falhas internas na API quando o rate limit era atingido. Agora o sistema funciona corretamente! 🎉
