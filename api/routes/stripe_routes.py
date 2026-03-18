"""
Routes for Stripe checkout integration
NOTE: All Stripe/plan integration commented out for production shipping.
Do not uncomment until live Stripe credentials are configured.
"""

# --- STRIPE INTEGRATION DISABLED ---
# import stripe
# from typing import Optional, Dict, Any
# from fastapi import Request, Depends
# from fastapi.responses import JSONResponse
# from middleware.auth_middleware import get_current_user_optional
# from config.settings import STRIPE_SECRET_KEY_SANDBOX
# from services.session_manager import get_supabase_client
#
# ##trigger rebuild comment
# ##dont change this name just yet
# stripe.api_key = STRIPE_SECRET_KEY_SANDBOX
#
#
# DEFAULT_FRONTEND_URL = "https://powershell.exposed"
#
# # Whitelist of allowed Stripe price IDs mapped to plan names
# ALLOWED_PRICE_IDS = {
#     "price_1T43Q1HrWYWWTND8D326kbsW",  # premium
# }
#
#
# async def create_checkout_session_endpoint(
#     request: Request,
#     current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
# ):
#     if not current_user:
#         return JSONResponse(
#             {
#                 "error": {
#                     "code": "AuthenticationRequiredError",
#                     "message": "You must be logged in to upgrade your plan.",
#                     "details": "Authentication required"
#                 }
#             },
#             status_code=401
#         )
#
#     if not STRIPE_SECRET_KEY_SANDBOX:
#         return JSONResponse(
#             {
#                 "error": {
#                     "code": "ConfigurationError",
#                     "message": "Payment processing is not configured.",
#                     "details": "Stripe secret key not set"
#                 }
#             },
#             status_code=503
#         )
#
#     try:
#         body = await request.json()
#         price_id = body.get("price_id")
#
#         if not price_id or price_id not in ALLOWED_PRICE_IDS:
#             return JSONResponse(
#                 {
#                     "error": {
#                         "code": "ValidationError",
#                         "message": "Invalid pricing plan.",
#                         "details": "Unknown or disallowed price_id"
#                     }
#                 },
#                 status_code=400
#             )
#
#         user_id = current_user.get("id")
#         user_email = current_user.get("email")
#
#         origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/") or DEFAULT_FRONTEND_URL
#         success_url = f"{origin}/pricing?success=true"
#         cancel_url = f"{origin}/pricing?canceled=true"
#
#         session_params = {
#             "mode": "subscription",
#             "line_items": [{"price": price_id, "quantity": 1}],
#             "success_url": success_url,
#             "cancel_url": cancel_url,
#             "metadata": {
#                 "supabase_user_id": user_id,
#                 "price_id": price_id,
#             },
#         }
#
#         if user_email:
#             session_params["customer_email"] = user_email
#
#         session = stripe.checkout.Session.create(**session_params)
#
#         return JSONResponse({
#             "success": True,
#             "url": session.url
#         })
#
#     except stripe.error.InvalidRequestError as e:
#         return JSONResponse(
#             {
#                 "error": {
#                     "code": "StripeError",
#                     "message": "Invalid payment request.",
#                     "details": str(e)
#                 }
#             },
#             status_code=400
#         )
#     except Exception as e:
#         return JSONResponse(
#             {
#                 "error": {
#                     "code": "TransientError",
#                     "message": "Failed to create checkout session.",
#                     "details": str(e)
#                 }
#             },
#             status_code=500
#         )
#
#
# async def cancel_subscription_endpoint(
#     request: Request,
#     current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
# ):
#     if not current_user:
#         return JSONResponse(
#             {
#                 "error": {
#                     "code": "AuthenticationRequiredError",
#                     "message": "You must be logged in to cancel your subscription.",
#                     "details": "Authentication required"
#                 }
#             },
#             status_code=401
#         )
#
#     try:
#         user_id = current_user.get("id")
#         supabase = get_supabase_client()
#
#         # Get user's stripe_subscription_id and current status
#         profile = supabase.table("profiles")\
#             .select("stripe_subscription_id, subscription_status")\
#             .eq("id", user_id)\
#             .single()\
#             .execute()
#
#         subscription_id = profile.data.get("stripe_subscription_id") if profile.data else None
#         current_status = profile.data.get("subscription_status") if profile.data else None
#
#         if current_status == "canceling":
#             return JSONResponse(
#                 {
#                     "error": {
#                         "code": "ValidationError",
#                         "message": "Subscription is already being canceled.",
#                         "details": "Subscription already set to cancel at period end"
#                     }
#                 },
#                 status_code=400
#             )
#
#         if not subscription_id:
#             return JSONResponse(
#                 {
#                     "error": {
#                         "code": "ValidationError",
#                         "message": "No active subscription found.",
#                         "details": "No stripe_subscription_id on profile"
#                     }
#                 },
#                 status_code=400
#             )
#
#         # Cancel at period end (user keeps access until then)
#         updated_sub = stripe.Subscription.modify(
#             subscription_id,
#             cancel_at_period_end=True
#         )
#
#         from datetime import datetime, timezone
#         # cancel_at is set when cancel_at_period_end=True (works across Stripe API versions)
#         period_end = updated_sub.get("cancel_at") or updated_sub.get("current_period_end")
#         period_end_iso = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat() if period_end else None
#
#         # Update DB directly for immediate UI feedback (webhook may be delayed)
#         supabase.table("profiles")\
#             .update({
#                 "subscription_status": "canceling",
#                 "subscription_period_end": period_end_iso,
#             })\
#             .eq("id", user_id)\
#             .execute()
#
#         return JSONResponse({
#             "success": True,
#             "message": "Subscription will be canceled at the end of the billing period.",
#             "period_end": period_end_iso
#         })
#
#     except stripe.error.InvalidRequestError as e:
#         return JSONResponse(
#             {
#                 "error": {
#                     "code": "StripeError",
#                     "message": "Failed to cancel subscription.",
#                     "details": str(e)
#                 }
#             },
#             status_code=400
#         )
#     except Exception as e:
#         return JSONResponse(
#             {
#                 "error": {
#                     "code": "TransientError",
#                     "message": "Failed to cancel subscription.",
#                     "details": str(e)
#                 }
#             },
#             status_code=500
#         )
# --- END STRIPE INTEGRATION DISABLED ---
