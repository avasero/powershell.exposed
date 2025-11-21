import sys
import os
import asyncio
from unittest.mock import MagicMock, patch

# Add api directory to path
sys.path.append(os.path.join(os.getcwd(), 'api'))

# Mock config settings
sys.modules['config.settings'] = MagicMock()
sys.modules['config.settings'].RATE_LIMIT_REQUESTS = 10
sys.modules['config.settings'].RATE_LIMIT_WINDOW = 3600
sys.modules['config.settings'].GLOBAL_RATE_LIMIT_REQUESTS = 100
sys.modules['config.settings'].GLOBAL_RATE_LIMIT_WINDOW = 60

# Mock supabase client
mock_supabase = MagicMock()

async def mock_get_user_plan_features(user_id):
    if user_id == "free_user":
        return {"plan_name": "free", "can_decode_commands": False}
    elif user_id == "premium_user":
        return {"plan_name": "premium", "can_decode_commands": True}
    return {"plan_name": "free", "can_decode_commands": False}

# Patch dependencies
with patch('services.session_manager.get_supabase_client', return_value=mock_supabase), \
     patch('services.plan_service.get_user_plan_features', side_effect=mock_get_user_plan_features):
    
    from middleware.rate_limiting import check_decode_limit, increment_decode_usage, reset_rate_limit, decode_counts
    from services.plan_service import can_user_decode_commands

    async def run_tests():
        with open('api/tests/reproduce_result.log', 'w', encoding='utf-8') as f:
            def log(msg):
                f.write(msg + '\n')
                print(msg)

            log("TEST: Anonymous User Rate Limit")
            session_id = "anon_session_1"
            
            # Reset counts
            if f"session:{session_id}" in decode_counts:
                del decode_counts[f"session:{session_id}"]

            for i in range(1, 8):
                can_decode = await can_user_decode_commands(None, session_id=session_id)
                
                if can_decode:
                    increment_decode_usage(None, session_id=session_id)
                
                if i <= 5 and not can_decode:
                    log(f"FAIL: Attempt {i} should be allowed")
                if i > 5 and can_decode:
                    log(f"FAIL: Attempt {i} should be blocked")
            log("DONE: Anonymous User Rate Limit")

            log("TEST: Free User Rate Limit")
            user_id = "free_user"
            
            # Reset counts
            if f"user:{user_id}" in decode_counts:
                del decode_counts[f"user:{user_id}"]

            for i in range(1, 8):
                can_decode = await can_user_decode_commands(user_id, session_id=None)
                
                if can_decode:
                    increment_decode_usage(user_id, session_id=None)
                    
                if i <= 5 and not can_decode:
                    log(f"FAIL: Attempt {i} should be allowed")
                if i > 5 and can_decode:
                    log(f"FAIL: Attempt {i} should be blocked")
            log("DONE: Free User Rate Limit")

            log("TEST: Premium User Rate Limit")
            user_id = "premium_user"
            
            for i in range(1, 8):
                can_decode = await can_user_decode_commands(user_id, session_id=None)
                
                if not can_decode:
                    log(f"FAIL: Attempt {i} (Premium) should be allowed")
            log("DONE: Premium User Rate Limit")

    async def main():
        await run_tests()

    if __name__ == "__main__":
        asyncio.run(main())

    if __name__ == "__main__":
        asyncio.run(main())
