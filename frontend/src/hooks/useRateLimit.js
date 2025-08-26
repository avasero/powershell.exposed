'use client';

import { useState, useCallback } from 'react';
import { useCountdownTimer } from './useCountdownTimer';

export function useRateLimit() {
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const { timeLeft, isActive, startTimer, stopTimer, formatTime } = useCountdownTimer();

  const handleRateLimitResponse = useCallback((response, data) => {
    console.log('🔍 handleRateLimitResponse:', { status: response.status, success: data?.success });
    
    // Se a resposta foi bem-sucedida, limpar rate limit state
    if (response.ok && data?.success) {
      console.log('✅ Análise bem-sucedida, limpando rate limit state');
      setRateLimitInfo(null);
      stopTimer();
      return false; // Não bloquear, análise foi bem-sucedida
    }
    
    // Rate limit excedido - mostrar apenas timer
    if (response.status === 429 || (data && data.rate_limit_info)) {
      const rateLimitData = data.rate_limit_info;
      setRateLimitInfo(rateLimitData);
      
      // Iniciar timer se temos informação de quando resetar
      if (rateLimitData?.seconds_until_reset) {
        console.log(`🕐 Iniciando timer: ${rateLimitData.seconds_until_reset} segundos`);
        startTimer(rateLimitData.seconds_until_reset);
      }
      
      return response.status === 429; // Bloquear apenas se for 429
    }

    return false;
  }, [startTimer, stopTimer]);

  const reset = useCallback(() => {
    setRateLimitInfo(null);
    stopTimer();
  }, [stopTimer]);

  return {
    rateLimitInfo,
    handleRateLimitResponse,
    reset,
    // Timer properties
    timeLeft,
    isTimerActive: isActive,
    formatTime
  };
}
