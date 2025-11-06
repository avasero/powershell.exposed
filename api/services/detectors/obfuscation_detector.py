"""
Detector para comandos PowerShell obfuscados
Identifica padrões de format strings, encoding, e outras técnicas de ofuscação
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


def detect_obfuscation_patterns(command: str) -> dict:
    """
    Detecta padrões típicos de obfuscação sem necessidade de decodificação
    
    Returns:
        dict: {
            "patterns_found": list (padrões detectados),
            "pattern_count": int (número de padrões),
            "suspicious_level": str (low | medium | high)
        }
    """
    patterns = {
        "format_string_indices": r'\{[0-9]+\}',           # {0}, {1}, {2}
        "format_operator": r'"\s*-f\s*',                  # " -f
        "string_concatenation": r"'\s*,\s*'",             # ', '
        "small_quoted_in_parens": r'\(\s*"[^"]{1,3}"\s*\)',  # ("x")
        "hex_encoding": r'0x[0-9A-Fa-f]{2,}',             # 0x41
        "char_encoding": r'\[char\]\s*',                  # [char]
        "iex_invoke": r'\b(iex|Invoke-Expression)\b',     # iex, Invoke-Expression
        "double_quotes_escaped": r'\\"',                  # \"
        "base64_like": r'(?:[A-Za-z0-9+/]{20,}={0,2})',  # Base64
    }
    
    found_patterns = []
    
    for pattern_name, pattern_regex in patterns.items():
        matches = re.findall(pattern_regex, command, re.IGNORECASE)
        if matches:
            found_patterns.append({
                "pattern_name": pattern_name,
                "count": len(matches),
                "examples": matches[:3]  # Primeiros 3 exemplos
            })
    
    # Calcular nível de suspeita
    pattern_count = len(found_patterns)
    suspicious_level = "low"
    
    if pattern_count >= 5:
        suspicious_level = "high"
    elif pattern_count >= 3:
        suspicious_level = "medium"
    
    return {
        "patterns_found": found_patterns,
        "pattern_count": pattern_count,
        "suspicious_level": suspicious_level
    }


def detect_obfuscation(original_command: str, deobfuscated_command: str) -> bool:
    """
    Detecta se o comando foi obfuscado comparando original vs deobfuscado
    
    Usa fuzzy hash com ppdeep quando disponível, fallback para análise de padrões
    
    Returns:
        bool: True se obfuscação foi detectada
    """
    print(f"\n[OBFUSCATION DETECTION]")
    print(f"  Original: {original_command[:80]}...")
    print(f"  Deobfuscated: {deobfuscated_command[:80]}...")
    
    # Se os comandos são idênticos, não há obfuscação
    if deobfuscated_command == original_command:
        print(f"  Result: Commands are identical - no obfuscation")
        return False
    
    # ✅ NOVO: Se o decodificado é um comando legível simples, não é ofuscação
    # Padrão: cmdlet simples como "Start-Process", "Get-Item", etc
    simple_cmdlet_pattern = r'^[&\s]*(Get|Set|New|Remove|Start|Stop|Invoke|Write|Add|Find|Import|Export|Test|Copy|Move|Rename|Select|Format|Measure|Group|Sort|Where|ConvertTo|ConvertFrom|Join|Split|Out|Read|Clear|Close|Compress|Expand|Disable|Enable|Suspend|Resume|Restart|Shutdown|Lock|Unlock|Connect|Disconnect|Register|Unregister|Mount|Dismount|Wait|Watch|Trace)-\w+.*$'
    
    if re.match(simple_cmdlet_pattern, deobfuscated_command.strip(), re.IGNORECASE):
        print(f"✅ [SIMPLE CMDLET] Deobfuscated is just a normal cmdlet - NOT obfuscation")
        return False
    
    # ✅ COM PPDEEP DISPONÍVEL
    if PPDEEP_AVAILABLE:
        try:
            original_hash = calculate_command_hash(original_command)
            deobfuscated_hash = calculate_command_hash(deobfuscated_command)
            
            if not original_hash or not deobfuscated_hash:
                print(f"⚠️ Could not generate hashes")
                return False
            
            # ppdeep.compare retorna 0-100 (100 = idêntico, 0 = totalmente diferente)
            similarity = ppdeep.compare(original_hash, deobfuscated_hash)
            print(f"✅ [PPDEEP] Fuzzy hash similarity: {similarity}%")
            
            # Similarity < 100 significa diferença (obfuscação detectada)
            if similarity < 100:
                print(f"✅ [OBFUSCATION] Detected via fuzzy hash!")
                return True
            
        except Exception as e:
            print(f"⚠️ Fuzzy hash comparison failed: {e}")
            # Continuar com fallback
    
    # ✅ FALLBACK: Análise de padrões + tamanho
    original_len = len(original_command)
    deobfuscated_len = len(deobfuscated_command)
    
    # ✅ CRITÉRIO: Padrões de obfuscação no original vs deobfuscado
    obfuscation_patterns = [
        r'\{[0-9]+\}',           # Format string indices {0}, {1}
        r'"\s*-f\s*',            # -f format operator
        r"'\s*,\s*'",            # Concatenated strings ', '
        r'\(\s*"[^"]{1,3}"\s*\)', # Small quoted strings ("x")
        r'\[char\]',             # [char] encoding
        r'0x[0-9A-Fa-f]',        # Hex encoding
    ]
    
    original_obfuscation_count = sum(
        len(re.findall(pattern, original_command, re.IGNORECASE))
        for pattern in obfuscation_patterns
    )
    
    deobfuscated_obfuscation_count = sum(
        len(re.findall(pattern, deobfuscated_command, re.IGNORECASE))
        for pattern in obfuscation_patterns
    )
    
    print(f"  Original obfuscation patterns: {original_obfuscation_count}")
    print(f"  Deobfuscated obfuscation patterns: {deobfuscated_obfuscation_count}")
    
    # ✅ MELHORADO: Se ORIGINAL tem 3+ padrões E deobfuscado tem menos
    if original_obfuscation_count >= 3 and original_obfuscation_count > deobfuscated_obfuscation_count:
        print(f"✅ [FALLBACK] Multiple obfuscation patterns detected and removed")
        return True
    
    print(f"  Result: No obfuscation detected")
    return False
