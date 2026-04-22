"""Tests for provisioning_stripe routes — Stripe Customer creation."""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["DEV_MODE"] = "true"
os.environ["ADMIN_FRAPPE_URL"] = "http://admin.test:8080"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

VALID_REQUEST = {
    "site_name": "newclient.sparkmojo.com",
    "customer_name": "New Client Music School",
    "billing_email": "billing@newclient.com",
}

ADMIN_URL = "http://admin.test:8080"


@pytest.fixture
def client():
    return TestClient(app)


def _mock_frappe_get_response(data, status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = {"data": data}
    return resp


def _mock_frappe_put_response(status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = "ok"
    return resp


def _mock_stripe_customer(customer_id="cus_TEST123"):
    customer = MagicMock()
    customer.id = customer_id
    return customer


def _setup_httpx_mock(mock_httpx_cls, get_response, put_response=None):
    mock_client = AsyncMock()
    mock_httpx_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
    mock_httpx_cls.return_value.__aexit__ = AsyncMock(return_value=False)
    mock_client.get.return_value = get_response
    if put_response:
        mock_client.put.return_value = put_response
    return mock_client


# --- AC1: Valid request → Stripe Customer created, SM Site Registry updated ---

def test_create_customer_success(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Customer.create") as mock_stripe_create:

        mock_stripe_create.return_value = _mock_stripe_customer("cus_NEW123")
        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response([{"name": "newclient", "stripe_customer_id": ""}]),
            _mock_frappe_put_response(),
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["stripe_customer_id"] == "cus_NEW123"

        mock_stripe_create.assert_called_once_with(
            name="New Client Music School",
            email="billing@newclient.com",
            metadata={
                "sm_site_name": "newclient.sparkmojo.com",
                "sm_site_registry_id": "newclient",
            },
        )


# --- AC2: Invalid site_name → 404 ---

def test_create_customer_site_not_found_empty_data(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls:

        _setup_httpx_mock(mock_httpx_cls, _mock_frappe_get_response([]))

        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json={**VALID_REQUEST, "site_name": "nonexistent.sparkmojo.com"},
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


def test_create_customer_site_not_found_http_error(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response([], status_code=404),
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json={**VALID_REQUEST, "site_name": "nonexistent.sparkmojo.com"},
        )
        assert resp.status_code == 404


# --- AC3: Site already has stripe_customer_id → idempotent 200 ---

def test_create_customer_idempotent(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Customer.create") as mock_stripe_create:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(
                [{"name": "existing-client", "stripe_customer_id": "cus_EXISTING"}]
            ),
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 200
        assert resp.json()["stripe_customer_id"] == "cus_EXISTING"
        mock_stripe_create.assert_not_called()


# --- AC4: Stripe key unavailable → 500 ---

def test_create_customer_no_stripe_key(client):
    from secrets_loader import SecretNotFoundError
    with patch(
        "routes.provisioning_stripe.read_secret",
        side_effect=SecretNotFoundError("stripe_secret_key not found"),
    ):
        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 500
        assert "Stripe configuration missing" in resp.json()["detail"]


# --- AC5: StripeError → 502 with sanitized message ---

def test_create_customer_stripe_error(client):
    import stripe as stripe_mod

    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Customer.create") as mock_stripe_create:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response([{"name": "newclient", "stripe_customer_id": ""}]),
        )
        mock_stripe_create.side_effect = stripe_mod.StripeError("Something went wrong")

        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 502
        assert "error" in resp.json()["detail"].lower()


# --- Validation: missing fields → 422 ---

def test_create_customer_missing_site_name(client):
    resp = client.post(
        "/api/modules/provisioning/stripe/create-customer",
        json={"customer_name": "Test", "billing_email": "test@test.com"},
    )
    assert resp.status_code == 422


def test_create_customer_missing_customer_name(client):
    resp = client.post(
        "/api/modules/provisioning/stripe/create-customer",
        json={"site_name": "test.sparkmojo.com", "billing_email": "test@test.com"},
    )
    assert resp.status_code == 422


def test_create_customer_missing_billing_email(client):
    resp = client.post(
        "/api/modules/provisioning/stripe/create-customer",
        json={"site_name": "test.sparkmojo.com", "customer_name": "Test"},
    )
    assert resp.status_code == 422


def test_create_customer_empty_body(client):
    resp = client.post(
        "/api/modules/provisioning/stripe/create-customer",
        json={},
    )
    assert resp.status_code == 422


# --- Admin URL not configured → 500 ---

def test_create_customer_no_admin_url(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ""):
        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 500
        assert "Admin site not configured" in resp.json()["detail"]


# --- SM Site Registry update failure still returns customer ID ---

def test_create_customer_registry_update_failure_still_returns(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Customer.create") as mock_stripe_create:

        mock_stripe_create.return_value = _mock_stripe_customer("cus_CREATED")
        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response([{"name": "newclient", "stripe_customer_id": ""}]),
            _mock_frappe_put_response(status_code=500),
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-customer",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 200
        assert resp.json()["stripe_customer_id"] == "cus_CREATED"
