#!/usr/bin/env python3
"""Create or update a Stripe Billing Portal Configuration for Spark Mojo."""

import argparse
import logging
import os
import sys

import stripe

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from secrets_loader import read_secret, SecretNotFoundError  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

PORTAL_FEATURES = {
    "payment_method_update": {"enabled": True},
    "invoice_history": {"enabled": True},
    "subscription_cancel": {"enabled": False},
    "subscription_update": {"enabled": False},
}

BUSINESS_PROFILE = {
    "headline": "Spark Mojo Billing",
    "privacy_policy_url": "https://sparkmojo.com/privacy",
    "terms_of_service_url": "https://sparkmojo.com/terms",
}


def get_existing_config_id() -> str | None:
    try:
        return read_secret("stripe_customer_portal_config_id")
    except SecretNotFoundError:
        return None


def create_or_update_portal(test_mode: bool = False) -> str:
    try:
        key_name = "stripe_test_secret_key" if test_mode else "stripe_secret_key"
        stripe.api_key = read_secret(key_name)
    except SecretNotFoundError:
        log.error("Stripe API key not found: %s", key_name)
        sys.exit(1)

    existing_id = get_existing_config_id()

    params = {
        "business_profile": BUSINESS_PROFILE,
        "features": PORTAL_FEATURES,
    }

    if existing_id:
        log.info("Updating existing portal configuration: %s", existing_id)
        config = stripe.billing_portal.Configuration.modify(
            existing_id, **params
        )
        log.info("Portal configuration updated: %s", config.id)
    else:
        log.info("Creating new portal configuration")
        config = stripe.billing_portal.Configuration.create(**params)
        log.info("Portal configuration created: %s", config.id)
        log.info(
            "ACTION REQUIRED: Store this ID in Infisical as "
            "'stripe_customer_portal_config_id': %s",
            config.id,
        )

    return config.id


def main():
    parser = argparse.ArgumentParser(
        description="Set up Stripe Customer Portal configuration"
    )
    parser.add_argument(
        "--test-mode",
        action="store_true",
        help="Use test/dev Stripe key instead of live key",
    )
    args = parser.parse_args()
    config_id = create_or_update_portal(test_mode=args.test_mode)
    print(f"Portal configuration ID: {config_id}")


if __name__ == "__main__":
    main()
