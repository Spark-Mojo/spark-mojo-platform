"""
Tests for BILL-004: 835 ERA processing — webhook, ERA detail, denials.

All Stedi HTTP calls and Frappe API calls are mocked.
"""

import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Synthetic 835 data
# ---------------------------------------------------------------------------

SYNTHETIC_835_RESPONSE = {
    "transactionId": "ERA-TXN-001",
    "payerIdentifier": "BCBS_001",
    "paymentDate": "2026-04-05",
    "checkOrEftNumber": "CHK-999",
    "claimPayments": [
        {
            "patientControlNumber": "PCN-MATCHED-001",
            "chargedAmount": 200.00,
            "paidAmount": 170.00,
            "patientResponsibility": 30.00,
            "serviceLines": [{"procedureCode": "90837"}],
            "adjustments": [
                {"groupCode": "PR", "reasonCode": "1", "amount": 30.00}
            ],
            "remarkCodes": [],
        },
        {
            "patientControlNumber": "PCN-UNMATCHED-999",
            "chargedAmount": 100.00,
            "paidAmount": 80.00,
            "patientResponsibility": 20.00,
            "serviceLines": [{"procedureCode": "90834"}],
            "adjustments": [
                {"groupCode": "PR", "reasonCode": "1", "amount": 20.00}
            ],
            "remarkCodes": [],
        },
        {
            "patientControlNumber": "PCN-DENIED-001",
            "chargedAmount": 150.00,
            "paidAmount": 0,
            "patientResponsibility": 0,
            "serviceLines": [{"procedureCode": "90837"}],
            "adjustments": [
                {"groupCode": "CO", "reasonCode": "4", "amount": 150.00}
            ],
            "remarkCodes": ["N130"],
        },
    ],
}

MOCK_MATCHED_CLAIM = {
    "name": "CLM-202604-0001",
    "canonical_state": "adjudicating",
    "claim_charge_amount": 200.00,
    "paid_amount": 0,
    "adjustment_amount": 0,
    "patient_responsibility": 0,
    "payer": "BCBS",
}

MOCK_DENIED_CLAIM = {
    "name": "CLM-202604-0002",
    "canonical_state": "adjudicating",
    "claim_charge_amount": 150.00,
    "paid_amount": 0,
    "adjustment_amount": 0,
    "patient_responsibility": 0,
    "payer": "BCBS",
}

