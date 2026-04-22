"""Tests for stripe_webhooks routes — Stripe webhook handler."""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["DEV_MODE"] = "true"
os.environ["ADMIN_FRAPPE_URL"] = "http://admin.test:8080"

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

ADMIN_URL = "http://admin.test:8080"


@pytest.fixture
def client():
    return TestClient(app)


def _make_stripe_event(
    event_id="evt_TEST123",
    event_type="customer.subscription.created",
    data_object_id="sub_TEST456",
):
    return {
        "id": event_id,
        "type": event_type,
        "data": {
            "object": {
                "id": data_object_id,
            },
        },
    }


def _mock_frappe_get_response(data, status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = {"data": data}
    return resp


def _mock_frappe_post_response(name="evt_TEST123", status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = {"data": {"name": name}}
    resp.text = "ok"
    return resp


def _mock_frappe_put_response(status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = "ok"
    return resp


def _setup_httpx_mock(mock_httpx_cls, get_response, post_response=None,
                      put_response=None):
    mock_client = AsyncMock()
    mock_httpx_cls.return_value.__aenter__ = AsyncMock(
        return_value=mock_client,
    )
    mock_httpx_cls.return_value.__aexit__ = AsyncMock(return_value=False)
    mock_client.get.return_value = get_response
    if post_response:
        mock_client.post.return_value = post_response
    if put_response:
        mock_client.put.return_value = put_response
    return mock_client


def _webhook_post(client, payload=b'{"test": true}', sig="test_sig_123"):
    headers = {}
    if sig is not None:
        headers["stripe-signature"] = sig
    return client.post(
        "/api/webhooks/stripe/billing",
        content=payload,
        headers=headers,
    )


# --- AC1: Valid signed payload → 200, event log created with status=processed ---

def test_valid_webhook_success(client):
    event = _make_stripe_event()
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               return_value=event), \
         patch("routes.stripe_webhooks.httpx.AsyncClient") as mock_httpx:

        mock_client = _setup_httpx_mock(
            mock_httpx,
            _mock_frappe_get_response([]),
            _mock_frappe_post_response("evt_TEST123"),
            _mock_frappe_put_response(),
        )

        resp = _webhook_post(client)
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

        mock_client.post.assert_called_once()
        post_call_json = mock_client.post.call_args.kwargs.get("json", {})
        assert post_call_json["stripe_event_id"] == "evt_TEST123"
        assert post_call_json["status"] == "received"

        mock_client.put.assert_called_once()


# --- AC2: Invalid signature → 400 ---

def test_invalid_signature(client):
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               side_effect=__import__("stripe").SignatureVerificationError(
                   "bad sig", "sig_header",
               )):

        resp = _webhook_post(client)
        assert resp.status_code == 400
        assert resp.json()["detail"] == "invalid signature"


# --- AC3: Invalid/corrupt payload → 400 ---

def test_invalid_payload(client):
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               side_effect=ValueError("bad json")):

        resp = _webhook_post(client, payload=b"not-json")
        assert resp.status_code == 400
        assert resp.json()["detail"] == "invalid payload"


# --- AC4: Duplicate event ID → 200 already_processed ---

def test_duplicate_event_already_processed(client):
    event = _make_stripe_event()
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               return_value=event), \
         patch("routes.stripe_webhooks.httpx.AsyncClient") as mock_httpx, \
         patch("routes.stripe_webhooks.dispatch_event") as mock_dispatch:

        _setup_httpx_mock(
            mock_httpx,
            _mock_frappe_get_response([{"name": "evt_TEST123"}]),
        )

        resp = _webhook_post(client)
        assert resp.status_code == 200
        assert resp.json() == {"status": "already_processed"}
        mock_dispatch.assert_not_called()


# --- AC5: Handler raises exception → 500, status=failed ---

def test_handler_exception_sets_failed(client):
    event = _make_stripe_event()
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               return_value=event), \
         patch("routes.stripe_webhooks.httpx.AsyncClient") as mock_httpx, \
         patch("routes.stripe_webhooks.dispatch_event",
               side_effect=RuntimeError("handler crashed")):

        mock_client = _setup_httpx_mock(
            mock_httpx,
            _mock_frappe_get_response([]),
            _mock_frappe_post_response("evt_TEST123"),
            _mock_frappe_put_response(),
        )

        resp = _webhook_post(client)
        assert resp.status_code == 500
        assert "webhook processing failed" in resp.json()["detail"]

        put_call_json = mock_client.put.call_args.kwargs.get("json", {})
        assert put_call_json["status"] == "failed"
        assert "handler crashed" in put_call_json["error_message"]


