'use client';

import { useState, useCallback } from 'react';
import { useCountdownTimer } from './useCountdownTimer';

export function useRateLimit() {
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaSolution, setCaptchaSolution] = useState(null);
  const { timeLeft, isActive, startTimer, stopTimer, formatTime } = useCountdownTimer();

  const handleRateLimitResponse = useCallback((response, data) => {
    console.log('🔍 handleRateLimitResponse:', { status: response.status, success: data?.success, requires_captcha: data?.requires_captcha });
    
    // PRIMEIRO: Se a resposta foi bem-sucedida, limpar TUDO
    if (response.ok && data?.success) {
      console.log('✅ Análise bem-sucedida, limpando rate limit state');
      setRateLimitInfo(null);
      setShowCaptcha(false);
      setCaptchaSolution(null);
      stopTimer(); // Parar timer quando tudo está ok
      return false; // Não bloquear, análise foi bem-sucedida
    }
    
    if (response.status === 429) {
      // Rate limit excedido
      const rateLimitData = data.rate_limit_info;
      setRateLimitInfo(rateLimitData);
      setShowCaptcha(rateLimitData?.requires_captcha || false);
      
      // Iniciar timer se temos informação de quando resetar
      if (rateLimitData?.seconds_until_reset) {
        console.log(`🕐 Iniciando timer: ${rateLimitData.seconds_until_reset} segundos`);
        startTimer(rateLimitData.seconds_until_reset);
      }
      
      return true;
    }
    
    if (data && data.requires_captcha) {
      // Captcha necessário
      setShowCaptcha(true);
      setRateLimitInfo(data.rate_limit_info);
      
      // Iniciar timer se temos informação de quando resetar
      if (data.rate_limit_info?.seconds_until_reset) {
        console.log(`🕐 Iniciando timer para captcha: ${data.rate_limit_info.seconds_until_reset} segundos`);
        startTimer(data.rate_limit_info.seconds_until_reset);
      }
      
      return true;
    }

    // Verificar se precisa mostrar captcha baseado no rate limit info
    if (data && data.rate_limit_info && data.rate_limit_info.requires_captcha) {
      setShowCaptcha(true);
      setRateLimitInfo(data.rate_limit_info);
      
      // Iniciar timer se temos informação de quando resetar
      if (data.rate_limit_info.seconds_until_reset) {
        console.log(`🕐 Iniciando timer para rate limit: ${data.rate_limit_info.seconds_until_reset} segundos`);
        startTimer(data.rate_limit_info.seconds_until_reset);
      }
      
      return false; // Não bloquear a requisição, apenas mostrar captcha
    }

    return false;
  }, [startTimer, stopTimer]);

  const handleCaptchaSolved = useCallback((solution) => {
    setCaptchaSolution(solution);
    setShowCaptcha(false);
    // Resetar COMPLETAMENTE o rate limit info quando captcha é resolvido
    console.log('🔄 Captcha resolvido, resetando COMPLETAMENTE rate limit info no frontend');
    setRateLimitInfo(null);
    stopTimer(); // Parar timer quando captcha é resolvido
    
    // Garantir reset completo após um pequeno delay
    setTimeout(() => {
      console.log('🔄 Reset completo do rate limit após captcha');
      setRateLimitInfo(null);
      setCaptchaSolution(null);
      setShowCaptcha(false);
    }, 100);
  }, [stopTimer]);

  const closeCaptcha = useCallback(() => {
    setShowCaptcha(false);
  }, []);

  const reset = useCallback(() => {
    setRateLimitInfo(null);
    setShowCaptcha(false);
    setCaptchaSolution(null);
    stopTimer(); // Parar timer no reset
  }, [stopTimer]);

  return {
    rateLimitInfo,
    showCaptcha,
    captchaSolution,
    handleRateLimitResponse,
    handleCaptchaSolved,
    closeCaptcha,
    reset,
    // Timer properties
    timeLeft,
    isTimerActive: isActive,
    formatTime
  };
}
