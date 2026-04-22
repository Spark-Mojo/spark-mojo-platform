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


async def handle_subscription_sync(data_object: dict):
    logger.info(
        "Stub handler: subscription sync for %s",
        data_object.get("id", ""),
    )


async def handle_subscription_deleted(data_object: dict):
    logger.info(
        "Stub handler: subscription deleted for %s",
        data_object.get("id", ""),
    )


async def handle_invoice_sync(data_object: dict):
    logger.info(
        "Stub handler: invoice sync for %s",
        data_object.get("id", ""),
    )


async def handle_invoice_paid(data_object: dict):
    logger.info(
        "Stub handler: invoice paid for %s",
        data_object.get("id", ""),
    )


async def handle_invoice_payment_failed(data_object: dict):
    logger.info(
        "Stub handler: invoice payment failed for %s",
        data_object.get("id", ""),
    )


async def handle_trial_will_end(data_object: dict):
    logger.info(
        "Stub handler: trial will end for %s",
        data_object.get("id", ""),
    )


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
