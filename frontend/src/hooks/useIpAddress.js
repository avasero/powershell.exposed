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
        
        // Use IP-API which returns both IP and country in a single request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('https://ip-api.com/json/?fields=status,country,countryCode,query', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.query) {
          const ip = data.query;
          const country = data.country || data.countryCode || null;
          
          setIpAddress(ip);
          setIpCountry(country);

          // Salvar no cache
          ipCache = {
            ipAddress: ip,
            ipCountry: country,
            timestamp: Date.now(),
            error: null
          };
          
          console.log('✅ IP and country captured from IP-API:', { ip, country });
        } else {
          throw new Error('IP-API returned unsuccessful status');
        }
        
      } catch (err) {
        console.error('❌ Error fetching IP and country:', err);
        setError(err.message);
        setIpAddress(null);
        setIpCountry(null);

        ipCache = {
          ipAddress: null,
          ipCountry: null,
          timestamp: Date.now(),
          error: err.message
        };
      } finally {
        setLoading(false);
      }
    };

    fetchIpAndCountry();
  }, []);

  return { ipAddress, ipCountry, loading, error };
}
