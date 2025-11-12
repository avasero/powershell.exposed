"""
Detector para comandos PowerShell com double/múltipla codificação
Identifica -EncodedCommand aninhado ou múltiplas camadas de Base64
"""

import re
import base64


ENCODED_COMMAND_PATTERN = r'-e(?:n(?:c(?:o(?:d(?:e(?:d(?:c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?)?)?)?)?)?)?)\s+["\']?\s*([a-zA-Z0-9+/=]+)'


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
            return ""
        
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
