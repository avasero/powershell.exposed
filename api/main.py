"""
Aplicação principal FastAPI - PowerShell.exposed API
"""
import os
import sys

# Adicionar diretório atual ao Python path para Vercel
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Imports básicos sempre funcionam
try:
    from config.settings import API_TITLE, API_DESCRIPTION, API_VERSION
except ImportError:
    API_TITLE = "PowerShell.exposed API"
    API_DESCRIPTION = "API para análise de comandos PowerShell"
    API_VERSION = "1.0.0"

# Imports condicionais para Vercel
try:
    from middleware.cors_middleware import setup_cors_middleware, get_client_ip_middleware
    from routes.api_routes import (
        root_endpoint, health_check_endpoint, clear_cache_endpoint,
        get_global_rate_limit_status_endpoint, generate_captcha_endpoint,
        verify_captcha_endpoint, create_user_session_endpoint,
        get_user_analyses_endpoint, get_analysis_by_id_endpoint,
        analyze_command_endpoint
    )
    BASIC_ROUTES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Basic routes import failed: {e}")
    BASIC_ROUTES_AVAILABLE = False

# Imports opcionais para funcionalidades avançadas
try:
    from routes.protected_routes import (
        get_user_profile_endpoint, update_user_profile_endpoint,
        get_user_statistics_endpoint, delete_user_analysis_endpoint,
        get_user_command_evaluations_endpoint
    )
    from routes.api_key_routes import (
        get_user_api_key_endpoint, create_user_api_key_endpoint,
        revoke_user_api_key_endpoint, regenerate_user_api_key_endpoint
    )
    ADVANCED_FEATURES_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Advanced features import failed: {e}")
    ADVANCED_FEATURES_AVAILABLE = False

# Criar aplicação FastAPI
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

# Configurar middleware
if BASIC_ROUTES_AVAILABLE:
    setup_cors_middleware(app)
    app.middleware("http")(get_client_ip_middleware)
else:
    # CORS básico para Vercel se imports falharem
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://powershell-exposed.vercel.app",
            "https://powershell-exposed-git-main-gabriels-projects.vercel.app"
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

# Setup authentication middleware se disponível
try:
    from middleware.auth_middleware import auth_middleware
    app.middleware("http")(auth_middleware)
except ImportError:
    print("⚠️ Authentication middleware not available")

# Rotas básicas (sempre disponíveis)
if BASIC_ROUTES_AVAILABLE:
    app.get("/")(root_endpoint)
    app.get("/health")(health_check_endpoint)
    
    # Rotas de cache e rate limiting
    app.post("/clear-cache")(clear_cache_endpoint)
    app.get("/global-rate-limit-status")(get_global_rate_limit_status_endpoint)
    
    # Rotas de captcha
    app.post("/generate-captcha")(generate_captcha_endpoint)
    app.post("/verify-captcha")(verify_captcha_endpoint)
    
    # Rotas de sessão
    app.post("/create-user-session")(create_user_session_endpoint)
    
    # Rotas de análises
    app.get("/user-analyses")(get_user_analyses_endpoint)
    app.get("/analysis/{analysis_id}")(get_analysis_by_id_endpoint)
    app.post("/analyze-pcre2")(analyze_command_endpoint)
else:
    # Fallback routes se imports falharem
    @app.get("/")
    async def root_fallback():
        return JSONResponse({
            "message": "PowerShell.exposed API (Vercel)",
            "status": "limited_functionality",
            "version": API_VERSION
        })
    
    @app.get("/health")
    async def health_fallback():
        return JSONResponse({
            "status": "healthy",
            "message": "API working with limited functionality",
            "basic_routes": BASIC_ROUTES_AVAILABLE,
            "advanced_features": ADVANCED_FEATURES_AVAILABLE
        })

# Rotas protegidas (se disponíveis)
if ADVANCED_FEATURES_AVAILABLE:
    app.get("/user/profile")(get_user_profile_endpoint)
    app.put("/user/profile")(update_user_profile_endpoint)
    app.get("/user/statistics")(get_user_statistics_endpoint)
    app.delete("/user/analysis/{analysis_id}")(delete_user_analysis_endpoint)
    
    # Endpoint protegido para buscar análises do usuário (funciona com API Key)
    app.get("/user/command-evaluations")(get_user_command_evaluations_endpoint)
    
    # Endpoints para gerenciar API Keys (só funciona com JWT)
    app.get("/user/api-key")(get_user_api_key_endpoint)
    app.post("/user/api-key")(create_user_api_key_endpoint)
    app.delete("/user/api-key")(revoke_user_api_key_endpoint)
    app.put("/user/api-key")(regenerate_user_api_key_endpoint)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
