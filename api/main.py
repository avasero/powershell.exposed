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

# Importar schemas para documentação
try:
    from models.schemas import AnalyzeCommandResponse, ErrorResponse, RateLimitResponse
except ImportError:
    # Fallback se schemas não estiverem disponíveis
    AnalyzeCommandResponse = dict
    ErrorResponse = dict  
    RateLimitResponse = dict

# Configuration
API_TITLE = "PowerShell.exposed API"
API_DESCRIPTION = """
## PowerShell Security Analysis API

A comprehensive REST API for analyzing PowerShell commands and detecting potential security threats.

### Features:
- **Command Analysis**: Analyze PowerShell scripts against a database of malicious signatures
- **Risk Assessment**: Get risk scores and severity levels (very_low to critical)
- **MITRE ATT&CK Mapping**: Identify tactics and techniques used by threats
- **API Key Support**: Use personal API keys for external tools (Postman, cURL)
- **Rate Limiting**: Built-in protection against abuse

### Authentication:
- **Anonymous**: Basic analysis without registration
- **JWT Tokens**: Web application authentication
- **API Keys**: Personal keys for external tool integration (format: `pse_xxxxxxxx`)

### Getting Started:
1. Analyze commands with `POST /analyze-pcre2`
2. Create an account to get personal API keys
3. Use API keys in external tools with `Authorization: Bearer pse_your_key`
"""
API_VERSION = "1.0.0"

# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
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
    app.post("/analyze-pcre2", 
             tags=["Command Analysis"],
             summary="Analyze PowerShell Command",
             responses={
                 200: {"model": AnalyzeCommandResponse},
                 400: {"model": ErrorResponse},
                 429: {"model": RateLimitResponse}
             })(analyze_command_endpoint)
    app.get("/user-analyses", tags=["User Data"], summary="Get User Analyses")(get_user_analyses_endpoint)
    app.get("/analysis/{analysis_id}", tags=["Command Analysis"], summary="Get Analysis by ID")(get_analysis_by_id_endpoint)
    app.post("/create-user-session", tags=["Session Management"], summary="Create User Session")(create_user_session_endpoint)
    
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
    
    app.get("/user/api-key", include_in_schema=False)(get_user_api_key_endpoint)
    app.post("/user/api-key", include_in_schema=False)(create_user_api_key_endpoint)
    app.delete("/user/api-key", include_in_schema=False)(revoke_user_api_key_endpoint)
    app.put("/user/api-key", include_in_schema=False)(regenerate_user_api_key_endpoint)
    
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
    app.get("/user/command-evaluations", tags=["User Data"], summary="Get User Command Evaluations")(get_user_command_evaluations_endpoint)
    print("✅ Rotas protegidas carregadas")
except ImportError as e:
    print(f"⚠️ Rotas protegidas não disponíveis: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
