from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import re  
import os
import json
import time
import uuid
import aiohttp 
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict
import secrets

load_dotenv('.env.local', override=True)

app = FastAPI(
    title="PowerShell.exposed API",
    description="API para análise de comandos PowerShell",
    version="1.0.0"
)

# Rate limiting e captcha
RATE_LIMIT_REQUESTS = 5   # Máximo de requisições por janela de tempo (SEM captcha)
RATE_LIMIT_WINDOW = 60    # Janela de tempo em segundos
CAPTCHA_REQUIRED_AFTER = 6  # Captcha necessário a partir da 6ª requisição (permite mais com captcha)

# Global rate limiting
GLOBAL_RATE_LIMIT_REQUESTS = 1000  # Máximo de requisições globais por minuto (DEBUG - mudar para 1000)
GLOBAL_RATE_LIMIT_WINDOW = 60    # Janela de tempo em segundos (1 minuto)

# Armazenamento em memória para rate limiting (em produção, use Redis)
request_counts = defaultdict(list)  # session_id -> [timestamps]
global_request_timestamps = []  # Lista global de timestamps de todas as requisições
captcha_tokens = {}  # token -> {session_id, expires_at, solved}
captcha_solutions = {}  # token -> solution

def cleanup_expired_data():
    """Remove expired rate limiting and captcha data"""
    current_time = time.time()
    
    # Limpar contadores de requisições expirados
    for session_id in list(request_counts.keys()):
        request_counts[session_id] = [req_time for req_time in request_counts[session_id] 
                                     if current_time - req_time < RATE_LIMIT_WINDOW]
        if not request_counts[session_id]:
            del request_counts[session_id]
    
    # Limpar timestamps globais expirados
    global global_request_timestamps
    global_request_timestamps = [req_time for req_time in global_request_timestamps 
                                if current_time - req_time < GLOBAL_RATE_LIMIT_WINDOW]
    
    # Limpar tokens de captcha expirados
    expired_tokens = [token for token, data in captcha_tokens.items() 
                     if current_time > data['expires_at']]
    for token in expired_tokens:
        del captcha_tokens[token]
        if token in captcha_solutions:
            del captcha_solutions[token]

def check_global_rate_limit() -> dict:
    """Checks if the global rate limit has been exceeded"""
    current_time = time.time()
    
    # Limpar dados expirados
    cleanup_expired_data()
    
    # Contar requisições globais na janela atual
    global_request_count = len(global_request_timestamps)
    
    # Calcular quando o rate limit global vai resetar
    reset_time = None
    seconds_until_reset = None
    
    if global_request_timestamps and global_request_count >= GLOBAL_RATE_LIMIT_REQUESTS:
        oldest_request = min(global_request_timestamps)
        reset_time = oldest_request + GLOBAL_RATE_LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
        print(f"🌍 Rate limit global atingido: {global_request_count}/{GLOBAL_RATE_LIMIT_REQUESTS}")
        print(f"🌍 Reset em: {seconds_until_reset} segundos")
    
    return {
        "within_limit": global_request_count < GLOBAL_RATE_LIMIT_REQUESTS,
        "current_count": global_request_count,
        "limit": GLOBAL_RATE_LIMIT_REQUESTS,
        "window_seconds": GLOBAL_RATE_LIMIT_WINDOW,
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }

def add_global_request():
    """Adds a new request to the global counter"""
    current_time = time.time()
    global_request_timestamps.append(current_time)
    print(f"🌍 Requisição global adicionada. Total: {len(global_request_timestamps)}/{GLOBAL_RATE_LIMIT_REQUESTS}")

