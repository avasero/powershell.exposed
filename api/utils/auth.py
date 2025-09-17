"""
Authentication utilities for Supabase JWT tokens
"""
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from config.settings import SUPABASE_JWT_SECRET, SUPABASE_URL
import httpx
import asyncio


class AuthenticationError(Exception):
    """Custom exception for authentication errors"""
    pass


async def get_supabase_public_key():
    """
    Fetch Supabase JWT public key from the well-known endpoint
    This is used to verify JWT tokens from Supabase Auth
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks_uri")
            if response.status_code == 200:
                jwks_data = response.json()
                # Return the first key (Supabase typically has one)
                if jwks_data.get("keys"):
                    return jwks_data["keys"][0]
    except Exception as e:
        print(f"Error fetching Supabase public key: {e}")
    return None


def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a Supabase JWT token
    Returns the decoded payload if valid, None if invalid
    """
    try:
        # For Supabase, we can use the JWT secret directly
        # In production, you should fetch and cache the public key
        if not SUPABASE_JWT_SECRET:
            print("⚠️ JWT secret not configured - authentication disabled")
            raise AuthenticationError("JWT secret not configured")
        
        # Decode the JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")
    except Exception as e:
        raise AuthenticationError(f"Token validation error: {str(e)}")


def extract_user_from_token(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract user information from JWT payload
    """
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role", "authenticated"),
        "aud": payload.get("aud"),
        "exp": payload.get("exp"),
        "iat": payload.get("iat"),
        "user_metadata": payload.get("user_metadata", {}),
        "app_metadata": payload.get("app_metadata", {})
    }


def verify_token_permissions(user: Dict[str, Any], required_role: str = "authenticated") -> bool:
    """
    Verify if user has required permissions
    """
    user_role = user.get("role", "")
    
    # Define role hierarchy
    role_hierarchy = {
        "anon": 0,
        "authenticated": 1,
        "service_role": 2
    }
    
    user_level = role_hierarchy.get(user_role, 0)
    required_level = role_hierarchy.get(required_role, 1)
    
    return user_level >= required_level


async def get_user_from_supabase(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch additional user information from Supabase
    This can be used to get profile information
    """
    try:
        from services.session_manager import get_supabase_client
        
        supabase = get_supabase_client()
        
        # Get user profile from profiles table
        response = supabase.table('profiles').select('*').eq('id', user_id).single().execute()
        
        if response.data:
            return response.data
        
    except Exception as e:
        print(f"Error fetching user from Supabase: {e}")
    
    return None
