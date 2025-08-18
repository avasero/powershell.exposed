import { useState, useEffect } from 'react';

export function useIpAddress() {
  const [ipAddress, setIpAddress] = useState(null);
  const [ipLocation, setIpLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIpAddress = async () => {
      try {
        setLoading(true);
        console.log('🔄 Starting IP address and location capture...');
        
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
            console.log(`🌐 Trying service: ${service}`);
            const response = await fetch(service, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Response from ${service}:`, data);
              
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
                console.log(`🎯 IP captured from ${service}: ${ip}`);
                break;
              }
            } else {
              console.warn(`❌ Service ${service} returned status: ${response.status}`);
            }
          } catch (err) {
            console.warn(`⚠️ Failed to fetch IP from ${service}:`, err);
            continue;
          }
        }

        if (ip) {
          console.log(`✅ Final IP address: ${ip}`);
          setIpAddress(ip);
          
          // Agora buscar informações de localização
          console.log('🌍 Starting location fetch for IP:', ip);
          const locationResult = await fetchIpLocation(ip);
          console.log('🌍 Location fetch result:', locationResult);
          
          if (locationResult && locationResult.country) {
            console.log('✅ Location data captured successfully');
            setIpLocation(locationResult);
          } else {
            console.warn('⚠️ Location data incomplete, using fallback');
            setIpLocation({
              country: 'Unknown',
              city: 'Unknown',
              region: 'Unknown',
              timezone: 'UTC',
              isp: 'Unknown'
            });
          }
        } else {
          throw new Error('Failed to capture IP address from all services');
        }
        
      } catch (err) {
        console.error('❌ Error capturing IP address:', err);
        setError(err.message);
        // Fallback: usar IP localhost para desenvolvimento
        console.log('🔄 Using fallback IP: 127.0.0.1');
        setIpAddress('127.0.0.1');
        setIpLocation({
          country: 'Local',
          city: 'Development',
          region: 'Localhost',
          timezone: 'UTC',
          isp: 'Local Development'
        });
      } finally {
        setLoading(false);
        console.log('🏁 IP address and location capture completed');
      }
    };

    const fetchIpLocation = async (ip) => {
      try {
        console.log('🌍 Fetching IP location for:', ip);
        
        // Usar apenas o IPAPI - mais confiável e estável
        const ipapiUrl = `https://ipapi.co/${ip}/json/`;
        console.log(`🌍 Using IPAPI service: ${ipapiUrl}`);
        
        const response = await fetch(ipapiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ IPAPI response:`, data);
          
          // Extrair informações de localização do IPAPI
          const location = {
            country: data.country_name || data.country,
            city: data.city,
            region: data.region || data.region_name,
            timezone: data.timezone,
            isp: data.org || data.isp,
            latitude: data.latitude,
            longitude: data.longitude,
            postal: data.postal,
            asn: data.asn
          };
          
          if (location.country) {
            console.log(`🎯 Location captured from IPAPI:`, location);
            return location;
          } else {
            console.warn(`⚠️ Location data incomplete from IPAPI:`, location);
            return null;
          }
        } else {
          console.warn(`❌ IPAPI returned status: ${response.status}`);
          return null;
        }
        
      } catch (err) {
        console.error('❌ Error fetching IP location from IPAPI:', err);
        return null;
      }
    };

    fetchIpAddress();
  }, []);

  return { ipAddress, ipLocation, loading, error };
}
