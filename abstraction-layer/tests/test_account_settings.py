"""Tests for PUT /api/modules/account/subscription/settings endpoint."""

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


def _sub_list_response(sub_name="SUB-001"):
    return httpx.Response(200, json={"data": [{"name": sub_name}]})


def _empty_sub_response():
    return httpx.Response(200, json={"data": []})


def _put_ok_response():
    return httpx.Response(200, json={"data": {"name": "SUB-001"}})


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


class TestAC1_UpdateThresholds:
    """PUT with valid thresholds -> 200 with updated field names."""

    def test_update_thresholds(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_sub_list_response())
            mock_client.put = AsyncMock(return_value=_put_ok_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.put(
                "/api/modules/account/subscription/settings",
                json={
                    "usage_alert_threshold_1": 70,
                    "usage_alert_threshold_2": 90,
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert sorted(data["updated"]) == [
            "usage_alert_threshold_1",
            "usage_alert_threshold_2",
        ]


class TestAC2_InvertedThresholds422:
    """threshold_1=90, threshold_2=70 (inverted) -> 422."""

    def test_inverted_thresholds(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_sub_list_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.put(
                "/api/modules/account/subscription/settings",
                json={
                    "usage_alert_threshold_1": 90,
                    "usage_alert_threshold_2": 70,
                },
            )

        assert resp.status_code == 422
        assert "threshold_2 must be >= threshold_1" in resp.json()["detail"]


class TestAC3_EmailRecipients:
    """PUT with email recipients -> 200, joined with comma."""

    def test_update_emails(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_sub_list_response())
            mock_client.put = AsyncMock(return_value=_put_ok_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.put(
                "/api/modules/account/subscription/settings",
                json={
                    "invoice_email_recipients": ["a@x.com", "b@x.com"],
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["updated"] == ["invoice_email_recipients"]

        put_call = mock_client.put.call_args
        put_body = put_call.kwargs.get("json", {})
        assert put_body["invoice_email_recipients"] == "a@x.com,b@x.com"


class TestAC4_InvalidEmail422:
    """Invalid email -> 422 from Pydantic validation."""

    def test_invalid_email(self, client_sm):
        resp = client_sm.put(
            "/api/modules/account/subscription/settings",
            json={
                "invoice_email_recipients": ["not-an-email"],
            },
        )

        assert resp.status_code == 422


class TestAC5_EmptyBody422:
    """Empty body -> 422 'No valid fields to update'."""

    def test_empty_body(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_sub_list_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.put(
                "/api/modules/account/subscription/settings",
                json={},
            )

        assert resp.status_code == 422
        assert "No valid fields to update" in resp.json()["detail"]


class TestAC6_Forbidden403:
    """Non-System-Manager -> 403."""

    def test_forbidden(self):
        non_admin_user = _make_user(roles=["Front Desk"])

        with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
            import importlib
            import routes.account as mod
            importlib.reload(mod)
            mod.ADMIN_FRAPPE_URL = "http://admin:8080"
            mod.ADMIN_API_KEY = "key"
            mod.ADMIN_API_SECRET = "secret"

            from main import app
            from auth import get_current_user
            app.dependency_overrides[get_current_user] = lambda: non_admin_user
            raw_client = TestClient(app, raise_server_exceptions=False)

            resp = raw_client.put(
                "/api/modules/account/subscription/settings",
                json={"usage_alert_threshold_1": 70},
            )

            app.dependency_overrides.clear()

        assert resp.status_code == 403
        assert "System Manager" in resp.json()["detail"]
