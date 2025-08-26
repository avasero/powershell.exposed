from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import re  
import os
import json
import time
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
RATE_LIMIT_REQUESTS = 5  # Máximo de requisições por janela de tempo
RATE_LIMIT_WINDOW = 60   # Janela de tempo em segundos
CAPTCHA_REQUIRED_AFTER = 6  # Captcha necessário após quantas requisições

# Armazenamento em memória para rate limiting (em produção, use Redis)
request_counts = defaultdict(list)
captcha_tokens = {}  # token -> {ip, expires_at, solved}
captcha_solutions = {}  # token -> solution

def cleanup_expired_data():
    """Remove dados expirados de rate limiting e captcha"""
    current_time = time.time()
    
    # Limpar contadores de requisições expirados
    for ip in list(request_counts.keys()):
        request_counts[ip] = [req_time for req_time in request_counts[ip] 
                             if current_time - req_time < RATE_LIMIT_WINDOW]
        if not request_counts[ip]:
            del request_counts[ip]
    
    # Limpar tokens de captcha expirados
    expired_tokens = [token for token, data in captcha_tokens.items() 
                     if current_time > data['expires_at']]
    for token in expired_tokens:
        del captcha_tokens[token]
        if token in captcha_solutions:
            del captcha_solutions[token]

def check_rate_limit(ip_address: str) -> dict:
    """Verifica se o IP está dentro do limite de taxa"""
    current_time = time.time()
    
    # Limpar dados expirados
    cleanup_expired_data()
    
    # Contar requisições atuais (sem adicionar nova ainda)
    current_requests = [req_time for req_time in request_counts[ip_address] 
                       if current_time - req_time < RATE_LIMIT_WINDOW]
    
    request_count = len(current_requests)
    
    return {
        "within_limit": request_count < RATE_LIMIT_REQUESTS,
        "current_count": request_count,
        "limit": RATE_LIMIT_REQUESTS,
        "window_seconds": RATE_LIMIT_WINDOW,
        "requires_captcha": request_count >= CAPTCHA_REQUIRED_AFTER - 1
    }

def add_request_to_rate_limit(ip_address: str):
    """Adiciona uma nova requisição ao contador"""
    current_time = time.time()
    request_counts[ip_address].append(current_time)

def generate_captcha() -> dict:
    """Gera um novo desafio de captcha matemático simples"""
    a = secrets.randbelow(10) + 1
    b = secrets.randbelow(10) + 1
    operation = secrets.choice(['+', '-', '*'])
    
    if operation == '+':
        solution = a + b
        question = f"{a} + {b} = ?"
    elif operation == '-':
        solution = a - b
        question = f"{a} - {b} = ?"
    else:  # *
        solution = a * b
        question = f"{a} × {b} = ?"
    
    token = secrets.token_urlsafe(16)
    
    return {
        "token": token,
        "question": question,
        "solution": solution
    }

def verify_captcha(token: str, user_answer: str) -> bool:
    """Verifica se a resposta do captcha está correta"""
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
        
        existing_session = supabase.table('sessions').select('id').eq('ip', ip_address).gte('created_at', yesterday.isoformat()).limit(1).execute()
        
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
        
        new_session = supabase.table('sessions').insert(session_data).execute()
        
        if new_session.data:
            session_id = new_session.data[0]['id']
            print(f"✅ Nova sessão criada: {session_id}")
            return session_id
        else:
            print("❌ Erro ao criar nova sessão")
            return None
            
    except Exception as error:
        print(f"❌ Erro ao gerenciar sessão: {error}")
        return None

signatures_cache = None
cache_timestamp = 0
CACHE_DURATION = 10 * 60 * 1000  

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

@app.post("/generate-captcha")
async def generate_captcha_endpoint(request: Request):
    """Gera um novo desafio de captcha para o usuário"""
    try:
        client_ip = getattr(request.state, 'client_ip', None)
        
        if not client_ip:
            return JSONResponse(
                {"error": "Não foi possível identificar o IP do cliente"},
                status_code=400
            )
        
        # Gerar captcha
        captcha_data = generate_captcha()
        
        # Armazenar solução e token
        captcha_solutions[captcha_data["token"]] = captcha_data["solution"]
        captcha_tokens[captcha_data["token"]] = {
            "ip": client_ip,
            "expires_at": time.time() + 300,  # Expira em 5 minutos
            "solved": False
        }
        
        return JSONResponse({
            "success": True,
            "captcha": {
                "token": captcha_data["token"],
                "question": captcha_data["question"]
            }
        })
        
    except Exception as error:
        print(f"Erro ao gerar captcha: {error}")
        return JSONResponse(
            {"error": f"Erro interno: {str(error)}"},
            status_code=500
        )

