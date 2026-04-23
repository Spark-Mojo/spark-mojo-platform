"""Tests for GET /api/modules/account/subscription — unified subscription endpoint."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient


def _make_user(roles=None, tenant_id="willow", site_name="willow.sparkmojo.com"):
    return {
        "email": "admin@willow.com",
        "full_name": "Test Admin",
        "roles": roles or ["System Manager"],
        "tenant_id": tenant_id,
        "site_name": site_name,
    }


SM_USER = _make_user()
PA_USER = _make_user(roles=["Practice Admin"])
NON_PRIVILEGED_USER = _make_user(roles=["Front Desk"])


def _registry_response(billing_motion="self_serve", stripe_customer_id="cus_abc123"):
    return httpx.Response(
        200,
        json={
            "data": [
                {
                    "name": "REG-001",
                    "frappe_site": "willow.sparkmojo.com",
                    "billing_motion": billing_motion,
                    "stripe_customer_id": stripe_customer_id,
                }
            ]
        },
    )


def _empty_registry_response():
    return httpx.Response(200, json={"data": []})


def _subscription_response(
    billing_motion="self_serve",
    plan_name="Growth",
    billing_status="active",
    billing_interval="month",
    invoice_cadence="monthly",
    payment_method_type="card",
    payment_method_last4="4242",
    payment_method_brand="visa",
    payment_method_expiry="12/2027",
):
    return httpx.Response(
        200,
        json={
            "data": [
                {
                    "billing_motion": billing_motion,
                    "plan_name": plan_name,
                    "billing_status": billing_status,
                    "billing_interval": billing_interval,
                    "invoice_cadence": invoice_cadence,
                    "current_period_start": "2026-04-01",
                    "current_period_end": "2026-04-30",
                    "trial_end": None,
                    "payment_method_type": payment_method_type,
                    "payment_method_last4": payment_method_last4,
                    "payment_method_brand": payment_method_brand,
                    "payment_method_expiry": payment_method_expiry,
                    "next_invoice_date": "2026-05-01",
                    "next_invoice_estimate": 6601.30,
                    "cancel_at_period_end": 0,
                }
            ]
        },
    )


def _empty_subscription_response():
    return httpx.Response(200, json={"data": []})


def _billable_actions_response():
    return httpx.Response(
        200,
        json={
            "data": [
                {"action_id": "sm_account_billing.ai_tokens", "included_units": 2000000},
                {"action_id": "sm_account_billing.claims_processed", "included_units": 3000},
                {"action_id": "sm_account_billing.storage_gb", "included_units": 100},
                {"action_id": "sm_account_billing.staff_seats", "included_units": 30},
                {"action_id": "sm_account_billing.portal_seats", "included_units": 0},
            ]
        },
    )


def _setup_mock_client(mock_http, responses):
    mock_client = AsyncMock()
    mock_client.get.side_effect = responses
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_http.return_value = mock_client
    return mock_client


@pytest.fixture
def client_sm():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import importlib
        import routes.account as mod
        importlib.reload(mod)
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"
        mod.ADMIN_API_KEY = "key"
        mod.ADMIN_API_SECRET = "secret"

        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: SM_USER
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


@pytest.fixture
def client_practice_admin():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import importlib
        import routes.account as mod
        importlib.reload(mod)
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"
        mod.ADMIN_API_KEY = "key"
        mod.ADMIN_API_SECRET = "secret"

        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: PA_USER
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


@pytest.fixture
def client_non_privileged():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import importlib
        import routes.account as mod
        importlib.reload(mod)
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"
        mod.ADMIN_API_KEY = "key"
        mod.ADMIN_API_SECRET = "secret"

        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: NON_PRIVILEGED_USER
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


class TestAC1_SelfServeSuccess:
    """Self-Serve client, System Manager → 200 with motion=self_serve."""

    def test_returns_subscription(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=[
                _registry_response(),
                _subscription_response(),
                _billable_actions_response(),
            ])
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/subscription")

        assert resp.status_code == 200
        data = resp.json()
        assert data["motion"] == "self_serve"
        assert data["plan_name"] == "Growth"
        assert data["billing_status"] == "active"
        assert data["payment_method"]["type"] == "card"
        assert data["payment_method"]["last4"] == "4242"
        assert data["payment_method"]["brand"] == "visa"
        assert data["included"]["ai_tokens"] == 2000000
        assert data["included"]["claims"] == 3000
        assert data["included"]["storage_gb"] == 100
        assert data["included"]["staff_seats"] == 30
        assert data["included"]["portal_seats"] == 0
        assert data["cancel_at_period_end"] is False


class TestAC2_ManagedAccountSuccess:
    """Managed Account client → 200 with motion=managed_account."""

    def test_returns_managed_subscription(self, client_practice_admin):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=[
                _registry_response(billing_motion="managed_account", stripe_customer_id=""),
                _subscription_response(
                    billing_motion="managed_account",
                    plan_name="Enterprise",
                    billing_interval="quarter",
                    invoice_cadence="quarterly",
                    payment_method_type="ach",
                    payment_method_last4="6789",
                    payment_method_brand="",
                    payment_method_expiry="",
                ),
                _billable_actions_response(),
            ])
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_practice_admin.get("/api/modules/account/subscription")

        assert resp.status_code == 200
        data = resp.json()
        assert data["motion"] == "managed_account"
        assert data["payment_method"]["type"] == "ach"
        assert data["billing_interval"] == "quarter"
        assert data["invoice_cadence"] == "quarterly"


class TestAC3_NoSiteRegistry404:
    """No SM Site Registry → 404."""

    def test_returns_404(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_empty_registry_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/subscription")

        assert resp.status_code == 404
        assert "No SM Site Registry entry" in resp.json()["detail"]


class TestAC4_NoSubscription404:
    """SM Site Registry exists but no SM Subscription → 404."""

    def test_returns_404(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=[
                _registry_response(),
                _empty_subscription_response(),
            ])
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/subscription")

        assert resp.status_code == 404
        assert "No SM Subscription" in resp.json()["detail"]


class TestAC5_Unauthenticated401:
    """No auth → 401."""

    def test_returns_401(self):
        import auth as auth_mod
        from main import app
        app.dependency_overrides.clear()
        original_dev_mode = auth_mod.DEV_MODE
        auth_mod.DEV_MODE = False
        try:
            raw_client = TestClient(app, raise_server_exceptions=False)
            resp = raw_client.get("/api/modules/account/subscription")
        finally:
            auth_mod.DEV_MODE = original_dev_mode
        assert resp.status_code == 401


class TestAC6_InsufficientPermissions403:
    """User with only Front Desk role → 403."""

    def test_returns_403(self, client_non_privileged):
        resp = client_non_privileged.get("/api/modules/account/subscription")
        assert resp.status_code == 403
        assert "System Manager or Practice Admin" in resp.json()["detail"]
