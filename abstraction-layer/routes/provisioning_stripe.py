import logging
import os
from typing import Optional

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

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


# --- ACCT-008b: Stripe Subscription creation ---


class SubscriptionItem(BaseModel):
    item_code: str
    contracted_rate: float
    quantity: Optional[int] = None


class CreateSubscriptionRequest(BaseModel):
    site_name: str
    subscription_items: list[SubscriptionItem]
    promo_code: Optional[str] = None
    trial_period_days: Optional[int] = 0

    @field_validator("subscription_items")
    @classmethod
    def at_least_one_item(cls, v):
        if not v:
            raise ValueError("subscription_items must contain at least one item")
        return v


class CreateSubscriptionResponse(BaseModel):
    stripe_subscription_id: str
    subscription_status: str


def _find_stripe_product(item_code: str) -> stripe.Product:
    products = stripe.Product.search(
        query=f'metadata["sm_action_id"]:"{item_code}"',
    )
    if not products.data:
        return None
    return products.data[0]


def _get_default_price(product: stripe.Product):
    prices = stripe.Price.list(product=product.id, active=True, limit=1)
    if prices.data:
        return prices.data[0]
    return None


def _build_price_for_item(
    product: stripe.Product,
    default_price,
    item: SubscriptionItem,
) -> str:
    billing_type = product.metadata.get("billing_type", "flat_monthly")

    if billing_type == "metered_overage":
        included_units = int(product.metadata.get("included_units", 0))
        rate_cents = int(round(item.contracted_rate * 100))
        new_price = stripe.Price.create(
            product=product.id,
            currency="usd",
            recurring={"interval": "month", "usage_type": "metered"},
            billing_scheme="tiered",
            tiers_mode="graduated",
            tiers=[
                {"up_to": included_units, "unit_amount": 0},
                {"up_to": "inf", "unit_amount": rate_cents},
            ],
            metadata={"sm_per_contract": "true"},
        )
        return new_price.id

    rate_cents = int(round(item.contracted_rate * 100))
    if default_price and default_price.unit_amount == rate_cents:
        return default_price.id

    recurring_params = {"interval": "month"}
    if billing_type in ("always_billed",):
        recurring_params["usage_type"] = "metered"

    new_price = stripe.Price.create(
        product=product.id,
        currency="usd",
        unit_amount=rate_cents,
        recurring=recurring_params,
        metadata={"sm_per_contract": "true"},
    )
    return new_price.id


@router.post(
    "/create-subscription",
    response_model=CreateSubscriptionResponse,
)
async def create_stripe_subscription(
    req: CreateSubscriptionRequest,
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
                "fields": '["name","stripe_customer_id","stripe_subscription_id"]',
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

    customer_id = registry_entry.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=409,
            detail="Stripe Customer must be created first (see ACCT-008a)",
        )

    existing_sub = registry_entry.get("stripe_subscription_id")
    if existing_sub:
        return CreateSubscriptionResponse(
            stripe_subscription_id=existing_sub,
            subscription_status="existing",
        )

    stripe.api_key = stripe_key

    subscription_items_stripe = []
    for item in req.subscription_items:
        product = _find_stripe_product(item.item_code)
        if not product:
            raise HTTPException(
                status_code=422,
                detail=f"Item {item.item_code} not found in Billable Action Registry",
            )

        default_price = _get_default_price(product)
        price_id = _build_price_for_item(product, default_price, item)

        si = {"price": price_id}
        if item.quantity is not None:
            si["quantity"] = item.quantity
        subscription_items_stripe.append(si)

    try:
        sub_params = {
            "customer": customer_id,
            "items": subscription_items_stripe,
            "metadata": {"sm_site_name": req.site_name},
            "payment_behavior": "default_incomplete",
            "collection_method": "charge_automatically",
        }
        if req.trial_period_days:
            sub_params["trial_period_days"] = req.trial_period_days
        if req.promo_code:
            sub_params["coupon"] = req.promo_code

        subscription = stripe.Subscription.create(**sub_params)
    except stripe.InvalidRequestError as e:
        if "coupon" in str(e).lower() or "promo" in str(e).lower():
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(
            status_code=502,
            detail="Stripe error: {}".format(
                e.user_message if hasattr(e, "user_message") and e.user_message
                else "Payment provider error"
            ),
        )
    except stripe.StripeError as e:
        logger.error("Stripe API error during subscription creation: %s", str(e))
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
            json={"stripe_subscription_id": subscription.id},
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code not in (200, 202):
            logger.error(
                "Failed to update SM Site Registry %s with subscription: %s",
                registry_name,
                resp.text,
            )

    return CreateSubscriptionResponse(
        stripe_subscription_id=subscription.id,
        subscription_status=subscription.status,
    )
