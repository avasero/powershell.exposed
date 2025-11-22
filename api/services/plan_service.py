"""
Service for managing user plans and features
"""
from typing import Optional, Dict, Any
from services.session_manager import get_supabase_client


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
        
        print(f"🔍 [PLAN_SERVICE] Fetching plan for user: {user_id[:8]}...")
        
        # Get user profile with plan information
        response = supabase.table('profiles')\
            .select('plan_id, plans(name, can_decode_commands)')\
            .eq('id', user_id)\
            .single()\
            .execute()
        
        print(f"📊 [PLAN_SERVICE] Raw response: {response.data}")
        
        if not response.data:
            print(f"⚠️ [PLAN_SERVICE] No profile found for user {user_id[:8]}, returning free plan")
            # Return default free plan features
            return {
                "plan_name": "free",
                "can_decode_commands": False
            }
        
        plan_data = response.data.get('plans', {})
        print(f"📋 [PLAN_SERVICE] Plan data: {plan_data}")
        
        result = {
            "plan_name": plan_data.get('name', 'free'),
            "can_decode_commands": plan_data.get('can_decode_commands', False)
        }
        
        print(f"✅ [PLAN_SERVICE] Final result: {result}")
        
        return result
        
    except Exception as e:
        print(f"❌ [PLAN_SERVICE] Error fetching user plan: {e}")
        print(f"   Exception type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        # Return free plan as fallback
        return {
            "plan_name": "free",
            "can_decode_commands": False
        }


async def can_user_decode_commands(user_id: Optional[str], session_id: Optional[str] = None) -> dict:
    """
    Check if user has permission to decode commands
    
    Args:
        user_id: User ID to check (None for anonymous)
        session_id: Session ID for anonymous users
        
    Returns:
        Dictionary with decode permission and usage details
    """
    # For authenticated users, fetch their plan
    if user_id:
        plan_features = await get_user_plan_features(user_id)
        plan_name = plan_features.get("plan_name", "free")
    else:
        plan_name = "free"
    
    # Premium/Enterprise users have unlimited decoding
    if plan_name in ["premium", "enterprise"]:
        return {
            "can_decode": True,
            "current_usage": 0,
            "limit": float('inf'),
            "remaining": float('inf'),
            "seconds_until_reset": None
        }
    
    # Free users get rate-limited decoding (5/hour)
    from datetime import datetime, timedelta
    
    window_start = datetime.utcnow() - timedelta(hours=1)
    supabase = get_supabase_client()
    
    # ✅ FIX: Query for analyses with ANY decoded content
    query = supabase.table('powershell_analyses')\
        .select('id, created_at', count='exact')\
        .gte('created_at', window_start.isoformat())\
        .or_('decoded_command.not.is.null,double_decoded_command.not.is.null,obfuscated_command.not.is.null')
        
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
            "limit": 5,
            "remaining": 0,
            "seconds_until_reset": 0
        }
        
    result = query.execute()
    current_usage = result.count or 0
    limit = 5
    
    can_decode = current_usage < limit
    
    # ✅ FIX: Calculate seconds until reset properly
    seconds_until_reset = None
    if not can_decode and result.data and len(result.data) > 0:
        # Find the oldest decode in the window
        oldest_created_at = min(analysis['created_at'] for analysis in result.data)
        # Parse the timestamp and add 1 hour
        oldest_time = datetime.fromisoformat(oldest_created_at.replace('Z', '+00:00'))
        reset_time = oldest_time + timedelta(hours=1)
        current_time = datetime.now(reset_time.tzinfo)  # ✅ FIX: Use datetime.now() with timezone
        seconds_until_reset = max(0, int((reset_time - current_time).total_seconds()))
    elif not can_decode:
        # ✅ FIX: If limit reached but no data (edge case), set to 1 hour
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
        print(f"❌ Error fetching plan: {e}")
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
        print(f"❌ Error fetching plans: {e}")
        return []
