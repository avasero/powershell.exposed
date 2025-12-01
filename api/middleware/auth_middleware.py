"""
Authentication middleware for FastAPI
"""
from typing import Optional, Callable, Dict, Any
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.auth import decode_jwt_token, extract_user_from_token, verify_token_permissions, AuthenticationError
from services.api_key_manager import validate_api_key



security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Extract user from JWT token or API Key if present, return None if not authenticated
    This is for endpoints that work for both authenticated and anonymous users
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        
        if token.startswith("pse_"):
            api_key_data = await validate_api_key(token)
            if api_key_data:
                return {
                    "id": api_key_data["user_id"],
                    "email": api_key_data.get("profile", {}).get("email") if api_key_data.get("profile") else None,
                    "role": "authenticated",
                    "auth_type": "api_key",
                    "api_key_name": api_key_data["api_key_name"],
                    "usage_count": api_key_data["usage_count"]
                }
            return None
        

        payload = decode_jwt_token(token)
        user = extract_user_from_token(payload)
        user["auth_type"] = "jwt"
        user["access_token"] = token  
        return user
        
    except AuthenticationError as e:
        print(f"[AUTH] Error in optional auth: {type(e).__name__}")
        return None
    except Exception as e:
        print(f"[AUTH] Unexpected error: {type(e).__name__}")
        return None


async def get_current_user_required(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Extract user from JWT token or API Key - raises HTTP 401 if not authenticated
    This is for endpoints that require authentication
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Use Bearer token (JWT) or API Key (pse_...)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        token = credentials.credentials
        
        if token.startswith("pse_"):
            api_key_data = await validate_api_key(token)
            if api_key_data:
                return {
                    "id": api_key_data["user_id"],
                    "email": api_key_data.get("profile", {}).get("email") if api_key_data.get("profile") else None,
                    "role": "authenticated",
                    "auth_type": "api_key",
                    "api_key_name": api_key_data["api_key_name"],
                    "usage_count": api_key_data["usage_count"]
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired API Key",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        payload = decode_jwt_token(token)
        user = extract_user_from_token(payload)
        user["auth_type"] = "jwt"
        user["access_token"] = token  
        
        
        if not verify_token_permissions(user, "authenticated"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return user
        
    except HTTPException:
        
        raise
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


def require_role(required_role: str = "authenticated"):
    """
    Dependency factory to require specific roles
    Usage: @app.get("/admin", dependencies=[Depends(require_role("service_role"))])
    """
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user_required)) -> Dict[str, Any]:
        if not verify_token_permissions(user, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        return user
    
    return role_checker


async def get_user_from_request_headers(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extract user from request headers manually
    Useful for custom middleware or when you need more control
    Supports both JWT tokens and API Keys
    """
    try:
        authorization = request.headers.get("Authorization")
        
        if not authorization:
            return None
        
      
        if not authorization.startswith("Bearer "):
            return None
        
        token = authorization[7:]  
        
        
        if token.startswith("pse_"):
            try:
                api_key_data = await validate_api_key(token)
                if api_key_data:
                    return {
                        "id": api_key_data["user_id"],
                        "email": api_key_data.get("profile", {}).get("email") if api_key_data.get("profile") else None,
                        "role": "authenticated",
                        "auth_type": "api_key",
                        "api_key_name": api_key_data["api_key_name"],
                        "usage_count": api_key_data["usage_count"]
                    }
            except Exception as e:
                print(f"[AUTH] API Key validation error: {type(e).__name__}")
                return None
        
      
        try:
            payload = decode_jwt_token(token)
            user = extract_user_from_token(payload)
            user["auth_type"] = "jwt"
            return user
        except AuthenticationError as e:
            print(f"[AUTH] JWT error: {type(e).__name__}")
            return None
        except Exception as e:
            print(f"[AUTH] Unexpected JWT error: {type(e).__name__}")
            return None
    except Exception as e:
        print(f"[AUTH] Error in middleware: {type(e).__name__}")
        return None


async def auth_middleware(request: Request, call_next):
    """
    Authentication middleware function
    """
    user = await get_user_from_request_headers(request)
    request.state.user = user
    
    request.state.is_authenticated = user is not None
    request.state.user_id = user.get("id") if user else None
    request.state.user_email = user.get("email") if user else None
    
    response = await call_next(request)
    return response


def setup_auth_middleware(app):
    """
    Setup authentication middleware for the FastAPI app
    """
    app.middleware("http")(auth_middleware)
