"""
Módulo de análise de comandos PowerShell
"""
import re
import time
import json
import secrets
import string
import base64
from services.session_manager import get_supabase_client
from config.settings import CACHE_DURATION

from services.detectors.encoded_command_detector import detect_encoded_command
from services.detectors.double_encoded_detector import detect_double_encoded_command
from services.detectors.obfuscation_detector import detect_obfuscation


# ✅ FIX: Regex corrigida - estava faltando fechar parênteses
ENCODED_COMMAND_PATTERN = r'[\u002D\u2013\u2014\u2015](?:ec|e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)?)\s+["\']?\s*([a-z0-9+/]{20,}={0,2})'

try:
    import ppdeep
    PPDEEP_AVAILABLE = True
except ImportError:
    PPDEEP_AVAILABLE = False
    print("[WARNING] ppdeep not available - fuzzy hashing will be skipped")


try:
    import pyminusone
    PYMINUSONE_AVAILABLE = True
except ImportError:
    try:
        from services.deobfuscator import deobfuscate_powershell as pyminusone_deobfuscate
        pyminusone = type('obj', (object,), {'deobfuscate_powershell': pyminusone_deobfuscate})()
        PYMINUSONE_AVAILABLE = True
        print("[WARNING] Using fallback deobfuscator")
    except ImportError:
        PYMINUSONE_AVAILABLE = False
        print("[WARNING] pyminusone not available - deobfuscation will be skipped")


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
        print(f"Error loading signatures from database!: {error}")
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


def clean_pyminusone_output(deobfuscated: str) -> str:
   
    #  { 1 } -> {1}
    cleaned = re.sub(r'\{\s+(\d+)\s+\}', r'{\1}', deobfuscated)
    cleaned = re.sub(r'"\s+-f\s+', '" -f ', cleaned)
    cleaned = re.sub(r'\(\s+\{', '({', cleaned)
    cleaned = re.sub(r'\}\s+\)', '})', cleaned)
    
    return cleaned


