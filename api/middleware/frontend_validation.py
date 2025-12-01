"""
Middleware para validar que requisições anônimas venham apenas do frontend autorizado
"""
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from urllib.parse import urlparse
from config.settings import ALLOWED_ORIGINS
from services.api_key_manager import validate_api_key


def is_request_from_frontend(request: Request) -> bool:
    """
    Verifica se a requisição vem de um frontend autorizado
    através do Origin ou Referer header
    """

    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    
 
    allowed_domains = []
    for origin_url in ALLOWED_ORIGINS:
        parsed = urlparse(origin_url)
        allowed_domains.append(f"{parsed.scheme}://{parsed.netloc}")
    
   
    if origin:
        if origin in allowed_domains:
            return True
    
  
    if referer:
        parsed_referer = urlparse(referer)
        referer_origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}"
        if referer_origin in allowed_domains:
            return True
    
    
    
    return False


def requires_frontend_or_api_key(request: Request, user: Optional[Dict[str, Any]]) -> bool:
    """
    Determina se a requisição precisa de validação de frontend ou API key
    """
    if user and user.get("auth_type") == "api_key":
        return True
    
    if user and user.get("auth_type") == "jwt":
        return True
    
    if not user:
        return is_request_from_frontend(request)
    
    return False


def get_user_agent_info(request: Request) -> Dict[str, str]:
    """
    Extrai informações do User-Agent para logging de segurança
    """
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    api_clients = ["postman", "curl", "httpie", "insomnia", "thunder client", "python-requests"]
    is_api_client = any(client in user_agent.lower() for client in api_clients)
    
    return {
        "user_agent": user_agent,
        "is_api_client": is_api_client,
        "is_browser": not is_api_client and any(browser in user_agent.lower() for browser in ["mozilla", "chrome", "safari", "firefox", "edge"])
    }


async def validate_anonymous_access(request: Request, call_next):
    
    try:
      
        
        skip_paths = [
            "/docs", "/redoc", "/openapi.json", "/health", 
            "/favicon.ico", "/.well-known"
        ]
        
        if request.url.path == "/":
           
            response = await call_next(request)
            return response
        
        if any(request.url.path.startswith(path) for path in skip_paths):
        
            response = await call_next(request)
            return response
        
        restricted_endpoints = ["/evaluate", "/generate-captcha", "/verify-captcha", "/create-user-session"]
        
        if request.url.path in restricted_endpoints:
            request_type = "WEB" if is_request_from_frontend(request) else "API/External"
            
            authorization = request.headers.get("Authorization", "")
            has_auth_token = authorization.startswith("Bearer ")
            
            user_agent_info = get_user_agent_info(request)
            origin = request.headers.get("Origin", "None")
            referer = request.headers.get("Referer", "None")
            
            if has_auth_token:
                token = authorization[7:]  
                
               
                if token.startswith("pse_"):
                   
                    try:
                        api_key_data = await validate_api_key(token)
                        if api_key_data:
                            # API key validated successfully
                            pass
                        else:
                        
                            return JSONResponse(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                content={
                                    "error": "Unauthorized",
                                    "message": "Authentication required or invalid credentials.",                                   
                                }
                            )
                    except Exception as e:
                        
                        return JSONResponse(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            content={
                                "error": "Unauthorized",
                                "message": "Authentication required or invalid credentials.",
                                
                            }
                        )
                else:
                    # print(f"🔍 Token detectado (não é API Key) - verificando origem...")
                    
                    if is_request_from_frontend(request):
                        # print(f"✅ Token JWT do frontend - permitindo validação pelo auth_middleware")
                        pass
                    else:
                        print(f"[SECURITY] Invalid token type - blocking external request")
                        
                        return JSONResponse(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            content={
                                "error": "Unauthorized",
                                "message": "Authentication required or invalid credentials.",
                            }
                        )
            else:
                
                if not is_request_from_frontend(request):
                    print(f"[SECURITY] Blocking anonymous access - Path: {request.url.path}")
                    
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "error": "Forbidden",
                            "message": "You do not have permission to access this resource.",
                            
                        },
                    )
                else:
                    # Anonymous access from frontend allowed
                    pass
        
        response = await call_next(request)
        return response
        
    except Exception as e:
        print(f"[ERROR] Middleware validation: {type(e).__name__}")
        raise


def setup_frontend_validation_middleware(app):
    """
    Configura o middleware de validação de frontend
    """
    app.middleware("http")(validate_anonymous_access)
