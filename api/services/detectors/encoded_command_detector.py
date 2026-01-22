import regex
import base64

# Import pattern from central location
from services.detectors.patterns import ENCODED_COMMAND_PATTERN


def decode_base64_utf16(encoded_str: str) -> str:
    try:
        
        encoded_str = encoded_str.replace(' ', '').replace('\n', '').replace('\r', '')

        if not encoded_str:
            return ""

        # Handle truncated base64: length % 4 == 1 is INVALID in base64
        # Remove trailing characters until we have a valid length
        remainder = len(encoded_str) % 4
        if remainder == 1:
            # Length % 4 == 1 is impossible in valid base64, trim 1 char
            encoded_str = encoded_str[:-1]

        # Add proper padding
        padding_needed = (4 - len(encoded_str) % 4) % 4
        padded_str = encoded_str + ('=' * padding_needed)

        decoded_bytes = base64.b64decode(padded_str, validate=False)

        decoded_text = decoded_bytes.decode('utf-16-le', errors='ignore')

        return decoded_text

    except Exception as e:
        import traceback
        traceback.print_exc()
        return ""


def detect_encoded_command(command: str) -> dict:
    """Detects if a PowerShell command contains an encoded command pattern.
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