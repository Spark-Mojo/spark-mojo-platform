"""
Tests for BILL-020 — AR Aging endpoint.
"""

import os
import sys
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _days_ago(n):
    return (datetime.now().date() - timedelta(days=n)).strftime("%Y-%m-%d")


MOCK_CLAIMS_AGING = [
    {
        "name": "CLM-A1",
        "canonical_state": "adjudicating",
        "claim_charge_amount": 200.00,
        "payer": "Aetna",
        "state_changed_at": _days_ago(45),
        "submission_date": _days_ago(50),
        "is_overdue": 0,
    },
    {
        "name": "CLM-A2",
        "canonical_state": "submitted",
        "claim_charge_amount": 100.00,
        "payer": "Aetna",
        "state_changed_at": _days_ago(10),
        "submission_date": _days_ago(10),
        "is_overdue": 0,
    },
    {
        "name": "CLM-A3",
        "canonical_state": "denied",
        "claim_charge_amount": 500.00,
        "payer": "BCBS",
        "state_changed_at": _days_ago(95),
        "submission_date": _days_ago(120),
        "is_overdue": 1,
    },
    {
        "name": "CLM-A4",
        "canonical_state": "in_appeal",
        "claim_charge_amount": 300.00,
        "payer": "BCBS",
        "state_changed_at": _days_ago(70),
        "submission_date": None,
        "is_overdue": 0,
    },
]


@pytest.fixture
def mock_frappe():
    with patch("routes.billing._list_frappe_docs", new_callable=AsyncMock) as mock_list:
        yield mock_list


@pytest.fixture
def client():
    from main import app
    from httpx import AsyncClient, ASGITransport
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_aging_state_measure(client, mock_frappe):
    mock_frappe.return_value = MOCK_CLAIMS_AGING
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev")
    assert resp.status_code == 200
    data = resp.json()
    assert data["measure"] == "state"
    assert "0_30" in data["aging"]
    assert "31_60" in data["aging"]
    assert "61_90" in data["aging"]
    assert "over_90" in data["aging"]
    # CLM-A2 (10 days) -> 0_30
    assert data["aging"]["0_30"]["total_claims"] == 1
    # CLM-A1 (45 days) -> 31_60
    assert data["aging"]["31_60"]["total_claims"] == 1
    # CLM-A4 (70 days) -> 61_90
    assert data["aging"]["61_90"]["total_claims"] == 1
    # CLM-A3 (95 days) -> over_90
    assert data["aging"]["over_90"]["total_claims"] == 1
    assert data["missing_submission_date"] == 0


@pytest.mark.asyncio
async def test_aging_billing_measure(client, mock_frappe):
    mock_frappe.return_value = MOCK_CLAIMS_AGING
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev&measure=billing")
    assert resp.status_code == 200
    data = resp.json()
    assert data["measure"] == "billing"
    # CLM-A4 has null submission_date -> excluded, missing incremented
    assert data["missing_submission_date"] == 1
    total = sum(b["total_claims"] for b in data["aging"].values())
    assert total == 3  # CLM-A4 excluded


@pytest.mark.asyncio
async def test_aging_billing_bucket_assignment(client, mock_frappe):
    """CLM-A1: submission_date 50 days ago -> 31_60 bucket."""
    mock_frappe.return_value = [MOCK_CLAIMS_AGING[0]]
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev&measure=billing")
    data = resp.json()
    assert data["aging"]["31_60"]["total_claims"] == 1
    assert data["aging"]["31_60"]["total_billed"] == 200.00


@pytest.mark.asyncio
async def test_aging_empty_site(client, mock_frappe):
    mock_frappe.return_value = []
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev")
    assert resp.status_code == 200
    data = resp.json()
    for bucket in data["aging"].values():
        assert bucket["total_claims"] == 0
        assert bucket["total_billed"] == 0.00
        assert bucket["by_payer"] == []


@pytest.mark.asyncio
async def test_aging_missing_site(client, mock_frappe):
    resp = await client.get("/api/modules/billing/ar/aging")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_aging_invalid_measure(client, mock_frappe):
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev&measure=invalid")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_aging_payer_breakdown(client, mock_frappe):
    mock_frappe.return_value = MOCK_CLAIMS_AGING
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev")
    data = resp.json()
    over90 = data["aging"]["over_90"]
    assert len(over90["by_payer"]) == 1
    assert over90["by_payer"][0]["payer_name"] == "BCBS"
    assert over90["by_payer"][0]["overdue_count"] == 1


@pytest.mark.asyncio
async def test_aging_overdue_total(client, mock_frappe):
    mock_frappe.return_value = MOCK_CLAIMS_AGING
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev")
    data = resp.json()
    assert data["overdue_total"] == 1


@pytest.mark.asyncio
async def test_aging_by_payer_sorted_by_billed_desc(client, mock_frappe):
    mock_frappe.return_value = [
        {
            "name": "C1", "canonical_state": "submitted",
            "claim_charge_amount": 100, "payer": "Small Payer",
            "state_changed_at": _days_ago(5), "submission_date": _days_ago(5), "is_overdue": 0,
        },
        {
            "name": "C2", "canonical_state": "submitted",
            "claim_charge_amount": 500, "payer": "Big Payer",
            "state_changed_at": _days_ago(5), "submission_date": _days_ago(5), "is_overdue": 0,
        },
    ]
    resp = await client.get("/api/modules/billing/ar/aging?site=poc-dev")
    data = resp.json()
    payers = data["aging"]["0_30"]["by_payer"]
    assert payers[0]["payer_name"] == "Big Payer"
    assert payers[1]["payer_name"] == "Small Payer"
