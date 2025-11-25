import urllib.request
import json
import sys

# Generate a command larger than 10,000 characters
large_command = "A" * 10001

url = "http://localhost:8000/evaluate"
payload = {
    "command": large_command,
    "search_type": "WEB" # Changed to WEB to match frontend behavior
}

data = json.dumps(payload).encode('utf-8')
headers = {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000', # Added Origin header to bypass middleware
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' # Added browser UA
}

req = urllib.request.Request(url, data=data, headers=headers)

try:
    print(f"Sending request with {len(large_command)} characters...")
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print(f"Response: {response.read().decode('utf-8')}")
        print("FAILURE: Issue NOT reproduced (Request succeeded unexpectedly)")

except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    response_body = e.read().decode('utf-8')
    print(f"Response: {response_body}")
    
    if e.code == 400 and "Command must be less than 10000 characters" in response_body:
        print("SUCCESS: Issue reproduced (Request rejected as expected)")
    elif e.code == 422: # Validation error from Pydantic
        print("SUCCESS: Issue reproduced (Validation error caught)")
    else:
        print(f"FAILURE: Issue NOT reproduced (Request failed with unexpected error: {e.code})")

except Exception as e:
    print(f"Error: {e}")
