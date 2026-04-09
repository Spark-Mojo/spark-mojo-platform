model: model-beta
test: 04-frappe-implementation
run: C
date: 2026-04-09

## `abstraction-layer/routes/admin.py` — CREATE

```python
"""
Admin capability routes — site feature flags, platform configuration.

Handles site-level feature flag resolution for the React frontend (FEATURE-FLAG-001).
All data flows through Frappe REST API via token auth.
"""

import json
import logging
import os

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

PLATFORM_FEATURE_DEFAULTS = {
    "billing_mojo": False,
    "scheduling_mojo": False,
    "workboard_mojo": False,
    "wiki_mojo": False,
    "crm_mojo": False,
    "patient_portal": False,
}


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


@router.get("/features/{subdomain}")
async def get_site_features(subdomain: str):
    """Return which platform features are enabled for a given site."""
    # Look up SM Site Registry by subdomain
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={
                "filters": json.dumps([["subdomain", "=", subdomain]]),
                "fields": '["name","subdomain","config_json"]',
                "limit_page_length": 1,
            },
            timeout=15,
        )
        resp.raise_for_status()
        sites = resp.json().get("data", [])

    if not sites:
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "subdomain": subdomain},
        )

    site = sites[0]
    features = dict(PLATFORM_FEATURE_DEFAULTS)

    # Parse config_json and apply feature overrides
    config_json_raw = site.get("config_json") or ""
    if config_json_raw:
        try:
            config = json.loads(config_json_raw)
            site_features = config.get("features", {}) if isinstance(config, dict) else {}
            if isinstance(site_features, dict):
                for key, value in site_features.items():
                    if key in features and isinstance(value, bool):
                        features[key] = value
        except (json.JSONDecodeError, TypeError, AttributeError):
            # Malformed config_json — return platform defaults (AC #5)
            pass

    return {"subdomain": subdomain, "features": features}
```

## `abstraction-layer/main.py` — MODIFY

```python
# --- Add import alongside existing route imports ---
from routes.admin import router as admin_router

# --- Add router registration alongside existing app.include_router() calls ---
app.include_router(admin_router, prefix="/api/modules/admin")
```

## `abstraction-layer/tests/test_admin_features.py` — CREATE

```python
"""
Tests for FEATURE-FLAG-001 — site feature flags endpoint.

GET /api/modules/admin/features/{subdomain}
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.admin import router

# ---------------------------------------------------------------------------
# Test app & client
# ---------------------------------------------------------------------------

app = FastAPI()
app.include_router(router, prefix="/api/modules/admin")
client = TestClient(app)

EXPECTED_FEATURE_KEYS = {
    "billing_mojo",
    "scheduling_mojo",
    "workboard_mojo",
    "wiki_mojo",
    "crm_mojo",
    "patient_portal",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _patch_frappe(sites_data):
    """Return a context-manager patch that makes the Frappe call return *sites_data*."""
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"data": sites_data}
    mock_resp.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    # AsyncMock.__aenter__ returns itself by default — correct for `async with`

    return patch("routes.admin.httpx.AsyncClient", return_value=mock_client)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_returns_all_6_feature_keys_with_defaults_when_no_config():
    """Site exists but has no config_json — all 6 features default to False."""
    with _patch_frappe([
        {"name": "site-1", "subdomain": "testclinic", "config_json": None},
    ]):
        resp = client.get("/api/modules/admin/features/testclinic")

    assert resp.status_code == 200
    data = resp.json()
    assert data["subdomain"] == "testclinic"
    assert set(data["features"].keys()) == EXPECTED_FEATURE_KEYS
    assert len(data["features"]) == 6
    assert all(v is False for v in data["features"].values())


def test_site_config_overrides_applied_correctly():
    """Site config_json.features booleans supersede platform defaults."""
    config = json.dumps({
        "features": {
            "billing_mojo": True,
            "workboard_mojo": True,
        }
    })
    with _patch_frappe([
        {"name": "site-1", "subdomain": "willow", "config_json": config},
    ]):
        resp = client.get("/api/modules/admin/features/willow")

    assert resp.status_code == 200
    data = resp.json()
    assert data["subdomain"] == "willow"
    assert data["features"]["billing_mojo"] is True
    assert data["features"]["workboard_mojo"] is True
    # Remaining keys stay at platform default (False)
    assert data["features"]["scheduling_mojo"] is False
    assert data["features"]["wiki_mojo"] is False
    assert data["features"]["crm_mojo"] is False
    assert data["features"]["patient_portal"] is False


def test_unknown_feature_keys_in_config_json_are_ignored():
    """Keys in config_json.features that are not in PLATFORM_FEATURE_DEFAULTS are dropped."""
    config = json.dumps({
        "features": {
            "billing_mojo": True,
            "telehealth_mojo": True,
            "ai_mojo": True,
            "mystery_feature": False,
        }
    })
    with _patch_frappe([
        {"name": "site-1", "subdomain": "testclinic", "config_json": config},
    ]):
        resp = client.get("/api/modules/admin/features/testclinic")

    assert resp.status_code == 200
    data = resp.json()
    assert set(data["features"].keys()) == EXPECTED_FEATURE_KEYS
    assert len(data["features"]) == 6
    assert "telehealth_mojo" not in data["features"]
    assert "ai_mojo" not in data["features"]
    assert "mystery_feature" not in data["features"]
    # The one known key is still applied
    assert data["features"]["billing_mojo"] is True


def test_subdomain_not_found_returns_404():
    """Unknown subdomain returns 404 with the spec'd error shape."""
    with _patch_frappe([]):
        resp = client.get("/api/modules/admin/features/nonexistent")

    assert resp.status_code == 404
    data = resp.json()
    assert data["error"] == "site not found"
    assert data["subdomain"] == "nonexistent"


def test_malformed_features_config_json_returns_defaults():
    """Invalid JSON in config_json does not cause a 500 — returns platform defaults."""
    with _patch_frappe([
        {"name": "site-1", "subdomain": "broken", "config_json": "not valid json {{{"},
    ]):
        resp = client.get("/api/modules/admin/features/broken")

    assert resp.status_code == 200
    data = resp.json()
    assert data["subdomain"] == "broken"
    assert set(data["features"].keys()) == EXPECTED_FEATURE_KEYS
    assert len(data["features"]) == 6
    assert all(v is False for v in data["features"].values())
```