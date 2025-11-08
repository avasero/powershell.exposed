"""
Detector para comandos PowerShell codificados em Base64
Identifica -EncodedCommand, -enc, -enco e variações com FromBase64String
"""

import re
import base64


def decode_base64_utf16(encoded_str: str) -> str:
    """
    Decodifica Base64 UTF-16LE (padrão PowerShell)
    Retorna string vazia se falhar
    """
    try:
        
        
        decoded_bytes = base64.b64decode(encoded_str, validate=True)
        
        
        try:
            return decoded_bytes.decode('utf-16-le', errors='ignore')
        except:
            # Fallback para UTF-8
            return decoded_bytes.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"⚠️ [DECODE] Error decoding Base64: {e}")
        return ""


def detect_encoded_command(command: str) -> dict:
    
    try:
        encoded_pattern = r'[^0-9a-z][\u002D\u2013\u2014\u2015](?:ec|e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)?)\s+["\']*\s*([a-z0-9+/]{20,}={0,2})'
        
        match = re.search(encoded_pattern, command, re.IGNORECASE)
        
        if match:
            base64_payload = match.group(1)
            print(f"✅ [ENCODED] Regex match found: {base64_payload[:50]}...")
            
            # Tentar decodificar
            decoded = decode_base64_utf16(base64_payload)
            
            if decoded and len(decoded) > 3:
                print(f"✅ [ENCODED] Successfully decoded: {decoded[:80]}...")
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand parameter (or variant)",
                    "decoded_preview": decoded[:150],
                    "confidence": 0.95
                }
            else:
                print(f"⚠️ [ENCODED] Regex matched but decode failed")
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand parameter (or variant)",
                    "decoded_preview": None,
                    "confidence": 0.80
                }
        
        print(f"ℹ️ [ENCODED] No encoding detected")
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None,
            "confidence": 0.0
        }
        
    except Exception as e:
        print(f"❌ [ENCODED] Error detecting encoded command: {e}")
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None,
            "confidence": 0.0
        }
