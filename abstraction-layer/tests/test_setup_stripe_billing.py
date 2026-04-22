"""Tests for setup_stripe_billing.py."""

import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from scripts.setup_stripe_billing import (  # noqa: E402
    run,
    ensure_product,
    create_price,
    ensure_meter,
    find_product_by_action_id,
)

SAMPLE_ITEM_FLAT = {
    "item_code": "ITEM-001",
    "item_name": "Platform Access",
    "sm_mojo_id": "core",
    "sm_action_id": "platform_access",
    "sm_billing_type": "flat_monthly",
    "sm_included_units": None,
    "sm_invoice_line_label": "Platform Access Fee",
    "stock_uom": "Unit",
}

SAMPLE_ITEM_ALWAYS = {
    "item_code": "ITEM-002",
    "item_name": "API Calls",
    "sm_mojo_id": "api",
    "sm_action_id": "api_calls",
    "sm_billing_type": "always_billed",
    "sm_included_units": None,
    "sm_invoice_line_label": "API Call Usage",
    "stock_uom": "Call",
}

SAMPLE_ITEM_OVERAGE = {
    "item_code": "ITEM-003",
    "item_name": "Claims Processing",
    "sm_mojo_id": "billing",
    "sm_action_id": "claims_processed",
    "sm_billing_type": "metered_overage",
    "sm_included_units": 500,
    "sm_invoice_line_label": "Claims Processing",
    "stock_uom": "Claim",
}

SAMPLE_ITEM_ONETIME_IMPL = {
    "item_code": "ITEM-004",
    "item_name": "Implementation",
    "sm_mojo_id": "onboarding",
    "sm_action_id": "implementation",
    "sm_billing_type": "one_time_implementation",
    "sm_included_units": None,
    "sm_invoice_line_label": "Implementation Fee",
    "stock_uom": "Unit",
}

SAMPLE_ITEM_ONETIME_ENH = {
    "item_code": "ITEM-005",
    "item_name": "Enhancement",
    "sm_mojo_id": "onboarding",
    "sm_action_id": "enhancement",
    "sm_billing_type": "one_time_enhancement",
    "sm_included_units": None,
    "sm_invoice_line_label": "Enhancement Fee",
    "stock_uom": "Unit",
}

SAMPLE_ITEM_SEAT = {
    "item_code": "ITEM-006",
    "item_name": "Staff Seats",
    "sm_mojo_id": "core",
    "sm_action_id": "staff_seats",
    "sm_billing_type": "always_billed",
    "sm_included_units": None,
    "sm_invoice_line_label": "Staff Seat License",
    "stock_uom": "Seat",
}


class TestFindProductByActionId:
    @patch("scripts.setup_stripe_billing.stripe")
    def test_found(self, mock_stripe):
        prod = MagicMock(id="prod_123")
        mock_stripe.Product.search.return_value = MagicMock(data=[prod])
        result = find_product_by_action_id("platform_access")
        mock_stripe.Product.search.assert_called_once_with(
            query='metadata["sm_action_id"]:"platform_access"'
        )
        assert result == prod

    @patch("scripts.setup_stripe_billing.stripe")
    def test_not_found(self, mock_stripe):
        mock_stripe.Product.search.return_value = MagicMock(data=[])
        result = find_product_by_action_id("nonexistent")
        assert result is None


class TestEnsureProduct:
    @patch("scripts.setup_stripe_billing.find_product_by_action_id")
    @patch("scripts.setup_stripe_billing.stripe")
    def test_create_new(self, mock_stripe, mock_find):
        mock_find.return_value = None
        mock_stripe.Product.create.return_value = MagicMock(id="prod_new")
        result = ensure_product(SAMPLE_ITEM_FLAT, dry_run=False)
        mock_stripe.Product.create.assert_called_once()
        assert result.id == "prod_new"

    @patch("scripts.setup_stripe_billing.find_product_by_action_id")
    @patch("scripts.setup_stripe_billing.stripe")
    def test_update_existing(self, mock_stripe, mock_find):
        existing = MagicMock(id="prod_existing")
        mock_find.return_value = existing
        mock_stripe.Product.modify.return_value = MagicMock(id="prod_existing")
        result = ensure_product(SAMPLE_ITEM_FLAT, dry_run=False)
        mock_stripe.Product.modify.assert_called_once()
        assert result.id == "prod_existing"

    @patch("scripts.setup_stripe_billing.find_product_by_action_id")
    @patch("scripts.setup_stripe_billing.stripe")
    def test_dry_run(self, mock_stripe, mock_find):
        result = ensure_product(SAMPLE_ITEM_FLAT, dry_run=True)
        assert result is None
        mock_find.assert_not_called()
        mock_stripe.Product.create.assert_not_called()


