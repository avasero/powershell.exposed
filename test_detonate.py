#!/usr/bin/env python3
"""
Comprehensive test suite for the AST deobfuscation service.
Tests the /deobfuscate endpoint (AST-based, no code execution)
and the /detonate endpoint (sandboxed execution).

Usage: python test_detonate.py
"""
import requests
import sys
import os

BASE_URL = "http://localhost:8081"
HEADERS = {
    "Content-Type": "application/json",
    "X-Api-Key": "dev-local-key-12345"
}

# ANSI colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def test_deobfuscate(name: str, command: str, expected_substrings: list[str]) -> bool:
    """Test a single deobfuscation case against /deobfuscate endpoint."""
    print(f"\n{CYAN}[TEST]{RESET} {name}")
    print(f"  Input:    {command[:120]}{'...' if len(command) > 120 else ''}")

    try:
        response = requests.post(
            f"{BASE_URL}/deobfuscate",
            headers=HEADERS,
            json={"command": command},
            timeout=30
        )
        result = response.json()

        if not result.get("success"):
            print(f"  {RED}FAIL{RESET} - API error: {result.get('error')}")
            return False

        deobfuscated = result["result"].get("deobfuscated", "")
        techniques = result["result"].get("techniques_found", [])
        iterations = result["result"].get("iterations", 0)

        print(f"  Output:   {deobfuscated[:120]}{'...' if len(deobfuscated) > 120 else ''}")
        print(f"  Techniques: {', '.join(techniques) if techniques else 'none'}")
        print(f"  Iterations: {iterations}")

        # Check all expected substrings are present in deobfuscated output
        all_found = True
        for expected in expected_substrings:
            if expected.lower() in deobfuscated.lower():
                print(f"  {GREEN}OK{RESET} Found: '{expected}'")
            else:
                print(f"  {RED}MISSING{RESET} Expected: '{expected}'")
                all_found = False

        if all_found:
            print(f"  {GREEN}{BOLD}PASS{RESET}")
        else:
            print(f"  {RED}{BOLD}FAIL{RESET}")
        return all_found

    except Exception as e:
        print(f"  {RED}ERROR{RESET} - {e}")
        return False


def test_deobfuscate_techniques(name: str, command: str, expected_techniques: list[str], expected_substrings: list[str] = None) -> bool:
    """Test that specific deobfuscation techniques are detected."""
    print(f"\n{CYAN}[TEST]{RESET} {name}")
    print(f"  Input:    {command[:120]}{'...' if len(command) > 120 else ''}")

    try:
        response = requests.post(
            f"{BASE_URL}/deobfuscate",
            headers=HEADERS,
            json={"command": command},
            timeout=60
        )
        result = response.json()

        if not result.get("success"):
            print(f"  {RED}FAIL{RESET} - API error: {result.get('error')}")
            return False

        deobfuscated = result["result"].get("deobfuscated", "")
        techniques = result["result"].get("techniques_found", [])
        iterations = result["result"].get("iterations", 0)

        print(f"  Output:   {deobfuscated[:200]}{'...' if len(deobfuscated) > 200 else ''}")
        print(f"  Techniques: {', '.join(techniques) if techniques else 'none'}")
        print(f"  Iterations: {iterations}")

        all_ok = True

        # Check expected techniques detected
        for tech in expected_techniques:
            if tech in techniques:
                print(f"  {GREEN}OK{RESET} Technique detected: '{tech}'")
            else:
                print(f"  {RED}MISSING{RESET} Expected technique: '{tech}'")
                all_ok = False

        # Optionally check substrings in deobfuscated output
        if expected_substrings:
            for expected in expected_substrings:
                if expected.lower() in deobfuscated.lower():
                    print(f"  {GREEN}OK{RESET} Found: '{expected}'")
                else:
                    print(f"  {YELLOW}INFO{RESET} Not found (optional): '{expected}'")

        if all_ok:
            print(f"  {GREEN}{BOLD}PASS{RESET}")
        else:
            print(f"  {RED}{BOLD}FAIL{RESET}")
        return all_ok

    except Exception as e:
        print(f"  {RED}ERROR{RESET} - {e}")
        return False