MOCK_PAYER = {
    "name": "BCBS",
    "stedi_trading_partner_id": "BCBS_001",
    "appeal_window_days": 90,
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    os.environ["STEDI_API_KEY"] = "test-key"
    os.environ["STEDI_SANDBOX"] = "false"
    os.environ["FRAPPE_URL"] = "http://localhost:8080"
    os.environ["FRAPPE_API_KEY"] = "test"
    os.environ["FRAPPE_API_SECRET"] = "test"
    os.environ.setdefault("DEV_MODE", "true")

    import importlib
    import routes.billing
    importlib.reload(routes.billing)

    from main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


def _http_error(status_code):
    import httpx
    response = MagicMock()
    response.status_code = status_code
    return httpx.HTTPStatusError(f"HTTP {status_code}", request=MagicMock(), response=response)


def _build_mock_client(get_side_effect=None, post_side_effect=None, put_side_effect=None):
    """Build a fully mocked httpx.AsyncClient context manager."""
    instance = AsyncMock()
    if get_side_effect:
        instance.get = AsyncMock(side_effect=get_side_effect)
    if post_side_effect:
        instance.post = AsyncMock(side_effect=post_side_effect)
    if put_side_effect:
        instance.put = AsyncMock(side_effect=put_side_effect)
    instance.__aenter__ = AsyncMock(return_value=instance)
    instance.__aexit__ = AsyncMock(return_value=False)
    return instance


def _make_835_mock_get(url, **kwargs):
    """Mock GET requests for 835 processing."""
    resp = MagicMock()
    resp.status_code = 200
    url_str = str(url)

    if "/healthcare/era/" in url_str:
        # Stedi ERA fetch
        resp.json.return_value = SYNTHETIC_835_RESPONSE
    elif "/api/resource/SM Payer" in url_str and "filters" in str(kwargs):
        resp.json.return_value = {"data": [MOCK_PAYER]}
    elif "/api/resource/SM Claim" in url_str and "filters" in str(kwargs):
        params = kwargs.get("params", {})
        filter_str = str(params.get("filters", ""))
        if "PCN-MATCHED-001" in filter_str:
            resp.json.return_value = {"data": [MOCK_MATCHED_CLAIM]}
        elif "PCN-DENIED-001" in filter_str:
            resp.json.return_value = {"data": [MOCK_DENIED_CLAIM]}
        else:
            resp.json.return_value = {"data": []}
    elif "/api/resource/SM Claim/CLM-202604-0001" in url_str:
        resp.json.return_value = {"data": MOCK_MATCHED_CLAIM.copy()}
    elif "/api/resource/SM Claim/CLM-202604-0002" in url_str:
        resp.json.return_value = {"data": MOCK_DENIED_CLAIM.copy()}
    else:
        resp.json.return_value = {"data": []}

    resp.raise_for_status = MagicMock()
    return resp


def _make_835_mock_post(url, **kwargs):
    """Mock POST requests for 835 processing."""
    resp = MagicMock()
    resp.status_code = 200
    url_str = str(url)

    if "/api/resource/SM ERA" in url_str:
        body = kwargs.get("json", {})
        resp.json.return_value = {"data": {"name": "ERA-2026.04-0001", **body}}
    elif "/api/resource/SM Denial" in url_str:
        resp.json.return_value = {"data": {"name": "DEN-2026.04-0001"}}
    elif "/api/resource/SM Task" in url_str:
        resp.json.return_value = {"data": {"name": "TASK-001"}}
    else:
        resp.json.return_value = {"data": {}}

    resp.raise_for_status = MagicMock()
    return resp


def _make_835_mock_put(url, **kwargs):
    """Mock PUT requests for 835 processing."""
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": {"name": "updated"}}
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# Tests: 835 Webhook
# ---------------------------------------------------------------------------

class TestWebhook835:

    @patch("routes.billing.httpx.AsyncClient")
    def test_835_happy_path_full_processing(self, MockClient, client):
        """Full 835 with matched, unmatched, and denied lines."""
        MockClient.return_value = _build_mock_client(
            get_side_effect=_make_835_mock_get,
            post_side_effect=_make_835_mock_post,
            put_side_effect=_make_835_mock_put,
        )

        resp = client.post("/api/webhooks/stedi/835", json={
            "transactionId": "ERA-TXN-001",
            "x12": {"transactionSetIdentifier": "835"},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["era_name"] == "ERA-2026.04-0001"
        assert data["total_claims"] == 3
        assert data["matched"] == 2  # PCN-MATCHED-001 + PCN-DENIED-001
        assert data["unmatched"] == 1  # PCN-UNMATCHED-999

    @patch("routes.billing.httpx.AsyncClient")
    def test_835_non_835_ignored(self, MockClient, client):
        """Non-835 webhook is ignored."""
        resp = client.post("/api/webhooks/stedi/835", json={
            "transactionId": "TXN-999",
            "x12": {"transactionSetIdentifier": "277"},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ignored"

    @patch("routes.billing.httpx.AsyncClient")
    def test_835_matched_payment_updates_claim(self, MockClient, client):
        """Matched payment auto-posts and updates claim state."""
        # Use a single matched claim for simpler verification
        single_835 = {
            **SYNTHETIC_835_RESPONSE,
            "claimPayments": [SYNTHETIC_835_RESPONSE["claimPayments"][0]],
        }

        def mock_get(url, **kwargs):
            resp = MagicMock()
            resp.status_code = 200
            url_str = str(url)
            if "/healthcare/era/" in url_str:
                resp.json.return_value = single_835
            elif "/api/resource/SM Payer" in url_str:
                resp.json.return_value = {"data": [MOCK_PAYER]}
            elif "/api/resource/SM Claim" in url_str and "filters" in str(kwargs):
                resp.json.return_value = {"data": [MOCK_MATCHED_CLAIM]}
            elif "/api/resource/SM Claim/CLM-202604-0001" in url_str:
                resp.json.return_value = {"data": MOCK_MATCHED_CLAIM.copy()}
            else:
                resp.json.return_value = {"data": []}
            resp.raise_for_status = MagicMock()
            return resp

        put_calls = []
        def mock_put(url, **kwargs):
            put_calls.append({"url": str(url), "json": kwargs.get("json", {})})
            resp = MagicMock()
            resp.status_code = 200
            resp.json.return_value = {"data": {"name": "updated"}}
            resp.raise_for_status = MagicMock()
            return resp

        MockClient.return_value = _build_mock_client(
            get_side_effect=mock_get,
            post_side_effect=_make_835_mock_post,
            put_side_effect=mock_put,
        )

        resp = client.post("/api/webhooks/stedi/835", json={
            "transactionId": "ERA-TXN-001",
            "x12": {"transactionSetIdentifier": "835"},
        })
        assert resp.status_code == 200

        # Verify claim update call was made
        claim_updates = [c for c in put_calls if "SM Claim" in c["url"]]
        assert len(claim_updates) >= 1
        update_data = claim_updates[0]["json"]
        assert update_data["paid_amount"] == 170.00
        assert update_data["canonical_state"] == "paid"

    @patch("routes.billing.httpx.AsyncClient")
    def test_835_partial_payment(self, MockClient, client):
        """Partial payment sets canonical_state to partial_paid."""
        partial_835 = {
            **SYNTHETIC_835_RESPONSE,
            "claimPayments": [{
                "patientControlNumber": "PCN-MATCHED-001",
                "chargedAmount": 200.00,
                "paidAmount": 50.00,
                "patientResponsibility": 20.00,
                "serviceLines": [{"procedureCode": "90837"}],
                "adjustments": [{"groupCode": "PR", "reasonCode": "1", "amount": 20.00}],
                "remarkCodes": [],
            }],
        }

        def mock_get(url, **kwargs):
            resp = MagicMock()
            resp.status_code = 200
            url_str = str(url)
            if "/healthcare/era/" in url_str:
                resp.json.return_value = partial_835
            elif "/api/resource/SM Payer" in url_str:
                resp.json.return_value = {"data": [MOCK_PAYER]}
            elif "/api/resource/SM Claim" in url_str and "filters" in str(kwargs):
                resp.json.return_value = {"data": [MOCK_MATCHED_CLAIM]}
            elif "/api/resource/SM Claim/CLM-202604-0001" in url_str:
                resp.json.return_value = {"data": MOCK_MATCHED_CLAIM.copy()}
            else:
                resp.json.return_value = {"data": []}
            resp.raise_for_status = MagicMock()
            return resp

        put_calls = []
        def mock_put(url, **kwargs):
            put_calls.append({"url": str(url), "json": kwargs.get("json", {})})
            resp = MagicMock()
            resp.status_code = 200
            resp.json.return_value = {"data": {"name": "updated"}}
            resp.raise_for_status = MagicMock()
            return resp

        MockClient.return_value = _build_mock_client(
            get_side_effect=mock_get,
            post_side_effect=_make_835_mock_post,
            put_side_effect=mock_put,
        )

        resp = client.post("/api/webhooks/stedi/835", json={
            "transactionId": "ERA-TXN-001",
            "x12": {"transactionSetIdentifier": "835"},
        })
        assert resp.status_code == 200

        claim_updates = [c for c in put_calls if "SM Claim" in c["url"] and "canonical_state" in c.get("json", {})]
        assert any(c["json"]["canonical_state"] == "partial_paid" for c in claim_updates)

    @patch("routes.billing.httpx.AsyncClient")
    def test_835_denial_detection(self, MockClient, client):
        """Denial creates SM Denial record and updates claim to denied."""
        denial_835 = {
            **SYNTHETIC_835_RESPONSE,
            "claimPayments": [SYNTHETIC_835_RESPONSE["claimPayments"][2]],  # denied line only
        }

        def mock_get(url, **kwargs):
            resp = MagicMock()
            resp.status_code = 200
            url_str = str(url)
            if "/healthcare/era/" in url_str:
                resp.json.return_value = denial_835
            elif "/api/resource/SM Payer" in url_str:
                resp.json.return_value = {"data": [MOCK_PAYER]}
            elif "/api/resource/SM Claim" in url_str and "filters" in str(kwargs):
                resp.json.return_value = {"data": [MOCK_DENIED_CLAIM]}
            elif "/api/resource/SM Claim/CLM-202604-0002" in url_str:
                resp.json.return_value = {"data": MOCK_DENIED_CLAIM.copy()}
            else:
                resp.json.return_value = {"data": []}
            resp.raise_for_status = MagicMock()
            return resp

        post_calls = []
        def mock_post(url, **kwargs):
            post_calls.append({"url": str(url), "json": kwargs.get("json", {})})
            resp = MagicMock()
            resp.status_code = 200
            url_str = str(url)
            if "/api/resource/SM ERA" in url_str:
                resp.json.return_value = {"data": {"name": "ERA-2026.04-0001"}}
            elif "/api/resource/SM Denial" in url_str:
                resp.json.return_value = {"data": {"name": "DEN-2026.04-0001"}}
            else:
                resp.json.return_value = {"data": {}}
            resp.raise_for_status = MagicMock()
            return resp

        put_calls = []
        def mock_put(url, **kwargs):
            put_calls.append({"url": str(url), "json": kwargs.get("json", {})})
            resp = MagicMock()
            resp.status_code = 200
            resp.json.return_value = {"data": {"name": "updated"}}
            resp.raise_for_status = MagicMock()
            return resp

        MockClient.return_value = _build_mock_client(
            get_side_effect=mock_get,
            post_side_effect=mock_post,
            put_side_effect=mock_put,
        )

        resp = client.post("/api/webhooks/stedi/835", json={
            "transactionId": "ERA-TXN-001",
            "x12": {"transactionSetIdentifier": "835"},
        })
        assert resp.status_code == 200

        # Verify SM Denial was created
        denial_posts = [c for c in post_calls if "SM Denial" in c["url"]]
        assert len(denial_posts) == 1
        denial_data = denial_posts[0]["json"]
        assert denial_data["claim"] == "CLM-202604-0002"
        assert denial_data["denied_amount"] == 150.00
        assert denial_data["canonical_state"] == "new"
        assert denial_data["carc_codes"] == "4"
        assert denial_data["appeal_deadline"] == "2026-07-04"  # 90 days from 2026-04-05

        # Verify claim state updated to denied
        claim_puts = [c for c in put_calls if "SM Claim" in c["url"] and "canonical_state" in c.get("json", {})]
        assert any(c["json"]["canonical_state"] == "denied" for c in claim_puts)

    @patch("routes.billing.httpx.AsyncClient")
    def test_835_unmatched_creates_task(self, MockClient, client):
        """Unmatched line creates SM Task."""
        unmatched_835 = {
            **SYNTHETIC_835_RESPONSE,
            "claimPayments": [SYNTHETIC_835_RESPONSE["claimPayments"][1]],  # unmatched only
        }

        def mock_get(url, **kwargs):
            resp = MagicMock()
            resp.status_code = 200
            url_str = str(url)
            if "/healthcare/era/" in url_str:
                resp.json.return_value = unmatched_835
            elif "/api/resource/SM Payer" in url_str:
                resp.json.return_value = {"data": [MOCK_PAYER]}
            elif "/api/resource/SM Claim" in url_str and "filters" in str(kwargs):
                resp.json.return_value = {"data": []}  # no match
            else:
                resp.json.return_value = {"data": []}
            resp.raise_for_status = MagicMock()
            return resp

        post_calls = []
        def mock_post(url, **kwargs):
            post_calls.append({"url": str(url), "json": kwargs.get("json", {})})
            resp = MagicMock()
            resp.status_code = 200
            url_str = str(url)
            if "/api/resource/SM ERA" in url_str:
                resp.json.return_value = {"data": {"name": "ERA-2026.04-0001"}}
            elif "/api/resource/SM Task" in url_str:
                resp.json.return_value = {"data": {"name": "TASK-001"}}
            else:
                resp.json.return_value = {"data": {}}
            resp.raise_for_status = MagicMock()
            return resp

        MockClient.return_value = _build_mock_client(
            get_side_effect=mock_get,
            post_side_effect=mock_post,
            put_side_effect=_make_835_mock_put,
        )

        resp = client.post("/api/webhooks/stedi/835", json={
            "transactionId": "ERA-TXN-001",
            "x12": {"transactionSetIdentifier": "835"},
        })
        assert resp.status_code == 200

        task_posts = [c for c in post_calls if "SM Task" in c["url"]]
        assert len(task_posts) == 1
        task_data = task_posts[0]["json"]
        assert "PCN-UNMATCHED-999" in task_data["title"]
        assert task_data["canonical_state"] == "open"

    @patch("routes.billing.httpx.AsyncClient")
    def test_835_era_totals(self, MockClient, client):
        """ERA totals are correct after processing."""
        MockClient.return_value = _build_mock_client(
            get_side_effect=_make_835_mock_get,
            post_side_effect=_make_835_mock_post,
            put_side_effect=_make_835_mock_put,
        )

        resp = client.post("/api/webhooks/stedi/835", json={
            "transactionId": "ERA-TXN-001",
            "x12": {"transactionSetIdentifier": "835"},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_claims"] == 3
        assert data["matched"] == 2
        assert data["unmatched"] == 1


# ---------------------------------------------------------------------------
# Tests: GET endpoints
# ---------------------------------------------------------------------------

class TestERADetail:

    @patch("routes.billing.httpx.AsyncClient")
    def test_get_era_detail(self, MockClient, client):
        """GET /era/{era_name} returns full ERA."""
        era_data = {
            "name": "ERA-2026.04-0001",
            "stedi_transaction_id": "ERA-TXN-001",
            "payer": "BCBS",
            "era_date": "2026-04-05",
            "check_eft_number": "CHK-999",
            "total_paid_amount": 250.00,
            "total_claims": 3,
            "matched_claims": 2,
            "unmatched_claims": 1,
            "processing_status": "partial_posted",
            "received_at": "2026-04-05 12:00:00",
            "processed_at": "2026-04-05 12:00:01",
            "era_lines": [
                {
                    "claim": "CLM-202604-0001",
                    "patient_control_number": "PCN-001",
                    "cpt_code": "90837",
                    "charged_amount": 200.0,
                    "paid_amount": 170.0,
                    "adjustment_amount": 30.0,
                    "patient_responsibility": 30.0,
                    "carc_codes": "1",
                    "rarc_codes": "",
                    "is_denied": 0,
                    "match_status": "matched",
                }
            ],
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": era_data}
        mock_resp.raise_for_status = MagicMock()

        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_resp)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.get("/api/modules/billing/era/ERA-2026.04-0001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "ERA-2026.04-0001"
        assert data["total_paid_amount"] == 250.0
        assert len(data["era_lines"]) == 1
        assert data["era_lines"][0]["match_status"] == "matched"


class TestDenials:

    @patch("routes.billing.httpx.AsyncClient")
    def test_list_denials(self, MockClient, client):
        """GET /denials returns list."""
        denials = [
            {"name": "DEN-2026.04-0001", "claim": "CLM-001", "denial_date": "2026-04-05",
             "carc_codes": "4", "denied_amount": 150.0, "canonical_state": "new"},
        ]

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": denials}
        mock_resp.raise_for_status = MagicMock()

        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_resp)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.get("/api/modules/billing/denials")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["data"][0]["name"] == "DEN-2026.04-0001"

    @patch("routes.billing.httpx.AsyncClient")
    def test_list_denials_with_filters(self, MockClient, client):
        """GET /denials with status filter."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": []}
        mock_resp.raise_for_status = MagicMock()

        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_resp)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.get("/api/modules/billing/denials?status=new&date_from=2026-04-01")
        assert resp.status_code == 200

    @patch("routes.billing.httpx.AsyncClient")
    def test_get_denial_detail(self, MockClient, client):
        """GET /denials/{name} returns full denial."""
        denial = {
            "name": "DEN-2026.04-0001",
            "claim": "CLM-001",
            "era": "ERA-001",
            "denial_date": "2026-04-05",
            "carc_codes": "4",
            "rarc_codes": "N130",
            "denied_amount": 150.0,
            "canonical_state": "new",
            "appeal_deadline": "2026-07-04",
            "assigned_to": None,
            "notes": None,
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": denial}
        mock_resp.raise_for_status = MagicMock()

        instance = AsyncMock()
        instance.get = AsyncMock(return_value=mock_resp)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = instance

        resp = client.get("/api/modules/billing/denials/DEN-2026.04-0001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "DEN-2026.04-0001"
        assert data["denied_amount"] == 150.0
        assert data["appeal_deadline"] == "2026-07-04"
