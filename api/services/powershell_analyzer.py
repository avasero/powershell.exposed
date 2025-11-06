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

try:
    import ppdeep
    PPDEEP_AVAILABLE = True
    print("✅ ppdeep loaded successfully")
except ImportError:
    PPDEEP_AVAILABLE = False
    print("⚠️ ppdeep not available - fuzzy hashing will be skipped")


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


def normalize_powershell_command(command: str) -> str:
    """
    Normaliza caracteres especiais em comandos PowerShell.
    Substitui aspas "curly" e primes por aspas ASCII.
    """
    # ✅ NOVO: Remover escapes duplicados que vêm do frontend
    # \"\" -> " (duplo escape)
    # \\\" -> " (triplo escape comum em JSON-in-JSON)
    command = command.replace('\\\\"', '"').replace('\\\"', '"').replace("\\'", "'")
    
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


def decode_base64_utf16(encoded_str: str) -> str:
    """
    Decodifica Base64 UTF-16LE (padrão PowerShell)
    Usado para -EncodedCommand e payloads similares
    """
    try:
        # Remover espaços e quebras de linha
        encoded_str = encoded_str.replace(' ', '').replace('\n', '').replace('\r', '')
        
        # Adicionar padding se necessário
        padding = 4 - (len(encoded_str) % 4)
        if padding != 4:
            encoded_str += '=' * padding
        
        # Decodificar Base64
        decoded_bytes = base64.b64decode(encoded_str)
        
        # Tentar UTF-16LE primeiro (padrão PowerShell)
        try:
            return decoded_bytes.decode('utf-16-le', errors='ignore')
        except:
            # Fallback para UTF-8
            return decoded_bytes.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"⚠️ Error decoding Base64: {e}")
        return ""


def deobfuscate_powershell(command: str) -> tuple:
    """
    Deofusca comandos PowerShell usando pyminusone ou fallback manual
    Retorna: (decoded_command, iteration_count)
    """
    normalized_command = normalize_powershell_command(command)
    has_leading_ampersand = normalized_command.strip().startswith('&')
    command_to_process = normalized_command.strip()

    # ✅ NOVO: Loop para decodificar TODOS os níveis de -EncodedCommand
    max_decode_iterations = 5
    iteration = 0
    
    while iteration < max_decode_iterations:
        encoded_match = re.search(r'-(?:EncodedCommand|enc)\s+([A-Za-z0-9+/=\s]+?)(?:\s|$)', command_to_process, re.IGNORECASE)
        
        if encoded_match:
            iteration += 1
            payload_b64 = encoded_match.group(1)
            decoded_payload = decode_base64_utf16(payload_b64)
            
            if decoded_payload and len(decoded_payload) > 5:
                print(f"✅ [Iteration {iteration}] Decoded -EncodedCommand: {decoded_payload[:100]}...")
                command_to_process = decoded_payload
                
                # Se NÃO houver mais -EncodedCommand, sair do loop
                if not re.search(r'-(?:EncodedCommand|enc)\s+', decoded_payload, re.IGNORECASE):
                    print(f"✅ [FINAL] Reached end of nested encoding after {iteration} iterations")
                    print(f"   Final decoded: {command_to_process[:150]}...")
                    return command_to_process, iteration
            else:
                print(f"⚠️ Failed to decode at iteration {iteration}")
                break
        else:
            # Nenhum -EncodedCommand encontrado
            if iteration > 0:
                print(f"✅ [FINAL] No more -EncodedCommand found after {iteration} iterations")
                print(f"   Final result: {command_to_process[:150]}...")
                return command_to_process, iteration
            break
    
    # Se chegou ao máximo de iterações
    if iteration >= max_decode_iterations:
        print(f"⚠️ Reached max decode iterations ({max_decode_iterations})")
        return command_to_process, iteration

    # Se não tinha -EncodedCommand, tentar pyminusone para outras obfuscações
    if PYMINUSONE_AVAILABLE:
        try:
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
                    return final_result, iteration
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
            return cleaned_manual, iteration
    except Exception as e:
        print(f"❌ Manual deobfuscation error: {e}")

    print("ℹ️ No deobfuscation applied - returning normalized command")
    return normalized_command, 0


