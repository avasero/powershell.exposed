# Implementação da Lógica OU (Tempo OU Captcha)

## ✅ **Nova Lógica Implementada**

### **Conceito: Escolha do Usuário**
Quando o rate limit é atingido (5 análises), o usuário tem **duas opções**:

1. **⏰ ESPERAR** o tempo resetar automaticamente
2. **🔓 RESOLVER CAPTCHA** para continuar imediatamente

**NÃO é mais obrigatório fazer captcha + esperar tempo!**

## 🔧 **Correções Implementadas**

### 1. **Corrigido Cálculo do Timer**
**Problema**: Timer mostrava 30 segundos incorretos.

**Solução**: Cálculo baseado na requisição mais antiga:
```python
# Calcular reset apenas se atingiu o limite básico (5)
if current_requests and request_count >= RATE_LIMIT_REQUESTS:
    oldest_request = min(current_requests)
    reset_time = oldest_request + RATE_LIMIT_WINDOW  # 60 segundos
    seconds_until_reset = max(0, int(reset_time - current_time))
    print(f"🕐 Reset em: {seconds_until_reset} segundos")
```

### 2. **Lógica OU Implementada no Backend**
```python
# Se passou do limite (5), oferecer duas opções
if not rate_limit_info["within_limit"]:
    # Se não tem captcha, mostrar as opções
    if not (captcha_token and captcha_answer):
        return JSONResponse({
            "error": "Rate limit exceeded - Choose option",
            "rate_limit_info": rate_limit_info,
            "requires_captcha": True,
            "message": f"You can either wait {seconds_until_reset} seconds OR solve the captcha to continue immediately."
        }, status_code=400)  # 400 para mostrar opções, não 429 para bloquear

# Se tem captcha válido, resetar rate limit completamente
if captcha_token and captcha_answer and verify_captcha(captcha_token, captcha_answer):
    reset_rate_limit(client_ip)  # ✅ RESET COMPLETO
    print(f"✅ Captcha resolvido! Usuário pode continuar normalmente")
```

### 3. **Interface Visual Atualizada**
```jsx
{/* Nova interface mostrando as duas opções claramente */}
<div className="mt-3 space-y-3">
  <div className="font-medium text-center p-2 bg-orange-100 rounded border">
    🚫 Rate limit reached - Choose an option:
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {/* Opção 1: Esperar */}
    <div className="p-3 bg-blue-50 rounded border">
      <div className="text-center">
        <div className="text-lg mb-2">⏰</div>
        <div className="font-bold">Option 1: Wait</div>
        <div className="font-mono text-sm font-bold">{formatTime}</div>
        <div className="text-xs mt-1">Wait for automatic reset</div>
      </div>
    </div>
    
    {/* Opção 2: Captcha */}
    <div className="p-3 bg-green-50 rounded border">
      <div className="text-center">
        <div className="text-lg mb-2">🔓</div>
        <div className="font-bold">Option 2: Solve Captcha</div>
        <div className="text-sm">Continue immediately</div>
        <div className="text-xs mt-1">Solve the captcha below</div>
      </div>
    </div>
  </div>
  
  <div className="text-center text-xs border-t pt-2">
    Choose either option to continue making searches
  </div>
</div>
```

## 🎯 **Fluxo Atualizado**

### **Cenário 1: Usuário Espera**
```
1. Faz 5 análises → Rate limit atingido
2. Vê timer: "Option 1: Wait 45s"
3. Espera 45 segundos → Timer chega a 0
4. Pode fazer novas análises normalmente
```

### **Cenário 2: Usuário Resolve Captcha**
```
1. Faz 5 análises → Rate limit atingido
2. Vê: "Option 2: Solve Captcha - Continue immediately"
3. Resolve captcha → Rate limit resetado instantaneamente
4. Pode fazer novas análises imediatamente (sem esperar timer)
```

### **Cenário 3: Timer Expira Durante Captcha**
```
1. Faz 5 análises → Vê duas opções
2. Começa a resolver captcha
3. Timer expira naturalmente → Rate limit reseta
4. Pode fazer nova análise (não precisa mais do captcha)
```

## 📊 **Logs de Debug**

```
🔒 Rate limit info: {"current_count": 5, "within_limit": false, "seconds_until_reset": 45}
🔒 Verificando captcha para contornar rate limit...
✅ Captcha resolvido! Rate limit resetado para IP: 177.22.33.182
🔄 Usuário pode continuar fazendo análises normalmente
📊 Requisição adicionada. Novo count para IP 177.22.33.182
```

## 🎨 **Interface Visual**

### **Estado: Rate Limit Atingido**
```
⚠️ Notice: You have made 5 of 5 allowed searches in 60 seconds.

🚫 Rate limit reached - Choose an option:

┌─────────────────┐  ┌─────────────────┐
│  ⏰ Option 1    │  │  🔓 Option 2    │
│  Wait           │  │  Solve Captcha  │
│  45s            │  │  Continue       │
│  Auto reset     │  │  immediately    │
└─────────────────┘  └─────────────────┘

Choose either option to continue making searches

🔒 Security Verification
To continue, solve the math operation below:
[Captcha aparece aqui]
```

## ✅ **Benefícios da Nova Lógica**

1. **🎯 Escolha do Usuário**: Pode escolher esperar OU resolver captcha
2. **⚡ Flexibilidade**: Captcha permite continuar imediatamente
3. **🕐 Transparência**: Timer mostra exatamente quanto tempo esperar
4. **🔄 Reset Inteligente**: Captcha reseta completamente o rate limit
5. **💡 UX Melhorada**: Interface clara mostrando as duas opções

## 🧪 **Como Testar**

1. **Faça 5 análises rápidas** → Rate limit atingido
2. **Veja as duas opções** claramente na interface
3. **Escolha uma opção**:
   - **Esperar**: Timer conta regressivamente até 0
   - **Captcha**: Resolve e pode continuar imediatamente
4. **Teste ambos cenários** para confirmar funcionamento

A nova lógica oferece **flexibilidade total** ao usuário! 🚀
