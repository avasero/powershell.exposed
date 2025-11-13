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
        
        // ✅ FIX: Usar ipify.org que não tem rate limit 403
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        // Primeiro buscar o IP
        const ipResponse = await fetch('https://api.ipify.org?format=json', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!ipResponse.ok) {
          console.warn(`IP detection failed with status: ${ipResponse.status}`);
          setIpAddress('Unknown');
          setIpCountry('Unknown');
          setLoading(false);
          return;
        }
        
        const ipData = await ipResponse.json();
        const ip = ipData.ip || 'Unknown';
        
        // ✅ FIX: Buscar país usando ip-api.com (sem rate limit para uso pessoal)
        let country = 'Unknown';
        try {
          const geoController = new AbortController();
          const geoTimeoutId = setTimeout(() => geoController.abort(), 5000);
          
          const geoResponse = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: geoController.signal
          });
          
          clearTimeout(geoTimeoutId);
          
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.status === 'success') {
              country = geoData.country || geoData.countryCode || 'Unknown';
            }
          }
        } catch (geoError) {
          console.warn('Geo detection failed, using Unknown:', geoError.message);
          // Não propagar erro, apenas usar Unknown
        }
        
        setIpAddress(ip);
        setIpCountry(country);

        // Salvar no cache
        ipCache = {
          ipAddress: ip,
          ipCountry: country,
          timestamp: Date.now(),
          error: null
        };
        
        console.log('✅ IP and country captured:', { ip, country });
        
      } catch (err) {
        // ✅ Não mostrar erro ao usuário, apenas log
        console.warn('IP detection error:', err.message);
        setIpAddress('Unknown');
        setIpCountry('Unknown');
        setError(null);  // ✅ Não propagar erro
      } finally {
        setLoading(false);
      }
    };

    fetchIpAndCountry();
  }, []);

  return { ipAddress, ipCountry, loading, error };
}
