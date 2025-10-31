import { useState, useEffect } from 'react';

// Cache global para evitar requisições desnecessárias
let ipCache = {
  ipAddress: null,
  ipLocation: null,
  timestamp: null,
  error: null
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Função para limpar cache manualmente se necessário
export function clearIpCache() {
  ipCache = {
    ipAddress: null,
    ipLocation: null,
    timestamp: null,
    error: null
  };

}

export function useIpAddress() {
  const [ipAddress, setIpAddress] = useState(ipCache.ipAddress);
  const [ipLocation, setIpLocation] = useState(ipCache.ipLocation);
  const [loading, setLoading] = useState(!ipCache.ipAddress);
  const [error, setError] = useState(ipCache.error);

  useEffect(() => {
    const fetchIpAddress = async () => {
      const now = Date.now();
      if (ipCache.timestamp && (now - ipCache.timestamp) < CACHE_DURATION && ipCache.ipAddress) {
        setIpAddress(ipCache.ipAddress);
        setIpLocation(ipCache.ipLocation);
        setError(ipCache.error);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // ✅ FIX: Usar apenas serviços confiáveis e simples
        const ipServices = [
          { url: 'https://api.ipify.org?format=json', key: 'ip' },
          { url: 'https://api.my-ip.io/v2/ip.json', key: 'ip' },
          { url: 'https://api64.ipify.org?format=json', key: 'ip' },
          { url: 'https://ipapi.co/json/', key: 'ip' }
        ];

        let ip = null;
        
        for (const service of ipServices) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            const response = await fetch(service.url, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              ip = data[service.key];
              
              if (ip && ip !== 'Unknown') {
                console.log(`✅ IP captured: ${ip} from ${service.url}`);
                break;
              }
            }
          } catch (err) {
            console.warn(`⚠️ Service ${service.url} failed:`, err.message);
            continue;
          }
        }

        if (ip && ip !== 'Unknown') {
          setIpAddress(ip);
          
          // Buscar localização
          const locationResult = await fetchIpLocation(ip);
          
          const finalLocation = locationResult || {
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown',
            timezone: 'UTC'
          };
          
          setIpLocation(finalLocation);

          // Salvar no cache
          ipCache = {
            ipAddress: ip,
            ipLocation: finalLocation,
            timestamp: Date.now(),
            error: null
          };
          
          console.log('✅ IP and location cached:', { ip, location: finalLocation });
        } else {
          throw new Error('Failed to capture IP address from all services');
        }
        
      } catch (err) {
        console.error('❌ Error fetching IP:', err);
        setError(err.message);
        
        // ⚠️ NÃO usar fallback localhost - melhor enviar null
        setIpAddress(null);
        setIpLocation(null);

        ipCache = {
          ipAddress: null,
          ipLocation: null,
          timestamp: Date.now(),
          error: err.message
        };
      } finally {
        setLoading(false);
      }
    };

    const fetchIpLocation = async (ip) => {
      try {
        const services = [
          {
            name: 'IP-API',
            url: `https://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,timezone,isp`,
            transform: (data) => ({
              country: data.country || 'Unknown',
              city: data.city || 'Unknown',
              region: data.regionName || data.region || 'Unknown',
              timezone: data.timezone || 'UTC'
            })
          },
          {
            name: 'IPAPI',
            url: `https://ipapi.co/${ip}/json/`,
            transform: (data) => ({
              country: data.country_name || data.country || 'Unknown',
              city: data.city || 'Unknown',
              region: data.region || data.region_name || 'Unknown',
              timezone: data.timezone || 'UTC'
            })
          },
          {
            name: 'IPInfo',
            url: `https://ipinfo.io/${ip}/json`,
            transform: (data) => ({
              country: data.country || 'Unknown',
              city: data.city || 'Unknown',
              region: data.region || 'Unknown',
              timezone: data.timezone || 'UTC'
            })
          }
        ];

        for (const service of services) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // Aumentado para 8s
            
            const response = await fetch(service.url, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              const location = service.transform(data);
              
              if (location.country && location.country !== 'Unknown') {
                console.log(`✅ Location captured from ${service.name}:`, location);
                return location;
              } else {
                console.warn(`⚠️ ${service.name} returned empty data`);
              }
            }
          } catch (serviceErr) {
            console.warn(`⚠️ ${service.name} failed:`, serviceErr.message);
            continue;
          }
        }
        
        console.warn('⚠️ All IP location services failed');
        return null;
        
      } catch (err) {
        console.error('❌ Error in IP location fetch:', err);
        return null;
      }
    };

    fetchIpAddress();
  }, []);

  return { ipAddress, ipLocation, loading, error };
}
