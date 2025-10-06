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
    # Obter headers de origem
    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    
    # Lista de origens permitidas (sem trailing slash)
    allowed_domains = []
    for origin_url in ALLOWED_ORIGINS:
        parsed = urlparse(origin_url)
        allowed_domains.append(f"{parsed.scheme}://{parsed.netloc}")
    
    # Verificar Origin header primeiro (mais confiável)
    if origin:
        if origin in allowed_domains:
            return True
    
    # Se não há Origin, verificar Referer
    if referer:
        parsed_referer = urlparse(referer)
        referer_origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}"
        if referer_origin in allowed_domains:
            return True
    
    # REMOVIDO: Para desenvolvimento local, permitir localhost sem Origin/Referer
    # Em produção, todas as requisições anônimas devem ter Origin válido
    
    return False


def requires_frontend_or_api_key(request: Request, user: Optional[Dict[str, Any]]) -> bool:
    """
    Determina se a requisição precisa de validação de frontend ou API key
    """
    # Se o usuário está autenticado com API Key, permitir
    if user and user.get("auth_type") == "api_key":
        return True
    
    # Se o usuário está autenticado com JWT (web app), permitir
    if user and user.get("auth_type") == "jwt":
        return True
    
    # Se não há autenticação (anônimo), deve vir do frontend
    if not user:
        return is_request_from_frontend(request)
    
    # Qualquer outro caso, negar
    return False


def get_user_agent_info(request: Request) -> Dict[str, str]:
    """
    Extrai informações do User-Agent para logging de segurança
    """
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    # Detectar se é um cliente de API comum (Postman, curl, etc.)
    api_clients = ["postman", "curl", "httpie", "insomnia", "thunder client", "python-requests"]
    is_api_client = any(client in user_agent.lower() for client in api_clients)
    
    return {
        "user_agent": user_agent,
        "is_api_client": is_api_client,
        "is_browser": not is_api_client and any(browser in user_agent.lower() for browser in ["mozilla", "chrome", "safari", "firefox", "edge"])
    }


async def validate_anonymous_access(request: Request, call_next):
    """
    Middleware para validar acesso anônimo
    EXECUTADO ANTES do auth_middleware para interceptar requisições anônimas
    """
    try:
      
        
        # Pular validação para rotas de documentação, health check, etc.
        skip_paths = [
            "/docs", "/redoc", "/openapi.json", "/health", 
            "/favicon.ico", "/.well-known"
        ]
        
        # Verificar se é rota raiz exata
        if request.url.path == "/":
           
            response = await call_next(request)
            return response
        
        if any(request.url.path.startswith(path) for path in skip_paths):
        
            response = await call_next(request)
            return response
        
        # Para endpoints que exigem validação de origem para acesso anônimo
        restricted_endpoints = ["/analyze-pcre2", "/generate-captcha", "/verify-captcha", "/create-user-session"]
        
        if request.url.path in restricted_endpoints:
        
            
            # Verificar se há token de autenticação
            authorization = request.headers.get("Authorization", "")
            has_auth_token = authorization.startswith("Bearer ")
            
            user_agent_info = get_user_agent_info(request)
            origin = request.headers.get("Origin", "None")
            referer = request.headers.get("Referer", "None")
            
            # Se há token, verificar se é uma API Key VÁLIDA
            if has_auth_token:
                token = authorization[7:]  # Remove "Bearer " prefix
                
                # Se é uma API Key (começa com pse_)
                if token.startswith("pse_"):
                   
                    try:
                        api_key_data = await validate_api_key(token)
                        if api_key_data:
                            print(f"✅ API Key VÁLIDA - usuário: {api_key_data['user_id']}")
                            # API Key válida - deixar passar para auth_middleware
                        else:
                        
                            return JSONResponse(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                content={
                                    "error": "Invalid API Key",
                                    "detail": "The provided API Key is not valid or has been revoked",
                                    "error_code": "INVALID_API_KEY",
                                    "documentation": "/docs"
                                }
                            )
                    except Exception as e:
                        
                        return JSONResponse(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            content={
                                "error": "API Key validation failed",
                                "detail": "Unable to validate the provided API Key",
                                "error_code": "API_KEY_VALIDATION_ERROR"
                            }
                        )
                else:
                    # Token presente mas NÃO é uma API Key (pode ser JWT)
                    print(f"🔍 Token detectado (não é API Key) - verificando origem...")
                    
                    # Se vem do frontend, permitir JWT tokens (será validado no auth_middleware)
                    if is_request_from_frontend(request):
                        print(f"✅ Token JWT do frontend - permitindo validação pelo auth_middleware")
                        # Deixar passar para o auth_middleware validar o JWT
                    else:
                        # Para uso externo (Postman), APENAS API Keys são permitidas
                        print(f"❌ Token presente mas não é uma API Key válida - BLOQUEANDO")
                        print(f"   Token: {token[:20]}... (Para uso externo, apenas API Keys são permitidas)")
                        
                        return JSONResponse(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            content={
                                "error": "Invalid authentication method for external access",
                                "detail": "For external tools (Postman, cURL), only valid API Keys are allowed. Create an API Key in your profile on the web application.",
                                "error_code": "EXTERNAL_ACCESS_REQUIRES_API_KEY",
                                "documentation": "/docs",
                                "web_app_url": "https://powershell-exposed.vercel.app"
                            }
                        )
            else:
                # NÃO há token de autenticação (acesso anônimo)
                print(f"👤 Acesso anônimo detectado - verificando origem...")
                
                if not is_request_from_frontend(request):
                    # Log tentativa de acesso não autorizado
                    print(f"🚫 BLOQUEANDO acesso anônimo - Path: {request.url.path}")
                    print(f"   Origin: {origin}")
                    print(f"   Referer: {referer}")
                    print(f"   User-Agent: {user_agent_info['user_agent'][:100]}")
                    print(f"   IP: {request.client.host if request.client else 'Unknown'}")
                    
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "error": "Anonymous access is only allowed from the official web application. Use an API Key (pse_...) for direct API access.",
                            "detail": "Access denied",
                            "error_code": "FRONTEND_ONLY_ANONYMOUS",
                            "required_auth": "API-Key for direct access",
                            "documentation": "/docs"
                        },
                        headers={
                            "X-Error-Code": "FRONTEND_ONLY_ANONYMOUS",
                            "X-Required-Auth": "API-Key for direct access",
                            "X-Documentation": "/docs"
                        }
                    )
                else:
                    # Log acesso anônimo autorizado (do frontend)
                    print(f"✅ Acesso anônimo AUTORIZADO do frontend - Origin: {origin}")
        
        # Prosseguir para próximo middleware
        response = await call_next(request)
        return response
        
    except Exception as e:
        # Log erro inesperado e re-raise
        print(f"❌ Erro no middleware de validação: {e}")
        print(f"   Tipo: {type(e).__name__}")
        raise


def setup_frontend_validation_middleware(app):
    """
    Configura o middleware de validação de frontend
    """
    app.middleware("http")(validate_anonymous_access)
