import regex
import base64

# Import pattern from central location
from services.detectors.patterns import ENCODED_COMMAND_PATTERN


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


def detect_encoded_command(command: str) -> dict:
    """
    ✅ Detecta -EncodedCommand no comando RAW sem normalização
    """
    try:
        
       
        
    
        match = regex.search(ENCODED_COMMAND_PATTERN, command, regex.IGNORECASE)
        
       
        
        if match:
            base64_payload = match.group(1)
            
            
            decoded = decode_base64_utf16(base64_payload)
            
            
            
            if len(decoded) > 0:
               
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand parameter (or variant)",
                    "decoded_preview": decoded,
                    "confidence": 0.95
                }
            else:
                
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand parameter (or variant)",
                    "decoded_preview": None,
                    "confidence": 0.80
                }
        
       
        
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None,
            "confidence": 0.0
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None,
            "confidence": 0.0
        }