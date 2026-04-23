"""Tests for GET /api/modules/platform-billing/mrr endpoint."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient


def _make_user(roles=None, tenant_id="admin", site_name="admin.sparkmojo.com"):
    return {
        "email": "finance@sparkmojo.com",
        "full_name": "Finance User",
        "roles": roles or ["SM Finance"],
        "tenant_id": tenant_id,
        "site_name": site_name,
    }


SM_FINANCE_USER = _make_user()


def _billing_records_response():
    records = [
        {"site_registry": "site-1", "billing_motion": "self_serve",
         "monthly_revenue": 40, "annual_revenue": 480, "billing_health": "healthy"},
        {"site_registry": "site-2", "billing_motion": "self_serve",
         "monthly_revenue": 40, "annual_revenue": 480, "billing_health": "healthy"},
        {"site_registry": "site-3", "billing_motion": "self_serve",
         "monthly_revenue": 40, "annual_revenue": 480, "billing_health": "healthy"},
        {"site_registry": "site-4", "billing_motion": "self_serve",
         "monthly_revenue": 40, "annual_revenue": 480, "billing_health": "at_risk"},
        {"site_registry": "site-5", "billing_motion": "self_serve",
         "monthly_revenue": 40, "annual_revenue": 480, "billing_health": "churned"},
        {"site_registry": "site-6", "billing_motion": "managed_account",
         "monthly_revenue": 5000, "annual_revenue": 60000, "billing_health": "healthy"},
        {"site_registry": "site-7", "billing_motion": "managed_account",
         "monthly_revenue": 5000, "annual_revenue": 60000, "billing_health": "healthy"},
        {"site_registry": "site-8", "billing_motion": "managed_account",
         "monthly_revenue": 5000, "annual_revenue": 60000, "billing_health": "healthy"},
    ]
    return httpx.Response(200, json={"data": records})


@pytest.fixture
def client_finance():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import importlib
        import routes.platform_billing as mod
        importlib.reload(mod)
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"
        mod.ADMIN_API_KEY = "key"
        mod.ADMIN_API_SECRET = "secret"

        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: SM_FINANCE_USER
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


class TestAC1_MRRBreakdown:
    """5 self-serve at $40/mo + 3 managed at $5000/mo -> correct totals."""

    def test_mrr_breakdown(self, client_finance):
        with patch("routes.platform_billing.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_billing_records_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_finance.get(
                "/api/modules/platform-billing/mrr",
            )

        assert resp.status_code == 200
        data = resp.json()

        assert data["total_mrr"] == 15200
        assert data["total_arr"] == 182400

        assert data["by_motion"]["self_serve"]["mrr"] == 200
        assert data["by_motion"]["self_serve"]["arr"] == 2400
        assert data["by_motion"]["self_serve"]["client_count"] == 5

        assert data["by_motion"]["managed_account"]["mrr"] == 15000
        assert data["by_motion"]["managed_account"]["arr"] == 180000
        assert data["by_motion"]["managed_account"]["client_count"] == 3

        assert data["active_clients"] == 7
        assert "as_of" in data


class TestAC2_Forbidden403:
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

            from main import app
            from auth import get_current_user
            app.dependency_overrides[get_current_user] = lambda: non_admin_user
            raw_client = TestClient(app, raise_server_exceptions=False)

            resp = raw_client.get(
                "/api/modules/platform-billing/mrr",
            )

            app.dependency_overrides.clear()

        assert resp.status_code == 403
        assert "SM Finance" in resp.json()["detail"]