class TestCreatePrice:
    @patch("scripts.setup_stripe_billing.has_price", return_value=False)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_flat_monthly(self, mock_stripe, _):
        product = MagicMock(id="prod_1")
        create_price(product, SAMPLE_ITEM_FLAT, dry_run=False)
        call_kwargs = mock_stripe.Price.create.call_args[1]
        assert call_kwargs["recurring"]["usage_type"] == "licensed"
        assert call_kwargs["recurring"]["interval"] == "month"
        assert call_kwargs["unit_amount"] == 0

    @patch("scripts.setup_stripe_billing.has_price", return_value=False)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_always_billed(self, mock_stripe, _):
        product = MagicMock(id="prod_2")
        create_price(product, SAMPLE_ITEM_ALWAYS, dry_run=False)
        call_kwargs = mock_stripe.Price.create.call_args[1]
        assert call_kwargs["recurring"]["usage_type"] == "metered"
        assert call_kwargs["recurring"]["aggregate_usage"] == "sum"

    @patch("scripts.setup_stripe_billing.has_price", return_value=False)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_metered_overage(self, mock_stripe, _):
        product = MagicMock(id="prod_3")
        create_price(product, SAMPLE_ITEM_OVERAGE, dry_run=False)
        call_kwargs = mock_stripe.Price.create.call_args[1]
        assert call_kwargs["tiers_mode"] == "graduated"
        assert call_kwargs["tiers"][0]["up_to"] == 500
        assert call_kwargs["tiers"][1]["up_to"] == "inf"

    @patch("scripts.setup_stripe_billing.has_price", return_value=False)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_one_time_implementation(self, mock_stripe, _):
        product = MagicMock(id="prod_4")
        create_price(product, SAMPLE_ITEM_ONETIME_IMPL, dry_run=False)
        call_kwargs = mock_stripe.Price.create.call_args[1]
        assert call_kwargs["unit_amount"] == 0
        assert "recurring" not in call_kwargs

    @patch("scripts.setup_stripe_billing.has_price", return_value=False)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_one_time_enhancement(self, mock_stripe, _):
        product = MagicMock(id="prod_5")
        create_price(product, SAMPLE_ITEM_ONETIME_ENH, dry_run=False)
        call_kwargs = mock_stripe.Price.create.call_args[1]
        assert call_kwargs["unit_amount"] == 0
        assert "recurring" not in call_kwargs

    @patch("scripts.setup_stripe_billing.has_price", return_value=True)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_skip_existing_price(self, mock_stripe, _):
        product = MagicMock(id="prod_6")
        create_price(product, SAMPLE_ITEM_FLAT, dry_run=False)
        mock_stripe.Price.create.assert_not_called()

    @patch("scripts.setup_stripe_billing.has_price", return_value=False)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_dry_run(self, mock_stripe, _):
        product = MagicMock(id="prod_7")
        create_price(product, SAMPLE_ITEM_FLAT, dry_run=True)
        mock_stripe.Price.create.assert_not_called()


