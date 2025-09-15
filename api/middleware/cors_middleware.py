"""
Middleware para CORS e extração de IP do cliente
"""
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from config.settings import ALLOWED_ORIGINS


def setup_cors_middleware(app):
    """Configura o middleware CORS"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )


async def get_client_ip_middleware(request: Request, call_next):
    """Middleware para extrair o IP do cliente"""
    client_ip = request.client.host if request.client else None
    
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    request.state.client_ip = client_ip
    
    response = await call_next(request)
    return response
