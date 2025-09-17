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
from routes.protected_routes import (
    get_user_profile_endpoint, update_user_profile_endpoint,
    get_user_statistics_endpoint, delete_user_analysis_endpoint,
    get_user_command_evaluations_endpoint
)
from routes.api_key_routes import (
    get_user_api_key_endpoint, create_user_api_key_endpoint,
    revoke_user_api_key_endpoint, regenerate_user_api_key_endpoint
)

# Criar aplicação FastAPI
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

# Configurar middleware
setup_cors_middleware(app)

# Setup authentication middleware (direct import to avoid class issues)
from middleware.auth_middleware import auth_middleware
app.middleware("http")(auth_middleware)

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

# Rotas protegidas (requerem autenticação)
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
