"""
Tests for eligibility check endpoints (BILL-005).

Patches _list_frappe_docs and check_eligibility directly for cleaner mocking.
"""

import os
import sys
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Mock 271 responses
# ---------------------------------------------------------------------------

MOCK_271_ACTIVE = {
    "benefits": [
        {
            "benefitInformationType": "1",
            "serviceTypeCodes": ["30"],
            "planBeginDate": "2026-01-01",
            "planEndDate": "2026-12-31",
        },
        {
            "benefitInformationType": "C",
            "coverageLevelCode": "IND",
            "benefitAmount": 1500.00,
            "timePeriodQualifier": "23",
        },
        {
            "benefitInformationType": "G",
            "coverageLevelCode": "IND",
            "benefitAmount": 500.00,
        },
        {
            "benefitInformationType": "J",
            "coverageLevelCode": "IND",
            "benefitAmount": 1000.00,
        },
        {
            "benefitInformationType": "F",
            "coverageLevelCode": "IND",
            "benefitAmount": 6000.00,
        },
        {
            "benefitInformationType": "B",
            "serviceTypeCodes": ["30"],
            "benefitAmount": 25.00,
        },
        {
            "benefitInformationType": "A",
            "serviceTypeCodes": ["30"],
            "benefitPercent": 20.0,
        },
    ],
    "planInformation": {
        "planName": "PPO Gold",
        "groupNumber": "GRP-100",
    },
    "subscriber": {
        "groupNumber": "GRP-100",
    },
}

MOCK_271_INACTIVE = {
    "benefits": [
        {
            "benefitInformationType": "6",
            "serviceTypeCodes": ["30"],
        },
    ],
    "planInformation": {},
    "subscriber": {},
}

