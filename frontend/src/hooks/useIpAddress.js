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
      // Verificar cache primeiro
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
        
        
        // Tentar múltiplos serviços para capturar o IP
        const ipServices = [
          'https://api.ipify.org?format=json',
          'https://ipapi.co/json/',
          'https://api.myip.com',
          'https://httpbin.org/ip'
        ];

        let ip = null;
        
        for (const service of ipServices) {
          try {
            
            const response = await fetch(service, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              
              
              // Extrair IP baseado no formato de resposta de cada serviço
              if (service.includes('ipify')) {
                ip = data.ip;
              } else if (service.includes('ipapi')) {
                ip = data.ip;
              } else if (service.includes('myip')) {
                ip = data.ip;
              } else if (service.includes('httpbin')) {
                ip = data.origin;
              }
              
              if (ip) {
                
                break;
              }
            } else {
             
            }
          } catch (err) {
           
            continue;
          }
        }

        if (ip) {
          
          setIpAddress(ip);
          
          // Agora buscar informações de localização

          const locationResult = await fetchIpLocation(ip);
        
          
          let finalLocation;
          if (locationResult && locationResult.country) {
           
            finalLocation = locationResult;
            setIpLocation(locationResult);
          } else {
           
            finalLocation = {
              country: 'Unknown',
              city: 'Unknown',
              region: 'Unknown',
              timezone: 'UTC',
              isp: 'Unknown'
            };
            setIpLocation(finalLocation);
          }

          // Salvar no cache
          ipCache = {
            ipAddress: ip,
            ipLocation: finalLocation,
            timestamp: Date.now(),
            error: null
          };
         
        } else {
          throw new Error('Failed to capture IP address from all services');
        }
        
      } catch (err) {
       
        const errorMessage = err.message;
        setError(errorMessage);
        
        // Fallback: usar IP localhost para desenvolvimento
        
        const fallbackIp = '127.0.0.1';
        const fallbackLocation = {
          country: 'Local',
          city: 'Development',
          region: 'Localhost',
          timezone: 'UTC',
          isp: 'Local Development'
        };
        
        setIpAddress(fallbackIp);
        setIpLocation(fallbackLocation);

        // Salvar fallback no cache também (mas com erro)
        ipCache = {
          ipAddress: fallbackIp,
          ipLocation: fallbackLocation,
          timestamp: Date.now(),
          error: errorMessage
        };
      } finally {
        setLoading(false);
       
      }
    };

    const fetchIpLocation = async (ip) => {
      try {
       
        
        // Tentar múltiplos serviços de IP como fallback
        const services = [
          {
            name: 'IPAPI',
            url: `https://ipapi.co/${ip}/json/`,
            transform: (data) => ({
              country: data.country_name || data.country,
              city: data.city,
              region: data.region || data.region_name,
              timezone: data.timezone,
              isp: data.org || data.isp,
              latitude: data.latitude,
              longitude: data.longitude,
              postal: data.postal,
              asn: data.asn
            })
          },
          {
            name: 'IPInfo',
            url: `https://ipinfo.io/${ip}/json`,
            transform: (data) => ({
              country: data.country,
              city: data.city,
              region: data.region,
              timezone: data.timezone,
              isp: data.org,
              latitude: data.loc?.split(',')[0],
              longitude: data.loc?.split(',')[1],
              postal: data.postal,
              asn: data.asn
            })
          }
        ];

        for (const service of services) {
          try {
           
            
            const response = await fetch(service.url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              // Adicionar timeout para evitar travamentos
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              const data = await response.json();
             
              
              const location = service.transform(data);
              
              if (location.country) {
               
                return location;
              } else {
               
                continue; // Tentar próximo serviço
              }
            } else {
              console.warn(`❌ ${service.name} returned status: ${response.status}`);
              continue; // Tentar próximo serviço
            }
          } catch (serviceErr) {
            console.warn(`⚠️ ${service.name} failed:`, serviceErr.message);
            continue; // Tentar próximo serviço
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
