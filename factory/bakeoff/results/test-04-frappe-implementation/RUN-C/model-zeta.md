model: model-zeta
test: 04-frappe-implementation
run: C
date: 2026-04-09

 **FILE:** `abstraction-layer/routes/admin.py`
```python
"""
Admin routes — Site feature flags and platform administration.

Handles site configuration retrieval for feature flags (FEATURE-FLAG-001).
"""

import json
import logging
import os
from typing import Dict, Any

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(tags=["admin"])

logger = logging.getLogger("abstraction-layer.admin")

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

# Platform defaults for all feature flags (FEATURE-FLAG-001) - all False per spec
PLATFORM_DEFAULT_FEATURES: Dict[str, bool] = {
    "billing_mojo": False,
    "scheduling_mojo": False,
    "workboard_mojo": False,
    "wiki_mojo": False,
    "crm_mojo": False,
    "patient_portal": False,
}


def _frappe_headers() -> Dict[str, str]:
    """Construct Frappe API headers for authentication."""
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


@router.get("/features/{subdomain}")
async def get_site_features(subdomain: str) -> Dict[str, Any]:
    """
    Get feature flags for a specific site/subdomain.

    Returns platform defaults merged with site-specific overrides from
    SM Site Registry config_json.features.

    Request: GET /api/modules/admin/features/{subdomain}
    
    Response (200): {
        "subdomain": "{subdomain}",
        "features": {
            "billing_mojo": true,
            "scheduling_mojo": false,
            "workboard_mojo": true,
            "wiki_mojo": false,
            "crm_mojo": false,
            "patient_portal": false
        }
    }
    
    Response (404): {
        "error": "site not found",
        "subdomain": "{subdomain}"
    }
    """
    # Query SM Site Registry by subdomain field
    try:
        async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
            resp = await client.get(
                "/api/resource/SM Site Registry",
                params={
                    "filters": json.dumps([["subdomain", "=", subdomain]]),
                    "fields": json.dumps(["name", "config_json", "subdomain"]),
                    "limit_page_length": 1,
                },
                timeout=15,
            )
            resp.raise_for_status()
            sites = resp.json().get("data", [])
    except Exception as exc:
        logger.error("Failed to fetch site registry for %s: %s", subdomain, exc)
        raise HTTPException(status_code=500, detail="Internal error fetching site configuration")

    # AC #4: Unknown subdomain returns 404 with specific error format
    if not sites:
        return JSONResponse(
            status_code=404,
            content={
                "error": "site not found",
                "subdomain": subdomain,
            },
        )

    site = sites[0]
    
    # AC #1: Start with all 6 platform defaults (all False)
    features = PLATFORM_DEFAULT_FEATURES.copy()
    
    # Parse config_json for feature overrides (AC #2: site overrides supersede platform defaults)
    config_json_str = site.get("config_json") or "{}"
    
    if config_json_str:
        try:
            config = json.loads(config_json_str)
            if isinstance(config, dict):
                site_features = config.get("features")
                if isinstance(site_features, dict):
                    # Apply valid feature overrides (only the 6 known keys)
                    for key in features.keys():
                        if key in site_features:
                            features[key] = bool(site_features[key])
                    # AC #3: Unknown feature keys in config_json are silently ignored
        except json.JSONDecodeError:
            # AC #5: Malformed config_json does not cause 500; returns platform defaults
            logger.warning("Malformed config_json for site %s, returning platform defaults", subdomain)
            # features already contains defaults
        except Exception:
            # Any other parsing error also returns defaults per AC #5
            logger.warning("Error parsing config_json for site %s, returning platform defaults", subdomain)
            # features already contains defaults
    
    return {
        "subdomain": subdomain,
        "features": features,
    }
```

**MODIFY:** `abstraction-layer/main.py` (add the following lines)

```python
# Import the admin router (add near other imports)
from routes.admin import router as admin_router

# Include the admin router (add with other app.include_router calls)
app.include_router(admin_router, prefix="/api/modules/admin")
```

