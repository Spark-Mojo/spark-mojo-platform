"""
Tests for billing routes — Stedi claim submission and 277CA webhook.

All Stedi HTTP calls are mocked. STEDI_SANDBOX=true uses mock responses.
Frappe API calls are also mocked since tests run without containers.
"""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Mock Frappe data
# ---------------------------------------------------------------------------

MOCK_CLAIM = {
    "name": "CLM-202604-0001",
    "patient_name": "Jane Doe",
    "patient_member_id": "MEM-12345",
    "patient_dob": "1990-01-15",
    "payer": "BCBS",
    "provider": "NPI-1234567890",
    "billing_provider": "",
    "date_of_service": "2026-04-01",
    "place_of_service": "11",
    "claim_charge_amount": 250.00,
    "canonical_state": "draft",
    "stedi_claim_id": None,
    "patient_control_number": "PCN-001",
    "submission_date": None,
    "acknowledgment_date": None,
    "adjudication_date": None,
    "paid_amount": None,
    "patient_responsibility": None,
    "prior_auth_number": "",
    "notes": "",
    "creation": "2026-04-01 10:00:00",
    "claim_lines": [
        {
            "line_number": 1,
            "cpt_code": "90837",
            "modifiers": "",
            "icd_codes": "F32.1,F41.1",
            "charge_amount": 250.00,
            "units": 1,
        }
    ],
}

MOCK_PAYER = {
    "name": "BCBS",
    "payer_name": "Blue Cross Blue Shield",
    "payer_short_name": "BCBS",
    "stedi_trading_partner_id": "BCBS_001",
    "payer_type": "commercial",
}

MOCK_PROVIDER = {
    "name": "NPI-1234567890",
    "provider_name": "Dr. Smith",
    "npi": "1234567890",
    "tax_id": "12-3456789",
    "taxonomy_code": "101YM0800X",
    "license_type": "LCSW",
}

MOCK_STEDI_SUCCESS = {
    "transactionId": "TEST-TXN-001",
    "status": "accepted",
    "editStatus": "accepted",
    "errors": [],
    "warnings": [],
}

