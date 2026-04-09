model: model-epsilon
test: 04-frappe-implementation
run: C
date: 2026-04-09

I'll implement the feature flags endpoint exactly as specified. Let me create the files:

## Implementation

### CREATE: `abstraction-layer/routes/admin.py`
```python
"""
Admin routes — site feature flags and site-level configuration.

Provides GET endpoint for platform features enabled per site.
All data flows through Frappe REST API via token auth.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

# Platform defaults — all features disabled by default
PLATFORM_DEFAULTS = {
    "billing_mojo": False,
    "scheduling_mojo": False,
    "workboard_mojo": False,
    "wiki_mojo": False,
    "crm_mojo": False,
    "patient_portal": False,
}

# Valid feature keys (whitelist)
VALID_FEATURE_KEYS = set(PLATFORM_DEFAULTS.keys())


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class FeaturesResponse(BaseModel):
    subdomain: str
    features: dict


class ErrorResponse(BaseModel):
    error: str
    subdomain: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _read_frappe_doc(doctype: str, name: str) -> Optional[dict]:
    """Read a single doc from Frappe. Returns dict or None if not found."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json().get("data", {})


def _get_site_features(config_json: Optional[dict]) -> dict:
    """
    Merge site config features with platform defaults.
    Unknown keys in config_json.features are ignored.
    Malformed config_json returns platform defaults.
    """
    features = PLATFORM_DEFAULTS.copy()

    if not config_json:
        return features

    try:
        features_config = config_json.get("features", {})
        if not isinstance(features_config, dict):
            # Malformed features config — return defaults
            return features

        # Apply site overrides for known keys only
        for key in VALID_FEATURE_KEYS:
            if key in features_config:
                value = features_config[key]
                if isinstance(value, bool):
                    features[key] = value
                # Non-boolean values for known keys are ignored (silently)
    except Exception:
        # Any parsing error — return platform defaults
        return features

    return features


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/features/{subdomain}",
    response_model=FeaturesResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Site not found"},
    },
)
async def get_site_features(subdomain: str):
    """
    Get platform features enabled for a given site (subdomain).

    Platform defaults are applied first. Site config_json.features
    overrides supersede platform defaults for known feature keys.
    Unknown feature keys in config_json are silently ignored.
    """
    # Look up site in SM Site Registry by subdomain
    site = await _read_frappe_doc("SM Site Registry", subdomain)

    if not site:
        raise HTTPException(
            status_code=404,
            detail={"error": "site not found", "subdomain": subdomain},
        )

    # Parse config_json
    config_json = None
    raw_config = site.get("config_json")
    if raw_config:
        try:
            config_json = json.loads(raw_config) if isinstance(raw_config, str) else raw_config
        except json.JSONDecodeError:
            # Malformed config_json — proceed with None, defaults will apply
            logger.warning("Malformed config_json for site %s, using defaults", subdomain)
            config_json = None

    # Merge features
    features = _get_site_features(config_json)

    return FeaturesResponse(subdomain=subdomain, features=features)
```

### MODIFY: `abstraction-layer/main.py`
```python
"""
Spark Mojo — Mojo Abstraction Layer

FastAPI application that exposes all platform capabilities to React.
All React calls flow through this layer — never directly to Frappe.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import billing
from routes.admin import router as admin_router

app = FastAPI(
    title="Spark Mojo Abstraction Layer",
    version="1.0.0",
    description="All React calls flow through MAL. Never call Frappe directly.",
)

# CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(billing.router, prefix="/api/modules/billing")
app.include_router(billing.webhook_router, prefix="/api/webhooks/billing")
app.include_router(admin_router, prefix="/api/modules/admin")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### CREATE: `abstraction-layer/tests/test_admin_features.py`
```python
"""
Tests for admin feature flags endpoint.

Verifies FEATURE-FLAG-001 acceptance criteria.
"""

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient
from fastapi import FastAPI

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.admin import router, PLATFORM_DEFAULTS, _get_site_features


# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def app():
    """Create FastAPI app with admin router for testing."""
    test_app = FastAPI()
    test_app.include_router(router, prefix="/api/modules/admin")
    return test_app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_frappe_response():
    """Factory for mock Frappe API responses."""
    def _make(site_data: dict | None):
        mock_resp = MagicMock()
        if site_data is None:
            mock_resp.status_code = 404
            mock_resp.json.return_value = {"data": None}
        else:
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"data": site_data}
        mock_resp.raise_for_status = MagicMock()
        return mock_resp
    return _make


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_returns_all_6_feature_keys_with_defaults_when_no_config(client, mock_frappe_response):
    """
    Test: GET /api/modules/admin/features/{subdomain} returns all 6 feature keys
    with platform defaults (all False) when site has no config_json.
    """
    site_data = {
        "name": "testsite",
        "config_json": None,
    }

    with patch("routes.admin._read_frappe_doc", new_callable=AsyncMock) as mock_read:
        mock_read.return_value = site_data

        response = client.get("/api/modules/admin/features/testsite")

    assert response.status_code == 200
    data = response.json()
    assert data["subdomain"] == "testsite"
    assert "features" in data
    assert len(data["features"]) == 6

    expected_keys = [
        "billing_mojo",
        "scheduling_mojo",
        "workboard_mojo",
        "wiki_mojo",
        "crm_mojo",
        "patient_portal",
    ]
    for key in expected_keys:
        assert key in data["features"], f"Missing feature key: {key}"
        assert data["features"][key] is False, f"Feature {key} should default to False"


def test_site_config_overrides_applied_correctly(client, mock_frappe_response):
    """
    Test: Site config_json.features overrides supersede platform defaults.
    Only the specified features should be overridden; others remain False.
    """
    site_data = {
        "name": "customsite",
        "config_json": json.dumps({
            "features": {
                "billing_mojo": True,
                "scheduling_mojo": True,
                "workboard_mojo": True,
            }
        }),
    }

    with patch("routes.admin._read_frappe_doc", new_callable=AsyncMock) as mock_read:
        mock_read.return_value = site_data

        response = client.get("/api/modules/admin/features/customsite")

    assert response.status_code == 200
    data = response.json()
    assert data["features"]["billing_mojo"] is True
    assert data["features"]["scheduling_mojo"] is True
    assert data["features"]["workboard_mojo"] is True
    assert data["features"]["wiki_mojo"] is False
    assert data["features"]["crm_mojo"] is False
    assert data["features"]["patient_portal"] is False


def test_unknown_feature_keys_in_config_json_are_ignored(client, mock_frappe_response):
    """
    Test: Unknown feature keys in config_json are silently ignored.
    Only known keys should appear in response.
    """
    site_data = {
        "name": "weirdsite",
        "config_json": json.dumps({
            "features": {
                "billing_mojo": True,
                "nonexistent_feature": True,
                "another_fake": False,
            },
            "other_setting": "ignored",
        }),
    }

    with patch("routes.admin._read_frappe_doc", new_callable=AsyncMock) as mock_read:
        mock_read.return_value = site_data

        response = client.get("/api/modules/admin/features/weirdsite")

    assert response.status_code == 200
    data = response.json()
    assert "features" in data
    assert "billing_mojo" in data["features"]
    assert "nonexistent_feature" not in data["features"]
    assert "another_fake" not in data["features"]
    assert data["features"]["billing_mojo"] is True
    # All known features present
    assert len(data["features"]) == 6


def test_subdomain_not_found_returns_404(client, mock_frappe_response):
    """
    Test: Unknown subdomain returns 404 with error message.
    """
    with patch("routes.admin._read_frappe_doc", new_callable=AsyncMock) as mock_read:
        mock_read.return_value = None

        response = client.get("/api/modules/admin/features/nonexistentsite")

    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    detail = data["detail"]
    assert detail["error"] == "site not found"
    assert detail["subdomain"] == "nonexistentsite"


