"""
Tests for BILL-018: Appeal State Transitions.

Mocks Frappe API calls. Tests all four appeal outcome endpoints:
won, lost, write_off, escalate. Covers happy paths, validation errors,
supervisor role enforcement, and duplicate escalation guard.
"""

import json
import os
import sys
from unittest.mock import AsyncMock, patch, call

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------

MOCK_APPEAL_PENDING = {
    "name": "SM-APPEAL-00001",
    "claim": "SM-CLAIM-00001",
    "denial": "SM-DENIAL-00001",
    "appeal_level": 1,
    "result": "pending",
    "payer_deadline": "2026-05-10",
}

MOCK_APPEAL_LOST = {
    "name": "SM-APPEAL-00001",
    "claim": "SM-CLAIM-00001",
    "denial": "SM-DENIAL-00001",
    "appeal_level": 1,
    "result": "lost",
    "payer_deadline": "2026-05-10",
}

MOCK_APPEAL_WON = {
    "name": "SM-APPEAL-00001",
    "claim": "SM-CLAIM-00001",
    "denial": "SM-DENIAL-00001",
    "appeal_level": 1,
    "result": "won",
    "result_date": "2026-04-10",
}

MOCK_CLAIM_IN_APPEAL = {
    "name": "SM-CLAIM-00001",
    "canonical_state": "in_appeal",
    "payer": "BCBS",
}

MOCK_CLAIM_DENIED = {
    "name": "SM-CLAIM-00001",
    "canonical_state": "denied",
    "payer": "BCBS",
}

MOCK_CLAIM_ADJUDICATING = {
    "name": "SM-CLAIM-00001",
    "canonical_state": "adjudicating",
    "payer": "BCBS",
}

MOCK_CLAIM_WRITTEN_OFF = {
    "name": "SM-CLAIM-00001",
    "canonical_state": "written_off",
    "payer": "BCBS",
    "write_off_amount": 150.0,
    "write_off_approved_by": "supervisor@test.com",
}

MOCK_SUPERVISOR_USER = {
    "name": "supervisor@test.com",
    "roles": [{"role": "Billing Supervisor"}, {"role": "System Manager"}],
}

MOCK_NON_SUPERVISOR_USER = {
    "name": "staff@test.com",
    "roles": [{"role": "Billing Coordinator"}],
}

MOCK_OPEN_TASKS = [
    {"name": "TASK-001", "source_object_id": "SM-APPEAL-00001"},
]

