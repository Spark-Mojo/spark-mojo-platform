"""Tests for provisioning_stripe routes — Stripe Subscription creation (ACCT-008b)."""

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

ADMIN_URL = "http://admin.test:8080"

VALID_REQUEST = {
    "site_name": "newclient.sparkmojo.com",
    "subscription_items": [
        {"item_code": "MOJO-ACCT-ACCESS", "contracted_rate": 49.00, "quantity": 1},
        {"item_code": "MOJO-CRM-ACCESS", "contracted_rate": 99.00, "quantity": 1},
    ],
    "promo_code": None,
    "trial_period_days": 0,
}

REGISTRY_WITH_CUSTOMER = [
    {
        "name": "newclient",
        "stripe_customer_id": "cus_TEST123",
        "stripe_subscription_id": "",
    }
]

REGISTRY_NO_CUSTOMER = [
    {
        "name": "newclient",
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
    }
]

REGISTRY_WITH_SUBSCRIPTION = [
    {
        "name": "existing-client",
        "stripe_customer_id": "cus_TEST123",
        "stripe_subscription_id": "sub_EXISTING",
    }
]


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


def _mock_stripe_product(product_id="prod_TEST", billing_type="flat_monthly",
                         included_units="0"):
    product = MagicMock()
    product.id = product_id
    product.metadata = {
        "sm_action_id": "MOJO-ACCT-ACCESS",
        "billing_type": billing_type,
        "included_units": included_units,
    }
    return product


def _mock_stripe_price(price_id="price_DEFAULT", unit_amount=4900):
    price = MagicMock()
    price.id = price_id
    price.unit_amount = unit_amount
    return price


def _mock_stripe_subscription(sub_id="sub_NEW123", status="active"):
    sub = MagicMock()
    sub.id = sub_id
    sub.status = status
    return sub


def _setup_httpx_mock(mock_httpx_cls, get_response, put_response=None):
    mock_client = AsyncMock()
    mock_httpx_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
    mock_httpx_cls.return_value.__aexit__ = AsyncMock(return_value=False)
    mock_client.get.return_value = get_response
    if put_response:
        mock_client.put.return_value = put_response
    return mock_client


def _standard_patches():
    return [
        patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"),
        patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL),
    ]


# --- AC1: Valid request → Stripe Subscription created ---

def test_create_subscription_success(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search, \
         patch("routes.provisioning_stripe.stripe.Price.list") as mock_price_list, \
         patch("routes.provisioning_stripe.stripe.Price.create") as mock_price_create, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
            _mock_frappe_put_response(),
        )

        product1 = _mock_stripe_product("prod_ACCT", "flat_monthly")
        product2 = _mock_stripe_product("prod_CRM", "flat_monthly")
        product2.metadata["sm_action_id"] = "MOJO-CRM-ACCESS"
        mock_search.side_effect = [
            MagicMock(data=[product1]),
            MagicMock(data=[product2]),
        ]

        default_price1 = _mock_stripe_price("price_ACCT_DEF", 4900)
        default_price2 = _mock_stripe_price("price_CRM_DEF", 9900)
        mock_price_list.side_effect = [
            MagicMock(data=[default_price1]),
            MagicMock(data=[default_price2]),
        ]

        mock_sub.return_value = _mock_stripe_subscription("sub_NEW123", "active")

        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["stripe_subscription_id"] == "sub_NEW123"
        assert body["subscription_status"] == "active"

        mock_sub.assert_called_once()
        call_kwargs = mock_sub.call_args[1]
        assert call_kwargs["customer"] == "cus_TEST123"
        assert len(call_kwargs["items"]) == 2
        assert call_kwargs["items"][0]["price"] == "price_ACCT_DEF"
        assert call_kwargs["items"][1]["price"] == "price_CRM_DEF"
        mock_price_create.assert_not_called()


# --- AC2: Invalid site_name → 404 ---