**FILE:** `abstraction-layer/tests/test_admin_features.py`
```python
"""
Tests for FEATURE-FLAG-001: Site feature flags endpoint.

Test coverage for acceptance criteria:
- AC #1: Returns all 6 feature keys with defaults when no config
- AC #2: Site config overrides applied correctly  
- AC #3: Unknown feature keys in config_json are ignored
- AC #4: Subdomain not found returns 404
- AC #5: Malformed features config_json returns defaults (not 500)
"""

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

# Import the FastAPI app - adjust path if test file is located elsewhere
from main import app


@pytest.fixture
def client() -> TestClient:
    """TestClient fixture for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_httpx_client():
    """
    Fixture to mock httpx.AsyncClient for Frappe API calls.
    Yields the mock get method which can be configured via _config_json attribute.
    """
    with patch("routes.admin.httpx.AsyncClient") as mock_client_class:
        instance = MagicMock()
        mock_client_class.return_value.__aenter__ = AsyncMock(return_value=instance)
        mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)
        
        async def mock_get(*args, **kwargs):
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            
            # Allow tests to set config via mock_get._config_json
            config_json = getattr(mock_get, "_config_json", "{}")
            
            mock_response.json.return_value = {
                "data": [{
                    "name": "TEST-SITE-001",
                    "subdomain": "testsite",
                    "config_json": config_json
                }]
            }
            return mock_response
        
        instance.get = mock_get
        yield mock_get


class TestFeatureFlagEndpoint:
    """Test suite for GET /api/modules/admin/features/{subdomain}"""

    def test_returns_all_6_feature_keys_with_defaults_when_no_config(self, client, mock_httpx_client):
        """AC #1: GET returns 200 with all 6 feature keys, defaults to False when no config."""
        mock_httpx_client._config_json = "{}"
        
        response = client.get("/api/modules/admin/features/testsite")
        
        assert response.status_code == 200
        data = response.json()
        assert data["subdomain"] == "testsite"
        assert "features" in data
        features = data["features"]
        
        # Verify exactly the 6 platform features are present
        expected_keys = {
            "billing_mojo", "scheduling_mojo", "workboard_mojo", 
            "wiki_mojo", "crm_mojo", "patient_portal"
        }
        assert set(features.keys()) == expected_keys
        
        # Verify all defaults are False
        assert all(v is False for v in features.values()), "All platform defaults should be False"

    def test_site_config_overrides_applied_correctly(self, client, mock_httpx_client):
        """AC #2: Site config_json.features overrides supersede platform defaults."""
        config = {
            "features": {
                "billing_mojo": True, 
                "crm_mojo": True,
                "scheduling_mojo": True  # Enable 3, leave others default
            }
        }
        mock_httpx_client._config_json = json.dumps(config)
        
        response = client.get("/api/modules/admin/features/testsite")
        
        assert response.status_code == 200
        data = response.json()
        features = data["features"]
        
        # Overridden features should be True
        assert features["billing_mojo"] is True
        assert features["crm_mojo"] is True
        assert features["scheduling_mojo"] is True
        
        # Non-overridden features should remain False (platform defaults)
        assert features["workboard_mojo"] is False
        assert features["wiki_mojo"] is False
        assert features["patient_portal"] is False

    def test_unknown_feature_keys_in_config_json_are_ignored(self, client, mock_httpx_client):
        """AC #3: Unknown keys in config_json are silently ignored."""
        config = {
            "features": {
                "billing_mojo": True,  # Valid - should be applied
                "unknown_feature": True,  # Invalid - should be ignored
                "another_unknown": False,  # Invalid - should be ignored
                "custom_module": "value"  # Invalid - should be ignored
            }
        }
        mock_httpx_client._config_json = json.dumps(config)
        
        response = client.get("/api/modules/admin/features/testsite")
        
        assert response.status_code == 200
        data = response.json()
        features = data["features"]
        
        # Known features should have correct values
        assert features["billing_mojo"] is True
        
        # Unknown features should NOT appear in response
        assert "unknown_feature" not in features
        assert "another_unknown" not in features
        assert "custom_module" not in features
        
        # Other platform features should have defaults
        assert features["scheduling_mojo"] is False
        assert features["workboard_mojo"] is False
        assert features["wiki_mojo"] is False
        assert features["crm_mojo"] is False
        assert features["patient_portal"] is False

    def test_subdomain_not_found_returns_404(self, client):
        """AC #4: Unknown subdomain returns 404 with correct error format."""
        with patch("routes.admin.httpx.AsyncClient") as mock_client_class:
            instance = MagicMock()
            mock_client_class.return_value.__aenter__ = AsyncMock(return_value=instance)
            mock_client_class.return_value.__aexit__ = AsyncMock(return_value=None)
            
            async def mock_get(*args, **kwargs):
                mock_response = MagicMock()
                mock_response.raise_for_status = MagicMock()
                # Empty data = site not found in registry
                mock_response.json.return_value = {"data": []}
                return mock_response
            
            instance.get = mock_get
            
            response = client.get("/api/modules/admin/features/nonexistent")
            
            assert response.status_code == 404
            data = response.json()
            assert data["error"] == "site not found"
            assert data["subdomain"] == "nonexistent"

    def test_malformed_features_config_json_returns_defaults(self, client, mock_httpx_client):
        """AC #5: Malformed config_json does not cause 500; returns platform defaults."""
        mock_httpx_client._config_json = "not valid json { malformed: , content"
        
        response = client.get("/api/modules/admin/features/testsite")
        
        # Should return 200 with defaults, not 500
        assert response.status_code == 200
        data = response.json()
        features = data["features"]
        
        # All features should be platform defaults (False)
        assert all(v is False for v in features.values()), "Malformed JSON should return all False defaults"
        assert set(features.keys()) == {
            "billing_mojo", "scheduling_mojo", "workboard_mojo", 
            "wiki_mojo", "crm_mojo", "patient_portal"
        }
        assert data["subdomain"] == "testsite"
```