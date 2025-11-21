import sys
import os
import asyncio
from unittest.mock import MagicMock, patch

# Add api directory to path
sys.path.append(os.path.join(os.getcwd(), 'api'))

# Mock config settings
sys.modules['config.settings'] = MagicMock()

# Mock supabase client
mock_supabase = MagicMock()

async def mock_get_user_plan_features(user_id):
    if user_id == "free_user":
        return {"plan_name": "free", "can_decode_commands": False}
    elif user_id == "premium_user":
        return {"plan_name": "premium", "can_decode_commands": True}
    return {"plan_name": "free", "can_decode_commands": False}

# Helper to create a mock result with a specific count
def create_mock_count_result(count):
    mock_result = MagicMock()
    mock_result.count = count
    return mock_result

# Patch dependencies
with patch('services.session_manager.get_supabase_client', return_value=mock_supabase), \
     patch('services.plan_service.get_user_plan_features', side_effect=mock_get_user_plan_features):
    
    from services.plan_service import can_user_decode_commands

    async def run_tests():
        with open('api/tests/reproduce_result.log', 'w', encoding='utf-8') as f:
            def log(msg):
                f.write(msg + '\n')
                print(msg)

            log("TEST: Anonymous User Rate Limit (DB-Backed)")
            session_id = "anon_session_1"
            
            # Test 1: Usage 0 (Should allow)
            mock_supabase.table.return_value.select.return_value.gte.return_value.neq.return_value.eq.return_value.execute.return_value = create_mock_count_result(0)
            can_decode = await can_user_decode_commands(None, session_id=session_id)
            if not can_decode: log("FAIL: Usage 0 should be allowed")
            else: log("PASS: Usage 0 allowed")

            # Test 2: Usage 4 (Should allow)
            mock_supabase.table.return_value.select.return_value.gte.return_value.neq.return_value.eq.return_value.execute.return_value = create_mock_count_result(4)
            can_decode = await can_user_decode_commands(None, session_id=session_id)
            if not can_decode: log("FAIL: Usage 4 should be allowed")
            else: log("PASS: Usage 4 allowed")

            # Test 3: Usage 5 (Should BLOCK)
            mock_supabase.table.return_value.select.return_value.gte.return_value.neq.return_value.eq.return_value.execute.return_value = create_mock_count_result(5)
            can_decode = await can_user_decode_commands(None, session_id=session_id)
            if can_decode: log("FAIL: Usage 5 should be blocked")
            else: log("PASS: Usage 5 blocked")

            # Test 4: Usage 10 (Should BLOCK)
            mock_supabase.table.return_value.select.return_value.gte.return_value.neq.return_value.eq.return_value.execute.return_value = create_mock_count_result(10)
            can_decode = await can_user_decode_commands(None, session_id=session_id)
            if can_decode: log("FAIL: Usage 10 should be blocked")
            else: log("PASS: Usage 10 blocked")
            
            log("DONE: Anonymous User Rate Limit")

            log("TEST: Premium User Rate Limit (DB-Backed)")
            user_id = "premium_user"
            
            # Premium user should ignore DB count
            # We set count to 100 to prove it ignores it
            mock_supabase.table.return_value.select.return_value.gte.return_value.neq.return_value.eq.return_value.execute.return_value = create_mock_count_result(100)
            
            can_decode = await can_user_decode_commands(user_id, session_id=None)
            if not can_decode: log("FAIL: Premium user should be allowed even with high usage")
            else: log("PASS: Premium user allowed with high usage")
            
            log("DONE: Premium User Rate Limit")

    async def main():
        await run_tests()

    if __name__ == "__main__":
        asyncio.run(main())
