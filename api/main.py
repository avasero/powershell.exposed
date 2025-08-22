from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import re  
import os
import json
import time
import aiohttp 
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env.local', override=True)

app = FastAPI(
    title="PowerShell.exposed API",
    description="API para análise de comandos PowerShell",
    version="1.0.0"
)

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
                    "reference": sig.get("reference", []) if isinstance(sig.get("reference"), list) else []
                })
            
            signatures_cache = converted_signatures
            cache_timestamp = now
            
            print(f"Loaded and cached {len(converted_signatures)} signatures from database")
            
            for sig in converted_signatures:
                print(f"Signature: {sig['name']}")
                print(f"  Patterns: {sig['patterns']}")
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
            
            for pattern in signature["patterns"]:
                try:
                    print(f"   Testing pattern: '{pattern}'")
                    print(f"   Command: '{command}'")
                    
                    regex = re.compile(pattern, re.IGNORECASE)
                    match = regex.search(command)
                    
                    if match:
                        print(f"   ✅ MATCH FOUND: '{pattern}' matched '{match.group(0)}' in command")
                        
                        detected_signatures.append({
                            "name": signature["name"],
                            "pattern": pattern,
                            "matched_text": match.group(0),
                            "severity": signature["severity"],
                            "score": signature["score"],
                            "description": signature["description"],
                            "tactics": signature["tactics"],
                            "techniques": signature["techniques"],
                            "reference": signature.get("reference", [])
                        })
                        
                        tactics.update(signature["tactics"])
                        techniques.update(signature["techniques"])
                        total_score += signature["score"]
                        
                        break
                    else:
                        print(f"   ❌ No match for pattern: '{pattern}'")
                        
                except re.error as regex_error:  
                    print(f"   ❌ Erro no regex pattern '{pattern}': {regex_error}")
                    continue
        
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
        
        detected_signatures.sort(key=lambda x: x["score"], reverse=True)
        
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
                insert_data["user_id"] = "00000000-0000-0000-0000-000000000000"
                print(f"⚠️ user_id não fornecido - usando padrão: {insert_data['user_id']}")
            
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
            }
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
