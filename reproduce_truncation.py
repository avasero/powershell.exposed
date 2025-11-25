import urllib.request
import json
import base64

# Create a long string and encode it
original_text = "A" * 1000
encoded_bytes = base64.b64encode(original_text.encode('utf-16-le'))
encoded_str = encoded_bytes.decode('ascii')

command = f"powershell -EncodedCommand {encoded_str}"

url = "http://localhost:8000/evaluate"
payload = {
    "command": command,
    "search_type": "WEB"
}

data = json.dumps(payload).encode('utf-8')
headers = {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:3000',
    'User-Agent': 'Mozilla/5.0'
}

req = urllib.request.Request(url, data=data, headers=headers)

try:
    print(f"Sending request with encoded command...")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        
        if data.get("success"):
            decoded = data["analysis"].get("decoded_command")
            print(f"Decoded length: {len(decoded) if decoded else 0}")
            
            if decoded and len(decoded) == 1000:
                print("SUCCESS: Decoded command is complete")
            elif decoded and len(decoded) == 150:
                print("FAILURE: Decoded command is truncated to 150 chars")
            else:
                print(f"FAILURE: Unexpected decoded length: {len(decoded) if decoded else 0}")
        else:
            print(f"FAILURE: Analysis failed: {data.get('error')}")

except Exception as e:
    print(f"Error: {e}")
