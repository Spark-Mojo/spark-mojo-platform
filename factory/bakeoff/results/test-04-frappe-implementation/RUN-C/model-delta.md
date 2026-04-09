model: model-delta
test: 04-frappe-implementation
run: C
date: 2026-04-09

I'll get the current date/time for the file headers, then implement the story exactly as specified.

```python
# abstraction-layer/routes/admin.py
"""
Admin capability routes — site feature flags.

Returns which platform features are enabled for a given site.
Site config is read from SM Site Registry DocType (field: config_json).
React calls /api/modules/admin/features/{subdomain}. Never Frappe directly.

FEATURE-FLAG-001
Created: 2026-04-09
"""

import json
import logging
import os

import httpx
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

# ---------------------------------------------------------------------------
# Platform defaults — all False
# ---------------------------------------------------------------------------

PLATFORM_FEATURE_DEFAULTS: dict[str, bool] = {
    "billing_mojo": False,
    "scheduling_mojo": False,
    "workboard_mojo": False,
    "wiki_mojo": False,
    "crm_mojo": False,
    "patient_portal": False,
}


def _frappe_headers() -> dict:
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


def _merge_features(config_json_raw: str | None) -> dict[str, bool]:
    """
    Merge platform defaults with site overrides from config_json.

    - Malformed JSON → returns platform defaults (no 500).
    - Missing "features" key → returns platform defaults.
    - Unknown keys in config_json.features → silently ignored.
    - Only the 6 known keys are returned in the response.
    """
    features = dict(PLATFORM_FEATURE_DEFAULTS)

    if not config_json_raw:
        return features

    try:
        config = json.loads(config_json_raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("SM Site Registry config_json is not valid JSON — returning platform defaults")
        return features

    site_features = config.get("features")
    if not isinstance(site_features, dict):
        return features

    for key in PLATFORM_FEATURE_DEFAULTS:
        if key in site_features and isinstance(site_features[key], bool):
            features[key] = site_features[key]

    return features


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/features/{subdomain}")
async def get_site_features(subdomain: str):
    """
    Return which platform features are enabled for a given site.

    Reads SM Site Registry for the subdomain, applies config_json.features
    overrides on top of platform defaults.

    Returns 404 if the subdomain is not found in SM Site Registry.
    Returns 200 with all 6 feature keys regardless of override coverage.
    Malformed config_json returns platform defaults — never a 500.
    """
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={
                "filters": json.dumps([["subdomain", "=", subdomain]]),
                "fields": '["name", "subdomain", "config_json"]',
                "limit_page_length": 1,
            },
            timeout=15,
        )
        resp.raise_for_status()
        records = resp.json().get("data", [])

    if not records:
        raise HTTPException(
            status_code=404,
            detail={"error": "site not found", "subdomain": subdomain},
        )

    site = records[0]
    features = _merge_features(site.get("config_json"))

    return {
        "subdomain": subdomain,
        "features": features,
    }
```

```python
# abstraction-layer/main.py  (MODIFY — add admin router)
"""
Mojo Abstraction Layer — FastAPI entry point.

All React frontend calls route through /api/modules/[capability]/[action].
React never calls Frappe directly (Architecture Immutable #1).

ADD the following lines to the existing main.py in the positions indicated.
The full file content is shown; lines marked NEW are the additions for FEATURE-FLAG-001.
"""

# ── existing imports (already present) ──────────────────────────────────────
# from fastapi import FastAPI
# from routes import billing   ← example; match whatever exists in your file
# ... etc.

# NEW import ─────────────────────────────────────────────────────────────────
from routes import admin  # NEW

app = FastAPI(title="Mojo Abstraction Layer")

# ── existing router registrations (already present) ─────────────────────────
# app.include_router(billing.router,         prefix="/api/modules/billing")
# app.include_router(billing.webhook_router, prefix="/api/modules/billing/webhooks")
# ... etc.

# NEW router registration ─────────────────────────────────────────────────────
app.include_router(admin.router, prefix="/api/modules/admin")  # NEW

# ---------------------------------------------------------------------------
# NOTE: Only the two lines above (import + include_router) are added to the
# existing main.py. Everything else in main.py is unchanged.
# ---------------------------------------------------------------------------
```

