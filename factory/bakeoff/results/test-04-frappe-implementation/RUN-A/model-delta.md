model: model-delta
test: 04-frappe-implementation
run: A
date: 2026-04-09

```python
# abstraction-layer/routes/desktop.py
"""
Desktop module routes — site configuration, vocabulary resolution.

Implements the vocabulary resolution endpoint for the React frontend's
useSiteConfig hook. Reads the SM Site Registry config_json for the
requesting site and merges client overrides over platform defaults.

4-tier cascade (ARCH: platform defaults -> vertical template -> client overrides -> user tier):
  Tier 1: Platform defaults (this file)
  Tier 2: Vertical template YAML — SKIPPED: not yet implemented
  Tier 3: Client overrides in sm_site_registry.config_json["vocabulary"]
  Tier 4: User tier — SKIPPED: not applicable for vocabulary

Architecture: follows the same import and routing pattern as billing.py.
Site name comes from the X-Frappe-Site-Name request header (Architecture Immutable #1 —
React never calls Frappe directly; all calls go through the MAL).
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger("abstraction-layer.desktop")

router = APIRouter(tags=["desktop"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")


def _frappe_headers() -> dict:
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Platform defaults — Tier 1 of the 4-tier cascade.
# All 18 canonical platform concept keys with their generic default labels.
# These are deliberately neutral so they read sensibly across all verticals
# before any vertical template or client override is applied.
# ---------------------------------------------------------------------------

PLATFORM_VOCABULARY_DEFAULTS: dict[str, str] = {
    "person": "Person",
    "service_record": "Service Record",
    "service_provider": "Provider",
    "lead_inquiry": "Inquiry",
    "intake_process": "Intake",
    "schedule_entry": "Appointment",
    "invoice": "Invoice",
    "task": "Task",
    "task_board": "Board",
    "task_template": "Template",
    "workflow_state": "Status",
    "workflow_transition": "Transition",
    "workflow": "Workflow",
    "approval_chain": "Approval Chain",
    "time_period": "Period",
    "compliance_item": "Compliance Item",
    "primary_identifier": "Identifier",
    "billing_trigger": "Billing Trigger",
}


async def _fetch_site_config_json(site_name: str) -> Optional[str]:
    """
    Read config_json from SM Site Registry for the given site_name.

    Returns the raw config_json string (may be empty, None, or malformed JSON),
    or raises HTTPException 404 if the site record does not exist.

    NOTE: SM Site Registry is a DocType in the sm_widgets Frappe app.
    The Frappe document name IS the site_name (e.g., "willow.sparkmojo.com").
    """
    url = f"/api/resource/SM Site Registry/{site_name}"
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        try:
            resp = await client.get(url, timeout=15)
        except httpx.RequestError as exc:
            logger.error("Network error fetching site registry for %s: %s", site_name, exc)
            raise HTTPException(status_code=503, detail="Cannot reach Frappe backend")

        if resp.status_code == 404:
            return None  # Caller converts to 404 response

        resp.raise_for_status()
        data = resp.json().get("data", {})
        return data.get("config_json")  # Long Text field; may be None or ""


def _resolve_vocabulary(config_json_raw: Optional[str]) -> dict[str, str]:
    """
    Merge platform defaults with client overrides from config_json.

    Cascade:
      1. Start with a copy of PLATFORM_VOCABULARY_DEFAULTS (all 18 keys guaranteed).
      2. Tier 2 (vertical template YAML) — skipped; not yet implemented.
      3. Overlay client overrides from config_json["vocabulary"] if present and valid JSON.
      4. Tier 4 (user tier) — not applicable for vocabulary; skipped.

    Malformed config_json: logged at WARNING, defaults returned — never raises.
    Unknown keys in the override dict are ignored (only the 18 platform keys are output).
    """
    vocab = dict(PLATFORM_VOCABULARY_DEFAULTS)

    if not config_json_raw or not config_json_raw.strip():
        return vocab

    try:
        config = json.loads(config_json_raw)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Malformed config_json — ignoring overrides: %s", exc)
        return vocab

    overrides = config.get("vocabulary", {})
    if not isinstance(overrides, dict):
        logger.warning(
            "config_json.vocabulary is not a dict (got %s) — ignoring overrides",
            type(overrides).__name__,
        )
        return vocab

    for key in PLATFORM_VOCABULARY_DEFAULTS:
        if key in overrides and isinstance(overrides[key], str):
            vocab[key] = overrides[key]
        # Non-string override values are silently ignored; platform default is kept.

    return vocab


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/vocabulary")
async def get_vocabulary(
    x_frappe_site_name: Optional[str] = Header(default=None, alias="X-Frappe-Site-Name"),
):
    """
    GET /api/modules/desktop/vocabulary

    Returns the resolved vocabulary dictionary for the requesting site.
    Called by the React frontend on app load via useSiteConfig hook.

    Header required: X-Frappe-Site-Name: {site_name}

    Responses:
      200  {"vocabulary": { ...18 keys... }}
      400  {"error": "site_name header missing"}
      404  {"error": "site not found", "site": "{site_name}"}
    """
    if not x_frappe_site_name or not x_frappe_site_name.strip():
        return JSONResponse(status_code=400, content={"error": "site_name header missing"})

    site_name = x_frappe_site_name.strip()

    config_json_raw = await _fetch_site_config_json(site_name)

    if config_json_raw is None:
        # _fetch_site_config_json returns None only on a Frappe 404
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "site": site_name},
        )

    vocab = _resolve_vocabulary(config_json_raw)
    return {"vocabulary": vocab}
```

