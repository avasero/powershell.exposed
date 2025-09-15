"""
Aplicação principal FastAPI - PowerShell.exposed API
"""
from fastapi import FastAPI
from config.settings import API_TITLE, API_DESCRIPTION, API_VERSION
from middleware.cors_middleware import setup_cors_middleware, get_client_ip_middleware
from routes.api_routes import (
    root_endpoint, health_check_endpoint, clear_cache_endpoint,
    get_global_rate_limit_status_endpoint, generate_captcha_endpoint,
    verify_captcha_endpoint, create_user_session_endpoint,
    get_user_analyses_endpoint, get_analysis_by_id_endpoint,
    analyze_command_endpoint
)

# Criar aplicação FastAPI
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

# Configurar middleware
setup_cors_middleware(app)
app.middleware("http")(get_client_ip_middleware)

# Rotas básicas
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