def calculate_command_hash(command: str) -> str:
    """Calcula fuzzy hash de um comando usando ppdeep"""
    if PPDEEP_AVAILABLE:
        try:
            return ppdeep.hash(command)
        except Exception as e:
            print(f"⚠️ ppdeep hashing failed: {e}")
            return ""
    return ""


def detect_obfuscation(original_command: str, deobfuscated_command: str) -> bool:
    """
    Detecta se o comando foi obfuscado comparando fuzzy hashes com ppdeep
    Fallback: compara tamanho e conteúdo quando ppdeep não está disponível
    """
    # ✅ NOVO: Fallback quando ppdeep não está disponível
    if not PPDEEP_AVAILABLE:
        # Se o comando deobfuscado é diferente do original, houve obfuscação
        if deobfuscated_command and deobfuscated_command != original_command:
            # Verificar se é realmente uma mudança significativa
            original_len = len(original_command)
            deobfuscated_len = len(deobfuscated_command)
            
            # Se deobfuscado é consideravelmente menor, é obfuscação (formato strings, etc)
            # Ou se tem padrões típicos de obfuscação
            if deobfuscated_len < original_len * 0.8:  # 20%+ de redução
                print(f"✅ [OBFUSCATION DETECTED - FALLBACK] Size reduction: {original_len} -> {deobfuscated_len}")
                return True
            
            # Verificar por padrões típicos de obfuscação (format strings, aspas, etc)
            obfuscation_patterns = [
                r'\{[0-9]+\}',  # Format string indices {0}, {1}, etc
                r'"\s*-f\s*',   # -f format operator
                r"'\s*,\s*'",   # Concatenated strings with comma
                r'\(\s*"[^"]{1,3}"\s*\)',  # Small quoted strings in parens
            ]
            
            original_obfuscation_count = sum(
                len(re.findall(pattern, original_command, re.IGNORECASE))
                for pattern in obfuscation_patterns
            )
            
            deobfuscated_obfuscation_count = sum(
                len(re.findall(pattern, deobfuscated_command, re.IGNORECASE))
                for pattern in obfuscation_patterns
            )
            
            # Se o original tem significativamente mais padrões de obfuscação
            if original_obfuscation_count > deobfuscated_obfuscation_count * 2:
                print(f"✅ [OBFUSCATION DETECTED - FALLBACK] Pattern reduction: {original_obfuscation_count} -> {deobfuscated_obfuscation_count}")
                return True
        
        return False
    
    # ✅ ORIGINAL: Com ppdeep disponível
    try:
        original_hash = calculate_command_hash(original_command)
        deobfuscated_hash = calculate_command_hash(deobfuscated_command)
        
        if not original_hash or not deobfuscated_hash:
            return False
        # Comparar hashes fuzzy - valores > 0 indicam similaridade
        similarity = ppdeep.compare(original_hash, deobfuscated_hash) 
        # Se similarity < 100, os comandos são diferentes (obfuscação detectada)
        # Se similarity == 100, são idênticos (sem obfuscação)
        return similarity < 100
    except Exception as e:
        print(f"⚠️ Fuzzy hash comparison failed: {e}")
        return False


