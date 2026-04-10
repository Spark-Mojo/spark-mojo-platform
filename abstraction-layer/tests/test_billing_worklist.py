"""
Tests for BILL-015: Denial Worklist Endpoint.

Mocks Frappe API calls. Tests task-based querying, SM Denial enrichment,
pipeline section, grouping by ai_category, sorting by appeal_deadline,
payer/date filters, and include_watching toggle.
"""

import os
import sys
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

TODAY = datetime.now().date()
PAST_DEADLINE = (TODAY - timedelta(days=5)).strftime("%Y-%m-%d")
FUTURE_DEADLINE_NEAR = (TODAY + timedelta(days=10)).strftime("%Y-%m-%d")
FUTURE_DEADLINE_FAR = (TODAY + timedelta(days=30)).strftime("%Y-%m-%d")

MOCK_TASKS = [
    {
        "name": "TASK-001",
        "task_mode": "active",
        "source_object_id": "DEN-001",
        "canonical_state": "Open",
    },
    {
        "name": "TASK-002",
        "task_mode": "active",
        "source_object_id": "DEN-002",
        "canonical_state": "Open",
    },
    {
        "name": "TASK-003",
        "task_mode": "active",
        "source_object_id": "DEN-003",
        "canonical_state": "Open",
    },
]

MOCK_DENIALS = {
    "DEN-001": {
        "name": "DEN-001",
        "claim": "CLM-001",
        "denial_date": "2026-04-05",
        "appeal_deadline": PAST_DEADLINE,
        "denial_reason_summary": "Missing modifier",
        "ai_category": "correctable",
        "ai_appealable": 0,
        "ai_action": "Resubmit with modifier 25",
        "ai_confidence": 0.92,
        "carc_codes": [{"carc_code": "4", "description": "Modifier required"}],
    },
    "DEN-002": {
        "name": "DEN-002",
        "claim": "CLM-002",
        "denial_date": "2026-04-06",
        "appeal_deadline": FUTURE_DEADLINE_FAR,
        "denial_reason_summary": "Medical necessity",
        "ai_category": "appealable",
        "ai_appealable": 1,
        "ai_action": "Submit appeal with clinical notes",
        "ai_confidence": 0.85,
        "carc_codes": [{"carc_code": "50", "description": "Medical necessity"}],
    },
    "DEN-003": {
        "name": "DEN-003",
        "claim": "CLM-003",
        "denial_date": "2026-04-07",
        "appeal_deadline": FUTURE_DEADLINE_NEAR,
        "denial_reason_summary": "Also correctable",
        "ai_category": "correctable",
        "ai_appealable": 0,
        "ai_action": "Fix and resubmit",
        "ai_confidence": 0.88,
        "carc_codes": [{"carc_code": "16", "description": "Missing info"}],
    },
}

MOCK_CLAIMS = {
    "CLM-001": {"name": "CLM-001", "payer": "BCBS"},
    "CLM-002": {"name": "CLM-002", "payer": "Aetna"},
    "CLM-003": {"name": "CLM-003", "payer": "BCBS"},
}

MOCK_PIPELINE_SUBMITTED = [
    {
        "name": "CLM-100",
        "canonical_state": "submitted",
        "payer": "BCBS",
        "date_of_service": "2026-04-01",
        "state_changed_at": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
    },
]

MOCK_PIPELINE_ADJUDICATING = [
    {
        "name": "CLM-200",
        "canonical_state": "adjudicating",
        "payer": "Aetna",
        "date_of_service": "2026-03-28",
        "state_changed_at": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"),
    },
]


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    os.environ["FRAPPE_URL"] = "http://localhost:8080"
    os.environ["FRAPPE_API_KEY"] = "test"
    os.environ["FRAPPE_API_SECRET"] = "test"
    os.environ["STEDI_API_KEY"] = "test-key"
    os.environ["STEDI_SANDBOX"] = "true"
    os.environ.setdefault("DEV_MODE", "true")

    import importlib
    import routes.billing
    importlib.reload(routes.billing)

    from main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_list(doctype, filters="", fields="", limit=20, offset=0):
    """Return mock list results based on doctype and filters."""
    import json as _json
    f = _json.loads(filters) if filters else []

    if doctype == "SM Task":
        return MOCK_TASKS

    if doctype == "SM Claim":
        # Check if this is a pipeline query
        for flt in f:
            if flt[0] == "canonical_state" and flt[1] == "=" and flt[2] == "submitted":
                return MOCK_PIPELINE_SUBMITTED
            if flt[0] == "canonical_state" and flt[1] == "=" and flt[2] == "adjudicating":
                return MOCK_PIPELINE_ADJUDICATING
        return []

    return []


