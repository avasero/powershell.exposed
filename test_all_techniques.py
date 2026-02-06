#!/usr/bin/env python3
"""
Test all PowerShell deobfuscation techniques
"""
import requests
import json

url = "http://localhost:8081/deobfuscate"
headers = {
    "Content-Type": "application/json",
    "X-Api-Key": "dev-local-key-12345"
}

# Test cases for each obfuscation technique
test_cases = [
    {
        "name": "1. Character codes (decimal)",
        "command": "[char]72 + [char]101 + [char]108 + [char]108 + [char]111",
        "expected_contains": "Hello",
    },
    {
        "name": "2. Character codes (hex)",
        "command": "[char]0x48 + [char]0x65 + [char]0x6C + [char]0x6C + [char]0x6F",
        "expected_contains": "Hello",
    },
    {
        "name": "3. Base conversion (octal)",
        "command": "[char]([convert]::ToInt32('110',8)) + [char]([convert]::ToInt32('145',8))",
        "expected_contains": "He",
    },
    {
        "name": "4. Simple Base64",
        "command": "[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('SGVsbG8gV29ybGQ='))",
        "expected_contains": "Hello World",
    },
    {
        "name": "5. Disguised IEX (concatenation)",
        "command": '''&("I"+"EX") "Write-Output 'Hello'"''',
        "expected_contains": "IEX",
    },
    {
        "name": "6. String replace cascading",
        "command": "'XHXeXlXlXoX'.Replace('X','')",
        "expected_contains": "Hello",
    },
    {
        "name": "7. Tick obfuscation",
        "command": "Wr`it`e-Ou`tp`ut 'Hello'",
        "expected_contains": "Write-Output",
    },
    {
        "name": "8. Format string",
        "command": '"{0}{1}{2}" -f "Hel","lo"," World"',
        "expected_contains": "Hello World",
    },
    {
        "name": "9. $ShellId indexing",
        "command": "$ShellId[1]+$ShellId[13]+'x'",
        "expected_contains": "iex",
    },
    {
        "name": "10. ScriptBlock invoke",
        "command": "[ScriptBlock]::Create(\"Write-Output 'Hello'\").Invoke()",
        "expected_contains": "Write-Output 'Hello'",
    },
    {
        "name": "11. Redundant ToString",
        "command": "('Hello').ToString()",
        "expected_contains": "Hello",
    },
    {
        "name": "12. Array join",
        "command": "('H','e','l','l','o') -join ''",
        "expected_contains": "Hello",
    },
]

def test_technique(test_case):
    """Test a single obfuscation technique"""
    payload = {"command": test_case["command"]}
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        result = response.json()
        
        if not result.get("success"):
            return False, f"API error: {result.get('error')}"
        
        deobfuscated = result["result"]["deobfuscated"]
        techniques = result["result"].get("techniques_found", [])
        
        # Check if expected content is in the result
        expected = test_case["expected_contains"]
        if expected.lower() in deobfuscated.lower():
            return True, f"✅ Found '{expected}' | Techniques: {techniques}"
        else:
            return False, f"❌ Expected '{expected}' not found in:\n   {deobfuscated[:100]}..."
            
    except Exception as e:
        return False, f"Exception: {e}"

def main():
    print("=" * 60)
    print("PowerShell Deobfuscation Techniques Test Suite")
    print("=" * 60)
    print()
    
    passed = 0
    failed = 0
    
    for test_case in test_cases:
        print(f"Testing: {test_case['name']}")
        print(f"  Input: {test_case['command'][:60]}...")
        
        success, message = test_technique(test_case)
        print(f"  {message}")
        print()
        
        if success:
            passed += 1
        else:
            failed += 1
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