def check_rate_limit(session_id: str) -> dict:
    """Checks if the session is within the rate limit"""
    current_time = time.time()
    
    # Limpar dados expirados
    cleanup_expired_data()
    
    # Se não há session_id, não aplicar rate limiting
    if not session_id:
        print("⚠️ Session ID não fornecido - sem rate limiting")
        return {
            "within_limit": True,
            "current_count": 0,
            "limit": RATE_LIMIT_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW,
            "requires_captcha": False,
            "reset_time": None,
            "seconds_until_reset": None
        }
    
    # Contar requisições atuais (sem adicionar nova ainda)
    current_requests = [req_time for req_time in request_counts[session_id] 
                       if current_time - req_time < RATE_LIMIT_WINDOW]
    
    request_count = len(current_requests)
    
    # Calcular quando o rate limit vai resetar (baseado na requisição mais antiga)
    reset_time = None
    seconds_until_reset = None
    
    # Calcular reset apenas se atingiu o limite básico (5) sem captcha
    if current_requests and request_count >= RATE_LIMIT_REQUESTS:
        oldest_request = min(current_requests)
        reset_time = oldest_request + RATE_LIMIT_WINDOW
        seconds_until_reset = max(0, int(reset_time - current_time))
        print(f"🕐 Calculando timer para sessão {session_id}: oldest_request={oldest_request}, current_time={current_time}")
        print(f"🕐 Reset em: {seconds_until_reset} segundos")
    
    return {
        "within_limit": request_count < RATE_LIMIT_REQUESTS,
        "current_count": request_count,
        "limit": RATE_LIMIT_REQUESTS,  # 5 análises
        "window_seconds": RATE_LIMIT_WINDOW,  # 60 segundos
        "requires_captcha": request_count >= CAPTCHA_REQUIRED_AFTER - 1,  # Captcha a partir da 6ª (count >= 5)
        "reset_time": reset_time,
        "seconds_until_reset": seconds_until_reset
    }

def add_request_to_rate_limit(session_id: str):
    """Adds a new request to the counter"""
    if not session_id:
        print("⚠️ Session ID não fornecido - não adicionando ao rate limit")
        return
    
    current_time = time.time()
    request_counts[session_id].append(current_time)
    print(f"📊 Requisição adicionada para sessão {session_id}. Total: {len(request_counts[session_id])}")

def reset_rate_limit(session_id: str):
    """Resets the rate limit counter for a session"""
    if session_id and session_id in request_counts:
        del request_counts[session_id]
        print(f"🔄 Rate limit resetado para sessão: {session_id}")
    elif not session_id:
        print("⚠️ Session ID não fornecido para reset do rate limit")

def generate_captcha() -> dict:
    """Generates a new simple mathematical captcha challenge"""
    a = secrets.randbelow(10) + 1
    b = secrets.randbelow(10) + 1
    operation = secrets.choice(['+', '-', '*'])
    
    if operation == '+':
        solution = a + b
        question = f"What is {a} + {b}?"
    elif operation == '-':
        # Ensure positive result
        if a < b:
            a, b = b, a
        solution = a - b
        question = f"What is {a} - {b}?"
    else:  # *
        solution = a * b
        question = f"What is {a} × {b}?"
    
    token = secrets.token_urlsafe(16)
    
    return {
        "token": token,
        "question": question,
        "solution": solution
    }

def verify_captcha(token: str, user_answer: str) -> bool:
    """Verifies if the captcha answer is correct"""
    if token not in captcha_solutions:
        return False
    
    try:
        user_answer_int = int(user_answer.strip())
        correct_answer = captcha_solutions[token]
        return user_answer_int == correct_answer
    except (ValueError, TypeError):
        return False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def get_client_ip(request: Request, call_next):
    client_ip = request.client.host if request.client else None
    
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    request.state.client_ip = client_ip
    
    response = await call_next(request)
    return response

def get_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados")
    
    return create_client(supabase_url, supabase_key)

async def get_ip_location(ip_address: str) -> dict:
    if not ip_address:
        return {}
    
    try:
        url = f"https://ipapi.co/{ip_address}/json/"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return {
                        "country": data.get("country_name"),
                        "city": data.get("city"),
                        "region": data.get("region"),
                        "timezone": data.get("timezone")
                    }
                else:
                    print(f"⚠️ Erro ao buscar localização do IP {ip_address}: {response.status}")
                    return {}
                    
    except Exception as error:
        print(f"❌ Erro ao capturar geolocalização do IP {ip_address}: {error}")
        return {}

