"""Tests for POST /api/admin/revenue/record-invoice — ERPNext revenue recording."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient


ADMIN_KEY = "test-admin-key"


def _stripe_invoice(
    invoice_id="in_test_001",
    customer_id="cus_abc",
    total=5000,
    amount_paid=5000,
    status="paid",
    lines=None,
    charge="ch_test_001",
    period_start=1700000000,
    period_end=1702592000,
    created=1700000000,
):
    if lines is None:
        lines = {
            "data": [
                {
                    "amount": 5000,
                    "quantity": 1,
                    "description": "CRM Pro — Monthly",
                    "price": {
                        "product": "prod_crm",
                        "unit_amount": 5000,
                        "recurring": {"usage_type": "licensed"},
                    },
                }
            ]
        }
    return {
        "id": invoice_id,
        "customer": customer_id,
        "total": total,
        "subtotal": total,
        "amount_paid": amount_paid,
        "amount_remaining": 0,
        "status": status,
        "currency": "usd",
        "lines": lines,
        "charge": charge,
        "period_start": period_start,
        "period_end": period_end,
        "created": created,
    }


def _stripe_product(action_id="crm_pro_monthly", billing_type="flat_monthly"):
    return {
        "id": "prod_crm",
        "name": "CRM Pro",
        "metadata": {
            "sm_action_id": action_id,
            "sm_billing_type": billing_type,
        },
        "to_dict": lambda: {
            "metadata": {
                "sm_action_id": action_id,
                "sm_billing_type": billing_type,
            }
        },
    }


def _registry_response(
    erpnext_customer_name="Willow Center LLC",
    stripe_customer_id="cus_abc",
):
    return httpx.Response(
        200,
        json={
            "data": [
                {
                    "name": "REG-001",
                    "site_name": "willow.sparkmojo.com",
                    "billing_motion": "self_serve",
                    "stripe_customer_id": stripe_customer_id,
                    "erpnext_customer_name": erpnext_customer_name,
                }
            ]
        },
    )


def _empty_response():
    return httpx.Response(200, json={"data": []})


def _si_created_response(name="ACC-SINV-00001"):
    return httpx.Response(201, json={"data": {"name": name}})


def _si_submitted_response(name="ACC-SINV-00001"):
    return httpx.Response(200, json={"data": {"name": name, "docstatus": 1}})


def _pe_created_response(name="ACC-PE-00001"):
    return httpx.Response(201, json={"data": {"name": name}})


def _pe_submitted_response(name="ACC-PE-00001"):
    return httpx.Response(200, json={"data": {"name": name, "docstatus": 1}})


def _item_response(item_code="ITEM-CRM-PRO"):
    return httpx.Response(
        200,
        json={"data": [{"name": "ITEM-CRM-PRO", "item_code": item_code}]},
    )


def _customer_created_response(name="Willow Center LLC"):
    return httpx.Response(201, json={"data": {"name": name}})


def _registry_updated_response():
    return httpx.Response(200, json={"data": {"name": "REG-001"}})


def _event_log_response():
    return httpx.Response(200, json={"data": [{"name": "EVT-001"}]})


@pytest.fixture
def client():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import importlib
        import routes.revenue as mod
        importlib.reload(mod)
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"
        mod.ADMIN_API_KEY = "key"
        mod.ADMIN_API_SECRET = "secret"

        from main import app
        from auth import verify_admin_key

        async def _noop():
            pass
        app.dependency_overrides[verify_admin_key] = _noop
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


def _mock_http_client(responses):
    """Create a mock httpx.AsyncClient that returns responses in order."""
    mock_client = AsyncMock()
    call_idx = {"get": 0, "post": 0, "put": 0}

    get_responses = [r for r in responses if r[0] == "get"]
    post_responses = [r for r in responses if r[0] == "post"]
    put_responses = [r for r in responses if r[0] == "put"]

    async def mock_get(*args, **kwargs):
        idx = call_idx["get"]
        call_idx["get"] += 1
        if idx < len(get_responses):
            return get_responses[idx][1]
        return _empty_response()

    async def mock_post(*args, **kwargs):
        idx = call_idx["post"]
        call_idx["post"] += 1
        if idx < len(post_responses):
            return post_responses[idx][1]
        return httpx.Response(200, json={"data": {}})

    async def mock_put(*args, **kwargs):
        idx = call_idx["put"]
        call_idx["put"] += 1
        if idx < len(put_responses):
            return put_responses[idx][1]
        return httpx.Response(200, json={"data": {}})

    mock_client.get = mock_get
    mock_client.post = mock_post
    mock_client.put = mock_put
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    return mock_client


class TestAC1_InvoicePaidCreatesAdminSI:
    """invoice.paid → admin-site Sales Invoice created with correct fields."""

    def test_creates_sales_invoice(self, client):
        invoice = _stripe_invoice()
        product = _stripe_product()

        mock_client = _mock_http_client([
            ("get", _empty_response()),           # idempotency check
            ("get", _registry_response()),         # SM Site Registry lookup
            ("get", _item_response()),             # Item lookup
            ("get", _event_log_response()),        # event log lookup
            ("post", _si_created_response()),      # create SI
            ("post", _pe_created_response()),      # create PE
            ("put", _si_submitted_response()),     # submit SI
            ("put", _pe_submitted_response()),     # submit PE
        ])

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.Invoice.retrieve.return_value = invoice
            mock_stripe.Invoice.retrieve.return_value["to_dict"] = None
            mock_stripe.Product.retrieve.return_value = product
            mock_stripe.StripeError = Exception

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_001"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "created"
        assert data["sales_invoice"] == "ACC-SINV-00001"
        assert data["payment_entry"] == "ACC-PE-00001"


class TestAC2_NoCustomerCreatesNew:
    """No erpnext_customer_name → new Customer created, registry updated."""

    def test_creates_customer(self, client):
        invoice = _stripe_invoice()
        product = _stripe_product()

        mock_client = _mock_http_client([
            ("get", _empty_response()),                              # idempotency
            ("get", _registry_response(erpnext_customer_name="")),   # registry (no customer)
            ("get", _item_response()),                               # Item lookup
            ("get", _event_log_response()),                          # event log
            ("post", _customer_created_response()),                  # create Customer
            ("post", _si_created_response()),                        # create SI
            ("post", _pe_created_response()),                        # create PE
            ("put", _registry_updated_response()),                   # update registry
            ("put", _si_submitted_response()),                       # submit SI
            ("put", _pe_submitted_response()),                       # submit PE
        ])

        mock_stripe_customer = {"name": "Willow Center LLC", "email": "a@b.com"}

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.Invoice.retrieve.return_value = invoice
            mock_stripe.Invoice.retrieve.return_value["to_dict"] = None
            mock_stripe.Product.retrieve.return_value = product
            mock_stripe.Customer.retrieve.return_value = mock_stripe_customer
            mock_stripe.StripeError = Exception

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_002"},
            )

        assert resp.status_code == 200
        assert resp.json()["status"] == "created"


class TestAC3_IdempotentDuplicate:
    """Duplicate invoice.paid → no duplicate SI."""

    def test_returns_already_exists(self, client):
        mock_client = _mock_http_client([
            ("get", httpx.Response(200, json={"data": [{"name": "ACC-SINV-00001"}]})),
        ])

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.StripeError = Exception

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_001"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "already_exists"
        assert data["sales_invoice"] == "ACC-SINV-00001"


class TestAC4_DeferredRevenue:
    """flat_monthly + period > 1 month → enable_deferred_revenue=1."""

    def test_deferred_revenue_flag(self):
        from routes.revenue import _should_defer_revenue

        assert _should_defer_revenue("flat_monthly", 1700000000, 1731622400) is True
        assert _should_defer_revenue("flat_monthly", 1700000000, 1702592000) is False
        assert _should_defer_revenue("metered", 1700000000, 1731622400) is False
        assert _should_defer_revenue(None, 1700000000, 1731622400) is False

    def test_annual_invoice_has_deferred_fields(self, client):
        invoice = _stripe_invoice(
            period_start=1700000000,
            period_end=1731622400,
        )
        product = _stripe_product(billing_type="flat_monthly")

        mock_client = _mock_http_client([
            ("get", _empty_response()),
            ("get", _registry_response()),
            ("get", _item_response()),
            ("get", _event_log_response()),
            ("post", _si_created_response()),
            ("post", _pe_created_response()),
            ("put", _si_submitted_response()),
            ("put", _pe_submitted_response()),
        ])

        post_calls = []
        orig_post = mock_client.post

        async def capture_post(*args, **kwargs):
            post_calls.append(kwargs.get("json", args[1] if len(args) > 1 else None))
            return await orig_post(*args, **kwargs)

        mock_client.post = capture_post

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.Invoice.retrieve.return_value = invoice
            mock_stripe.Invoice.retrieve.return_value["to_dict"] = None
            mock_stripe.Product.retrieve.return_value = product
            mock_stripe.StripeError = Exception

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_annual"},
            )

        assert resp.status_code == 200

        si_payload = None
        for call in post_calls:
            if isinstance(call, dict) and "custom_stripe_invoice_id" in call:
                si_payload = call
                break

        assert si_payload is not None
        items = si_payload.get("items", [])
        assert len(items) > 0
        assert items[0]["enable_deferred_revenue"] == 1
        assert "service_start_date" in items[0]
        assert "service_end_date" in items[0]


class TestAC5_PaymentEntry:
    """Payment Entry created with Credit Card mode and Stripe charge."""

    def test_payment_entry_created(self, client):
        invoice = _stripe_invoice(charge="ch_test_abc")
        product = _stripe_product()

        mock_client = _mock_http_client([
            ("get", _empty_response()),
            ("get", _registry_response()),
            ("get", _item_response()),
            ("get", _event_log_response()),
            ("post", _si_created_response()),
            ("post", _pe_created_response("ACC-PE-00042")),
            ("put", _si_submitted_response()),
            ("put", _pe_submitted_response("ACC-PE-00042")),
        ])

        post_calls = []
        orig_post = mock_client.post

        async def capture_post(*args, **kwargs):
            body = kwargs.get("json", args[1] if len(args) > 1 else None)
            post_calls.append(body)
            return await orig_post(*args, **kwargs)

        mock_client.post = capture_post

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.Invoice.retrieve.return_value = invoice
            mock_stripe.Invoice.retrieve.return_value["to_dict"] = None
            mock_stripe.Product.retrieve.return_value = product
            mock_stripe.StripeError = Exception

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_pe"},
            )

        assert resp.status_code == 200
        assert resp.json()["payment_entry"] == "ACC-PE-00042"

        pe_payload = None
        for call in post_calls:
            if isinstance(call, dict) and call.get("payment_type") == "Receive":
                pe_payload = call
                break

        assert pe_payload is not None
        assert pe_payload["mode_of_payment"] == "Credit Card"
        assert pe_payload["reference_no"] == "ch_test_abc"
        assert pe_payload["party"] == "Willow Center LLC"


class TestAC6_NoRegistryMatch:
    """No SM Site Registry match → 404."""

    def test_returns_404(self, client):
        invoice = _stripe_invoice()

        mock_client = _mock_http_client([
            ("get", _empty_response()),     # idempotency
            ("get", _empty_response()),     # registry lookup
        ])

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.Invoice.retrieve.return_value = invoice
            mock_stripe.Invoice.retrieve.return_value["to_dict"] = None
            mock_stripe.StripeError = Exception

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_no_reg"},
            )

        assert resp.status_code == 404
        assert "SM Site Registry" in resp.json()["detail"]


class TestAC7_MultipleLineItems:
    """Multiple line items → each mapped correctly via sm_action_id."""

    def test_maps_multiple_items(self, client):
        lines = {
            "data": [
                {
                    "amount": 3000,
                    "quantity": 1,
                    "description": "CRM Pro",
                    "price": {
                        "product": "prod_crm",
                        "unit_amount": 3000,
                        "recurring": {"usage_type": "licensed"},
                    },
                },
                {
                    "amount": 2000,
                    "quantity": 2,
                    "description": "Healthcare Billing",
                    "price": {
                        "product": "prod_hcb",
                        "unit_amount": 1000,
                        "recurring": {"usage_type": "licensed"},
                    },
                },
            ]
        }
        invoice = _stripe_invoice(lines=lines, total=5000, amount_paid=5000)

        prod_crm = _stripe_product("crm_pro", "flat_monthly")
        prod_hcb = {
            "id": "prod_hcb",
            "name": "Healthcare Billing",
            "metadata": {
                "sm_action_id": "hcb_monthly",
                "sm_billing_type": "flat_monthly",
            },
            "to_dict": lambda: {
                "metadata": {
                    "sm_action_id": "hcb_monthly",
                    "sm_billing_type": "flat_monthly",
                }
            },
        }

        mock_client = _mock_http_client([
            ("get", _empty_response()),
            ("get", _registry_response()),
            ("get", _item_response("ITEM-CRM")),
            ("get", _item_response("ITEM-HCB")),
            ("get", _event_log_response()),
            ("post", _si_created_response()),
            ("post", _pe_created_response()),
            ("put", _si_submitted_response()),
            ("put", _pe_submitted_response()),
        ])

        post_calls = []
        orig_post = mock_client.post

        async def capture_post(*args, **kwargs):
            body = kwargs.get("json", args[1] if len(args) > 1 else None)
            post_calls.append(body)
            return await orig_post(*args, **kwargs)

        mock_client.post = capture_post

        products = {"prod_crm": prod_crm, "prod_hcb": prod_hcb}

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.Invoice.retrieve.return_value = invoice
            mock_stripe.Invoice.retrieve.return_value["to_dict"] = None
            mock_stripe.Product.retrieve.side_effect = lambda pid: products[pid]
            mock_stripe.StripeError = Exception

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_multi"},
            )

        assert resp.status_code == 200

        si_payload = None
        for call in post_calls:
            if isinstance(call, dict) and "custom_stripe_invoice_id" in call:
                si_payload = call
                break

        assert si_payload is not None
        items = si_payload.get("items", [])
        assert len(items) == 2


class TestAC8_StripeApiFailure:
    """Stripe API failure → appropriate error."""

    def test_returns_502(self, client):
        import stripe as real_stripe

        mock_client = _mock_http_client([
            ("get", _empty_response()),
        ])

        with (
            patch("routes.revenue.httpx.AsyncClient", return_value=mock_client),
            patch("routes.revenue.stripe") as mock_stripe,
            patch("routes.revenue.read_secret", return_value="sk_test_xxx"),
        ):
            mock_stripe.StripeError = real_stripe.StripeError
            mock_stripe.Invoice.retrieve.side_effect = (
                real_stripe.StripeError("API connection error")
            )

            resp = client.post(
                "/api/admin/revenue/record-invoice",
                json={"stripe_invoice_id": "in_test_fail"},
            )

        assert resp.status_code == 502
        assert "Stripe" in resp.json()["detail"]
