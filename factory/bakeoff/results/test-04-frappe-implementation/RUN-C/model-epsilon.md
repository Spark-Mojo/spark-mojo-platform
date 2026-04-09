model: model-epsilon
test: 04-frappe-implementation
run: C
date: 2026-04-09

I'll implement the feature flag endpoint exactly as specified. Let me create the necessary files.

## Implementation

```python
"""
Admin routes — site feature flags, platform configuration.

Provides SM Site Registry-based feature flag lookup for React.
All data flows through Frappe REST API via token auth.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

# Platform defaults — all features disabled unless explicitly enabled
PLATFORM_DEFAULTS = {
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


async def _read_frappe_doc(doctype: str, name: str) -> dict:
    """Read a single doc from Frappe. Returns dict or raises HTTPException."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"{doctype} '{name}' not found")
        resp.raise_for_status()
        return resp.json().get("data", {})


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


def _get_features_from_config(config_json: Optional[str]) -> dict:
    """
    Parse config_json and merge with platform defaults.
    Unknown keys in config_json.features are silently ignored.
    Malformed config_json returns platform defaults.
    """
    # Start with platform defaults
    features = PLATFORM_DEFAULTS.copy()

    if not config_json:
        return features

    try:
        config = json.loads(config_json)
    except (json.JSONDecodeError, TypeError):
        # Malformed JSON — return defaults
        return features

    if not isinstance(config, dict):
        return features

    # Get features from config, ignore unknown keys
    config_features = config.get("features", {})
    if not isinstance(config_features, dict):
        return features

    # Only apply known feature keys
    for key in PLATFORM_DEFAULTS:
        if key in config_features:
            # Coerce to boolean
            val = config_features[key]
            features[key] = bool(val) if val is not None else PLATFORM_DEFAULTS[key]

    return features


@router.get("/features/{subdomain}")
async def get_site_features(subdomain: str):
    """
    Get platform feature flags for a given site subdomain.

    Feature flags are stored in SM Site Registry.config_json.features.
    Platform defaults are applied when no override exists.
    Unknown feature keys in config_json are silently ignored.
    Malformed config_json does not cause a 500 — returns defaults.

    Returns:
        200: {"subdomain": "{subdomain}", "features": {...all 6 keys...}}
        404: {"error": "site not found", "subdomain": "{subdomain}"}
    """
    # Look up SM Site Registry by subdomain field
    sites = await _list_frappe_docs(
        "SM Site Registry",
        filters=json.dumps([["subdomain", "=", subdomain]]),
        fields='["name","subdomain","config_json"]',
        limit=1,
    )

    if not sites:
        raise HTTPException(
            status_code=404,
            detail={"error": "site not found", "subdomain": subdomain}
        )

    site = sites[0]
    config_json = site.get("config_json", "")

    # Parse config and merge with defaults
    features = _get_features_from_config(config_json)

    return {
        "subdomain": subdomain,
        "features": features,
    }
```

Now let me create the test file:

