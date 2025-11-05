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


try:
    import pyminusone
    PYMINUSONE_AVAILABLE = True
    print("✅ pyminusone loaded successfully")
except ImportError:
    try:
        from services.deobfuscator import deobfuscate_powershell as pyminusone_deobfuscate
        pyminusone = type('obj', (object,), {'deobfuscate_powershell': pyminusone_deobfuscate})()
        PYMINUSONE_AVAILABLE = True
        print("⚠️ Using fallback deobfuscator")
    except ImportError:
        PYMINUSONE_AVAILABLE = False
        print("⚠️ pyminusone not available - deobfuscation will be skipped")


signatures_cache = None
cache_timestamp = 0


def generate_short_id(length: int = 8) -> str:
   
    characters = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


async def load_signatures_from_db(user_id: str = None) -> list:
    
    global signatures_cache, cache_timestamp
    
    try:
        now = int(time.time() * 1000)
        
       
        is_premium_user = False
        if user_id:
            supabase = get_supabase_client()
            profile_response = supabase.table('profiles').select('is_premium_user').eq('id', user_id).single().execute()
            if profile_response.data:
                is_premium_user = profile_response.data.get('is_premium_user', False)
        
       
        cache_key = f"signatures_{'premium' if is_premium_user else 'free'}"
        
        if signatures_cache and cache_timestamp and cache_key in signatures_cache and (now - cache_timestamp) < CACHE_DURATION:
            return signatures_cache[cache_key]
        
        supabase = get_supabase_client()
        
        
        query = supabase.table('powershell_signatures').select('*').eq('is_active', True)
        
        if not is_premium_user:
            
            query = query.eq('is_premium_indicator', False)
        
        response = query.order('basescore', desc=True).execute()
        
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
                    "link": sig.get("link") if sig.get("link") else None,
                    "is_premium_indicator": sig.get("is_premium_indicator", False)
                })
            
            
            if not signatures_cache:
                signatures_cache = {}
            
            signatures_cache[cache_key] = converted_signatures
            cache_timestamp = now
            
            return converted_signatures
        else:
            print("No signatures found in database")
            return []
            
    except Exception as error:
        print(f"Error loading signatures from database: {error}")
        return []


def fix_brace_spacing(s: str) -> str:
    """
      "{ 1 }"  -> "{1}"
      "{ 1, -10 }" -> "{1,-10}"
      "}{ " -> "}{"
    """
    # "{   ...   }" -> "{...}"
    s = re.sub(r'\{\s*([^}]*?)\s*\}', lambda m: "{" + re.sub(r'\s+', '', m.group(1)) + "}", s)

    # "}{ " -> "}{"
    s = s.replace('} {', '}{')

    return s


def normalize_powershell_command(command: str) -> str:
    """
    Normaliza caracteres especiais em comandos PowerShell.
    Substitui aspas "curly" e primes por aspas ASCII.
    """

    command = command.replace('\u2018', "'")  # left single quote
    command = command.replace('\u2019', "'")  # right single quote
  
    command = command.replace('\u201c', '"')  # left double quote
    command = command.replace('\u201d', '"')  # right double quote

    command = command.replace('′', "'")  # U+2032 Prime
    command = command.replace('″', '"')  # U+2033 Double prime

  
    invisible_chars = [
        '\u200b', '\u200c', '\u200d', '\ufeff', '\u2060'
    ]
    for ch in invisible_chars:
        command = command.replace(ch, '')

    return command


def clean_pyminusone_output(deobfuscated: str) -> str:
   
    #  { 1 } -> {1}
    cleaned = re.sub(r'\{\s+(\d+)\s+\}', r'{\1}', deobfuscated)
    cleaned = re.sub(r'"\s+-f\s+', '" -f ', cleaned)
    cleaned = re.sub(r'\(\s+\{', '({', cleaned)
    cleaned = re.sub(r'\}\s+\)', '})', cleaned)
    
    return cleaned


