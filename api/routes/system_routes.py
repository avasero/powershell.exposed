"""
System API Routes - Health checks and system status
"""
from fastapi.responses import JSONResponse
from middleware.rate_limiting import (
    check_global_rate_limit, global_request_timestamps, 
    GLOBAL_RATE_LIMIT_REQUESTS, GLOBAL_RATE_LIMIT_WINDOW
)
from services.powershell_analyzer import clear_signatures_cache

async def get_global_rate_limit_status_endpoint():
    """Returns the current global rate limit status"""
    global_rate_limit_info = check_global_rate_limit()
    
    return JSONResponse({
        "success": True,
        "global_rate_limit": global_rate_limit_info,
        "debug_info": {
            "total_requests_tracked": len(global_request_timestamps),
            "limit_per_minute": GLOBAL_RATE_LIMIT_REQUESTS,
            "window_seconds": GLOBAL_RATE_LIMIT_WINDOW
        }
    })

async def clear_cache_endpoint():
    """Limpa o cache de assinaturas"""
    clear_signatures_cache()
    
    return JSONResponse({
        "success": True,
        "message": "Cache cleared, next request will reload from database"
    })

async def root_endpoint():
    """Endpoint raiz da API"""
    return JSONResponse({
        "message": "Fast api working",
        "status": "success"
    })

async def health_check_endpoint():
    """Endpoint de health check"""
    return JSONResponse({
        "status": "healthy",
        "message": "Fast api working"
    })