# --- AC6: Unhandled event type → 200, processed ---

def test_unhandled_event_type_ok(client):
    event = _make_stripe_event(event_type="charge.dispute.created")
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               return_value=event), \
         patch("routes.stripe_webhooks.httpx.AsyncClient") as mock_httpx:

        _setup_httpx_mock(
            mock_httpx,
            _mock_frappe_get_response([]),
            _mock_frappe_post_response("evt_UNKNOWN"),
            _mock_frappe_put_response(),
        )

        resp = _webhook_post(client)
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


# --- AC7: Missing stripe-signature header → 400 ---

def test_missing_signature_header(client):
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               side_effect=__import__("stripe").SignatureVerificationError(
                   "no sig", "",
               )):

        resp = _webhook_post(client, sig="")
        assert resp.status_code == 400


# --- AC8: Missing webhook secret → 500 ---

def test_missing_webhook_secret(client):
    from secrets_loader import SecretNotFoundError
    with patch(
        "routes.stripe_webhooks.read_secret",
        side_effect=SecretNotFoundError("stripe_webhook_secret not found"),
    ), patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL):

        resp = _webhook_post(client)
        assert resp.status_code == 500
        assert "Webhook secret not configured" in resp.json()["detail"]


# --- AC9: Admin Frappe URL not configured → 500 ---

def test_admin_url_not_configured(client):
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ""):

        resp = _webhook_post(client)
        assert resp.status_code == 500
        assert "Admin site not configured" in resp.json()["detail"]


# --- AC10: Event log creation failure → 500 ---

def test_event_log_creation_failure(client):
    event = _make_stripe_event()
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               return_value=event), \
         patch("routes.stripe_webhooks.httpx.AsyncClient") as mock_httpx:

        post_resp = MagicMock()
        post_resp.status_code = 500
        post_resp.text = "Internal Server Error"
        _setup_httpx_mock(
            mock_httpx,
            _mock_frappe_get_response([]),
            post_resp,
        )

        resp = _webhook_post(client)
        assert resp.status_code == 500
        assert "Failed to create event log" in resp.json()["detail"]


# --- AC11: Subscription event dispatches to handle_subscription_sync ---

def test_subscription_event_dispatches(client):
    event = _make_stripe_event(
        event_type="customer.subscription.updated",
        data_object_id="sub_DISPATCH",
    )
    mock_handler = AsyncMock(return_value=None)
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               return_value=event), \
         patch("routes.stripe_webhooks.httpx.AsyncClient") as mock_httpx, \
         patch.dict("routes.stripe_webhooks.HANDLERS", {
             "customer.subscription.updated": mock_handler,
         }):

        _setup_httpx_mock(
            mock_httpx,
            _mock_frappe_get_response([]),
            _mock_frappe_post_response("evt_SUB"),
            _mock_frappe_put_response(),
        )

        resp = _webhook_post(client)
        assert resp.status_code == 200
        mock_handler.assert_called_once_with({"id": "sub_DISPATCH"})


# --- AC12: Invoice event dispatches to handle_invoice_sync ---

def test_invoice_event_dispatches(client):
    event = _make_stripe_event(
        event_type="invoice.finalized",
        data_object_id="inv_DISPATCH",
    )
    mock_handler = AsyncMock(return_value=None)
    with patch("routes.stripe_webhooks.read_secret", return_value="whsec_test"), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.stripe_webhooks.stripe.Webhook.construct_event",
               return_value=event), \
         patch("routes.stripe_webhooks.httpx.AsyncClient") as mock_httpx, \
         patch.dict("routes.stripe_webhooks.HANDLERS", {
             "invoice.finalized": mock_handler,
         }):

        _setup_httpx_mock(
            mock_httpx,
            _mock_frappe_get_response([]),
            _mock_frappe_post_response("evt_INV"),
            _mock_frappe_put_response(),
        )

        resp = _webhook_post(client)
        assert resp.status_code == 200
        mock_handler.assert_called_once_with({"id": "inv_DISPATCH"})
