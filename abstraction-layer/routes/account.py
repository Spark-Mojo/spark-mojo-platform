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


def _get_included_units(billable_actions: list) -> dict:
    mapping = {
        "ai_tokens": 0,
        "claims": 0,
        "storage_gb": 0,
        "staff_seats": 0,
        "portal_seats": 0,
    }
    suffix_to_key = {
        "ai_tokens": "ai_tokens",
        "claims_processed": "claims",
        "storage_gb": "storage_gb",
        "staff_seats": "staff_seats",
        "portal_seats": "portal_seats",
    }
    for action in billable_actions:
        action_id = action.get("action_id", "")
        included = action.get("included_units", 0)
        for suffix, key in suffix_to_key.items():
            if action_id.endswith(f".{suffix}"):
                mapping[key] = int(included or 0)
                break
    return mapping


@router.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    allowed_roles = {"System Manager", "Practice Admin"}
    user_roles = set(user.get("roles", []))
    if not allowed_roles & user_roles:
        raise HTTPException(
            status_code=403,
            detail="Requires System Manager or Practice Admin role",
        )

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
        registry_resp = await client.get(
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
        if registry_resp.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail=f"No SM Site Registry entry for {site_name}",
            )
        registry_data = registry_resp.json().get("data", [])
        if not registry_data:
            raise HTTPException(
                status_code=404,
                detail=f"No SM Site Registry entry for {site_name}",
            )

    registry = registry_data[0]
    client_frappe_url = f"https://{site_name}"

    async with httpx.AsyncClient() as client:
        sub_resp = await client.get(
            f"{client_frappe_url}/api/resource/SM Subscription",
            params={
                "fields": json.dumps([
                    "billing_motion", "plan_name", "billing_status",
                    "billing_interval", "invoice_cadence",
                    "current_period_start", "current_period_end", "trial_end",
                    "payment_method_type", "payment_method_last4",
                    "payment_method_brand", "payment_method_expiry",
                    "next_invoice_date", "next_invoice_estimate",
                    "cancel_at_period_end",
                ]),
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if sub_resp.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail="No SM Subscription on this site",
            )
        sub_data = sub_resp.json().get("data", [])
        if not sub_data:
            raise HTTPException(
                status_code=404,
                detail="No SM Subscription on this site",
            )

    sub = sub_data[0]

    async with httpx.AsyncClient() as client:
        actions_resp = await client.get(
            f"{client_frappe_url}/api/resource/SM Client Billable Action",
            params={
                "fields": json.dumps(["action_id", "included_units"]),
                "limit_page_length": 0,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        billable_actions = []
        if actions_resp.status_code == 200:
            billable_actions = actions_resp.json().get("data", [])

    return {
        "motion": sub.get("billing_motion") or registry.get("billing_motion"),
        "plan_name": sub.get("plan_name"),
        "billing_status": sub.get("billing_status"),
        "billing_interval": sub.get("billing_interval"),
        "invoice_cadence": sub.get("invoice_cadence"),
        "current_period_start": sub.get("current_period_start"),
        "current_period_end": sub.get("current_period_end"),
        "trial_end": sub.get("trial_end"),
        "payment_method": {
            "type": sub.get("payment_method_type"),
            "last4": sub.get("payment_method_last4"),
            "brand": sub.get("payment_method_brand"),
            "expiry": sub.get("payment_method_expiry"),
        },
        "next_invoice_date": sub.get("next_invoice_date"),
        "next_invoice_estimate": sub.get("next_invoice_estimate"),
        "cancel_at_period_end": bool(sub.get("cancel_at_period_end")),
        "included": _get_included_units(billable_actions),
    }


@router.get("/usage")
async def get_usage(user: dict = Depends(get_current_user)):
    site_name = user.get("site_name", "")
    if not site_name:
        tenant_id = user.get("tenant_id", "")
        if tenant_id and tenant_id != "default":
            site_name = f"{tenant_id}.sparkmojo.com"

    if not site_name:
        raise HTTPException(status_code=400, detail="Cannot determine site for user")

    client_frappe_url = f"https://{site_name}"

    async with httpx.AsyncClient() as client:
        usage_resp = await client.get(
            f"{client_frappe_url}/api/resource/SM Usage Summary",
            params={
                "fields": json.dumps([
                    "billing_period_start", "billing_period_end",
                    "ai_tokens_used", "ai_tokens_included",
                    "ai_tokens_tier1_used", "ai_tokens_tier2_used",
                    "ai_tokens_tier3_used",
                    "claims_processed", "claims_included",
                    "storage_used_gb", "storage_included_gb",
                    "active_staff_seats", "staff_seats_included",
                    "active_portal_seats", "portal_seats_included",
                    "estimated_overage", "alert_level", "last_updated",
                ]),
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if usage_resp.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail="No SM Usage Summary on this site",
            )
        usage_data = usage_resp.json().get("data", [])
        if not usage_data:
            raise HTTPException(
                status_code=404,
                detail="No SM Usage Summary on this site",
            )

    usage = usage_data[0]

    def pct(used, included):
        return round((used / included) * 100, 1) if included else 0

    return {
        "period": {
            "start": usage.get("billing_period_start"),
            "end": usage.get("billing_period_end"),
        },
        "ai_tokens": {
            "used": usage.get("ai_tokens_used", 0),
            "included": usage.get("ai_tokens_included", 0),
            "pct": pct(
                usage.get("ai_tokens_used", 0),
                usage.get("ai_tokens_included", 0),
            ),
            "by_tier": {
                "tier1": usage.get("ai_tokens_tier1_used", 0),
                "tier2": usage.get("ai_tokens_tier2_used", 0),
                "tier3": usage.get("ai_tokens_tier3_used", 0),
            },
        },
        "claims": {
            "processed": usage.get("claims_processed", 0),
            "included": usage.get("claims_included", 0),
            "pct": pct(
                usage.get("claims_processed", 0),
                usage.get("claims_included", 0),
            ),
        },
        "storage": {
            "used_gb": usage.get("storage_used_gb", 0),
            "included_gb": usage.get("storage_included_gb", 0),
            "pct": pct(
                usage.get("storage_used_gb", 0),
                usage.get("storage_included_gb", 0),
            ),
        },
        "staff_seats": {
            "active": usage.get("active_staff_seats", 0),
            "included": usage.get("staff_seats_included", 0),
            "pct": pct(
                usage.get("active_staff_seats", 0),
                usage.get("staff_seats_included", 0),
            ),
        },
        "portal_seats": {
            "active": usage.get("active_portal_seats", 0),
            "included": usage.get("portal_seats_included", 0),
            "pct": pct(
                usage.get("active_portal_seats", 0),
                usage.get("portal_seats_included", 0),
            ),
        },
        "estimated_overage": usage.get("estimated_overage", 0),
        "alert_level": usage.get("alert_level", "green"),
        "last_updated": usage.get("last_updated"),
    }
