#!/usr/bin/env python3
"""
Manual test for the /deobfuscate endpoint.
Edit the COMMAND variable below with your input, then run: python test_deobfuscate_manual.py
"""
import requests
import json

BASE_URL = "http://localhost:8081"
HEADERS = {
    "Content-Type": "application/json",
    "X-Api-Key": "avasero220949"
}

# ========================================
# PUT YOUR POWERSHELL COMMAND HERE:
# ========================================
COMMAND = r"""
(&{wri`te-h`os`t} “Hello, World!”)
""".strip()


response = requests.post(
    f"{BASE_URL}/deobfuscate",
    headers=HEADERS,
    json={"command": COMMAND},
    timeout=60
)
result = response.json()

print(f"Input:  {COMMAND[:200]}{'...' if len(COMMAND) > 200 else ''}")
print()

if not result.get("success"):
    print(f"ERROR: {result.get('error')}")
else:
    r = result["result"]
    print(f"Output: {r.get('deobfuscated', '')}")
    print(f"Techniques: {', '.join(r.get('techniques_found', [])) or 'none'}")
    print(f"Iterations: {r.get('iterations', 0)}")
    if r.get("transformations"):
        print(f"\nTransformations:")
        for t in r["transformations"]:
            print(f"  [{t.get('iteration')}] {t.get('technique')}")
            print(f"    before: {t.get('before', '')[:150]}")
            print(f"    after:  {t.get('after', '')[:150]}")
