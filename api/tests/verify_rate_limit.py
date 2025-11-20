import asyncio
import sys
import os
from unittest.mock import MagicMock, patch

# Add api directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from middleware.rate_limiting import (
    check_rate_limit, check_decode_limit, increment_decode_usage,
    reset_rate_limit, request_counts, decode_counts,
    FREE_REQUEST_LIMIT, FREE_DECODE_LIMIT
)

async def test_rate_limiting():
    print("🚀 Starting Rate Limiting Verification")
    
    # Test 1: Free User Request Limit
    print("\n🧪 Test 1: Free User Request Limit")
    session_id = "test_session_free"
    reset_rate_limit(session_id)
    
    # Simulate requests
    for i in range(FREE_REQUEST_LIMIT):
        result = check_rate_limit(session_id, "free")
        assert result["within_limit"], f"Request {i+1} should be allowed"
        from middleware.rate_limiting import add_request_to_rate_limit
        add_request_to_rate_limit(session_id)
        
    # 11th request should fail
    result = check_rate_limit(session_id, "free")
    assert not result["within_limit"], "11th request should be blocked"
    print("✅ Free user request limit verified")
    
    # Test 2: Premium User Request Limit (Unlimited)
    print("\n🧪 Test 2: Premium User Request Limit")
    session_id = "test_session_premium"
    reset_rate_limit(session_id)
    
    for i in range(FREE_REQUEST_LIMIT + 5):
        result = check_rate_limit(session_id, "premium")
    
    # Test 4: Premium User Decode Limit (Unlimited)
    print("\n🧪 Test 4: Premium User Decode Limit")
    user_id = "user_premium"
    if user_id in decode_counts:
        del decode_counts[user_id]
        
    for i in range(FREE_DECODE_LIMIT + 5):
        result = check_decode_limit(user_id, "premium")
        assert result["within_limit"], f"Premium decode {i+1} should be allowed"
        increment_decode_usage(user_id)
        
    print("✅ Premium user decode limit verified")

if __name__ == "__main__":
    asyncio.run(test_rate_limiting())
