model: model-zeta
test: 04-frappe-implementation
run: A
date: 2026-04-09

abstraction-layer/routes/desktop.py (create)


"""
Desktop module routes — Vocabulary resolution and site configuration.

CRM-VOCAB-001: Resolves site-specific vocabulary mappings for React UI labels.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse

logger = logging.getLogger("abstraction-layer.desktop")

router = APIRouter(tags=["desktop"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

# Platform default vocabulary (18 concept keys per spec)
PLATFORM_DEFAULTS = {
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


def _frappe_headers():
    """Generate Frappe API authorization headers."""
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


async def _get_site_registry(site_name: str) -> Optional[dict]:
    """Fetch SM Site Registry by site_name. Returns None if not found."""
    filters = json.dumps([["site_name", "=", site_name]])
    fields = '["name","site_name","config_json"]'
    
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={"filters": filters, "fields": fields, "limit_page_length": 1},
            timeout=15,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json().get("data", [])
        return data[0] if data else None


@router.get("/vocabulary")
async def get_vocabulary(x_frappe_site_name: Optional[str] = Header(None)):
    """
    GET /api/modules/desktop/vocabulary
    
    Returns resolved vocabulary dictionary using cascade:
    platform defaults -> client overrides in config_json.vocabulary
    
    Header: X-Frappe-Site-Name
    """
    if not x_frappe_site_name:
        return JSONResponse(
            status_code=400,
            content={"error": "site_name header missing"}
        )
    
    registry = await _get_site_registry(x_frappe_site_name)
    if not registry:
        return JSONResponse(
            status_code=404,
            content={"error": "site not found", "site": x_frappe_site_name}
        )
    
    # Tier 1: Platform defaults
    vocabulary = PLATFORM_DEFAULTS.copy()
    
    # Tier 3: Client overrides from SM Site Registry config_json
    # (Tier 2 vertical YAML skipped per spec; Tier 4 user tier not applicable)
    config_json = registry.get("config_json")
    if config_json:
        try:
            config = json.loads(config_json)
            if isinstance(config, dict):
                client_vocab = config.get("vocabulary")
                if isinstance(client_vocab, dict):
                    vocabulary.update(client_vocab)
        except json.JSONDecodeError:
            # Malformed config_json: log and return defaults (do not crash)
            logger.warning(
                "Malformed config_json for site %s, returning platform defaults",
                x_frappe_site_name,
            )
    
    return {"vocabulary": vocabulary}
abstraction-layer/main.py (modify — register new router)


"""
Spark Mojo Abstraction Layer — Main FastAPI Application.
"""

from fastapi import FastAPI

# Capability routers
from routes.billing import router as billing_router
from routes.desktop import router as desktop_router

app = FastAPI(title="Spark Mojo Abstraction Layer")

# Billing capability (DECISION-027, BILL-005)
app.include_router(billing_router, prefix="/api/modules/billing")

# Desktop/CRM capability (CRM-VOCAB-001)
app.include_router(desktop_router, prefix="/api/modules/desktop")
tests/test_vocabulary.py (create)


"""
Tests for CRM-VOCAB-001: Vocabulary resolution endpoint.
"""

import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

# All 18 platform default keys per spec
EXPECTED_DEFAULTS = {
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


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Ensure Frappe env vars are set."""
    monkeypatch.setenv("FRAPPE_URL", "http://test-frappe")
    monkeypatch.setenv("FRAPPE_API_KEY", "test-key")
    monkeypatch.setenv("FRAPPE_API_SECRET", "test-secret")


def test_vocabulary_missing_site_header_returns_400():
    """Missing X-Frappe-Site-Name header returns 400."""
    response = client.get("/api/modules/desktop/vocabulary")
    assert response.status_code == 400
    assert response.json() == {"error": "site_name header missing"}


def test_vocabulary_unknown_site_returns_404():
    """Unknown site name returns 404 with site in payload."""
    with patch("routes.desktop.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": []}  # Empty results
        mock_client.get.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        
        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "unknown-site"}
        )
    
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "site not found"
    assert data["site"] == "unknown-site"


def test_vocabulary_returns_platform_defaults_when_no_overrides():
    """Site with empty/null config_json returns all 18 platform defaults."""
    with patch("routes.desktop.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{
                "name": "REG-001",
                "site_name": "clean-site",
                "config_json": None
            }]
        }
        mock_client.get.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        
        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "clean-site"}
        )
    
    assert response.status_code == 200
    assert response.json()["vocabulary"] == EXPECTED_DEFAULTS


def test_vocabulary_applies_client_overrides():
    """Client vocabulary section in config_json supersedes platform defaults."""
    config = {
        "vocabulary": {
            "person": "Patient",
            "service_record": "Visit",
            "invoice": "Monthly Statement"
        }
    }
    
    with patch("routes.desktop.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{
                "name": "REG-002",
                "site_name": "custom-site",
                "config_json": json.dumps(config)
            }]
        }
        mock_client.get.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        
        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "custom-site"}
        )
    
    assert response.status_code == 200
    vocab = response.json()["vocabulary"]
    
    # Overrides applied
    assert vocab["person"] == "Patient"
    assert vocab["service_record"] == "Visit"
    assert vocab["invoice"] == "Monthly Statement"
    
    # Defaults preserved for non-overridden keys
    assert vocab["service_provider"] == "Clinician"
    assert vocab["task"] == "Task"
    assert len(vocab) == len(EXPECTED_DEFAULTS)


def test_vocabulary_malformed_config_json_returns_defaults():
    """Invalid JSON in config_json does not crash; returns platform defaults."""
    with patch("routes.desktop.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_cls.return_value = mock_client
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{
                "name": "REG-003",
                "site_name": "bad-json-site",
                "config_json": "{broken: json,}"
            }]
        }
        mock_client.get.return_value = mock_response
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        
        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "bad-json-site"}
        )
    
    assert response.status_code == 200
    assert response.json()["vocabulary"] == EXPECTED_DEFAULTS