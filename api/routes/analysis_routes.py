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
    load_signatures_from_db, analyze_command_patterns,
    calculate_severity_and_risk, save_analysis_to_db, signatures_cache, cache_timestamp
)
from services.detectors import detect_encoded_command
from services.cache_service import (
    generate_phash, check_cache, save_to_cache, should_cache_result,
    create_cache_compatible_result, extract_indicators_matched,
    update_cached_signatures_with_current_db_values
)
from services.session_manager import get_or_create_session, get_supabase_client
from utils.geolocation import get_ip_location, get_client_ip_from_request
from services.plan_service import can_user_decode_commands, get_user_plan_features, get_plan_by_name, check_session_rate_limit_from_db
from services.api_key_manager import update_api_key_usage


def slim_signature(sig: dict) -> dict:
    """Remove non-essential fields from signature for API response"""
    return {
        "name": sig.get("name"),
        "severity": sig.get("severity"),
        "score": sig.get("total_score", sig.get("base_score", 0)),
        "base_score": sig.get("base_score", sig.get("score", 0)),
        "total_score": sig.get("total_score", sig.get("base_score", 0)),
        "matches_found": sig.get("matches_found", 1),
        "max_match_allowed": sig.get("max_match_allowed", sig.get("max_match", 1)),
        "matches_details": sig.get("matches_details", []),
        "pattern": sig.get("pattern", ""),
        "tactics": sig.get("tactics", []),
        "techniques": sig.get("techniques", []),
        "description": sig.get("description"),
        "link": sig.get("link"),
        "indicator_type": sig.get("indicator_type")
    }


