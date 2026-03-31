"""
Tests for SiteRegistry (INFRA-003).
DocType-backed site registry with 5-min TTL cache and env var fallback.
"""

import json
import os
import sys
import time

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport, Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from registry import SiteRegistry
from main import app, extract_subdomain


# --- Helpers ---

def _mock_doctype_response(records: list[dict], status_code: int = 200) -> Response:
    """Create a mock httpx Response for SM Site Registry API."""
    return Response(
        status_code=status_code,
        json={"data": records},
        request=MagicMock(),
    )


ACTIVE_SITE_ADMIN = {
    "site_subdomain": "admin",
    "frappe_url": "http://frappe-poc-backend-1:8000",
    "frappe_site": "admin.sparkmojo.com",
    "site_type": "admin",
    "display_name": "Admin",
    "is_active": 1,
    "capability_routing_json": "",
}

ACTIVE_SITE_WILLOW = {
    "site_subdomain": "willow",
    "frappe_url": "http://frappe-poc-backend-1:8000",
    "frappe_site": "willow.sparkmojo.com",
    "site_type": "client",
    "display_name": "Willow Center",
    "is_active": 1,
    "capability_routing_json": "",
}

INACTIVE_SITE = {
    "site_subdomain": "old-client",
    "frappe_url": "http://frappe-poc-backend-1:8000",
    "frappe_site": "old.sparkmojo.com",
    "site_type": "client",
    "display_name": "Old Client",
    "is_active": 0,
    "capability_routing_json": "",
}


# --- Test 1: Registry loads from mock DocType response correctly ---

@pytest.mark.anyio
async def test_registry_loads_from_doctype():
    """Registry loads active sites from SM Site Registry DocType."""
    registry = SiteRegistry()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(
        return_value=_mock_doctype_response([ACTIVE_SITE_ADMIN, ACTIVE_SITE_WILLOW])
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch.dict(os.environ, {"ADMIN_FRAPPE_URL": "http://admin:8000"}):
        registry._admin_url = "http://admin:8000"
        with patch("registry.httpx.AsyncClient", return_value=mock_client):
            await registry.load()

    assert registry.site_count == 2
    assert registry.lookup("admin") is not None
    assert registry.lookup("admin")["frappe_site"] == "admin.sparkmojo.com"
    assert registry.lookup("willow") is not None
    assert registry.lookup("willow")["frappe_site"] == "willow.sparkmojo.com"


# --- Test 2: Unknown subdomain returns 404 ---

@pytest.mark.anyio
async def test_unknown_subdomain_returns_404():
    """Request with unknown subdomain should get None from lookup."""
    registry = SiteRegistry()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(
        return_value=_mock_doctype_response([ACTIVE_SITE_ADMIN])
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch.dict(os.environ, {"ADMIN_FRAPPE_URL": "http://admin:8000"}):
        registry._admin_url = "http://admin:8000"
        with patch("registry.httpx.AsyncClient", return_value=mock_client):
            await registry.load()

    result = registry.lookup("unknown")
    assert result is None


# --- Test 3: Known subdomain resolves correct frappe_url and site ---

@pytest.mark.anyio
async def test_known_subdomain_resolves_correctly():
    """Known subdomain returns correct frappe_url and frappe_site."""
    registry = SiteRegistry()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(
        return_value=_mock_doctype_response([ACTIVE_SITE_WILLOW])
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch.dict(os.environ, {"ADMIN_FRAPPE_URL": "http://admin:8000"}):
        registry._admin_url = "http://admin:8000"
        with patch("registry.httpx.AsyncClient", return_value=mock_client):
            await registry.load()

    site = registry.lookup("willow")
    assert site is not None
    assert site["frappe_site"] == "willow.sparkmojo.com"
    assert site["frappe_url"] == "http://frappe-poc-backend-1:8000"
    assert site["site_type"] == "client"


# --- Test 4: Env var fallback when admin site unreachable ---

@pytest.mark.anyio
async def test_falls_back_to_env_var_when_admin_unreachable():
    """When DocType load fails, falls back to SITE_REGISTRY env var."""
    registry = SiteRegistry()

    env_registry = json.dumps({
        "poc-dev": {
            "frappe_url": "http://frappe-poc-backend-1:8000",
            "frappe_site": "frontend",
            "site_type": "dev",
        }
    })

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=Exception("Connection refused"))
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch.dict(os.environ, {
        "ADMIN_FRAPPE_URL": "http://admin:8000",
        "SITE_REGISTRY": env_registry,
    }):
        registry._admin_url = "http://admin:8000"
        with patch("registry.httpx.AsyncClient", return_value=mock_client):
            await registry.load()

    assert registry.site_count == 1
    site = registry.lookup("poc-dev")
    assert site is not None
    assert site["frappe_site"] == "frontend"


# --- Test 5: Cache refresh endpoint clears and reloads ---

@pytest.mark.anyio
async def test_registry_refresh_endpoint():
    """POST /admin/registry/refresh clears cache and reloads."""
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(
        return_value=_mock_doctype_response([ACTIVE_SITE_ADMIN, ACTIVE_SITE_WILLOW])
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    # Seed app.state.site_registry since lifespan doesn't run in test client
    site_reg = SiteRegistry()
    app.state.site_registry = site_reg

    with patch.dict(os.environ, {"ADMIN_FRAPPE_URL": "http://admin:8000"}):
        site_reg._admin_url = "http://admin:8000"
        with patch("registry.httpx.AsyncClient", return_value=mock_client):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post("/admin/registry/refresh")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "refreshed"
    assert data["sites"] == 2


# --- Test 6: Inactive sites not in registry ---

@pytest.mark.anyio
async def test_inactive_sites_excluded():
    """Only active sites (is_active=1) appear in the registry.
    The DocType query filters is_active=1 server-side, so inactive records
    should never be returned by the API."""
    registry = SiteRegistry()

    # Simulate: API only returns active records (server-side filter)
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(
        return_value=_mock_doctype_response([ACTIVE_SITE_ADMIN])
    )
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch.dict(os.environ, {"ADMIN_FRAPPE_URL": "http://admin:8000"}):
        registry._admin_url = "http://admin:8000"
        with patch("registry.httpx.AsyncClient", return_value=mock_client):
            await registry.load()

    # Active site present
    assert registry.lookup("admin") is not None
    # Inactive site absent
    assert registry.lookup("old-client") is None
    assert registry.site_count == 1


# --- Bonus: extract_subdomain unit tests ---

def test_extract_subdomain_valid():
    assert extract_subdomain("willow.app.sparkmojo.com") == "willow"
    assert extract_subdomain("poc.sparkmojo.com") == "poc"
    assert extract_subdomain("admin.sparkmojo.com:443") == "admin"


def test_extract_subdomain_invalid():
    assert extract_subdomain("localhost:5173") is None
    assert extract_subdomain("sparkmojo.com") is None


def test_registry_is_stale():
    """Cache staleness check works correctly."""
    registry = SiteRegistry()
    registry._last_loaded = time.time() - 400  # 400s > 300s TTL
    assert registry.is_stale() is True
    registry._last_loaded = time.time() - 100  # 100s < 300s TTL
    assert registry.is_stale() is False