```python
"""
Tests for admin feature flags endpoint.

Covers FEATURE-FLAG-001 acceptance criteria:
1. GET /api/modules/admin/features/{subdomain} returns 200 with all 6 feature keys
2. Site config_json.features overrides supersede platform defaults
3. Unknown feature keys in config_json are silently ignored
4. Unknown subdomain returns 404
5. Malformed config_json does not cause a 500; returns platform defaults
"""

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient

# Import the router and helpers for unit testing
from abstraction_layer.routes.admin import (
    PLATFORM_DEFAULTS,
    _get_features_from_config,
)


class TestGetFeaturesFromConfig:
    """Unit tests for _get_features_from_config helper."""

    def test_returns_all_6_feature_keys_with_defaults_when_no_config(self):
        """AC1: Returns all 6 feature keys with platform defaults when no config_json."""
        result = _get_features_from_config(None)
        assert set(result.keys()) == set(PLATFORM_DEFAULTS.keys())
        for key, default_val in PLATFORM_DEFAULTS.items():
            assert result[key] == default_val, f"Key {key} should be {default_val}"

    def test_site_config_overrides_applied_correctly(self):
        """AC2: Site config_json.features overrides supersede platform defaults."""
        config_json = json.dumps({
            "features": {
                "billing_mojo": True,
                "scheduling_mojo": True,
                "workboard_mojo": False,
                "wiki_mojo": False,
                "crm_mojo": True,
                "patient_portal": False,
            }
        })
        result = _get_features_from_config(config_json)

        assert result["billing_mojo"] is True
        assert result["scheduling_mojo"] is True
        assert result["workboard_mojo"] is False
        assert result["wiki_mojo"] is False
        assert result["crm_mojo"] is True
        assert result["patient_portal"] is False

    def test_unknown_feature_keys_in_config_json_are_ignored(self):
        """AC3: Unknown feature keys in config_json are silently ignored."""
        config_json = json.dumps({
            "features": {
                "billing_mojo": True,
                "unknown_feature_1": True,
                "some_random_key": 999,
                "another_unknown": False,
            }
        })
        result = _get_features_from_config(config_json)

        # Known feature should be applied
        assert result["billing_mojo"] is True
        # Unknown features should not exist
        assert "unknown_feature_1" not in result
        assert "some_random_key" not in result
        assert "another_unknown" not in result
        # All 6 default keys should still be present
        assert set(result.keys()) == set(PLATFORM_DEFAULTS.keys())

    def test_malformed_features_config_json_returns_defaults(self):
        """AC5: Malformed config_json does not cause a 500; returns platform defaults."""
        # Test various malformed inputs
        malformed_inputs = [
            "{invalid json",
            '{"features": not_valid}',
            '',
            None,
            '{"features": null}',
            'not json at all',
        ]

        for malformed in malformed_inputs:
            result = _get_features_from_config(malformed) if malformed is not None else _get_features_from_config(None)
            assert set(result.keys()) == set(PLATFORM_DEFAULTS.keys()), f"Failed for input: {malformed}"
            for key, default_val in PLATFORM_DEFAULTS.items():
                assert result[key] == default_val, f"Key {key} mismatch for input: {malformed}"

    def test_partial_overrides_only_affect_specified_keys(self):
        """Partial overrides should only affect specified keys, others stay at defaults."""
        config_json = json.dumps({
            "features": {
                "billing_mojo": True,
            }
        })
        result = _get_features_from_config(config_json)

        assert result["billing_mojo"] is True
        # All other keys should remain at defaults
        for key in PLATFORM_DEFAULTS:
            if key != "billing_mojo":
                assert result[key] == PLATFORM_DEFAULTS[key], f"Key {key} should be at default"


class TestGetSiteFeaturesEndpoint:
    """Integration tests for GET /api/modules/admin/features/{subdomain}."""

    @pytest.fixture
    def client(self):
        """Create test client with mocked dependencies."""
        from abstraction_layer.main import app
        return TestClient(app)

    @pytest.fixture
    def mock_frappe_response(self):
        """Mock Frappe API response."""
        return {
            "data": [
                {
                    "name": "site-001",
                    "subdomain": "testclinic",
                    "config_json": json.dumps({"features": {"billing_mojo": True}})
                }
            ]
        }

    def test_returns_all_6_feature_keys_with_defaults_when_no_config(self):
        """AC1: Returns all 6 feature keys with defaults when site has no features configured."""
        with patch("abstraction_layer.routes.admin._list_frappe_docs", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [{
                "name": "site-001",
                "subdomain": "testclinic",
                "config_json": json.dumps({"features": {}})
            }]

            from abstraction_layer.routes.admin import get_site_features

            import asyncio
            result = asyncio.run(get_site_features("testclinic"))

            assert result["subdomain"] == "testclinic"
            assert set(result["features"].keys()) == set(PLATFORM_DEFAULTS.keys())
            for key in PLATFORM_DEFAULTS:
                assert key in result["features"]

    def test_site_config_overrides_applied_correctly(self):
        """AC2: Site config_json.features overrides supersede platform defaults."""
        with patch("abstraction_layer.routes.admin._list_frappe_docs", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [{
                "name": "site-001",
                "subdomain": "testclinic",
                "config_json": json.dumps({
                    "features": {
                        "billing_mojo": True,
                        "scheduling_mojo": True,
                        "workboard_mojo": True,
                        "wiki_mojo": False,
                        "crm_mojo": False,
                        "patient_portal": False,
                    }
                })
            }]

            from abstraction_layer.routes.admin import get_site_features

            import asyncio
            result = asyncio.run(get_site_features("testclinic"))

            assert result["features"]["billing_mojo"] is True
            assert result["features"]["scheduling_mojo"] is True
            assert result["features"]["workboard_mojo"] is True
            assert result["features"]["wiki_mojo"] is False
            assert result["features"]["crm_mojo"] is False
            assert result["features"]["patient_portal"] is False

    def test_unknown_feature_keys_in_config_json_are_ignored(self):
        """AC3: Unknown feature keys in config_json are silently ignored."""
        with patch("abstraction_layer.routes.admin._list_frappe_docs", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [{
                "name": "site-001",
                "subdomain": "testclinic",
                "config_json": json.dumps({
                    "features": {
                        "billing_mojo": True,
                        "fake_feature": True,
                        "another_fake": False,
                    }
                })
            }]

            from abstraction_layer.routes.admin import get_site_features

            import asyncio
            result = asyncio.run(get_site_features("testclinic"))

            # Should still have all 6 known keys
            assert set(result["features"].keys()) == set(PLATFORM_DEFAULTS.keys())
            # Should not contain unknown keys
            assert "fake_feature" not in result["features"]
            assert "another_fake" not in result["features"]
            # billing_mojo override should be applied
            assert result["features"]["billing_mojo"] is True

    def test_subdomain_not_found_returns_404(self):
        """AC4: Unknown subdomain returns 404."""
        with patch("abstraction_layer.routes.admin._list_frappe_docs", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = []

            from abstraction_layer.routes.admin import get_site_features
            from fastapi import HTTPException

            import asyncio

            with pytest.raises(HTTPException) as exc_info:
                asyncio.run(get_site_features("nonexistentsite"))

            assert exc_info.value.status_code == 404
            assert exc_info.value.detail == {"error": "site not found", "subdomain": "nonexistentsite"}

    def test_malformed_features_config_json_returns_defaults(self):
        """AC5: Malformed config_json does not cause a 500; returns platform defaults."""
        with patch("abstraction_layer.routes.admin._list_frappe_docs", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [{
                "name": "site-001",
                "subdomain": "testclinic",
                "config_json": "{not valid json at all"
            }]

            from abstraction_layer.routes.admin import get_site_features

            import asyncio
            result = asyncio.run(get_site_features("testclinic"))

            # Should return all defaults despite malformed JSON
            assert set(result["features"].keys()) == set(PLATFORM_DEFAULTS.keys())
            for key in PLATFORM_DEFAULTS:
                assert result["features"][key] == PLATFORM_DEFAULTS[key]
```

Now let me provide the modification to `main.py`:

```python
# abstraction-layer/main.py
# Add this import at the top with other route imports

from abstraction_layer.routes.admin import router as admin_router

# Add this line to the router registration section (after existing routers)

app.include_router(admin_router, prefix="/api/modules/admin", tags=["admin"])
```

---

## Summary

| File | Action |
|------|--------|
| `abstraction-layer/routes/admin.py` | **CREATE** — New file with feature flags endpoint |
| `abstraction-layer/main.py` | **MODIFY** — Add `admin_router` import and `include_router` call |
| `abstraction-layer/tests/test_admin_features.py` | **CREATE** — All 5 tests covering acceptance criteria |