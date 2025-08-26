# Implementação do Timer Dinâmico para Rate Limiting

## ✅ **Problemas Resolvidos**

### 1. **Captcha não resetava o rate limit**
- **Problema**: Após resolver o captcha, o usuário caía no captcha novamente na próxima análise
- **Solução**: Implementado reset automático do rate limit quando captcha é resolvido

### 2. **Falta de feedback visual sobre tempo de espera**
- **Problema**: Usuário não sabia quanto tempo precisava esperar para fazer nova análise
- **Solução**: Timer dinâmico em tempo real mostrando countdown até o reset

## 🔧 **Implementações Técnicas**

### **Backend - `api/main.py`**

#### 1. **Nova função `reset_rate_limit()`**
```python
def reset_rate_limit(ip_address: str):
    """Resets the rate limit counter for an IP address"""
    if ip_address in request_counts:
        del request_counts[ip_address]
        print(f"🔄 Rate limit resetado para IP: {ip_address}")
```

#### 2. **Melhorada função `check_rate_limit()`**
```python
def check_rate_limit(ip_address: str) -> dict:
    # ... código existente ...
    
    # Calcular quando o rate limit vai resetar
    reset_time = None
    seconds_until_reset = None
    if current_requests and request_count >= RATE_LIMIT_REQUESTS:
        oldest_request = min(current_requests)
        reset_time = oldest_request + RATE_LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
    
    return {
        # ... campos existentes ...
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }
```

#### 3. **Reset automático após captcha resolvido**
```python
# Quando captcha é resolvido com sucesso
if not verify_captcha(captcha_token, captcha_answer):
    # ... erro ...
else:
    # Marcar captcha como resolvido e resetar rate limit
    captcha_tokens[captcha_token]["solved"] = True
    print(f"✅ Captcha resolvido com sucesso para IP: {client_ip}")
    
    # RESETAR o rate limit quando captcha é resolvido
    if client_ip:
        reset_rate_limit(client_ip)
        print(f"🔄 Rate limit resetado após captcha resolvido")
```

### **Frontend - Novo Hook `useCountdownTimer.js`**

```javascript
export function useCountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const startTimer = useCallback((seconds) => {
    if (seconds > 0) {
      setTimeLeft(seconds);
      setIsActive(true);
    }
  }, []);

  // Timer atualiza a cada segundo
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            setIsActive(false);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, []);

  return { timeLeft, isActive, startTimer, stopTimer, formatTime };
}
```

### **Frontend - Hook `useRateLimit.js` Atualizado**

```javascript
import { useCountdownTimer } from './useCountdownTimer';

export function useRateLimit() {
  // ... estado existente ...
  const { timeLeft, isActive, startTimer, stopTimer, formatTime } = useCountdownTimer();

  const handleRateLimitResponse = useCallback((response, data) => {
    if (response.status === 429) {
      const rateLimitData = data.rate_limit_info;
      setRateLimitInfo(rateLimitData);
      
      // ✅ INICIAR TIMER quando rate limit é atingido
      if (rateLimitData?.seconds_until_reset) {
        console.log(`🕐 Iniciando timer: ${rateLimitData.seconds_until_reset} segundos`);
        startTimer(rateLimitData.seconds_until_reset);
      }
      
      return true;
    }
    // ... resto da lógica ...
  }, [startTimer, stopTimer]);

  const handleCaptchaSolved = useCallback((solution) => {
    setCaptchaSolution(solution);
    setShowCaptcha(false);
    setRateLimitInfo(null);
    stopTimer(); // ✅ PARAR TIMER quando captcha é resolvido
  }, [stopTimer]);

  return {
    // ... propriedades existentes ...
    timeLeft,
    isTimerActive: isActive,
    formatTime
  };
}
```

### **Frontend - UI Atualizada**

```jsx
{/* Rate Limit Info com Timer Dinâmico */}
{rateLimitInfo && (
  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900 border rounded-md">
    <div className="text-sm text-yellow-800 dark:text-yellow-200">
      <strong>Notice:</strong> You have made {rateLimitInfo.current_count} of {rateLimitInfo.limit} searches.
      
      {rateLimitInfo.current_count >= rateLimitInfo.limit && (
        <div className="mt-2">
          <div className="font-medium">Rate limit reached.</div>
          
          {/* ✅ TIMER DINÂMICO EM TEMPO REAL */}
          {isTimerActive && timeLeft > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-100 rounded">
              <span className="text-lg">⏰</span>
              <div>
                <div className="font-mono text-sm font-bold">
                  Time until reset: {formatTime}
                </div>
                <div className="text-xs">
                  You can make new searches after this timer reaches zero
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
)}
```

## 🎯 **Fluxo Completo**

### **Cenário 1: Rate Limit Atingido**
1. Usuário faz 10+ análises em 60 segundos
2. Backend retorna 429 com `seconds_until_reset`
3. Frontend inicia timer dinâmico
4. Timer conta regressivamente em tempo real
5. Quando timer chega a 0, usuário pode fazer novas análises

### **Cenário 2: Captcha Necessário**
1. Usuário faz 6+ análises (requer captcha)
2. Frontend mostra captcha inline
3. Timer continua contando (se rate limit atingido)
4. **Quando captcha é resolvido:**
   - Backend reseta rate limit completamente
   - Frontend para timer imediatamente
   - Usuário pode fazer análises normalmente

### **Cenário 3: Captcha + Rate Limit**
1. Usuário faz 6+ análises (captcha) + atinge 10 (rate limit)
2. Frontend mostra captcha + timer
3. **Ao resolver captcha:**
   - Rate limit é resetado no backend
   - Timer para no frontend
   - Usuário volta ao estado normal (0 análises)

## 📱 **Interface de Usuário**

### **Timer Visual:**
```
⏰ Time until reset: 1m 23s
   You can make new searches after this timer reaches zero
```

### **Estados do Timer:**
- **Ativo**: Conta regressivamente de X segundos até 0
- **Formato**: `1m 23s` (minutos e segundos) ou `45s` (apenas segundos)
- **Atualização**: A cada 1 segundo em tempo real
- **Reset**: Para imediatamente quando captcha é resolvido

## 🚀 **Benefícios**

1. **UX Melhorada**: Usuário sabe exatamente quanto tempo esperar
2. **Feedback Visual**: Timer dinâmico em tempo real
3. **Reset Inteligente**: Captcha reseta rate limit imediatamente
4. **Transparência**: Usuário entende o sistema de rate limiting
5. **Menos Frustração**: Não precisa ficar tentando adivinhar quando pode tentar novamente

## 🔄 **Logs de Debug**

```
🕐 Iniciando timer: 45 segundos
✅ Captcha resolvido com sucesso para IP: 177.22.33.182
🔄 Rate limit resetado após captcha resolvido para IP: 177.22.33.182
🔄 Captcha resolvido, resetando rate limit info no frontend
```

O sistema agora oferece uma experiência muito mais amigável e transparente para o usuário! 🎉
