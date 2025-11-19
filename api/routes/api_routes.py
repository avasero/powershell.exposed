"""
Rotas da API para análise de comandos PowerShell
"""
import json
import time
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from middleware.auth_middleware import get_current_user_optional
from models.schemas import (
    AnalyzeCommandRequest, AnalyzeCommandResponse, 
    CreateUserSessionRequest, ErrorResponse
)

from middleware.rate_limiting import (
    check_global_rate_limit, add_global_request, check_rate_limit,
    add_request_to_rate_limit, reset_rate_limit,
    global_request_timestamps, GLOBAL_RATE_LIMIT_REQUESTS,
    GLOBAL_RATE_LIMIT_WINDOW
)
from services.powershell_analyzer import (
    load_signatures_from_db, analyze_command_patterns, calculate_severity_and_risk,
    save_analysis_to_db, clear_signatures_cache, signatures_cache, cache_timestamp
)
from services.cache_service import (
    generate_phash, check_cache, save_to_cache, should_cache_result,
    create_cache_compatible_result, extract_indicators_matched
)
from services.session_manager import get_or_create_session, get_supabase_client
from utils.geolocation import get_ip_location, get_client_ip_from_request


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
                    "error": "Command validation failed",
                    "details": "Command cannot be None"
                },
                status_code=400
            )
        
       
        if len(command) > 10000:
            return JSONResponse(
                {
                    "error": "Command validation failed",
                    "details": f"Command must be less than 10000 characters. Provided: {len(command)} characters"
                },
                status_code=400
            )
        
     
        print(f"📥 [RAW COMMAND] Length: {len(command)}, Content: '{command[:100]}'")

        
        global_rate_limit_info = check_global_rate_limit()
        
        if not global_rate_limit_info["within_limit"]:
            return JSONResponse(
                {
                    "error": "Search limit reached. Please try again in a moment",
                    "global_rate_limit_info": global_rate_limit_info,
                    "message": f"Global rate limit exceeded. {global_rate_limit_info['current_count']} requests in the last {global_rate_limit_info['window_seconds']} seconds. Please wait {global_rate_limit_info.get('seconds_until_reset', 0)} seconds."
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
            rate_limit_info = check_rate_limit(session_id)
            
            if not rate_limit_info["within_limit"]:
                return JSONResponse(
                    {
                        "error": "Rate limit exceeded",
                        "rate_limit_info": rate_limit_info,
                        "session_id": session_id,
                        "message": f"You have made {rate_limit_info['current_count']} searches in this session. Please wait {rate_limit_info.get('seconds_until_reset', 0)} seconds before trying again."
                    },
                    status_code=429
                )
            
            add_request_to_rate_limit(session_id)
        
        add_global_request()
        
        if not country and ip_address:
            location_data = await get_ip_location(ip_address)
            if location_data:
                country = location_data.get("country")
                print(f"✅ País encontrado: {country}")
        
        phash = generate_phash(command)
        
        cached_result = await check_cache(phash)
        
        # ✅ FIX: Processar cache corretamente dentro do bloco if
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
            
            # ✅ Salvar no banco DENTRO do bloco if
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
            
            # Check if user is premium
            is_premium_user = False
            if user_id:
                supabase = get_supabase_client()
                profile_response = supabase.table('profiles').select('is_premium_user').eq('id', user_id).single().execute()
                if profile_response.data:
                    is_premium_user = profile_response.data.get('is_premium_user', False)
            
            # Mask content for non-premium users
            decoded_cmd = results_blob.get("decoded_command")
            double_decoded_cmd = results_blob.get("double_decoded_command")
            deobfuscated_cmd = results_blob.get("deobfuscated_command")
            
            if not is_premium_user:
                if decoded_cmd:
                    decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                if double_decoded_cmd:
                    double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
                if deobfuscated_cmd:
                    deobfuscated_cmd = "[PREMIUM_PROTECTED_CONTENT]"

            # ✅ Retornar resposta do cache DENTRO do bloco if
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
                "session_id": session_id
            })
        
        # ✅ Se não houver cache, continuar com análise normal
        signatures = await load_signatures_from_db(user_id=user_id)
        
        if not signatures:
            return JSONResponse(
                {"error": "No signatures available for analysis"},
                status_code=500
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
        
        if not is_premium_user:
            if decoded_cmd:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            if double_decoded_cmd:
                double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            if deobfuscated_cmd:
                deobfuscated_cmd = "[PREMIUM_PROTECTED_CONTENT]"

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
                "deobfuscated_command": deobfuscated_cmd,  # Add this
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
            "session_id": session_id
        })
        
    except Exception as error:
        return JSONResponse(
            {"error": f"Internal error: {str(error)}"},
            status_code=500
        )





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
                {"error": "user_id is required"},
                status_code=400
            )
        
        
        if not country and ip_address:
            location_data = await get_ip_location(ip_address)
            if location_data:
                country = location_data.get("country")
                print(f"✅ País encontrado: {country}")
        
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
                {"error": "Failed to create user session"},
                status_code=500
            )
            
    except Exception as error:
      
        return JSONResponse(
            {"error": f"Internal error: {str(error)}"},
            status_code=500
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
                {"error": "User ID or Session ID required"},
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
                    "deobfuscated_command": analysis.get("obfuscated_command")  # ✅ FIX: Mapear obfuscated_command -> deobfuscated_command
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
            {"error": f"Failed to fetch user analyses: {str(error)}"},
            status_code=500
        )


async def get_analysis_by_id_endpoint(
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
                    {"error": "Analysis not found"},
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
                        {"error": "Analysis not found"},
                        status_code=404
                    )
                
                analysis_data = response.data
            else:
                try:
                    db_id = int(analysis_id)
                    
                    
                    response = supabase.table('powershell_analyses').select('*').eq('id', db_id).single().execute()
                    
                    if not response.data:
                        return JSONResponse(
                            {"error": "Analysis not found"},
                            status_code=404
                        )
                    
                    analysis_data = response.data
                   
                except ValueError:
               
                    return JSONResponse(
                        {"error": "Invalid analysis ID"},
                        status_code=400
                    )
        
        # Check if user is premium
        is_premium_user = False
        user_id = current_user.get("id") if current_user else None
        
        if user_id:
            profile_response = supabase.table('profiles').select('is_premium_user').eq('id', user_id).single().execute()
            if profile_response.data:
                is_premium_user = profile_response.data.get('is_premium_user', False)
        
        decoded_cmd = analysis_data.get("decoded_command")
        double_decoded_cmd = analysis_data.get("double_decoded_command")
        deobfuscated_cmd = analysis_data.get("obfuscated_command") # Mapped from obfuscated_command in DB
        
        if not is_premium_user:
            if decoded_cmd:
                decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            if double_decoded_cmd:
                double_decoded_cmd = "[PREMIUM_PROTECTED_CONTENT]"
            if deobfuscated_cmd:
                deobfuscated_cmd = "[PREMIUM_PROTECTED_CONTENT]"

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
            "deobfuscated_command": deobfuscated_cmd,  # ✅ FIX: Mapear obfuscated_command -> deobfuscated_command
            "created_at": analysis_data.get("created_at"),
        }
        
        return JSONResponse({
            "success": True,
            "analysis": safe_analysis
        })
        
    except Exception as error:
       
        return JSONResponse(
            {"error": f"Failed to fetch analysis: {str(error)}"},
            status_code=500
        )


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
    


async def health_check_endpoint():
    """Endpoint de health check"""
    return JSONResponse({
        "status": "healthy",
        "message": "Fast api working"
    })