def slim_signatures(signatures: list) -> list:
    """Slim down all signatures in a list"""
    return [slim_signature(sig) for sig in signatures]


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
        
        # Log only metadata, not command content for security

        
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
        
        # Track API key for usage increment (only increment once per request)
        api_key_to_track = None
        
        if current_user and current_user.get("auth_type") == "api_key":
            search_type = "API"
            authorization = request.headers.get("Authorization", "")
            if authorization.startswith("Bearer pse_"):
                api_key_to_track = authorization[7:]  
        elif current_user and current_user.get("auth_type") == "jwt":
            
            search_type = "WEB"
        elif request_data.search_type:
            search_type = request_data.search_type
        else:
            search_type = "API"
        
        if api_key_to_track:
            await update_api_key_usage(api_key_to_track)
        
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
           
            plan_name = "guest"
            request_limit = 10
            
            if user_id:
                plan_features = await get_user_plan_features(user_id)
                plan_name = plan_features.get("plan_name", "free")
                request_limit = plan_features.get("request_limit_per_hour", 10)
            else:
                
                guest_plan = await get_plan_by_name("guest")
                if guest_plan:
                    request_limit = guest_plan.get("request_limit_per_hour", 10)
            
          
            rate_limit_info = await check_session_rate_limit_from_db(
                session_id=session_id,
                user_id=user_id,
                limit_per_minute=request_limit
            )
            
            if not rate_limit_info["within_limit"]:
                seconds_until_reset = rate_limit_info.get('seconds_until_reset', 0)
                minutes_until_reset = seconds_until_reset // 60
                return JSONResponse(
                    {
                        "error": {
                            "code": "QuotaExceededError",
                            "message": "You have exceeded your quota (per minute evaluation limit). Please wait a while.",
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
        
       
        add_global_request()
        
        
        phash = generate_phash(command)
        cached_result = await check_cache(phash)

        
        if not cached_result and not country and ip_address:
            location_data = await get_ip_location(ip_address)
            if location_data:
                country = location_data.get("country")

        
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

            results_blob = await update_cached_signatures_with_current_db_values(results_blob)

           
            decode_info = await can_user_decode_commands(user_id, session_id=session_id, command=command)
            allow_decoded_for_cache = decode_info["can_decode"]

            
            decoded_cmd = results_blob.get("decoded_command")
            double_decoded_cmd = results_blob.get("double_decoded_command")

            
            results_blob_for_save = results_blob.copy()

           
            db_result = await save_analysis_to_db(
                command=command,
                analysis_result=results_blob_for_save,
                user_id=user_id,
                session_id=session_id,
                ip_address=ip_address,
                country=country,
                search_type=search_type,
                user_agent=user_agent,
                is_cache=True,
                count_as_decode=allow_decoded_for_cache  
            )

            if not db_result.get("success"):
                print(f"[ERROR] Failed to save cached analysis to DB: {db_result.get('error')}")
                return JSONResponse(
                    {
                        "success": False,
                        "error": {
                            "code": "DatabaseError",
                            "message": "Failed to save analysis",
                            "details": db_result.get("error", "Unknown database error")
                        }
                    },
                    status_code=500
                )
            analysis_id = db_result.get("short_id")

           
            if session_id:
                rate_limit_info = await check_session_rate_limit_from_db(
                    session_id=session_id,
                    user_id=user_id,
                    limit_per_minute=request_limit
                )

          
            decode_info = await can_user_decode_commands(user_id, session_id=session_id, command=command)

            
            if not allow_decoded_for_cache:
                if decoded_cmd:
                    decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                if double_decoded_cmd:
                    double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"

               
                signatures_detected = results_blob.get("signatures_detected", [])
                filtered_signatures = []
                recalculated_score = 0.0
                filtered_tactics = set()
                filtered_techniques = set()

                for signature in signatures_detected:
                    
                    found_in_decoded = signature.get("found_in_decoded", False)

    
                    matches = signature.get("matches_details", [])
                    has_decoded_match = any(
                        match.get("matched_in") == "decoded" for match in matches
                    )

                   
                    if found_in_decoded or has_decoded_match:
                        continue

                    for match in matches:
                        if "matched_text" in match:
                            match["matched_text"] = "[PREMIUM_PROTECTED_CONTENT]"
                    filtered_signatures.append(signature)
                    recalculated_score += signature.get("total_score", 0)
                    filtered_tactics.update(signature.get("tactics", []))
                    filtered_techniques.update(signature.get("techniques", []))

                
                results_blob["signatures_detected"] = filtered_signatures
                results_blob["detected_signatures"] = filtered_signatures
                results_blob["risk_score"] = round(recalculated_score, 1)
                results_blob["total_score"] = recalculated_score
                results_blob["tactics"] = list(filtered_tactics)
                results_blob["techniques"] = list(filtered_techniques)
                results_blob["detected_count"] = len(filtered_signatures)

                
                results_blob["severity"] = calculate_severity_and_risk(recalculated_score)

        
            decode_was_used_this_request = allow_decoded_for_cache and (decoded_cmd is not None and decoded_cmd != "[PREMIUM_PROTECTED_CONTENT]")

            return JSONResponse({
                "success": True,
                "analysis": {
                    "command": command,
                    "risk_score": results_blob.get("risk_score", 0.0),
                    "severity": results_blob.get("severity", "very_low"),
                    "signatures": slim_signatures(results_blob.get("signatures_detected", [])),
                    "tactics": results_blob.get("tactics", []),
                    "techniques": results_blob.get("techniques", []),
                    "decoded_command": decoded_cmd,
                    "double_decoded_command": double_decoded_cmd
                },
                "analysis_id": analysis_id,
                "session_id": session_id,
                "decode_info": {
                    "current_usage": decode_info["current_usage"],
                    "limit": decode_info["limit"],
                    "is_example": decode_info.get("is_example", False),
                    "decode_used_this_request": decode_was_used_this_request
                },
                "rate_limit_info": {
                    "within_limit": rate_limit_info.get("within_limit", True),
                    "current_count": rate_limit_info.get("current_count", 0),
                    "limit": rate_limit_info.get("limit")
                }
            })
        
       
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

       
        decode_info_before = await can_user_decode_commands(user_id, session_id=session_id, command=command)
        allow_decoded_analysis = decode_info_before["can_decode"]

        

        analysis_result = analyze_command_patterns(command, signatures, allow_decoded_analysis)

        print(f"[DEBUG ENDPOINT] analysis_result keys: {analysis_result.keys()}")
        print(f"[DEBUG ENDPOINT] analysis_result['decoded_command']: {analysis_result.get('decoded_command', 'NOT_IN_RESULT')[:200] if analysis_result.get('decoded_command') else 'None'}")
        print(f"[DEBUG ENDPOINT] analysis_result['double_decoded_command']: {analysis_result.get('double_decoded_command', 'NOT_IN_RESULT')[:200] if analysis_result.get('double_decoded_command') else 'None'}")

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
            is_cache=False,
            count_as_decode=allow_decoded_analysis 
        )

        
        decode_info = await can_user_decode_commands(user_id, session_id=session_id, command=command)

       
        decoded_cmd = analysis_result.get("decoded_command")
        double_decoded_cmd = analysis_result.get("double_decoded_command")

        
        decode_limit_reached = False
        final_signatures = analysis_result["detected_signatures"]
        final_score = analysis_result["total_score"]
        final_severity = severity
        final_tactics = analysis_result["tactics"]
        final_techniques = analysis_result["techniques"]

        if not decode_info_before["can_decode"]:
            decode_limit_reached = True

            
            encoding_check = detect_encoded_command(command)
            command_is_encoded = encoding_check.get("is_encoded", False)

            if decoded_cmd:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            elif command_is_encoded:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"

            if double_decoded_cmd:
                double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"

        
            filtered_signatures = []
            recalculated_score = 0.0
            filtered_tactics = set()
            filtered_techniques = set()

            for signature in analysis_result["detected_signatures"]:
                
                found_in_decoded = signature.get("found_in_decoded", False)

               
                matches = signature.get("matches_details", [])
                has_decoded_match = any(
                    match.get("matched_in") == "decoded" for match in matches
                )

               
                if found_in_decoded or has_decoded_match:
                    continue

               
                for match in matches:
                    if "matched_text" in match:
                        match["matched_text"] = "[PREMIUM_PROTECTED_CONTENT]"
                filtered_signatures.append(signature)
                recalculated_score += signature.get("total_score", 0)
                filtered_tactics.update(signature.get("tactics", []))
                filtered_techniques.update(signature.get("techniques", []))

            final_signatures = filtered_signatures
            final_score = recalculated_score
            final_severity = calculate_severity_and_risk(recalculated_score)
            final_tactics = list(filtered_tactics)
            final_techniques = list(filtered_techniques)

            if len(analysis_result["detected_signatures"]) != len(filtered_signatures):
                print(f"[DECODE LIMIT] Filtered {len(analysis_result['detected_signatures']) - len(filtered_signatures)} decoded-only signatures")

        # Determine if decode was successfully used in THIS request
        decode_was_used_this_request = decode_info_before["can_decode"] and (decoded_cmd is not None or double_decoded_cmd is not None)
        print(f"[DEBUG ENDPOINT] === DECODE SUMMARY ===")
        print(f"[DEBUG ENDPOINT] decoded_cmd is not None: {decoded_cmd is not None}")
        print(f"[DEBUG ENDPOINT] double_decoded_cmd is not None: {double_decoded_cmd is not None}")
        print(f"[DEBUG ENDPOINT] decode_info_before['can_decode']: {decode_info_before['can_decode']}")
        print(f"[DEBUG ENDPOINT] decode_was_used_this_request: {decode_was_used_this_request}")

        return JSONResponse({
            "success": True,
            "analysis": {
                "command": command,
                "risk_score": round(final_score, 1),
                "severity": final_severity,
                "signatures": slim_signatures(final_signatures),
                "tactics": final_tactics,
                "techniques": final_techniques,
                "decoded_command": decoded_cmd,
                "double_decoded_command": double_decoded_cmd
            },
            "analysis_id": db_result.get("short_id") if db_result.get("success") else None,
            "session_id": session_id,
            "decode_info": {
                "current_usage": decode_info["current_usage"],
                "limit": decode_info["limit"],
                "is_example": decode_info.get("is_example", False),
                "decode_used_this_request": decode_was_used_this_request
            },
            "rate_limit_info": {
                "within_limit": rate_limit_info.get("within_limit", True),
                "current_count": rate_limit_info.get("current_count", 0),
                "limit": rate_limit_info.get("limit")
            }
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
    Suporta paginação com limit e offset
    """
    try:
        # Pagination params with safe validation
        limit_param = request.query_params.get("limit")
        offset_param = request.query_params.get("offset")
        
        try:
            limit = int(limit_param) if limit_param else 50
        except (ValueError, TypeError):
            limit = 50
        
        try:
            offset = int(offset_param) if offset_param else 0
        except (ValueError, TypeError):
            offset = 0
        
        # Bounds protection
        limit = max(1, min(limit, 100))
        offset = max(0, offset)
        
        # SECURITY: Only use authenticated user's ID, never from query params
        user_id = current_user["id"] if current_user else None
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
        
        # Check plan for history access
        if user_id:
            plan_features = await get_user_plan_features(user_id)
            if plan_features.get("plan_name") == "guest":
                 return JSONResponse(
                    {
                        "error": {
                            "code": "PlanRestrictionError",
                            "message": "Guest users do not have access to history.",
                            "details": "Upgrade your plan to view history."
                        }
                    },
                    status_code=403
                )
        else:
             # Anonymous users are guests
             return JSONResponse(
                {
                    "error": {
                        "code": "PlanRestrictionError",
                        "message": "Guest users do not have access to history.",
                        "details": "Sign up and upgrade your plan to view history."
                    }
                },
                status_code=403
            )
        
        supabase = get_supabase_client()
        
        # Base query
        query = supabase.table('powershell_analyses').select('*', count='exact')
        
        if user_id:
            query = query.eq('user_id', user_id)
        else:
            query = query.eq('session_id', session_id)
            
        # Order and pagination
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
            
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
                "total": response.count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + len(analyses)) < response.count
            })
        else:
            return JSONResponse({
                "success": True,
                "analyses": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
                "has_more": False
            })
            
    except Exception as error:
        print(f"[ERROR] Error fetching user analyses: {type(error).__name__}")
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
        # Sanitize analysis_id input
        if not analysis_id or len(analysis_id) > 50:
            return JSONResponse(
                {
                    "error": {
                        "code": "InvalidArgumentError",
                        "message": "Some of the provided arguments are incorrect.",
                        "details": "Invalid analysis ID format"
                    }
                },
                status_code=400
            )
        
        analysis_id = analysis_id.strip()
        supabase = get_supabase_client()
        
        # Short ID format: 8 alphanumeric characters
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
            import regex
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            is_uuid = regex.match(uuid_pattern, analysis_id, regex.IGNORECASE)
            
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

      
        command = analysis_data.get("command", "")

        
        decode_info = await can_user_decode_commands(user_id, session_id=session_id, command=command)

        decoded_cmd = analysis_data.get("decoded_command")
        double_decoded_cmd = analysis_data.get("double_decoded_command")
        deobfuscated_cmd = analysis_data.get("obfuscated_command")

        
       
        analysis_user_id = analysis_data.get("user_id")
        analysis_session_id = analysis_data.get("session_id")

        
        is_owner = False
        if user_id and analysis_user_id and str(user_id) == str(analysis_user_id):
            is_owner = True
        elif not user_id and session_id and analysis_session_id and str(session_id) == str(analysis_session_id):
            is_owner = True

       
        analysis_has_decoded = analysis_data.get("has_decoded_content", False)
        should_show_decoded = is_owner and analysis_has_decoded

    

        decode_limit_reached = False
        final_signatures = analysis_data.get("signatures_detected", [])
        final_score = analysis_data.get("risk_score", 0)
        final_severity = analysis_data.get("severity", "informational")
        final_tactics = analysis_data.get("tactics", [])
        final_techniques = analysis_data.get("techniques", [])

       
        if not should_show_decoded and not decode_info["can_decode"]:
            decode_limit_reached = True

           
            encoding_check = detect_encoded_command(command)
            command_is_encoded = encoding_check.get("is_encoded", False)

            if decoded_cmd:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            elif command_is_encoded:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                

            if double_decoded_cmd:
                double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            if deobfuscated_cmd:
                deobfuscated_cmd = "[PREMIUM_PROTECTED_CONTENT]"

           
            signatures_detected = analysis_data.get("signatures_detected", [])
            filtered_signatures = []
            recalculated_score = 0.0
            filtered_tactics = set()
            filtered_techniques = set()

            for signature in signatures_detected:
               
                found_in_decoded = signature.get("found_in_decoded", False)

                
                matches = signature.get("matches_details", [])
                has_decoded_match = any(
                    match.get("matched_in") == "decoded" for match in matches
                )

              
                if found_in_decoded or has_decoded_match:
                    print(f"[GET ANALYSIS] Filtering signature: {signature.get('name')} (found_in_decoded={found_in_decoded}, has_decoded_match={has_decoded_match})")
                    continue

               
                for match in matches:
                    if "matched_text" in match:
                        match["matched_text"] = "[PREMIUM_PROTECTED_CONTENT]"
                filtered_signatures.append(signature)
                recalculated_score += signature.get("total_score", 0)
                filtered_tactics.update(signature.get("tactics", []))
                filtered_techniques.update(signature.get("techniques", []))

            final_signatures = filtered_signatures
            final_score = round(recalculated_score, 1)
            final_severity = calculate_severity_and_risk(recalculated_score)
            final_tactics = list(filtered_tactics)
            final_techniques = list(filtered_techniques)

        
        showing_decoded_content = should_show_decoded or (decode_info["can_decode"] and decoded_cmd and decoded_cmd != "[PREMIUM_PROTECTED_CONTENT]")

        return JSONResponse({
            "success": True,
            "analysis": {
                "command": analysis_data.get("command"),
                "risk_score": final_score,
                "severity": final_severity,
                "signatures": slim_signatures(final_signatures),
                "tactics": final_tactics,
                "techniques": final_techniques,
                "decoded_command": decoded_cmd,
                "double_decoded_command": double_decoded_cmd,
                "deobfuscated_command": deobfuscated_cmd
            },
            "decode_info": {
                "current_usage": decode_info["current_usage"],
                "limit": decode_info["limit"],
                "is_example": decode_info.get("is_example", False),
                "decode_used_this_request": showing_decoded_content,
                "is_owner": is_owner
            }
        })
    except Exception as error:
        print(f"[ERROR] GET ANALYSIS: {type(error).__name__}")
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
        print(f"[ERROR] Deleting analysis: {type(error).__name__}")
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
        # Check plan for history access
        plan_features = await get_user_plan_features(user["id"])
        if plan_features.get("plan_name") == "guest":
                return JSONResponse(
                {
                    "error": {
                        "code": "PlanRestrictionError",
                        "message": "Guest users do not have access to history.",
                        "details": "Upgrade your plan to view history."
                    }
                },
                status_code=403
            )

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
        print(f"[ERROR] Fetching command evaluations: {type(error).__name__}")
        return JSONResponse(
            {"error": f"Failed to fetch command evaluations: {str(error)}"},
            status_code=500
        )