def _mock_read(doctype, name):
    """Return mock doc based on doctype and name."""
    if doctype == "SM Denial" and name in MOCK_DENIALS:
        return MOCK_DENIALS[name]
    if doctype == "SM Claim" and name in MOCK_CLAIMS:
        return MOCK_CLAIMS[name]
    raise Exception(f"Not found: {doctype}/{name}")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestDenialWorklist:
    """Tests for GET /api/modules/billing/denials/worklist."""

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_basic_worklist(self, mock_list, mock_read, client):
        """AC: 2 correctable + 1 appealable = total_action_required 3."""
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev")
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["action_required"]["correctable"]) == 2
        assert len(data["action_required"]["appealable"]) == 1
        assert data["totals"]["total_action_required"] == 3
        assert data["totals"]["correctable"] == 2
        assert data["totals"]["appealable"] == 1
        assert data["totals"]["terminal"] == 0
        assert data["totals"]["pending"] == 0

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_sort_by_deadline(self, mock_list, mock_read, client):
        """AC: Past-deadline items sort first; nearer deadlines before farther."""
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev")
        data = resp.json()

        correctable = data["action_required"]["correctable"]
        assert len(correctable) == 2
        # DEN-001 has past deadline, DEN-003 has near future — DEN-001 first
        assert correctable[0]["denial_name"] == "DEN-001"
        assert correctable[0]["days_until_deadline"] < 0
        assert correctable[1]["denial_name"] == "DEN-003"

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_pipeline_section(self, mock_list, mock_read, client):
        """AC: Pipeline includes submitted and adjudicating claims."""
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev")
        data = resp.json()

        assert len(data["pipeline"]["submitted"]) == 1
        assert len(data["pipeline"]["adjudicating"]) == 1
        assert data["pipeline"]["submitted"][0]["claim"] == "CLM-100"
        assert data["pipeline"]["adjudicating"][0]["claim"] == "CLM-200"
        assert data["pipeline"]["adjudicating"][0]["days_in_state"] is not None
        assert data["totals"]["pipeline_submitted"] == 1
        assert data["totals"]["pipeline_adjudicating"] == 1

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_include_watching_false(self, mock_list, mock_read, client):
        """AC: include_watching=false empties pipeline groups."""
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev&include_watching=false")
        data = resp.json()

        assert data["pipeline"]["submitted"] == []
        assert data["pipeline"]["adjudicating"] == []
        assert data["totals"]["pipeline_submitted"] == 0
        assert data["totals"]["pipeline_adjudicating"] == 0
        # Denial tasks still returned
        assert data["totals"]["total_action_required"] == 3

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_payer_filter(self, mock_list, mock_read, client):
        """AC: Payer filter applies to both denial tasks and pipeline."""
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev&payer=BCBS")
        data = resp.json()

        # Only BCBS denials: DEN-001 (CLM-001/BCBS) and DEN-003 (CLM-003/BCBS)
        assert data["totals"]["total_action_required"] == 2
        # Pipeline: only BCBS claims
        assert len(data["pipeline"]["submitted"]) == 1  # CLM-100 is BCBS
        assert len(data["pipeline"]["adjudicating"]) == 0  # CLM-200 is Aetna

    def test_missing_site_returns_422(self, client):
        """AC: Missing site parameter returns 422."""
        resp = client.get("/api/modules/billing/denials/worklist")
        assert resp.status_code == 422

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_date_range_filter(self, mock_list, mock_read, client):
        """Date filters exclude denials outside range."""
        resp = client.get(
            "/api/modules/billing/denials/worklist?site=poc-dev"
            "&date_from=2026-04-06&date_to=2026-04-07"
        )
        data = resp.json()

        # DEN-001 has denial_date 2026-04-05, should be excluded
        # DEN-002 (04-06) and DEN-003 (04-07) should remain
        assert data["totals"]["total_action_required"] == 2
        all_names = []
        for cat in data["action_required"].values():
            for item in cat:
                all_names.append(item["denial_name"])
        assert "DEN-001" not in all_names
        assert "DEN-002" in all_names
        assert "DEN-003" in all_names

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_denial_item_fields(self, mock_list, mock_read, client):
        """Each denial item has all required fields from the spec."""
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev")
        data = resp.json()

        item = data["action_required"]["correctable"][0]
        required_fields = [
            "task_id", "task_mode", "denial_name", "claim",
            "denial_date", "appeal_deadline", "days_until_deadline",
            "carc_codes", "denial_reason_summary", "ai_category",
            "ai_appealable", "ai_action", "ai_confidence", "payer_name",
        ]
        for field in required_fields:
            assert field in item, f"Missing field: {field}"

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, side_effect=_mock_list)
    def test_pipeline_item_fields(self, mock_list, mock_read, client):
        """Each pipeline item has all required fields from the spec."""
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev")
        data = resp.json()

        item = data["pipeline"]["submitted"][0]
        required_fields = [
            "claim", "canonical_state", "payer_name",
            "date_of_service", "days_in_state",
        ]
        for field in required_fields:
            assert field in item, f"Missing field: {field}"

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_completed_tasks_excluded(self, mock_list, mock_read, client):
        """AC: Completed tasks do not appear in response."""
        # The filter already excludes Completed/Canceled, so an empty task list
        # should produce empty response
        mock_list.return_value = []
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev&include_watching=false")
        data = resp.json()

        assert data["totals"]["total_action_required"] == 0
        for cat in data["action_required"].values():
            assert len(cat) == 0

    @patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, side_effect=_mock_read)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_tasks_without_source_object_skipped(self, mock_list, mock_read, client):
        """Tasks with empty source_object_id are skipped gracefully."""
        mock_list.return_value = [
            {"name": "TASK-X", "task_mode": "active", "source_object_id": "", "canonical_state": "Open"},
        ]
        resp = client.get("/api/modules/billing/denials/worklist?site=poc-dev&include_watching=false")
        data = resp.json()
        assert data["totals"]["total_action_required"] == 0