@app.post("/verify-captcha")
async def verify_captcha_endpoint(request: Request):
    """Verifica a resposta do captcha"""
    try:
        client_ip = getattr(request.state, 'client_ip', None)
        body = await request.json()
        
        token = body.get("token")
        answer = body.get("answer")
        
        if not token or not answer:
            return JSONResponse(
                {"error": "Token e resposta são obrigatórios"},
                status_code=400
            )
        
        # Verificar se o token existe e pertence ao IP
        if token not in captcha_tokens:
            return JSONResponse(
                {"error": "Token inválido ou expirado"},
                status_code=400
            )
        
        token_data = captcha_tokens[token]
        if token_data["ip"] != client_ip:
            return JSONResponse(
                {"error": "Token não pertence a este IP"},
                status_code=400
            )
        
        if time.time() > token_data["expires_at"]:
            return JSONResponse(
                {"error": "Token expirado"},
                status_code=400
            )
        
        # Verificar resposta
        is_correct = verify_captcha(token, answer)
        
        if is_correct:
            captcha_tokens[token]["solved"] = True
            return JSONResponse({
                "success": True,
                "message": "Captcha resolvido com sucesso"
            })
        else:
            return JSONResponse(
                {"error": "Resposta incorreta"},
                status_code=400
            )
            
    except Exception as error:
        print(f"Erro ao verificar captcha: {error}")
        return JSONResponse(
            {"error": f"Erro interno: {str(error)}"},
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
        client_ip = getattr(request.state, 'client_ip', None)
        print(f"🚀 IP real do cliente: {client_ip}")
        
        # Verificar rate limit primeiro
        if client_ip:
            rate_limit_info = check_rate_limit(client_ip)
            print(f"🔒 Rate limit info: {rate_limit_info}")
            
            if not rate_limit_info["within_limit"]:
                return JSONResponse(
                    {
                        "error": "Rate limit excedido",
                        "rate_limit_info": rate_limit_info,
                        "message": f"Você excedeu o limite de {RATE_LIMIT_REQUESTS} requisições por {RATE_LIMIT_WINDOW} segundos. Aguarde antes de fazer mais requisições."
                    },
                    status_code=429
                )
        
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
        
        # Verificar se captcha é necessário
        if client_ip and rate_limit_info["requires_captcha"]:
            if not captcha_token or not captcha_answer:
                return JSONResponse(
                    {
                        "error": "Captcha obrigatório",
                        "rate_limit_info": rate_limit_info,
                        "requires_captcha": True,
                        "message": "Você precisa resolver o captcha para continuar"
                    },
                    status_code=400
                )
            
            # Verificar captcha
            if captcha_token not in captcha_tokens:
                return JSONResponse(
                    {
                        "error": "Token de captcha inválido ou expirado",
                        "requires_captcha": True
                    },
                    status_code=400
                )
            
            token_data = captcha_tokens[captcha_token]
            if token_data["ip"] != client_ip:
                return JSONResponse(
                    {
                        "error": "Token de captcha não pertence a este IP",
                        "requires_captcha": True
                    },
                    status_code=400
                )
            
            if time.time() > token_data["expires_at"]:
                return JSONResponse(
                    {
                        "error": "Token de captcha expirado",
                        "requires_captcha": True
                    },
                    status_code=400
                )
            
            if not verify_captcha(captcha_token, captcha_answer):
                return JSONResponse(
                    {
                        "error": "Resposta do captcha incorreta",
                        "requires_captcha": True
                    },
                    status_code=400
                )
            
            # Marcar captcha como resolvido
            captcha_tokens[captcha_token]["solved"] = True
        
        # Adicionar requisição ao contador de rate limit
        if client_ip:
            add_request_to_rate_limit(client_ip)  
        
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
                    
                    regex = re.compile(pattern, re.IGNORECASE)
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
            response = supabase.table('powershell_analyses').insert(insert_data).execute()
            
            if response.data:
                print(f"✅ Análise salva no banco com ID: {response.data[0].get('id')}")
                print(f"✅ Response completa: {response.data}")
            else:
                print("⚠️ Análise não foi salva no banco")
                print(f"⚠️ Response: {response}")
                
        except Exception as db_error:
            print(f"❌ Erro ao salvar no banco: {db_error}")
            print(f"❌ Tipo do erro: {type(db_error)}")
            print(f"❌ Detalhes do erro: {str(db_error)}")
        
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
            "session_id": session_id
        })
        
    except Exception as error:
        print(f"Erro na análise: {error}")
        return JSONResponse(
            {"error": f"Erro interno: {str(error)}"},
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
