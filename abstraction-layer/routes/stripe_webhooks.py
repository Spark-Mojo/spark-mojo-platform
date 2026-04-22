import json
import logging
import os
from datetime import datetime, timezone

import httpx
import stripe
from fastapi import APIRouter, HTTPException, Request

from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.stripe-webhooks")

router = APIRouter(tags=["stripe-webhooks"])

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


async def _check_event_exists(stripe_event_id: str) -> bool:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Stripe Event Log",
            params={
                "filters": json.dumps([["stripe_event_id", "=", stripe_event_id]]),
                "fields": '["name"]',
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            return False
        data = resp.json().get("data", [])
        return len(data) > 0


async def _create_event_log(
    stripe_event_id: str,
    event_type: str,
    payload: str,
) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Stripe Event Log",
            json={
                "stripe_event_id": stripe_event_id,
                "event_type": event_type,
                "status": "received",
                "payload": payload,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Failed to create event log: {resp.text}")
        return resp.json().get("data", {}).get("name", stripe_event_id)


async def _update_event_log(name: str, updates: dict):
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Stripe Event Log/{name}",
            json=updates,
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code not in (200, 202):
            logger.error(
                "Failed to update SM Stripe Event Log %s: %s",
                name,
                resp.text,
            )


async def _get_site_for_subscription(
    stripe_subscription_id: str,
) -> tuple[str, str] | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            params={
                "filters": json.dumps(
                    [["stripe_subscription_id", "=", stripe_subscription_id]]
                ),
                "fields": '["name","site_name"]',
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", [])
        if not data:
            return None
        site_name = data[0].get("site_name", "")
        if not site_name:
            return None
        frappe_url = f"https://{site_name}"
        return site_name, frappe_url


def _client_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if ADMIN_API_KEY and ADMIN_API_SECRET:
        headers["Authorization"] = f"token {ADMIN_API_KEY}:{ADMIN_API_SECRET}"
    return headers


async def _find_sm_subscription(
    frappe_url: str, headers: dict, stripe_subscription_id: str
) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{frappe_url}/api/resource/SM Subscription",
            params={
                "filters": json.dumps(
                    [["stripe_subscription_id", "=", stripe_subscription_id]]
                ),
                "fields": '["name"]',
                "limit_page_length": 1,
            },
            headers=headers,
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", [])
        return data[0] if data else None


async def _upsert_sm_subscription(
    frappe_url: str,
    headers: dict,
    stripe_subscription_id: str,
    payload: dict,
):
    existing = await _find_sm_subscription(
        frappe_url, headers, stripe_subscription_id
    )
    async with httpx.AsyncClient() as client:
        if existing:
            resp = await client.put(
                f"{frappe_url}/api/resource/SM Subscription/{existing['name']}",
                json=payload,
                headers=headers,
                timeout=10,
            )
        else:
            resp = await client.post(
                f"{frappe_url}/api/resource/SM Subscription",
                json=payload,
                headers=headers,
                timeout=10,
            )
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to upsert SM Subscription: {resp.status_code} {resp.text}"
            )


def _build_subscription_payload(data_object: dict, billing_motion: str) -> dict:
    payload = {
        "source_system": "stripe",
        "stripe_customer_id": data_object.get("customer", ""),
        "stripe_subscription_id": data_object.get("id", ""),
        "billing_motion": billing_motion,
        "billing_status": data_object.get("status", ""),
        "cancel_at_period_end": 1 if data_object.get("cancel_at_period_end") else 0,
        "last_synced_at": datetime.now(timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
    }

    plan = data_object.get("plan") or {}
    if plan.get("interval"):
        payload["billing_interval"] = plan["interval"]

    period_start = data_object.get("current_period_start")
    if period_start:
        payload["current_period_start"] = datetime.fromtimestamp(
            period_start, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    period_end = data_object.get("current_period_end")
    if period_end:
        payload["current_period_end"] = datetime.fromtimestamp(
            period_end, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    trial_end = data_object.get("trial_end")
    if trial_end:
        payload["trial_end"] = datetime.fromtimestamp(
            trial_end, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    return payload


async def _get_registry_for_subscription(
    stripe_subscription_id: str,
) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            params={
                "filters": json.dumps(
                    [["stripe_subscription_id", "=", stripe_subscription_id]]
                ),
                "fields": '["name","site_name","billing_motion"]',
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", [])
        return data[0] if data else None


async def handle_subscription_sync(data_object: dict):
    sub_id = data_object.get("id", "")
    registry = await _get_registry_for_subscription(sub_id)
    if not registry:
        logger.warning("No SM Site Registry for stripe sub %s", sub_id)
        return

    site_name = registry.get("site_name", "")
    if not site_name:
        logger.warning("SM Site Registry has no site_name for sub %s", sub_id)
        return

    billing_motion = registry.get("billing_motion", "self_serve")
    frappe_url = f"https://{site_name}"
    headers = _client_headers()
    payload = _build_subscription_payload(data_object, billing_motion)

    await _upsert_sm_subscription(frappe_url, headers, sub_id, payload)
    logger.info("Synced SM Subscription for %s on %s", sub_id, site_name)


async def handle_subscription_deleted(data_object: dict):
    sub_id = data_object.get("id", "")
    registry = await _get_registry_for_subscription(sub_id)
    if not registry:
        logger.warning("No SM Site Registry for stripe sub %s", sub_id)
        return

    site_name = registry.get("site_name", "")
    if not site_name:
        logger.warning("SM Site Registry has no site_name for sub %s", sub_id)
        return

    frappe_url = f"https://{site_name}"
    headers = _client_headers()
    existing = await _find_sm_subscription(frappe_url, headers, sub_id)
    if not existing:
        logger.warning("No SM Subscription found for deleted sub %s", sub_id)
        return

    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{frappe_url}/api/resource/SM Subscription/{existing['name']}",
            json={
                "billing_status": "canceled",
                "last_synced_at": datetime.now(timezone.utc).strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
            },
            headers=headers,
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to update SM Subscription: {resp.status_code} {resp.text}"
            )
    logger.info("Marked SM Subscription canceled for %s on %s", sub_id, site_name)


async def _get_site_for_customer(
    stripe_customer_id: str,
) -> tuple[str, str] | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            params={
                "filters": json.dumps(
                    [["stripe_customer_id", "=", stripe_customer_id]]
                ),
                "fields": '["name","site_name"]',
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", [])
        if not data:
            return None
        site_name = data[0].get("site_name", "")
        if not site_name:
            return None
        frappe_url = f"https://{site_name}"
        return site_name, frappe_url


async def _find_sm_invoice(
    frappe_url: str, headers: dict, stripe_invoice_id: str
) -> dict | None:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{frappe_url}/api/resource/SM Invoice",
            params={
                "filters": json.dumps(
                    [["stripe_invoice_id", "=", stripe_invoice_id]]
                ),
                "fields": '["name"]',
                "limit_page_length": 1,
            },
            headers=headers,
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        data = resp.json().get("data", [])
        return data[0] if data else None


async def _upsert_sm_invoice(
    frappe_url: str,
    headers: dict,
    stripe_invoice_id: str,
    payload: dict,
):
    existing = await _find_sm_invoice(
        frappe_url, headers, stripe_invoice_id
    )
    async with httpx.AsyncClient() as client:
        if existing:
            resp = await client.put(
                f"{frappe_url}/api/resource/SM Invoice/{existing['name']}",
                json=payload,
                headers=headers,
                timeout=10,
            )
        else:
            resp = await client.post(
                f"{frappe_url}/api/resource/SM Invoice",
                json=payload,
                headers=headers,
                timeout=10,
            )
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to upsert SM Invoice: {resp.status_code} {resp.text}"
            )


def _build_invoice_line(line_item: dict, product: dict) -> dict:
    metadata = product.get("metadata") or {}
    price = line_item.get("price") or {}
    recurring = price.get("recurring") or {}
    usage_type = recurring.get("usage_type", "")

    if usage_type == "metered":
        price_type = "metered_overage"
    else:
        price_type = "subscription"

    billing_type = metadata.get("sm_billing_type")
    action_id = metadata.get("sm_action_id")

    meter_name = None
    if billing_type in ("always_billed", "metered_overage"):
        meter_name = action_id

    unit_amount_raw = price.get("unit_amount")
    unit_amount = unit_amount_raw / 100 if unit_amount_raw else 0

    return {
        "mojo_id": metadata.get("sm_mojo_id"),
        "action_id": action_id,
        "invoice_line_label": product.get("name", ""),
        "description": line_item.get("description", ""),
        "quantity": line_item.get("quantity", 0),
        "unit_amount": unit_amount,
        "amount": line_item.get("amount", 0) / 100,
        "price_type": price_type,
        "billing_type": billing_type,
        "meter_name": meter_name,
    }


def _build_invoice_payload(data_object: dict, lines: list) -> dict:
    payload = {
        "source_system": "stripe",
        "stripe_invoice_id": data_object.get("id", ""),
        "invoice_number": data_object.get("number"),
        "status": data_object.get("status", ""),
        "total": data_object.get("total", 0) / 100,
        "subtotal": data_object.get("subtotal", 0) / 100,
        "tax": (data_object.get("tax") or 0) / 100,
        "amount_paid": data_object.get("amount_paid", 0) / 100,
        "amount_remaining": data_object.get("amount_remaining", 0) / 100,
        "currency": data_object.get("currency", "usd"),
        "hosted_invoice_url": data_object.get("hosted_invoice_url"),
        "invoice_pdf_url": data_object.get("invoice_pdf"),
        "lines": lines,
    }

    created = data_object.get("created")
    if created:
        payload["invoice_date"] = datetime.fromtimestamp(
            created, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    due_date = data_object.get("due_date")
    if due_date:
        payload["due_date"] = datetime.fromtimestamp(
            due_date, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    period_start = data_object.get("period_start")
    if period_start:
        payload["period_start"] = datetime.fromtimestamp(
            period_start, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    period_end = data_object.get("period_end")
    if period_end:
        payload["period_end"] = datetime.fromtimestamp(
            period_end, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    status_transitions = data_object.get("status_transitions") or {}
    paid_at = status_transitions.get("paid_at")
    if paid_at:
        payload["payment_date"] = datetime.fromtimestamp(
            paid_at, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    return payload


async def handle_invoice_sync(data_object: dict):
    invoice_id = data_object.get("id", "")
    customer_id = data_object.get("customer", "")

    site_info = await _get_site_for_customer(customer_id)
    if not site_info:
        logger.warning(
            "No SM Site Registry for stripe customer %s (invoice %s)",
            customer_id,
            invoice_id,
        )
        return

    site_name, frappe_url = site_info
    headers = _client_headers()

    stripe_lines = data_object.get("lines", {}).get("data", [])
    invoice_lines = []
    for line_item in stripe_lines:
        price = line_item.get("price") or {}
        product_id = price.get("product", "")
        product = {}
        if product_id:
            try:
                product = stripe.Product.retrieve(product_id)
                if hasattr(product, "to_dict"):
                    product = product.to_dict()
                elif not isinstance(product, dict):
                    product = dict(product)
            except Exception:
                logger.warning(
                    "Failed to retrieve Stripe Product %s", product_id
                )
                product = {}
        invoice_lines.append(_build_invoice_line(line_item, product))

    payload = _build_invoice_payload(data_object, invoice_lines)
    await _upsert_sm_invoice(
        frappe_url, headers, data_object.get("id", ""), payload
    )
    logger.info(
        "Synced SM Invoice %s on %s", invoice_id, site_name
    )


async def handle_invoice_paid(data_object: dict):
    await handle_invoice_sync(data_object)


async def handle_invoice_payment_failed(data_object: dict):
    await handle_invoice_sync(data_object)


async def handle_trial_will_end(data_object: dict):
    sub_id = data_object.get("id", "")
    registry = await _get_registry_for_subscription(sub_id)
    if not registry:
        logger.warning("No SM Site Registry for stripe sub %s", sub_id)
        return

    site_name = registry.get("site_name", "")
    if not site_name:
        logger.warning("SM Site Registry has no site_name for sub %s", sub_id)
        return

    frappe_url = f"https://{site_name}"
    headers = _client_headers()
    existing = await _find_sm_subscription(frappe_url, headers, sub_id)
    if not existing:
        logger.warning("No SM Subscription found for trial_will_end sub %s", sub_id)
        return

    trial_end = data_object.get("trial_end")
    updates = {
        "last_synced_at": datetime.now(timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
    }
    if trial_end:
        updates["trial_end"] = datetime.fromtimestamp(
            trial_end, tz=timezone.utc
        ).strftime("%Y-%m-%d")

    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{frappe_url}/api/resource/SM Subscription/{existing['name']}",
            json=updates,
            headers=headers,
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to update SM Subscription: {resp.status_code} {resp.text}"
            )
    logger.info("Updated trial_end for sub %s on %s", sub_id, site_name)


HANDLERS = {
    "customer.subscription.created": handle_subscription_sync,
    "customer.subscription.updated": handle_subscription_sync,
    "customer.subscription.deleted": handle_subscription_deleted,
    "invoice.created": handle_invoice_sync,
    "invoice.finalized": handle_invoice_sync,
    "invoice.paid": handle_invoice_paid,
    "invoice.payment_failed": handle_invoice_payment_failed,
    "customer.subscription.trial_will_end": handle_trial_will_end,
}


async def dispatch_event(event):
    handler = HANDLERS.get(event["type"])
    if handler is None:
        logger.info("No handler for event type: %s", event["type"])
        return
    await handler(event["data"]["object"])


@router.post("/billing")
async def stripe_billing_webhook(request: Request):
    if not ADMIN_FRAPPE_URL:
        raise HTTPException(status_code=500, detail="Admin site not configured")

    try:
        webhook_secret = read_secret("stripe_webhook_secret")
    except SecretNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Webhook secret not configured",
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="invalid signature")

    event_id = event["id"]
    event_type = event["type"]
    event_payload = json.dumps(event["data"]["object"])

    if await _check_event_exists(event_id):
        return {"status": "already_processed"}

    try:
        log_name = await _create_event_log(event_id, event_type, event_payload)
    except RuntimeError as e:
        logger.error("Failed to create event log: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create event log")

    try:
        await dispatch_event(event)
        await _update_event_log(log_name, {
            "status": "processed",
            "processed_at": datetime.now(timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
        })
    except Exception as e:
        await _update_event_log(log_name, {
            "status": "failed",
            "error_message": str(e),
        })
        raise HTTPException(status_code=500, detail="webhook processing failed")

    return {"status": "ok"}
