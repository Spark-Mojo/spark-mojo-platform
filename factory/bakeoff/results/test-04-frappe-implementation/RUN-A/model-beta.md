model: model-beta
test: 04-frappe-implementation
run: A
date: 2026-04-09

# Implementation

## `abstraction-layer/routes/desktop.py`

```python
"""
Desktop capability routes — vocabulary resolution.

Serves the resolved vocabulary dictionary for the current site,
cascading platform defaults with client overrides from SM Site Registry.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("abstraction-layer.desktop")

router = APIRouter(tags=["desktop"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Platform default vocabulary
# ---------------------------------------------------------------------------

PLATFORM_DEFAULT_VOCABULARY = {
    "person": "Person",
    "service_record": "Service Record",
    "service_provider": "Service Provider",
    "lead_inquiry": "Lead Inquiry",
    "intake_process": "Intake Process",
    "schedule_entry": "Schedule Entry",
    "invoice": "Invoice",
    "task": "Task",
    "task_board": "Task Board",
    "task_template": "Task Template",
    "workflow_state": "Workflow State",
    "workflow_transition": "Workflow Transition",
    "workflow": "Workflow",
    "approval_chain": "Approval Chain",
    "time_period": "Time Period",
    "compliance_item": "Compliance Item",
    "primary_identifier": "Primary Identifier",
    "billing_trigger": "Billing Trigger",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _read_site_registry(site_name: str) -> Optional[dict]:
    """
    Read the SM Site Registry doc for the given site_name.
    Returns the doc dict, or None if not found.
    Raises HTTPException on unexpected errors.
    """
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={
                "filters": json.dumps([["site_name", "=", site_name]]),
                "fields": '["name","site_name","config_json"]',
                "limit_page_length": 1,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        if not data:
            return None
        return data[0]


def _resolve_vocabulary(config_json: Optional[str]) -> dict:
    """
    Resolve the vocabulary dictionary by merging platform defaults
    with client overrides from config_json.

    4-tier cascade (tiers 2 and 4 skipped per spec):
      1. Platform defaults
      2. Vertical template YAML (skip — not yet implemented)
      3. Client overrides from config_json.vocabulary
      4. User tier (skip — not applicable for vocabulary)

    If config_json is None, empty, or malformed, returns platform defaults.
    """
    resolved = dict(PLATFORM_DEFAULT_VOCABULARY)

    if not config_json:
        return resolved

    try:
        parsed = json.loads(config_json)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Malformed config_json encountered; returning platform defaults")
        return resolved

    if not isinstance(parsed, dict):
        return resolved

    overrides = parsed.get("vocabulary")
    if isinstance(overrides, dict):
        for key, value in overrides.items():
            if key in resolved and isinstance(value, str):
                resolved[key] = value

    return resolved


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/vocabulary")
async def get_vocabulary(request: Request):
    """
    Return the resolved vocabulary dictionary for the current site.

    The site is identified by the X-Frappe-Site-Name request header.
    Platform defaults are merged with any client overrides found in
    the SM Site Registry config_json.vocabulary section.
    """
    site_name = request.headers.get("X-Frappe-Site-Name")
    if not site_name:
        return {"error": "site_name header missing"}, 400
        # NOTE: FastAPI doesn't return tuples as status codes the way Flask does.
        # Using JSONResponse below instead for proper status code control.

    site_name = request.headers.get("X-Frappe-Site-Name")
    if not site_name:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=400,
            content={"error": "site_name header missing"},
        )

    try:
        site_doc = await _read_site_registry(site_name)
    except httpx.HTTPStatusError as exc:
        logger.error("Error reading SM Site Registry: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to read site registry")

    if site_doc is None:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "site": site_name},
        )

    config_json = site_doc.get("config_json")
    vocabulary = _resolve_vocabulary(config_json)

    return {"vocabulary": vocabulary}
```

Wait — I have a bug above. The duplicate header check and the tuple return won't work correctly in FastAPI. Let me rewrite cleanly:

## `abstraction-layer/routes/desktop.py` (corrected)

