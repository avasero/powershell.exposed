"""
Test file para validar detecção de dupla codificação com payload real
"""
import sys
import base64
sys.path.insert(0, '../api')

from services.powershell_analyzer import (
    detect_encoded_command,
    detect_double_encoded_command,
    normalize_powershell_command,
    deobfuscate_powershell
)


def decode_base64_utf16(encoded_str):
    """Decodifica Base64 UTF-16LE (padrão PowerShell)"""
    try:
        decoded_bytes = base64.b64decode(encoded_str)
        return decoded_bytes.decode('utf-16-le', errors='ignore')
    except Exception as e:
        print(f"Error decoding: {e}")
        return None


def test_real_double_encoded_payload():
    """Testa com o payload real fornecido"""
    print("\n" + "="*80)
    print("TEST: Real Double Encoded PowerShell Command")
    print("="*80)
    
    # Comando original com dupla codificação
    original_command = 'powershell -EncodedCommand cABvAHcAZQByAHMAaABlAGwAbAAgAC0ARQBuAGMAbwBkAGUAZABDAG8AbQBtAGEAbgBkACAAVgB3AEIAeQBBAEcAawBBAGQAQQBCAGwAQQBDADAAQQBTAEEAQgB2AEEASABNAEEAZABBAEEAZwBBAEMASQBBAFMAQQBCAGwAQQBHAHcAQQBiAEEAQgB2AEEAQwBBAEEAWgBnAEIAeQBBAEcAOABBAGIAUQBBAGcAQQBHADQAQQBaAFEAQgB6AEEASABRAEEAWgBRAEIAawBBAEMAQQBBAFIAUQBCAHUAQQBHAE0AQQBiAHcAQgBrAEEARwBVAEEAWgBBAEIARABBAEcAOABBAGIAUQBCAHQAQQBHAEUAQQBiAGcAQgBrAEEAQwBFAEEASQBnAEEAPQA='
    
    print(f"\n[Step 1] Original Command:")
    print(f"  {original_command[:100]}...")
    print(f"  Length: {len(original_command)} chars")
    
    # Step 2: Detectar primeiro nível de encoding
    print(f"\n[Step 2] Detecting first-level encoding:")
    first_encoding = detect_encoded_command(original_command)
    print(f"  Is Encoded: {first_encoding['is_encoded']}")
    print(f"  Type: {first_encoding['type']}")
    print(f"  Indicator: {first_encoding['indicator']}")
    
    if first_encoding['is_encoded']:
        print(f"  ✅ First-level encoding DETECTED")
    else:
        print(f"  ❌ First-level encoding NOT detected")
        return
    
    # Step 3: Deobfuscate/decode
    print(f"\n[Step 3] Deobfuscating command:")
    deobfuscated = deobfuscate_powershell(original_command)
    print(f"  Deobfuscated: {deobfuscated[:100]}...")
    print(f"  Length: {len(deobfuscated)} chars")
    
    # Step 4: Manual decode of the payload
    print(f"\n[Step 4] Manual Base64 decoding of payload:")

    # Extrair o payload Base64
    import regex
    match = regex.search(r'-EncodedCommand\s+([A-Za-z0-9+/=]+)', original_command)
    if match:
        payload_b64 = match.group(1)
        print(f"  Extracted payload (first 50 chars): {payload_b64[:50]}...")
        
        decoded_payload = decode_base64_utf16(payload_b64)
        if decoded_payload:
            print(f"  Decoded payload: {decoded_payload[:100]}...")
            print(f"  Decoded length: {len(decoded_payload)} chars")
            
            # Verificar se o payload decodificado contém OUTRO -EncodedCommand
            if '-EncodedCommand' in decoded_payload or '-enc' in decoded_payload:
                print(f"  🎯 SECOND LEVEL ENCODING DETECTED in decoded payload!")
            else:
                print(f"  No second level encoding in decoded payload")
    
    # Step 5: Detectar dupla codificação
    print(f"\n[Step 5] Detecting double encoding:")
    double_encoding = detect_double_encoded_command(original_command, deobfuscated)
    print(f"  Is Double Encoded: {double_encoding['is_double_encoded']}")
    print(f"  Encoding Layers: {double_encoding['encoding_layers']}")
    print(f"  Indicator: {double_encoding['indicator']}")
    
    if double_encoding['is_double_encoded']:
        print(f"  ✅ DOUBLE ENCODING DETECTED - Attack Pattern Identified!")
        print(f"  ⚠️  This is a highly suspicious command!")
        return True
    else:
        print(f"  ⚠️  Double encoding NOT detected with current method")
        return False


