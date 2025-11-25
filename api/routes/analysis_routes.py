"""
Analysis API Routes - Command analysis and history
"""
import json
import time
from typing import Optional, Dict, Any
from fastapi import Request, Depends, Query
from fastapi.responses import JSONResponse
from middleware.auth_middleware import get_current_user_optional, get_current_user_required
from models.schemas import (
    AnalyzeCommandRequest, AnalyzeCommandResponse, 
    ErrorResponse, UserCommandEvaluationsResponse
)
from middleware.rate_limiting import (
    check_global_rate_limit, add_global_request, 
    GLOBAL_RATE_LIMIT_REQUESTS, GLOBAL_RATE_LIMIT_WINDOW
)
from services.powershell_analyzer import (
    load_signatures_from_db, analyze_command_patterns, calculate_severity_and_risk,
    save_analysis_to_db, signatures_cache, cache_timestamp
)
from services.cache_service import (
    generate_phash, check_cache, save_to_cache, should_cache_result,
    create_cache_compatible_result, extract_indicators_matched
)
from services.session_manager import get_or_create_session, get_supabase_client
from utils.geolocation import get_ip_location, get_client_ip_from_request
from services.plan_service import can_user_decode_commands, get_user_plan_features, get_plan_by_name, check_session_rate_limit_from_db