class TestEnsureMeter:
    @patch("scripts.setup_stripe_billing.find_meter_by_event_name", return_value=None)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_create_meter_always_billed(self, mock_stripe, _):
        ensure_meter(SAMPLE_ITEM_ALWAYS, dry_run=False)
        call_kwargs = mock_stripe.billing.Meter.create.call_args[1]
        assert call_kwargs["event_name"] == "api.api_calls"
        assert call_kwargs["default_aggregation"]["formula"] == "sum"
        assert call_kwargs["customer_mapping"]["event_payload_key"] == "stripe_customer_id"

    @patch("scripts.setup_stripe_billing.find_meter_by_event_name", return_value=None)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_create_meter_metered_overage(self, mock_stripe, _):
        ensure_meter(SAMPLE_ITEM_OVERAGE, dry_run=False)
        call_kwargs = mock_stripe.billing.Meter.create.call_args[1]
        assert call_kwargs["event_name"] == "billing.claims_processed"
        assert call_kwargs["default_aggregation"]["formula"] == "sum"

    @patch("scripts.setup_stripe_billing.find_meter_by_event_name", return_value=None)
    @patch("scripts.setup_stripe_billing.stripe")
    def test_seat_type_uses_last(self, mock_stripe, _):
        ensure_meter(SAMPLE_ITEM_SEAT, dry_run=False)
        call_kwargs = mock_stripe.billing.Meter.create.call_args[1]
        assert call_kwargs["default_aggregation"]["formula"] == "last"

    @patch("scripts.setup_stripe_billing.find_meter_by_event_name")
    @patch("scripts.setup_stripe_billing.stripe")
    def test_skip_existing_meter(self, mock_stripe, mock_find):
        mock_find.return_value = MagicMock(id="meter_existing")
        ensure_meter(SAMPLE_ITEM_ALWAYS, dry_run=False)
        mock_stripe.billing.Meter.create.assert_not_called()

    @patch("scripts.setup_stripe_billing.find_meter_by_event_name")
    @patch("scripts.setup_stripe_billing.stripe")
    def test_skip_non_metered_types(self, mock_stripe, mock_find):
        ensure_meter(SAMPLE_ITEM_FLAT, dry_run=False)
        mock_find.assert_not_called()
        mock_stripe.billing.Meter.create.assert_not_called()

    @patch("scripts.setup_stripe_billing.find_meter_by_event_name")
    @patch("scripts.setup_stripe_billing.stripe")
    def test_dry_run(self, mock_stripe, mock_find):
        ensure_meter(SAMPLE_ITEM_ALWAYS, dry_run=True)
        mock_find.assert_not_called()
        mock_stripe.billing.Meter.create.assert_not_called()