```python
# abstraction-layer/main.py  (modifications only — additions shown as diff comments)

# ------------------------------------------------------------------
# EXISTING FILE — only the changes required by CRM-VOCAB-001 are shown.
# Add the following import alongside the existing billing router import:
#
#   from routes.desktop import router as desktop_router
#
# Then register the router alongside the existing billing router
# registration:
#
#   app.include_router(desktop_router, prefix="/api/modules/desktop")
#
# No other changes to main.py are required.
# ------------------------------------------------------------------

# Example of the complete relevant block after modification:
#
#   from routes.billing import router as billing_router
#   from routes.billing import webhook_router as billing_webhook_router
#   from routes.desktop import router as desktop_router          # <-- ADD
#
#   app.include_router(billing_router, prefix="/api/modules/billing")
#   app.include_router(billing_webhook_router, prefix="/api/webhooks/billing")
#   app.include_router(desktop_router, prefix="/api/modules/desktop")  # <-- ADD
```

---

```python
# abstraction-layer/tests/test_desktop_vocabulary.py
"""
Tests for GET /api/modules/desktop/vocabulary  (CRM-VOCAB-001).

Coverage:
  test_vocabulary_returns_platform_defaults_when_no_overrides
  test_vocabulary_applies_client_overrides
  test_vocabulary_missing_site_header_returns_400
  test_vocabulary_unknown_site_returns_404
  test_vocabulary_malformed_config_json_returns_defaults

Run with:  pytest abstraction-layer/tests/test_desktop_vocabulary.py -v
"""

import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# App bootstrap — mirrors what main.py does for this router.
# We build a minimal FastAPI app so the test is self-contained and does not
# depend on main.py having been modified yet.
# ---------------------------------------------------------------------------
from fastapi import FastAPI
from routes.desktop import router as desktop_router, PLATFORM_VOCABULARY_DEFAULTS

_app = FastAPI()
_app.include_router(desktop_router, prefix="/api/modules/desktop")

client = TestClient(_app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EXPECTED_KEYS = set(PLATFORM_VOCABULARY_DEFAULTS.keys())

# A well-formed Frappe GET /api/resource/SM Site Registry/{name} response
# with an empty config_json.
def _frappe_site_response(config_json_value=None) -> dict:
    return {"data": {"name": "test.sparkmojo.com", "config_json": config_json_value}}


def _mock_frappe_get(status_code: int, json_body: dict):
    """Return an AsyncMock that simulates an httpx response."""
    mock_resp = AsyncMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = json_body
    mock_resp.raise_for_status = AsyncMock(
        side_effect=None if status_code < 400 else Exception(f"HTTP {status_code}")
    )
    return mock_resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestVocabularyPlatformDefaults:
    """AC-1: 200 with all 18 keys. AC-2 baseline (no overrides = all defaults)."""

    def test_vocabulary_returns_platform_defaults_when_no_overrides(self):
        """
        A site whose config_json is empty/null returns platform defaults for
        all 18 keys. No key is missing; no extra keys are present.
        """
        mock_response = _frappe_site_response(config_json_value=None)

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "test.sparkmojo.com"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert "vocabulary" in body
        returned_vocab = body["vocabulary"]

        # All 18 platform keys must be present
        assert set(returned_vocab.keys()) == EXPECTED_KEYS

        # Values must exactly match platform defaults (no overrides applied)
        for key, default_label in PLATFORM_VOCABULARY_DEFAULTS.items():
            assert returned_vocab[key] == default_label, (
                f"Key '{key}': expected default '{default_label}', got '{returned_vocab[key]}'"
            )

    def test_vocabulary_returns_all_18_keys_with_empty_string_config_json(self):
        """
        Empty string config_json (not null) also produces defaults without crashing.
        This tests the `not config_json_raw.strip()` guard.
        """
        mock_response = _frappe_site_response(config_json_value="")

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "test.sparkmojo.com"},
            )

        assert resp.status_code == 200
        assert set(resp.json()["vocabulary"].keys()) == EXPECTED_KEYS


class TestVocabularyClientOverrides:
    """AC-2: Client overrides in config_json.vocabulary supersede platform defaults."""

    def test_vocabulary_applies_client_overrides(self):
        """
        A site with vocabulary overrides in config_json returns a merged result:
        - Overridden keys use the client label.
        - Non-overridden keys use the platform default.
        - All 18 keys are always present.
        """
        overrides = {
            "person": "Client",
            "service_record": "Session",
            "service_provider": "Clinician",
            "lead_inquiry": "Referral",
            "invoice": "Patient Statement",
            "primary_identifier": "NPI",
            "billing_trigger": "Session Completion",
        }
        config_json = json.dumps({"vocabulary": overrides})
        mock_response = _frappe_site_response(config_json_value=config_json)

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "willow.sparkmojo.com"},
            )

        assert resp.status_code == 200
        vocab = resp.json()["vocabulary"]

        # All 18 keys present
        assert set(vocab.keys()) == EXPECTED_KEYS

        # Overridden keys use client label
        for key, client_label in overrides.items():
            assert vocab[key] == client_label, (
                f"Key '{key}': expected client override '{client_label}', got '{vocab[key]}'"
            )

        # Non-overridden keys still use platform default
        non_overridden = EXPECTED_KEYS - set(overrides.keys())
        for key in non_overridden:
            assert vocab[key] == PLATFORM_VOCABULARY_DEFAULTS[key], (
                f"Non-overridden key '{key}' should be platform default "
                f"'{PLATFORM_VOCABULARY_DEFAULTS[key]}', got '{vocab[key]}'"
            )

    def test_vocabulary_full_override_set(self):
        """All 18 keys overridden — every key uses client label."""
        full_overrides = {k: f"Custom_{k}" for k in PLATFORM_VOCABULARY_DEFAULTS}
        config_json = json.dumps({"vocabulary": full_overrides})
        mock_response = _frappe_site_response(config_json_value=config_json)

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "test.sparkmojo.com"},
            )

        assert resp.status_code == 200
        vocab = resp.json()["vocabulary"]
        for key in PLATFORM_VOCABULARY_DEFAULTS:
            assert vocab[key] == f"Custom_{key}"

    def test_vocabulary_unknown_override_keys_are_ignored(self):
        """
        Keys in config_json.vocabulary that are NOT one of the 18 platform keys
        do not appear in the output (no key injection).
        """
        config_json = json.dumps({"vocabulary": {"person": "Client", "not_a_real_key": "Hacked"}})
        mock_response = _frappe_site_response(config_json_value=config_json)

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "test.sparkmojo.com"},
            )

        assert resp.status_code == 200
        vocab = resp.json()["vocabulary"]
        assert set(vocab.keys()) == EXPECTED_KEYS
        assert "not_a_real_key" not in vocab
        assert vocab["person"] == "Client"


class TestVocabularyMissingSiteHeader:
    """AC-3: Missing site header returns 400."""

    def test_vocabulary_missing_site_header_returns_400(self):
        """No X-Frappe-Site-Name header → 400 with error message."""
        resp = client.get("/api/modules/desktop/vocabulary")

        assert resp.status_code == 400
        assert resp.json() == {"error": "site_name header missing"}

    def test_vocabulary_empty_site_header_returns_400(self):
        """
        X-Frappe-Site-Name present but empty/whitespace → 400.
        Guards against   headers={"X-Frappe-Site-Name": "   "}
        """
        resp = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "   "},
        )

        assert resp.status_code == 400
        assert resp.json() == {"error": "site_name header missing"}


class TestVocabularyUnknownSite:
    """AC-4: Unknown site name returns 404."""

    def test_vocabulary_unknown_site_returns_404(self):
        """Frappe returns 404 for the site → MAL returns 404 with site echoed."""
        site_name = "ghost.sparkmojo.com"

        # Frappe 404 response (SM Site Registry doc not found)
        frappe_404 = AsyncMock()
        frappe_404.status_code = 404
        frappe_404.json.return_value = {"exc": "DoesNotExistError"}
        frappe_404.raise_for_status = AsyncMock(side_effect=None)

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=frappe_404)
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": site_name},
            )

        assert resp.status_code == 404
        body = resp.json()
        assert body["error"] == "site not found"
        assert body["site"] == site_name


class TestVocabularyMalformedConfigJson:
    """AC-5: Malformed config_json does not cause a 500; returns platform defaults."""

    def test_vocabulary_malformed_config_json_returns_defaults(self):
        """
        SM Site Registry exists but config_json is not valid JSON.
        Must return 200 with platform defaults — no 500.
        """
        mock_response = _frappe_site_response(config_json_value="{this is: not valid JSON!!!")

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "broken.sparkmojo.com"},
            )

        assert resp.status_code == 200
        vocab = resp.json()["vocabulary"]

        # All 18 platform defaults — nothing from malformed JSON
        assert set(vocab.keys()) == EXPECTED_KEYS
        for key, default_label in PLATFORM_VOCABULARY_DEFAULTS.items():
            assert vocab[key] == default_label

    def test_vocabulary_config_json_with_non_dict_vocabulary_returns_defaults(self):
        """
        config_json is valid JSON but vocabulary key is a list, not a dict.
        Must return defaults without crashing.
        """
        config_json = json.dumps({"vocabulary": ["person", "Client"]})
        mock_response = _frappe_site_response(config_json_value=config_json)

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "test.sparkmojo.com"},
            )

        assert resp.status_code == 200
        vocab = resp.json()["vocabulary"]
        assert set(vocab.keys()) == EXPECTED_KEYS
        for key, default_label in PLATFORM_VOCABULARY_DEFAULTS.items():
            assert vocab[key] == default_label

    def test_vocabulary_config_json_no_vocabulary_section_returns_defaults(self):
        """
        config_json is valid JSON but has no "vocabulary" key.
        All platform defaults are returned.
        """
        config_json = json.dumps({"some_other_section": {"foo": "bar"}})
        mock_response = _frappe_site_response(config_json_value=config_json)

        with patch("routes.desktop.httpx.AsyncClient") as mock_client_cls:
            mock_ctx = AsyncMock()
            mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
            mock_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_ctx.get = AsyncMock(return_value=_mock_frappe_get(200, mock_response))
            mock_client_cls.return_value = mock_ctx

            resp = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "test.sparkmojo.com"},
            )

        assert resp.status_code == 200
        vocab = resp.json()["vocabulary"]
        assert set(vocab.keys()) == EXPECTED_KEYS
        for key, default_label in PLATFORM_VOCABULARY_DEFAULTS.items():
            assert vocab[key] == default_label
```