```python
"""
Desktop capability routes — vocabulary resolution.

Serves the resolved vocabulary dictionary for the current site,
cascading platform defaults with client overrides from SM Site Registry.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("abstraction-layer.desktop")

router = APIRouter(tags=["desktop"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Platform default vocabulary
# ---------------------------------------------------------------------------

PLATFORM_DEFAULT_VOCABULARY = {
    "person": "Person",
    "service_record": "Service Record",
    "service_provider": "Service Provider",
    "lead_inquiry": "Lead Inquiry",
    "intake_process": "Intake Process",
    "schedule_entry": "Schedule Entry",
    "invoice": "Invoice",
    "task": "Task",
    "task_board": "Task Board",
    "task_template": "Task Template",
    "workflow_state": "Workflow State",
    "workflow_transition": "Workflow Transition",
    "workflow": "Workflow",
    "approval_chain": "Approval Chain",
    "time_period": "Time Period",
    "compliance_item": "Compliance Item",
    "primary_identifier": "Primary Identifier",
    "billing_trigger": "Billing Trigger",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _read_site_registry(site_name: str) -> Optional[dict]:
    """
    Read the SM Site Registry doc for the given site_name.
    Returns the doc dict, or None if not found.
    """
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={
                "filters": json.dumps([["site_name", "=", site_name]]),
                "fields": '["name","site_name","config_json"]',
                "limit_page_length": 1,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        if not data:
            return None
        return data[0]


def _resolve_vocabulary(config_json: Optional[str]) -> dict:
    """
    Resolve the vocabulary dictionary by merging platform defaults
    with client overrides from config_json.

    4-tier cascade (tiers 2 and 4 skipped per spec):
      1. Platform defaults
      2. Vertical template YAML (skip — not yet implemented)
      3. Client overrides from config_json.vocabulary
      4. User tier (skip — not applicable for vocabulary)

    If config_json is None, empty, or malformed, returns platform defaults.
    """
    resolved = dict(PLATFORM_DEFAULT_VOCABULARY)

    if not config_json:
        return resolved

    try:
        parsed = json.loads(config_json)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Malformed config_json encountered; returning platform defaults")
        return resolved

    if not isinstance(parsed, dict):
        return resolved

    overrides = parsed.get("vocabulary")
    if isinstance(overrides, dict):
        for key, value in overrides.items():
            if key in resolved and isinstance(value, str):
                resolved[key] = value

    return resolved


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/vocabulary")
async def get_vocabulary(request: Request):
    """
    Return the resolved vocabulary dictionary for the current site.

    The site is identified by the X-Frappe-Site-Name request header.
    Platform defaults are merged with any client overrides found in
    the SM Site Registry config_json.vocabulary section.
    """
    site_name = request.headers.get("X-Frappe-Site-Name")
    if not site_name:
        return JSONResponse(
            status_code=400,
            content={"error": "site_name header missing"},
        )

    try:
        site_doc = await _read_site_registry(site_name)
    except httpx.HTTPStatusError as exc:
        logger.error("Error reading SM Site Registry: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"error": "Failed to read site registry"},
        )

    if site_doc is None:
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "site": site_name},
        )

    config_json = site_doc.get("config_json")
    vocabulary = _resolve_vocabulary(config_json)

    return {"vocabulary": vocabulary}
```

## `abstraction-layer/main.py` (modification)

```python
# --- EXISTING IMPORTS (do not remove) ---
# Assuming the file already has patterns like:
#   from routes.billing import router as billing_router, webhook_router as billing_webhook_router
#   app.include_router(billing_router, prefix="/api/modules/billing")
#   app.include_router(billing_webhook_router, prefix="/api/webhooks/billing")

# --- ADD THIS IMPORT alongside the existing route imports ---
from routes.desktop import router as desktop_router

# --- ADD THIS ROUTER REGISTRATION alongside the existing include_router calls ---
app.include_router(desktop_router, prefix="/api/modules/desktop")
```

## `abstraction-layer/tests/test_desktop_vocabulary.py`

