"""Tests for POST /api/modules/account/portal — Stripe Customer Portal session."""

from unittest.mock import AsyncMock, MagicMock, patch

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
NON_SM_USER = _make_user(roles=["Front Desk"])


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
def client_non_sm():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import routes.account as mod
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"

        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: NON_SM_USER
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


class TestAC1_SelfServeSuccess:
    """System Manager on Self-Serve site → 200 with URL."""

    def test_returns_portal_url(self, client_sm):
        mock_session = MagicMock()
        mock_session.url = "https://billing.stripe.com/p/session/test_abc"

        with (
            patch("routes.account.httpx.AsyncClient") as mock_http,
            patch("routes.account.stripe") as mock_stripe,
            patch("routes.account.read_secret", return_value="sk_test_xxx"),
            patch("routes.account._get_portal_config_id", return_value="bpc_abc"),
        ):
            mock_client = AsyncMock()
            mock_client.get.return_value = _registry_response()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            mock_stripe.billing_portal.Session.create.return_value = mock_session

            resp = client_sm.post("/api/modules/account/portal")

        assert resp.status_code == 200
        data = resp.json()
        assert data["url"] == "https://billing.stripe.com/p/session/test_abc"


class TestAC2_ManagedAccount405:
    """System Manager on Managed Account site → 405."""

    def test_returns_405(self, client_sm):
        with (
            patch("routes.account.httpx.AsyncClient") as mock_http,
            patch("routes.account.read_secret", return_value="sk_test_xxx"),
        ):
            mock_client = AsyncMock()
            mock_client.get.return_value = _registry_response(
                billing_motion="managed"
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.post("/api/modules/account/portal")

        assert resp.status_code == 405
        assert "Self-Serve" in resp.json()["detail"]


class TestAC3_NonSystemManager403:
    """Non-System-Manager user → 403."""

    def test_returns_403(self, client_non_sm):
        resp = client_non_sm.post("/api/modules/account/portal")
        assert resp.status_code == 403
        assert "System Manager" in resp.json()["detail"]


class TestAC4_NoStripeCustomer404:
    """No stripe_customer_id → 404."""

    def test_returns_404(self, client_sm):
        with (
            patch("routes.account.httpx.AsyncClient") as mock_http,
            patch("routes.account.read_secret", return_value="sk_test_xxx"),
        ):
            mock_client = AsyncMock()
            mock_client.get.return_value = _registry_response(
                stripe_customer_id=""
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.post("/api/modules/account/portal")

        assert resp.status_code == 404
        assert "No Stripe customer" in resp.json()["detail"]


class TestAC5_StripeApiFailure:
    """Stripe API error → propagated error."""

    def test_returns_502(self, client_sm):
        import stripe as real_stripe

        with (
            patch("routes.account.httpx.AsyncClient") as mock_http,
            patch("routes.account.stripe") as mock_stripe,
            patch("routes.account.read_secret", return_value="sk_test_xxx"),
            patch("routes.account._get_portal_config_id", return_value="bpc_abc"),
        ):
            mock_client = AsyncMock()
            mock_client.get.return_value = _registry_response()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            mock_stripe.StripeError = real_stripe.StripeError
            mock_stripe.billing_portal.Session.create.side_effect = (
                real_stripe.StripeError("Connection failed")
            )

            resp = client_sm.post("/api/modules/account/portal")

        assert resp.status_code == 502


class TestAC6_ReturnUrl:
    """Return URL is correctly constructed from site_name."""

    def test_return_url_construction(self, client_sm):
        mock_session = MagicMock()
        mock_session.url = "https://billing.stripe.com/p/session/test_url"

        with (
            patch("routes.account.httpx.AsyncClient") as mock_http,
            patch("routes.account.stripe") as mock_stripe,
            patch("routes.account.read_secret", return_value="sk_test_xxx"),
            patch("routes.account._get_portal_config_id", return_value="bpc_abc"),
        ):
            mock_client = AsyncMock()
            mock_client.get.return_value = _registry_response()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            mock_stripe.billing_portal.Session.create.return_value = mock_session

            client_sm.post("/api/modules/account/portal")

        call_kwargs = mock_stripe.billing_portal.Session.create.call_args
        assert "return_url" in call_kwargs.kwargs
        assert call_kwargs.kwargs["return_url"] == (
            "https://willow.app.sparkmojo.com/billing"
        )
        assert call_kwargs.kwargs["customer"] == "cus_abc123"
        assert call_kwargs.kwargs["configuration"] == "bpc_abc"