class TestRun:
    @patch.dict(os.environ, {
        "ADMIN_FRAPPE_API_KEY": "key",
        "ADMIN_FRAPPE_API_SECRET": "secret",
    })
    @patch("scripts.setup_stripe_billing.read_secret", side_effect=Exception("not found"))
    def test_missing_stripe_key_exits_1(self, _):
        from secrets_loader import SecretNotFoundError
        with patch("scripts.setup_stripe_billing.read_secret", side_effect=SecretNotFoundError("stripe key not found")):
            result = run("admin.sparkmojo.com", dry_run=False, test_mode=True)
        assert result == 1

    @patch.dict(os.environ, {}, clear=True)
    @patch("scripts.setup_stripe_billing.read_secret", return_value="sk_test_xxx")
    def test_missing_frappe_key_exits_1(self, _):
        result = run("admin.sparkmojo.com", dry_run=False, test_mode=True)
        assert result == 1

    @patch.dict(os.environ, {
        "ADMIN_FRAPPE_API_KEY": "key",
        "ADMIN_FRAPPE_API_SECRET": "secret",
    })
    @patch("scripts.setup_stripe_billing.read_secret", return_value="sk_test_xxx")
    @patch("scripts.setup_stripe_billing.fetch_billable_items", return_value=[])
    @patch("scripts.setup_stripe_billing.build_session")
    def test_no_items_exits_0(self, mock_session, mock_fetch, _):
        mock_client = MagicMock()
        mock_session.return_value = mock_client
        result = run("admin.sparkmojo.com", dry_run=False, test_mode=True)
        assert result == 0

    @patch.dict(os.environ, {
        "ADMIN_FRAPPE_API_KEY": "key",
        "ADMIN_FRAPPE_API_SECRET": "secret",
    })
    @patch("scripts.setup_stripe_billing.read_secret", return_value="sk_test_xxx")
    @patch("scripts.setup_stripe_billing.fetch_billable_items", return_value=[SAMPLE_ITEM_FLAT])
    @patch("scripts.setup_stripe_billing.build_session")
    @patch("scripts.setup_stripe_billing.ensure_product")
    @patch("scripts.setup_stripe_billing.create_price")
    @patch("scripts.setup_stripe_billing.ensure_meter")
    def test_dry_run_no_stripe_calls(self, mock_meter, mock_price, mock_prod, mock_session, mock_fetch, _):
        mock_client = MagicMock()
        mock_session.return_value = mock_client
        mock_prod.return_value = None
        result = run("admin.sparkmojo.com", dry_run=True, test_mode=True)
        assert result == 0
        mock_prod.assert_called_once_with(SAMPLE_ITEM_FLAT, True)
        mock_price.assert_not_called()
        mock_meter.assert_called_once_with(SAMPLE_ITEM_FLAT, True)

    @patch.dict(os.environ, {
        "ADMIN_FRAPPE_API_KEY": "key",
        "ADMIN_FRAPPE_API_SECRET": "secret",
    })
    @patch("scripts.setup_stripe_billing.read_secret", return_value="sk_test_xxx")
    @patch("scripts.setup_stripe_billing.fetch_billable_items", return_value=[SAMPLE_ITEM_FLAT])
    @patch("scripts.setup_stripe_billing.build_session")
    @patch("scripts.setup_stripe_billing.ensure_product")
    @patch("scripts.setup_stripe_billing.create_price")
    @patch("scripts.setup_stripe_billing.ensure_meter")
    def test_full_run_success(self, mock_meter, mock_price, mock_prod, mock_session, mock_fetch, _):
        mock_client = MagicMock()
        mock_session.return_value = mock_client
        mock_prod.return_value = MagicMock(id="prod_1")
        result = run("admin.sparkmojo.com", dry_run=False, test_mode=True)
        assert result == 0
        mock_prod.assert_called_once_with(SAMPLE_ITEM_FLAT, False)
        mock_price.assert_called_once()
        mock_meter.assert_called_once()

    @patch.dict(os.environ, {
        "ADMIN_FRAPPE_API_KEY": "key",
        "ADMIN_FRAPPE_API_SECRET": "secret",
    })
    @patch("scripts.setup_stripe_billing.read_secret", return_value="sk_test_xxx")
    @patch("scripts.setup_stripe_billing.fetch_billable_items", return_value=[SAMPLE_ITEM_FLAT])
    @patch("scripts.setup_stripe_billing.build_session")
    @patch("scripts.setup_stripe_billing.ensure_product")
    def test_stripe_error_increments_failed(self, mock_prod, mock_session, mock_fetch, _):
        import stripe as stripe_mod
        mock_client = MagicMock()
        mock_session.return_value = mock_client
        mock_prod.side_effect = stripe_mod.StripeError("API error")
        result = run("admin.sparkmojo.com", dry_run=False, test_mode=True)
        assert result == 1

    @patch.dict(os.environ, {
        "ADMIN_FRAPPE_API_KEY": "key",
        "ADMIN_FRAPPE_API_SECRET": "secret",
    })
    @patch("scripts.setup_stripe_billing.read_secret", return_value="sk_test_xxx")
    def test_test_mode_reads_test_key(self, mock_read):
        with patch("scripts.setup_stripe_billing.build_session") as mock_session:
            mock_client = MagicMock()
            mock_session.return_value = mock_client
            with patch("scripts.setup_stripe_billing.fetch_billable_items", return_value=[]):
                run("admin.sparkmojo.com", dry_run=False, test_mode=True)
        mock_read.assert_called_with("stripe_test_secret_key")

    @patch.dict(os.environ, {
        "ADMIN_FRAPPE_API_KEY": "key",
        "ADMIN_FRAPPE_API_SECRET": "secret",
    })
    @patch("scripts.setup_stripe_billing.read_secret", return_value="sk_live_xxx")
    def test_live_mode_reads_live_key(self, mock_read):
        with patch("scripts.setup_stripe_billing.build_session") as mock_session:
            mock_client = MagicMock()
            mock_session.return_value = mock_client
            with patch("scripts.setup_stripe_billing.fetch_billable_items", return_value=[]):
                run("admin.sparkmojo.com", dry_run=False, test_mode=False)
        mock_read.assert_called_with("stripe_secret_key")
