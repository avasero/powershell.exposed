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
        
        // Serviços de localização geográfica
        const locationServices = [
          `https://ipapi.co/${ip}/json/`,
          `https://ipinfo.io/${ip}/json`,
          `https://api.ipgeolocation.io/ipgeo?apiKey=free&ip=${ip}`,
          `https://freegeoip.app/json/${ip}`
        ];

        let location = null;
        
        for (const service of locationServices) {
          try {
            console.log(`🌍 Trying location service: ${service}`);
            const response = await fetch(service, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Location response from ${service}:`, data);
              
              // Extrair informações de localização baseado no serviço
              if (service.includes('ipapi.co')) {
                location = {
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
              } else if (service.includes('ipinfo.io')) {
                location = {
                  country: data.country,
                  city: data.city,
                  region: data.region,
                  timezone: data.timezone,
                  isp: data.org,
                  latitude: data.loc?.split(',')[0],
                  longitude: data.loc?.split(',')[1],
                  postal: data.postal,
                  asn: data.asn
                };
              } else if (service.includes('ipgeolocation.io')) {
                location = {
                  country: data.country_name,
                  city: data.city,
                  region: data.state_prov,
                  timezone: data.time_zone?.name,
                  isp: data.isp,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  postal: data.zipcode,
                  asn: data.asn
                };
              } else if (service.includes('freegeoip.app')) {
                location = {
                  country: data.country_name,
                  city: data.city,
                  region: data.region_name,
                  timezone: data.time_zone,
                  isp: data.isp,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  postal: data.zip_code,
                  asn: data.asn
                };
              }
              
              if (location && location.country) {
                console.log(`🎯 Location captured from ${service}:`, location);
                break;
              } else {
                console.warn(`⚠️ Location data incomplete from ${service}:`, location);
              }
            } else {
              console.warn(`❌ Location service ${service} returned status: ${response.status}`);
            }
          } catch (err) {
            console.warn(`⚠️ Failed to fetch location from ${service}:`, err);
            continue;
          }
        }

        if (location && location.country) {
          console.log(`✅ Final location data:`, location);
          return location;
        } else {
          console.warn('⚠️ Could not fetch location data from any service');
          return null;
        }
        
      } catch (err) {
        console.error('❌ Error fetching IP location:', err);
        return null;
      }
    };

    fetchIpAddress();
  }, []);

  return { ipAddress, ipLocation, loading, error };
}
