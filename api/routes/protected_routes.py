"""
Protected API routes that require authentication
"""
from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
from middleware.auth_middleware import get_current_user_required, get_current_user_optional
from services.session_manager import get_supabase_client


async def get_user_profile_endpoint(
    user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Get authenticated user's profile information
    Requires authentication
    """
    try:
        supabase = get_supabase_client()
        
        # Get user profile from database
        response = supabase.table('profiles').select('*').eq('id', user["id"]).single().execute()
        
        if response.data:
            profile = response.data
            # Remove sensitive information
            safe_profile = {
                "id": profile.get("id"),
                "username": profile.get("username"),
                "full_name": profile.get("full_name"),
                "avatar_url": profile.get("avatar_url"),
                "created_at": profile.get("created_at"),
                "updated_at": profile.get("updated_at")
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
        print(f"Error fetching user profile: {error}")
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
        
        # Define allowed fields for update
        allowed_fields = ["username", "full_name", "avatar_url"]
        update_data = {}
        
        for field in allowed_fields:
            if field in body:
                update_data[field] = body[field]
        
        if not update_data:
            return JSONResponse(
                {"error": "No valid fields provided for update"},
                status_code=400
            )
        
        supabase = get_supabase_client()
        
        # Update user profile
        response = supabase.table('profiles').update(update_data).eq('id', user["id"]).execute()
        
        if response.data:
            return JSONResponse({
                "success": True,
                "message": "Profile updated successfully",
                "updated_fields": list(update_data.keys())
            })
        else:
            return JSONResponse(
                {"error": "Failed to update profile"},
                status_code=500
            )
            
    except Exception as error:
        print(f"Error updating user profile: {error}")
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
        
        # Get user analysis statistics
        response = supabase.table('powershell_analyses') \
            .select('id, risk_score, severity, is_malicious, created_at') \
            .eq('user_id', user["id"]) \
            .execute()
        
        if response.data:
            analyses = response.data
            
            # Calculate statistics
            total_analyses = len(analyses)
            malicious_count = sum(1 for a in analyses if a.get('is_malicious'))
            
            severity_counts = {}
            for analysis in analyses:
                severity = analysis.get('severity', 'unknown')
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            avg_risk_score = sum(float(a.get('risk_score', 0)) for a in analyses) / total_analyses if total_analyses > 0 else 0
            
            # Get recent analyses (last 10)
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
        print(f"Error fetching user statistics: {error}")
        return JSONResponse(
            {"error": f"Failed to fetch statistics: {str(error)}"},
            status_code=500
        )


async def delete_user_analysis_endpoint(
    analysis_id: str,
    user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Delete a specific analysis belonging to the authenticated user
    Requires authentication and ownership
    """
    try:
        supabase = get_supabase_client()
        
        # First, verify the analysis belongs to the user
        check_response = supabase.table('powershell_analyses') \
            .select('id, user_id') \
            .eq('id', analysis_id) \
            .eq('user_id', user["id"]) \
            .single() \
            .execute()
        
        if not check_response.data:
            return JSONResponse(
                {"error": "Analysis not found or you don't have permission to delete it"},
                status_code=404
            )
        
        # Delete the analysis
        delete_response = supabase.table('powershell_analyses') \
            .delete() \
            .eq('id', analysis_id) \
            .eq('user_id', user["id"]) \
            .execute()
        
        return JSONResponse({
            "success": True,
            "message": "Analysis deleted successfully"
        })
        
    except Exception as error:
        print(f"Error deleting analysis: {error}")
        return JSONResponse(
            {"error": f"Failed to delete analysis: {str(error)}"},
            status_code=500
        )


async def get_user_command_evaluations_endpoint(
    user: Dict[str, Any] = Depends(get_current_user_required)
):
    """
    Busca todas as análises/avaliações de comandos do usuário autenticado
    Endpoint protegido que funciona com JWT ou API Key
    """
    try:
        supabase = get_supabase_client()
        
        # Buscar todas as análises do usuário
        response = supabase.table('powershell_analyses') \
            .select('*') \
            .eq('user_id', user["id"]) \
            .order('created_at', desc=True) \
            .execute()
        
        if response.data:
            analyses = []
            for analysis in response.data:
                # Processar campos JSON se necessário
                signatures_detected = analysis.get("signatures_detected", [])
                cmdlets_detected = analysis.get("cmdlets_detected", [])
                tactics = analysis.get("tactics", [])
                techniques = analysis.get("techniques", [])
                
                # Parse JSON strings if needed
                if isinstance(signatures_detected, str):
                    try:
                        signatures_detected = json.loads(signatures_detected)
                    except:
                        signatures_detected = []
                
                if isinstance(cmdlets_detected, str):
                    try:
                        cmdlets_detected = json.loads(cmdlets_detected)
                    except:
                        cmdlets_detected = []
                
                if isinstance(tactics, str):
                    try:
                        tactics = json.loads(tactics)
                    except:
                        tactics = []
                
                if isinstance(techniques, str):
                    try:
                        techniques = json.loads(techniques)
                    except:
                        techniques = []
                
                analyses.append({
                    "id": analysis.get("id"),
                    "uuid": analysis.get("uuid"),
                    "short_id": analysis.get("short_id"),
                    "command": analysis.get("command"),
                    "risk_score": float(analysis.get("risk_score", 0)) if analysis.get("risk_score") is not None else 0,
                    "severity": analysis.get("severity"),
                    "is_malicious": analysis.get("is_malicious", False),
                    "signatures_detected": signatures_detected,
                    "cmdlets_detected": cmdlets_detected,
                    "tactics": tactics,
                    "techniques": techniques,
                    "created_at": analysis.get("created_at"),
                    "search_type": analysis.get("search_type"),
                    "ip_country": analysis.get("ip_country"),
                    "ip_city": analysis.get("ip_city")
                })
            
            return JSONResponse({
                "success": True,
                "user_id": user["id"],
                "auth_type": user.get("auth_type", "jwt"),
                "total_analyses": len(analyses),
                "analyses": analyses
            })
        else:
            return JSONResponse({
                "success": True,
                "user_id": user["id"],
                "auth_type": user.get("auth_type", "jwt"),
                "total_analyses": 0,
                "analyses": [],
                "message": "No command evaluations found for this user"
            })
            
    except Exception as error:
        print(f"Error fetching user command evaluations: {error}")
        return JSONResponse(
            {"error": f"Failed to fetch command evaluations: {str(error)}"},
            status_code=500
        )
