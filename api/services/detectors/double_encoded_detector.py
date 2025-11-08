"""
Detector para comandos PowerShell com double/múltipla codificação
Identifica -EncodedCommand aninhado ou múltiplas camadas de Base64
"""

import re
import base64


ENCODED_COMMAND_PATTERN = r'[^0-9a-z][\u002D\u2013\u2014\u2015](?:ec|e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)\s+["\']*\s*([a-z0-9+/]{20,}={0,2})'


def decode_base64_utf16(encoded_str: str) -> str:
    try:
        decoded_bytes = base64.b64decode(encoded_str, validate=True)
        try:
            return decoded_bytes.decode('utf-16-le', errors='ignore')
        except:
            return decoded_bytes.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"⚠️ [DECODE] Error decoding Base64: {e}")
        return ""


def detect_double_encoded_command(
    command: str, 
    decoded_command: str, 
    decode_iterations: int = 0
) -> dict:
    try:
        # Se detectou 2+ iterações, é double encoded
        if decode_iterations >= 2:
            return {
                "is_double_encoded": True,
                "encoding_layers": decode_iterations,
                "indicator": f"Detected {decode_iterations} layers of -EncodedCommand nesting",
                "second_level_decoded": None
            }
        
        match = re.search(ENCODED_COMMAND_PATTERN, decoded_command, re.IGNORECASE)
        
        if match:
            base64_payload = match.group(1)
            second_level_decoded = decode_base64_utf16(base64_payload)
            
            if second_level_decoded and len(second_level_decoded) > 3:
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
