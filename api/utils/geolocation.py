"""
Módulo de utilitários para geolocalização e outras funções auxiliares
"""
import aiohttp
from config.settings import IPAPI_TIMEOUT, IPAPI_BASE_URL


async def get_ip_location(ip_address: str) -> dict:
    """Obtém informações de geolocalização de um endereço IP"""
    if not ip_address:
        return {}
    
    try:
        url = f"{IPAPI_BASE_URL}/{ip_address}/json/"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=3) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return {
                        "country": data.get("country_name")
                    }
                else:
                    return {}
                    
    except Exception:
        return {}


def get_client_ip_from_request(request) -> str:
    """Extrai o IP do cliente da requisição"""
    client_ip = request.client.host if request.client else None
    
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    return client_ip


def format_location_string(country: str = None) -> str:
    """Formata uma string de localização a partir do país"""
    return country if country else None
