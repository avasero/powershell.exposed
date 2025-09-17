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
    CreateUserSessionRequest, GenerateCaptchaRequest, 
    VerifyCaptchaRequest, ErrorResponse
)

from middleware.rate_limiting import (
    check_global_rate_limit, add_global_request, check_rate_limit,
    add_request_to_rate_limit, reset_rate_limit, generate_captcha,
    verify_captcha, store_captcha_solution, mark_captcha_solved,
    captcha_tokens, global_request_timestamps, GLOBAL_RATE_LIMIT_REQUESTS,
    GLOBAL_RATE_LIMIT_WINDOW
)
from services.powershell_analyzer import (
    load_signatures_from_db, analyze_command_patterns, calculate_severity_and_risk,
    save_analysis_to_db, clear_signatures_cache, signatures_cache, cache_timestamp
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
        user_id = current_user["id"] if current_user else getattr(request_data, 'user_id', None)
        ip_address = getattr(request_data, 'ip_address', None) or "127.0.0.1"
        country = getattr(request_data, 'country', None)
        city = getattr(request_data, 'city', None)
        region = getattr(request_data, 'region', None)
        timezone = getattr(request_data, 'timezone', None)
        user_agent = getattr(request_data, 'user_agent', None) or "FastAPI-Client"
        search_type = getattr(request_data, 'search_type', None) or "API"
        session_id = getattr(request_data, 'session_id', None)
        captcha_token = getattr(request_data, 'captcha_token', None)
        captcha_answer = getattr(request_data, 'captcha_answer', None)
        
        # Garantir que temos um session_id para aplicar rate limiting
        if not session_id:
            print("🔍 Session ID não fornecido, criando/obtendo sessão primeiro...")
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
            print(f"✅ Session ID obtido: {session_id}")
        
        # Verificar rate limit usando session_id
        rate_limit_info = None
        if session_id:
            rate_limit_info = check_rate_limit(session_id)
            print(f"🔒 Rate limit info para sessão {session_id}: {rate_limit_info}")
            
            # Se passou do limite básico (5), usuário pode OU esperar OU fazer captcha
            if not rate_limit_info["within_limit"]:
                # Se não tem captcha, oferecer as duas opções
                if not (captcha_token and captcha_answer):
                    return JSONResponse(
                        {
                            "error": "Rate limit exceeded",
                            "rate_limit_info": rate_limit_info,
                            "requires_captcha": True,
                            "session_id": session_id,
                            "message": f"You have made {rate_limit_info['current_count']} searches in this session. You can either wait {rate_limit_info.get('seconds_until_reset', 0)} seconds OR solve the captcha to continue immediately."
                        },
                        status_code=400  # 400 para mostrar captcha, não 429
                    )
        
        # Se usuário passou do limite (5), verificar se tem captcha válido
        if session_id and rate_limit_info and not rate_limit_info["within_limit"] and (captcha_token and captcha_answer):
            print(f"🔒 Verificando captcha para contornar rate limit da sessão {session_id}...")
            
            # Verificar se captcha é válido
            if captcha_token not in captcha_tokens:
                return JSONResponse(
                    {
                        "error": "Invalid or expired captcha token",
                        "requires_captcha": True,
                        "rate_limit_info": rate_limit_info,
                        "session_id": session_id
                    },
                    status_code=400
                )
            
            token_data = captcha_tokens[captcha_token]
            if token_data["session_id"] != session_id:
                return JSONResponse(
                    {
                        "error": "Captcha token does not belong to this session",
                        "requires_captcha": True,
                        "rate_limit_info": rate_limit_info,
                        "session_id": session_id
                    },
                    status_code=400
                )
            
            if time.time() > token_data["expires_at"]:
                return JSONResponse(
                    {
                        "error": "Captcha token expired",
                        "requires_captcha": True,
                        "rate_limit_info": rate_limit_info,
                        "session_id": session_id
                    },
                    status_code=400
                )
            
            if not verify_captcha(captcha_token, captcha_answer):
                return JSONResponse(
                    {
                        "error": "Incorrect captcha answer",
                        "requires_captcha": True,
                        "rate_limit_info": rate_limit_info,
                        "session_id": session_id
                    },
                    status_code=400
                )
            
            # ✅ CAPTCHA VÁLIDO - RESETAR RATE LIMIT COMPLETAMENTE
            mark_captcha_solved(captcha_token)
            reset_rate_limit(session_id)
            print(f"✅ Captcha resolvido! Rate limit resetado para sessão: {session_id}")
            print(f"🔄 Sessão pode continuar fazendo análises normalmente")
            
            # Adicionar esta requisição como a primeira do novo ciclo (após reset)
            add_request_to_rate_limit(session_id)
            print(f"🔄 Nova requisição adicionada após reset. Count: 1")
        else:
            # Se não tem captcha válido, adicionar ao contador normalmente
            if session_id:
                add_request_to_rate_limit(session_id)
                print(f"📊 Requisição adicionada para sessão {session_id}")
        
        # ADICIONAR REQUISIÇÃO AO CONTADOR GLOBAL
        add_global_request()
        
        if ip_address and not country and search_type == "API":
            print(f"🌍 Capturando geolocalização automática para IP: {ip_address}")
            location_data = await get_ip_location(ip_address)
            if location_data:
                country = location_data.get("country") or country
                city = location_data.get("city") or city
                region = location_data.get("region") or region
                timezone = location_data.get("timezone") or timezone
                print(f"✅ Geollocalização capturada: {country}, {city}, {region}, {timezone}")
            else:
                print(f"⚠️ Não foi possível capturar geolocalização para IP: {ip_address}")
        
        print(f"🚀 Dados extraídos:")
        print(f"   - Command: {command}")
        print(f"   - User ID: {user_id}")
        print(f"   - IP: {ip_address}")
        print(f"   - Country: {country}")
        print(f"   - City: {city}")
        print(f"   - Region: {region}")
        print(f"   - Timezone: {timezone}")
        print(f"   - User Agent: {user_agent}")
        print(f"   - Search Type: {search_type}")
        print(f"   - Session ID: {session_id}")
        
        if not command or not isinstance(command, str):
            print("❌ Command inválido")
            return JSONResponse(
                {"error": "Command is required and must be a string"},
                status_code=400
            )
        
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
        
        # Salvar no banco
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
            user_agent=user_agent
        )
        
        return JSONResponse({
            "success": True,
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
                    "cached": signatures_cache is not None,
                    "cache_age_minutes": round((int(time.time() * 1000) - cache_timestamp) / 60000, 1) if cache_timestamp > 0 else 0
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


async def generate_captcha_endpoint(request_data: GenerateCaptchaRequest) -> Dict[str, Any]:
    """
    Generate Captcha Challenge
    
    Generates a mathematical captcha challenge for users who have exceeded
    their rate limit. Solving the captcha allows continued API usage.
    """
    try:
        session_id = request_data.session_id
        
        if not session_id:
            return JSONResponse(
                {"error": "Session ID is required"},
                status_code=400
            )
        
        # Gerar captcha
        captcha_data = generate_captcha()
        
        # Armazenar solução e token
        store_captcha_solution(captcha_data["token"], captcha_data["solution"], session_id)
        
        print(f"🔐 Captcha gerado para sessão {session_id}: {captcha_data['question']}")
        
        return JSONResponse({
            "success": True,
            "captcha": {
                "token": captcha_data["token"],
                "question": captcha_data["question"]
            }
        })
        
    except Exception as error:
        print(f"Error generating captcha: {error}")
        return JSONResponse(
            {"error": f"Internal error: {str(error)}"},
            status_code=500
        )


async def verify_captcha_endpoint(request_data: VerifyCaptchaRequest) -> Dict[str, Any]:
    """
    Verify Captcha Answer
    
    Verifies the user's captcha answer. If correct, resets the rate limit
    for the session, allowing continued API usage.
    """
    try:
        token = request_data.token
        answer = request_data.answer
        session_id = request_data.session_id
        
        if not token or not answer or not session_id:
            return JSONResponse(
                {"error": "Token, answer and session_id are required"},
                status_code=400
            )
        
        # Verificar se o token existe e pertence à sessão
        if token not in captcha_tokens:
            return JSONResponse(
                {"error": "Invalid or expired token"},
                status_code=400
            )
        
        token_data = captcha_tokens[token]
        if token_data["session_id"] != session_id:
            return JSONResponse(
                {"error": "Token does not belong to this session"},
                status_code=400
            )
        
        if time.time() > token_data["expires_at"]:
            return JSONResponse(
                {"error": "Token expired"},
                status_code=400
            )
        
        # Verificar resposta
        is_correct = verify_captcha(token, answer)
        
        if is_correct:
            mark_captcha_solved(token)
            print(f"✅ Captcha resolvido com sucesso para sessão {session_id}")
            return JSONResponse({
                "success": True,
                "message": "Captcha solved successfully"
            })
        else:
            print(f"❌ Resposta incorreta do captcha para sessão {session_id}")
            return JSONResponse(
                {"error": "Incorrect answer"},
                status_code=400
            )
            
    except Exception as error:
        print(f"Error verifying captcha: {error}")
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
        ip_address = getattr(request_data, 'ip_address', None) or "127.0.0.1"
        user_agent = getattr(request_data, 'user_agent', None) or "Unknown"
        country = getattr(request_data, 'country', None)
        city = getattr(request_data, 'city', None)
        region = getattr(request_data, 'region', None)
        
        if not user_id:
            return JSONResponse(
                {"error": "user_id is required"},
                status_code=400
            )
        
        print(f"🔄 Criando nova sessão para usuário: {user_id}")
        
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
                    print(f"🔄 Usando ID do banco diretamente: {db_id} (compatibilidade)")
                    
                    # Buscar análise por ID do banco
                    response = supabase.table('powershell_analyses').select('*').eq('id', db_id).single().execute()
                    
                    if not response.data:
                        return JSONResponse(
                            {"error": "Analysis not found"},
                            status_code=404
                        )
                    
                    analysis_data = response.data
                    print(f"✅ Análise encontrada por ID: {analysis_data.get('id')}")
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
