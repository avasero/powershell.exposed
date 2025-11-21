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


async def can_user_decode_commands(user_id: Optional[str], session_id: Optional[str] = None) -> bool:
    """
    Check if user has permission to decode commands
    
    Args:
        user_id: User ID to check (None for anonymous)
        session_id: Session ID for anonymous users
        
    Returns:
        True if user can decode commands, False otherwise
    """
    # ✅ FIX: Anonymous and FREE users get rate-limited decoding (5/hour per session)
    if not user_id:
        print(f"🔓 [DECODE_CHECK] Anonymous user (session: {session_id[:8] if session_id else 'NONE'}) - checking rate limit...")
        
        from middleware.rate_limiting import check_decode_limit
        limit_info = check_decode_limit(None, "free", session_id=session_id)
        
        can_decode = limit_info["within_limit"]
        print(f"✅ [DECODE_CHECK] Anonymous session -> FREE PLAN | Can decode: {can_decode} | Used: {limit_info['current_count']}/{limit_info['limit']}")
        
        return can_decode
    
    # For authenticated users, fetch their plan
    print(f"🔍 [DECODE_CHECK] Checking decode permission for user: {user_id[:8]}...")
    
    plan_features = await get_user_plan_features(user_id)
    plan_name = plan_features.get("plan_name", "free")
    
    # ✅ Premium/Enterprise users have unlimited decoding
    if plan_name in ["premium", "enterprise"]:
        print(f"✅ [DECODE_CHECK] User: {user_id[:8]}... | Plan: {plan_name} | Unlimited decoding")
        return True
    
    # ✅ Free users get rate-limited decoding (5/hour per user)
    # IMPORTANT: Even if 'can_decode_commands' is False in DB for free plan, 
    # we MUST allow 5 decodes per hour.
    from middleware.rate_limiting import check_decode_limit
    limit_info = check_decode_limit(user_id, plan_name, session_id=None)
    
    can_decode = limit_info["within_limit"]
    print(f"🎯 [DECODE_CHECK] User: {user_id[:8]}... | Plan: {plan_name} | Can decode: {can_decode} | Used: {limit_info['current_count']}/{limit_info['limit']}")
    
    return can_decode


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
