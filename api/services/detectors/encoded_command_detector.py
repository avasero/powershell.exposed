"""
Detector para comandos PowerShell codificados em Base64
Identifica -EncodedCommand, -enc e FromBase64String
"""

import re
import base64


def detect_encoded_command(command: str) -> dict:
    """
    Detecta se o comando está codificado em Base64 ou usa -EncodedCommand
    
    Returns:
        dict: {
            "is_encoded": bool,
            "type": str (explicit_encoded_command | base64_decode_call | base64_string | None),
            "indicator": str (descrição do indicador encontrado),
            "decoded_preview": str (preview do conteúdo decodificado, se aplicável)
        }
    """
    try:
        
        encoded_indicators = [
            r'-EncodedCommand\s+',
            r'-enc\s+(?!code)',  
            r'powershell.*-enc\s+',
            r'pwsh.*-enc\s+'
        ]
        
        for pattern in encoded_indicators:
            if re.search(pattern, command, re.IGNORECASE):
                print(f"✅ [ENCODED] Found explicit encoded indicator: {pattern}")
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand or -enc parameter",
                    "decoded_preview": None
                }
        
        
        if re.search(r'\[Convert\]::FromBase64String\s*\(', command, re.IGNORECASE):
            print(f"✅ [ENCODED] Found FromBase64String call")
            return {
                "is_encoded": True,
                "type": "base64_decode_call",
                "indicator": "Found FromBase64String call",
                "decoded_preview": None
            }
        
        
        base64_pattern = r'(?:[A-Za-z0-9+/]{20,}={0,2})'
        base64_matches = re.findall(base64_pattern, command)
        
        if base64_matches:
            for match in base64_matches:
                try:
                    
                    padded = match + '=' * (4 - len(match) % 4)
                    decoded = base64.b64decode(padded, validate=True).decode('utf-8', errors='ignore')
                    
                    # Se conseguiu decodificar e o resultado não é vazio
                    if decoded and len(decoded) > 5:
                        print(f"✅ [ENCODED] Found valid Base64 string")
                        return {
                            "is_encoded": True,
                            "type": "base64_string",
                            "indicator": f"Found potential Base64 encoded string: {match[:50]}...",
                            "decoded_preview": decoded[:100]
                        }
                except:
                    continue
        
        print(f"ℹ️ [ENCODED] No encoding detected")
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None
        }
        
    except Exception as e:
        print(f"❌ [ENCODED] Error detecting encoded command: {e}")
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None
        }
