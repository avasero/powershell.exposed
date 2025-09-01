'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCountdownTimer } from './useCountdownTimer';

export function useRateLimit() {
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const { timeLeft, isActive, startTimer, stopTimer, formatTime } = useCountdownTimer();

  
  useEffect(() => {
    
    if (!isActive && timeLeft === 0 && rateLimitInfo) {
     
      setRateLimitInfo(null);
    }
  }, [isActive, timeLeft, rateLimitInfo]);

  const handleRateLimitResponse = useCallback((response, data) => {
   
    
    
    if (response.ok && data?.success) {
     
      setRateLimitInfo(null);
      stopTimer();
      return false; 
    }
    
    
    if ((response.status === 400 || response.status === 429) && data && data.rate_limit_info) {
      const rateLimitData = data.rate_limit_info;
      setRateLimitInfo(rateLimitData);
      
      
      if (rateLimitData?.seconds_until_reset) {
       
        startTimer(rateLimitData.seconds_until_reset);
      }
      
      return true; 
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
    
    timeLeft,
    isTimerActive: isActive,
    formatTime
  };
}
