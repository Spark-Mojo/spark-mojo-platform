"""Tests for GET /api/modules/platform-billing/dunning endpoint."""

import time
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient


def _make_user(roles=None, tenant_id="admin", site_name="admin.sparkmojo.com"):
    return {
        "email": "ops@sparkmojo.com",
        "full_name": "Ops User",
        "roles": roles or ["SM Ops"],
        "tenant_id": tenant_id,
        "site_name": site_name,
    }


SM_OPS_USER = _make_user()
SM_FINANCE_USER = _make_user(roles=["SM Finance"])

NOW_TS = int(time.time())
ONE_DAY = 86400


def _stripe_invoices_response(invoices):
    return httpx.Response(200, json={"data": invoices})


def _frappe_list_response(data):
    return httpx.Response(200, json={"data": data})


def _frappe_doc_response(data):
    return httpx.Response(200, json={"data": data})


def _build_stripe_invoice(
    inv_id, customer, customer_name, amount_cents, days_overdue,
    attempt_count=1, next_payment_attempt=None,
):
    due_date = NOW_TS - (days_overdue * ONE_DAY)
    return {
        "id": inv_id,
        "customer": customer,
        "customer_name": customer_name,
        "amount_due": amount_cents,
        "due_date": due_date,
        "status": "open",
        "attempt_count": attempt_count,
        "next_payment_attempt": next_payment_attempt or (NOW_TS + ONE_DAY),
    }


def _make_mock_client(responses):
    """Build an AsyncMock httpx client that returns responses in sequence."""
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=responses)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    return mock_client


@pytest.fixture
def client_ops():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import importlib
        import routes.platform_billing as mod
        importlib.reload(mod)
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"
        mod.ADMIN_API_KEY = "key"
        mod.ADMIN_API_SECRET = "secret"
        mod.STRIPE_SECRET_KEY = "sk_test_fake"

        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: SM_OPS_USER
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


class TestAC1_MixedDunningQueue:
    """2 Self-Serve + 3 Managed -> 5 entries sorted by days_overdue desc."""

    def test_mixed_queue(self, client_ops):
        stripe_invoices = [
            _build_stripe_invoice(
                "in_1", "cus_A", "Alpha Inc", 5000, 15, 2,
            ),
            _build_stripe_invoice(
                "in_2", "cus_B", "Beta LLC", 2000, 5, 1,
            ),
            _build_stripe_invoice(
                "in_future", "cus_C", "Future Co", 1000, -2,
            ),
        ]

        dunning_docs = [
            {"name": "DUN-001", "customer_name": "Gamma Corp",
             "sales_invoice": "SINV-001", "dunning_type": "First Notice"},
            {"name": "DUN-002", "customer_name": "Delta Ltd",
             "sales_invoice": "SINV-002", "dunning_type": "Second Notice"},
            {"name": "DUN-003", "customer_name": "Epsilon Co",
             "sales_invoice": "SINV-003", "dunning_type": "Final Notice"},
        ]

        responses = [
            _stripe_invoices_response(stripe_invoices),
            _frappe_list_response([{"name": "SITE-A", "site_name": "alpha.sparkmojo.com"}]),
            _frappe_list_response([{"name": "SITE-B", "site_name": "beta.sparkmojo.com"}]),
            _frappe_list_response(dunning_docs),
            _frappe_doc_response({"outstanding_amount": 8000, "due_date": "2026-03-01"}),
            _frappe_list_response([{"name": "SITE-G", "site_name": "gamma.sparkmojo.com"}]),
            _frappe_doc_response({"outstanding_amount": 3000, "due_date": "2026-04-01"}),
            _frappe_list_response([{"name": "SITE-D", "site_name": "delta.sparkmojo.com"}]),
            _frappe_doc_response({"outstanding_amount": 12000, "due_date": "2026-02-15"}),
            _frappe_list_response([{"name": "SITE-E", "site_name": "epsilon.sparkmojo.com"}]),
        ]

        with patch("routes.platform_billing.httpx.AsyncClient") as mock_http:
            mock_http.return_value = _make_mock_client(responses)

            resp = client_ops.get("/api/modules/platform-billing/dunning")

        assert resp.status_code == 200
        data = resp.json()

        assert data["self_serve_count"] == 2
        assert data["managed_account_count"] == 3
        assert data["total_count"] == 5

        queue = data["dunning_queue"]
        assert len(queue) == 5

        days_list = [e["days_overdue"] for e in queue]
        assert days_list == sorted(days_list, reverse=True)

        motions = [e["motion"] for e in queue]
        assert motions.count("self_serve") == 2
        assert motions.count("managed_account") == 3


class TestAC2_SMOpsAllowed:
    """SM Ops user -> 200."""

    def test_sm_ops_allowed(self, client_ops):
        responses = [
            _stripe_invoices_response([]),
            _frappe_list_response([]),
        ]

        with patch("routes.platform_billing.httpx.AsyncClient") as mock_http:
            mock_http.return_value = _make_mock_client(responses)

            resp = client_ops.get("/api/modules/platform-billing/dunning")

        assert resp.status_code == 200


class TestAC3_Forbidden403:
    """Non-admin role -> 403."""

    def test_forbidden(self):
        non_admin_user = _make_user(roles=["Front Desk"])

        with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
            import importlib
            import routes.platform_billing as mod
            importlib.reload(mod)
            mod.ADMIN_FRAPPE_URL = "http://admin:8080"
            mod.ADMIN_API_KEY = "key"
            mod.ADMIN_API_SECRET = "secret"
            mod.STRIPE_SECRET_KEY = "sk_test_fake"

            from main import app
            from auth import get_current_user
            app.dependency_overrides[get_current_user] = lambda: non_admin_user
            raw_client = TestClient(app, raise_server_exceptions=False)

            resp = raw_client.get("/api/modules/platform-billing/dunning")

            app.dependency_overrides.clear()

        assert resp.status_code == 403
        assert "SM Finance" in resp.json()["detail"]


class TestAC4_EmptyQueue:
    """No past-due invoices -> 200 with empty queue."""

    def test_empty_queue(self, client_ops):
        responses = [
            _stripe_invoices_response([]),
            _frappe_list_response([]),
        ]

        with patch("routes.platform_billing.httpx.AsyncClient") as mock_http:
            mock_http.return_value = _make_mock_client(responses)

            resp = client_ops.get("/api/modules/platform-billing/dunning")

        assert resp.status_code == 200
        data = resp.json()
        assert data["dunning_queue"] == []
        assert data["self_serve_count"] == 0
        assert data["managed_account_count"] == 0
        assert data["total_count"] == 0
