"""
Detector para comandos PowerShell codificados em Base64
Identifica -EncodedCommand, -enc, -enco e variações com FromBase64String
"""

import re
import base64


ENCODED_COMMAND_PATTERN = r'-(?:ec|enco?d(?:ed)?c(?:omm)?a(?:nd)?)?\s+["\']*\s*([a-zA-Z0-9+/=]+)'


def decode_base64_utf16(encoded_str: str) -> str:
    """
    Decodifica Base64 UTF-16LE (padrão PowerShell)
    SEMPRE usa UTF-16LE, NUNCA UTF-8
    Trata TUDO após o primeiro Base64 válido como bytes UTF-16LE também
    """
    try:
        # Remove espaços/quebras
        encoded_str = encoded_str.replace(' ', '').replace('\n', '').replace('\r', '')
        
        if not encoded_str:
            return encoded_str
        
        # Tentar decodificar TUDO como Base64 (mesmo que inválido no final)
        # Remover padding
        base64_clean = encoded_str.rstrip('=')
        
        # Adicionar padding correto
        while len(base64_clean) % 4 != 0:
            base64_clean += '='
        
        # Decodificar SEM validação - pega o máximo possível
        try:
            decoded_bytes = base64.b64decode(base64_clean, validate=False)
        except Exception:
            return encoded_str
        
        # Decodificar como UTF-16LE (errors='ignore' pega tudo que conseguir)
        decoded_text = decoded_bytes.decode('utf-16-le', errors='ignore')
        
        return decoded_text
        
    except Exception as e:
        return encoded_str


def detect_encoded_command(command: str) -> dict:
    
    try:
        match = re.search(ENCODED_COMMAND_PATTERN, command, re.IGNORECASE)
        
        if match:
            base64_payload = match.group(1)
            
            # Tentar decodificar
            decoded = decode_base64_utf16(base64_payload)
            
            if decoded and len(decoded) > 3:
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand parameter (or variant)",
                    "decoded_preview": decoded[:150],
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
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None,
            "confidence": 0.0
        }
