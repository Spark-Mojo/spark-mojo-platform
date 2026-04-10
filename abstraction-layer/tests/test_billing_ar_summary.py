"""
Tests for BILL-019 — AR Summary endpoint.
"""

import os
import sys
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


MOCK_CLAIMS = [
    {
        "name": "CLM-001",
        "canonical_state": "paid",
        "claim_charge_amount": 100.00,
        "paid_amount": 100.00,
        "patient_responsibility": 0,
    },
    {
        "name": "CLM-002",
        "canonical_state": "denied",
        "claim_charge_amount": 200.00,
        "paid_amount": 0,
        "patient_responsibility": 0,
    },
    {
        "name": "CLM-003",
        "canonical_state": "in_appeal",
        "claim_charge_amount": 150.00,
        "paid_amount": 0,
        "patient_responsibility": 0,
    },
    {
        "name": "CLM-004",
        "canonical_state": "submitted",
        "claim_charge_amount": 300.00,
        "paid_amount": 0,
        "patient_responsibility": 0,
    },
    {
        "name": "CLM-005",
        "canonical_state": "patient_balance",
        "claim_charge_amount": 50.00,
        "paid_amount": 40.00,
        "patient_responsibility": 10.00,
    },
    {
        "name": "CLM-006",
        "canonical_state": "written_off",
        "claim_charge_amount": 75.00,
        "paid_amount": 0,
        "patient_responsibility": 0,
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
async def test_ar_summary_with_claims(client, mock_frappe):
    mock_frappe.return_value = MOCK_CLAIMS
    resp = await client.get("/api/modules/billing/ar/summary?site=poc-dev")
    assert resp.status_code == 200
    data = resp.json()
    s = data["summary"]
    assert s["total_claims"] == 6
    assert s["total_billed"] == 875.00
    assert s["total_paid"] == 140.00
    assert s["total_denied"] == 200.00
    assert s["total_in_appeal"] == 150.00
    assert s["total_patient_balance"] == 50.00
    assert s["total_written_off"] == 75.00
    assert s["total_outstanding"] == 660.00

    by_state = data["by_state"]
    assert len(by_state) == 19
    assert by_state["paid"]["count"] == 1
    assert by_state["paid"]["billed"] == 100.00
    assert by_state["denied"]["count"] == 1
    assert by_state["denied"]["billed"] == 200.00
    assert by_state["submitted"]["count"] == 1
    assert by_state["draft"]["count"] == 0
    assert "as_of" in data


@pytest.mark.asyncio
async def test_ar_summary_empty_site(client, mock_frappe):
    mock_frappe.return_value = []
    resp = await client.get("/api/modules/billing/ar/summary?site=poc-dev")
    assert resp.status_code == 200
    data = resp.json()
    s = data["summary"]
    assert s["total_claims"] == 0
    assert s["total_billed"] == 0.00
    assert s["total_outstanding"] == 0.00
    assert len(data["by_state"]) == 19
    for state_data in data["by_state"].values():
        assert state_data["count"] == 0
        assert state_data["billed"] == 0.00


@pytest.mark.asyncio
async def test_ar_summary_date_filters(client, mock_frappe):
    mock_frappe.return_value = [MOCK_CLAIMS[0]]
    resp = await client.get(
        "/api/modules/billing/ar/summary?site=poc-dev&date_from=2026-04-01&date_to=2026-04-30"
    )
    assert resp.status_code == 200
    call_args = mock_frappe.call_args
    filters_str = call_args.kwargs.get("filters", "") or call_args[1].get("filters", "")
    assert "2026-04-01" in filters_str
    assert "2026-04-30" in filters_str


@pytest.mark.asyncio
async def test_ar_summary_missing_site(client, mock_frappe):
    resp = await client.get("/api/modules/billing/ar/summary")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_ar_summary_null_amounts(client, mock_frappe):
    mock_frappe.return_value = [
        {
            "name": "CLM-NULL",
            "canonical_state": "submitted",
            "claim_charge_amount": None,
            "paid_amount": None,
            "patient_responsibility": None,
        }
    ]
    resp = await client.get("/api/modules/billing/ar/summary?site=poc-dev")
    assert resp.status_code == 200
    s = resp.json()["summary"]
    assert s["total_claims"] == 1
    assert s["total_billed"] == 0.00


@pytest.mark.asyncio
async def test_ar_summary_acceptance_criteria(client, mock_frappe):
    """Acceptance criteria: 3 claims - paid $100, denied $200, in_appeal $150."""
    mock_frappe.return_value = [
        {"name": "C1", "canonical_state": "paid", "claim_charge_amount": 100, "paid_amount": 100, "patient_responsibility": 0},
        {"name": "C2", "canonical_state": "denied", "claim_charge_amount": 200, "paid_amount": 0, "patient_responsibility": 0},
        {"name": "C3", "canonical_state": "in_appeal", "claim_charge_amount": 150, "paid_amount": 0, "patient_responsibility": 0},
    ]
    resp = await client.get("/api/modules/billing/ar/summary?site=poc-dev")
    s = resp.json()["summary"]
    assert s["total_billed"] == 450.00
    assert s["total_paid"] == 100.00
    assert s["total_denied"] == 200.00
    assert s["total_in_appeal"] == 150.00
    assert s["total_outstanding"] == 350.00
