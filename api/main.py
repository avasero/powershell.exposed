from fastapi import FastAPI
from fastapi.responses import JSONResponse
import re
import os
import json
import time
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env.local
load_dotenv('.env.local', override=True)

app = FastAPI(
    title="PowerShell.exposed API",
    description="API para análise de comandos PowerShell",
    version="1.0.0"
)

# Configuração do Supabase
def get_supabase_client() -> Client:
    """Cria e retorna cliente Supabase"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados")
    
    return create_client(supabase_url, supabase_key)

# Cache simples para signatures (renovado a cada 10 minutos)
signatures_cache = None
cache_timestamp = 0
CACHE_DURATION = 10 * 60 * 1000  # 10 minutos

async def load_signatures_from_db() -> list:
    """Carrega signatures do banco Supabase"""
    global signatures_cache, cache_timestamp
    
    try:
        # Verificar cache primeiro
        now = int(time.time() * 1000)
        if signatures_cache and (now - cache_timestamp) < CACHE_DURATION:
            print("Using cached signatures")
            return signatures_cache
        
        print("Loading signatures from Supabase database...")
        supabase = get_supabase_client()
        
        # Buscar signatures ativas ordenadas por score
        response = supabase.table('powershell_signatures') \
            .select('*') \
            .eq('is_active', True) \
            .order('basescore', desc=True) \
            .execute()
        
        if response.data:
            # Converter formato do banco para formato esperado
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
            
            # Armazenar no cache
            signatures_cache = converted_signatures
            cache_timestamp = now
            
            print(f"Loaded and cached {len(converted_signatures)} signatures from database")
            
            # Debug: mostrar patterns originais
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

@app.post("/analyze-pcre2")
async def analyze_command_pcre2(request: dict):
    """
    Analisa um comando PowerShell usando signatures do banco Supabase
    """
    try:
        command = request.get("command", "")
        
        if not command or not isinstance(command, str):
            return JSONResponse(
                {"error": "Command is required and must be a string"},
                status_code=400
            )
        
        # Carregar signatures do banco
        signatures = await load_signatures_from_db()
        
        if not signatures:
            return JSONResponse(
                {"error": "No signatures available for analysis"},
                status_code=500
            )
        
        # Análise usando as signatures do banco
        detected_signatures = []
        total_score = 0
        tactics = set()
        techniques = set()
        
        for signature in signatures:
            print(f"\n🔍 Analisando signature: {signature['name']}")
            print(f"   Patterns disponíveis: {signature['patterns']}")
            
            for pattern in signature["patterns"]:
                try:
                    # Debug: mostrar pattern sendo testado
                    print(f"   Testing pattern: '{pattern}'")
                    print(f"   Pattern type: {type(pattern)}")
                    print(f"   Pattern length: {len(pattern)}")
                    
                    # Usar regex com flags case-insensitive
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
                        
                        # Adicionar táticas e técnicas
                        tactics.update(signature["tactics"])
                        techniques.update(signature["techniques"])
                        total_score += signature["score"]
                        
                        # Uma detecção por assinatura para performance
                        break
                    else:
                        print(f"   ❌ No match for pattern: '{pattern}'")
                        
                except re.error as regex_error:
                    print(f"   ❌ Erro no regex pattern '{pattern}': {regex_error}")
                    continue
        
        # Determinar severidade baseada no score
        severity = "very_low"
        if total_score >= 8.1:
            severity = "critical"
        elif total_score >= 6.1:
            severity = "high"
        elif total_score >= 4.1:
            severity = "medium"
        elif total_score >= 2.1:
            severity = "low"
        
        # Determinar se é malicioso
        is_malicious = total_score >= 5.0
        
        # Ordenar signatures detectadas por score (maior primeiro)
        detected_signatures.sort(key=lambda x: x["score"], reverse=True)
        
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