MOCK_STEDI_REJECTION = {
    "transactionId": "TEST-TXN-002",
    "status": "rejected",
    "editStatus": "rejected",
    "errors": ["Invalid subscriber ID"],
    "warnings": [],
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

    # Force reimport to pick up env vars
    import importlib
    import routes.billing
    importlib.reload(routes.billing)

    from main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


def _mock_frappe_get(url, **kwargs):
    """Return mock Frappe responses based on URL path."""
    resp = MagicMock()
    resp.status_code = 200

    url_str = str(url)
    if "/api/resource/SM Claim/CLM-202604-0001" in url_str:
        resp.json.return_value = {"data": MOCK_CLAIM.copy()}
    elif "/api/resource/SM Claim/NONEXISTENT" in url_str:
        resp.status_code = 404
        resp.json.return_value = {"exc_type": "DoesNotExistError"}
        resp.raise_for_status.side_effect = _http_error(404)
    elif "/api/resource/SM Claim" in url_str and "filters" in str(kwargs):
        # Search by patient_control_number
        resp.json.return_value = {"data": [{"name": "CLM-202604-0001", "canonical_state": "submitted"}]}
    elif "/api/resource/SM Payer/BCBS" in url_str:
        resp.json.return_value = {"data": MOCK_PAYER.copy()}
    elif "/api/resource/SM Provider/NPI-1234567890" in url_str:
        resp.json.return_value = {"data": MOCK_PROVIDER.copy()}
    else:
        resp.status_code = 404
        resp.json.return_value = {"exc_type": "DoesNotExistError"}
        resp.raise_for_status.side_effect = _http_error(404)

    if resp.status_code == 200:
        resp.raise_for_status = MagicMock()

    return resp


def _mock_frappe_put(url, **kwargs):
    """Return mock Frappe update response."""
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": {"name": "CLM-202604-0001"}}
    resp.raise_for_status = MagicMock()
    return resp


def _http_error(status_code):
    """Create an httpx.HTTPStatusError side effect."""
    import httpx
    response = MagicMock()
    response.status_code = status_code
    return httpx.HTTPStatusError(
        f"HTTP {status_code}",
        request=MagicMock(),
        response=response,
    )


# ---------------------------------------------------------------------------
# Test: Successful claim submission (sandbox mode)
# ---------------------------------------------------------------------------

class TestClaimSubmission:

    @patch("routes.billing.httpx.AsyncClient")
    def test_submit_valid_claim_sandbox(self, MockClient, client):
        """Submit a valid claim in sandbox mode — returns accepted."""
        instance = AsyncMock()
        instance.get = AsyncMock(side_effect=_mock_frappe_get)
        instance.put = AsyncMock(side_effect=_mock_frappe_put)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.post(
            "/api/modules/billing/claims/submit",
            json={"claim_name": "CLM-202604-0001"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["stedi_claim_id"] == "TEST-TXN-001"
        assert data["edit_status"] == "accepted"
        assert data["submitted_at"] is not None

    @patch("routes.billing.httpx.AsyncClient")
    def test_submit_already_submitted_claim(self, MockClient, client):
        """Submit a claim that's already submitted — should error."""
        submitted_claim = MOCK_CLAIM.copy()
        submitted_claim["canonical_state"] = "submitted"

        def mock_get(url, **kwargs):
            resp = MagicMock()
            resp.status_code = 200
            resp.json.return_value = {"data": submitted_claim}
            resp.raise_for_status = MagicMock()
            return resp

        instance = AsyncMock()
        instance.get = AsyncMock(side_effect=mock_get)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.post(
            "/api/modules/billing/claims/submit",
            json={"claim_name": "CLM-202604-0001"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert data["edit_status"] == "error"
        assert any("submitted" in e.lower() for e in data["errors"])

    @patch("routes.billing.httpx.AsyncClient")
    def test_submit_stedi_rejection(self, MockClient, client):
        """Stedi rejects the claim — state reset to draft."""
        import importlib
        import routes.billing
        # Temporarily disable sandbox to test rejection flow
        with patch.object(routes.billing, "STEDI_SANDBOX", False), \
             patch.object(routes.billing, "STEDI_API_KEY", "test-key"):

            def mock_get(url, **kwargs):
                return _mock_frappe_get(url, **kwargs)

            def mock_put(url, **kwargs):
                return _mock_frappe_put(url, **kwargs)

            # Mock Stedi POST to return rejection
            import httpx as real_httpx
            stedi_error_resp = MagicMock()
            stedi_error_resp.status_code = 422
            stedi_error_resp.json.return_value = {
                "errors": ["Invalid subscriber ID"],
                "warnings": [],
            }
            stedi_error_resp.text = "Validation failed"

            def mock_post(url, **kwargs):
                url_str = str(url)
                if "stedi" in url_str or "healthcare" in url_str:
                    raise real_httpx.HTTPStatusError(
                        "422", request=MagicMock(), response=stedi_error_resp,
                    )
                return MagicMock(status_code=200, json=lambda: {"data": {}})

            instance = AsyncMock()
            instance.get = AsyncMock(side_effect=mock_get)
            instance.put = AsyncMock(side_effect=mock_put)
            instance.post = AsyncMock(side_effect=mock_post)
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            resp = client.post(
                "/api/modules/billing/claims/submit",
                json={"claim_name": "CLM-202604-0001"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is False
            assert data["edit_status"] == "rejected"

    @patch("routes.billing.httpx.AsyncClient")
    def test_submit_network_error(self, MockClient, client):
        """Network error — claim state unchanged."""
        import routes.billing
        with patch.object(routes.billing, "STEDI_SANDBOX", False), \
             patch.object(routes.billing, "STEDI_API_KEY", "test-key"):

            def mock_get(url, **kwargs):
                return _mock_frappe_get(url, **kwargs)

            def mock_post(url, **kwargs):
                url_str = str(url)
                if "stedi" in url_str or "healthcare" in url_str:
                    raise ConnectionError("Connection refused")
                return MagicMock(status_code=200)

            instance = AsyncMock()
            instance.get = AsyncMock(side_effect=mock_get)
            instance.post = AsyncMock(side_effect=mock_post)
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            resp = client.post(
                "/api/modules/billing/claims/submit",
                json={"claim_name": "CLM-202604-0001"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is False
            assert data["edit_status"] == "error"
            assert any("Network error" in e for e in data["errors"])

    def test_submit_missing_api_key(self, client):
        """STEDI_API_KEY missing and sandbox disabled — returns 503."""
        import routes.billing
        with patch.object(routes.billing, "STEDI_API_KEY", ""), \
             patch.object(routes.billing, "STEDI_SANDBOX", False):
            resp = client.post(
                "/api/modules/billing/claims/submit",
                json={"claim_name": "CLM-202604-0001"},
            )
            assert resp.status_code == 503


# ---------------------------------------------------------------------------
# Test: 277CA Webhook (BILL-011)
# ---------------------------------------------------------------------------


def _mock_277ca_client(claim_state="submitted", claim_found=True):
    """Create a mock httpx client for 277CA webhook tests."""
    instance = AsyncMock()

    async def mock_get(url, **kwargs):
        resp = MagicMock()
        url_str = str(url)
        if "/api/resource/SM Claim" in url_str and "filters" in str(kwargs):
            resp.status_code = 200
            if claim_found:
                resp.json.return_value = {
                    "data": [{"name": "CLM-202604-0001", "canonical_state": claim_state}]
                }
            else:
                resp.json.return_value = {"data": []}
            resp.raise_for_status = MagicMock()
        else:
            resp.status_code = 404
            resp.json.return_value = {}
            resp.raise_for_status = MagicMock()
        return resp

    async def mock_post(url, **kwargs):
        resp = MagicMock()
        url_str = str(url)
        if "api_transition_state" in url_str:
            resp.status_code = 200
            resp.json.return_value = {
                "message": {"claim_name": "CLM-202604-0001", "canonical_state": "adjudicating"}
            }
            resp.raise_for_status = MagicMock()
        else:
            resp.status_code = 200
            resp.json.return_value = {"data": {}}
            resp.raise_for_status = MagicMock()
        return resp

    instance.get = mock_get
    instance.post = mock_post
    instance.__aenter__ = AsyncMock(return_value=instance)
    instance.__aexit__ = AsyncMock(return_value=False)
    return instance


class TestWebhook277CA:

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_a1_accepted(self, MockClient, client):
        """A1 accepted — claim transitions to adjudicating."""
        MockClient.return_value = _mock_277ca_client(claim_state="submitted")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-001",
            "claim_control_number": "PCN-001",
            "stc_category": "A1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["claim"] == "CLM-202604-0001"
        assert data["new_state"] == "adjudicating"

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_a2_accepted_with_errors(self, MockClient, client):
        """A2 accepted with errors — claim transitions to adjudicating."""
        MockClient.return_value = _mock_277ca_client(claim_state="submitted")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-002",
            "claim_control_number": "PCN-001",
            "stc_category": "A2",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["new_state"] == "adjudicating"

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_a0_forwarded(self, MockClient, client):
        """A0 forwarded — claim transitions to adjudicating."""
        MockClient.return_value = _mock_277ca_client(claim_state="submitted")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-003",
            "claim_control_number": "PCN-001",
            "stc_category": "A0",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["new_state"] == "adjudicating"

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_r3_rejected(self, MockClient, client):
        """R3 rejected — claim transitions to rejected."""
        MockClient.return_value = _mock_277ca_client(claim_state="submitted")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-004",
            "claim_control_number": "PCN-001",
            "stc_category": "R3",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["new_state"] == "rejected"

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_a3_rejected(self, MockClient, client):
        """A3 rejected — claim transitions to rejected."""
        MockClient.return_value = _mock_277ca_client(claim_state="submitted")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-005",
            "claim_control_number": "PCN-001",
            "stc_category": "A3",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["new_state"] == "rejected"

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_e0_manual_review(self, MockClient, client):
        """E0 payer error — no transition, warning returned."""
        MockClient.return_value = _mock_277ca_client(claim_state="submitted")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-006",
            "claim_control_number": "PCN-001",
            "stc_category": "E0",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        assert "manual review" in data["detail"].lower()

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_a4_manual_review(self, MockClient, client):
        """A4 not found — no transition, warning returned."""
        MockClient.return_value = _mock_277ca_client(claim_state="submitted")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-007",
            "claim_control_number": "PCN-001",
            "stc_category": "A4",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        assert "manual review" in data["detail"].lower()

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_claim_not_found(self, MockClient, client):
        """No matching claim — return 200 with warning."""
        MockClient.return_value = _mock_277ca_client(claim_found=False)
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-008",
            "claim_control_number": "UNKNOWN-PCN",
            "stc_category": "A1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        assert "claim not found" in data["detail"]

    @patch("routes.billing.httpx.AsyncClient")
    def test_277ca_claim_not_in_submitted_state(self, MockClient, client):
        """Claim exists but not in submitted state — no transition, warning."""
        MockClient.return_value = _mock_277ca_client(claim_state="adjudicating")
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-009",
            "claim_control_number": "PCN-001",
            "stc_category": "A1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        assert "not in submitted state" in data["detail"]

    def test_277ca_missing_control_number(self, client):
        """Missing claim_control_number — return 200 with warning."""
        resp = client.post("/api/webhooks/stedi/277ca", json={
            "stedi_transaction_id": "TXN-010",
            "stc_category": "A1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        assert "missing" in data["detail"]


# ---------------------------------------------------------------------------
# Test: Claim status endpoint
# ---------------------------------------------------------------------------

class TestClaimStatus:

    @patch("routes.billing.httpx.AsyncClient")
    def test_status_existing_claim(self, MockClient, client):
        """Status of existing claim — returns timeline."""
        submitted_claim = MOCK_CLAIM.copy()
        submitted_claim["canonical_state"] = "submitted"
        submitted_claim["submission_date"] = "2026-04-01"

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": submitted_claim}
        mock_resp.raise_for_status = MagicMock()

        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_resp)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.get("/api/modules/billing/claims/CLM-202604-0001/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["claim_name"] == "CLM-202604-0001"
        assert data["canonical_state"] == "submitted"
        assert len(data["timeline"]) >= 1

    @patch("routes.billing.httpx.AsyncClient")
    def test_status_nonexistent_claim(self, MockClient, client):
        """Status of unknown claim — returns 404."""
        import httpx as real_httpx
        error_resp = MagicMock()
        error_resp.status_code = 404
        error_resp.text = "Not found"
        error_resp.json.return_value = {"exc_type": "DoesNotExistError"}

        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.raise_for_status.side_effect = real_httpx.HTTPStatusError(
            "404", request=MagicMock(), response=error_resp,
        )

        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_resp)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.get("/api/modules/billing/claims/NONEXISTENT/status")
        assert resp.status_code == 404