def test_layer_analysis():
    """Analisa camadas de encoding"""
    print("\n" + "="*80)
    print("TEST: Layer-by-Layer Analysis")
    print("="*80)
    
    original_command = 'powershell -EncodedCommand cABvAHcAZQByAHMAaABlAGwAbAAgAC0ARQBuAGMAbwBkAGUAZABDAG8AbQBtAGEAbgBkACAAVgB3AEIAeQBBAEcAawBBAGQAQQBCAGwAQQBDADAAQQBTAEEAQgB2AEEASABNAEEAZABBAEEAZwBBAEMASQBBAFMAQQBCAGwAQQBHAHcAQQBiAEEAQgB2AEEAQwBBAEEAWgBnAEIAeQBBAEcAOABBAGIAUQBBAGcAQQBHADQAQQBaAFEAQgB6AEEASABRAEEAWgBRAEIAawBBAEMAQQBBAFIAUQBCAHUAQQBHAE0AQQBiAHcAQgBrAEEARwBVAEEAWgBBAEIARABBAEcAOABBAGIAUQBCAHQAQQBHAEUAQQBiAGcAQgBrAEEAQwBFAEEASQBnAEEAPQA='
    
    import regex
    layer = 1
    current_cmd = original_command

    while layer <= 3:  # Máximo 3 camadas
        print(f"\n[Layer {layer}]")
        print(f"  Command: {current_cmd[:80]}...")

        # Procurar por -EncodedCommand ou -enc
        if '-EncodedCommand' in current_cmd or '-enc' in current_cmd:
            print(f"  ✅ Found -EncodedCommand/-enc parameter")

            # Extrair payload
            match = regex.search(r'-(?:EncodedCommand|enc)\s+([A-Za-z0-9+/=]+)', current_cmd, regex.IGNORECASE)
            if match:
                payload_b64 = match.group(1)
                print(f"  Base64 payload (first 50 chars): {payload_b64[:50]}...")
                
                # Decodificar
                try:
                    decoded = decode_base64_utf16(payload_b64)
                    if decoded:
                        print(f"  Decoded: {decoded[:80]}...")
                        current_cmd = decoded
                        layer += 1
                    else:
                        print(f"  ❌ Failed to decode")
                        break
                except Exception as e:
                    print(f"  ❌ Error: {e}")
                    break
            else:
                print(f"  ❌ Could not extract payload")
                break
        elif regex.search(r'\[Convert\]::FromBase64String|\.FromBase64String', current_cmd, regex.IGNORECASE):
            print(f"  ✅ Found FromBase64String call")
            # Procurar por strings Base64 após FromBase64String
            match = regex.search(r"FromBase64String\(['\"]([A-Za-z0-9+/=]+)['\"]", current_cmd, regex.IGNORECASE)
            if match:
                payload_b64 = match.group(1)
                print(f"  Base64 payload (first 50 chars): {payload_b64[:50]}...")
                
                try:
                    # Tentar ambos UTF-16LE e UTF-8
                    try:
                        decoded = base64.b64decode(payload_b64).decode('utf-16-le', errors='ignore')
                    except:
                        decoded = base64.b64decode(payload_b64).decode('utf-8', errors='ignore')
                    
                    if decoded and len(decoded) > 5:
                        print(f"  Decoded: {decoded[:80]}...")
                        current_cmd = decoded
                        layer += 1
                    else:
                        print(f"  ❌ Failed to decode")
                        break
                except Exception as e:
                    print(f"  ❌ Error: {e}")
                    break
            else:
                print(f"  ❌ Could not extract payload")
                break
        else:
            print(f"  ⏹️ No encoding detected at this layer")
            break
    
    print(f"\n[Result] Total layers detected: {layer - 1}")
    if layer - 1 >= 2:
        print(f"🎯 DOUBLE ENCODING CONFIRMED!")
        return True
    else:
        print(f"Single encoding detected")
        return False


def main():
    """Executa todos os testes"""
    print("\n" + "╔" + "="*78 + "╗")
    print("║" + " "*15 + "REAL DOUBLE ENCODED PAYLOAD VALIDATION" + " "*25 + "║")
    print("╚" + "="*78 + "╝")
    
    try:
        result1 = test_real_double_encoded_payload()
        result2 = test_layer_analysis()
        
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Test 1 (Double Encoding Detection): {'✅ PASSED' if result1 else '⚠️  NEEDS IMPROVEMENT'}")
        print(f"Test 2 (Layer Analysis): {'✅ PASSED' if result2 else '⚠️  NEEDS IMPROVEMENT'}")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