async def get_or_create_session(supabase: Client, user_id: str = None, ip_address: str = None, user_agent: str = None, country: str = None, city: str = None, region: str = None) -> str:
    """
    Cria ou obtém uma sessão existente baseada no IP e user agent
    Retorna o ID da sessão
    """
    try:
        if not ip_address:
            print("⚠️ IP não fornecido, não é possível criar/obter sessão")
            return None
        
        # Criar string de localização
        location_parts = []
        if country:
            location_parts.append(country)
        if region:
            location_parts.append(region)
        if city:
            location_parts.append(city)
        location = ", ".join(location_parts) if location_parts else None
        
        # Tentar encontrar sessão existente (últimas 24 horas)
        from datetime import datetime, timedelta
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
        # Se user_id é fornecido, procurar sessão do usuário específico
        # Se não, procurar sessão anônima (user_id = null) para o IP
        if user_id:
            print(f"🔍 Procurando sessão existente para usuário: {user_id}")
            existing_session = supabase.table('sessions').select('id').eq('user_id', user_id).gte('created_at', yesterday.isoformat()).limit(1).execute()
        else:
            print(f"🔍 Procurando sessão anônima existente para IP: {ip_address}")
            existing_session = supabase.table('sessions').select('id').eq('ip', ip_address).is_('user_id', 'null').gte('created_at', yesterday.isoformat()).limit(1).execute()
        
        if existing_session.data:
            session_id = existing_session.data[0]['id']
            print(f"✅ Sessão existente encontrada: {session_id}")
            return session_id
        
        # Criar nova sessão
        session_data = {
            "user_id": user_id,
            "ip": ip_address,
            "browser": user_agent,
            "location": location
        }
        
        print(f"🔍 Criando nova sessão com dados: {session_data}")
        new_session = supabase.table('sessions').insert(session_data).execute()
        
        if new_session.data:
            session_id = new_session.data[0]['id']
            print(f"✅ Nova sessão criada: {session_id} para {'usuário ' + user_id if user_id else 'anônimo'}")
            return session_id
        else:
            print("❌ Erro ao criar nova sessão")
            print(f"❌ Response: {new_session}")
            return None
            
    except Exception as error:
        print(f"❌ Erro ao gerenciar sessão: {error}")
        return None

signatures_cache = None
cache_timestamp = 0
CACHE_DURATION = 10 * 60 * 1000

# Mapeamento UUID -> Database ID para análises
# Em produção, isso deveria usar Redis ou similar para persistência
analysis_uuid_mapping = {}  # {uuid: db_id}
analysis_id_mapping = {}    # {db_id: uuid} para busca reversa

def generate_analysis_uuid(db_id: int) -> str:
    """Gera um UUID único para uma análise e cria o mapeamento"""
    analysis_uuid = str(uuid.uuid4())
    analysis_uuid_mapping[analysis_uuid] = db_id
    analysis_id_mapping[db_id] = analysis_uuid
    print(f"🔗 UUID gerado: {analysis_uuid} -> DB ID: {db_id}")
    return analysis_uuid

def get_db_id_from_uuid(analysis_uuid: str) -> int:
    """Retorna o ID do banco a partir do UUID público"""
    return analysis_uuid_mapping.get(analysis_uuid)  

