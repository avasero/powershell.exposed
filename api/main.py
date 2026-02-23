import os
import sys


sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


try:
    from models.schemas import AnalyzeCommandResponse, ErrorResponse, RateLimitResponse, UserCommandEvaluationsResponse
except ImportError:
    AnalyzeCommandResponse = dict
    ErrorResponse = dict  
    RateLimitResponse = dict
    UserCommandEvaluationsResponse = dict

API_TITLE = "powershell.exposed API"
API_DESCRIPTION = """
## PowerShell Security Analysis API

A comprehensive REST API for analyzing PowerShell commands and detecting potential security threats.

### Features:
- **Command Analysis**: Analyze PowerShell scripts against a database of malicious signatures
- **Risk Assessment**: Get risk scores and severity levels (very_low to critical)
- **MITRE ATT&CK Mapping**: Identify tactics and techniques used by threats
- **API Key Support**: Use personal API keys for external tools (Postman, cURL)
- **Rate Limiting**: Built-in protection against abuse

### Authentication & Access Control:
- **Web Application**: Anonymous access allowed only through official frontend
- **Direct API Access**: Requires API Key authentication for external tools
- **JWT Tokens**: Web application user authentication
- **API Keys**: Personal keys for external integration (format: `pse_xxxxxxxx`)

### Access Restrictions:
⚠️ **Anonymous access is restricted to the official web application only.**

For direct API access (Postman, cURL, scripts):
1. Create an account on the web application
2. Generate an API Key in your profile
3. Use the API Key: `Authorization: Bearer pse_your_key`

### Getting Started:
1. **Web App**: Visit the frontend to analyze commands anonymously
2. **API Access**: Get an API Key from your profile for external tools
3. **Endpoint**: `POST /evaluate` with proper authentication
"""
API_VERSION = "1.0.0"

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://api.powershell.exposed",
        "http://localhost:3000",
        "https://powershell-exposed.vercel.app",
        "https://powershell.exposed",
        "https://www.powershell.exposed",
        "https://www.ps.exposed",
        "https://ps.exposed",
        "https://71273716925639avasero.powershell.exposed",
        "https://api-test-81273633351825.powershell.exposed"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


try:
    from middleware.frontend_validation import validate_anonymous_access
    app.middleware("http")(validate_anonymous_access)
   
except ImportError as e:
    print(f"⚠️ Frontend validation middleware not available: {e}")

try:
    from middleware.auth_middleware import auth_middleware
    app.middleware("http")(auth_middleware)
except ImportError as e:
    print(f"⚠️ Auth middleware not available: {e}")

try:
    from routes.system_routes import root_endpoint, health_check_endpoint
    from routes.analysis_routes import (
        analyze_command_endpoint, get_user_analyses_endpoint,
        get_analysis_by_id_endpoint, submit_review_request_endpoint,
        get_deobfuscation_status_endpoint
    )
    from routes.user_routes import (
        create_user_session_endpoint,
        get_user_profile_endpoint,
        update_user_profile_endpoint,
        get_user_statistics_endpoint
    )
    
    app.get("/", include_in_schema=False)(root_endpoint)
    app.get("/health", include_in_schema=False)(health_check_endpoint)
    app.post("/evaluate", 
             tags=["Command Analysis"],
             summary="Analyze PowerShell Command",
             responses={
                 200: {"model": AnalyzeCommandResponse},
                 400: {"model": ErrorResponse},
                 429: {"model": RateLimitResponse}
             })(analyze_command_endpoint)
    app.get("/user-analyses", tags=["User Data"], summary="Get User Analyses", include_in_schema=False)(get_user_analyses_endpoint)
    app.get("/analysis/{analysis_id}", tags=["Command Analysis"], summary="Get Analysis by ID", include_in_schema=False)(get_analysis_by_id_endpoint)
    app.post("/review-request", tags=["Command Analysis"], summary="Submit Review Request", include_in_schema=False)(submit_review_request_endpoint)
    app.get("/deobfuscation-status/{short_id}", tags=["Command Analysis"], summary="Get Deobfuscation Status", include_in_schema=False)(get_deobfuscation_status_endpoint)
    app.post("/create-user-session", tags=["Session Management"], summary="Create User Session", include_in_schema=False)(create_user_session_endpoint)
    app.get("/user/profile", tags=["User Data"], summary="Get User Profile", include_in_schema=False)(get_user_profile_endpoint)
    app.patch("/user/profile", tags=["User Data"], summary="Update User Profile", include_in_schema=False)(update_user_profile_endpoint)
    app.get("/user/statistics", tags=["User Data"], summary="Get User Statistics", include_in_schema=False)(get_user_statistics_endpoint)
    
   
    
