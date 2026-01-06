"""
Teste para verificar a detecção de caracteres notáveis (Cyrillic, Hangul, Han)
Regex do indicador: [\p{Cyrillic}\p{Hangul}\p{Han}]
"""
import re

# Regex do indicador Notable charset usando ranges Unicode (equivalente a \p{Cyrillic}\p{Hangul}\p{Han})
# Cyrillic: U+0400-U+04FF, U+0500-U+052F
# Hangul: U+AC00-U+D7AF, U+1100-U+11FF, U+3130-U+318F
# Han (CJK): U+4E00-U+9FFF, U+3400-U+4DBF
NOTABLE_CHARSET_REGEX = r'[\u0400-\u04FF\u0500-\u052F\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u4E00-\u9FFF\u3400-\u4DBF]'

# Strings de teste fornecidas pelo usuário
test_cases = [
    {
        "name": "Korean (Hangul) - Date format",
        "input": "11-03 오후",
        "expected_matches": ["오", "후"],  # Hangul characters
        "description": "Contém caracteres coreanos (Hangul): 오후 significa 'tarde/PM'"
    },
    {
        "name": "Cyrillic - PowerShell with Russian text",
        "input": 'ad-Host "Ёмкость (А*ч)"',
        "expected_matches": ["Ё", "м", "к", "о", "с", "т", "ь", "А", "ч"],  # Cyrillic chars
        "description": "Contém caracteres cirílicos (russo): Ёмкость = Capacidade, А*ч = A*h"
    },
]

def test_notable_charset():
    """Testa a regex Notable charset contra os casos de teste"""
    print("=" * 70)
    print("🧪 TESTE: Notable charset indicator")
    print(f"📋 Regex: {NOTABLE_CHARSET_REGEX}")
    print("=" * 70)
    
    compiled_regex = re.compile(NOTABLE_CHARSET_REGEX)
    
    all_passed = True
    
    for test in test_cases:
        print(f"\n📝 Caso: {test['name']}")
        print(f"   Input: {test['input']}")
        print(f"   Descrição: {test['description']}")
        
        # Encontrar todos os matches
        matches = compiled_regex.findall(test['input'])
        
        print(f"\n   🔍 Matches encontrados: {matches}")
        print(f"   📊 Total de caracteres detectados: {len(matches)}")
        
        if matches:
            print(f"   ✅ DETECTADO! A regex encontrou {len(matches)} caractere(s) notável(is)")
            
            # Mostrar detalhes de cada caractere
            print("\n   📋 Detalhes dos caracteres detectados:")
            for char in matches:
                char_name = get_unicode_name(char)
                char_script = get_script(char)
                print(f"      - '{char}' (U+{ord(char):04X}) - {char_script}: {char_name}")
        else:
            print(f"   ❌ NÃO DETECTADO - nenhum caractere notável encontrado")
            all_passed = False
    
    print("\n" + "=" * 70)
    if all_passed:
        print("✅ TODOS OS TESTES PASSARAM!")
    else:
        print("❌ ALGUNS TESTES FALHARAM")
    print("=" * 70)
    
    return all_passed

def get_unicode_name(char):
    """Retorna o nome Unicode do caractere"""
    try:
        import unicodedata
        return unicodedata.name(char, "UNKNOWN")
    except:
        return "UNKNOWN"

def get_script(char):
    """Determina o script Unicode do caractere"""
    code = ord(char)
    
    # Cyrillic range
    if (0x0400 <= code <= 0x04FF or  # Cyrillic
        0x0500 <= code <= 0x052F or  # Cyrillic Supplement
        0x2DE0 <= code <= 0x2DFF or  # Cyrillic Extended-A
        0xA640 <= code <= 0xA69F):   # Cyrillic Extended-B
        return "Cyrillic (Cirílico)"
    
    # Hangul range
    if (0xAC00 <= code <= 0xD7AF or  # Hangul Syllables
        0x1100 <= code <= 0x11FF or  # Hangul Jamo
        0x3130 <= code <= 0x318F or  # Hangul Compatibility Jamo
        0xA960 <= code <= 0xA97F or  # Hangul Jamo Extended-A
        0xD7B0 <= code <= 0xD7FF):   # Hangul Jamo Extended-B
        return "Hangul (Coreano)"
    
    # Han (CJK) range
    if (0x4E00 <= code <= 0x9FFF or    # CJK Unified Ideographs
        0x3400 <= code <= 0x4DBF or    # CJK Extension A
        0x20000 <= code <= 0x2A6DF or  # CJK Extension B
        0x2A700 <= code <= 0x2B73F or  # CJK Extension C
        0x2B740 <= code <= 0x2B81F or  # CJK Extension D
        0xF900 <= code <= 0xFAFF):     # CJK Compatibility Ideographs
        return "Han (CJK/Chinês)"
    
    return "Outro"

if __name__ == "__main__":
    test_notable_charset()
