"""
Routes for Stripe checkout integration
"""
import stripe
from typing import Optional, Dict, Any
from fastapi import Request, Depends
from fastapi.responses import JSONResponse
from middleware.auth_middleware import get_current_user_optional
from config.settings import STRIPE_SECRET_KEY


stripe.api_key = STRIPE_SECRET_KEY

# Frontend URLs for redirect after checkout
SUCCESS_URL = "https://powershell.exposed/pricing?success=true"
CANCEL_URL = "https://powershell.exposed/pricing?canceled=true"


async def create_checkout_session_endpoint(
    request: Request,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """
    Create a Stripe Checkout Session for plan upgrade.
    Requires authentication.
    """
    if not current_user:
        return JSONResponse(
            {
                "error": {
                    "code": "AuthenticationRequiredError",
                    "message": "You must be logged in to upgrade your plan.",
                    "details": "Authentication required"
                }
            },
            status_code=401
        )

    if not STRIPE_SECRET_KEY:
        return JSONResponse(
            {
                "error": {
                    "code": "ConfigurationError",
                    "message": "Payment processing is not configured.",
                    "details": "Stripe secret key not set"
                }
            },
            status_code=503
        )

    try:
        body = await request.json()
        price_id = body.get("price_id")

        if not price_id or not price_id.startswith("price_"):
            return JSONResponse(
                {
                    "error": {
                        "code": "ValidationError",
                        "message": "A valid Stripe price_id is required.",
                        "details": "Missing or invalid price_id"
                    }
                },
                status_code=400
            )

        user_id = current_user.get("id")
        user_email = current_user.get("email")

        session_params = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": SUCCESS_URL,
            "cancel_url": CANCEL_URL,
            "metadata": {
                "supabase_user_id": user_id,
                "price_id": price_id,
            },
        }

        if user_email:
            session_params["customer_email"] = user_email

        session = stripe.checkout.Session.create(**session_params)

        return JSONResponse({
            "success": True,
            "url": session.url
        })

    except stripe.error.InvalidRequestError as e:
        return JSONResponse(
            {
                "error": {
                    "code": "StripeError",
                    "message": "Invalid payment request.",
                    "details": str(e)
                }
            },
            status_code=400
        )
    except Exception as e:
        return JSONResponse(
            {
                "error": {
                    "code": "TransientError",
                    "message": "Failed to create checkout session.",
                    "details": str(e)
                }
            },
            status_code=500
        )
