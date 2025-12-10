import urllib.request
import json
import sys

# The user provided a large input (content of main.py). 
# I will simulate a large input similar to that.
large_input = """
import os
import sys


sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


try:
    from models.schemas import AnalyzeCommandResponse, ErrorResponse, RateLimitResponse, UserCommandEvaluationsResponse
except ImportError:
    AnalyzeCommandResponse = dict
    ErrorResponse = dict  
    RateLimitResponse = dict
    UserCommandEvaluationsResponse = dict

API_TITLE = "powerShell.exposed API"
API_DESCRIPTION = \"\"\"
## PowerShell Security Analysis API

A comprehensive REST API for analyzing powerShell commands and detecting potential security threats.
\"\"\"
API_VERSION = "1.0.0"

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)
""" * 110

url = "http://localhost:8000/evaluate"
payload = {
    "command": large_input,
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
    print(f"Sending request with {len(large_input)} characters...")
    with urllib.request.urlopen(req) as response:
        status_code = response.getcode()
        response_body = response.read().decode('utf-8')
        print(f"Status Code: {status_code}")
        print(f"Response: {response_body[:500]}...") # Print first 500 chars
        
        if status_code == 200:
            data = json.loads(response_body)
            if data.get("success"):
                print("SUCCESS: Analysis successful")
            else:
                print(f"FAILURE: Analysis failed: {data.get('error')}")
        else:
            print(f"FAILURE: Request failed with status {status_code}")

except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    response_body = e.read().decode('utf-8')
    print(f"Response: {response_body}")
    print(f"FAILURE: Request rejected")

except Exception as e:
    print(f"Error: {e}")