def decode_base64_utf16(encoded_str: str) -> str:
    """
    Decodifica Base64 UTF-16LE (padrão PowerShell)
    SEMPRE usa UTF-16LE, NUNCA UTF-8
    ✅ SEM VALIDAÇÃO - Apenas decodifica e retorna
    """
    try:
        # Remove espaços/quebras
        encoded_str = encoded_str.replace(' ', '').replace('\n', '').replace('\r', '')
        
        if not encoded_str:
            return ""
        
        # ✅ SIMPLES: Decodifica Base64 e depois UTF-16LE
        # Aceita padding incorreto e caracteres inválidos
        decoded_bytes = base64.b64decode(encoded_str + '===', validate=False)[:len(encoded_str)*3//4]
        
        # Decodifica como UTF-16LE ignorando erros
        decoded_text = decoded_bytes.decode('utf-16-le', errors='ignore')
        
        return decoded_text
        
    except Exception:
        # Se falhar tudo, tenta sem padding
        try:
            decoded_bytes = base64.b64decode(encoded_str, validate=False)
            return decoded_bytes.decode('utf-16-le', errors='ignore')
        except Exception:
            return ""


def deobfuscate_powershell(command: str) -> tuple:
    """
    Deofusca comandos PowerShell usando regex robusta e pyminusone
    ✅ NÃO NORMALIZA - usa comando raw
    Detecta DOIS tipos diferentes:
    1. -EncodedCommand (Base64 UTF-16LE) → DECODING
    2. Format strings ("{1}{0}" -f 'x','y') → DEOBFUSCATION
    
    Retorna: (processed_command, iteration_count, obfuscation_type, all_layers)
    """
    # ❌ REMOVER .lstrip() - PRESERVAR ESPAÇOS
    # Apenas detectar & sem remover espaços
    has_leading_ampersand = command.startswith('&')
    
    # ✅ NÃO FAZER lstrip() - usar comando raw
    command_to_process = command

    max_decode_iterations = 5
    iteration = 0
    obfuscation_type = "none"
    all_decoded_layers = []
    successfully_decoded = False
    
    # ✅ DEBUG: Log comando raw
    print(f"🔍 [DEOBFUSCATE] Raw command length: {len(command)}")
    print(f"🔍 [DEOBFUSCATE] Raw command (first 100 chars): '{command[:100]}'")
    print(f"🔍 [DEOBFUSCATE] Starts with space: {command.startswith(' ')}")
    
    # ════════════════════════════════════════════════════════════════
    # 1️⃣ BASE64 DECODING (-EncodedCommand)
    # ════════════════════════════════════════════════════════════════
    while iteration < max_decode_iterations:
        encoded_match = re.search(
            ENCODED_COMMAND_PATTERN,
            command_to_process,
            re.IGNORECASE
        )
        
        if encoded_match:
            iteration += 1
            payload_b64 = encoded_match.group(1)
            
            print(f"\n[DEBUG] Iteration {iteration}: Found Base64 payload (length: {len(payload_b64)})")
            
            decoded_payload = decode_base64_utf16(payload_b64)
            
            print(f"[DEBUG] Decoded result: {decoded_payload[:100] if len(decoded_payload) > 0 else '(empty)'}...")
            
            is_valid_decode = (
                len(decoded_payload) > 0 and
                decoded_payload != payload_b64
            )
            
            if is_valid_decode:
                all_decoded_layers.append({
                    "iteration": iteration,
                    "decoded": decoded_payload
                })
                
                print(f"✅ [LAYER {iteration}] Saved: {decoded_payload[:80]}...")
                
                command_to_process = decoded_payload
                obfuscation_type = "base64_decoded"
                successfully_decoded = True
                
                has_more = re.search(
                    ENCODED_COMMAND_PATTERN,
                    decoded_payload,
                    re.IGNORECASE
                )
                
                if not has_more:
                    print(f"[DEBUG] No more nested -EncodedCommand found. Stopping at iteration {iteration}")
                    break
                else:
                    print(f"[DEBUG] Found nested -EncodedCommand! Continuing...")
            else:
                print(f"[DEBUG] Decode validation failed. Stopping.")
                iteration -= 1
                break
        else:
            if iteration > 0:
                print(f"[DEBUG] No -EncodedCommand pattern found. Stopping at iteration {iteration}")
                break
            break
    
    base64_iterations = iteration if successfully_decoded else 0

    # ════════════════════════════════════════════════════════════════
    # 2️⃣ FORMAT STRING DEOBFUSCATION
    # ════════════════════════════════════════════════════════════════
    if PYMINUSONE_AVAILABLE:
        try:
            deobf = pyminusone.deobfuscate_powershell(command_to_process)

            if deobf and deobf != command_to_process:
                cleaned = fix_brace_spacing(deobf)

                if cleaned != command_to_process and '{ ' not in cleaned and ' }' not in cleaned:
                    if obfuscation_type != "base64_decoded":
                        obfuscation_type = "format_deobfuscated"
                    
                    max_iterations = 3
                    current = cleaned
                    
                    for fmt_iteration in range(max_iterations):
                        if '"-f' not in current and '" -f' not in current:
                            break
                        
                        try:
                            recursive_result = pyminusone.deobfuscate_powershell(current)
                            recursive_cleaned = fix_brace_spacing(recursive_result)
                            
                            if len(recursive_cleaned) < len(current) and recursive_cleaned != current:
                                current = recursive_cleaned
                            else:
                                break
                        except Exception as e:
                            break
                    
                    final_result = current
                    
                    # ❌ REMOVER manipulação de &
                    return final_result, base64_iterations, obfuscation_type, all_decoded_layers
        except Exception as e:
            pass

    try:
        from services.deobfuscator import manual_deobfuscate_format_strings
        manual_result = manual_deobfuscate_format_strings(command_to_process)

        if manual_result and manual_result != command_to_process:
            if obfuscation_type != "base64_decoded":
                obfuscation_type = "format_deobfuscated"
            
            cleaned_manual = fix_brace_spacing(manual_result)
            
            # ❌ REMOVER manipulação de &
            return cleaned_manual, base64_iterations, obfuscation_type, all_decoded_layers
    except Exception as e:
        pass

    if base64_iterations > 0:
        return command_to_process, base64_iterations, obfuscation_type, all_decoded_layers
    
    # ✅ Retornar comando raw sem qualquer modificação
    return command, 0, "none", []


def analyze_command_patterns(command: str, signatures: list) -> dict:
    detected_signatures = []
    total_score = 0
    tactics = set()
    techniques = set()
    
    # ✅ NÃO NORMALIZAR - usar comando raw
    original_command = command
    
    # ✅ Deobfuscação usa comando raw diretamente
    deobfuscated_command, decode_iterations, obfuscation_type, all_decoded_layers = deobfuscate_powershell(command)
    has_deobfuscation = deobfuscated_command != command
    
    # ✅ EXTRAIR PRIMEIRO E SEGUNDO LAYER
    first_decoded_layer = None
    second_decoded_layer = None
    
    if all_decoded_layers:
        if len(all_decoded_layers) >= 1:
            first_decoded_layer = all_decoded_layers[0]["decoded"]
        if len(all_decoded_layers) >= 2:
            second_decoded_layer = all_decoded_layers[1]["decoded"]
    
    print(f"🔍 [LAYER EXTRACTION]")
    print(f"   Total layers: {len(all_decoded_layers)}")
    print(f"   First layer: {first_decoded_layer[:80] if first_decoded_layer else 'None'}...")
    print(f"   Second layer: {second_decoded_layer[:80] if second_decoded_layer else 'None'}...")
    
    # ════════════════════════════════════════════════════════════════
    # 📋 LOGS: Distinguir DECODING vs DEOBFUSCATION
    # ════════════════════════════════════════════════════════════════
    if has_deobfuscation:
        if obfuscation_type == "base64_decoded":
            if decode_iterations == 1:
                print(f"\n[BASE64 DECODED] Single layer -EncodedCommand detected")
                print(f"   Original: {original_command[:100]}...")
                print(f"   Decoded:  {deobfuscated_command[:100]}...")
            elif decode_iterations >= 2:
                print(f"\n[MULTI-LAYER DECODED] Nested -EncodedCommand detected ({decode_iterations} layers)")
                print(f"   Original: {original_command[:100]}...")
                print(f"   Final decoded:  {deobfuscated_command[:100]}...")
        
        elif obfuscation_type == "format_deobfuscated":
            print(f"\n[FORMAT STRING DEOBFUSCATED] Obfuscation resolved (1 layer)")
            print(f"   Original: {original_command[:100]}...")
            print(f"   Resolved: {deobfuscated_command[:100]}...")
    else:
        print(f"\n[ANALYZED] Command processed (no obfuscation/encoding detected)")
    
    # ⚡ OTIMIZAÇÃO: Detectar obfuscação apenas se houver deobfuscação
    is_obfuscated = False
    if has_deobfuscation and obfuscation_type == "format_deobfuscated":
        is_obfuscated = detect_obfuscation(command, deobfuscated_command)
    
    if is_obfuscated:
        # ✅ FIX: Complete the next() statement properly
        obfuscation_sig = next((sig for sig in signatures if sig.get("name") == "Obfuscation Detected"), None)
        
        if obfuscation_sig:
            obfuscation_detected = {
                "name": obfuscation_sig["name"],
                "description": obfuscation_sig["description"],
                "severity": obfuscation_sig["severity"],
                "base_score": obfuscation_sig["score"],
                "matches_found": 1,
                "total_score": obfuscation_sig["score"],
                "max_match_allowed": obfuscation_sig["max_match"],
                "pattern": "__OBFUSCATION_CHECK__",
                "matches_details": [
                    {
                        "matched_text": "Obfuscation detected",
                        "position": {"start": 0, "end": len(original_command)},
                        "match_number": 1,
                        "matched_in": "original"
                    }
                ],
                "tactics": obfuscation_sig.get("tactics", []),
                "techniques": obfuscation_sig.get("techniques", []),
                "reference": obfuscation_sig.get("reference", []),
                "link": obfuscation_sig.get("link"),
                "is_premium_indicator": obfuscation_sig.get("is_premium_indicator", False),
                "found_in_deobfuscated": False
            }
            
            detected_signatures.append(obfuscation_detected)
            tactics.update(obfuscation_sig.get("tactics", []))
            techniques.update(obfuscation_sig.get("techniques", []))
            total_score += obfuscation_sig["score"]

    # ⚡ OTIMIZAÇÃO: Se já foi decoded ou double_decoded, pule encoding detection
    encoding_detection = detect_encoded_command(original_command)
    
    # ✅ DEBUG: Log para verificar o que está acontecendo
    print(f"🔍 [ENCODING DETECTION DEBUG]")
    print(f"   Command: {original_command[:100]}...")
    print(f"   is_encoded: {encoding_detection['is_encoded']}")
    print(f"   type: {encoding_detection.get('type')}")
    print(f"   indicator: {encoding_detection.get('indicator')}")
    print(f"   confidence: {encoding_detection.get('confidence')}")
    print(f"   decoded_preview: {encoding_detection.get('decoded_preview', 'None')[:50] if encoding_detection.get('decoded_preview') else 'None'}...")
    
    if encoding_detection["is_encoded"]:
        encoded_sig = next((sig for sig in signatures if sig.get("name") == "Encoded Command Detected"), None)
        
        if encoded_sig:
            detected_signatures.append({
                "name": "Encoded Command Detected",
                "description": f"Command encoding detected: {encoding_detection['indicator']} (confidence: {encoding_detection['confidence']:.0%})",
                "severity": encoded_sig["severity"],
                "base_score": encoded_sig["score"],
                "matches_found": 1,
                "total_score": encoded_sig["score"],
                "max_match_allowed": 1,
                "pattern": encoding_detection["type"],
                "matches_details": [{
                    "matched_text": encoding_detection.get("decoded_preview", "Unable to decode"),
                    "position": {"start": 0, "end": len(original_command)},
                    "match_number": 1,
                    "matched_in": "original"
                }],
                "tactics": encoded_sig.get("tactics", ["Defense Evasion"]),
                "techniques": encoded_sig.get("techniques", ["T1027", "T1027.001", "T1140"]),
                "reference": encoded_sig.get("reference", []),
                "link": encoded_sig.get("link"),
                "is_premium_indicator": False,
                "found_in_deobfuscated": False
            })
            
            # ✅ FIX: Completar a linha que estava quebrada
            tactics.update(encoded_sig.get("tactics", ["Defense Evasion"]))
            techniques.update(encoded_sig.get("techniques", ["T1027", "T1027.001", "T1140"]))
            total_score += encoded_sig["score"]
            
            print(f"✅ [ENCODED COMMAND] Added signature with score {encoded_sig['score']}")

    # ════════════════════════════════════════════════════════════════
    # ✅ Double encoding detection ADICIONAL (não substitui o de cima)
    # ════════════════════════════════════════════════════════════════
    if decode_iterations >= 2:
        try:
            double_encoded_sig = next((sig for sig in signatures if sig.get("name") == "Double Encoded Command Detected"), None)
            
            if double_encoded_sig:
                detected_signatures.append({
                    "name": "Double Encoded Command Detected",
                    "description": f"Double/multiple encoding detected: Detected {decode_iterations} layers of -EncodedCommand nesting",
                    "severity": double_encoded_sig["severity"],
                    "base_score": double_encoded_sig["score"],
                    "matches_found": 1,
                    "total_score": double_encoded_sig["score"],
                    "max_match_allowed": 1,
                    "pattern": "Double Base64 Encoding",
                    "matches_details": [{
                        "matched_text": deobfuscated_command[:150],
                        "position": {"start": 0, "end": len(original_command)},
                        "match_number": 1,
                        "matched_in": "original"
                    }],
                    "tactics": double_encoded_sig.get("tactics", ["Defense Evasion"]),
                    "techniques": double_encoded_sig.get("techniques", ["T1027.001", "T1140"]),
                    "reference": double_encoded_sig.get("reference", []),
                    "link": double_encoded_sig.get("link"),
                    "is_premium_indicator": False,
                    "found_in_deobfuscated": False
                })
                
                tactics.update(double_encoded_sig.get("tactics", ["Defense Evasion"]))
                techniques.update(double_encoded_sig.get("techniques", ["T1027.001", "T1140"]))
                total_score += double_encoded_sig["score"]
                
                print(f"✅ [DOUBLE ENCODING] Added signature with score {double_encoded_sig['score']}")
        except Exception as e:
            print(f"❌ [ERROR] Failed to detect double encoding: {e}")

    # ════════════════════════════════════════════════════════════════
    # 4️⃣  PATTERN MATCHING (Regular signatures)
    # ✅ USAR COMANDO RAW SEM SANITIZAÇÃO
    # ════════════════════════════════════════════════════════════════
    commands_to_analyze = [original_command]
    if has_deobfuscation:
        commands_to_analyze.append(deobfuscated_command)
    
    for signature in signatures:
        # Skip special indicators already processed
        if signature.get("name") in ["Obfuscation Detected", "Encoded Command Detected", "Double Encoded Command Detected"]:
            continue
        
        all_signature_matches = []
        matched_pattern = None
        matched_in_decoded = False
        
        for cmd_to_test in commands_to_analyze:
            is_decoded_version = (cmd_to_test == deobfuscated_command and has_deobfuscation)
            
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
    
    # ✅ DEBUG: Print antes de retornar
    print(f"📊 [ANALYZE_COMMAND_PATTERNS DEBUG]")
    print(f"   has_deobfuscation: {has_deobfuscation}")
    print(f"   decode_iterations: {decode_iterations}")
    print(f"   deobfuscated_command: {deobfuscated_command[:80] if deobfuscated_command else 'None'}")
    print(f"   Result decoded_command will be: {deobfuscated_command if (has_deobfuscation and decode_iterations >= 1) else None}")
    print(f"   Result double_decoded_command will be: {deobfuscated_command if (has_deobfuscation and decode_iterations >= 2) else None}")
    
    return {
        "detected_signatures": detected_signatures,
        "total_score": total_score,
        "tactics": list(tactics),
        "techniques": list(techniques),
        "decoded_command": first_decoded_layer if (has_deobfuscation and decode_iterations >= 1) else None,
        "double_decoded_command": second_decoded_layer if (has_deobfuscation and decode_iterations >= 2) else None,
        "is_obfuscated": is_obfuscated,
        "obfuscation_type": obfuscation_type
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
    """Salva análise no banco de dados"""
    try:
        supabase = get_supabase_client()
        short_id = generate_short_id()
        
        ip_country = country if country and country != 'Unknown' else None
        
        # ✅ Log apenas se houver decoding
        deobfuscated_cmd = analysis_result.get("decoded_command")
        double_decoded_cmd = analysis_result.get("double_decoded_command")
        
        if deobfuscated_cmd and deobfuscated_cmd.strip():
            print(f"✅ [DB SAVE] decoded_command (deobfuscated): {deobfuscated_cmd[:80]}...")
        
        if double_decoded_cmd and double_decoded_cmd.strip():
            print(f"✅ [DB SAVE] double_decoded_command (Base64 decoded): {double_decoded_cmd[:80]}...")
        
        insert_data = {
            "command": command,
            "decoded_command": deobfuscated_cmd,
            "double_decoded_command": double_decoded_cmd,
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
        print(f"❌ Database error: {db_error}")
        return {"success": False, "error": str(db_error)}


def clear_signatures_cache():
    """Limpa o cache de assinaturas"""
    global signatures_cache, cache_timestamp
    signatures_cache = None
    cache_timestamp = 0

