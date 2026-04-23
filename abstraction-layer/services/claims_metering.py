import time
import logging

import stripe

from secrets_loader import SecretNotFoundError, read_secret
from services.ai_metering import update_usage_summary

logger = logging.getLogger("abstraction-layer.claims_metering")


async def record_claim_submitted(
    site_name: str,
    stripe_customer_id: str | None,
    claim_name: str,
):
    if stripe_customer_id:
        try:
            stripe.api_key = read_secret("stripe_secret_key")
            stripe.billing.MeterEvent.create(
                event_name="sm_account_billing.claims_processed",
                payload={
                    "stripe_customer_id": stripe_customer_id,
                    "value": "1",
                },
                timestamp=int(time.time()),
            )
        except SecretNotFoundError:
            logger.warning(
                "stripe_secret_key not available, skipping Stripe claim meter"
            )
        except Exception as e:
            logger.error(
                "Stripe claim meter failed for %s / %s: %s",
                stripe_customer_id, claim_name, e,
            )

    await update_usage_summary(site_name, {"claims_processed": ("+=", 1)})
