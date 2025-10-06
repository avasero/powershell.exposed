"""
Módulo de análise de comandos PowerShell
"""
import re
import time
import json
import secrets
import string
from services.session_manager import get_supabase_client
from config.settings import CACHE_DURATION

# Cache de assinaturas
signatures_cache = None
cache_timestamp = 0


def generate_short_id(length: int = 8) -> str:
    """Gera um ID curto usando caracteres alfanuméricos"""
    characters = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


async def load_signatures_from_db() -> list:
    """Carrega assinaturas do banco de dados com cache"""
    global signatures_cache, cache_timestamp
    
    try:
        now = int(time.time() * 1000)
        
        if signatures_cache and (now - cache_timestamp) < CACHE_DURATION:
            return signatures_cache
        
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
                    "max_match": int(sig.get("max_match", 1)),
                    "link": sig.get("link") if sig.get("link") else None
                })
            
            signatures_cache = converted_signatures
            cache_timestamp = now
            
            print(f"✅ Carregadas {len(converted_signatures)} assinaturas do banco")
            return converted_signatures
        else:
            print("No signatures found in database")
            return []
            
    except Exception as error:
        print(f"Error loading signatures from database: {error}")
        return []


def analyze_command_patterns(command: str, signatures: list) -> dict:
    """Analisa um comando PowerShell contra as assinaturas"""
    detected_signatures = []
    total_score = 0
    tactics = set()
    techniques = set()
    
    for signature in signatures:
        all_signature_matches = []
        
        # Primeiro, coletar TODOS os matches de TODOS os patterns
        for pattern in signature["patterns"]:
            try:
                # Use MULTILINE and DOTALL flags to handle multi-line commands properly
                regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                pattern_matches = list(regex.finditer(command))
                
                if pattern_matches:
                    for match in pattern_matches:
                        matched_text = match.group(0)
                        match_start = match.start()
                        match_end = match.end()
                        
                        # Adicionar à lista geral de matches
                        all_signature_matches.append({
                            "pattern": pattern,
                            "matched_text": matched_text,
                            "position": {
                                "start": match_start,
                                "end": match_end
                            }
                        })
                        
            except re.error:  
                continue
        
        # Remover matches duplicados (mesma posição e texto)
        unique_matches = []
        seen_positions = set()
        
        for match_info in all_signature_matches:
            position_key = (match_info["position"]["start"], match_info["position"]["end"], match_info["matched_text"])
            if position_key not in seen_positions:
                seen_positions.add(position_key)
                unique_matches.append(match_info)
        
        # Aplicar limite max_match
        matches_found = min(len(unique_matches), signature["max_match"])
        final_matches = unique_matches[:matches_found]
        
        # Preparar lista final de matches
        signature_matches = []
        for i, match_info in enumerate(final_matches):
            signature_matches.append({
                "pattern": match_info["pattern"],
                "matched_text": match_info["matched_text"],
                "position": match_info["position"],
                "match_number": i + 1
            })
        
        # Se encontrou matches para esta signature
        if matches_found > 0:
            
            # Calcular score total para esta signature (score base × quantidade de matches)
            signature_total_score = signature["score"] * matches_found
            
            # Determinar qual pattern deu match (usar o primeiro pattern que encontrou matches)
            matched_pattern = signature_matches[0]["pattern"] if signature_matches else "Unknown pattern"
            
            detected_signature = {
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
                "reference": signature.get("reference", []),
                "link": signature.get("link")
            }
            
            detected_signatures.append(detected_signature)
            
            tactics.update(signature["tactics"])
            techniques.update(signature["techniques"])
            total_score += signature_total_score
    
    return {
        "detected_signatures": detected_signatures,
        "total_score": total_score,
        "tactics": list(tactics),
        "techniques": list(techniques)
    }


def calculate_severity_and_risk(total_score: float) -> tuple:
    """Calcula severidade e risco baseado no score total"""
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
    
    return severity, is_malicious


async def save_analysis_to_db(
    command: str,
    analysis_result: dict,
    user_id: str = None,
    session_id: str = None,
    ip_address: str = None,
    country: str = None,
    city: str = None,
    region: str = None,
    timezone: str = None,
    search_type: str = "API",
    user_agent: str = "FastAPI-Client",
    is_cache: bool = False
) -> dict:
    """Salva análise no banco de dados - otimizado para cache hits"""
    try:
        # ⚡ PERFORMANCE: Start timing for cache operations
        start_time = time.time()
        
        supabase = get_supabase_client()
        short_id = generate_short_id()
        
        # Preparar dados para inserção no banco
        insert_data = {
            "command": command,
            "is_malicious": analysis_result["is_malicious"],
            "risk_score": round(analysis_result["total_score"], 1),
            "severity": analysis_result["severity"],
            "signatures_detected": analysis_result["detected_signatures"],
            "tactics": analysis_result["tactics"],
            "techniques": analysis_result["techniques"],
            "analysis_result": analysis_result,
            "ip_address": ip_address,
            "ip_country": country,
            "ip_city": city,
            "ip_region": region,
            "ip_timezone": timezone,
            "search_type": search_type,
            "user_agent": user_agent,
            "short_id": short_id,
            "is_cache": is_cache
        }
        
        if user_id:
            insert_data["user_id"] = user_id
        
        if session_id:
            insert_data["session_id"] = session_id
        
        db_response = supabase.table('powershell_analyses').insert(insert_data).execute()
        
        # ⚡ PERFORMANCE: Log save time for cache operations
        save_time = (time.time() - start_time) * 1000
        cache_type = "CACHE HIT" if is_cache else "FRESH"
        print(f"💾 [DB] {cache_type} save completed in {save_time:.1f}ms - ID: {short_id}")
        
        if db_response.data:
            return {
                "success": True,
                "db_id": db_response.data[0].get('id'),
                "uuid": db_response.data[0].get('uuid'),
                "short_id": short_id
            }
        else:
            return {"success": False, "error": "Failed to save analysis"}
            
    except Exception as db_error:
        print(f"❌ Erro ao salvar no banco: {db_error}")
        return {"success": False, "error": str(db_error)}


def clear_signatures_cache():
    """Limpa o cache de assinaturas"""
    global signatures_cache, cache_timestamp
    signatures_cache = None
    cache_timestamp = 0
