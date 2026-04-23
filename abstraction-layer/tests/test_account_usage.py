"""Tests for GET /api/modules/account/usage — usage snapshot endpoint."""

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


def _usage_response(
    ai_tokens_used=500000,
    ai_tokens_included=2000000,
    ai_tokens_tier1_used=300000,
    ai_tokens_tier2_used=150000,
    ai_tokens_tier3_used=50000,
    claims_processed=1200,
    claims_included=3000,
    storage_used_gb=42.5,
    storage_included_gb=100,
    active_staff_seats=12,
    staff_seats_included=30,
    active_portal_seats=85,
    portal_seats_included=200,
    estimated_overage=0,
    alert_level="green",
):
    return httpx.Response(
        200,
        json={
            "data": [
                {
                    "billing_period_start": "2026-04-01",
                    "billing_period_end": "2026-04-30",
                    "ai_tokens_used": ai_tokens_used,
                    "ai_tokens_included": ai_tokens_included,
                    "ai_tokens_tier1_used": ai_tokens_tier1_used,
                    "ai_tokens_tier2_used": ai_tokens_tier2_used,
                    "ai_tokens_tier3_used": ai_tokens_tier3_used,
                    "claims_processed": claims_processed,
                    "claims_included": claims_included,
                    "storage_used_gb": storage_used_gb,
                    "storage_included_gb": storage_included_gb,
                    "active_staff_seats": active_staff_seats,
                    "staff_seats_included": staff_seats_included,
                    "active_portal_seats": active_portal_seats,
                    "portal_seats_included": portal_seats_included,
                    "estimated_overage": estimated_overage,
                    "alert_level": alert_level,
                    "last_updated": "2026-04-22T14:30:00",
                }
            ]
        },
    )


def _empty_usage_response():
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


class TestAC1_UsageSuccess:
    """Authenticated user with SM Usage Summary → 200 with all 5 dimensions."""

    def test_returns_usage(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_usage_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/usage")

        assert resp.status_code == 200
        data = resp.json()
        assert data["period"]["start"] == "2026-04-01"
        assert data["period"]["end"] == "2026-04-30"
        assert data["ai_tokens"]["used"] == 500000
        assert data["ai_tokens"]["included"] == 2000000
        assert data["ai_tokens"]["pct"] == 25.0
        assert data["ai_tokens"]["by_tier"]["tier1"] == 300000
        assert data["ai_tokens"]["by_tier"]["tier2"] == 150000
        assert data["ai_tokens"]["by_tier"]["tier3"] == 50000
        assert data["claims"]["processed"] == 1200
        assert data["claims"]["included"] == 3000
        assert data["claims"]["pct"] == 40.0
        assert data["storage"]["used_gb"] == 42.5
        assert data["storage"]["included_gb"] == 100
        assert data["storage"]["pct"] == 42.5
        assert data["staff_seats"]["active"] == 12
        assert data["staff_seats"]["included"] == 30
        assert data["staff_seats"]["pct"] == 40.0
        assert data["portal_seats"]["active"] == 85
        assert data["portal_seats"]["included"] == 200
        assert data["portal_seats"]["pct"] == 42.5
        assert data["estimated_overage"] == 0
        assert data["alert_level"] == "green"
        assert data["last_updated"] == "2026-04-22T14:30:00"


class TestAC2_IncludedZeroPct:
    """Dimension with included=0 → pct=0 (no division by zero)."""

    def test_zero_included_gives_zero_pct(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                return_value=_usage_response(
                    ai_tokens_included=0,
                    claims_included=0,
                    storage_included_gb=0,
                    staff_seats_included=0,
                    portal_seats_included=0,
                )
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/usage")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_tokens"]["pct"] == 0
        assert data["claims"]["pct"] == 0
        assert data["storage"]["pct"] == 0
        assert data["staff_seats"]["pct"] == 0
        assert data["portal_seats"]["pct"] == 0


class TestAC3_NoUsageSummary404:
    """No SM Usage Summary on site → 404."""

    def test_returns_404(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=_empty_usage_response())
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/usage")

        assert resp.status_code == 404
        assert "No SM Usage Summary" in resp.json()["detail"]


class TestAC4_Unauthenticated401:
    """No auth → 401."""

    def test_returns_401(self):
        import auth as auth_mod
        from main import app
        app.dependency_overrides.clear()
        original_dev_mode = auth_mod.DEV_MODE
        auth_mod.DEV_MODE = False
        try:
            raw_client = TestClient(app, raise_server_exceptions=False)
            resp = raw_client.get("/api/modules/account/usage")
        finally:
            auth_mod.DEV_MODE = original_dev_mode
        assert resp.status_code == 401
