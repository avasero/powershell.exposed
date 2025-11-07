

import re
import base64


def detect_double_encoded_command(
    command: str, 
    decoded_command: str, 
    decode_iterations: int = 0
) -> dict:
    try:
        print(f"\n[DOUBLE ENCODING CHECK]")
        print(f"  Decode iterations: {decode_iterations}")
        print(f"  Original command: {command[:80]}...")
        print(f"  Decoded command: {decoded_command[:80]}...")
        
        
        if decode_iterations >= 2:
            print(f"✅ [DOUBLE ENCODING] Detected {decode_iterations} decoding iterations")
            return {
                "is_double_encoded": True,
                "encoding_layers": decode_iterations,
                "indicator": f"Detected {decode_iterations} layers of -EncodedCommand nesting"
            }
        
        
        frombase64_count_original = len(
            re.findall(r'\[Convert\]::FromBase64String', command, re.IGNORECASE)
        )
        frombase64_count_decoded = len(
            re.findall(r'\[Convert\]::FromBase64String', decoded_command, re.IGNORECASE)
        )
        
        total_frombase64 = frombase64_count_original + frombase64_count_decoded
        
        if total_frombase64 >= 2:
            print(f"✅ [DOUBLE ENCODING] Found {total_frombase64} FromBase64String calls")
            return {
                "is_double_encoded": True,
                "encoding_layers": total_frombase64,
                "indicator": f"Detected {total_frombase64} layers of Base64 encoding"
            }
        
        
        if decoded_command and decoded_command != command:
            utf16le_pattern = r'^[A-Za-z0-9+/\s]{20,}={0,2}$'
            
            if re.match(utf16le_pattern, decoded_command.strip()):
                print(f"✅ [DOUBLE ENCODING] Decoded result looks like Base64 again")
                print(f"   Pattern matched: {utf16le_pattern}")
                
                # Tentar decodificar novamente para confirmar
                try:
                    padded = decoded_command.strip() + '=' * (4 - len(decoded_command.strip()) % 4)
                    test_decoded = base64.b64decode(padded, validate=True).decode('utf-16-le', errors='ignore')
                    
                    if test_decoded and len(test_decoded) > 5:
                        print(f"✅ [DOUBLE ENCODING] CONFIRMED: Second decode = {test_decoded[:80]}...")
                        return {
                            "is_double_encoded": True,
                            "encoding_layers": 2,
                            "indicator": "Detected double Base64 UTF-16LE encoding - cascaded encoding"
                        }
                except:
                    pass
        
        
        if decoded_command and decoded_command != command:
            base64_pattern = r'(?:[A-Za-z0-9+/]{20,}={0,2})'
            base64_matches = re.findall(base64_pattern, decoded_command)
            
            if base64_matches:
                for match in base64_matches:
                    try:
                        padded = match + '=' * (4 - len(match) % 4)
                        decoded_again = base64.b64decode(padded, validate=True).decode('utf-8', errors='ignore')
                        
                        if decoded_again and len(decoded_again) > 5:
                            print(f"✅ [DOUBLE ENCODING] Found Base64 in decoded result")
                            return {
                                "is_double_encoded": True,
                                "encoding_layers": 2,
                                "indicator": "Detected double Base64 encoding - Base64 found in decoded payload"
                            }
                    except:
                        continue
        
        print(f"  Result: No double encoding detected")
        return {
            "is_double_encoded": False,
            "encoding_layers": total_frombase64 if total_frombase64 > 0 else 1,
            "indicator": None
        }
        
    except Exception as e:
        print(f"❌ [DOUBLE ENCODING] Error: {e}")
        return {
            "is_double_encoded": False,
            "encoding_layers": 0,
            "indicator": None
        }
