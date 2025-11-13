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


def detect_encoded_command(command: str) -> dict:
    """
    ✅ Detecta -EncodedCommand no comando RAW sem normalização
    """
    try:
        # ✅ DEBUG COMPLETO
        print(f"\n🔍 [DETECTOR] ====== ANALYSIS START ======")
        print(f"🔍 [DETECTOR] Command length: {len(command)}")
        print(f"🔍 [DETECTOR] Command (first 200 chars): '{command[:200]}'")
        print(f"🔍 [DETECTOR] Command repr: {repr(command[:200])}")
        print(f"🔍 [DETECTOR] Starts with space: {command.startswith(' ')}")
        print(f"🔍 [DETECTOR] Contains '-': {'-' in command}")
        print(f"🔍 [DETECTOR] Contains 'EncodedCommand': {'encodedcommand' in command.lower()}")
        
        # ✅ NÃO NORMALIZAR - usar comando original
        match = re.search(ENCODED_COMMAND_PATTERN, command, re.IGNORECASE)
        
        print(f"🔍 [DETECTOR] Regex match result: {match is not None}")
        
        if match:
            base64_payload = match.group(1)
            print(f"🔍 [DETECTOR] ✅ MATCH FOUND!")
            print(f"🔍 [DETECTOR] Captured Base64 payload length: {len(base64_payload)}")
            print(f"🔍 [DETECTOR] Captured Base64 payload: {base64_payload[:100]}...")
            
            decoded = decode_base64_utf16(base64_payload)
            
            print(f"🔍 [DETECTOR] Decoded length: {len(decoded)}")
            print(f"🔍 [DETECTOR] Decoded content: {decoded[:100] if decoded else '(empty)'}...")
            
            if len(decoded) > 0:
                print(f"🔍 [DETECTOR] ✅ VALID DECODE - Returning is_encoded=True")
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand parameter (or variant)",
                    "decoded_preview": decoded[:150],
                    "confidence": 0.95
                }
            else:
                print(f"🔍 [DETECTOR] ⚠️ EMPTY DECODE - Returning is_encoded=True (low confidence)")
                return {
                    "is_encoded": True,
                    "type": "explicit_encoded_command",
                    "indicator": "Found -EncodedCommand parameter (or variant)",
                    "decoded_preview": None,
                    "confidence": 0.80
                }
        
        print(f"🔍 [DETECTOR] ❌ NO MATCH - Returning is_encoded=False")
        print(f"🔍 [DETECTOR] ====== ANALYSIS END ======\n")
        
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None,
            "confidence": 0.0
        }
        
    except Exception as e:
        print(f"❌ [DETECTOR ERROR] {e}")
        import traceback
        traceback.print_exc()
        return {
            "is_encoded": False,
            "type": None,
            "indicator": None,
            "decoded_preview": None,
            "confidence": 0.0
        }