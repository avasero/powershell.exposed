"""
Test file para validar detecção de comandos codificados e dupla codificação
"""
import sys
import base64
sys.path.insert(0, '../api')

from services.powershell_analyzer import (
    detect_encoded_command,
    detect_double_encoded_command,
    normalize_powershell_command
)


def test_encoded_command_detection():
    """Testa detecção de comando codificado"""
    print("\n" + "="*80)
    print("TEST 1: Encoded Command Detection")
    print("="*80)
    
    test_cases = [
        {
            "name": "PowerShell -EncodedCommand parameter",
            "command": "powershell.exe -EncodedCommand JABjAG8AbQBtAGEAbgBkACAAPQAgACcAYwBhAGwAYwAnAA==",
            "should_detect": True
        },
        {
            "name": "PowerShell -enc shorthand",
            "command": "powershell -enc JABjAG8AbQBtAGEAbgBkACAAPQAgACcAYwBhAGwAYwAnAA==",
            "should_detect": True
        },
        {
            "name": "Base64 FromBase64String",
            "command": "[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('V3JpdGUtSG9zdCAiSGVsbG8gV29ybGQi'))",
            "should_detect": True
        },
        {
            "name": "Plain text command",
            "command": "Get-Process | Where-Object {$_.Name -eq 'calc.exe'}",
            "should_detect": False
        },
        {
            "name": "IEX with Base64",
            "command": "IEX([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('R2V0LVByb2Nlc3M=')))",
            "should_detect": True
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[Test 1.{i}] {test['name']}")
        print(f"Command: {test['command'][:80]}...")
        
        result = detect_encoded_command(test['command'])
        is_encoded = result['is_encoded']
        
        status = "✅ PASS" if is_encoded == test['should_detect'] else "❌ FAIL"
        print(f"Result: {status}")
        print(f"  Encoded: {is_encoded}")
        print(f"  Type: {result['type']}")
        print(f"  Indicator: {result['indicator']}")


def test_double_encoded_command_detection():
    """Testa detecção de dupla codificação"""
    print("\n" + "="*80)
    print("TEST 2: Double Encoded Command Detection")
    print("="*80)
    
    # Criar comandos dupla codificados para teste
    original_cmd = "calc.exe"
    
    # Primeira codificação
    first_encoded = base64.b64encode(original_cmd.encode()).decode()
    
    # Segunda codificação
    second_encoded = base64.b64encode(first_encoded.encode()).decode()
    
    # Comando PowerShell duplo codificado
    double_encoded_cmd = f"[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String(\"{second_encoded}\"))'))\")"
    
    test_cases = [
        {
            "name": "Double Base64 encoding",
            "command": double_encoded_cmd,
            "decoded": f"[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String(\"{first_encoded}\"))",
            "should_detect": True
        },
        {
            "name": "Single Base64 encoding",
            "command": f"[System.Convert]::FromBase64String('{first_encoded}')",
            "decoded": original_cmd,
            "should_detect": False
        },
        {
            "name": "Multiple FromBase64String calls",
            "command": "[Convert]::FromBase64String([Convert]::FromBase64String('SGVsbG8='))",
            "decoded": "[Convert]::FromBase64String('SGVsbG8=')",
            "should_detect": True
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[Test 2.{i}] {test['name']}")
        print(f"Command: {test['command'][:80]}...")
        print(f"Decoded: {test['decoded'][:80]}...")
        
        result = detect_double_encoded_command(test['command'], test['decoded'])
        is_double_encoded = result['is_double_encoded']
        
        status = "✅ PASS" if is_double_encoded == test['should_detect'] else "❌ FAIL"
        print(f"Result: {status}")
        print(f"  Double Encoded: {is_double_encoded}")
        print(f"  Layers: {result['encoding_layers']}")
        print(f"  Indicator: {result['indicator']}")


def test_combined_scenarios():
    """Testa cenários combinados de obfuscação e codificação"""
    print("\n" + "="*80)
    print("TEST 3: Combined Scenarios")
    print("="*80)
    
    test_cases = [
        {
            "name": "Encoded + Obfuscated",
            "command": "powershell -enc JABjAG8AbQBtAGEAbgBkACAAPQAgACcAYwBhAGwAYwAnADsgJHwcAG8AbQBtAGEAbgBkAA==",
            "desc": "Command with both encoding and obfuscation"
        },
        {
            "name": "IEX + Encoded + Base64",
            "command": "IEX ([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('VwByAGkAdABlAC0ASABvAHMAdAAgACIASABlAGwAbABvACIA')))",
            "desc": "IEX with encoded Base64 payload"
        },
        {
            "name": "Realistic attack pattern",
            "command": "powershell -w hidden -enc JABjAGwAaQBlAG4AdAAgAD0AIABOZWCAK",
            "desc": "Real-world obfuscated attack"
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[Test 3.{i}] {test['name']}")
        print(f"Description: {test['desc']}")
        print(f"Command: {test['command'][:80]}...")
        
        encoding_result = detect_encoded_command(test['command'])
        print(f"  Encoding Detected: {encoding_result['is_encoded']}")
        if encoding_result['is_encoded']:
            print(f"    Type: {encoding_result['type']}")
            print(f"    Indicator: {encoding_result['indicator']}")


def main():
    """Executa todos os testes"""
    print("\n" + "╔" + "="*78 + "╗")
    print("║" + " "*20 + "ENCODING DETECTION TEST SUITE" + " "*30 + "║")
    print("╚" + "="*78 + "╝")
    
    try:
        test_encoded_command_detection()
        test_double_encoded_command_detection()
        test_combined_scenarios()
        
        print("\n" + "="*80)
        print("ALL TESTS COMPLETED")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
