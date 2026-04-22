import json
import logging
import os

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.account")

router = APIRouter(
    prefix="/api/modules/account",
    tags=["account"],
)

ADMIN_FRAPPE_URL = os.getenv("ADMIN_FRAPPE_URL", "")


def _read_secret_or_empty(name: str) -> str:
    try:
        return read_secret(name)
    except SecretNotFoundError:
        return ""


ADMIN_API_KEY = _read_secret_or_empty("admin_api_key")
ADMIN_API_SECRET = _read_secret_or_empty("admin_api_secret")


def _admin_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if ADMIN_API_KEY and ADMIN_API_SECRET:
        headers["Authorization"] = f"token {ADMIN_API_KEY}:{ADMIN_API_SECRET}"
    return headers


def _get_portal_config_id() -> str:
    return _read_secret_or_empty("stripe_customer_portal_config_id")


@router.post("/portal")
async def create_portal_session(user: dict = Depends(get_current_user)):
    if "System Manager" not in user.get("roles", []):
        raise HTTPException(status_code=403, detail="Requires System Manager role")

    try:
        stripe_key = read_secret("stripe_secret_key")
    except SecretNotFoundError:
        raise HTTPException(status_code=500, detail="Stripe configuration missing")

    if not ADMIN_FRAPPE_URL:
        raise HTTPException(status_code=500, detail="Admin site not configured")

    site_name = user.get("site_name", "")
    if not site_name:
        tenant_id = user.get("tenant_id", "")
        if tenant_id and tenant_id != "default":
            site_name = f"{tenant_id}.sparkmojo.com"

    if not site_name:
        raise HTTPException(status_code=400, detail="Cannot determine site for user")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            params={
                "filters": json.dumps([["frappe_site", "=", site_name]]),
                "fields": json.dumps([
                    "name", "frappe_site", "billing_motion",
                    "stripe_customer_id",
                ]),
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail=f"SM Site Registry not found for {site_name}",
            )
        data = resp.json().get("data", [])
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"SM Site Registry not found for {site_name}",
            )

    registry = data[0]

    if registry.get("billing_motion") != "self_serve":
        raise HTTPException(
            status_code=405,
            detail="Customer Portal only available for Self-Serve clients",
        )

    stripe_customer_id = registry.get("stripe_customer_id")
    if not stripe_customer_id:
        raise HTTPException(
            status_code=404,
            detail="No Stripe customer for this site",
        )

    portal_config_id = _get_portal_config_id()

    stripe.api_key = stripe_key
    try:
        session_params = {
            "customer": stripe_customer_id,
            "return_url": f"https://{site_name.replace('.sparkmojo.com', '.app.sparkmojo.com')}/billing",
        }
        if portal_config_id:
            session_params["configuration"] = portal_config_id

        session = stripe.billing_portal.Session.create(**session_params)
    except stripe.StripeError as e:
        logger.error("Stripe portal session error: %s", str(e))
        raise HTTPException(
            status_code=502,
            detail="Stripe error: {}".format(
                e.user_message if hasattr(e, "user_message") and e.user_message
                else "Payment provider error"
            ),
        )

    return {"url": session.url}