MOCK_BILLING_TASKS = [
    {"name": "TASK-001", "source_object_id": "SM-DENIAL-00001"},
    {"name": "TASK-002", "source_object_id": "SM-APPEAL-00001"},
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

def _make_read_mock(doc_map):
    """Create an async mock for _read_frappe_doc that returns docs from a map."""
    async def _mock_read(doctype, name):
        key = f"{doctype}:{name}"
        if key in doc_map:
            return doc_map[key]
        raise Exception(f"Not found: {key}")
    return _mock_read


def _make_list_mock(list_map=None):
    """Create an async mock for _list_frappe_docs."""
    async def _mock_list(doctype, filters="", fields="", limit=20, offset=0):
        if list_map and doctype in list_map:
            return list_map[doctype]
        return []
    return _mock_list


# ---------------------------------------------------------------------------
# POST /api/modules/billing/appeals/won
# ---------------------------------------------------------------------------

class TestAppealWon:
    def test_appeal_won_success(self, client):
        read_seq = [
            MOCK_APPEAL_PENDING,
            MOCK_CLAIM_IN_APPEAL,
            MOCK_APPEAL_WON,
            MOCK_CLAIM_ADJUDICATING,
        ]
        read_call_count = {"n": 0}

        async def mock_read(doctype, name):
            idx = read_call_count["n"]
            read_call_count["n"] += 1
            return read_seq[idx]

        with patch("routes.billing._read_frappe_doc", side_effect=mock_read), \
             patch("routes.billing._update_frappe_doc", new_callable=AsyncMock) as mock_update, \
             patch("routes.billing._transition_claim_state", new_callable=AsyncMock) as mock_trans, \
             patch("routes.billing._complete_task_by_source", new_callable=AsyncMock) as mock_complete:

            resp = client.post("/api/modules/billing/appeals/won", json={
                "appeal_id": "SM-APPEAL-00001",
                "result_notes": "Payer agreed",
            })

            assert resp.status_code == 200
            data = resp.json()
            assert data["claim_state"] == "adjudicating"
            assert data["appeal"]["result"] == "won"

            mock_update.assert_called_once()
            update_args = mock_update.call_args
            assert update_args[0][0] == "SM Appeal"
            assert update_args[0][2]["result"] == "won"
            assert update_args[0][2]["result_notes"] == "Payer agreed"

            mock_trans.assert_called_once()
            trans_kwargs = mock_trans.call_args[1]
            assert trans_kwargs["to_state"] == "adjudicating"
            assert "Appeal won at level 1" in trans_kwargs["reason"]

            mock_complete.assert_called_once_with("SM-APPEAL-00001")

    def test_appeal_won_not_pending(self, client):
        appeal_not_pending = {**MOCK_APPEAL_PENDING, "result": "won"}

        with patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, return_value=appeal_not_pending):
            resp = client.post("/api/modules/billing/appeals/won", json={
                "appeal_id": "SM-APPEAL-00001",
            })
            assert resp.status_code == 400
            assert "not pending" in resp.json()["detail"]

    def test_appeal_won_claim_not_in_appeal(self, client):
        read_seq = [MOCK_APPEAL_PENDING, MOCK_CLAIM_DENIED]
        call_count = {"n": 0}

        async def mock_read(doctype, name):
            idx = call_count["n"]
            call_count["n"] += 1
            return read_seq[idx]

        with patch("routes.billing._read_frappe_doc", side_effect=mock_read):
            resp = client.post("/api/modules/billing/appeals/won", json={
                "appeal_id": "SM-APPEAL-00001",
            })
            assert resp.status_code == 400
            assert "not in in_appeal" in resp.json()["detail"]

    def test_appeal_won_missing_field(self, client):
        resp = client.post("/api/modules/billing/appeals/won", json={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/modules/billing/appeals/lost
# ---------------------------------------------------------------------------

class TestAppealLost:
    def test_appeal_lost_success(self, client):
        appeal_after_update = {**MOCK_APPEAL_PENDING, "result": "lost", "result_date": "2026-04-10"}
        read_seq = [
            MOCK_APPEAL_PENDING,
            MOCK_CLAIM_IN_APPEAL,
            appeal_after_update,
            MOCK_CLAIM_DENIED,
        ]
        call_count = {"n": 0}

        async def mock_read(doctype, name):
            idx = call_count["n"]
            call_count["n"] += 1
            return read_seq[idx]

        with patch("routes.billing._read_frappe_doc", side_effect=mock_read), \
             patch("routes.billing._update_frappe_doc", new_callable=AsyncMock) as mock_update, \
             patch("routes.billing._transition_claim_state", new_callable=AsyncMock) as mock_trans, \
             patch("routes.billing._create_frappe_doc", new_callable=AsyncMock, return_value={"name": "TASK-NEW"}) as mock_create, \
             patch("routes.billing._complete_task_by_source", new_callable=AsyncMock) as mock_complete:

            resp = client.post("/api/modules/billing/appeals/lost", json={
                "appeal_id": "SM-APPEAL-00001",
                "result_notes": "Insufficient docs",
            })

            assert resp.status_code == 200
            data = resp.json()
            assert data["claim_state"] == "denied"

            mock_trans.assert_called_once()
            assert mock_trans.call_args[1]["to_state"] == "denied"

            mock_create.assert_called_once()
            task_data = mock_create.call_args[0][1]
            assert task_data["task_type"] == "appeal_decision"
            assert task_data["task_mode"] == "active"
            assert "level 2 appeal or write-off" in task_data["title"]

            mock_complete.assert_called_once_with("SM-APPEAL-00001")

    def test_appeal_lost_not_pending(self, client):
        appeal_already_lost = {**MOCK_APPEAL_PENDING, "result": "lost"}

        with patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, return_value=appeal_already_lost):
            resp = client.post("/api/modules/billing/appeals/lost", json={
                "appeal_id": "SM-APPEAL-00001",
            })
            assert resp.status_code == 400

    def test_appeal_lost_missing_field(self, client):
        resp = client.post("/api/modules/billing/appeals/lost", json={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/modules/billing/appeals/write_off
# ---------------------------------------------------------------------------

class TestAppealWriteOff:
    def test_write_off_success(self, client):
        read_seq_map = {
            "SM Claim:SM-CLAIM-00001": MOCK_CLAIM_DENIED,
            "User:supervisor@test.com": MOCK_SUPERVISOR_USER,
        }
        read_after_map = {
            "SM Claim:SM-CLAIM-00001": MOCK_CLAIM_WRITTEN_OFF,
        }
        call_count = {"n": 0}

        async def mock_read(doctype, name):
            key = f"{doctype}:{name}"
            call_count["n"] += 1
            if call_count["n"] > 2 and key in read_after_map:
                return read_after_map[key]
            if key in read_seq_map:
                return read_seq_map[key]
            raise Exception(f"Not found: {key}")

        with patch("routes.billing._read_frappe_doc", side_effect=mock_read), \
             patch("routes.billing._update_frappe_doc", new_callable=AsyncMock) as mock_update, \
             patch("routes.billing._transition_claim_state", new_callable=AsyncMock) as mock_trans, \
             patch("routes.billing._complete_all_billing_tasks_for_claim", new_callable=AsyncMock) as mock_complete:

            resp = client.post("/api/modules/billing/appeals/write_off", json={
                "claim_id": "SM-CLAIM-00001",
                "reason_code": "TIMELY_FILING_EXPIRED",
                "approved_by": "supervisor@test.com",
                "write_off_amount": 150.0,
            })

            assert resp.status_code == 200

            mock_update.assert_called_once()
            update_data = mock_update.call_args[0][2]
            assert update_data["write_off_amount"] == 150.0
            assert update_data["write_off_approved_by"] == "supervisor@test.com"

            mock_trans.assert_called_once()
            assert mock_trans.call_args[1]["to_state"] == "written_off"
            assert "TIMELY_FILING_EXPIRED" in mock_trans.call_args[1]["reason"]

            mock_complete.assert_called_once_with("SM-CLAIM-00001")

    def test_write_off_not_supervisor(self, client):
        read_map = {
            "SM Claim:SM-CLAIM-00001": MOCK_CLAIM_DENIED,
            "User:staff@test.com": MOCK_NON_SUPERVISOR_USER,
        }

        with patch("routes.billing._read_frappe_doc", side_effect=_make_read_mock(read_map)):
            resp = client.post("/api/modules/billing/appeals/write_off", json={
                "claim_id": "SM-CLAIM-00001",
                "reason_code": "TIMELY_FILING_EXPIRED",
                "approved_by": "staff@test.com",
                "write_off_amount": 150.0,
            })

            assert resp.status_code == 403
            assert resp.json()["detail"]["error"] == "write_off_requires_supervisor_approval"

    def test_write_off_claim_not_denied(self, client):
        with patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, return_value=MOCK_CLAIM_IN_APPEAL):
            resp = client.post("/api/modules/billing/appeals/write_off", json={
                "claim_id": "SM-CLAIM-00001",
                "reason_code": "TEST",
                "approved_by": "supervisor@test.com",
                "write_off_amount": 150.0,
            })
            assert resp.status_code == 400
            assert "not in denied" in resp.json()["detail"]

    def test_write_off_missing_fields(self, client):
        resp = client.post("/api/modules/billing/appeals/write_off", json={
            "claim_id": "SM-CLAIM-00001",
        })
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/modules/billing/appeals/escalate
# ---------------------------------------------------------------------------

class TestAppealEscalate:
    def test_escalate_success(self, client):
        new_appeal = {
            "name": "SM-APPEAL-00002",
            "claim": "SM-CLAIM-00001",
            "denial": "SM-DENIAL-00001",
            "appeal_level": 2,
            "result": "pending",
            "payer_deadline": "2026-06-09",
        }

        with patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, return_value=MOCK_APPEAL_LOST), \
             patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, return_value=[]) as mock_list, \
             patch("routes.billing._create_frappe_doc", new_callable=AsyncMock, return_value=new_appeal) as mock_create:

            resp = client.post("/api/modules/billing/appeals/escalate", json={
                "appeal_id": "SM-APPEAL-00001",
            })

            assert resp.status_code == 200
            data = resp.json()
            assert data["appeal"]["appeal_level"] == 2
            assert data["appeal"]["result"] == "pending"

            mock_create.assert_called_once()
            create_data = mock_create.call_args[0][1]
            assert create_data["appeal_level"] == 2
            assert create_data["payer_deadline"] == "2026-06-09"

    def test_escalate_not_lost(self, client):
        with patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, return_value=MOCK_APPEAL_PENDING):
            resp = client.post("/api/modules/billing/appeals/escalate", json={
                "appeal_id": "SM-APPEAL-00001",
            })
            assert resp.status_code == 400
            assert "not lost" in resp.json()["detail"]

    def test_escalate_not_level_1(self, client):
        level2_appeal = {**MOCK_APPEAL_LOST, "appeal_level": 2}

        with patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, return_value=level2_appeal):
            resp = client.post("/api/modules/billing/appeals/escalate", json={
                "appeal_id": "SM-APPEAL-00001",
            })
            assert resp.status_code == 400
            assert "level-1" in resp.json()["detail"]

    def test_escalate_duplicate_level_2(self, client):
        existing_level_2 = [{"name": "SM-APPEAL-00099"}]

        with patch("routes.billing._read_frappe_doc", new_callable=AsyncMock, return_value=MOCK_APPEAL_LOST), \
             patch("routes.billing._list_frappe_docs", new_callable=AsyncMock, return_value=existing_level_2):

            resp = client.post("/api/modules/billing/appeals/escalate", json={
                "appeal_id": "SM-APPEAL-00001",
            })
            assert resp.status_code == 409
            assert resp.json()["detail"]["error"] == "level_2_appeal_already_exists"

    def test_escalate_missing_field(self, client):
        resp = client.post("/api/modules/billing/appeals/escalate", json={})
        assert resp.status_code == 422
