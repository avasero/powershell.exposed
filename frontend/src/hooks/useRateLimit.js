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
      return true;
    }
    
    if (data.requires_captcha) {
      // Captcha necessário
      setShowCaptcha(true);
      setRateLimitInfo(data.rate_limit_info);
      return true;
    }

    // Limpar estado se tudo ok
    setRateLimitInfo(null);
    setShowCaptcha(false);
    setCaptchaSolution(null);
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