except ImportError as e:
    print(f"⚠️ Basic routes not available: {e}")
    
    @app.get("/")
    async def root_fallback():
        return JSONResponse({
            "message": "powershell.exposed API (fallback mode)",
            "status": "limited",
            "version": API_VERSION
        })
    
    @app.get("/health")
    async def health_fallback():
        return JSONResponse({
            "status": "healthy",
            "message": "API working with limited functionality"
        })
    
    @app.post("/evaluate")
    async def analyze_fallback(request: Request):
        return JSONResponse({
            "error": "Analysis service temporarily unavailable"
        }, status_code=503)

try:
    from routes.api_key_routes import (
        get_user_api_key_endpoint, create_user_api_key_endpoint,
        revoke_user_api_key_endpoint, regenerate_user_api_key_endpoint
    )
    
    app.get("/user/api-key", include_in_schema=False)(get_user_api_key_endpoint)
    app.post("/user/api-key", include_in_schema=False)(create_user_api_key_endpoint)
    app.delete("/user/api-key", include_in_schema=False)(revoke_user_api_key_endpoint)
    app.put("/user/api-key", include_in_schema=False)(regenerate_user_api_key_endpoint)
    
    
except ImportError as e:
    print(f"⚠️ API Key endpoints não disponíveis: {e}")
    
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

try:
    from routes.analysis_routes import get_user_command_evaluations_endpoint
    from models.schemas import UserCommandEvaluationsResponse
    
    app.get(
        "/user/command-evaluations",
        tags=["User Data"],
        summary="Get User Command Evaluations with Pagination",
        description="Retrieve user's PowerShell command analyses with optional pagination and filtering by short_id",
        response_model=UserCommandEvaluationsResponse,
        responses={
            200: {
                "description": "Successfully retrieved user command evaluations",
                "content": {
                    "application/json": {
                        "example": {
                            "success": True,
                            "user_id": "user-123",
                            "auth_type": "jwt",
                            "total_returned": 10,
                            "pagination": {
                                "limit": 10,
                                "offset": 0,
                                "has_more": True
                            },
                            "analyses": [
                                {
                                    "id": 1,
                                    "uuid": "550e8400-e29b-41d4-a716-446655440000",
                                    "short_id": "abc12345",
                                    "command": "IEX(New-Object Net.WebClient).DownloadString(...)",
                                    "risk_score": 8.5,
                                    "severity": "high",
                                    "signatures_detected": [],
                                    "cmdlets_detected": [],
                                    "tactics": ["T1059.001"],
                                    "techniques": [],
                                    "created_at": "2024-01-15T10:30:00Z",
                                    "search_type": "WEB",
                                    "ip_country": "US",
                                    "ip_city": "New York"
                                }
                            ]
                        }
                    }
                }
            },
            401: {
                "description": "Authentication required"
            },
            500: {
                "description": "Internal server error"
            }
        }
    )(get_user_command_evaluations_endpoint)
    
except ImportError as e:
    print(f"⚠️ Protected routes not available: {e}")
    
    @app.get("/user/command-evaluations")
    async def command_evals_fallback():
        return JSONResponse({
            "error": "Command evaluations endpoint temporarily unavailable"
        }, status_code=503)

try:
    from routes.plan_routes import get_user_plan_endpoint, get_all_plans_endpoint
    
    app.get("/user/plan", tags=["Plans"], summary="Get User Plan", include_in_schema=False)(get_user_plan_endpoint)
    app.get("/plans", tags=["Plans"], summary="Get All Plans", include_in_schema=False)(get_all_plans_endpoint)
    
except ImportError as e:
    print(f"⚠️ Plan routes not available: {e}")

try:
    from routes.stripe_routes import create_checkout_session_endpoint

    app.post("/stripe/create-checkout-session", tags=["Stripe"], summary="Create Checkout Session", include_in_schema=False)(create_checkout_session_endpoint)

except ImportError as e:
    print(f"⚠️ Stripe routes not available: {e}")


@app.on_event("startup")
async def startup_event():
    from config.settings import AST_SERVICE_ENABLED
    if AST_SERVICE_ENABLED:
        from services.deobfuscation_queue import deobfuscation_queue
        await deobfuscation_queue.start()
        print("[STARTUP] Deobfuscation queue worker started")


@app.on_event("shutdown")
async def shutdown_event():
    from config.settings import AST_SERVICE_ENABLED
    if AST_SERVICE_ENABLED:
        from services.deobfuscation_queue import deobfuscation_queue
        await deobfuscation_queue.stop()
        print("[SHUTDOWN] Deobfuscation queue worker stopped")
    from services.ast_client import ast_client
    await ast_client.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