def test_create_subscription_site_not_found(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls:

        _setup_httpx_mock(mock_httpx_cls, _mock_frappe_get_response([]))

        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json={**VALID_REQUEST, "site_name": "ghost.sparkmojo.com"},
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


def test_create_subscription_site_http_error(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response([], status_code=404),
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json={**VALID_REQUEST, "site_name": "ghost.sparkmojo.com"},
        )
        assert resp.status_code == 404


# --- AC3: No stripe_customer_id → 409 ---

def test_create_subscription_no_customer(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_NO_CUSTOMER),
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 409
        assert "ACCT-008a" in resp.json()["detail"]


# --- AC4: Existing stripe_subscription_id → 200 idempotent ---

def test_create_subscription_idempotent(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_SUBSCRIPTION),
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 200
        assert resp.json()["stripe_subscription_id"] == "sub_EXISTING"
        mock_sub.assert_not_called()


# --- AC5: Invalid promo_code → 400 ---

def test_create_subscription_invalid_promo(client):
    import stripe as stripe_mod

    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search, \
         patch("routes.provisioning_stripe.stripe.Price.list") as mock_price_list, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
            _mock_frappe_put_response(),
        )

        product = _mock_stripe_product("prod_ACCT", "flat_monthly")
        product2 = _mock_stripe_product("prod_CRM", "flat_monthly")
        product2.metadata["sm_action_id"] = "MOJO-CRM-ACCESS"
        mock_search.side_effect = [
            MagicMock(data=[product]),
            MagicMock(data=[product2]),
        ]
        mock_price_list.side_effect = [
            MagicMock(data=[_mock_stripe_price("price_DEF1", 4900)]),
            MagicMock(data=[_mock_stripe_price("price_DEF2", 9900)]),
        ]
        mock_sub.side_effect = stripe_mod.InvalidRequestError(
            "No such coupon: 'BADPROMO'", param="coupon"
        )

        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json={**VALID_REQUEST, "promo_code": "BADPROMO"},
        )
        assert resp.status_code == 400
        assert "coupon" in resp.json()["detail"].lower()


# --- AC6: Unknown item_code → 422 ---

def test_create_subscription_unknown_item(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
        )
        mock_search.return_value = MagicMock(data=[])

        req = {
            "site_name": "newclient.sparkmojo.com",
            "subscription_items": [
                {"item_code": "MOJO-NONEXISTENT", "contracted_rate": 10.0, "quantity": 1}
            ],
        }
        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=req,
        )
        assert resp.status_code == 422
        assert "MOJO-NONEXISTENT" in resp.json()["detail"]
        assert "not found" in resp.json()["detail"].lower()


# --- AC7: Missing STRIPE_SECRET_KEY → 500 ---

def test_create_subscription_no_stripe_key(client):
    from secrets_loader import SecretNotFoundError

    with patch(
        "routes.provisioning_stripe.read_secret",
        side_effect=SecretNotFoundError("stripe_secret_key not found"),
    ):
        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 500
        assert "Stripe configuration missing" in resp.json()["detail"]


# --- AC8: StripeError → 502 sanitized ---

def test_create_subscription_stripe_error(client):
    import stripe as stripe_mod

    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search, \
         patch("routes.provisioning_stripe.stripe.Price.list") as mock_price_list, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
        )

        product = _mock_stripe_product("prod_ACCT", "flat_monthly")
        product2 = _mock_stripe_product("prod_CRM", "flat_monthly")
        product2.metadata["sm_action_id"] = "MOJO-CRM-ACCESS"
        mock_search.side_effect = [
            MagicMock(data=[product]),
            MagicMock(data=[product2]),
        ]
        mock_price_list.side_effect = [
            MagicMock(data=[_mock_stripe_price("price_DEF1", 4900)]),
            MagicMock(data=[_mock_stripe_price("price_DEF2", 9900)]),
        ]
        mock_sub.side_effect = stripe_mod.StripeError("Something went wrong")

        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 502
        assert "error" in resp.json()["detail"].lower()


# --- Validation: empty subscription_items → 422 ---

def test_create_subscription_empty_items(client):
    resp = client.post(
        "/api/modules/provisioning/stripe/create-subscription",
        json={"site_name": "test.sparkmojo.com", "subscription_items": []},
    )
    assert resp.status_code == 422


# --- Validation: missing site_name → 422 ---

def test_create_subscription_missing_site_name(client):
    resp = client.post(
        "/api/modules/provisioning/stripe/create-subscription",
        json={"subscription_items": [
            {"item_code": "MOJO-X", "contracted_rate": 10.0, "quantity": 1}
        ]},
    )
    assert resp.status_code == 422


# --- Validation: empty body → 422 ---

def test_create_subscription_empty_body(client):
    resp = client.post(
        "/api/modules/provisioning/stripe/create-subscription",
        json={},
    )
    assert resp.status_code == 422


# --- Admin URL not configured → 500 ---

def test_create_subscription_no_admin_url(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ""):
        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=VALID_REQUEST,
        )
        assert resp.status_code == 500
        assert "Admin site not configured" in resp.json()["detail"]


# --- Per-contract Price created when contracted_rate differs ---

def test_create_subscription_per_contract_price(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search, \
         patch("routes.provisioning_stripe.stripe.Price.list") as mock_price_list, \
         patch("routes.provisioning_stripe.stripe.Price.create") as mock_price_create, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
            _mock_frappe_put_response(),
        )

        product = _mock_stripe_product("prod_ACCT", "flat_monthly")
        mock_search.return_value = MagicMock(data=[product])
        mock_price_list.return_value = MagicMock(
            data=[_mock_stripe_price("price_DEF", 4900)]
        )
        custom_price = _mock_stripe_price("price_CUSTOM", 3900)
        mock_price_create.return_value = custom_price
        mock_sub.return_value = _mock_stripe_subscription("sub_CUSTOM")

        req = {
            "site_name": "newclient.sparkmojo.com",
            "subscription_items": [
                {"item_code": "MOJO-ACCT-ACCESS", "contracted_rate": 39.00, "quantity": 1}
            ],
        }
        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=req,
        )
        assert resp.status_code == 200
        mock_price_create.assert_called_once()
        call_kwargs = mock_price_create.call_args[1]
        assert call_kwargs["unit_amount"] == 3900
        assert call_kwargs["product"] == "prod_ACCT"

        sub_items = mock_sub.call_args[1]["items"]
        assert sub_items[0]["price"] == "price_CUSTOM"


