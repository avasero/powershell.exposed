"""
Detector para comandos PowerShell obfuscados
Identifica obfuscação comparando hashes fuzzy do comando original vs decodificado
"""
try:
    import ppdeep
    PPDEEP_AVAILABLE = True
except ImportError:
    PPDEEP_AVAILABLE = False


def calculate_command_hash(command: str) -> str:
    """Calcula fuzzy hash usando ppdeep"""
    if PPDEEP_AVAILABLE:
        try:
            return ppdeep.hash(command)
        except Exception as e:
            print(f"[WARNING] ppdeep hashing failed: {e}")
            return ""
    return ""


def detect_obfuscation(original_command: str, deobfuscated_command: str) -> bool:
    
    
    if len(deobfuscated_command) > len(original_command):
        return False
    
    if deobfuscated_command == original_command:
        return False
    
    
    
    if PPDEEP_AVAILABLE:
        try:
            original_hash = calculate_command_hash(original_command)
            deobfuscated_hash = calculate_command_hash(deobfuscated_command)
            
            if not original_hash or not deobfuscated_hash:
                return False
            
           
            similarity = ppdeep.compare(original_hash, deobfuscated_hash)
            
            
            if similarity < 100:
                return True
            
        except Exception as e:
            pass
    
    return False