def deobfuscate_powershell(command: str) -> str:
    
    normalized_command = normalize_powershell_command(command)
    
    if normalized_command != command:
        print("✨ Command normalized (special characters fixed)")

   
    has_leading_ampersand = normalized_command.strip().startswith('&')
    command_to_process = normalized_command.strip()
    
    if has_leading_ampersand:
        print("🔧 Detected leading & operator - removing temporarily")
        command_to_process = command_to_process[1:].strip()
        print(f"   Without &: {command_to_process[:80]}...")

    if PYMINUSONE_AVAILABLE:
        try:
            print("🔍 Attempting pyminusone deobfuscation...")
            deobf = pyminusone.deobfuscate_powershell(command_to_process)

            if deobf and deobf != command_to_process:
               
                cleaned = fix_brace_spacing(deobf)

               
                if cleaned != command_to_process and '{ ' not in cleaned and ' }' not in cleaned:
                    print("✅ pyminusone deobfuscation successful (post-cleaned)!")
                    print(f"   Cleaned: {cleaned[:100]}...")
                    
                
                    max_iterations = 3
                    current = cleaned
                    
                    for iteration in range(max_iterations):
                        if '"-f' not in current and '" -f' not in current:
                            break
                        
                        print(f"🔄 Iteration {iteration + 1}: Detected remaining format strings")
                        try:
                            recursive_result = pyminusone.deobfuscate_powershell(current)
                            recursive_cleaned = fix_brace_spacing(recursive_result)
                            
                            
                            if len(recursive_cleaned) < len(current) and recursive_cleaned != current:
                                print(f"✅ Iteration {iteration + 1}: Improved! {len(current)} -> {len(recursive_cleaned)} chars")
                                current = recursive_cleaned
                            else:
                                print(f"⚠️ Iteration {iteration + 1}: No improvement, stopping")
                                break
                        except Exception as e:
                            print(f"⚠️ Iteration {iteration + 1} failed: {e}")
                            break
                    
                    
                    final_result = current
                    if has_leading_ampersand:
                        
                        if not final_result.strip().startswith('&'):
                            final_result = f"& {final_result}"
                            print("🔧 Re-added leading & operator")
                    
                    print(f"   Final result: {final_result[:100]}...")
                    return final_result
                else:
                    print("⚠️ pyminusone result still looks malformed after cleaning")
        except Exception as e:
            print(f"❌ pyminusone error: {e}")

 
    try:
        print("🔧 Attempting manual deobfuscation fallback...")
        from services.deobfuscator import manual_deobfuscate_format_strings
        manual_result = manual_deobfuscate_format_strings(command_to_process)

        if manual_result and manual_result != command_to_process:
            cleaned_manual = fix_brace_spacing(manual_result)
            
           
            if has_leading_ampersand and not cleaned_manual.strip().startswith('&'):
                cleaned_manual = f"& {cleaned_manual}"
            
            print("✅ Manual deobfuscation successful!")
            print(f"   Deobfuscated: {cleaned_manual[:100]}...")
            return cleaned_manual
    except Exception as e:
        print(f"❌ Manual deobfuscation error: {e}")

    print("ℹ️ No deobfuscation applied - returning normalized command")
    return normalized_command