def test_malformed_features_config_json_returns_defaults(client, mock_frappe_response):
    """
    Test: Malformed config_json does not cause a 500;
    returns platform defaults gracefully.
    """
    site_data = {
        "name": "brokensite",
        "config_json": "this is not valid json {{{",
    }

    with patch("routes.admin._read_frappe_doc", new_callable=AsyncMock) as mock_read:
        mock_read.return_value = site_data

        response = client.get("/api/modules/admin/features/brokinsite")

    assert response.status_code == 200
    data = response.json()
    assert data["subdomain"] == "brokinsite"
    # All defaults returned
    assert data["features"] == PLATFORM_DEFAULTS


def test_malformed_features_value_returns_defaults():
    """
    Test: Non-boolean values in features config are ignored,
    returning defaults for those keys.
    """
    config_json = {
        "features": {
            "billing_mojo": "yes",  # String instead of bool
            "scheduling_mojo": 1,    # Int instead of bool
            "workboard_mojo": True,  # Valid bool
        }
    }

    features = _get_site_features(config_json)

    assert features["billing_mojo"] is False  # Ignored
    assert features["scheduling_mojo"] is False  # Ignored
    assert features["workboard_mojo"] is True   # Applied


def test_features_key_not_dict_returns_defaults():
    """
    Test: If config_json.features exists but is not a dict,
    return platform defaults.
    """
    # features is a list instead of dict
    config_json = {"features": ["billing_mojo", "scheduling_mojo"]}
    features = _get_site_features(config_json)
    assert features == PLATFORM_DEFAULTS

    # features is a string instead of dict
    config_json = {"features": "billing_mojo"}
    features = _get_site_features(config_json)
    assert features == PLATFORM_DEFAULTS

    # features is None
    config_json = {"features": None}
    features = _get_site_features(config_json)
    assert features == PLATFORM_DEFAULTS


def test_none_config_json_returns_defaults():
    """
    Test: None config_json returns platform defaults.
    """
    features = _get_site_features(None)
    assert features == PLATFORM_DEFAULTS


def test_empty_config_json_returns_defaults():
    """
    Test: Empty dict config_json returns platform defaults.
    """
    features = _get_site_features({})
    assert features == PLATFORM_DEFAULTS


def test_config_json_missing_features_key_returns_defaults():
    """
    Test: config_json without features key returns platform defaults.
    """
    config_json = {
        "other_setting": "value",
        "some_data": 123,
    }
    features = _get_site_features(config_json)
    assert features == PLATFORM_DEFAULTS


# ---------------------------------------------------------------------------
# Integration-style test (mocked httpx)
# ---------------------------------------------------------------------------

def test_full_flow_with_mocked_frappe_call(client):
    """
    End-to-end test simulating Frappe API call with httpx mock.
    """
    site_data = {
        "name": "integrationsite",
        "config_json": json.dumps({
            "features": {
                "crm_mojo": True,
                "patient_portal": True,
            }
        }),
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": site_data}
    mock_response.raise_for_status = MagicMock()

    with patch("routes.admin._read_frappe_doc", new_callable=AsyncMock) as mock_read:
        mock_read.return_value = site_data

        response = client.get("/api/modules/admin/features/integrationsite")

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert data["subdomain"] == "integrationsite"
    assert "features" in data
    assert len(data["features"]) == 6

    # Verify overrides applied
    assert data["features"]["crm_mojo"] is True
    assert data["features"]["patient_portal"] is True

    # Verify non-overridden remain False
    assert data["features"]["billing_mojo"] is False
    assert data["features"]["scheduling_mojo"] is False
    assert data["features"]["workboard_mojo"] is False
    assert data["features"]["wiki_mojo"] is False
```

---

## Summary

| File | Action | Description |
|------|--------|-------------|
| `abstraction-layer/routes/admin.py` | CREATE | Feature flags endpoint with `_get_site_features()` helper |
| `abstraction-layer/main.py` | MODIFY | Added `admin_router` registration |
| `abstraction-layer/tests/test_admin_features.py` | CREATE | 10 test cases covering all acceptance criteria |