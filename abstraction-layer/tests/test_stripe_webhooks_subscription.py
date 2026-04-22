"""Tests for subscription handler implementation in stripe_webhooks."""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["DEV_MODE"] = "true"
os.environ["ADMIN_FRAPPE_URL"] = "http://admin.test:8080"

from routes.stripe_webhooks import (  # noqa: E402
    _build_subscription_payload,
    handle_subscription_deleted,
    handle_subscription_sync,
    handle_trial_will_end,
)

ADMIN_URL = "http://admin.test:8080"


def _mock_response(data=None, status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = {"data": data if data is not None else []}
    resp.text = "ok"
    return resp


def _make_sub_object(
    sub_id="sub_TEST456",
    customer="cus_TEST789",
    status="active",
    cancel_at_period_end=False,
    current_period_start=1700000000,
    current_period_end=1702592000,
    trial_end=None,
    plan_interval="month",
):
    obj = {
        "id": sub_id,
        "customer": customer,
        "status": status,
        "cancel_at_period_end": cancel_at_period_end,
        "current_period_start": current_period_start,
        "current_period_end": current_period_end,
        "trial_end": trial_end,
        "plan": {"interval": plan_interval},
    }
    return obj


def _registry_entry(site_name="poc-dev.sparkmojo.com", billing_motion="self_serve"):
    return {
        "name": "REG-001",
        "site_name": site_name,
        "billing_motion": billing_motion,
    }


@pytest.mark.asyncio
async def test_subscription_sync_creates_new_record():
    """AC1: subscription.created creates SM Subscription with correct fields."""
    data_object = _make_sub_object()

    registry_resp = _mock_response([_registry_entry()])
    find_resp = _mock_response([])
    create_resp = _mock_response(status_code=201)

    mock_client = AsyncMock()
    call_count = 0

    async def mock_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return registry_resp
        return find_resp

    mock_client.get = mock_get
    mock_client.post = AsyncMock(return_value=create_resp)
    mock_client.put = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client):
        await handle_subscription_sync(data_object)

    mock_client.post.assert_called_once()
    call_args = mock_client.post.call_args
    payload = call_args.kwargs.get("json", call_args[1].get("json", {}))
    assert payload["source_system"] == "stripe"
    assert payload["stripe_subscription_id"] == "sub_TEST456"
    assert payload["stripe_customer_id"] == "cus_TEST789"
    assert payload["billing_status"] == "active"
    assert payload["billing_motion"] == "self_serve"
    assert "last_synced_at" in payload


@pytest.mark.asyncio
async def test_subscription_sync_updates_existing_record():
    """AC2: subscription.updated updates existing SM Subscription, no duplicate."""
    data_object = _make_sub_object(status="past_due")

    registry_resp = _mock_response([_registry_entry()])
    find_resp = _mock_response([{"name": "SM-SUB-001"}])
    update_resp = _mock_response(status_code=200)

    mock_client = AsyncMock()
    call_count = 0

    async def mock_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return registry_resp
        return find_resp

    mock_client.get = mock_get
    mock_client.put = AsyncMock(return_value=update_resp)
    mock_client.post = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client):
        await handle_subscription_sync(data_object)

    mock_client.put.assert_called_once()
    mock_client.post.assert_not_called()
    call_args = mock_client.put.call_args
    payload = call_args.kwargs.get("json", call_args[1].get("json", {}))
    assert payload["billing_status"] == "past_due"


@pytest.mark.asyncio
async def test_subscription_deleted_sets_canceled():
    """AC3: subscription.deleted sets billing_status=canceled."""
    data_object = _make_sub_object()

    registry_resp = _mock_response([_registry_entry()])
    find_resp = _mock_response([{"name": "SM-SUB-001"}])
    update_resp = _mock_response(status_code=200)

    mock_client = AsyncMock()
    call_count = 0

    async def mock_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return registry_resp
        return find_resp

    mock_client.get = mock_get
    mock_client.put = AsyncMock(return_value=update_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client):
        await handle_subscription_deleted(data_object)

    mock_client.put.assert_called_once()
    call_args = mock_client.put.call_args
    payload = call_args.kwargs.get("json", call_args[1].get("json", {}))
    assert payload["billing_status"] == "canceled"
    assert "last_synced_at" in payload


@pytest.mark.asyncio
async def test_no_registry_entry_logs_warning():
    """AC4: no SM Site Registry → warning logged, no error."""
    data_object = _make_sub_object()

    registry_resp = _mock_response([])
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=registry_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client):
        await handle_subscription_sync(data_object)

    mock_client.post.assert_not_called()
    mock_client.put.assert_not_called()


@pytest.mark.asyncio
async def test_trial_will_end_updates_trial_end():
    """AC5: trial_will_end updates trial_end field."""
    data_object = _make_sub_object(trial_end=1703000000)

    registry_resp = _mock_response([_registry_entry()])
    find_resp = _mock_response([{"name": "SM-SUB-001"}])
    update_resp = _mock_response(status_code=200)

    mock_client = AsyncMock()
    call_count = 0

    async def mock_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return registry_resp
        return find_resp

    mock_client.get = mock_get
    mock_client.put = AsyncMock(return_value=update_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client):
        await handle_trial_will_end(data_object)

    mock_client.put.assert_called_once()
    call_args = mock_client.put.call_args
    payload = call_args.kwargs.get("json", call_args[1].get("json", {}))
    assert "trial_end" in payload
    assert "last_synced_at" in payload


def test_build_subscription_payload_maps_fields():
    """Subscription fields correctly mapped including period dates and status."""
    data_object = _make_sub_object(
        cancel_at_period_end=True,
        trial_end=1703000000,
    )
    payload = _build_subscription_payload(data_object, "managed_account")

    assert payload["source_system"] == "stripe"
    assert payload["stripe_customer_id"] == "cus_TEST789"
    assert payload["stripe_subscription_id"] == "sub_TEST456"
    assert payload["billing_motion"] == "managed_account"
    assert payload["billing_status"] == "active"
    assert payload["billing_interval"] == "month"
    assert payload["cancel_at_period_end"] == 1
    assert payload["current_period_start"] is not None
    assert payload["current_period_end"] is not None
    assert payload["trial_end"] is not None
    assert "last_synced_at" in payload


def test_build_subscription_payload_no_trial():
    """Payload omits trial_end when not set."""
    data_object = _make_sub_object(trial_end=None)
    payload = _build_subscription_payload(data_object, "self_serve")
    assert "trial_end" not in payload


@pytest.mark.asyncio
async def test_client_site_api_failure_raises():
    """Client site API failure propagates as exception."""
    data_object = _make_sub_object()

    registry_resp = _mock_response([_registry_entry()])
    find_resp = _mock_response([])
    fail_resp = _mock_response(status_code=500)
    fail_resp.text = "Internal Server Error"

    mock_client = AsyncMock()
    call_count = 0

    async def mock_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return registry_resp
        return find_resp

    mock_client.get = mock_get
    mock_client.post = AsyncMock(return_value=fail_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(RuntimeError, match="Failed to upsert SM Subscription"):
            await handle_subscription_sync(data_object)
