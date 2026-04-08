"""
Tests for ADMIN-001: Admin route authentication middleware.

Verifies that /api/admin/* and /admin/registry/refresh are protected
by the X-Admin-Key header validated against ADMIN_SERVICE_KEY env var.
"""

import os
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

TEST_KEY = "test-admin-key-abc123"


@pytest.fixture
def env_with_key():
    """Patch environment with a known ADMIN_SERVICE_KEY."""
    with patch.dict(os.environ, {"ADMIN_SERVICE_KEY": TEST_KEY}):
        import auth
        auth.ADMIN_SERVICE_KEY = TEST_KEY
        yield
        auth.ADMIN_SERVICE_KEY = os.getenv("ADMIN_SERVICE_KEY", "")


@pytest.fixture
def env_without_key():
    """Patch environment with ADMIN_SERVICE_KEY unset."""
    with patch.dict(os.environ, {"ADMIN_SERVICE_KEY": ""}, clear=False):
        import auth
        auth.ADMIN_SERVICE_KEY = ""
        yield
        auth.ADMIN_SERVICE_KEY = os.getenv("ADMIN_SERVICE_KEY", "")


@pytest.fixture
def app():
    """Import app and ensure site_registry is available on state."""
    from main import app
    if not hasattr(app.state, "site_registry"):
        mock_registry = MagicMock()
        mock_registry.refresh = AsyncMock()
        mock_registry.site_count = 0
        app.state.site_registry = mock_registry
    return app


@pytest.mark.asyncio
async def test_admin_routes_reject_missing_key(env_with_key, app):
    """GET /api/admin/sites with no X-Admin-Key header returns 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/admin/sites")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_routes_reject_wrong_key(env_with_key, app):
    """GET /api/admin/sites with wrong key returns 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/admin/sites", headers={"X-Admin-Key": "wrong-key"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_routes_accept_correct_key(env_with_key, app):
    """GET /api/admin/sites with correct key returns 200."""
    with patch.dict(os.environ, {"ADMIN_FRAPPE_URL": ""}):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/admin/sites", headers={"X-Admin-Key": TEST_KEY})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_registry_refresh_rejects_missing_key(env_with_key, app):
    """POST /admin/registry/refresh with no key returns 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/admin/registry/refresh")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_registry_refresh_accepts_correct_key(env_with_key, app):
    """POST /admin/registry/refresh with correct key returns 200."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/admin/registry/refresh", headers={"X-Admin-Key": TEST_KEY})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_missing_env_var_returns_500(env_without_key, app):
    """With ADMIN_SERVICE_KEY unset, any admin route returns 500."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/admin/sites", headers={"X-Admin-Key": "any-key"})
    assert resp.status_code == 500
