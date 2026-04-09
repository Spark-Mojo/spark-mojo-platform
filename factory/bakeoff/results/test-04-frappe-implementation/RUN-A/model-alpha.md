model: model-alpha
test: 04-frappe-implementation
run: A
date: 2026-04-09

```python
"""
Desktop module routes — vocabulary resolution, site configuration.

Handles vocabulary resolution for the React frontend (CRM-VOCAB-001).
Provides the 18-key vocabulary dictionary after applying the 4-tier cascade:
platform defaults -> vertical template YAML (not yet implemented) -> client overrides -> user tier (not applicable).
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("abstraction-layer.desktop")

router = APIRouter(tags=["desktop"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

# ---------------------------------------------------------------------------
# Platform defaults for the 18 vocabulary keys
# ---------------------------------------------------------------------------

PLATFORM_VOCABULARY_DEFAULTS = {
    "person": "Person",
    "service_record": "Service Record",
    "service_provider": "Service Provider",
    "lead_inquiry": "Lead",
    "intake_process": "Intake",
    "schedule_entry": "Appointment",
    "invoice": "Invoice",
    "task": "Task",
    "task_board": "Board",
    "task_template": "Template",
    "workflow_state": "Status",
    "workflow_transition": "Action",
    "workflow": "Workflow",
    "approval_chain": "Approval",
    "time_period": "Period",
    "compliance_item": "Compliance",
    "primary_identifier": "ID",
    "billing_trigger": "Billing Trigger",
}


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Vocabulary resolution endpoint
# ---------------------------------------------------------------------------

@router.get("/api/modules/desktop/vocabulary")
async def get_vocabulary(request: Request):
    """
    Resolve vocabulary for the current site.

    Applies 4-tier cascade:
    1. Platform defaults
    2. Vertical template YAML (not yet implemented)
    3. Client overrides in config_json
    4. User tier (not applicable for vocabulary)

    The site name comes from the X-Frappe-Site-Name header.
    Client overrides are read from the config_json.vocabulary field
    of the SM Site Registry DocType.
    """
    # 1. Get site name from header
    site_name = request.headers.get("X-Frappe-Site-Name")
    if not site_name:
        return JSONResponse(
            status_code=400,
            content={"error": "site_name header missing"},
        )

    # 2. Look up site in SM Site Registry
    try:
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
            sites = resp.json().get("data", [])
    except Exception as exc:
        logger.error("Failed to look up site %s: %s", site_name, exc)
        sites = []

    if not sites:
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "site": site_name},
        )

    # 3. Parse config_json for vocabulary overrides
    config_json_str = sites[0].get("config_json", "")
    overrides = {}

    if config_json_str:
        try:
            config = json.loads(config_json_str)
            overrides = config.get("vocabulary", {}) or {}
        except (json.JSONDecodeError, TypeError):
            # Malformed config_json - use platform defaults (do not crash)
            logger.warning("Malformed config_json for site %s, using platform defaults", site_name)
            overrides = {}

    # 4. Merge: platform defaults <- client overrides
    vocabulary = {**PLATFORM_VOCABULARY_DEFAULTS, **overrides}

    return {"vocabulary": vocabulary}
```