def detect_encoded_command(command: str) -> dict:
    """
    Detecta se o comando está codificado em Base64 ou usa -EncodedCommand
    """
    try:
        normalized = normalize_powershell_command(command)
        
        # Padrões de indicadores de comando codificado
        encoded_indicators = [
            r'-EncodedCommand\s+',
            r'-enc\s+',
            r'powershell.*-enc\s+',
            r'pwsh.*-enc\s+'
        ]
        
        for pattern in encoded_indicators:
            if re.search(pattern, normalized, re.IGNORECASE):
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand or -enc parameter"
                }
        
        # Procurar por FromBase64String
        if re.search(r'\[Convert\]::FromBase64String\s*\(', normalized, re.IGNORECASE):
            return {
                "is_encoded": True,
                "type": "base64_decode_call",
                "indicator": "Found FromBase64String call"
            }
        
        # Procurar por padrões de Base64 suspeitos
        # Base64 é tipicamente: caracteres alfanuméricos + /+= com comprimento múltiplo de 4
        base64_pattern = r'(?:[A-Za-z0-9+/]{20,}={0,2})'
        base64_matches = re.findall(base64_pattern, normalized)
        
        if base64_matches:
            # Tentar decodificar para validar se é realmente Base64
            for match in base64_matches:
                try:
                    # Adicionar padding se necessário
                    padded = match + '=' * (4 - len(match) % 4)
                    decoded = base64.b64decode(padded, validate=True).decode('utf-8', errors='ignore')
                    
                    # Se conseguiu decodificar e o resultado não é vazio
                    if decoded and len(decoded) > 5:
                        return {
                            "is_encoded": True,
                            "type": "base64_string",
                            "indicator": f"Found potential Base64 encoded string: {match[:50]}...",
                            "decoded_preview": decoded[:100]
                        }
                except:
                    continue
        
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None
        }
    except Exception as e:
        print(f"⚠️ Error detecting encoded command: {e}")
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None
        }


def detect_double_encoded_command(command: str, decoded_command: str, decode_iterations: int = 0) -> dict:
    """
    Detecta se o comando foi codificado múltiplas vezes (dupla ou múltipla codificação)
    Agora também considera o número de iterações necessárias para decodificar
    """
    try:
        normalized_original = normalize_powershell_command(command)
        normalized_decoded = normalize_powershell_command(decoded_command)
        
        # ✅ NOVO: Se precisou de 2+ iterações para decodificar, é duplo codificado!
        if decode_iterations >= 2:
            print(f"✅ [DOUBLE ENCODING] Detected {decode_iterations} decoding iterations")
            return {
                "is_double_encoded": True,
                "encoding_layers": decode_iterations,
                "indicator": f"Detected {decode_iterations} layers of -EncodedCommand nesting (double/multiple encoding)"
            }
        
        # Contar quantas vezes FromBase64String aparece
        frombase64_count_original = len(re.findall(r'\[Convert\]::FromBase64String', normalized_original, re.IGNORECASE))
        frombase64_count_decoded = len(re.findall(r'\[Convert\]::FromBase64String', normalized_decoded, re.IGNORECASE))
        
        total_frombase64 = frombase64_count_original + frombase64_count_decoded
        
        if total_frombase64 >= 2:
            return {
                "is_double_encoded": True,
                "encoding_layers": total_frombase64,
                "indicator": f"Detected {total_frombase64} layers of Base64 encoding (double/multiple encoding)"
            }
        
        # Tentar decodificar o comando decodificado - se conseguir, é duplo
        if decoded_command and decoded_command != normalized_original:
            try:
                # Procurar por Base64 no comando já decodificado
                base64_pattern = r'(?:[A-Za-z0-9+/]{20,}={0,2})'
                base64_matches = re.findall(base64_pattern, normalized_decoded)
                
                if base64_matches:
                    for match in base64_matches:
                        try:
                            padded = match + '=' * (4 - len(match) % 4)
                            decoded_again = base64.b64decode(padded, validate=True).decode('utf-8', errors='ignore')
                            
                            if decoded_again and len(decoded_again) > 5:
                                return {
                                    "is_double_encoded": True,
                                    "encoding_layers": 2,
                                    "indicator": "Detected double Base64 encoding - command can be decoded multiple times"
                                }
                        except:
                            continue
            except Exception as e:
                print(f"⚠️ Error in double encoding detection recursive check: {e}")
        
        return {
            "is_double_encoded": False,
            "encoding_layers": total_frombase64,
            "indicator": None
        }
    except Exception as e:
        print(f"⚠️ Error detecting double encoded command: {e}")
        return {
            "is_double_encoded": False,
            "encoding_layers": 0,
            "indicator": None
        }


