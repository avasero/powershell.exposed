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
    request_data: AnalyzeCommandRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> AnalyzeCommandResponse:
    """
    Analyze PowerShell Command
    
    Analyzes a PowerShell command using signatures from the database and returns:
    - Risk score and severity level
    - Detected malicious signatures
    - MITRE ATT&CK tactics and techniques
    - Detailed pattern matches
    
    Works for both authenticated and anonymous users.
    """
    try:
        # VERIFICAR RATE LIMIT GLOBAL PRIMEIRO
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
        
        # Extrair dados do schema com fallbacks seguros
        command = request_data.command
        user_id = current_user["id"] if current_user else request_data.user_id
        ip_address = request_data.ip_address or "127.0.0.1"
        country = request_data.country
        city = request_data.city
        region = request_data.region
        timezone = request_data.timezone
        user_agent = request_data.user_agent or "FastAPI-Client"
        
        # Determinar search_type baseado no tipo de autenticação
        if current_user and current_user.get("auth_type") == "api_key":
            # API Key = uso externo (Postman, cURL, etc)
            search_type = "API"
        elif current_user and current_user.get("auth_type") == "jwt":
            # JWT Token = interface web
            search_type = "WEB"
        elif request_data.search_type:
            # Usar o tipo enviado pelo frontend se não há autenticação
            search_type = request_data.search_type
        else:
            # Fallback para API se não há informação
            search_type = "API"
        
        session_id = request_data.session_id
        
        # Garantir que temos um session_id para aplicar rate limiting
        if not session_id:
            supabase = get_supabase_client()
            session_id = await get_or_create_session(
                supabase=supabase,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                country=country,
                city=city,
                region=region
            )
        
    
        # Check rate limit for session
        if session_id:
            rate_limit_info = check_rate_limit(session_id)
            
            # If rate limit exceeded, return error with wait time
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
            
            # Add request to rate limit counter
            add_request_to_rate_limit(session_id)
        
        # ADICIONAR REQUISIÇÃO AO CONTADOR GLOBAL
        add_global_request()
        
        if ip_address and not country and search_type == "API":
            location_data = await get_ip_location(ip_address)
            if location_data:
                country = location_data.get("country") or country
                city = location_data.get("city") or city
                region = location_data.get("region") or region
                timezone = location_data.get("timezone") or timezone
        
        if not command or not isinstance(command, str):
            return JSONResponse(
                {"error": "Command is required and must be a string"},
                status_code=400
            )
        
        # STEP 1: Generate phash for the command
        phash = generate_phash(command)
        print(f"🔍 Generated phash for command: {phash}")
        
        # STEP 2: Check cache DB for existing results
        cached_result = await check_cache(phash)
        
        if cached_result:
            print(f"🎯 CACHE HIT: Analysis retrieved from cache for phash: {phash}")
            cache_created = cached_result.get("created_at")
            print(f"📅 Cache entry created: {cache_created}")
            
            # Use cached results - extract from results_blob
            results_blob = cached_result.get("results_blob", {})
            
            # Backwards compatibility: handle both old and new cache formats
            analysis_result_for_save = results_blob.copy()
            
            # Ensure 'total_score' field exists (old cache entries only had 'risk_score')
            if "total_score" not in analysis_result_for_save:
                analysis_result_for_save["total_score"] = results_blob.get("risk_score", 0.0)
            
            # Ensure 'detected_signatures' field exists (old cache entries only had 'signatures_detected')
            if "detected_signatures" not in analysis_result_for_save:
                analysis_result_for_save["detected_signatures"] = results_blob.get("signatures_detected", [])
            
            risk_score = analysis_result_for_save.get('total_score', 0)
            detected_count = len(analysis_result_for_save.get('detected_signatures', []))
            print(f"⚡ INSTANT RESPONSE: Risk Score: {risk_score}, Signatures: {detected_count} (FROM CACHE)")
            
            # Save to powershell_analyses table with cached results (marked as cache)
            db_result = await save_analysis_to_db(
                command=command,
                analysis_result=analysis_result_for_save,
                user_id=user_id,
                session_id=session_id,
                ip_address=ip_address,
                country=country,
                city=city,
                region=region,
                timezone=timezone,
                search_type=search_type,
                user_agent=user_agent,
                is_cache=True
            )
            
            return JSONResponse({
                "success": True,
                "from_cache": True,  # FLAG CLARA PARA O FRONTEND
                "analysis": {
                    "command": command,
                    "is_malicious": results_blob.get("is_malicious", False),
                    "risk_score": results_blob.get("risk_score", 0.0),
                    "severity": results_blob.get("severity", "very_low"),
                    "signatures_detected": results_blob.get("signatures_detected", []),
                    "tactics": results_blob.get("tactics", []),
                    "techniques": results_blob.get("techniques", []),
                    "total_signatures_checked": results_blob.get("total_signatures_checked", 0),
                    "detected_count": results_blob.get("detected_count", 0),
                    "cache_info": {
                        "cached": True,
                        "cache_hit": True,
                        "phash": phash,
                        "cache_created_at": cached_result.get("created_at"),
                        "instant_response": True
                    }
                },
                "analysis_id": db_result.get("short_id") if db_result.get("success") else None,
                "session_id": session_id
            })
        
        print(f"🔍 CACHE MISS for phash: {phash} - No cached analysis found")
        print(f"🧪 FRESH ANALYSIS starting - Running full pattern analysis (this will take a moment)")
        
        # STEP 3: Cache miss - run full analysis via /analyse-pcre2 logic
        signatures = await load_signatures_from_db()
        
        if not signatures:
            return JSONResponse(
                {"error": "No signatures available for analysis"},
                status_code=500
            )
        
        # Analisar comando
        analysis_result = analyze_command_patterns(command, signatures)
        severity, is_malicious = calculate_severity_and_risk(analysis_result["total_score"])
        
        # Adicionar informações calculadas ao resultado
        analysis_result.update({
            "severity": severity,
            "is_malicious": is_malicious,
            "total_signatures_checked": len(signatures),
            "detected_count": len(analysis_result["detected_signatures"])
        })
        
        # Ordenar assinaturas por score
        analysis_result["detected_signatures"].sort(key=lambda x: x["total_score"], reverse=True)
        
        # STEP 3.1: Check if we should cache this result (only if indicators matched)
        cache_saved = False
        if should_cache_result(analysis_result):
            print(f"💾 Saving to cache - indicators detected: {len(analysis_result['detected_signatures'])}")
            
            # Prepare cache data
            indicators_matched = extract_indicators_matched(analysis_result)
            cache_compatible_result = create_cache_compatible_result(analysis_result)
            
            # Save to cache
            cache_saved = await save_to_cache(phash, indicators_matched, cache_compatible_result)
        else:
            print(f"⏭️  Skipping cache - no indicators detected")
        
        # STEP 4: Save to powershell_analyses table (fresh analysis)
        print(f"💾 FRESH ANALYSIS: Saving to database (is_cache=False)")
        db_result = await save_analysis_to_db(
            command=command,
            analysis_result=analysis_result,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            country=country,
            city=city,
            region=region,
            timezone=timezone,
            search_type=search_type,
            user_agent=user_agent,
            is_cache=False
        )
        
        return JSONResponse({
            "success": True,
            "from_cache": False,  # FLAG CLARA PARA O FRONTEND
            "analysis": {
                "command": command,
                "is_malicious": is_malicious,
                "risk_score": round(analysis_result["total_score"], 1),
                "severity": severity,
                "signatures_detected": analysis_result["detected_signatures"],
                "tactics": analysis_result["tactics"],
                "techniques": analysis_result["techniques"],
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
        print(f"Erro na análise: {error}")
        return JSONResponse(
            {"error": f"Internal error: {str(error)}"},
            status_code=500
        )





async def create_user_session_endpoint(request_data: CreateUserSessionRequest) -> Dict[str, Any]:
    """
    Create User Session
    
    Creates a new session for authenticated users to track their activity
    and apply rate limiting. Required for proper user session management.
    """
    try:
        user_id = request_data.user_id
        ip_address = request_data.ip_address or "127.0.0.1"
        user_agent = request_data.user_agent or "Unknown"
        country = request_data.country
        city = request_data.city
        region = request_data.region
        
        if not user_id:
            return JSONResponse(
                {"error": "user_id is required"},
                status_code=400
            )
        
        supabase = get_supabase_client()
        
        # Forçar criação de nova sessão (não procurar existente)
        session_id = await get_or_create_session(
            supabase=supabase,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            country=country,
            city=city,
            region=region
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
        print(f"Error creating user session: {error}")
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
    """
    try:
        # Obter parâmetros da query
        limit = int(request.query_params.get("limit", 20))
        user_id_from_query = request.query_params.get("user_id")
        
        # Use authenticated user ID if available
        user_id = current_user["id"] if current_user else (request.headers.get("X-User-ID") or user_id_from_query)
        session_id = request.cookies.get("session_id")
        if not session_id:
            # Tentar obter do header Authorization ou X-Session-ID
            session_id = request.headers.get("X-Session-ID")
        
        if not user_id and not session_id:
            return JSONResponse(
                {"error": "User ID or Session ID required"},
                status_code=401
            )
        
        supabase = get_supabase_client()
        
        # Buscar análises por user_id (usuários logados) ou session_id (anônimos)
        if user_id:
            response = supabase.table('powershell_analyses') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('created_at', desc=True) \
                .limit(limit) \
                .execute()
        else:
            response = supabase.table('powershell_analyses') \
                .select('*') \
                .eq('session_id', session_id) \
                .order('created_at', desc=True) \
                .limit(limit) \
                .execute()
        
        if response.data:
            # Processar dados para compatibilidade com frontend
            analyses = []
            for analysis in response.data:
                # Processar campos que podem vir como string JSON
                signatures_detected = analysis.get("signatures_detected", [])
                cmdlets_detected = analysis.get("cmdlets_detected", [])
                analysis_result = analysis.get("analysis_result", {})
                tactics = analysis.get("tactics", [])
                techniques = analysis.get("techniques", [])
                
                # Se vieram como string JSON, fazer parse
                if isinstance(signatures_detected, str):
                    try:
                        signatures_detected = json.loads(signatures_detected)
                    except (json.JSONDecodeError, TypeError):
                        signatures_detected = []
                
                if isinstance(cmdlets_detected, str):
                    try:
                        cmdlets_detected = json.loads(cmdlets_detected)
                    except (json.JSONDecodeError, TypeError):
                        cmdlets_detected = []
                
                if isinstance(analysis_result, str):
                    try:
                        analysis_result = json.loads(analysis_result)
                    except (json.JSONDecodeError, TypeError):
                        analysis_result = {}
                
                if isinstance(tactics, str):
                    try:
                        tactics = json.loads(tactics)
                    except (json.JSONDecodeError, TypeError):
                        tactics = []
                
                if isinstance(techniques, str):
                    try:
                        techniques = json.loads(techniques)
                    except (json.JSONDecodeError, TypeError):
                        techniques = []
                
                analyses.append({
                    "id": analysis.get("id"),
                    "uuid": analysis.get("uuid"),
                    "command": analysis.get("command"),
                    "risk_score": float(analysis.get("risk_score", 0)) if analysis.get("risk_score") is not None else 0,
                    "severity": analysis.get("severity"),
                    "signatures_detected": signatures_detected,
                    "cmdlets_detected": cmdlets_detected,
                    "analysis_result": analysis_result,
                    "tactics": tactics,
                    "techniques": techniques,
                    "created_at": analysis.get("created_at"),
                    "is_malicious": analysis.get("is_malicious", False),
                    "is_anonymous": False  # Marcar como não anônimo para usuários logados
                })
            
            return JSONResponse({
                "success": True,
                "analyses": analyses,
                "total": len(analyses)
            })
        else:
            print(f"⚠️ Nenhuma análise encontrada para sessão {session_id}")
            return JSONResponse({
                "success": True,
                "analyses": [],
                "total": 0
            })
            
    except Exception as error:
        print(f"❌ Erro ao buscar análises do usuário: {error}")
        return JSONResponse(
            {"error": f"Failed to fetch user analyses: {str(error)}"},
            status_code=500
        )


async def get_analysis_by_id_endpoint(analysis_id: str):
    """
    Busca uma análise específica por short_id, UUID ou ID do banco (compatibilidade)
    Permite acesso público para análises compartilháveis
    """
    try:
        print(f"🔍 Buscando análise com ID: {analysis_id}")
        
        supabase = get_supabase_client()
        
        # Primeiro, tentar buscar por short_id (8 caracteres alfanuméricos)
        if len(analysis_id) == 8 and analysis_id.isalnum():
            print(f"🔍 Buscando análise por short_id: {analysis_id}")
            response = supabase.table('powershell_analyses').select('*').eq('short_id', analysis_id).single().execute()
            
            if response.data:
                analysis_data = response.data
                print(f"✅ Análise encontrada por short_id: {analysis_data.get('id')}")
            else:
                print(f"❌ Short ID não encontrado: {analysis_id}")
                return JSONResponse(
                    {"error": "Analysis not found"},
                    status_code=404
                )
        else:
            # Verificar se é um UUID (formato: 8-4-4-4-12 caracteres)
            import re
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            is_uuid = re.match(uuid_pattern, analysis_id, re.IGNORECASE)
            
            if is_uuid:
                # Buscar análise diretamente pelo UUID no banco
                print(f"🔍 Buscando análise por UUID no banco: {analysis_id}")
                response = supabase.table('powershell_analyses').select('*').eq('uuid', analysis_id).single().execute()
                
                if not response.data:
                    print(f"❌ UUID não encontrado no banco: {analysis_id}")
                    return JSONResponse(
                        {"error": "Analysis not found"},
                        status_code=404
                    )
                
                analysis_data = response.data
                print(f"✅ Análise encontrada por UUID: {analysis_data.get('id')}")
            else:
                # Assumir que é um ID do banco (compatibilidade com análises antigas)
                try:
                    db_id = int(analysis_id)
                    
                    
                    # Buscar análise por ID do banco
                    response = supabase.table('powershell_analyses').select('*').eq('id', db_id).single().execute()
                    
                    if not response.data:
                        return JSONResponse(
                            {"error": "Analysis not found"},
                            status_code=404
                        )
                    
                    analysis_data = response.data
                   
                except ValueError:
                    print(f"❌ ID inválido: {analysis_id}")
                    return JSONResponse(
                        {"error": "Invalid analysis ID"},
                        status_code=400
                    )
        
        # Remover informações sensíveis para compartilhamento público
        safe_analysis = {
            "id": analysis_data.get("id"),
            "command": analysis_data.get("command"),
            "analysis_result": analysis_data.get("analysis_result"),
            "risk_score": analysis_data.get("risk_score"),
            "signatures_detected": analysis_data.get("signatures_detected"),
            "tactics": analysis_data.get("tactics"),
            "techniques": analysis_data.get("techniques"),
            "decoded_command": analysis_data.get("decoded_command"),
            "created_at": analysis_data.get("created_at"),
            # Não incluir informações sensíveis como IP, user_id, etc.
        }
        
        return JSONResponse({
            "success": True,
            "analysis": safe_analysis
        })
        
    except Exception as error:
        print(f"❌ Erro ao buscar análise: {error}")
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
