#!/usr/bin/env python3
"""Provision Stripe Products, Prices, and Meters from the Billable Action Registry."""

import argparse
import logging
import os
import sys

import httpx
import stripe

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from secrets_loader import read_secret, SecretNotFoundError  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def build_session(admin_site: str, api_key: str, api_secret: str) -> httpx.Client:
    return httpx.Client(
        base_url=f"https://{admin_site}",
        headers={"Authorization": f"token {api_key}:{api_secret}"},
        timeout=30.0,
    )


def fetch_billable_items(client: httpx.Client) -> list[dict]:
    params = {
        "filters": '[["sm_billing_type","is","set"],["sm_billing_type","!=","included"]]',
        "fields": '["item_code","item_name","sm_mojo_id","sm_action_id",'
                  '"sm_billing_type","sm_included_units","sm_invoice_line_label","stock_uom"]',
        "limit_page_length": "0",
    }
    resp = client.get("/api/resource/Item", params=params)
    resp.raise_for_status()
    return resp.json().get("data", [])


def find_product_by_action_id(action_id: str) -> stripe.Product | None:
    products = stripe.Product.search(query=f'metadata["sm_action_id"]:"{action_id}"')
    if products.data:
        return products.data[0]
    return None


def ensure_product(item: dict, dry_run: bool) -> stripe.Product | None:
    action_id = item["sm_action_id"]
    label = item.get("sm_invoice_line_label") or item["item_name"]
    metadata = {
        "sm_mojo_id": item["sm_mojo_id"],
        "sm_action_id": action_id,
        "sm_billing_type": item["sm_billing_type"],
    }

    if dry_run:
        log.info("[DRY-RUN] would ensure product for %s", action_id)
        return None

    existing = find_product_by_action_id(action_id)
    if existing:
        product = stripe.Product.modify(
            existing.id, name=label, metadata=metadata
        )
        log.info("updated stripe product %s for %s", product.id, action_id)
        return product

    product = stripe.Product.create(name=label, metadata=metadata)
    log.info("created stripe product %s for %s", product.id, action_id)
    return product


def has_price(product_id: str) -> bool:
    prices = stripe.Price.list(product=product_id, limit=1)
    return len(prices.data) > 0


def create_price(product: stripe.Product, item: dict, dry_run: bool) -> None:
    billing_type = item["sm_billing_type"]
    action_id = item["sm_action_id"]

    if dry_run:
        log.info("[DRY-RUN] would create price for %s (%s)", action_id, billing_type)
        return

    if has_price(product.id):
        log.info("price already exists for product %s (%s), skipping", product.id, action_id)
        return

    if billing_type == "flat_monthly":
        stripe.Price.create(
            product=product.id,
            currency="usd",
            unit_amount=0,
            recurring={"interval": "month", "usage_type": "licensed"},
        )
    elif billing_type == "always_billed":
        stripe.Price.create(
            product=product.id,
            currency="usd",
            unit_amount=0,
            recurring={"interval": "month", "usage_type": "metered", "aggregate_usage": "sum"},
        )
    elif billing_type == "metered_overage":
        included = int(item.get("sm_included_units") or 0)
        stripe.Price.create(
            product=product.id,
            currency="usd",
            recurring={"interval": "month", "usage_type": "metered"},
            tiers_mode="graduated",
            billing_scheme="tiered",
            tiers=[
                {"up_to": included, "unit_amount": 0},
                {"up_to": "inf", "unit_amount": 0},
            ],
        )
    elif billing_type in ("one_time_implementation", "one_time_enhancement"):
        stripe.Price.create(
            product=product.id,
            currency="usd",
            unit_amount=0,
        )
    else:
        log.warning("unknown billing_type %s for %s, skipping price", billing_type, action_id)
        return

    log.info("created stripe price for %s (%s)", action_id, billing_type)


def find_meter_by_event_name(event_name: str) -> stripe.billing.Meter | None:
    meters = stripe.billing.Meter.list(limit=100)
    for m in meters.data:
        if m.event_name == event_name:
            return m
    return None


def ensure_meter(item: dict, dry_run: bool) -> None:
    billing_type = item["sm_billing_type"]
    if billing_type not in ("always_billed", "metered_overage"):
        return

    mojo_id = item["sm_mojo_id"]
    action_id = item["sm_action_id"]
    event_name = f"{mojo_id}.{action_id}"
    display_name = f"{mojo_id}: {action_id}"
    stock_uom = (item.get("stock_uom") or "").lower()
    formula = "last" if "seat" in stock_uom else "sum"

    if dry_run:
        log.info("[DRY-RUN] would ensure meter %s (aggregation=%s)", event_name, formula)
        return

    existing = find_meter_by_event_name(event_name)
    if existing:
        log.info("meter already exists for %s (%s), skipping", event_name, existing.id)
        return

    meter = stripe.billing.Meter.create(
        display_name=display_name,
        event_name=event_name,
        default_aggregation={"formula": formula},
        customer_mapping={"event_payload_key": "stripe_customer_id", "type": "by_id"},
        value_settings={"event_payload_key": "value"},
    )
    log.info("created stripe meter %s for %s", meter.id, event_name)


def run(admin_site: str, dry_run: bool, test_mode: bool) -> int:
    secret_name = "stripe_test_secret_key" if test_mode else "stripe_secret_key"
    try:
        stripe.api_key = read_secret(secret_name)
    except SecretNotFoundError as exc:
        log.error("cannot read Stripe key: %s", exc)
        return 1

    api_key = os.environ.get("ADMIN_FRAPPE_API_KEY")
    api_secret = os.environ.get("ADMIN_FRAPPE_API_SECRET")
    if not api_key or not api_secret:
        log.error("missing ADMIN_FRAPPE_API_KEY or ADMIN_FRAPPE_API_SECRET")
        return 1

    client = build_session(admin_site, api_key, api_secret)
    try:
        items = fetch_billable_items(client)
    except httpx.HTTPError as exc:
        log.error("failed to fetch items from ERPNext: %s", exc)
        return 1
    finally:
        client.close()

    if not items:
        log.info("no billable items found, nothing to do")
        return 0

    failed = 0
    for item in items:
        action_id = item.get("sm_action_id", "<unknown>")
        try:
            product = ensure_product(item, dry_run)
            if product:
                create_price(product, item, dry_run)
            ensure_meter(item, dry_run)
        except stripe.StripeError as exc:
            log.error("stripe error for %s: %s", action_id, exc)
            failed += 1
        except Exception as exc:
            log.error("unexpected error for %s: %s", action_id, exc)
            failed += 1

    log.info("processed %d items, %d failed", len(items), failed)
    return 1 if failed > 0 else 0


def main():
    parser = argparse.ArgumentParser(
        description="Provision Stripe Products, Prices, and Meters from ERPNext Billable Action Registry",
    )
    parser.add_argument(
        "--admin-site", default="admin.sparkmojo.com",
        help="Admin site hostname (default: admin.sparkmojo.com)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Log planned operations without calling Stripe API")
    parser.add_argument("--test-mode", action="store_true", help="Use Stripe test secret key")
    args = parser.parse_args()

    sys.exit(run(args.admin_site, args.dry_run, args.test_mode))


if __name__ == "__main__":
    main()
