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


async def can_user_decode_commands(user_id: Optional[str]) -> bool:
    """
    Check if user has permission to decode commands
    
    Args:
        user_id: User ID to check (None for anonymous)
        
    Returns:
        True if user can decode commands, False otherwise
    """
    # ✅ AQUI: Usuários anônimos (user_id = None) são tratados como plano FREE
    if not user_id:
        print(f"🔒 [DECODE_CHECK] Anonymous user (user_id=None) - FREE PLAN - decode denied")
        return False  # ← RETORNA FALSE = NÃO PODE VER COMANDOS DECODIFICADOS
    
    # Para usuários autenticados, busca o plano no banco
    print(f"🔍 [DECODE_CHECK] Checking decode permission for user: {user_id[:8]}...")
    
    plan_features = await get_user_plan_features(user_id)
    can_decode = plan_features.get("can_decode_commands", False)
    
    print(f"🎯 [DECODE_CHECK] User: {user_id[:8]}... | Plan: {plan_features.get('plan_name')} | Can decode: {can_decode}")
    
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
