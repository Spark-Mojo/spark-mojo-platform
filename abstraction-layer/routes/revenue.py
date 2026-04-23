import json
import logging
import os
from datetime import datetime, timezone

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request

from auth import verify_admin_key
from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.revenue")

router = APIRouter(
    prefix="/api/admin/revenue",
    tags=["revenue"],
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


async def _find_admin_sales_invoice(stripe_invoice_id: str) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/Sales Invoice",
            params={
                "filters": json.dumps(
                    [["custom_stripe_invoice_id", "=", stripe_invoice_id]]
                ),
                "fields": '["name"]',
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", [])
        return data[0] if data else None


async def _get_registry_for_customer(
    stripe_customer_id: str,
) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            params={
                "filters": json.dumps(
                    [["stripe_customer_id", "=", stripe_customer_id]]
                ),
                "fields": json.dumps([
                    "name", "site_name", "billing_motion",
                    "stripe_customer_id", "erpnext_customer_name",
                ]),
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", [])
        return data[0] if data else None


async def _ensure_customer(
    stripe_customer_id: str, customer_name: str, registry_name: str
) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ADMIN_FRAPPE_URL}/api/resource/Customer",
            json={
                "customer_name": customer_name,
                "customer_group": "Spark Mojo Clients",
                "territory": "All Territories",
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to create ERPNext Customer: {resp.status_code} {resp.text}"
            )
        erpnext_name = resp.json().get("data", {}).get("name", customer_name)

        await client.put(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry/{registry_name}",
            json={"erpnext_customer_name": erpnext_name},
            headers=_admin_headers(),
            timeout=10,
        )

    return erpnext_name


def _should_defer_revenue(
    sm_billing_type: str | None,
    period_start: int | None,
    period_end: int | None,
) -> bool:
    if sm_billing_type != "flat_monthly":
        return False
    if not period_start or not period_end:
        return False
    start = datetime.fromtimestamp(period_start, tz=timezone.utc)
    end = datetime.fromtimestamp(period_end, tz=timezone.utc)
    delta_days = (end - start).days
    return delta_days > 35


async def _build_sales_invoice_items(
    stripe_lines: list,
    period_start: int | None,
    period_end: int | None,
) -> list[dict]:
    items = []
    for line_item in stripe_lines:
        price = line_item.get("price") or {}
        product_id = price.get("product", "")

        product_metadata = {}
        if product_id:
            try:
                product = stripe.Product.retrieve(product_id)
                if hasattr(product, "to_dict"):
                    product_metadata = product.to_dict().get("metadata", {})
                elif isinstance(product, dict):
                    product_metadata = product.get("metadata", {})
                else:
                    product_metadata = dict(product).get("metadata", {})
            except Exception:
                logger.warning("Failed to retrieve Stripe Product %s", product_id)

        sm_action_id = product_metadata.get("sm_action_id", "")
        sm_billing_type = product_metadata.get("sm_billing_type", "")

        item_code = sm_action_id
        if sm_action_id:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{ADMIN_FRAPPE_URL}/api/resource/Item",
                    params={
                        "filters": json.dumps(
                            [["custom_sm_action_id", "=", sm_action_id]]
                        ),
                        "fields": '["name","item_code"]',
                        "limit_page_length": 1,
                    },
                    headers=_admin_headers(),
                    timeout=10,
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    if data:
                        item_code = data[0].get("item_code", sm_action_id)

        quantity = line_item.get("quantity") or 1
        amount_cents = line_item.get("amount", 0)
        amount = amount_cents / 100
        rate = amount / quantity if quantity else amount

        item = {
            "item_code": item_code,
            "qty": quantity,
            "rate": rate,
            "amount": amount,
            "sm_quoted_rack_rate": rate,
            "sm_discount_amount": 0,
        }

        if _should_defer_revenue(sm_billing_type, period_start, period_end):
            item["enable_deferred_revenue"] = 1
            if period_start:
                item["service_start_date"] = datetime.fromtimestamp(
                    period_start, tz=timezone.utc
                ).strftime("%Y-%m-%d")
            if period_end:
                item["service_end_date"] = datetime.fromtimestamp(
                    period_end, tz=timezone.utc
                ).strftime("%Y-%m-%d")

        items.append(item)

    return items


async def _create_payment_entry(
    invoice_name: str,
    amount: float,
    charge_id: str,
    customer: str,
    posting_date: str,
) -> str:
    payload = {
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": customer,
        "paid_amount": amount,
        "received_amount": amount,
        "mode_of_payment": "Credit Card",
        "reference_no": charge_id,
        "reference_date": posting_date,
        "paid_to": "Debtors - SM",
        "paid_from": "Cash - SM",
        "references": [
            {
                "reference_doctype": "Sales Invoice",
                "reference_name": invoice_name,
                "allocated_amount": amount,
            }
        ],
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ADMIN_FRAPPE_URL}/api/resource/Payment Entry",
            json=payload,
            headers=_admin_headers(),
            timeout=15,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to create Payment Entry: {resp.status_code} {resp.text}"
            )
        pe_name = resp.json().get("data", {}).get("name", "")

        await client.put(
            f"{ADMIN_FRAPPE_URL}/api/resource/Payment Entry/{pe_name}",
            json={"docstatus": 1},
            headers=_admin_headers(),
            timeout=10,
        )

    return pe_name


@router.post("/record-invoice")
async def record_invoice(
    request: Request,
    _: None = Depends(verify_admin_key),
):
    if not ADMIN_FRAPPE_URL:
        raise HTTPException(status_code=500, detail="Admin site not configured")

    body = await request.json()
    stripe_invoice_id = body.get("stripe_invoice_id")
    if not stripe_invoice_id:
        raise HTTPException(
            status_code=400, detail="stripe_invoice_id is required"
        )

    try:
        stripe_key = read_secret("stripe_secret_key")
    except SecretNotFoundError:
        raise HTTPException(
            status_code=500, detail="Stripe configuration missing"
        )

    existing = await _find_admin_sales_invoice(stripe_invoice_id)
    if existing:
        return {
            "status": "already_exists",
            "sales_invoice": existing["name"],
        }

    stripe.api_key = stripe_key
    try:
        invoice = stripe.Invoice.retrieve(
            stripe_invoice_id, expand=["charge"]
        )
        if hasattr(invoice, "to_dict"):
            invoice = invoice.to_dict()
        elif not isinstance(invoice, dict):
            invoice = dict(invoice)
    except stripe.StripeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Stripe API error: {str(e)}",
        )

    customer_id = invoice.get("customer", "")
    registry = await _get_registry_for_customer(customer_id)
    if not registry:
        raise HTTPException(
            status_code=404,
            detail=f"No SM Site Registry for Stripe customer {customer_id}",
        )

    erpnext_customer = registry.get("erpnext_customer_name", "")
    if not erpnext_customer:
        try:
            stripe_customer = stripe.Customer.retrieve(customer_id)
            cust_name = (
                stripe_customer.get("name")
                or stripe_customer.get("email")
                or customer_id
            )
        except Exception:
            cust_name = customer_id

        erpnext_customer = await _ensure_customer(
            customer_id, cust_name, registry["name"]
        )

    created_ts = invoice.get("created")
    posting_date = (
        datetime.fromtimestamp(created_ts, tz=timezone.utc).strftime("%Y-%m-%d")
        if created_ts
        else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )

    period_start = invoice.get("period_start")
    period_end = invoice.get("period_end")

    stripe_lines = invoice.get("lines", {}).get("data", [])
    si_items = await _build_sales_invoice_items(
        stripe_lines, period_start, period_end
    )

    si_payload = {
        "customer": erpnext_customer,
        "posting_date": posting_date,
        "due_date": posting_date,
        "custom_stripe_invoice_id": stripe_invoice_id,
        "items": si_items,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ADMIN_FRAPPE_URL}/api/resource/Sales Invoice",
            json=si_payload,
            headers=_admin_headers(),
            timeout=15,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to create Sales Invoice: {resp.status_code} {resp.text}"
            )
        si_name = resp.json().get("data", {}).get("name", "")

        await client.put(
            f"{ADMIN_FRAPPE_URL}/api/resource/Sales Invoice/{si_name}",
            json={"docstatus": 1},
            headers=_admin_headers(),
            timeout=10,
        )

    charge = invoice.get("charge")
    charge_id = ""
    if isinstance(charge, dict):
        charge_id = charge.get("id", "")
    elif isinstance(charge, str):
        charge_id = charge

    total = invoice.get("amount_paid", invoice.get("total", 0)) / 100
    pe_name = await _create_payment_entry(
        si_name, total, charge_id, erpnext_customer, posting_date
    )

    try:
        async with httpx.AsyncClient() as client:
            await client.get(
                f"{ADMIN_FRAPPE_URL}/api/resource/SM Stripe Event Log",
                params={
                    "filters": json.dumps(
                        [["payload", "like", f"%{stripe_invoice_id}%"]]
                    ),
                    "fields": '["name"]',
                    "limit_page_length": 1,
                },
                headers=_admin_headers(),
                timeout=10,
            )
    except Exception:
        logger.warning("Could not look up SM Stripe Event Log for %s", stripe_invoice_id)

    logger.info(
        "Recorded revenue: SI=%s PE=%s for Stripe invoice %s",
        si_name, pe_name, stripe_invoice_id,
    )

    return {
        "status": "created",
        "sales_invoice": si_name,
        "payment_entry": pe_name,
    }
