"""
Aplicação principal FastAPI - PowerShell.exposed API
"""
import os
import sys

# Adicionar path para imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Configurações
API_TITLE = "PowerShell.exposed API"
API_DESCRIPTION = "API para análise de comandos PowerShell"  
API_VERSION = "1.0.0"

# Criar aplicação FastAPI
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

# Configurar CORS
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

# Tentar carregar middleware de autenticação
try:
    from middleware.auth_middleware import auth_middleware
    app.middleware("http")(auth_middleware)
    print("✅ Auth middleware carregado")
except ImportError as e:
    print(f"⚠️ Auth middleware não disponível: {e}")

# Carregar rotas básicas
try:
    from routes.api_routes import (
        root_endpoint, health_check_endpoint, analyze_command_endpoint,
        get_user_analyses_endpoint, get_analysis_by_id_endpoint,
        create_user_session_endpoint
    )
    
    # Substituir rotas básicas por versões completas
    app.get("/", include_in_schema=False)(root_endpoint)
    app.get("/health", include_in_schema=False)(health_check_endpoint)
    app.post("/analyze-pcre2")(analyze_command_endpoint)
    app.get("/user-analyses")(get_user_analyses_endpoint)
    app.get("/analysis/{analysis_id}")(get_analysis_by_id_endpoint)
    app.post("/create-user-session")(create_user_session_endpoint)
    
    print("✅ Rotas básicas carregadas")
    
except ImportError as e:
    print(f"⚠️ Rotas básicas não disponíveis: {e}")
    
    # Fallback routes
    @app.get("/")
    async def root_fallback():
        return JSONResponse({
            "message": "PowerShell.exposed API (fallback mode)",
            "status": "limited",
            "version": API_VERSION
        })
    
    @app.get("/health")
    async def health_fallback():
        return JSONResponse({
            "status": "healthy",
            "message": "API working with limited functionality"
        })
    
    @app.post("/analyze-pcre2")
    async def analyze_fallback(request: Request):
        return JSONResponse({
            "error": "Analysis service temporarily unavailable"
        }, status_code=503)

# Carregar rotas de API Key
try:
    from routes.api_key_routes import (
        get_user_api_key_endpoint, create_user_api_key_endpoint,
        revoke_user_api_key_endpoint, regenerate_user_api_key_endpoint
    )
    
    app.get("/user/api-key")(get_user_api_key_endpoint)
    app.post("/user/api-key")(create_user_api_key_endpoint)
    app.delete("/user/api-key")(revoke_user_api_key_endpoint)
    app.put("/user/api-key")(regenerate_user_api_key_endpoint)
    
    print("✅ API Key endpoints carregados")
    
except ImportError as e:
    print(f"⚠️ API Key endpoints não disponíveis: {e}")
    
    # Fallback API Key endpoints
    @app.get("/user/api-key")
    async def api_key_get_fallback():
        return JSONResponse({
            "error": "API Key management temporarily unavailable"
        }, status_code=503)
    
    @app.post("/user/api-key")
    async def api_key_post_fallback():
        return JSONResponse({
            "error": "API Key creation temporarily unavailable"
        }, status_code=503)

# Carregar rotas protegidas
try:
    from routes.protected_routes import get_user_command_evaluations_endpoint
    app.get("/user/command-evaluations")(get_user_command_evaluations_endpoint)
    print("✅ Rotas protegidas carregadas")
except ImportError as e:
    print(f"⚠️ Rotas protegidas não disponíveis: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
