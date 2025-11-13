import re
import base64



# ✅ FIX: Regex corrigida - estava faltando fechar parênteses
ENCODED_COMMAND_PATTERN = r'[\u002D\u2013\u2014\u2015](?:ec|e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)?)\s+["\']?\s*([a-z0-9+/]{20,}={0,2})'


def decode_base64_utf16(encoded_str: str) -> str:
    try:
        encoded_str = encoded_str.replace(' ', '').replace('\n', '').replace('\r', '')
        
        if not encoded_str:
            return ""
        
        decoded_bytes = base64.b64decode(encoded_str + '===', validate=False)[:len(encoded_str)*3//4]
        decoded_text = decoded_bytes.decode('utf-16-le', errors='ignore')
        
        return decoded_text
        
    except Exception:
        try:
            decoded_bytes = base64.b64decode(encoded_str, validate=False)
            return decoded_bytes.decode('utf-16-le', errors='ignore')
        except Exception:
            return ""


def detect_double_encoded_command(
    command: str, 
    decoded_command: str, 
    decode_iterations: int = 0
) -> dict:
    """
    ✅ Detecta double encoding no comando RAW sem normalização
    """
    try:
        if decode_iterations >= 2:
            return {
                "is_double_encoded": True,
                "encoding_layers": decode_iterations,
                "indicator": f"Detected {decode_iterations} layers of -EncodedCommand nesting",
                "second_level_decoded": None
            }
        
        # ✅ NÃO NORMALIZAR decoded_command - usar como está
        match = re.search(ENCODED_COMMAND_PATTERN, decoded_command, re.IGNORECASE)
        
        if match:
            base64_payload = match.group(1)
            second_level_decoded = decode_base64_utf16(base64_payload)
            
            
            if len(second_level_decoded) > 0:
                return {
                    "is_double_encoded": True,
                    "encoding_layers": 2,
                    "indicator": "Found nested -EncodedCommand",
                    "second_level_decoded": second_level_decoded[:150]
                }
            else:
                return {
                    "is_double_encoded": True,
                    "encoding_layers": 2,
                    "indicator": "Found nested -EncodedCommand but decode failed",
                    "second_level_decoded": None
                }
        
        return {
            "is_double_encoded": False,
            "encoding_layers": 1,
            "indicator": None,
            "second_level_decoded": None
        }
        
    except Exception as e:
        return {
            "is_double_encoded": False,
            "encoding_layers": 0,
            "indicator": None,
            "second_level_decoded": None
        }