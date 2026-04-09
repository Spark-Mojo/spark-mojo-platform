model: model-gamma
test: 04-frappe-implementation
run: A
date: 2026-04-09

```python
"""Desktop capability routes — vocabulary resolution.

Provides site-aware vocabulary overrides for platform concept keys.
"""

import json
import logging
import os
from typing import Dict, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException

logger = logging.getLogger("abstraction-layer.desktop")

router = APIRouter(tags=["desktop"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

PLATFORM_VOCABULARY: Dict[str, str] = {
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


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


async def _read_frappe_doc(doctype: str, name: str) -> Optional[dict]:
    """Read a single doc from Frappe. Returns dict or None if 404."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json().get("data", {})


@router.get("/vocabulary")
async def get_vocabulary(x_frappe_site_name: Optional[str] = Header(None, alias="X-Frappe-Site-Name")):
    """Resolve vocabulary for the current site.
    
    Cascade: platform defaults -> client overrides in config_json.vocabulary
    Vertical template YAML and user tier are skipped (not yet implemented).
    
    Assumes SM Site Registry document name matches the site_name from the header.
    """
    if not x_frappe_site_name:
        raise HTTPException(status_code=400, detail="site_name header missing")

    site_record = await _read_frappe_doc("SM Site Registry", x_frappe_site_name)
    if site_record is None:
        raise HTTPException(status_code=404, detail="site not found")

    vocabulary = PLATFORM_VOCABULARY.copy()
    config_json = site_record.get("config_json")

    if config_json:
        try:
            config = json.loads(config_json) if isinstance(config_json, str) else config_json
            if isinstance(config, dict):
                overrides = config.get("vocabulary", {})
                if isinstance(overrides, dict):
                    vocabulary.update(overrides)
        except (json.JSONDecodeError, TypeError, ValueError):
            logger.warning("Malformed config_json for site %s, using platform defaults", x_frappe_site_name)

    return {"vocabulary": vocabulary}
```

```python
# abstraction-layer/main.py — modification snippet
# Add the following import at the top with other route imports
from routes.desktop import router as desktop_router

# Add the following line in the app setup section after other router registrations
# (following the pattern used for billing_router)
app.include_router(desktop_router, prefix="/api/modules/desktop")
```

```python
"""Tests for vocabulary resolution endpoint."""

import json

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestVocabularyEndpoint:
    """Tests for GET /api/modules/desktop/vocabulary"""

    @pytest.mark.asyncio
    async def test_vocabulary_returns_platform_defaults_when_no_overrides(self, client, mocker):
        """Site with empty config_json returns platform defaults for all 18 keys"""
        from routes.desktop import PLATFORM_VOCABULARY

        mocker.patch("routes.desktop._read_frappe_doc", return_value={
            "name": "test-site",
            "config_json": "{}",
        })

        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "test-site"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "vocabulary" in data
        assert data["vocabulary"] == PLATFORM_VOCABULARY
        assert len(data["vocabulary"]) == 18

    @pytest.mark.asyncio
    async def test_vocabulary_applies_client_overrides(self, client, mocker):
        """Site with vocabulary overrides in config_json returns merged result"""
        overrides = {
            "person": "Client",
            "invoice": "Patient Statement",
            "service_record": "Session",
        }
        config = {"vocabulary": overrides}
        
        mocker.patch("routes.desktop._read_frappe_doc", return_value={
            "name": "behavioral-health-site",
            "config_json": json.dumps(config),
        })

        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "behavioral-health-site"},
        )

        assert response.status_code == 200
        data = response.json()
        vocab = data["vocabulary"]
        
        # Overridden keys should match config
        assert vocab["person"] == "Client"
        assert vocab["invoice"] == "Patient Statement"
        assert vocab["service_record"] == "Session"
        
        # Non-overridden keys should fall back to platform defaults
        from routes.desktop import PLATFORM_VOCABULARY
        assert vocab["task"] == PLATFORM_VOCABULARY["task"]
        assert vocab["workflow_state"] == PLATFORM_VOCABULARY["workflow_state"]
        
        # All 18 keys must be present
        assert len(vocab) == 18

    def test_vocabulary_missing_site_header_returns_400(self, client):
        """Missing X-Frappe-Site-Name header returns 400"""
        response = client.get("/api/modules/desktop/vocabulary")
        assert response.status_code == 400
        assert response.json()["detail"] == "site_name header missing"

    def test_vocabulary_unknown_site_returns_404(self, client, mocker):
        """Unknown site name returns 404"""
        mocker.patch("routes.desktop._read_frappe_doc", return_value=None)

        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "nonexistent-site"},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "site not found"

    @pytest.mark.asyncio
    async def test_vocabulary_malformed_config_json_returns_defaults(self, client, mocker):
        """Site with invalid JSON in config_json does not crash; returns defaults"""
        from routes.desktop import PLATFORM_VOCABULARY

        mocker.patch("routes.desktop._read_frappe_doc", return_value={
            "name": "broken-config-site",
            "config_json": "{invalid json!!!",
        })

        response = client.get(
            "/api/modules/desktop/vocabulary",
            headers={"X-Frappe-Site-Name": "broken-config-site"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["vocabulary"] == PLATFORM_VOCABULARY
        assert len(data["vocabulary"]) == 18
```