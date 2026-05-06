"""
Routes for plan management
"""

from typing import Optional, Dict, Any
from fastapi import Depends
from fastapi.responses import JSONResponse
from middleware.auth_middleware import get_current_user_optional
from services.plan_service import get_user_plan_features, get_all_plans


async def get_user_plan_endpoint(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Get current user's plan and features
    """
    try:
        if not current_user:
            return JSONResponse(
                {
                    "error": {
                        "code": "AuthenticationRequiredError",
                        "message": "The operation requires an authenticated user. Verify that you have provided your API key.",
                        "details": "Authentication required"
                    }
                },
                status_code=401
            )

        user_id = current_user.get("id")
        plan_features = await get_user_plan_features(user_id)

        return JSONResponse({
            "success": True,
            "plan": plan_features
        })

    except Exception as e:
        return JSONResponse(
            {
                "error": {
                    "code": "TransientError",
                    "message": "Transient server error. Retry might work.",
                    "details": f"Failed to fetch plan: {str(e)}"
                }
            },
            status_code=503
        )


async def get_all_plans_endpoint():
    """
    Get all available plans (public endpoint)
    """
    try:
        plans = await get_all_plans()

        return JSONResponse({
            "success": True,
            "plans": plans
        })

    except Exception as e:
        return JSONResponse(
            {
                "error": {
                    "code": "TransientError",
                    "message": "Transient server error. Retry might work.",
                    "details": f"Failed to fetch plans: {str(e)}"
                }
            },
            status_code=503
        )