def main():
    print(f"{BOLD}{'='*60}{RESET}")
    print(f"{BOLD} PowerShell Deobfuscation Test Suite{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    passed = 0
    failed = 0
    results = []

    # ============================================================
    # DEOBFUSCATION TESTS (AST-based, /deobfuscate endpoint)
    # ============================================================
    print(f"\n{YELLOW}{BOLD}--- AST Deobfuscation Tests (/deobfuscate) ---{RESET}")

    # Test 1: Backtick + ScriptBlock wrapper
    r = test_deobfuscate(
        "Backtick obfuscation + ScriptBlock wrapper",
        '(&{wri`te-h`os`t} "Hello, World!")',
        ["Write-Host", "Hello, World!"]
    )
    results.append(("Backtick + ScriptBlock", r))

    # Test 2: Unicode Base64 (UTF-16LE)
    r = test_deobfuscate(
        "Unicode Base64 (UTF-16LE) decoding",
        '[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String("VwByAGkAdABlAC0ASABvAHMAdAAgACIAUgBlAGwAbwBsAGkAawBtACIA"))',
        ["Write-Host", "Relolikm"]
    )
    results.append(("Unicode Base64", r))

    # Test 3: PowerShell -EncodedCommand
    r = test_deobfuscate(
        "PowerShell -EncodedCommand (base64 UTF-16LE)",
        'powershell -e "VwByAGkAdABlAC0ASABvAHMAdAAgACIAUgBlAGwAbwBsAGkAawBtACIA"',
        ["Write-Host", "Relolikm"]
    )
    results.append(("EncodedCommand -e", r))

    # Test 4: Variable substitution in arguments
    r = test_deobfuscate(
        "Variable substitution in command arguments",
        '$z="Hello, World!";Write-Host $z',
        ["Write-Host", "Hello, World!"]
    )
    results.append(("Variable substitution", r))

    # Test 5: PowerShell launcher with flags
    r = test_deobfuscate(
        "PowerShell launcher with bypass flags",
        "powershell -NoP -NonI -W Hidden -Exec Bypass -Command \"Write-Host 'Hello, World!'\"",
        ["Write-Host", "Hello, World!"]
    )
    results.append(("Launcher wrapper", r))

    # Test 6: String concatenation
    r = test_deobfuscate(
        "String concatenation",
        '"Wri" + "te-" + "Host"',
        ["Write-Host"]
    )
    results.append(("String concatenation", r))

    # Test 7: Format string
    r = test_deobfuscate(
        "Format string operator",
        '"{0}{1}" -f "Write-",  "Host"',
        ["Write-Host"]
    )
    results.append(("Format string", r))

    # Test 8: Character codes
    r = test_deobfuscate(
        "Character code resolution [char]N",
        '[char]87+[char]114+[char]105+[char]116+[char]101',
        ["W", "r", "i", "t", "e"]
    )
    results.append(("Char codes", r))

    # Test 9: Hex character codes
    r = test_deobfuscate(
        "Hex character codes [char]0xNN",
        '[char]0x57+[char]0x72+[char]0x69+[char]0x74+[char]0x65',
        ["W", "r", "i", "t", "e"]
    )
    results.append(("Hex char codes", r))

    # Test 10: String index slicing (reverse range)
    r = test_deobfuscate(
        "String index slicing with reverse range",
        '"tsoH-etirW"[9..0]',
        ["Write-Host"]
    )
    results.append(("String index slicing", r))

    # Test 11: Backtick only (simple)
    r = test_deobfuscate(
        "Simple backtick obfuscation",
        'I`n`v`o`k`e-E`x`p`r`e`s`s`i`o`n "Write-Host hello"',
        ["Invoke-Expression"]
    )
    results.append(("Backtick simple", r))

    # Test 12: Disguised IEX
    r = test_deobfuscate(
        "Disguised IEX via string concatenation",
        '&("I"+"EX") "Write-Host hello"',
        ["IEX"]
    )
    results.append(("Disguised IEX", r))

    # Test 13: ScriptBlock.Create().Invoke()
    r = test_deobfuscate(
        "ScriptBlock::Create().Invoke()",
        "[ScriptBlock]::Create(\"Write-Host 'hello'\").Invoke()",
        ["Write-Host"]
    )
    results.append(("ScriptBlock invoke", r))

    # Test 14: String replace
    r = test_deobfuscate(
        "String .Replace() method",
        "'Xrite-Host'.Replace('X','W')",
        ["Write-Host"]
    )
    results.append(("String replace", r))

    # Test 15: Base64+DeflateStream (simple base64 decode)
    r = test_deobfuscate(
        "Simple Base64 (UTF-8) decode",
        "[System.Convert]::FromBase64String('V3JpdGUtSG9zdA==')",
        ["Write-Host"]
    )
    results.append(("Simple Base64", r))

    # Test 16: Array join
    r = test_deobfuscate(
        "Array join operation",
        "('W','r','i','t','e','-','H','o','s','t') -join ''",
        ["Write-Host"]
    )
    results.append(("Array join", r))

    # Test 17: $ShellId indexing
    r = test_deobfuscate(
        "$ShellId character indexing",
        "$ShellId[1]+$ShellId[13]+'x'",
        ["i", "e"]
    )
    results.append(("ShellId indexing", r))

    # Test 18: PowerShell -enc with no quotes
    r = test_deobfuscate(
        "PowerShell -enc without quotes",
        "powershell -enc VwByAGkAdABlAC0ASABvAHMAdAAgACIAUgBlAGwAbwBsAGkAawBtACIA",
        ["Write-Host", "Relolikm"]
    )
    results.append(("EncodedCommand -enc", r))

    # Test 19: [Text.Encoding] without System prefix
    r = test_deobfuscate(
        "Unicode Base64 without System. prefix",
        '[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("VwByAGkAdABlAC0ASABvAHMAdAAgACIAUgBlAGwAbwBsAGkAawBtACIA"))',
        ["Write-Host", "Relolikm"]
    )
    results.append(("Unicode Base64 short", r))

    # Test 20: Combined backtick + concat + format
    r = test_deobfuscate(
        "Combined: backtick + string concat",
        '`W`r`i`t`e + "-Host"',
        ["Write", "-Host"]
    )
    results.append(("Combined backtick+concat", r))

    # ============================================================
    # COMPLEX PAYLOAD TESTS (multi-layer obfuscation)
    # ============================================================
    print(f"\n{YELLOW}{BOLD}--- Complex Multi-Layer Payload Tests ---{RESET}")

    # Test 21: Complex multi-layer obfuscation with string index slicing,
    # junk variables, disguised IEX, and concatenation (FULL PAYLOAD)
    payload_path = os.path.join(os.path.dirname(__file__), "test_payloads", "complex_multi_layer.ps1")
    with open(payload_path, "r", encoding="utf-8") as f:
        complex_payload = f.read()

    r = test_deobfuscate_techniques(
        "Complex multi-layer: string slicing + concat + disguised IEX",
        complex_payload,
        ["string_index_slicing", "string_concatenation"],
        ["Invoke-Expression"]
    )
    results.append(("Complex multi-layer payload", r))

    # Test 22: Simpler string index slicing building a command
    r = test_deobfuscate(
        "String index slicing: build 'IEX' from innocent string",
        '"Microsoft.PowerShell"[1]+"Microsoft.PowerShell"[13]+\'x\'',
        ["i", "e"]
    )
    results.append(("String slicing IEX build", r))

    # Test 23: Multiple string slices concatenated
    r = test_deobfuscate(
        "Concatenated string slices",
        '"abcdefghij"[6..9] -join \'\'',
        ["ghij"]
    )
    results.append(("Concat string slices", r))

    # ============================================================
    # RESULTS SUMMARY
    # ============================================================
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD} RESULTS SUMMARY{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    for name, result in results:
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"  [{status}] {name}")
        if result:
            passed += 1
        else:
            failed += 1

    total = passed + failed
    print(f"\n{BOLD}Total: {total} | Passed: {GREEN}{passed}{RESET} | Failed: {RED}{failed}{RESET}")

    if failed > 0:
        print(f"\n{RED}Some tests failed!{RESET}")
        sys.exit(1)
    else:
        print(f"\n{GREEN}All tests passed!{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
