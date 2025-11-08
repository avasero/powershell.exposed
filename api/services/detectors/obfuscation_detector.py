"""
Detector para comandos PowerShell obfuscados
Identifica obfuscação comparando hashes fuzzy do comando original vs decodificado
"""

import re

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
            print(f"⚠️ ppdeep hashing failed: {e}")
            return ""
    return ""


def detect_obfuscation(original_command: str, deobfuscated_command: str) -> bool:
    """
    Detecta obfuscação comparando fuzzy hashes.
    Se os hashes forem muito diferentes (< 100% de similaridade), há obfuscação.
    """
    
    # ⚡ OTIMIZAÇÃO: Early exit para casos óbvios
    if len(deobfuscated_command) > len(original_command):
        return False
    
    if deobfuscated_command == original_command:
        return False
    
    # Verificar se é apenas um cmdlet simples (não é ofuscação)
    simple_cmdlet_pattern = r'^[&\s]*(Get|Set|New|Remove|Start|Stop|Invoke|Write|Add|Find|Import|Export|Test|Copy|Move|Rename|Select|Format|Measure|Group|Sort|Where|ConvertTo|ConvertFrom|Join|Split|Out|Read|Clear|Close|Compress|Expand|Disable|Enable|Suspend|Resume|Restart|Shutdown|Lock|Unlock|Connect|Disconnect|Register|Unregister|Mount|Dismount|Wait|Watch|Trace)-\w+.*$'
    
    if re.match(simple_cmdlet_pattern, deobfuscated_command.strip(), re.IGNORECASE):
        return False
    
    # ⚡ OTIMIZAÇÃO: Cache fuzzy hashes para reutilização
    if PPDEEP_AVAILABLE:
        try:
            original_hash = calculate_command_hash(original_command)
            deobfuscated_hash = calculate_command_hash(deobfuscated_command)
            
            if not original_hash or not deobfuscated_hash:
                return False
            
            # Comparar similaridade dos hashes
            similarity = ppdeep.compare(original_hash, deobfuscated_hash)
            
            # Se similaridade < 100, há obfuscação
            if similarity < 100:
                return True
            
        except Exception as e:
            pass
    
    return False
