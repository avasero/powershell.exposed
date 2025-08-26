'use client';

import { useState, useEffect, useCallback } from 'react';

export function useCountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const startTimer = useCallback((seconds) => {
    if (seconds > 0) {
      setTimeLeft(seconds);
      setIsActive(true);
    }
  }, []);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
  }, []);

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
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeLeft]);

  const formatTime = useCallback((seconds) => {
    if (seconds <= 0) return '0s';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }, []);

  return {
    timeLeft,
    isActive,
    startTimer,
    stopTimer,
    formatTime: formatTime(timeLeft)
  };
}