# --- Metered overage creates tiered Price ---

def test_create_subscription_metered_overage_tiered_price(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search, \
         patch("routes.provisioning_stripe.stripe.Price.list") as mock_price_list, \
         patch("routes.provisioning_stripe.stripe.Price.create") as mock_price_create, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
            _mock_frappe_put_response(),
        )

        product = _mock_stripe_product("prod_CLAIMS", "metered_overage", "100")
        mock_search.return_value = MagicMock(data=[product])
        mock_price_list.return_value = MagicMock(data=[])
        tiered_price = _mock_stripe_price("price_TIERED")
        mock_price_create.return_value = tiered_price
        mock_sub.return_value = _mock_stripe_subscription("sub_METERED")

        req = {
            "site_name": "newclient.sparkmojo.com",
            "subscription_items": [
                {"item_code": "MOJO-ACCT-ACCESS", "contracted_rate": 0.50}
            ],
        }
        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=req,
        )
        assert resp.status_code == 200
        mock_price_create.assert_called_once()
        call_kwargs = mock_price_create.call_args[1]
        assert call_kwargs["billing_scheme"] == "tiered"
        assert call_kwargs["tiers_mode"] == "graduated"
        assert call_kwargs["tiers"][0]["up_to"] == 100
        assert call_kwargs["tiers"][0]["unit_amount"] == 0
        assert call_kwargs["tiers"][1]["up_to"] == "inf"
        assert call_kwargs["tiers"][1]["unit_amount"] == 50


# --- Registry update failure still returns subscription ID ---

def test_create_subscription_registry_update_failure(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search, \
         patch("routes.provisioning_stripe.stripe.Price.list") as mock_price_list, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
            _mock_frappe_put_response(status_code=500),
        )

        product = _mock_stripe_product("prod_ACCT", "flat_monthly")
        mock_search.return_value = MagicMock(data=[product])
        mock_price_list.return_value = MagicMock(
            data=[_mock_stripe_price("price_DEF", 4900)]
        )
        mock_sub.return_value = _mock_stripe_subscription("sub_CREATED")

        req = {
            "site_name": "newclient.sparkmojo.com",
            "subscription_items": [
                {"item_code": "MOJO-ACCT-ACCESS", "contracted_rate": 49.00, "quantity": 1}
            ],
        }
        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=req,
        )
        assert resp.status_code == 200
        assert resp.json()["stripe_subscription_id"] == "sub_CREATED"


# --- Trial period and promo code passed to Stripe ---

def test_create_subscription_with_trial_and_promo(client):
    with patch("routes.provisioning_stripe.read_secret", return_value="sk_test_fake"), \
         patch("routes.provisioning_stripe.ADMIN_FRAPPE_URL", ADMIN_URL), \
         patch("routes.provisioning_stripe.httpx.AsyncClient") as mock_httpx_cls, \
         patch("routes.provisioning_stripe.stripe.Product.search") as mock_search, \
         patch("routes.provisioning_stripe.stripe.Price.list") as mock_price_list, \
         patch("routes.provisioning_stripe.stripe.Subscription.create") as mock_sub:

        _setup_httpx_mock(
            mock_httpx_cls,
            _mock_frappe_get_response(REGISTRY_WITH_CUSTOMER),
            _mock_frappe_put_response(),
        )

        product = _mock_stripe_product("prod_ACCT", "flat_monthly")
        mock_search.return_value = MagicMock(data=[product])
        mock_price_list.return_value = MagicMock(
            data=[_mock_stripe_price("price_DEF", 4900)]
        )
        mock_sub.return_value = _mock_stripe_subscription("sub_TRIAL")

        req = {
            "site_name": "newclient.sparkmojo.com",
            "subscription_items": [
                {"item_code": "MOJO-ACCT-ACCESS", "contracted_rate": 49.00, "quantity": 1}
            ],
            "promo_code": "LAUNCH20",
            "trial_period_days": 14,
        }
        resp = client.post(
            "/api/modules/provisioning/stripe/create-subscription",
            json=req,
        )
        assert resp.status_code == 200

        call_kwargs = mock_sub.call_args[1]
        assert call_kwargs["trial_period_days"] == 14
        assert call_kwargs["coupon"] == "LAUNCH20"
