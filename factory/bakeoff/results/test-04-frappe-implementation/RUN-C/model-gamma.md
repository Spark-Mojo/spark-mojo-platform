model: model-gamma
test: 04-frappe-implementation
run: C
date: 2026-04-09

Here is the complete implementation for **FEATURE-FLAG-001**.

---

### `abstraction-layer/routes/admin.py` (CREATE)

```python
"""
Admin routes — Site feature flags.

Returns which platform features are enabled for a given site.
React calls /api/modules/admin/features/{subdomain}.
"""

import json
import logging
import os

import httpx
from fastapi import APIRouter

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


PLATFORM_FEATURE_DEFAULTS = {
    "billing_mojo": False,
    "scheduling_mojo": False,
    "workboard_mojo": False,
    "wiki_mojo": False,
    "crm_mojo": False,
    "patient_portal": False,
}


async def _read_sm_site_registry(subdomain: str) -> dict | None:
    """Read SM Site Registry doc by subdomain name. Returns dict or None if not found."""
    try:
        async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
            resp = await client.get(
                f"/api/resource/SM Site Registry/{subdomain}",
                timeout=15,
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json().get("data", {})
    except httpx.HTTPStatusError:
        return None
    except httpx.RequestError:
        logger.error("Failed to connect to Frappe for site lookup: %s", subdomain)
        return None


def _get_features_for_site(config_json_text: str | None) -> dict:
    """Parse config_json and merge feature overrides into platform defaults.

    - Unknown feature keys in config are silently ignored.
    - Malformed or non-dict config returns platform defaults.
    """
    features = dict(PLATFORM_FEATURE_DEFAULTS)

    if not config_json_text:
        return features

    try:
        config = json.loads(config_json_text)
    except (json.JSONDecodeError, TypeError):
        return features

    if not isinstance(config, dict):
        return features

    site_features = config.get("features")
    if not isinstance(site_features, dict):
        return features

    for key in features:
        if key in site_features and isinstance(site_features[key], bool):
            features[key] = site_features[key]

    return features


@router.get("/features/{subdomain}")
async def get_site_features(subdomain: str):
    """Return which platform features are enabled for a given site."""
    site = await _read_sm_site_registry(subdomain)

    if site is None:
        return {"error": "site not found", "subdomain": subdomain}, 404

    config_json_text = site.get("config_json")
    features = _get_features_for_site(config_json_text)

    return {"subdomain": subdomain, "features": features}
```

---

### `abstraction-layer/main.py` (MODIFY)

Add the import and router registration alongside existing routes:

```python
# --- Add import ---
from routes.admin import router as admin_router

# --- Add inside the app setup, alongside other router includes ---
app.include_router(admin_router, prefix="/api/modules/admin")
```

Full `main.py` for context (insert lines marked with `<<<<`):

```python
# ... existing imports ...
from routes.billing import router as billing_router, webhook_router as billing_webhook_router
from routes.admin import router as admin_router  # <<<< ADD THIS LINE

# ... existing app setup ...
app = FastAPI(title="Spark Mojo Abstraction Layer")

app.include_router(billing_router, prefix="/api/modules/billing")
app.include_router(billing_webhook_router, prefix="/api/modules/billing")
app.include_router(admin_router, prefix="/api/modules/admin")  # <<<< ADD THIS LINE
# ... rest of existing code ...
```

---

### `tests/routes/test_admin.py` (CREATE)

```python
"""Tests for admin routes — site feature flags endpoint."""

import json
from unittest.mock import patch
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Import module dynamically to handle hyphenated package path
import importlib.util
import os

_module_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "..",
    "abstraction-layer", "routes", "admin.py"
)
_spec = importlib.util.spec_from_file_location("admin_routes", _module_path)
_admin_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_admin_module)


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(_admin_module.router)
    return TestClient(app)


def test_returns_all_6_feature_keys_with_defaults_when_no_config(client):
    """When site has no config_json, all 6 features default to False."""

    async def mock_read(subdomain: str):
        return {"config_json": None}

    with patch.object(_admin_module, "_read_sm_site_registry", new=mock_read):
        resp = client.get("/features/test-site")

        assert resp.status_code == 200
        data = resp.json()
        assert data["subdomain"] == "test-site"
        assert set(data["features"].keys()) == set(_admin_module.PLATFORM_FEATURE_DEFAULTS.keys())
        assert len(data["features"]) == 6
        assert all(v is False for v in data["features"].values())


def test_site_config_overrides_applied_correctly(client):
    """Site config_json.features overrides supersede platform defaults."""
    config = json.dumps({
        "other_field": "irrelevant",
        "features": {
            "billing_mojo": True,
            "scheduling_mojo": True,
            "wiki_mojo": True,
        }
    })

    async def mock_read(subdomain: str):
        return {"config_json": config, "name": "test-site"}

    with patch.object(_admin_module, "_read_sm_site_registry", new=mock_read):
        resp = client.get("/features/test-site")

        assert resp.status_code == 200
        data = resp.json()
        assert data["features"]["billing_mojo"] is True
        assert data["features"]["scheduling_mojo"] is True
        assert data["features"]["wiki_mojo"] is True
        # Non-overridden features must remain at platform defaults
        assert data["features"]["workboard_mojo"] is False
        assert data["features"]["crm_mojo"] is False
        assert data["features"]["patient_portal"] is False


def test_unknown_feature_keys_in_config_json_are_ignored(client):
    """Unknown keys in config_json.features are silently ignored."""
    config = json.dumps({
        "features": {
            "billing_mojo": True,
            "unknown_mojo": True,
            "mystery_feature": True,
        }
    })

    async def mock_read(subdomain: str):
        return {"config_json": config}

    with patch.object(_admin_module, "_read_sm_site_registry", new=mock_read):
        resp = client.get("/features/test-site")

        assert resp.status_code == 200
        data = resp.json()
        assert "unknown_mojo" not in data["features"]
        assert "mystery_feature" not in data["features"]
        assert len(data["features"]) == 6
        assert data["features"]["billing_mojo"] is True


def test_subdomain_not_found_returns_404(client):
    """Unknown subdomain returns 404 with the specified JSON structure."""

    async def mock_read(subdomain: str):
        return None

    with patch.object(_admin_module, "_read_sm_site_registry", new=mock_read):
        resp = client.get("/features/ghost-site")

        assert resp.status_code == 404
        data = resp.json()
        assert data["error"] == "site not found"
        assert data["subdomain"] == "ghost-site"


def test_malformed_features_config_json_returns_defaults(client):
    """Malformed JSON in config_json does not cause a 500; returns platform defaults."""
    malformed_configs = [
        "{invalid json!!!",
        "not json at all",
        "",
        "[]",           # valid JSON but not a dict
        '{"features": "string_instead_of_object"}',  # features not a dict
    ]

    for malformed in malformed_configs:

        async def mock_read(subdomain: str, _cfg=malformed):
            return {"config_json": _cfg}

        with patch.object(_admin_module, "_read_sm_site_registry", new=mock_read):
            resp = client.get("/features/test-site")

            assert resp.status_code == 200, f"Failed for config: {malformed}"
            data = resp.json()
            assert len(data["features"]) == 6
            assert all(v is False for v in data["features"].values()), \
                f"Non-default value with config: {malformed}"
```