```python
# Tests for CRM-VOCAB-001: Vocabulary resolution endpoint

import json
import os
from unittest.mock import AsyncMock, patch, MagicMock

import httpx
import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

# Import the router under test
from routes.desktop import router as desktop_router, PLATFORM_VOCABULARY_DEFAULTS


# ---------------------------------------------------------------------------
# Test app setup
# ---------------------------------------------------------------------------

@pytest.fixture
def app():
    """Create a test FastAPI app with the desktop router."""
    test_app = FastAPI()
    test_app.include_router(desktop_router)
    return test_app


@pytest.fixture
async def client(app):
    """Create an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Mock Frappe API responses
# ---------------------------------------------------------------------------

def _make_frappe_site_response(site_name, config_json=None):
    """Helper to build a mock Frappe site registry response."""
    site_data = {
        "name": f"SITE-{site_name.upper()}",
        "site_name": site_name,
        "config_json": config_json or "",
    }
    return {"data": [site_data]}


def _make_frappe_empty_response():
    """Helper for site not found."""
    return {"data": []}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_vocabulary_returns_platform_defaults_when_no_overrides(client):
    """
    Site with empty config_json returns platform defaults for all 18 keys.
    """
    with patch("routes.desktop.httpx.AsyncClient") as mock_client_class:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = _make_frappe_site_response("test-site", "")
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        response = await client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "test-site"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "vocabulary" in data
    vocabulary = data["vocabulary"]

    # Verify all 18 keys present with platform defaults
    assert len(vocabulary) == 18
    for key, expected_value in PLATFORM_VOCABULARY_DEFAULTS.items():
        assert vocabulary[key] == expected_value, f"Key '{key}' should be '{expected_value}'"


@pytest.mark.asyncio
async def test_vocabulary_applies_client_overrides(client):
    """
    Site with vocabulary overrides in config_json returns merged result.
    Client overrides supersede platform defaults.
    """
    overrides = {
        "person": "Client",
        "service_record": "Session",
        "service_provider": "Clinician",
        "lead_inquiry": "Referral",
        "invoice": "Patient Statement",
        "task_board": "Workboard",
        "task_template": "Protocol",
        "approval_chain": "Manager Approval",
        "compliance_item": "License",
        "primary_identifier": "NPI",
        "billing_trigger": "Session Completion",
    }
    config_json = json.dumps({"vocabulary": overrides})

    with patch("routes.desktop.httpx.AsyncClient") as mock_client_class:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = _make_frappe_site_response("bh-site", config_json)
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        response = await client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "bh-site"},
        )

    assert response.status_code == 200
    data = response.json()
    vocabulary = data["vocabulary"]

    # Verify overrides applied
    assert vocabulary["person"] == "Client"
    assert vocabulary["service_record"] == "Session"
    assert vocabulary["service_provider"] == "Clinician"

    # Verify non-overridden keys still have defaults
    assert vocabulary["intake_process"] == PLATFORM_VOCABULARY_DEFAULTS["intake_process"]
    assert vocabulary["schedule_entry"] == PLATFORM_VOCABULARY_DEFAULTS["schedule_entry"]


@pytest.mark.asyncio
async def test_vocabulary_missing_site_header_returns_400(client):
    """
    Missing X-Frappe-Site-Name header returns 400.
    """
    response = await client.get("/api/modules/desktop/vocabulary")

    assert response.status_code == 400
    data = response.json()
    assert data["error"] == "site_name header missing"


@pytest.mark.asyncio
async def test_vocabulary_unknown_site_returns_404(client):
    """
    Unknown site name returns 404.
    """
    with patch("routes.desktop.httpx.AsyncClient") as mock_client_class:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = _make_frappe_empty_response()
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        response = await client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "unknown-site"},
        )

    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "site not found"
    assert data["site"] == "unknown-site"


@pytest.mark.asyncio
async def test_vocabulary_malformed_config_json_returns_defaults(client):
    """
    Site with invalid JSON in config_json does not crash; returns defaults.
    """
    malformed_json = "{this is not valid json"

    with patch("routes.desktop.httpx.AsyncClient") as mock_client_class:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = _make_frappe_site_response("bad-config-site", malformed_json)
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client

        response = await client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "bad-config-site"},
        )

    assert response.status_code == 200
    data = response.json()
    vocabulary = data["vocabulary"]

    # Should return platform defaults, not crash
    assert len(vocabulary) == 18
    for key, expected_value in PLATFORM_VOCABULARY_DEFAULTS.items():
        assert vocabulary[key] == expected_value
```

```python
# Modification to: abstraction-layer/main.py
# Add the desktop router registration

# Add this import near the top with other route imports:
from routes.desktop import router as desktop_router

# Add this line where other routers are included (e.g., after billing router registration):
app.include_router(desktop_router)
```