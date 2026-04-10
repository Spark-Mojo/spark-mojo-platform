"""
Tests for BILL-021 — Denial Analytics endpoint.
"""

import os
import sys
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _days_ago(n):
    return (datetime.now().date() - timedelta(days=n)).strftime("%Y-%m-%d")


MOCK_CLAIMS = [
    {
        "name": "CLM-001",
        "canonical_state": "denied",
        "payer": "Aetna",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(5),
    },
    {
        "name": "CLM-002",
        "canonical_state": "adjudicating",
        "payer": "Aetna",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(10),
    },
    {
        "name": "CLM-003",
        "canonical_state": "denied",
        "payer": "Aetna",
        "cpt_code": "90834",
        "state_changed_at": _days_ago(8),
    },
    {
        "name": "CLM-004",
        "canonical_state": "denied",
        "payer": "BCBS",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(3),
    },
    {
        "name": "CLM-005",
        "canonical_state": "submitted",
        "payer": "BCBS",
        "cpt_code": "90834",
        "state_changed_at": _days_ago(12),
    },
    {
        "name": "CLM-006",
        "canonical_state": "paid",
        "payer": "Aetna",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(2),
    },
    {
        "name": "CLM-007",
        "canonical_state": "submitted",
        "payer": "Aetna",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(14),
    },
    {
        "name": "CLM-008",
        "canonical_state": "submitted",
        "payer": "Aetna",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(6),
    },
    {
        "name": "CLM-009",
        "canonical_state": "submitted",
        "payer": "Aetna",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(7),
    },
    {
        "name": "CLM-010",
        "canonical_state": "submitted",
        "payer": "Aetna",
        "cpt_code": "90837",
        "state_changed_at": _days_ago(9),
    },
]

MOCK_DENIALS = [
    {
        "name": "DEN-001",
        "claim": "CLM-001",
        "denial_date": _days_ago(5),
        "ai_category": "correctable",
        "carc_codes": [
            {"carc_code": "CO-45", "carc_description": "Charge exceeds fee schedule"},
            {"carc_code": "CO-97", "carc_description": "Payment adjusted"},
        ],
    },
    {
        "name": "DEN-002",
        "claim": "CLM-003",
        "denial_date": _days_ago(8),
        "ai_category": "appealable",
        "carc_codes": [
            {"carc_code": "CO-45", "carc_description": "Charge exceeds fee schedule"},
        ],
    },
    {
        "name": "DEN-003",
        "claim": "CLM-004",
        "denial_date": _days_ago(3),
        "ai_category": "terminal",
        "carc_codes": [
            {"carc_code": "PR-1", "carc_description": "Deductible amount"},
        ],
    },
]

MOCK_PRIOR_DENIALS = []


def _mock_list_side_effect(calls_config):
    call_count = [0]

    async def side_effect(doctype, **kwargs):
        idx = call_count[0]
        call_count[0] += 1
        if idx < len(calls_config):
            return calls_config[idx]
        return []

    return side_effect


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
async def test_denial_rate_by_payer(client, mock_frappe):
    mock_frappe.side_effect = _mock_list_side_effect([
        MOCK_DENIALS,
        MOCK_CLAIMS,
        MOCK_PRIOR_DENIALS,
    ])
    resp = await client.get("/api/modules/billing/ar/denials?site=poc-dev")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_denials_in_period"] == 3
    payers = {p["payer_name"]: p for p in data["denial_rate_by_payer"]}
    assert "Aetna" in payers
    assert "BCBS" in payers
    assert payers["BCBS"]["total_denied"] == 1
    assert payers["BCBS"]["total_claims"] == 2
    assert payers["BCBS"]["denial_rate_pct"] == 50.0


@pytest.mark.asyncio
async def test_top_carc_codes(client, mock_frappe):
    mock_frappe.side_effect = _mock_list_side_effect([
        MOCK_DENIALS,
        MOCK_CLAIMS,
        MOCK_PRIOR_DENIALS,
    ])
    resp = await client.get("/api/modules/billing/ar/denials?site=poc-dev")
    data = resp.json()
    carcs = data["top_carc_codes"]
    assert carcs[0]["carc_code"] == "CO-45"
    assert carcs[0]["occurrence_count"] == 2
    assert carcs[1]["carc_code"] in ["CO-97", "PR-1"]


