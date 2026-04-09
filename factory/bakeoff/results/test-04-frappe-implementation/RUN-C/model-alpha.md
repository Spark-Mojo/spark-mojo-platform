model: model-alpha
test: 04-frappe-implementation
run: C
date: 2026-04-09

```python
# abstraction-layer/routes/admin.py
"""
Admin routes — site feature flags and configuration.

Handles site-level feature flag retrieval from SM Site Registry.
React calls /api/modules/admin/features/{subdomain}.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# Platform feature defaults (all False)
PLATFORM_FEATURE_DEFAULTS = {
    "billing_mojo": False,
    "scheduling_mojo": False,
    "workboard_mojo": False,
    "wiki_mojo": False,
    "crm_mojo": False,
    "patient_portal": False,
}


class FeatureFlagsResponse(BaseModel):
    subdomain: str
    features: dict


async def _list_frappe_docs(doctype: str, filters: str = "", fields: str = "", limit: int = 20, offset: int = 0) -> list:
    """List docs from Frappe with filters."""
    params = {"limit_page_length": limit, "limit_start": offset}
    if filters:
        params["filters"] = filters
    if fields:
        params["fields"] = fields
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}", params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", [])


@router.get("/features/{subdomain}")
async def get_site_features(subdomain: str):
    """
    Get feature flags for a given site subdomain.
    
    Returns platform defaults merged with any site-specific overrides
    from SM Site Registry config_json.features.
    """
    # Look up SM Site Registry by subdomain
    try:
        sites = await _list_frappe_docs(
            "SM Site Registry",
            filters=json.dumps([["subdomain", "=", subdomain]]),
            fields='["name","subdomain","config_json"]',
            limit=1,
        )
    except Exception as exc:
        logger.error("Failed to query SM Site Registry for %s: %s", subdomain, exc)
        # If Frappe is unreachable, return 404
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "subdomain": subdomain}
        )

    if not sites:
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "subdomain": subdomain}
        )

    site = sites[0]
    config_json_str = site.get("config_json", "")
    
    # Start with platform defaults
    features = PLATFORM_FEATURE_DEFAULTS.copy()
    
    # Try to parse config_json and apply feature overrides
    if config_json_str:
        try:
            config = json.loads(config_json_str)
            if isinstance(config, dict):
                features_config = config.get("features", {})
                if isinstance(features_config, dict):
                    # Apply overrides for known feature keys only
                    for key in PLATFORM_FEATURE_DEFAULTS:
                        if key in features_config:
                            override_value = features_config[key]
                            if isinstance(override_value, bool):
                                features[key] = override_value
                            # Non-boolean values are silently ignored
        except (json.JSONDecodeError, TypeError):
            # Malformed config_json - return defaults (don't raise 500)
            logger.warning("Malformed config_json for subdomain %s, returning defaults", subdomain)
    
    return FeatureFlagsResponse(
        subdomain=subdomain,
        features=features,
    )
```

```python
# tests/test_admin_features.py
"""
Tests for admin feature flags endpoint.
"""

import json
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from fastapi import FastAPI

from abstraction_layer.routes.admin import router, PLATFORM_FEATURE_DEFAULTS


@pytest.fixture
def app():
    """Create test FastAPI app with admin router."""
    app = FastAPI()
    app.include_router(router, prefix="/api/modules/admin")
    return app


@pytest.fixture
def mock_list_frappe_docs():
    """Mock _list_frappe_docs to return test data."""
    with patch("abstraction_layer.routes.admin._list_frappe_docs") as mock:
        yield mock


@pytest.mark.asyncio
async def test_returns_all_6_feature_keys_with_defaults_when_no_config(app, mock_list_frappe_docs):
    """Test that all 6 feature keys are returned with False defaults when site has no config."""
    mock_list_frappe_docs.return_value = [
        {"name": "SITE-001", "subdomain": "testsite", "config_json": ""}
    ]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/modules/admin/features/testsite")
    
    assert response.status_code == 200
    data = response.json()
    assert data["subdomain"] == "testsite"
    assert len(data["features"]) == 6
    for key in PLATFORM_FEATURE_DEFAULTS:
        assert key in data["features"]
        assert data["features"][key] is False


@pytest.mark.asyncio
async def test_site_config_overrides_applied_correctly(app, mock_list_frappe_docs):
    """Test that site config_json.features overrides supersede platform defaults."""
    config = json.dumps({
        "features": {
            "billing_mojo": True,
            "scheduling_mojo": True,
            "workboard_mojo": False,
        }
    })
    mock_list_frappe_docs.return_value = [
        {"name": "SITE-002", "subdomain": "enabledsite", "config_json": config}
    ]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/modules/admin/features/enabledsite")
    
    assert response.status_code == 200
    data = response.json()
    assert data["features"]["billing_mojo"] is True
    assert data["features"]["scheduling_mojo"] is True
    assert data["features"]["workboard_mojo"] is False
    # Others should remain at defaults
    assert data["features"]["wiki_mojo"] is False
    assert data["features"]["crm_mojo"] is False
    assert data["features"]["patient_portal"] is False


@pytest.mark.asyncio
async def test_unknown_feature_keys_in_config_json_are_ignored(app, mock_list_frappe_docs):
    """Test that unknown feature keys in config_json are silently ignored."""
    config = json.dumps({
        "features": {
            "billing_mojo": True,
            "unknown_mojo": True,  # Should be ignored
            "another_feature": False,  # Should be ignored
        }
    })
    mock_list_frappe_docs.return_value = [
        {"name": "SITE-003", "subdomain": "extrasite", "config_json": config}
    ]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/modules/admin/features/extrasite")
    
    assert response.status_code == 200
    data = response.json()
    assert data["features"]["billing_mojo"] is True
    # Unknown keys should not appear in the response
    assert "unknown_mojo" not in data["features"]
    assert "another_feature" not in data["features"]
    # Only the 6 known keys should be present
    assert len(data["features"]) == 6


@pytest.mark.asyncio
async def test_subdomain_not_found_returns_404(app, mock_list_frappe_docs):
    """Test that unknown subdomain returns 404."""
    mock_list_frappe_docs.return_value = []
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/modules/admin/features/nonexistent")
    
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "site not found"
    assert data["subdomain"] == "nonexistent"


@pytest.mark.asyncio
async def test_malformed_features_config_json_returns_defaults(app, mock_list_frappe_docs):
    """Test that malformed config_json does not cause a 500; returns platform defaults."""
    mock_list_frappe_docs.return_value = [
        {"name": "SITE-004", "subdomain": "brokensite", "config_json": "{invalid json"}
    ]
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/modules/admin/features/brokensite")
    
    assert response.status_code == 200
    data = response.json()
    assert data["subdomain"] == "brokensite"
    # All features should be at defaults
    for key in PLATFORM_FEATURE_DEFAULTS:
        assert data["features"][key] is False
```

```python
# abstraction-layer/main.py (modification instructions)
# 
# Add the following import near the other route imports:
#     from routes.admin import router as admin_router
#
# Add the following line where other routers are registered (after existing app.include_router calls):
#     app.include_router(admin_router, prefix="/api/modules/admin")
#
# Example placement context:
# 
#     from routes.billing import router as billing_router, webhook_router as billing_webhook_router
#     from routes.admin import router as admin_router  # <-- ADD THIS LINE
#
#     app = FastAPI(title="Spark Mojo Abstraction Layer")
#     
#     app.include_router(billing_router, prefix="/api/modules/billing")
#     app.include_router(billing_webhook_router, prefix="/webhooks/billing")
#     app.include_router(admin_router, prefix="/api/modules/admin")  # <-- ADD THIS LINE
```