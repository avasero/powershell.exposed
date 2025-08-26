'use client';

import { useState, useCallback } from 'react';

export function useRateLimit() {
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaSolution, setCaptchaSolution] = useState(null);

  const handleRateLimitResponse = useCallback((response, data) => {
    if (response.status === 429) {
      // Rate limit excedido
      setRateLimitInfo(data.rate_limit_info);
      setShowCaptcha(data.rate_limit_info?.requires_captcha || false);
      return true;
    }
    
    if (data && data.requires_captcha) {
      // Captcha necessário
      setShowCaptcha(true);
      setRateLimitInfo(data.rate_limit_info);
      return true;
    }

    // Verificar se precisa mostrar captcha baseado no rate limit info
    if (data && data.rate_limit_info && data.rate_limit_info.requires_captcha) {
      setShowCaptcha(true);
      setRateLimitInfo(data.rate_limit_info);
      return false; // Não bloquear a requisição, apenas mostrar captcha
    }

    // Limpar estado se tudo ok
    if (response.ok) {
      setRateLimitInfo(null);
      setShowCaptcha(false);
      setCaptchaSolution(null);
    }
    return false;
  }, []);

  const handleCaptchaSolved = useCallback((solution) => {
    setCaptchaSolution(solution);
    setShowCaptcha(false);
  }, []);

  const closeCaptcha = useCallback(() => {
    setShowCaptcha(false);
  }, []);

  const reset = useCallback(() => {
    setRateLimitInfo(null);
    setShowCaptcha(false);
    setCaptchaSolution(null);
  }, []);

  return {
    rateLimitInfo,
    showCaptcha,
    captchaSolution,
    handleRateLimitResponse,
    handleCaptchaSolved,
    closeCaptcha,
    reset
  };
}