def analyze_command_patterns(command: str, signatures: list) -> dict:
    """Analisa um comando PowerShell contra as assinaturas"""
    detected_signatures = []
    total_score = 0
    tactics = set()
    techniques = set()
    
    # ✅ CRITICAL: Sempre normalizar E deofuscar ANTES de analisar
    print(f"🔍 [ANALYZER] Original command: {command[:100]}...")
    
    # Passo 1: Normalizar caracteres especiais
    normalized_command = normalize_powershell_command(command)
    if normalized_command != command:
        print(f"✨ [ANALYZER] Command normalized")
    
    # Passo 2: SEMPRE tentar deofuscar (não importa a origem)
    decoded_command = deobfuscate_powershell(normalized_command)
    has_deobfuscation = decoded_command != normalized_command
    
    if has_deobfuscation:
        print(f"✅ [ANALYZER] Deobfuscation successful!")
        print(f"   Original:      {normalized_command[:80]}...")
        print(f"   Deobfuscated:  {decoded_command[:80]}...")
    else:
        print(f"ℹ️ [ANALYZER] No deobfuscation applied (command unchanged)")
    
    # Passo 3: Analisar AMBAS as versões
    commands_to_analyze = [normalized_command]
    if has_deobfuscation:
        commands_to_analyze.append(decoded_command)
        print(f"📊 [ANALYZER] Analyzing BOTH original and deobfuscated versions")
    else:
        print(f"📊 [ANALYZER] Analyzing ONLY normalized version")
    
    for signature in signatures:
        all_signature_matches = []
        matched_pattern = None
        matched_in_decoded = False
        

        for cmd_to_test in commands_to_analyze:
            is_decoded_version = (cmd_to_test == decoded_command and has_deobfuscation)
            
            for pattern in signature["patterns"]:
                try:
                    regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                    pattern_matches = list(regex.finditer(cmd_to_test))
                    
                    if pattern_matches:
                        if matched_pattern is None:
                            matched_pattern = pattern
                        
                        if is_decoded_version:
                            matched_in_decoded = True
                        
                        for match in pattern_matches:
                            matched_text = match.group(0)
                            match_start = match.start()
                            match_end = match.end()
                            
                            all_signature_matches.append({
                                "matched_text": matched_text,
                                "position": {
                                    "start": match_start,
                                    "end": match_end
                                },
                                "matched_in": "deobfuscated" if is_decoded_version else "original"
                            })
                            
                except re.error:
                    continue

        unique_matches = []
        seen_positions = set()
        
        for match_info in all_signature_matches:
            position_key = (
                match_info["position"]["start"],
                match_info["position"]["end"],
                match_info["matched_text"],
                match_info["matched_in"]
            )
            if position_key not in seen_positions:
                seen_positions.add(position_key)
                unique_matches.append(match_info)
        
        matches_found = min(len(unique_matches), signature["max_match"])
        final_matches = unique_matches[:matches_found]
        
        if matches_found > 0:
            signature_total_score = signature["score"] * matches_found
            
            detected_signature = {
                "name": signature["name"],
                "description": signature["description"],
                "severity": signature["severity"],
                "base_score": signature["score"],
                "matches_found": matches_found,
                "total_score": signature_total_score,
                "max_match_allowed": signature["max_match"],
                "pattern": matched_pattern or signature["patterns"][0] if signature["patterns"] else "Unknown pattern",
                "matches_details": [
                    {
                        "matched_text": match_info["matched_text"],
                        "position": match_info["position"],
                        "match_number": i + 1,
                        "matched_in": match_info["matched_in"]
                    }
                    for i, match_info in enumerate(final_matches)
                ],
                "tactics": signature["tactics"],
                "techniques": signature["techniques"],
                "reference": signature.get("reference", []),
                "link": signature.get("link"),
                "is_premium_indicator": signature.get("is_premium_indicator", False),
                "found_in_deobfuscated": matched_in_decoded
            }
            
            detected_signatures.append(detected_signature)
            
            tactics.update(signature["tactics"])
            techniques.update(signature["techniques"])
            total_score += signature_total_score
    
    return {
        "detected_signatures": detected_signatures,
        "total_score": total_score,
        "tactics": list(tactics),
        "techniques": list(techniques),
        "decoded_command": decoded_command if has_deobfuscation else None
    }


def calculate_severity_and_risk(total_score: float) -> str:
    """Calcula severidade baseado no score total"""
    severity = "very_low"
    if total_score >= 8.1:
        severity = "critical"
    elif total_score >= 6.1:
        severity = "high"
    elif total_score >= 4.1:
        severity = "medium"
    elif total_score >= 2.1:
        severity = "low"
    return severity


async def save_analysis_to_db(
    command: str,
    analysis_result: dict,
    user_id: str = None,
    session_id: str = None,
    ip_address: str = None,
    country: str = None,
    search_type: str = "API",
    user_agent: str = "FastAPI-Client",
    is_cache: bool = False
) -> dict:
   
    try:
        supabase = get_supabase_client()
        short_id = generate_short_id()
        
   
        ip_country = country if country and country != 'Unknown' else None
 
        insert_data = {
            "command": command,
            "decoded_command": analysis_result.get("decoded_command"),
            "risk_score": round(analysis_result["total_score"], 1),
            "severity": analysis_result["severity"],
            "signatures_detected": analysis_result["detected_signatures"],
            "tactics": analysis_result["tactics"],
            "techniques": analysis_result["techniques"],
            "cmdlets_detected": analysis_result.get("cmdlets_detected", []),
            "ip_address": ip_address,
            "ip_country": ip_country,
            "search_type": search_type,
            "user_agent": user_agent,
            "short_id": short_id,
            "is_cache": is_cache
        }
        

        if user_id:
            insert_data["user_id"] = user_id
        if session_id:
            insert_data["session_id"] = session_id
        
        
        insert_data = {k: v for k, v in insert_data.items() if v is not None}
        
        db_response = supabase.table('powershell_analyses').insert(insert_data).execute()
        if db_response.data:
            return {
                "success": True,
                "db_id": db_response.data[0].get('id'),
                "uuid": db_response.data[0].get('uuid'),
                "short_id": short_id,
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

