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


def detect_double_encoded_command(
    command: str, 
    decoded_command: str, 
    decode_iterations: int = 0
) -> dict:
    try:
        if decode_iterations >= 2:
            return {
                "is_double_encoded": True,
                "encoding_layers": decode_iterations,
                "indicator": f"Detected {decode_iterations} layers of -EncodedCommand nesting",
                "second_level_decoded": None
            }
        
      
        match = regex.search(ENCODED_COMMAND_PATTERN, decoded_command, regex.IGNORECASE)
        
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
        
        # Check for FromBase64String with a double-encoded payload
        from_b64_match = regex.search(
            r"""FromBase64String\(\s*['"]([A-Za-z0-9+/]+={0,2})['"]""",
            decoded_command,
            regex.IGNORECASE
        )

        if from_b64_match:
            b64_payload = from_b64_match.group(1)
            if b64_payload.startswith('JA'):
                try:
                    # Add proper padding
                    padding_needed = (4 - len(b64_payload) % 4) % 4
                    padded_payload = b64_payload + ('=' * padding_needed)
                    decoded_inner = base64.b64decode(padded_payload, validate=False)
                    inner_text = decoded_inner.decode('utf-16-le', errors='ignore')
                    return {
                        "is_double_encoded": True,
                        "encoding_layers": 2,
                        "indicator": "Notable base64 in encoded command",
                        "second_level_decoded": inner_text if inner_text else None
                    }
                except Exception:
                    pass

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