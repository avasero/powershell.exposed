import urllib.request
import json
import sys

# Generate a command larger than 10,000 characters but less than 100,000
large_command = "A" * 15000

url = "http://localhost:8000/evaluate"
payload = {
    "command": large_command,
    "search_type": "WEB"
}

data = json.dumps(payload).encode('utf-8')
headers = {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

req = urllib.request.Request(url, data=data, headers=headers)

try:
    print(f"Sending request with {len(large_command)} characters...")
    with urllib.request.urlopen(req) as response:
        status_code = response.getcode()
        response_body = response.read().decode('utf-8')
        print(f"Status Code: {status_code}")
        # print(f"Response: {response_body}") # Commented out to avoid spamming output
        
        if status_code == 200:
            print("SUCCESS: Request accepted (Fix verified)")
        else:
            print(f"FAILURE: Request failed with status {status_code}")

except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    response_body = e.read().decode('utf-8')
    print(f"Response: {response_body}")
    print(f"FAILURE: Request rejected (Fix NOT verified)")

except Exception as e:
    print(f"Error: {e}")