async def load_signatures_from_db() -> list:
    global signatures_cache, cache_timestamp
    
    try:
        now = int(time.time() * 1000)
        if signatures_cache and (now - cache_timestamp) < CACHE_DURATION:
            print("Using cached signatures")
            return signatures_cache
        
        print("Loading signatures from Supabase database...")
        supabase = get_supabase_client()
        
        response = supabase.table('powershell_signatures') \
            .select('*') \
            .eq('is_active', True) \
            .order('basescore', desc=True) \
            .execute()
        
        if response.data:
            converted_signatures = []
            for sig in response.data:
                converted_signatures.append({
                    "name": sig.get("name", "Unknown"),
                    "patterns": sig.get("patterns", []) if isinstance(sig.get("patterns"), list) else [],
                    "severity": sig.get("severity", "unknown"),
                    "tactics": sig.get("tactics", []) if isinstance(sig.get("tactics"), list) else [],
                    "techniques": sig.get("techniques", []) if isinstance(sig.get("techniques"), list) else [],
                    "score": float(sig.get("basescore", 0)),
                    "description": sig.get("description", "No description available"),
                    "reference": sig.get("reference", []) if isinstance(sig.get("reference"), list) else [],
                    "max_match": int(sig.get("max_match", 1))  # Adicionando campo max_match
                })
            
            signatures_cache = converted_signatures
            cache_timestamp = now
            
            print(f"Loaded and cached {len(converted_signatures)} signatures from database")
            
            for sig in converted_signatures:
                print(f"Signature: {sig['name']}")
                print(f"  Patterns: {sig['patterns']}")
                print(f"  Max Match: {sig['max_match']}")
                print()
            
            return converted_signatures
        else:
            print("No signatures found in database")
            return []
            
    except Exception as error:
        print(f"Error loading signatures from database: {error}")
        return []

@app.get("/")
async def root():
    return JSONResponse({
        "message": "Fast api working",
        "status": "success"
    })

@app.get("/health")
async def health_check():
    return JSONResponse({
        "status": "healthy",
        "message": "Fast api working"
    })

@app.post("/clear-cache")
async def clear_cache():
    global signatures_cache, cache_timestamp
    
    signatures_cache = None
    cache_timestamp = 0
    
    return JSONResponse({
        "success": True,
        "message": "Cache cleared, next request will reload from database"
    })

@app.get("/global-rate-limit-status")
async def get_global_rate_limit_status():
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

@app.post("/generate-captcha")
async def generate_captcha_endpoint(request: Request):
    """Generates a new captcha challenge for the user"""
    try:
        body = await request.json()
        session_id = body.get("session_id")
        
        if not session_id:
            return JSONResponse(
                {"error": "Session ID is required"},
                status_code=400
            )
        
        # Gerar captcha
        captcha_data = generate_captcha()
        
        # Armazenar solução e token
        captcha_solutions[captcha_data["token"]] = captcha_data["solution"]
        captcha_tokens[captcha_data["token"]] = {
            "session_id": session_id,
            "expires_at": time.time() + 300,  # Expira em 5 minutos
            "solved": False
        }
        
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

@app.post("/verify-captcha")
async def verify_captcha_endpoint(request: Request):
    """Verifica a resposta do captcha"""
    try:
        body = await request.json()
        
        token = body.get("token")
        answer = body.get("answer")
        session_id = body.get("session_id")
        
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
            captcha_tokens[token]["solved"] = True
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

@app.post("/create-user-session")
async def create_user_session_endpoint(request: Request):
    """Cria uma nova sessão para usuário logado"""
    try:
        client_ip = getattr(request.state, 'client_ip', None)
        body = await request.json()
        
        user_id = body.get("user_id")
        ip_address = body.get("ip_address") or client_ip
        user_agent = body.get("user_agent") or request.headers.get("user-agent", "Unknown")
        country = body.get("country")
        city = body.get("city")
        region = body.get("region")
        
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

@app.get("/analysis/{analysis_id}")
async def get_analysis_by_id(analysis_id: str):
    """
    Busca uma análise específica por UUID público ou ID do banco (compatibilidade)
    Permite acesso público para análises compartilháveis
    """
    try:
        print(f"🔍 Buscando análise com ID: {analysis_id}")
        
        # Verificar se é um UUID (formato: 8-4-4-4-12 caracteres)
        import re
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        is_uuid = re.match(uuid_pattern, analysis_id, re.IGNORECASE)
        
        db_id = None
        
        if is_uuid:
            # Tentar converter UUID para ID do banco
            db_id = get_db_id_from_uuid(analysis_id)
            if not db_id:
                print(f"❌ UUID não encontrado no mapeamento: {analysis_id}")
                return JSONResponse(
                    {"error": "Analysis not found"},
                    status_code=404
                )
            print(f"🔗 UUID {analysis_id} mapeado para DB ID: {db_id}")
        else:
            # Assumir que é um ID do banco (compatibilidade com análises antigas)
            try:
                db_id = int(analysis_id)
                print(f"🔄 Usando ID do banco diretamente: {db_id} (compatibilidade)")
            except ValueError:
                print(f"❌ ID inválido: {analysis_id}")
                return JSONResponse(
                    {"error": "Invalid analysis ID"},
                    status_code=400
                )
        
        supabase = get_supabase_client()
        
        # Buscar análise sem restrição de usuário para permitir compartilhamento
        response = supabase.table('powershell_analyses').select('*').eq('id', db_id).single().execute()
        
        if not response.data:
            return JSONResponse(
                {"error": "Analysis not found"},
                status_code=404
            )
        
        analysis_data = response.data
        print(f"✅ Análise encontrada: {analysis_data.get('id')}")
        
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

