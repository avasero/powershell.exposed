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
        # Remover espaços, quebras de linha e aspas
        encoded_str = re.sub(r'[\s"\'\n\r]', '', encoded_str)
        
        # Adicionar padding se necessário
        padding = 4 - (len(encoded_str) % 4)
        if padding != 4:
            encoded_str += '=' * padding
        
        # Decodificar Base64
        decoded_bytes = base64.b64decode(encoded_str, validate=True)
        
        # Tentar UTF-16LE primeiro (padrão PowerShell)
        try:
            return decoded_bytes.decode('utf-16-le', errors='ignore')
        except:
            # Fallback para UTF-8
            return decoded_bytes.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"⚠️ [DECODE] Error decoding Base64: {e}")
        return ""


def detect_encoded_command(command: str) -> dict:
    """
    Detecta se o comando está codificado em Base64 ou usa -EncodedCommand/variações
    
    Usa regex robusta para detectar:
    - -EncodedCommand (completo)
    - -enc, -enco, -encod, -encode, -encoded, -encodedcom, -encodedcommand (variações)
    - FromBase64String
    
    Returns:
        dict: {
            "is_encoded": bool,
            "type": str,
            "indicator": str,
            "decoded_preview": str,
            "confidence": float
        }
    """
    try:
        # ════════════════════════════════════════════════════════════════
        # 1️⃣  REGEX ROBUSTA: Detectar -EncodedCommand com variações
        # ════════════════════════════════════════════════════════════════
        # Padrão que detecta: - (traço com variações unicode) seguido por 
        # ec, enco, encod, encode, encoded, encodedcommand ou similares
        # seguido por base64 válido (20+ caracteres)
        
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
        
        # ════════════════════════════════════════════════════════════════
        # 2️⃣  FALLBACK: Verificar FromBase64String
        # ════════════════════════════════════════════════════════════════
        if re.search(r'\[Convert\]::FromBase64String\s*\(', command, re.IGNORECASE):
            print(f"✅ [ENCODED] Found FromBase64String call")
            
            # Tentar extrair a string Base64 do FromBase64String
            frombase64_pattern = r'\[Convert\]::FromBase64String\s*\(\s*["\']([a-z0-9+/]{20,}={0,2})["\']'
            frombase64_match = re.search(frombase64_pattern, command, re.IGNORECASE)
            
            if frombase64_match:
                base64_payload = frombase64_match.group(1)
                decoded = decode_base64_utf16(base64_payload)
                
                if decoded and len(decoded) > 3:
                    return {
                        "is_encoded": True,
                        "type": "base64_decode_call",
                        "indicator": "Found [Convert]::FromBase64String() call",
                        "decoded_preview": decoded[:150],
                        "confidence": 0.90
                    }
            
            return {
                "is_encoded": True,
                "type": "base64_decode_call",
                "indicator": "Found [Convert]::FromBase64String() call",
                "decoded_preview": None,
                "confidence": 0.75
            }
        
        # ════════════════════════════════════════════════════════════════
        # 3️⃣  FALLBACK: Procurar por strings Base64 longas
        # ════════════════════════════════════════════════════════════════
        # Apenas como último recurso - menos confiável
        base64_pattern = r'(?:^|[^A-Za-z0-9+/])([A-Za-z0-9+/]{40,}={0,2})(?:$|[^A-Za-z0-9+/=])'
        base64_matches = re.findall(base64_pattern, command)
        
        if base64_matches:
            for match in base64_matches:
                decoded = decode_base64_utf16(match)
                
                # Validar se o decodificado parece ser um comando PowerShell válido
                if decoded and len(decoded) > 5:
                    # Heurística: procurar por palavras-chave de PowerShell
                    ps_keywords = ['powershell', 'cmdlet', '$', 'invoke', 'iex', 'download', 'http', '\\']
                    has_ps_keyword = any(keyword.lower() in decoded.lower() for keyword in ps_keywords)
                    
                    if has_ps_keyword or len(decoded) > 20:
                        print(f"✅ [ENCODED] Found potential Base64 string (heuristic)")
                        return {
                            "is_encoded": True,
                            "type": "base64_string",
                            "indicator": f"Found potential Base64 encoded string",
                            "decoded_preview": decoded[:150],
                            "confidence": 0.65
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