@pytest.mark.asyncio
async def test_denial_rate_by_cpt(client, mock_frappe):
    mock_frappe.side_effect = _mock_list_side_effect([
        MOCK_DENIALS,
        MOCK_CLAIMS,
        MOCK_PRIOR_DENIALS,
    ])
    resp = await client.get("/api/modules/billing/ar/denials?site=poc-dev")
    data = resp.json()
    cpts = {c["cpt_code"]: c for c in data["denial_rate_by_cpt"]}
    assert "90837" in cpts
    assert "90834" in cpts
    assert cpts["90834"]["total_denied"] == 1
    assert cpts["90834"]["total_claims"] == 2
    assert cpts["90834"]["denial_rate_pct"] == 50.0


@pytest.mark.asyncio
async def test_by_ai_category(client, mock_frappe):
    mock_frappe.side_effect = _mock_list_side_effect([
        MOCK_DENIALS,
        MOCK_CLAIMS,
        MOCK_PRIOR_DENIALS,
    ])
    resp = await client.get("/api/modules/billing/ar/denials?site=poc-dev")
    data = resp.json()
    by_ai = data["by_ai_category"]
    assert by_ai["correctable"]["count"] == 1
    assert by_ai["appealable"]["count"] == 1
    assert by_ai["terminal"]["count"] == 1
    assert by_ai["pending"]["count"] == 0
    total_pct = sum(cat["pct_of_denials"] for cat in by_ai.values())
    assert abs(total_pct - 100.0) < 0.5


@pytest.mark.asyncio
async def test_empty_period(client, mock_frappe):
    mock_frappe.side_effect = _mock_list_side_effect([
        [],
        MOCK_CLAIMS,
        [],
    ])
    resp = await client.get(
        "/api/modules/billing/ar/denials?site=poc-dev&date_from=2020-01-01&date_to=2020-01-31"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_denials_in_period"] == 0
    assert data["denial_rate_by_payer"] == []
    assert data["denial_rate_by_cpt"] == []
    assert data["top_carc_codes"] == []


@pytest.mark.asyncio
async def test_missing_site(client, mock_frappe):
    resp = await client.get("/api/modules/billing/ar/denials")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_avg_days_to_resolution(client, mock_frappe):
    resolved_claims = list(MOCK_CLAIMS)
    resolved_claims[0] = {
        **resolved_claims[0],
        "canonical_state": "paid",
        "state_changed_at": _days_ago(0),
    }
    mock_frappe.side_effect = _mock_list_side_effect([
        [MOCK_DENIALS[0]],
        resolved_claims,
        [],
    ])
    resp = await client.get("/api/modules/billing/ar/denials?site=poc-dev")
    data = resp.json()
    assert data["avg_days_denial_to_resolution"]["correctable"] == 5.0


@pytest.mark.asyncio
async def test_trend_calculation(client, mock_frappe):
    prior_denials_with_data = [
        {"name": "PRIOR-1", "claim": "CLM-004"},
        {"name": "PRIOR-2", "claim": "CLM-004"},
        {"name": "PRIOR-3", "claim": "CLM-004"},
    ]
    mock_frappe.side_effect = _mock_list_side_effect([
        MOCK_DENIALS,
        MOCK_CLAIMS,
        prior_denials_with_data,
    ])
    resp = await client.get(
        "/api/modules/billing/ar/denials?site=poc-dev&date_from=2026-04-01&date_to=2026-04-10"
    )
    assert resp.status_code == 200
    data = resp.json()
    bcbs = next((p for p in data["denial_rate_by_payer"] if p["payer_name"] == "BCBS"), None)
    assert bcbs is not None
    assert bcbs["denial_rate_prior_period_pct"] > 0


@pytest.mark.asyncio
async def test_response_structure(client, mock_frappe):
    mock_frappe.side_effect = _mock_list_side_effect([
        MOCK_DENIALS,
        MOCK_CLAIMS,
        MOCK_PRIOR_DENIALS,
    ])
    resp = await client.get("/api/modules/billing/ar/denials?site=poc-dev")
    data = resp.json()
    assert "denial_rate_by_payer" in data
    assert "denial_rate_by_cpt" in data
    assert "top_carc_codes" in data
    assert "by_ai_category" in data
    assert "avg_days_denial_to_resolution" in data
    assert "total_denials_in_period" in data
    assert "as_of" in data
