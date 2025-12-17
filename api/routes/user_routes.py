"""
User API Routes - User management, profile, and sessions
"""
from typing import Dict, Any, Optional
from fastapi import Request, Depends
from fastapi.responses import JSONResponse
from middleware.auth_middleware import get_current_user_required
from services.session_manager import get_supabase_client, get_or_create_session
from utils.geolocation import get_ip_location, get_client_ip_from_request
from models.schemas import CreateUserSessionRequest

async def create_user_session_endpoint(
    request: Request,
    request_data: CreateUserSessionRequest
) -> Dict[str, Any]:
    """
    Create User Session
    
    Creates a new session for authenticated users to track their activity
    and apply rate limiting. Required for proper user session management.
    """
    try:
        user_id = request_data.user_id
        
        ip_address = request_data.ip_address
        if not ip_address:
            ip_address = get_client_ip_from_request(request)
        
        user_agent = request_data.user_agent or "Unknown"
        country = request_data.country
        
        if not user_id:
            return JSONResponse(
                {
                    "error": {
                        "code": "InvalidArgumentError",
                        "message": "Some of the provided arguments are incorrect.",
                        "details": "user_id is required"
                    }
                },
                status_code=400
            )
        
        
        if not country and ip_address:
            location_data = await get_ip_location(ip_address)
            if location_data:
                country = location_data.get("country")
        
        supabase = get_supabase_client()
        
        
        session_id = await get_or_create_session(
            supabase=supabase,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            country=country
        )
        
        if session_id:
            return JSONResponse({
                "success": True,
                "session_id": session_id,
                "message": "User session created successfully"
            })
        else:
            return JSONResponse(
                {
                    "error": {
                        "code": "TransientError",
                        "message": "Transient server error. Retry might work.",
                        "details": "Failed to create user session"
                    }
                },
                status_code=503
            )
            
    except Exception as error:
      
        return JSONResponse(
            {"error": f"Internal error: {str(error)}"},
            status_code=500
        )

async def get_user_profile_endpoint(
    user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Get authenticated user's profile information
    Requires authentication
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('profiles').select('*').eq('id', user["id"]).single().execute()
        
        if response.data:
            profile = response.data
            print(f"DEBUG: Profile data from DB: {profile}")
            safe_profile = {
                "id": profile.get("id"),
                "username": profile.get("email"),
                "full_name": profile.get("full_name"),
                "avatar_url": profile.get("avatar_url"),
                "created_at": profile.get("created_at"),
                "updated_at": profile.get("updated_at"),
                "notify_user": profile.get("notify_user", False)
            }
            
            return JSONResponse({
                "success": True,
                "profile": safe_profile,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "role": user["role"]
                }
            })
        else:
            return JSONResponse(
                {"error": "Profile not found"},
                status_code=404
            )
            
    except Exception as error:
        print(f"[ERROR] Fetching user profile: {type(error).__name__}")
        return JSONResponse(
            {"error": f"Failed to fetch profile: {str(error)}"},
            status_code=500
        )

async def update_user_profile_endpoint(
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Update authenticated user's profile
    Requires authentication
    """
    try:
        body = await request.json()
        print(f"[PROFILE UPDATE] User: {user['id']} | Request body: {body}")
        
        allowed_fields = ["username", "full_name", "avatar_url", "notify_user"]
        update_data = {}
        
        for field in allowed_fields:
            if field in body:
                update_data[field] = body[field]
        
        if not update_data:
            return JSONResponse(
                {"error": "No valid fields provided for update"},
                status_code=400
            )
        
        print(f"[PROFILE UPDATE] Updating fields: {update_data}")
        
        supabase = get_supabase_client()
        
        # First, get current value for debugging
        current_profile = supabase.table('profiles').select('*').eq('id', user["id"]).single().execute()
        print(f"[PROFILE UPDATE] Current profile BEFORE update: {current_profile.data}")
        
        response = supabase.table('profiles').update(update_data).eq('id', user["id"]).execute()
        
        print(f"[PROFILE UPDATE] Supabase update response: {response.data}")
        
        # Verify the update actually persisted by re-reading
        verify_profile = supabase.table('profiles').select('*').eq('id', user["id"]).single().execute()
        print(f"[PROFILE UPDATE] Profile AFTER update: {verify_profile.data}")
        
        if response.data:
            return JSONResponse({
                "success": True,
                "message": "Profile updated successfully",
                "updated_fields": list(update_data.keys()),
                "new_values": update_data,
                "verified_profile": verify_profile.data if verify_profile.data else None
            })
        else:
            return JSONResponse(
                {"error": "Failed to update profile - no data returned"},
                status_code=500
            )
            
    except Exception as error:
        print(f"[ERROR] Updating user profile: {type(error).__name__}: {error}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            {"error": f"Failed to update profile: {str(error)}"},
            status_code=500
        )

async def get_user_statistics_endpoint(
    user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Get user's analysis statistics
    Requires authentication
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('powershell_analyses') \
            .select('id, risk_score, severity, is_malicious, created_at') \
            .eq('user_id', user["id"]) \
            .execute()
        
        if response.data:
            analyses = response.data
            
            total_analyses = len(analyses)
            malicious_count = sum(1 for a in analyses if a.get('is_malicious'))
            
            severity_counts = {}
            for analysis in analyses:
                severity = analysis.get('severity', 'unknown')
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            avg_risk_score = sum(float(a.get('risk_score', 0)) for a in analyses) / total_analyses if total_analyses > 0 else 0
            
            recent_analyses = sorted(analyses, key=lambda x: x.get('created_at', ''), reverse=True)[:10]
            
            return JSONResponse({
                "success": True,
                "statistics": {
                    "total_analyses": total_analyses,
                    "malicious_count": malicious_count,
                    "benign_count": total_analyses - malicious_count,
                    "severity_distribution": severity_counts,
                    "average_risk_score": round(avg_risk_score, 2)
                },
                "recent_analyses": recent_analyses
            })
        else:
            return JSONResponse({
                "success": True,
                "statistics": {
                    "total_analyses": 0,
                    "malicious_count": 0,
                    "benign_count": 0,
                    "severity_distribution": {},
                    "average_risk_score": 0
                },
                "recent_analyses": []
            })
            
    except Exception as error:
        print(f"[ERROR] Fetching user statistics: {type(error).__name__}")
        return JSONResponse(
            {"error": f"Failed to fetch statistics: {str(error)}"},
            status_code=500
        )
