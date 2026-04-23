import os
import logging
import stripe
from collections import defaultdict
from threading import Lock

import httpx

from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.ai_metering")

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")


def _read_secret_or_empty(name: str) -> str:
    try:
        return read_secret(name)
    except SecretNotFoundError:
        return ""


class AITokenMeter:
    """Provider-agnostic AI token meter.

    Buffers token counts per tenant and flushes to Stripe Meters
    (Self-Serve) and SM Usage Summary (all motions) every 15 minutes.
    """

    def __init__(self):
        self._buffer = defaultdict(int)
        self._tier_buffer = defaultdict(lambda: defaultdict(int))
        self._lock = Lock()
        self.FLUSH_INTERVAL = 900

    def record(self, site_name: str, stripe_customer_id: str | None,
               input_tokens: int, output_tokens: int, model_tier: str):
        total = input_tokens + output_tokens
        with self._lock:
            self._buffer[(site_name, stripe_customer_id)] += total
            self._tier_buffer[site_name][model_tier] += total

    async def flush(self):
        with self._lock:
            snapshot = dict(self._buffer)
            tier_snapshot = {k: dict(v) for k, v in self._tier_buffer.items()}
            self._buffer.clear()
            self._tier_buffer.clear()

        try:
            stripe.api_key = read_secret("stripe_secret_key")
        except SecretNotFoundError:
            logger.warning("stripe_secret_key not available, skipping Stripe meter events")
            stripe.api_key = None

        for (site, customer_id), tokens in snapshot.items():
            if tokens <= 0:
                continue
            if customer_id and stripe.api_key:
                try:
                    stripe.billing.MeterEvent.create(
                        event_name="sm_account_billing.ai_token_usage",
                        payload={
                            "stripe_customer_id": customer_id,
                            "value": str(tokens),
                        },
                    )
                except Exception as e:
                    logger.error(f"Stripe MeterEvent failed for {customer_id}: {e}")
            try:
                await update_usage_summary(
                    site, {"ai_tokens_used": ("+=", tokens)}
                )
            except Exception as e:
                logger.error(f"Usage summary update failed for {site}: {e}")

        for site, tiers in tier_snapshot.items():
            tier_fields = {}
            for i in range(3):
                tier_key = f"tier{i + 1}"
                value = tiers.get(tier_key, 0)
                if value > 0:
                    tier_fields[f"ai_tokens_tier{i + 1}_used"] = ("+=", value)
            if tier_fields:
                try:
                    await update_usage_summary(site, tier_fields)
                except Exception as e:
                    logger.error(
                        f"Tier usage summary update failed for {site}: {e}"
                    )


async def update_usage_summary(site_name: str, increments: dict):
    """Increment fields on SM Usage Summary for the given site."""
    if not FRAPPE_URL:
        return

    api_key = _read_secret_or_empty("frappe_api_key")
    api_secret = _read_secret_or_empty("frappe_api_secret")
    headers = {}
    if api_key and api_secret:
        headers["Authorization"] = f"token {api_key}:{api_secret}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{FRAPPE_URL}/api/resource/SM Usage Summary/{site_name}",
                headers=headers,
            )
            if resp.status_code == 404:
                logger.debug(
                    f"SM Usage Summary not found for {site_name}, skipping"
                )
                return
            resp.raise_for_status()
            current = resp.json().get("data", {})

            update = {}
            for field, (op, value) in increments.items():
                if op == "+=":
                    update[field] = (current.get(field) or 0) + value
                else:
                    update[field] = value

            if not update:
                return

            resp = await client.put(
                f"{FRAPPE_URL}/api/resource/SM Usage Summary/{site_name}",
                headers=headers,
                json=update,
            )
            resp.raise_for_status()
    except Exception as e:
        logger.error(
            f"Failed to update SM Usage Summary for {site_name}: {e}"
        )


meter = AITokenMeter()
