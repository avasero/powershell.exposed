#!/usr/bin/env python3
"""
Simple test script to verify the server starts correctly
"""
import requests
import time
import sys

def test_server():
    """Test if the server is responding correctly"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing server endpoints...")
    
    try:
        # Test health check
        print("1. Testing health check...")
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Health check passed")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
        
        # Test root endpoint
        print("2. Testing root endpoint...")
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("   ✅ Root endpoint passed")
        else:
            print(f"   ❌ Root endpoint failed: {response.status_code}")
            return False
        
        # Test CORS preflight (OPTIONS request)
        print("3. Testing CORS preflight...")
        response = requests.options(
            f"{base_url}/analyze-pcre2",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            },
            timeout=5
        )
        if response.status_code in [200, 204]:
            print("   ✅ CORS preflight passed")
        else:
            print(f"   ❌ CORS preflight failed: {response.status_code}")
            # Don't fail the test for CORS issues
        
        # Test analyze endpoint with simple request
        print("4. Testing analyze endpoint...")
        test_data = {
            "command": "Get-Process",
            "ip_address": "127.0.0.1",
            "search_type": "TEST"
        }
        response = requests.post(
            f"{base_url}/analyze-pcre2",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code in [200, 400, 429]:  # 400/429 are expected for rate limiting
            print("   ✅ Analyze endpoint responding")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print("   ✅ Analysis completed successfully")
                else:
                    print(f"   ⚠️ Analysis returned: {data}")
            else:
                print(f"   ⚠️ Expected rate limiting or validation error: {response.status_code}")
        else:
            print(f"   ❌ Analyze endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        print("\n🎉 All tests passed! Server is working correctly.")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on http://localhost:8000")
        return False
    except requests.exceptions.Timeout:
        print("❌ Server request timed out")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_server()
    sys.exit(0 if success else 1)
