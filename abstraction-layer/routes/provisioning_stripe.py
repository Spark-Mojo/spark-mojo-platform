import logging
import os

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.provisioning-stripe")

router = APIRouter(
    prefix="/api/modules/provisioning/stripe",
    tags=["provisioning-stripe"],
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


class CreateCustomerRequest(BaseModel):
    site_name: str
    customer_name: str
    billing_email: str


class CreateCustomerResponse(BaseModel):
    stripe_customer_id: str


@router.post(
    "/create-customer",
    response_model=CreateCustomerResponse,
)
async def create_stripe_customer(
    req: CreateCustomerRequest,
    user: dict = Depends(get_current_user),
):
    try:
        stripe_key = read_secret("stripe_secret_key")
    except SecretNotFoundError:
        raise HTTPException(status_code=500, detail="Stripe configuration missing")

    if not ADMIN_FRAPPE_URL:
        raise HTTPException(status_code=500, detail="Admin site not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            params={
                "filters": f'[["frappe_site","=","{req.site_name}"]]',
                "fields": '["name","stripe_customer_id"]',
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=404,
                detail=f"SM Site Registry entry not found for site {req.site_name}",
            )
        data = resp.json().get("data", [])
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"SM Site Registry entry not found for site {req.site_name}",
            )

    registry_entry = data[0]
    registry_name = registry_entry["name"]

    existing_id = registry_entry.get("stripe_customer_id")
    if existing_id:
        return CreateCustomerResponse(stripe_customer_id=existing_id)

    try:
        stripe.api_key = stripe_key
        customer = stripe.Customer.create(
            name=req.customer_name,
            email=req.billing_email,
            metadata={
                "sm_site_name": req.site_name,
                "sm_site_registry_id": registry_name,
            },
        )
    except stripe.StripeError as e:
        logger.error("Stripe API error: %s", str(e))
        raise HTTPException(
            status_code=502,
            detail="Stripe error: {}".format(
                e.user_message if hasattr(e, "user_message") and e.user_message
                else "Payment provider error"
            ),
        )

    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry/{registry_name}",
            json={
                "billing_motion": "self_serve",
                "stripe_customer_id": customer.id,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code not in (200, 202):
            logger.error(
                "Failed to update SM Site Registry %s: %s",
                registry_name,
                resp.text,
            )

    return CreateCustomerResponse(stripe_customer_id=customer.id)