def analyze_command_patterns(command: str, signatures: list) -> dict:
    detected_signatures = []
    total_score = 0
    tactics = set()
    techniques = set()
    
    normalized_command = normalize_powershell_command(command)
   
    # ✅ ALTERADO: Agora retorna tuple (decoded_command, iterations)
    decoded_command, decode_iterations = deobfuscate_powershell(normalized_command)
    has_deobfuscation = decoded_command != normalized_command
    
    # ✅ DEBUG LOG
    print(f"\n[ANALYZE] Command Analysis:")
    print(f"  Original: {normalized_command[:80]}...")
    print(f"  Decoded: {decoded_command[:80]}...")
    print(f"  Decode iterations: {decode_iterations}")
    print(f"  Has deobfuscation: {has_deobfuscation}")
    print(f"  Decoded command is None: {decoded_command is None}")
    print(f"  Decoded command length: {len(decoded_command) if decoded_command else 0}")

    # ✅ LOG: Verificar deobfuscação
    if has_deobfuscation:
        print(f"✅ [ANALYZER] Deobfuscation detected!")
        print(f"   Original length: {len(normalized_command)}")
        print(f"   Decoded length: {len(decoded_command)}")
        print(f"   Decoded preview: {decoded_command[:150]}...")
    else:
        print(f"ℹ️ [ANALYZER] No deobfuscation needed")

    # ✅ NOVO: Detectar obfuscação
    is_obfuscated = detect_obfuscation(normalized_command, decoded_command)
    
    # ✅ ALTERADO: Buscar signature do banco ao invés de mockar
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
                        "matched_text": "Obfuscation detected",
                        "position": {"start": 0, "end": len(normalized_command)},
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
            
            print(f"✅ [OBFUSCATION] Added to detected_signatures")
        else:
            print(f"⚠️ [OBFUSCATION] Signature not found in database")
    
    # ✅ NOVO: Detectar comando codificado
    encoding_detection = detect_encoded_command(normalized_command)
    if encoding_detection["is_encoded"]:
        encoded_sig = next((sig for sig in signatures if sig.get("name") == "Encoded Command Detected"), None)
        
        if encoded_sig:
            detected_signatures.append({
                "name": "Encoded Command Detected",
                "description": f"Command encoding detected: {encoding_detection['indicator']}",
                "severity": encoded_sig["severity"],
                "base_score": encoded_sig["score"],
                "matches_found": 1,
                "total_score": encoded_sig["score"],
                "max_match_allowed": 1,
                "pattern": encoding_detection["type"],
                "matches_details": [{
                    "matched_text": encoding_detection["indicator"],
                    "position": {"start": 0, "end": len(normalized_command)},
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
            
            tactics.update(encoded_sig.get("tactics", ["Defense Evasion"]))
            techniques.update(encoded_sig.get("techniques", ["T1027", "T1027.001", "T1140"]))
            total_score += encoded_sig["score"]
    
    # ✅ NOVO: Detectar dupla codificação
    double_encoding_detection = detect_double_encoded_command(normalized_command, decoded_command, decode_iterations)
    if double_encoding_detection["is_double_encoded"]:
        double_encoded_sig = next((sig for sig in signatures if sig.get("name") == "Double Encoded Command Detected"), None)
        
        if double_encoded_sig:
            detected_signatures.append({
                "name": "Double Encoded Command Detected",
                "description": f"Double/multiple encoding detected: {double_encoding_detection['indicator']}",
                "severity": double_encoded_sig["severity"],
                "base_score": double_encoded_sig["score"],
                "matches_found": 1,
                "total_score": double_encoded_sig["score"],
                "max_match_allowed": 1,
                "pattern": "Double Base64 Encoding",
                "matches_details": [{
                    "matched_text": double_encoding_detection["indicator"],
                    "position": {"start": 0, "end": len(normalized_command)},
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
    
    commands_to_analyze = [normalized_command]
    if has_deobfuscation:
        commands_to_analyze.append(decoded_command)
    
    for signature in signatures:
        # ✅ PULAR: Se é indicador já processado, continue
        if signature.get("name") in ["Obfuscation Detected", "Encoded Command Detected", "Double Encoded Command Detected"]:
            continue
        
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
        "decoded_command": decoded_command if has_deobfuscation else None,
        "is_obfuscated": is_obfuscated
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

