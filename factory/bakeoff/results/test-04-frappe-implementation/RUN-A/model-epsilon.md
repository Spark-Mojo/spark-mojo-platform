model: model-epsilon
test: 04-frappe-implementation
run: A
date: 2026-04-09

```python
"""
Vocabulary resolution endpoint — returns resolved display labels for platform concept keys.

Cascade order (4-tier):
  1. Platform defaults (this file)
  2. Vertical template YAML  ← NOT YET IMPLEMENTED
  3. Client overrides in sm_site_registry.config_json.vocabulary
  4. User overrides           ← NOT APPLICABLE for vocabulary

Site is identified by X-Frappe-Site-Name request header.
"""

import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger("abstraction-layer.desktop")

router = APIRouter(tags=["desktop"])


# ---------------------------------------------------------------------------
# Platform defaults — behavioral health vertical baseline
# ---------------------------------------------------------------------------
PLATFORM_DEFAULTS: dict[str, str] = {
    "person": "Client",
    "service_record": "Session",
    "service_provider": "Clinician",
    "lead_inquiry": "Referral",
    "intake_process": "Intake",
    "schedule_entry": "Appointment",
    "invoice": "Patient Statement",
    "task": "Task",
    "task_board": "Workboard",
    "task_template": "Protocol",
    "workflow_state": "Status",
    "workflow_transition": "Action",
    "workflow": "Process",
    "approval_chain": "Manager Approval",
    "time_period": "Session",
    "compliance_item": "License",
    "primary_identifier": "NPI",
    "billing_trigger": "Session Completion",
}

VOCABULARY_KEYS: set[str] = set(PLATFORM_DEFAULTS.keys())


# ---------------------------------------------------------------------------
# Frappe connection helpers (mirrors billing.py patterns)
# ---------------------------------------------------------------------------

FRAPPE_URL = "http://localhost:8080"
FRAPPE_API_KEY = ""
FRAPPE_API_SECRET = ""


def _frappe_headers() -> dict:
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


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class VocabularyResponse(BaseModel):
    vocabulary: dict[str, str]


# ---------------------------------------------------------------------------
# Core resolution logic
# ---------------------------------------------------------------------------

def _resolve_vocabulary(overrides: Optional[dict[str, str]]) -> dict[str, str]:
    """
    Merge client overrides over platform defaults.

    Only keys present in PLATFORM_DEFAULTS are accepted as overrides.
    Unknown keys are silently ignored to prevent config drift.
    """
    result = PLATFORM_DEFAULTS.copy()
    if overrides:
        for key, value in overrides.items():
            if key in VOCABULARY_KEYS and value:
                result[key] = value
    return result


def _extract_vocabulary_from_config(config_json: Optional[str]) -> Optional[dict[str, str]]:
    """
    Parse config_json string and return the 'vocabulary' sub-dict, or None if absent.
    Returns None (NOT an exception) for malformed JSON so callers can fall back to defaults.
    """
    if not config_json:
        return None
    try:
        parsed = json.loads(config_json)
        if isinstance(parsed, dict):
            vocab = parsed.get("vocabulary")
            if isinstance(vocab, dict):
                return vocab
    except (json.JSONDecodeError, TypeError):
        # Malformed JSON — caller must treat as missing and return defaults
        logger.warning("Malformed config_json, returning defaults for vocabulary")
        return None
    return None


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/api/modules/desktop/vocabulary", response_model=VocabularyResponse)
async def get_vocabulary(request: Request):
    """
    Resolve vocabulary dictionary for the requesting site.

    Reads X-Frappe-Site-Name header to identify the site, looks up
    sm_site_registry in Frappe, parses config_json.vocabulary, and merges
    client overrides over platform defaults.

    Response codes:
      200 — vocabulary resolved successfully
      400 — X-Frappe-Site-Name header missing
      404 — site not found in sm_site_registry
    """
    # 1. Extract site name from header
    site_name = request.headers.get("X-Frappe-Site-Name")
    if not site_name:
        raise HTTPException(status_code=400, detail="site_name header missing")

    # 2. Look up sm_site_registry
    try:
        site_doc = await _read_frappe_doc("sm_site_registry", site_name)
    except HTTPException:
        # Propagate 404 with structured error
        raise HTTPException(
            status_code=404,
            detail={"error": "site not found", "site": site_name},
        )

    # 3. Parse config_json for vocabulary overrides
    config_json_raw = site_doc.get("config_json")
    client_overrides = _extract_vocabulary_from_config(config_json_raw)

    # 4. Resolve and return
    resolved = _resolve_vocabulary(client_overrides)
    return VocabularyResponse(vocabulary=resolved)
```
```python
"""
Tests for vocabulary resolution endpoint (CRM-VOCAB-001).
Run with: pytest tests/test_vocabulary.py -v
"""

import json

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from routes.desktop import (
    PLATFORM_DEFAULTS,
    _resolve_vocabulary,
    _extract_vocabulary_from_config,
)


# ---------------------------------------------------------------------------
# Unit tests — pure functions
# ---------------------------------------------------------------------------

class TestResolveVocabulary:
    def test_returns_platform_defaults_when_no_overrides(self):
        result = _resolve_vocabulary(None)
        assert result == PLATFORM_DEFAULTS
        assert len(result) == 18
        assert result["person"] == "Client"
        assert result["invoice"] == "Patient Statement"

    def test_returns_platform_defaults_when_overrides_is_empty_dict(self):
        result = _resolve_vocabulary({})
        assert result == PLATFORM_DEFAULTS

    def test_applies_client_overrides(self):
        overrides = {
            "person": "Patient",
            "invoice": "Statement",
            "task": "To-Do",
        }
        result = _resolve_vocabulary(overrides)
        assert result["person"] == "Patient"
        assert result["invoice"] == "Statement"
        assert result["task"] == "To-Do"
        # Unchanged keys remain at platform default
        assert result["service_record"] == "Session"
        assert result["workflow_state"] == "Status"

    def test_unknown_override_keys_are_ignored(self):
        overrides = {
            "person": "Patient",
            "made_up_key": "ignored value",
            "another_fake": "also ignored",
        }
        result = _resolve_vocabulary(overrides)
        assert result["person"] == "Patient"
        assert "made_up_key" not in result
        assert "another_fake" not in result

    def test_empty_string_override_is_ignored(self):
        overrides = {"person": ""}
        result = _resolve_vocabulary(overrides)
        assert result["person"] == "Client"  # platform default preserved

    def test_none_value_override_is_ignored(self):
        overrides = {"person": None}
        result = _resolve_vocabulary(overrides)
        assert result["person"] == "Client"

    def test_partial_override_only_affects_specified_keys(self):
        overrides = {"primary_identifier": "MRN"}
        result = _resolve_vocabulary(overrides)
        assert result["primary_identifier"] == "MRN"
        # All other 17 keys unchanged
        assert result["person"] == "Client"
        assert result["service_record"] == "Session"
        assert result["service_provider"] == "Clinician"
        assert result["lead_inquiry"] == "Referral"
        assert result["intake_process"] == "Intake"
        assert result["schedule_entry"] == "Appointment"
        assert result["invoice"] == "Patient Statement"
        assert result["task"] == "Task"
        assert result["task_board"] == "Workboard"
        assert result["task_template"] == "Protocol"
        assert result["workflow_state"] == "Status"
        assert result["workflow_transition"] == "Action"
        assert result["workflow"] == "Process"
        assert result["approval_chain"] == "Manager Approval"
        assert result["time_period"] == "Session"
        assert result["compliance_item"] == "License"
        assert result["billing_trigger"] == "Session Completion"


class TestExtractVocabularyFromConfig:
    def test_returns_vocabulary_dict_from_valid_config(self):
        config = json.dumps({"vocabulary": {"person": "Patient"}})
        result = _extract_vocabulary_from_config(config)
        assert result == {"person": "Patient"}

    def test_returns_none_when_config_json_is_none(self):
        result = _extract_vocabulary_from_config(None)
        assert result is None

    def test_returns_none_when_config_json_is_empty_string(self):
        result = _extract_vocabulary_from_config("")
        assert result is None

    def test_returns_none_when_vocabulary_key_absent(self):
        config = json.dumps({"other_key": "value"})
        result = _extract_vocabulary_from_config(config)
        assert result is None

    def test_returns_none_when_vocabulary_is_not_a_dict(self):
        config = json.dumps({"vocabulary": ["not", "a", "dict"]})
        result = _extract_vocabulary_from_config(config)
        assert result is None

    def test_returns_none_for_malformed_json(self):
        result = _extract_vocabulary_from_config("{ not valid json }")
        assert result is None

    def test_returns_none_for_empty_json_object(self):
        result = _extract_vocabulary_from_config("{}")
        assert result is None


# ---------------------------------------------------------------------------
# Integration tests — FastAPI endpoint with mocked Frappe calls
# ---------------------------------------------------------------------------

import sys
from pathlib import Path

# Add abstraction-layer root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from routes.desktop import router as desktop_router


def _build_app():
    app = FastAPI()
    app.include_router(desktop_router)
    return app


class TestVocabularyEndpoint:

    def test_vocabulary_returns_platform_defaults_when_no_overrides(self):
        """
        Site with empty config_json returns platform defaults for all 18 keys.
        """
        app = _build_app()
        client = TestClient(app)

        site_doc = {"name": "test-site", "config_json": ""}

        with patch("routes.desktop._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = site_doc

            response = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "test-site"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "vocabulary" in data
        assert data["vocabulary"] == PLATFORM_DEFAULTS
        assert len(data["vocabulary"]) == 18

    def test_vocabulary_applies_client_overrides(self):
        """
        Site with vocabulary overrides in config_json returns merged result.
        """
        app = _build_app()
        client = TestClient(app)

        overrides = {
            "person": "Patient",
            "service_record": "Encounter",
            "invoice": "Bill",
        }
        site_doc = {"name": "willow", "config_json": json.dumps({"vocabulary": overrides})}

        with patch("routes.desktop._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = site_doc

            response = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "willow"},
            )

        assert response.status_code == 200
        data = response.json()
        # Check overridden keys
        assert data["vocabulary"]["person"] == "Patient"
        assert data["vocabulary"]["service_record"] == "Encounter"
        assert data["vocabulary"]["invoice"] == "Bill"
        # Check that unchanged keys are still at platform default
        assert data["vocabulary"]["service_provider"] == "Clinician"
        assert data["vocabulary"]["workflow_state"] == "Status"
        assert data["vocabulary"]["billing_trigger"] == "Session Completion"
        # Verify total key count unchanged
        assert len(data["vocabulary"]) == 18

    def test_vocabulary_missing_site_header_returns_400(self):
        """
        Missing X-Frappe-Site-Name header returns 400 with error detail.
        """
        app = _build_app()
        client = TestClient(app)

        response = client.get("/api/modules/desktop/vocabulary")

        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "site_name header missing"

    def test_vocabulary_unknown_site_returns_404(self):
        """
        Unknown site name returns 404 with structured error including site name.
        """
        app = _build_app()
        client = TestClient(app)

        from fastapi import HTTPException

        async def raise_404(*args, **kwargs):
            raise HTTPException(status_code=404, detail="sm_site_registry 'unknown-site' not found")

        with patch("routes.desktop._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.side_effect = raise_404

            response = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "unknown-site"},
            )

        assert response.status_code == 404
        data = response.json()
        assert data["detail"]["error"] == "site not found"
        assert data["detail"]["site"] == "unknown-site"

    def test_vocabulary_malformed_config_json_returns_defaults(self):
        """
        Site with invalid JSON in config_json does not crash; returns platform defaults.
        """
        app = _build_app()
        client = TestClient(app)

        site_doc = {"name": "broken-site", "config_json": "{ this is not valid JSON \n at all }"}

        with patch("routes.desktop._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = site_doc

            response = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "broken-site"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["vocabulary"] == PLATFORM_DEFAULTS
        assert len(data["vocabulary"]) == 18

    def test_vocabulary_config_json_missing_vocabulary_key_returns_defaults(self):
        """
        config_json is valid JSON but has no 'vocabulary' key — returns platform defaults.
        """
        app = _build_app()
        client = TestClient(app)

        site_doc = {"name": "partial-site", "config_json": json.dumps({"theme": "dark", "timezone": "UTC"})}

        with patch("routes.desktop._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = site_doc

            response = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "partial-site"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["vocabulary"] == PLATFORM_DEFAULTS

    def test_vocabulary_partial_override_preserves_unmodified_keys(self):
        """
        Override only one key; remaining 17 stay at platform defaults.
        """
        app = _build_app()
        client = TestClient(app)

        site_doc = {
            "name": "single-override",
            "config_json": json.dumps({"vocabulary": {"lead_inquiry": "Prospect"}}),
        }

        with patch("routes.desktop._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = site_doc

            response = client.get(
                "/api/modules/desktop/vocabulary",
                headers={"X-Frappe-Site-Name": "single-override"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["vocabulary"]["lead_inquiry"] == "Prospect"
        # Every other key must be at platform default
        defaults_minus_override = {k: v for k, v in PLATFORM_DEFAULTS.items() if k != "lead_inquiry"}
        for key, expected_value in defaults_minus_override.items():
            assert data["vocabulary"][key] == expected_value, f"Key '{key}' was not preserved"
```