```python
"""
Tests for GET /api/modules/desktop/vocabulary

Story: CRM-VOCAB-001
"""

import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, Response

from main import app

# Assumption: main.py exposes a FastAPI `app` instance with desktop_router registered.
# Tests use httpx.AsyncClient against the app directly (same pattern as billing tests).


PLATFORM_DEFAULTS = {
    "person": "Person",
    "service_record": "Service Record",
    "service_provider": "Service Provider",
    "lead_inquiry": "Lead Inquiry",
    "intake_process": "Intake Process",
    "schedule_entry": "Schedule Entry",
    "invoice": "Invoice",
    "task": "Task",
    "task_board": "Task Board",
    "task_template": "Task Template",
    "workflow_state": "Workflow State",
    "workflow_transition": "Workflow Transition",
    "workflow": "Workflow",
    "approval_chain": "Approval Chain",
    "time_period": "Time Period",
    "compliance_item": "Compliance Item",
    "primary_identifier": "Primary Identifier",
    "billing_trigger": "Billing Trigger",
}

VOCAB_URL = "/api/modules/desktop/vocabulary"


def _mock_frappe_list_response(data: list, status_code: int = 200) -> Response:
    """Build a mock httpx.Response mimicking Frappe list API."""
    return Response(
        status_code=status_code,
        json={"data": data},
        request=None,  # type: ignore[arg-type]
    )


def _site_doc(site_name: str, config_json: str = "") -> dict:
    return {
        "name": site_name,
        "site_name": site_name,
        "config_json": config_json,
    }


@pytest.mark.anyio
async def test_vocabulary_returns_platform_defaults_when_no_overrides():
    """Site with empty config_json returns platform defaults for all 18 keys."""
    mock_response = _mock_frappe_list_response([_site_doc("willow.sparkmojo.com", "")])

    with patch("routes.desktop.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_response)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        async with AsyncClient(app=app, base_url="http://test") as client:
            resp = await client.get(
                VOCAB_URL,
                headers={"X-Frappe-Site-Name": "willow.sparkmojo.com"},
            )

    assert resp.status_code == 200
    body = resp.json()
    assert "vocabulary" in body
    vocab = body["vocabulary"]
    assert len(vocab) == 18
    for key, default_label in PLATFORM_DEFAULTS.items():
        assert vocab[key] == default_label


@pytest.mark.anyio
async def test_vocabulary_applies_client_overrides():
    """Site with vocabulary overrides in config_json returns merged result."""
    overrides = {
        "vocabulary": {
            "person": "Client",
            "service_record": "Session",
            "invoice": "Patient Statement",
        }
    }
    site = _site_doc("willow.sparkmojo.com", json.dumps(overrides))
    mock_response = _mock_frappe_list_response([site])

    with patch("routes.desktop.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_response)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        async with AsyncClient(app=app, base_url="http://test") as client:
            resp = await client.get(
                VOCAB_URL,
                headers={"X-Frappe-Site-Name": "willow.sparkmojo.com"},
            )

    assert resp.status_code == 200
    vocab = resp.json()["vocabulary"]
    assert len(vocab) == 18

    # Overridden keys
    assert vocab["person"] == "Client"
    assert vocab["service_record"] == "Session"
    assert vocab["invoice"] == "Patient Statement"

    # Non-overridden keys retain platform defaults
    assert vocab["task"] == "Task"
    assert vocab["workflow"] == "Workflow"
    assert vocab["billing_trigger"] == "Billing Trigger"


@pytest.mark.anyio
async def test_vocabulary_missing_site_header_returns_400():
    """Missing X-Frappe-Site-Name header returns 400."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.get(VOCAB_URL)

    assert resp.status_code == 400
    body = resp.json()
    assert body["error"] == "site_name header missing"


@pytest.mark.anyio
async def test_vocabulary_unknown_site_returns_404():
    """Unknown site name returns 404 with site name in response."""
    mock_response = _mock_frappe_list_response([])  # No results

    with patch("routes.desktop.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_response)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        async with AsyncClient(app=app, base_url="http://test") as client:
            resp = await client.get(
                VOCAB_URL,
                headers={"X-Frappe-Site-Name": "nonexistent.sparkmojo.com"},
            )

    assert resp.status_code == 404
    body = resp.json()
    assert body["error"] == "site not found"
    assert body["site"] == "nonexistent.sparkmojo.com"


@pytest.mark.anyio
async def test_vocabulary_malformed_config_json_returns_defaults():
    """Site with invalid JSON in config_json does not crash; returns defaults."""
    site = _site_doc("willow.sparkmojo.com", "this is not valid json {{{")
    mock_response = _mock_frappe_list_response([site])

    with patch("routes.desktop.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_response)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        async with AsyncClient(app=app, base_url="http://test") as client:
            resp = await client.get(
                VOCAB_URL,
                headers={"X-Frappe-Site-Name": "willow.sparkmojo.com"},
            )

    assert resp.status_code == 200
    vocab = resp.json()["vocabulary"]
    assert len(vocab) == 18
    # All values should be platform defaults
    for key, default_label in PLATFORM_DEFAULTS.items():
        assert vocab[key] == default_label
```