---

**Assumptions documented:**

1. **SM Site Registry document name = site name.** The Frappe URL becomes `/api/resource/SM Site Registry/{site_name}`. This is the most natural Frappe pattern for a per-site registry keyed by site name. If the DocType uses a separate `site_name` field rather than the document name as the key, `_fetch_site_config_json` needs a `filters` list query instead of a direct GET — flagged here but not blocked.

2. **`_fetch_site_config_json` returns `None` only on HTTP 404.** A null/missing `config_json` field on an *existing* record returns an empty string or `None` from `data.get("config_json")`, which the resolver treats as "no overrides." These two cases (`None` from a 404 vs. `None` from a missing field) are disambiguated by the `_fetch_site_config_json` contract: the function only returns `None` on a 404; for a found-but-empty record it returns `""` or the field value.

3. **Platform default labels are neutral/generic**, not behavioral-health-specific. The spec example shows BH labels; the spec also says "actual values depend on site config." Defaults are the fallback when no site has been configured, so they must work for *any* vertical — hence labels like `"Person"`, `"Invoice"`, `"Workflow"` rather than `"Client"`, `"Patient Statement"`, `"Process"`.

4. **Non-string override values are silently ignored** (e.g., `{"person": 42}`). The platform default for that key is preserved. This is the safest behaviour for a display-label field.

5. **`main.py` snippet is shown as a comment block** because the full `main.py` was not provided in the prompt. The comment is unambiguous about exactly what to add and where.