MOCK_271_UNKNOWN = {
    "benefits": [],
    "planInformation": {},
    "subscriber": {},
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Create a test client with billing-related env vars."""
    os.environ["STEDI_API_KEY"] = "test-key"
    os.environ["STEDI_SANDBOX"] = "true"
    os.environ["FRAPPE_URL"] = "http://localhost:8080"
    os.environ["FRAPPE_API_KEY"] = "test"
    os.environ["FRAPPE_API_SECRET"] = "test"
    os.environ.setdefault("DEV_MODE", "true")

    import importlib
    import routes.billing
    import connectors.stedi
    importlib.reload(connectors.stedi)
    importlib.reload(routes.billing)

    from main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


VALID_REQUEST = {
    "payer_name": "Blue Cross Blue Shield",
    "provider_npi": "1234567890",
    "provider_name": "Dr. Smith",
    "member_id": "MEM-001",
    "member_first_name": "Jane",
    "member_last_name": "Doe",
    "member_dob": "1990-01-15",
    "date_of_service": "2026-06-01",
}


# ---------------------------------------------------------------------------
# Tests: POST eligibility check
# ---------------------------------------------------------------------------

class TestEligibilityCheckPost:

    @patch("routes.billing.check_eligibility", new_callable=AsyncMock)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_active_coverage(self, mock_list, mock_elig, client):
        """Active coverage returns is_eligible=True with benefit details."""
        mock_list.return_value = [
            {"name": "BCBS", "payer_name": "Blue Cross Blue Shield", "stedi_trading_partner_id": "BCBS_001"},
        ]
        mock_elig.return_value = MOCK_271_ACTIVE

        resp = client.post("/api/modules/billing/eligibility/check", json=VALID_REQUEST)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_eligible"] is True
        assert data["coverage_status"] == "active"
        assert data["payer_name"] == "Blue Cross Blue Shield"
        assert data["member_id"] == "MEM-001"
        assert data["member_name"] == "Jane Doe"
        assert data["group_number"] == "GRP-100"
        assert data["plan_name"] == "PPO Gold"
        assert data["deductible_individual"] == 1500.00
        assert data["deductible_met"] == 500.00
        assert data["deductible_remaining"] == 1000.00
        assert data["out_of_pocket_individual"] == 6000.00
        assert data["copay"] == 25.00
        assert data["coinsurance_percent"] == 20.0
        assert data["raw_response"] is not None
        assert data["checked_at"] is not None

    @patch("routes.billing.check_eligibility", new_callable=AsyncMock)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_inactive_coverage(self, mock_list, mock_elig, client):
        """Inactive coverage returns is_eligible=False."""
        mock_list.return_value = [
            {"name": "BCBS", "payer_name": "Blue Cross Blue Shield", "stedi_trading_partner_id": "BCBS_001"},
        ]
        mock_elig.return_value = MOCK_271_INACTIVE

        resp = client.post("/api/modules/billing/eligibility/check", json=VALID_REQUEST)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_eligible"] is False
        assert data["coverage_status"] == "inactive"

    @patch("routes.billing.check_eligibility", new_callable=AsyncMock)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_unknown_coverage(self, mock_list, mock_elig, client):
        """Empty 271 returns coverage_status=unknown."""
        mock_list.return_value = [
            {"name": "BCBS", "payer_name": "Blue Cross Blue Shield", "stedi_trading_partner_id": "BCBS_001"},
        ]
        mock_elig.return_value = MOCK_271_UNKNOWN

        resp = client.post("/api/modules/billing/eligibility/check", json=VALID_REQUEST)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_eligible"] is False
        assert data["coverage_status"] == "unknown"

    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_payer_not_found(self, mock_list, client):
        """Payer not found returns 404."""
        mock_list.return_value = []

        resp = client.post("/api/modules/billing/eligibility/check", json={
            **VALID_REQUEST,
            "payer_name": "Nonexistent Insurance",
        })
        assert resp.status_code == 404
        assert "Payer not found" in resp.json()["detail"]

    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_missing_trading_partner_id(self, mock_list, client):
        """Payer exists but has no trading partner ID — returns 422."""
        mock_list.return_value = [
            {"name": "LOCAL", "payer_name": "Local Insurance", "stedi_trading_partner_id": ""},
        ]

        resp = client.post("/api/modules/billing/eligibility/check", json={
            **VALID_REQUEST,
            "payer_name": "Local Insurance",
        })
        assert resp.status_code == 422
        assert "no Stedi trading partner ID" in resp.json()["detail"]

    @patch("routes.billing.check_eligibility", new_callable=AsyncMock)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_stedi_api_error(self, mock_list, mock_elig, client):
        """Stedi returns non-200 — propagates error."""
        from connectors.stedi import StediAPIError
        mock_list.return_value = [
            {"name": "BCBS", "payer_name": "Blue Cross Blue Shield", "stedi_trading_partner_id": "BCBS_001"},
        ]
        mock_elig.side_effect = StediAPIError(status_code=400, detail="Invalid request")

        resp = client.post("/api/modules/billing/eligibility/check", json=VALID_REQUEST)
        assert resp.status_code == 400

    @patch("routes.billing.check_eligibility", new_callable=AsyncMock)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_stedi_timeout(self, mock_list, mock_elig, client):
        """Stedi timeout returns 504."""
        from connectors.stedi import StediTimeoutError
        mock_list.return_value = [
            {"name": "BCBS", "payer_name": "Blue Cross Blue Shield", "stedi_trading_partner_id": "BCBS_001"},
        ]
        mock_elig.side_effect = StediTimeoutError("Timed out after 30s")

        resp = client.post("/api/modules/billing/eligibility/check", json=VALID_REQUEST)
        assert resp.status_code == 504


# ---------------------------------------------------------------------------
# Tests: GET eligibility check
# ---------------------------------------------------------------------------

class TestEligibilityCheckGet:

    @patch("routes.billing.check_eligibility", new_callable=AsyncMock)
    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_get_active_coverage(self, mock_list, mock_elig, client):
        """GET endpoint returns same structure as POST."""
        mock_list.return_value = [
            {"name": "BCBS", "payer_name": "Blue Cross Blue Shield", "stedi_trading_partner_id": "BCBS_001"},
        ]
        mock_elig.return_value = MOCK_271_ACTIVE

        resp = client.get("/api/modules/billing/eligibility/check", params=VALID_REQUEST)
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_eligible"] is True
        assert data["coverage_status"] == "active"
        assert data["member_name"] == "Jane Doe"

    @patch("routes.billing._list_frappe_docs", new_callable=AsyncMock)
    def test_get_payer_not_found(self, mock_list, client):
        """GET with unknown payer returns 404."""
        mock_list.return_value = []

        resp = client.get("/api/modules/billing/eligibility/check", params={
            "payer_name": "Nonexistent",
            "provider_npi": "x",
            "provider_name": "x",
            "member_id": "x",
            "member_first_name": "x",
            "member_last_name": "x",
            "member_dob": "1990-01-01",
        })
        assert resp.status_code == 404
