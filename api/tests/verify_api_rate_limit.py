import requests
import time
import base64

API_URL = "http://localhost:8000"

def test_api_rate_limit():
    print("🚀 Starting API Rate Limiting Verification")
    
    # Use a unique session ID for this test
    session_id = f"test_session_{int(time.time())}"
    
    # 1. Test Request Rate Limit (Free: 10 requests/hour)
    print("\n🧪 Test 1: Request Rate Limit")
    
    # We need to be careful not to hit the global limit if it exists, but here we focus on session limit
    # Assuming we are "free" user (anonymous)
    
    headers = {
        "User-Agent": "Test-Script",
        "X-Session-ID": session_id,
        "Origin": "http://localhost:3000"
    }
    
    payload = {
        "command": "Write-Host 'Hello'",
        "session_id": session_id,
        "search_type": "WEB"
    }
    
    # Make 10 allowed requests
    for i in range(10):
        response = requests.post(f"{API_URL}/evaluate", json=payload, headers=headers)
        if response.status_code == 200:
            print(f"✅ Request {i+1}: Allowed")
        else:
            print(f"❌ Request {i+1}: Failed with {response.status_code} - {response.text}")
            
    # 11th request should fail
    response = requests.post(f"{API_URL}/evaluate", json=payload, headers=headers)
    if response.status_code == 429:
        print("✅ Request 11: Blocked (429) as expected")
    else:
        print(f"❌ Request 11: NOT Blocked (Status: {response.status_code})")
        
    # 2. Test Decode Rate Limit (Free: 5 decodes/hour)
    print("\n🧪 Test 2: Decode Rate Limit")
    
    # Use a new session/user for decode test to avoid request limit
    # But wait, limits are per user/session. 
    # If we are anonymous, it tracks by session_id?
    # Let's use a new session_id
    session_id_decode = f"test_session_decode_{int(time.time())}"
    
    # Simple encoded command: Write-Host 'Decoded' -> V3JpdGUtSG9zdCAnRGVjb2RlZCc=
    encoded_cmd = base64.b64encode("Write-Host 'Decoded'".encode('utf-16le')).decode()
    command = f"powershell -EncodedCommand {encoded_cmd}"
    
    payload_decode = {
        "command": command,
        "session_id": session_id_decode,
        "search_type": "WEB"
    }
    
    headers_decode = {
        "User-Agent": "Test-Script",
        "X-Session-ID": session_id_decode,
        "Origin": "http://localhost:3000"
    }
    
    # Make 5 allowed decodes
    for i in range(5):
        response = requests.post(f"{API_URL}/evaluate", json=payload_decode, headers=headers_decode)
        if response.status_code == 200:
            data = response.json()
            analysis = data.get("analysis", {})
            decoded = analysis.get("decoded_command")
            limit_reached = analysis.get("decode_limit_reached", False)
            
            if decoded and decoded != "[PREMIUM_PROTECTED_CONTENT]":
                print(f"✅ Decode {i+1}: Success (Content visible)")
                if limit_reached:
                    print(f"⚠️ Decode {i+1}: limit_reached is True but content is visible? (Should be False)")
            else:
                print(f"❌ Decode {i+1}: Content masked or missing (decoded: {decoded})")
        else:
            print(f"❌ Decode {i+1}: Failed with {response.status_code}")
            
    # 6th decode should have content masked and flag set
    response = requests.post(f"{API_URL}/evaluate", json=payload_decode, headers=headers_decode)
    if response.status_code == 200:
        data = response.json()
        analysis = data.get("analysis", {})
        decoded = analysis.get("decoded_command")
        limit_reached = analysis.get("decode_limit_reached", False)
        
        if decoded == "[PREMIUM_PROTECTED_CONTENT]":
            print("✅ Decode 6: Content masked as expected")
            if limit_reached:
                print("✅ Decode 6: decode_limit_reached flag is True")
            else:
                print("❌ Decode 6: decode_limit_reached flag is False")
        else:
            print(f"❌ Decode 6: Content NOT masked (decoded: {decoded})")
    else:
        print(f"❌ Decode 6: Failed with {response.status_code}")

if __name__ == "__main__":
    try:
        test_api_rate_limit()
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