```python
# tests/test_admin_features.py
"""
Tests for FEATURE-FLAG-001 — GET /api/modules/admin/features/{subdomain}

Run with:  pytest tests/test_admin_features.py -v
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI

from routes.admin import router, PLATFORM_FEATURE_DEFAULTS

# ---------------------------------------------------------------------------
# Test app setup
# ---------------------------------------------------------------------------

app = FastAPI()
app.include_router(router, prefix="/api/modules/admin")
client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ALL_SIX_KEYS = set(PLATFORM_FEATURE_DEFAULTS.keys())


def _mock_frappe_list_response(records: list) -> MagicMock:
    """Build a mock httpx response that returns a Frappe list payload."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"data": records}
    mock_resp.raise_for_status = MagicMock()
    return mock_resp


def _site_record(subdomain: str, config_json: str | None = None) -> dict:
    return {
        "name": f"SM Site Registry/{subdomain}",
        "subdomain": subdomain,
        "config_json": config_json,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGetSiteFeatures:

    def test_returns_all_6_feature_keys_with_defaults_when_no_config(self):
        """
        AC-1: GET returns 200 with all 6 feature keys.
        AC-2 (inverse): When no config_json features are set, all values are
        the platform default (False).
        """
        record = _site_record("acme", config_json=None)

        with patch("routes.admin.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = _mock_frappe_list_response([record])

            response = client.get("/api/modules/admin/features/acme")

        assert response.status_code == 200
        body = response.json()
        assert body["subdomain"] == "acme"
        assert set(body["features"].keys()) == ALL_SIX_KEYS
        # All defaults are False
        for key in ALL_SIX_KEYS:
            assert body["features"][key] is False, f"{key} should default to False"

    def test_site_config_overrides_applied_correctly(self):
        """
        AC-2: config_json.features overrides supersede platform defaults.
        Enabled keys flip to True; keys not in config_json remain False.
        """
        config = json.dumps({
            "features": {
                "billing_mojo": True,
                "workboard_mojo": True,
            }
        })
        record = _site_record("willow", config_json=config)

        with patch("routes.admin.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = _mock_frappe_list_response([record])

            response = client.get("/api/modules/admin/features/willow")

        assert response.status_code == 200
        features = response.json()["features"]
        assert set(features.keys()) == ALL_SIX_KEYS
        assert features["billing_mojo"] is True
        assert features["workboard_mojo"] is True
        # Remaining keys stay False
        assert features["scheduling_mojo"] is False
        assert features["wiki_mojo"] is False
        assert features["crm_mojo"] is False
        assert features["patient_portal"] is False

    def test_unknown_feature_keys_in_config_json_are_ignored(self):
        """
        AC-3: Unknown keys in config_json.features are silently ignored.
        Response contains exactly the 6 platform keys — no extras.
        """
        config = json.dumps({
            "features": {
                "billing_mojo": True,
                "super_secret_mojo": True,    # unknown — must be ignored
                "legacy_portal": False,        # unknown — must be ignored
            }
        })
        record = _site_record("riverdale", config_json=config)

        with patch("routes.admin.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = _mock_frappe_list_response([record])

            response = client.get("/api/modules/admin/features/riverdale")

        assert response.status_code == 200
        features = response.json()["features"]
        assert set(features.keys()) == ALL_SIX_KEYS, (
            "Response must contain exactly the 6 platform keys — no unknown keys"
        )
        assert "super_secret_mojo" not in features
        assert "legacy_portal" not in features
        assert features["billing_mojo"] is True

    def test_subdomain_not_found_returns_404(self):
        """
        AC-4: Unknown subdomain returns 404 with error body.
        """
        with patch("routes.admin.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = _mock_frappe_list_response([])  # no records

            response = client.get("/api/modules/admin/features/doesnotexist")

        assert response.status_code == 404
        body = response.json()
        # FastAPI wraps HTTPException detail under "detail"
        detail = body.get("detail", body)
        assert detail.get("error") == "site not found"
        assert detail.get("subdomain") == "doesnotexist"

    def test_malformed_features_config_json_returns_defaults(self):
        """
        AC-5: Malformed config_json does not cause a 500.
        Returns 200 with all platform defaults.
        """
        record = _site_record("broken", config_json="THIS IS NOT JSON {{{")

        with patch("routes.admin.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client_cls.return_value.__aenter__.return_value = mock_client
            mock_client.get.return_value = _mock_frappe_list_response([record])

            response = client.get("/api/modules/admin/features/broken")

        assert response.status_code == 200
        features = response.json()["features"]
        assert set(features.keys()) == ALL_SIX_KEYS
        for key in ALL_SIX_KEYS:
            assert features[key] is False, (
                f"Malformed config_json must fall back to platform default (False) for {key}"
            )
```

---

**Files produced:**

| File | Action | Story requirement |
|---|---|---|
| `abstraction-layer/routes/admin.py` | **CREATE** | New route file |
| `abstraction-layer/main.py` | **MODIFY** | Two lines added: `from routes import admin` + `app.include_router(...)` |
| `tests/test_admin_features.py` | **CREATE** | All 5 required tests |

**AC coverage:**

| AC | Covered by |
|---|---|
| 1 — 200 with all 6 keys | `test_returns_all_6_feature_keys_with_defaults_when_no_config` |
| 2 — config overrides supersede defaults | `test_site_config_overrides_applied_correctly` |
| 3 — unknown keys silently ignored | `test_unknown_feature_keys_in_config_json_are_ignored` |
| 4 — unknown subdomain → 404 | `test_subdomain_not_found_returns_404` |
| 5 — malformed config\_json → defaults, no 500 | `test_malformed_features_config_json_returns_defaults` |
| 6 — all 5 tests pass | covered above |
| 7 — same patterns as existing MAL endpoints | `_frappe_headers()`, `httpx.AsyncClient`, `APIRouter`, env vars — identical to `billing.py` |