async def analyze_command_endpoint(
    request: Request,
    request_data: AnalyzeCommandRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> AnalyzeCommandResponse:
    """
    PowerShell Command Analysis
    Optimized for instant cache responses
    """
    try:
        command = request_data.command
        
        
        if command is None:
            return JSONResponse(
                {
                    "error": {
                        "code": "BadRequestError",
                        "message": "The API request is invalid or malformed. The message usually provides details about why the request is not valid.",
                        "details": "Command cannot be None"
                    }
                },
                status_code=400
            )
        
       
        if len(command) > 100000:
            return JSONResponse(
                {
                    "error": {
                        "code": "InvalidArgumentError",
                        "message": "Some of the provided arguments are incorrect.",
                        "details": f"Command must be less than 100000 characters. Provided: {len(command)} characters"
                    }
                },
                status_code=400
            )
        
     
        print(f"Length: {len(command)}, Content: '{command[:100]}'")

        
        global_rate_limit_info = check_global_rate_limit()
        
        if not global_rate_limit_info["within_limit"]:
            return JSONResponse(
                {
                    "error": {
                        "code": "TooManyRequestsError",
                        "message": "Too many requests.",
                        "details": f"Global rate limit exceeded. {global_rate_limit_info['current_count']} requests in the last {global_rate_limit_info['window_seconds']} seconds. Please wait {global_rate_limit_info.get('seconds_until_reset', 0)} seconds."
                    },
                    "global_rate_limit_info": global_rate_limit_info
                },
                status_code=429
            )
        
       
        user_id = current_user["id"] if current_user else request_data.user_id
        
        
        ip_address = request_data.ip_address
        if not ip_address:
            ip_address = get_client_ip_from_request(request)
        
        country = request_data.country
        user_agent = request_data.user_agent or "FastAPI-Client"
        
        if current_user and current_user.get("auth_type") == "api_key":
            
            search_type = "API"
        elif current_user and current_user.get("auth_type") == "jwt":
            
            search_type = "WEB"
        elif request_data.search_type:
            search_type = request_data.search_type
        else:
            search_type = "API"
        
        session_id = request_data.session_id
        
        if not session_id:
            supabase = get_supabase_client()
            session_id = await get_or_create_session(
                supabase=supabase,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                country=country
            )
        
        if session_id:
            # ✅ Fetch user plan for rate limiting
            plan_name = "free"
            request_limit = 10
            
            if user_id:
                plan_features = await get_user_plan_features(user_id)
                plan_name = plan_features.get("plan_name", "free")
                request_limit = plan_features.get("request_limit_per_hour", 10)
            else:
                # For anonymous, fetch free plan limits
                free_plan = await get_plan_by_name("free")
                if free_plan:
                    request_limit = free_plan.get("request_limit_per_hour", 10)
            
            # ✅ FIX: Database-based rate limit check
            rate_limit_info = await check_session_rate_limit_from_db(
                session_id=session_id,
                user_id=user_id,
                limit_per_hour=request_limit
            )
            
            if not rate_limit_info["within_limit"]:
                seconds_until_reset = rate_limit_info.get('seconds_until_reset', 0)
                minutes_until_reset = seconds_until_reset // 60
                return JSONResponse(
                    {
                        "error": {
                            "code": "QuotaExceededError",
                            "message": "You have exceeded one of your quotas (minute, daily or monthly). Daily quotas are reset every day at 00:00 UTC.",
                            "details": f"You have made {rate_limit_info['current_count']} searches in this session. Please wait {minutes_until_reset} minutes before trying again."
                        },
                        "rate_limit_info": rate_limit_info,
                        "session_id": session_id
                    },
                    status_code=429
                )
        else:
            rate_limit_info = {
                "within_limit": True,
                "current_count": 0,
                "limit": None,
                "seconds_until_reset": None
            }
        
        # ✅ Keep global rate limit
        add_global_request()
        
        if not country and ip_address:
            location_data = await get_ip_location(ip_address)
            if location_data:
                country = location_data.get("country")
        
        phash = generate_phash(command)
        
        cached_result = await check_cache(phash)
        
        # ✅ Cache hit now properly counted in DB
        if cached_result:
            results_blob = cached_result.get("results_blob", {})
            
            if "total_score" not in results_blob:
                results_blob["total_score"] = results_blob.get("risk_score", 0.0)
            if "detected_signatures" not in results_blob:
                results_blob["detected_signatures"] = results_blob.get("signatures_detected", [])
            
            if "decoded_command" not in results_blob:
                results_blob["decoded_command"] = None
            if "double_decoded_command" not in results_blob:
                results_blob["double_decoded_command"] = None
            if "deobfuscated_command" not in results_blob:
                results_blob["deobfuscated_command"] = None
            
            # ✅ Save to DB (this increments the count)
            db_result = await save_analysis_to_db(
                command=command,
                analysis_result=results_blob,
                user_id=user_id,
                session_id=session_id,
                ip_address=ip_address,
                country=country,
                search_type=search_type,
                user_agent=user_agent,
                is_cache=True
            )
            
            analysis_id = db_result.get("short_id") if db_result.get("success") else "cache-error"
            
            # ✅ FIX: Recalculate rate_limit_info AFTER saving to DB
            if session_id:
                rate_limit_info = await check_session_rate_limit_from_db(
                    session_id=session_id,
                    user_id=user_id,
                    limit_per_hour=request_limit
                )
            
            # ✅ FIX: Extract decoded variables BEFORE decode check
            decoded_cmd = results_blob.get("decoded_command")
            double_decoded_cmd = results_blob.get("double_decoded_command")
            deobfuscated_cmd = results_blob.get("deobfuscated_command")
            
            # ✅ Check decode permission
            decode_info = await can_user_decode_commands(user_id, session_id=session_id)
            
            
            if not decode_info["can_decode"]:
                if decoded_cmd:
                    decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                    print(f"🚫 [MASKING] decoded_command masked")
                if double_decoded_cmd:
                    double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                    print(f"🚫 [MASKING] double_decoded_command masked")
                if deobfuscated_cmd:
                    deobfuscated_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                    print(f"🚫 [MASKING] deobfuscated_command masked")
                
                # ✅ FIX: Mask matched_text in signatures to prevent leak
                signatures_detected = results_blob.get("signatures_detected", [])
                for signature in signatures_detected:
                    matches = signature.get("matches_details", [])
                    for match in matches:
                        if "matched_text" in match:
                            match["matched_text"] = "[PREMIUM_PROTECTED_CONTENT]"

            
            return JSONResponse({
                "success": True,
                "from_cache": True,
                "analysis": {
                    "command": command,
                    "risk_score": results_blob.get("risk_score", 0.0),
                    "severity": results_blob.get("severity", "very_low"),
                    "signatures_detected": results_blob.get("signatures_detected", []),
                    "tactics": results_blob.get("tactics", []),
                    "techniques": results_blob.get("techniques", []),
                    "decoded_command": decoded_cmd,
                    "double_decoded_command": double_decoded_cmd,
                    "deobfuscated_command": deobfuscated_cmd,
                    "total_signatures_checked": results_blob.get("total_signatures_checked", 0),
                    "detected_count": results_blob.get("detected_count", 0),
                    "cache_info": {
                        "cached": True,
                        "cache_hit": True,
                        "phash": phash,
                        "instant_response": True
                    }
                },
                "analysis_id": analysis_id,
                "session_id": session_id,
                "decode_info": {
                    "current_usage": decode_info["current_usage"],
                    "limit": decode_info["limit"],
                    "remaining": decode_info["remaining"],
                    "seconds_until_reset": decode_info["seconds_until_reset"]
                },
                "rate_limit_info": rate_limit_info
            })
        
        # ✅ Fresh analysis continues here (counters already incremented above)
        signatures = await load_signatures_from_db(user_id=user_id)
        
        if not signatures:
            return JSONResponse(
                {
                    "error": {
                        "code": "TransientError",
                        "message": "Transient server error. Retry might work.",
                        "details": "No signatures available for analysis"
                    }
                },
                status_code=503
            )
        
        analysis_result = analyze_command_patterns(command, signatures)
        severity = calculate_severity_and_risk(analysis_result["total_score"])
        
        analysis_result.update({
            "severity": severity,
            "total_signatures_checked": len(signatures),
            "detected_count": len(analysis_result["detected_signatures"])
        })
        
        analysis_result["detected_signatures"].sort(key=lambda x: x["total_score"], reverse=True)
        
        cache_saved = False
        if should_cache_result(analysis_result):
            
            indicators_matched = extract_indicators_matched(analysis_result)
            cache_compatible_result = create_cache_compatible_result(analysis_result)
            
            cache_saved = await save_to_cache(phash, indicators_matched, cache_compatible_result)
        
        db_result = await save_analysis_to_db(
            command=command,
            analysis_result=analysis_result,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            country=country,
            search_type=search_type,
            user_agent=user_agent,
            is_cache=False
        )
        
        # Check if user is premium
        is_premium_user = False
        if user_id:
            supabase = get_supabase_client()
            profile_response = supabase.table('profiles').select('is_premium_user').eq('id', user_id).single().execute()
            if profile_response.data:
                is_premium_user = profile_response.data.get('is_premium_user', False)
        
        # Mask content for non-premium users
        decoded_cmd = analysis_result.get("decoded_command")
        double_decoded_cmd = analysis_result.get("double_decoded_command")
        deobfuscated_cmd = analysis_result.get("deobfuscated_command")
        
        # ✅ FIX: Use centralized plan service for ALL users (including anonymous)
        decode_info = await can_user_decode_commands(user_id, session_id=session_id)
        
        print(f" User: {user_id[:8] if user_id else 'ANONYMOUS'} | Session: {session_id[:8] if session_id else 'NONE'} | Can decode: {decode_info['can_decode']} | Usage: {decode_info['current_usage']}/{decode_info['limit']}")
        
        # Mask content for users without decode permission
        decode_limit_reached = False
        if not decode_info["can_decode"]:
            decode_limit_reached = True
                
            if decoded_cmd:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                print(f" [MASKING] decoded_command masked")
            if double_decoded_cmd:
                double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                print(f" [MASKING] double_decoded_command masked")
            if deobfuscated_cmd:
                deobfuscated_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                print(f" [MASKING] deobfuscated_command masked")

            # ✅ FIX: Mask matched_text in signatures to prevent leak
            for signature in analysis_result["detected_signatures"]:
                matches = signature.get("matches_details", [])
                for match in matches:
                    if "matched_text" in match:
                        match["matched_text"] = "[PREMIUM_PROTECTED_CONTENT]"

        return JSONResponse({
            "success": True,
            "from_cache": False,
            "analysis": {
                "command": command,
                "risk_score": round(analysis_result["total_score"], 1),
                "severity": severity,
                "signatures_detected": analysis_result["detected_signatures"],
                "tactics": analysis_result["tactics"],
                "techniques": analysis_result["techniques"],
                "decoded_command": decoded_cmd,
                "double_decoded_command": double_decoded_cmd,
                "deobfuscated_command": deobfuscated_cmd,
                "decode_limit_reached": decode_limit_reached,
                "total_signatures_checked": len(signatures),
                "detected_count": len(analysis_result["detected_signatures"]),
                "cache_info": {
                    "cached": cache_saved,
                    "cache_hit": False,
                    "phash": phash,
                    "signatures_cache_active": signatures_cache is not None,
                    "signatures_cache_age_minutes": round((int(time.time() * 1000) - cache_timestamp) / 60000, 1) if cache_timestamp > 0 else 0
                }
            },
            "analysis_id": db_result.get("short_id") if db_result.get("success") else None,
            "session_id": session_id,
            "decode_info": {
                "current_usage": decode_info["current_usage"],
                "limit": decode_info["limit"],
                "remaining": decode_info["remaining"],
                "seconds_until_reset": decode_info["seconds_until_reset"]
            },
            "rate_limit_info": rate_limit_info
        })
        
    except Exception as error:
        return JSONResponse(
            {
                "error": {
                    "code": "TransientError",
                    "message": "Transient server error. Retry might work.",
                    "details": f"Internal error: {str(error)}"
                }
            },
            status_code=503
        )

async def get_user_analyses_endpoint(
    request: Request,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Busca análises do usuário logado ou sessão anônima
    Suporta parâmetro limit para limitar quantidade de resultados
    Se limit não for especificado, retorna TODOS os registros
    """
    try:
        limit_param = request.query_params.get("limit")
        limit = int(limit_param) if limit_param else None   
        user_id_from_query = request.query_params.get("user_id")
        
        user_id = current_user["id"] if current_user else user_id_from_query
        session_id = request.cookies.get("session_id")
        if not session_id:
            session_id = request.headers.get("X-Session-ID")
        
        if not user_id and not session_id:
            return JSONResponse(
                {
                    "error": {
                        "code": "AuthenticationRequiredError",
                        "message": "The operation requires an authenticated user. Verify that you have provided your API key.",
                        "details": "User ID or Session ID required"
                    }
                },
                status_code=401
            )
        
        supabase = get_supabase_client()
        
        if user_id:
            query = supabase.table('powershell_analyses') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('created_at', desc=True)
            
            if limit:
                query = query.limit(limit)
                
            response = query.execute()
        else:
            query = supabase.table('powershell_analyses') \
                .select('*') \
                .eq('session_id', session_id) \
                .order('created_at', desc=True)
            
            if limit:
                query = query.limit(limit)
                
            response = query.execute()
        
        if response.data:
            analyses = []
            for analysis in response.data:
                analyses.append({
                    "id": analysis.get("id"),
                    "uuid": analysis.get("uuid"),
                    "short_id": analysis.get("short_id"),
                    "command": analysis.get("command"),
                    "risk_score": float(analysis.get("risk_score", 0)) if analysis.get("risk_score") is not None else 0,
                    "is_malicious": analysis.get("is_malicious", False),
                    "severity": analysis.get("severity"),
                    "signatures_detected": analysis.get("signatures_detected", []),
                    "cmdlets_detected": analysis.get("cmdlets_detected", []),
                    "tactics": analysis.get("tactics", []),
                    "techniques": analysis.get("techniques", []),
                    "created_at": analysis.get("created_at"),
                    "is_cache": analysis.get("is_cache", False),
                    "decoded_command": analysis.get("decoded_command"),
                    "deobfuscated_command": analysis.get("obfuscated_command")
                })
            
            return JSONResponse({
                "success": True,
                "analyses": analyses,
                "total": len(analyses)
            })
        else:
            return JSONResponse({
                "success": True,
                "analyses": [],
                "total": 0
            })
            
    except Exception as error:
        print(f"❌ Error fetching user analyses: {error}")
        return JSONResponse(
            {
                "error": {
                    "code": "TransientError",
                    "message": "Transient server error. Retry might work.",
                    "details": f"Failed to fetch user analyses: {str(error)}"
                }
            },
            status_code=503
        )

async def get_analysis_by_id_endpoint(
    request: Request,
    analysis_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Busca uma análise específica por short_id, UUID ou ID do banco (compatibilidade)
    Permite acesso público para análises compartilháveis
    """
    try:
        supabase = get_supabase_client()
        
        if len(analysis_id) == 8 and analysis_id.isalnum():
            response = supabase.table('powershell_analyses').select('*').eq('short_id', analysis_id).single().execute()
            
            if response.data:
                analysis_data = response.data
            else:
                return JSONResponse(
                    {
                        "error": {
                            "code": "NotFoundError",
                            "message": "The requested resource was not found.",
                            "details": "Analysis not found"
                        }
                    },
                    status_code=404
                )
        else:
            import re
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            is_uuid = re.match(uuid_pattern, analysis_id, re.IGNORECASE)
            
            if is_uuid:
                response = supabase.table('powershell_analyses').select('*').eq('uuid', analysis_id).single().execute()
                
                if not response.data:
                    return JSONResponse(
                        {
                            "error": {
                                "code": "NotFoundError",
                                "message": "The requested resource was not found.",
                                "details": "Analysis not found"
                            }
                        },
                        status_code=404
                    )
                
                analysis_data = response.data
            else:
                try:
                    db_id = int(analysis_id)
                    response = supabase.table('powershell_analyses').select('*').eq('id', db_id).single().execute()
                    
                    if not response.data:
                        return JSONResponse(
                            {
                                "error": {
                                    "code": "NotFoundError",
                                    "message": "The requested resource was not found.",
                                    "details": "Analysis not found"
                                }
                            },
                            status_code=404
                        )
                    
                    analysis_data = response.data
                except ValueError:
                    return JSONResponse(
                        {
                            "error": {
                                "code": "InvalidArgumentError",
                                "message": "Some of the provided arguments are incorrect.",
                                "details": "Invalid analysis ID"
                            }
                        },
                        status_code=400
                    )
        
        user_id = current_user.get("id") if current_user else None
        session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id")
        
        # ✅ FIX: Get decode_info BEFORE using it
        decode_info = await can_user_decode_commands(user_id, session_id=session_id)
        
        decoded_cmd = analysis_data.get("decoded_command")
        double_decoded_cmd = analysis_data.get("double_decoded_command")
        deobfuscated_cmd = analysis_data.get("obfuscated_command")
        
        
        decode_limit_reached = False
        if not decode_info["can_decode"]:
            decode_limit_reached = True

            if decoded_cmd:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            if double_decoded_cmd:
                double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            if deobfuscated_cmd:
                deobfuscated_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            
            # ✅ FIX: Mask matched_text in signatures to prevent leak
            signatures_detected = analysis_data.get("signatures_detected", [])
            if signatures_detected:
                for signature in signatures_detected:
                    matches = signature.get("matches_details", [])
                    if matches:
                        for match in matches:
                            if "matched_text" in match:
                                match["matched_text"] = "[PREMIUM_PROTECTED_CONTENT]"

        safe_analysis = {
            "id": analysis_data.get("id"),
            "command": analysis_data.get("command"),
            "analysis_result": analysis_data.get("analysis_result"),
            "risk_score": analysis_data.get("risk_score"),
            "signatures_detected": analysis_data.get("signatures_detected"),
            "tactics": analysis_data.get("tactics"),
            "techniques": analysis_data.get("techniques"),
            "decoded_command": decoded_cmd,
            "double_decoded_command": double_decoded_cmd,
            "deobfuscated_command": deobfuscated_cmd,
            "decode_limit_reached": decode_limit_reached,
            "created_at": analysis_data.get("created_at"),
        }
        return JSONResponse({
            "success": True,
            "analysis": safe_analysis,
            "decode_info": {
                "current_usage": decode_info["current_usage"],
                "limit": decode_info["limit"],
                "remaining": decode_info["remaining"],
                "seconds_until_reset": decode_info["seconds_until_reset"]
            }
        })
    except Exception as error:
        print(f"❌ [GET ANALYSIS ERROR] {error}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            {
                "error": {
                    "code": "TransientError",
                    "message": "Transient server error. Retry might work.",
                    "details": f"Failed to fetch analysis: {str(error)}"
                }
            },
            status_code=503
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
    request: Request,
    limit: int = Query(
        None, 
        ge=1, 
        le=100,
        title="Limit",
        description="Number of records to return. Maximum 100. If not specified, returns all records."
    ),
    offset: int = Query(
        0, 
        ge=0,
        title="Offset",
        description="Pagination offset. Use with limit for page-based pagination. Default is 0."
    ),
    short_id: str = Query(
        None,
        title="Short ID",
        description="Filter by specific analysis short_id. The short_id is an 8-character identifier for each analysis."
    ),
    user: Dict[str, Any] = Depends(get_current_user_required)
) -> UserCommandEvaluationsResponse:
    """
    Get User Command Evaluations with Pagination
    
    Retrieves PowerShell command analyses for the authenticated user.
    Supports pagination and filtering by specific analysis.
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table('powershell_analyses') \
            .select('*') \
            .eq('user_id', user["id"]) \
            .order('created_at', desc=True)
        
        # Apply short_id filter if provided
        if short_id:
            query = query.eq('short_id', short_id)
        
        # Apply pagination
        if limit is not None:
            query = query.limit(limit)
        
        if offset > 0:
            query = query.offset(offset)
        
        response = query.execute()
        
        if response.data:
            analyses = []
            for analysis in response.data:
                signatures_detected = analysis.get("signatures_detected", [])
                cmdlets_detected = analysis.get("cmdlets_detected", [])
                tactics = analysis.get("tactics", [])
                techniques = analysis.get("techniques", [])
                
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
                "total_returned": len(analyses),
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "has_more": len(analyses) == limit if limit else False
                },
                "analyses": analyses
            })
        else:
            return JSONResponse({
                "success": True,
                "user_id": user["id"],
                "auth_type": user.get("auth_type", "jwt"),
                "total_returned": 0,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "has_more": False
                },
                "analyses": [],
                "message": "No command evaluations found for this user"
            })
            
    except Exception as error:
        print(f"Error fetching user command evaluations: {error}")
        return JSONResponse(
            {"error": f"Failed to fetch command evaluations: {str(error)}"},
            status_code=500
        )