@app.post("/analyze-pcre2")
async def analyze_command_pcre2(request: Request):
    """
    Analyzes a PowerShell command using signatures from the Supabase database
    and saves the analysis in the powershell_analyses table (replacing the Edge Function)
    Uses standard Python regex module for matching
    """
    print("🚀 === FUNÇÃO ANALYZE-PCRE2 CHAMADA ===")
    
    try:
        # VERIFICAR RATE LIMIT GLOBAL PRIMEIRO
        global_rate_limit_info = check_global_rate_limit()
        print(f"🌍 Rate limit global: {global_rate_limit_info}")
        
        if not global_rate_limit_info["within_limit"]:
            print(f"🚫 Rate limit global excedido: {global_rate_limit_info['current_count']}/{global_rate_limit_info['limit']}")
            return JSONResponse(
                {
                    "error": "Search limit reached. Please try again in a moment",
                    "global_rate_limit_info": global_rate_limit_info,
                    "message": f"Global rate limit exceeded. {global_rate_limit_info['current_count']} requests in the last {global_rate_limit_info['window_seconds']} seconds. Please wait {global_rate_limit_info.get('seconds_until_reset', 0)} seconds."
                },
                status_code=429
            )
        
        client_ip = getattr(request.state, 'client_ip', None)
        print(f"🚀 IP real do cliente: {client_ip}")
        
        # Ler o body primeiro para ter acesso aos dados do captcha
        body = await request.json()
        print(f"🚀 Request body: {body}")
        
        command = body.get("command", "")
        user_id = body.get("user_id")  
        ip_address = body.get("ip_address") or client_ip  
        country = body.get("country")
        city = body.get("city")
        region = body.get("region")
        timezone = body.get("timezone")
        user_agent = body.get("user_agent") or request.headers.get("user-agent", "FastAPI-Client")
        search_type = body.get("search_type", "API")
        session_id = body.get("session_id")
        captcha_token = body.get("captcha_token")
        captcha_answer = body.get("captcha_answer")
        
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
            captcha_tokens[captcha_token]["solved"] = True
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
        
        detected_signatures = []
        total_score = 0
        tactics = set()
        techniques = set()
        
        for signature in signatures:
            print(f"\n🔍 Analisando signature: {signature['name']}")
            print(f"   Patterns disponíveis: {signature['patterns']}")
            print(f"   Max Match permitido: {signature['max_match']}")
            
            all_signature_matches = []
            
            # Primeiro, coletar TODOS os matches de TODOS os patterns
            for pattern in signature["patterns"]:
                try:
                    print(f"   Testing pattern: '{pattern}'")
                    print(f"   Command: '{command}'")
                    
                    # Use MULTILINE and DOTALL flags to handle multi-line commands properly
                    # MULTILINE: ^ and $ match start/end of each line, not just string
                    # DOTALL: . matches newline characters
                    regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                    pattern_matches = list(regex.finditer(command))
                    
                    if pattern_matches:
                        print(f"   ✅ MATCHES ENCONTRADOS: {len(pattern_matches)} matches para pattern '{pattern}'")
                        
                        for match in pattern_matches:
                            matched_text = match.group(0)
                            match_start = match.start()
                            match_end = match.end()
                            
                            print(f"      Pattern match: '{matched_text}' (posição {match_start}-{match_end})")
                            
                            # Adicionar à lista geral de matches
                            all_signature_matches.append({
                                "pattern": pattern,
                                "matched_text": matched_text,
                                "position": {
                                    "start": match_start,
                                    "end": match_end
                                }
                            })
                    else:
                        print(f"   ❌ No match for pattern: '{pattern}'")
                        
                except re.error as regex_error:  
                    print(f"   ❌ Erro no regex pattern '{pattern}': {regex_error}")
                    continue
            
            # Remover matches duplicados (mesma posição e texto)
            unique_matches = []
            seen_positions = set()
            
            for match_info in all_signature_matches:
                position_key = (match_info["position"]["start"], match_info["position"]["end"], match_info["matched_text"])
                if position_key not in seen_positions:
                    seen_positions.add(position_key)
                    unique_matches.append(match_info)
            
            print(f"   📊 Total matches coletados: {len(all_signature_matches)}")
            print(f"   📊 Matches únicos: {len(unique_matches)}")
            
            # Aplicar limite max_match
            matches_found = min(len(unique_matches), signature["max_match"])
            final_matches = unique_matches[:matches_found]
            
            print(f"   📊 Matches finais após max_match ({signature['max_match']}): {matches_found}")
            
            # Preparar lista final de matches
            signature_matches = []
            for i, match_info in enumerate(final_matches):
                print(f"      Final Match {i+1}: '{match_info['matched_text']}' (posição {match_info['position']['start']}-{match_info['position']['end']})")
                
                signature_matches.append({
                    "pattern": match_info["pattern"],
                    "matched_text": match_info["matched_text"],
                    "position": match_info["position"],
                    "match_number": i + 1
                })
            
            if len(unique_matches) > signature["max_match"]:
                print(f"      ⚠️ Limite de {signature['max_match']} matches atingido. {len(unique_matches) - signature['max_match']} matches únicos adicionais ignorados.")
            
            # Se encontrou matches para esta signature
            if matches_found > 0:
                # Calcular score total para esta signature (score base × quantidade de matches)
                signature_total_score = signature["score"] * matches_found
                
                print(f"   📊 Score calculado: {signature['score']} × {matches_found} = {signature_total_score}")
                
                # Determinar qual pattern deu match (usar o primeiro pattern que encontrou matches)
                matched_pattern = signature_matches[0]["pattern"] if signature_matches else "Unknown pattern"
                
                detected_signatures.append({
                    "name": signature["name"],
                    "description": signature["description"],
                    "severity": signature["severity"],
                    "base_score": signature["score"],
                    "matches_found": matches_found,
                    "total_score": signature_total_score,
                    "max_match_allowed": signature["max_match"],
                    "matches_details": signature_matches,
                    "pattern": matched_pattern,
                    "tactics": signature["tactics"],
                    "techniques": signature["techniques"],
                    "reference": signature.get("reference", [])
                })
                
                tactics.update(signature["tactics"])
                techniques.update(signature["techniques"])
                total_score += signature_total_score
        
        severity = "very_low"
        if total_score >= 8.1:
            severity = "critical"
        elif total_score >= 6.1:
            severity = "high"
        elif total_score >= 4.1:
            severity = "medium"
        elif total_score >= 2.1:
            severity = "low"
        
        is_malicious = total_score >= 5.0
        
        detected_signatures.sort(key=lambda x: x["total_score"], reverse=True)
        
        # Prepare data to save in the database
        analysis_data = {
            "command": command,
            "is_malicious": is_malicious,
            "risk_score": round(total_score, 1),
            "severity": severity,
            "signatures_detected": detected_signatures,
            "tactics": list(tactics),
            "techniques": list(techniques),
            "total_signatures_checked": len(signatures),
            "detected_count": len(detected_signatures),
            "ip_address": ip_address,
            "ip_country": country,
            "ip_city": city,
            "ip_region": region,
            "ip_timezone": timezone,
            "search_type": search_type,
            "user_agent": user_agent,
            "analysis_result": {
                "command": command,
                "is_malicious": is_malicious,
                "risk_score": round(total_score, 1),
                "severity": severity,
                "signatures_detected": detected_signatures,
                "tactics": list(tactics),
                "techniques": list(techniques),
                "total_signatures_checked": len(signatures),
                "detected_count": len(detected_signatures)
            }
        }
        
        try:
            print("🔍 Tentando conectar ao Supabase...")
            supabase = get_supabase_client()
            print("✅ Conectado ao Supabase com sucesso")
            
            # Gerenciar sessão se não foi fornecida
            if not session_id:
                print("🔍 Session ID não fornecido, criando/obtendo sessão...")
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
                    print(f"✅ Sessão gerenciada: {session_id}")
                else:
                    print("⚠️ Não foi possível gerenciar sessão")
            
            # Preparar dados para inserção no banco (mantendo compatibilidade)
            insert_data = {
                "command": command,
                "is_malicious": is_malicious,
                "risk_score": round(total_score, 1),
                "severity": severity,
                "signatures_detected": detected_signatures,
                "tactics": list(tactics),
                "techniques": list(techniques),
                "analysis_result": analysis_data["analysis_result"],
                "ip_address": ip_address,
                "ip_country": country,
                "ip_city": city,
                "ip_region": region,
                "ip_timezone": timezone,
                "search_type": search_type,
                "user_agent": user_agent
            }
            
            print(f"🔍 DEBUG: user_id recebido: '{user_id}' (tipo: {type(user_id)})")
            print(f"🔍 DEBUG: user_id é None? {user_id is None}")
            print(f"🔍 DEBUG: user_id é string vazia? {user_id == ''}")
            
            if user_id:
                insert_data["user_id"] = user_id
                print(f"✅ Incluindo user_id: {user_id}")
            else:
                # Não incluir user_id para análises anônimas - deixar como NULL no banco
                print(f"⚠️ user_id não fornecido - análise anônima (user_id será NULL)")
            
            # Incluir session_id se disponível
            if session_id:
                insert_data["session_id"] = session_id
                print(f"✅ Incluindo session_id: {session_id}")
            else:
                print("⚠️ session_id não disponível")
            
            print("🔍 Dados para inserção:")
            print(f"   - Command: {insert_data['command']}")
            print(f"   - Risk Score: {insert_data['risk_score']}")
            print(f"   - Severity: {insert_data['severity']}")
            print(f"   - Signatures: {len(insert_data['signatures_detected'])}")
            print(f"   - IP: {insert_data['ip_address']}")
            
            print("🔍 Executando INSERT no banco...")
            db_response = supabase.table('powershell_analyses').insert(insert_data).execute()
            
            if db_response.data:
                print(f"✅ Análise salva no banco com ID: {db_response.data[0].get('id')}")
                print(f"✅ Response completa: {db_response.data}")
            else:
                print("⚠️ Análise não foi salva no banco")
                print(f"⚠️ Response: {db_response}")
                
        except Exception as db_error:
            print(f"❌ Erro ao salvar no banco: {db_error}")
            print(f"❌ Tipo do erro: {type(db_error)}")
            print(f"❌ Detalhes do erro: {str(db_error)}")
            db_response = None
        
        # Capturar o ID da análise salva e gerar UUID público
        analysis_uuid = None
        if db_response and db_response.data:
            db_id = db_response.data[0].get('id')
            if db_id:
                analysis_uuid = generate_analysis_uuid(db_id)
        
        return JSONResponse({
            "success": True,
            "analysis": {
                "command": command,
                "is_malicious": is_malicious,
                "risk_score": round(total_score, 1),
                "severity": severity,
                "signatures_detected": detected_signatures,
                "tactics": list(tactics),
                "techniques": list(techniques),
                "total_signatures_checked": len(signatures),
                "detected_count": len(detected_signatures),
                "cache_info": {
                    "cached": signatures_cache is not None,
                    "cache_age_minutes": round((int(time.time() * 1000) - cache_timestamp) / 60000, 1) if cache_timestamp > 0 else 0
                }
            },
            "analysis_id": analysis_uuid,
            "session_id": session_id
        })
        
    except Exception as error:
        print(f"Erro na análise: {error}")
        return JSONResponse(
            {"error": f"Internal error: {str(error)}"},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
