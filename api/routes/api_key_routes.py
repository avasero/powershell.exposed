"""
API Key Management Endpoints
"""
from typing import Dict, Any
from fastapi import HTTPException, Depends
from fastapi.responses import JSONResponse
from middleware.auth_middleware import get_current_user_required
from services.api_key_manager import (
    create_user_api_key, get_user_api_key, 
    revoke_user_api_key, regenerate_user_api_key
)
from models.schemas import ApiKeyResponse, ErrorResponse


async def get_user_api_key_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user_required)
) -> ApiKeyResponse:
    """
    Get User API Key
    
    Retrieves the current active API Key for the authenticated user.
    Returns API Key details including usage statistics.
    
    Requires JWT authentication (not API Key to avoid loops).
    """
    try:
        if current_user.get("auth_type") != "jwt":
            raise HTTPException(
                status_code=400,
                detail="This endpoint requires JWT authentication, not API Key"
            )
        
        api_key_data = await get_user_api_key(
            current_user["id"],
            access_token=current_user.get("access_token")
        )
        
        if api_key_data:
            return JSONResponse({
                "success": True,
                "api_key": {
                    "id": api_key_data["id"],
                    "api_key": api_key_data["api_key"],
                    "name": api_key_data["name"],
                    "created_at": api_key_data["created_at"],
                    "last_used_at": api_key_data["last_used_at"],
                    "usage_count": api_key_data["usage_count"],
                    "is_active": api_key_data["is_active"]
                }
            })
        else:
            return JSONResponse({
                "success": True,
                "api_key": None,
                "message": "No active API key found"
            })
            
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(
            {"error": f"Failed to fetch API key: {str(error)}"},
            status_code=500
        )


async def create_user_api_key_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Create User API Key
    
    Creates a new API Key for the authenticated user. Each user can have
    only one active API Key at a time. 
    
    The API Key can be used for external tools like Postman or cURL.
    """
    try:
        if current_user.get("auth_type") != "jwt":
            raise HTTPException(
                status_code=400,
                detail="This endpoint requires JWT authentication, not API Key"
            )
        
        api_key_data = await create_user_api_key(
            current_user["id"], 
            access_token=current_user.get("access_token")
        )
        
        if api_key_data:
            return JSONResponse({
                "success": True,
                "api_key": {
                    "id": api_key_data["id"],
                    "api_key": api_key_data["api_key"],
                    "name": api_key_data["name"],
                    "created_at": api_key_data["created_at"],
                    "usage_count": api_key_data["usage_count"]
                },
                "message": "API Key created successfully. Keep it safe - you won't be able to see it again!"
            })
        else:
            return JSONResponse(
                {"error": "Failed to create API Key"},
                status_code=500
            )
            
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(
            {"error": f"Failed to create API key: {str(error)}"},
            status_code=500
        )


async def revoke_user_api_key_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Revoke User API Key
    
    Revokes (deactivates) the user's current API Key. The key will
    immediately stop working and cannot be used for API access.
    """
    try:
        if current_user.get("auth_type") != "jwt":
            raise HTTPException(
                status_code=400,
                detail="This endpoint requires JWT authentication, not API Key"
            )
        
        success = await revoke_user_api_key(
            current_user["id"],
            access_token=current_user.get("access_token")
        )
        
        if success:
            return JSONResponse({
                "success": True,
                "message": "API Key revoked successfully"
            })
        else:
            return JSONResponse(
                {"error": "No active API Key found to revoke"},
                status_code=404
            )
            
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(
            {"error": f"Failed to revoke API key: {str(error)}"},
            status_code=500
        )


async def regenerate_user_api_key_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Regenerate User API Key
    
    Generates a new API Key for the user and revokes the old one.
    The old API Key will immediately stop working.
    """
    try:
        if current_user.get("auth_type") != "jwt":
            raise HTTPException(
                status_code=400,
                detail="This endpoint requires JWT authentication, not API Key"
            )
        
        api_key_data = await regenerate_user_api_key(
            current_user["id"], 
            current_user.get("access_token")
        )
        
        if api_key_data:
            return JSONResponse({
                "success": True,
                "api_key": {
                    "id": api_key_data["id"],
                    "api_key": api_key_data["api_key"],
                    "name": api_key_data["name"],
                    "created_at": api_key_data["created_at"],
                    "usage_count": api_key_data["usage_count"]
                },
                "message": "API Key regenerated successfully. Your old key has been revoked."
            })
        else:
            return JSONResponse(
                {"error": "Failed to regenerate API Key"},
                status_code=500
            )
            
    except HTTPException:
        raise
    except Exception as error:
        return JSONResponse(
            {"error": f"Failed to regenerate API key: {str(error)}"},
            status_code=500
        )
