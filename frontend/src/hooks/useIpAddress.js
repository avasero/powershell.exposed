"use client";
import { useState, useEffect } from 'react';

// Cache global para evitar requisições desnecessárias
let ipCache = {
  ipAddress: null,
  ipCountry: null,
  timestamp: null,
  error: null
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Função para limpar cache manualmente se necessário
export function clearIpCache() {
  ipCache = {
    ipAddress: null,
    ipCountry: null,
    timestamp: null,
    error: null
  };
}

export function useIpAddress() {
  const [ipAddress, setIpAddress] = useState(ipCache.ipAddress);
  const [ipCountry, setIpCountry] = useState(ipCache.ipCountry);
  const [loading, setLoading] = useState(!ipCache.ipAddress);
  const [error, setError] = useState(ipCache.error);

  useEffect(() => {
    const fetchIpAndCountry = async () => {
      const now = Date.now();
      if (ipCache.timestamp && (now - ipCache.timestamp) < CACHE_DURATION && ipCache.ipAddress) {
        setIpAddress(ipCache.ipAddress);
        setIpCountry(ipCache.ipCountry);
        setError(ipCache.error);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // ✅ FIX: Usar ipwho.is que é mais confiável, suporta HTTPS e retorna tudo em uma chamada
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('https://ipwho.is/', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          setIpAddress(null);
          setIpCountry(null);
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.success) {
          setIpAddress(data.ip || null);
          setIpCountry(null);
        } else {
          setIpAddress(data.ip);
          setIpCountry(data.country);
        }

        ipCache = {
          ipAddress: data.ip || null,
          ipCountry: data.country || null,
          timestamp: Date.now(),
          error: null
        };

        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchIpAndCountry();
  }, []);

  return { ipAddress, ipCountry, loading, error };
}
