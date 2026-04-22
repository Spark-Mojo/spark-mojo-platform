from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from routes.stripe_webhooks import (
    _build_invoice_line,
    _build_invoice_payload,
    handle_invoice_sync,
    handle_invoice_paid,
    handle_invoice_payment_failed,
)


def _make_product(mojo_id="crm", action_id="claim_submit", billing_type="flat_monthly"):
    return {
        "name": "CRM Platform",
        "metadata": {
            "sm_mojo_id": mojo_id,
            "sm_action_id": action_id,
            "sm_billing_type": billing_type,
        },
    }


def _make_line_item(
    amount=5000,
    quantity=1,
    unit_amount=5000,
    product_id="prod_test",
    description="CRM Platform - Monthly",
    usage_type=None,
):
    recurring = {}
    if usage_type:
        recurring = {"usage_type": usage_type}
    return {
        "price": {
            "product": product_id,
            "unit_amount": unit_amount,
            "recurring": recurring if recurring else None,
        },
        "amount": amount,
        "quantity": quantity,
        "description": description,
    }


def _make_invoice(
    invoice_id="in_test123",
    customer="cus_test",
    status="draft",
    total=10000,
    subtotal=10000,
    tax=0,
    amount_paid=0,
    amount_remaining=10000,
    line_items=None,
    number="INV-0001",
    hosted_invoice_url=None,
    invoice_pdf=None,
    paid_at=None,
):
    inv = {
        "id": invoice_id,
        "customer": customer,
        "status": status,
        "total": total,
        "subtotal": subtotal,
        "tax": tax,
        "amount_paid": amount_paid,
        "amount_remaining": amount_remaining,
        "currency": "usd",
        "number": number,
        "created": 1700000000,
        "due_date": 1700604800,
        "period_start": 1700000000,
        "period_end": 1702592000,
        "hosted_invoice_url": hosted_invoice_url,
        "invoice_pdf": invoice_pdf,
        "status_transitions": {},
        "lines": {"data": line_items or []},
    }
    if paid_at:
        inv["status_transitions"] = {"paid_at": paid_at}
    return inv


def _mock_registry_response(site_name="poc-dev.sparkmojo.com"):
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {
        "data": [{"name": "REG-001", "site_name": site_name}]
    }
    return resp


def _mock_no_registry_response():
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": []}
    return resp


def _mock_no_existing_invoice():
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": []}
    return resp


def _mock_existing_invoice(name="INV-DOC-001"):
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": [{"name": name}]}
    return resp


def _mock_create_success():
    resp = MagicMock()
    resp.status_code = 201
    resp.json.return_value = {"data": {"name": "INV-DOC-NEW"}}
    return resp


def _mock_update_success():
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": {"name": "INV-DOC-001"}}
    return resp


def _mock_failure_response():
    resp = MagicMock()
    resp.status_code = 500
    resp.text = "Internal Server Error"
    return resp


class TestBuildInvoiceLine:
    def test_subscription_line(self):
        line = _make_line_item(amount=5000, unit_amount=5000, quantity=1)
        product = _make_product(mojo_id="crm", action_id="claim_submit")
        result = _build_invoice_line(line, product)
        assert result["mojo_id"] == "crm"
        assert result["action_id"] == "claim_submit"
        assert result["amount"] == 50.0
        assert result["unit_amount"] == 50.0
        assert result["price_type"] == "subscription"

    def test_metered_line(self):
        line = _make_line_item(
            amount=2500, unit_amount=100, quantity=25, usage_type="metered"
        )
        product = _make_product(
            mojo_id="healthcare_billing",
            action_id="claim_submit",
            billing_type="metered_overage",
        )
        result = _build_invoice_line(line, product)
        assert result["price_type"] == "metered_overage"
        assert result["meter_name"] == "claim_submit"
        assert result["billing_type"] == "metered_overage"

    def test_meter_name_not_set_for_flat(self):
        line = _make_line_item()
        product = _make_product(billing_type="flat_monthly")
        result = _build_invoice_line(line, product)
        assert result["meter_name"] is None


class TestBuildInvoicePayload:
    def test_basic_payload(self):
        invoice = _make_invoice(
            total=10000, subtotal=9000, tax=1000,
            amount_paid=0, amount_remaining=10000,
        )
        result = _build_invoice_payload(invoice, [])
        assert result["source_system"] == "stripe"
        assert result["total"] == 100.0
        assert result["subtotal"] == 90.0
        assert result["tax"] == 10.0
        assert result["currency"] == "usd"
        assert result["invoice_date"] == "2023-11-14"
        assert result["period_start"] == "2023-11-14"

    def test_paid_invoice_has_payment_date(self):
        invoice = _make_invoice(
            status="paid", amount_paid=10000, amount_remaining=0,
            paid_at=1700100000,
        )
        result = _build_invoice_payload(invoice, [])
        assert result["status"] == "paid"
        assert result["payment_date"] == "2023-11-16"

    def test_no_due_date(self):
        invoice = _make_invoice()
        invoice["due_date"] = None
        result = _build_invoice_payload(invoice, [])
        assert "due_date" not in result


@pytest.mark.asyncio
async def test_invoice_created_creates_sm_invoice():
    """AC1: invoice.created -> SM Invoice created with correct fields + line items."""
    line = _make_line_item(amount=5000, quantity=1)
    invoice = _make_invoice(line_items=[line])
    product = _make_product(mojo_id="crm")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    call_count = 0

    async def mock_get(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        url = args[0] if args else kwargs.get("url", "")
        if "SM Site Registry" in url:
            return _mock_registry_response()
        if "SM Invoice" in url:
            return _mock_no_existing_invoice()
        return _mock_no_existing_invoice()

    async def mock_post(*args, **kwargs):
        return _mock_create_success()

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.stripe.Product.retrieve", return_value=product), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        await handle_invoice_sync(invoice)


@pytest.mark.asyncio
async def test_invoice_finalized_updates_existing():
    """AC2: invoice.finalized -> existing SM Invoice updated."""
    invoice = _make_invoice(
        status="open",
        hosted_invoice_url="https://invoice.stripe.com/i/test",
        invoice_pdf="https://invoice.stripe.com/pdf/test",
    )

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    async def mock_get(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "SM Site Registry" in url:
            return _mock_registry_response()
        if "SM Invoice" in url:
            return _mock_existing_invoice()
        return _mock_no_existing_invoice()

    async def mock_put(*args, **kwargs):
        payload = kwargs.get("json", {})
        assert payload["status"] == "open"
        assert payload["hosted_invoice_url"] == "https://invoice.stripe.com/i/test"
        assert payload["invoice_pdf_url"] == "https://invoice.stripe.com/pdf/test"
        return _mock_update_success()

    mock_client.get = mock_get
    mock_client.put = mock_put

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        await handle_invoice_sync(invoice)


@pytest.mark.asyncio
async def test_invoice_paid_sets_status_and_amounts():
    """AC3: invoice.paid -> status=paid, amount_paid=total, amount_remaining=0."""
    invoice = _make_invoice(
        status="paid",
        total=10000,
        amount_paid=10000,
        amount_remaining=0,
        paid_at=1700100000,
    )

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    async def mock_get(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "SM Site Registry" in url:
            return _mock_registry_response()
        if "SM Invoice" in url:
            return _mock_existing_invoice()
        return _mock_no_existing_invoice()

    async def mock_put(*args, **kwargs):
        payload = kwargs.get("json", {})
        assert payload["status"] == "paid"
        assert payload["amount_paid"] == 100.0
        assert payload["amount_remaining"] == 0.0
        assert payload.get("payment_date") is not None
        return _mock_update_success()

    mock_client.get = mock_get
    mock_client.put = mock_put

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        await handle_invoice_paid(invoice)


@pytest.mark.asyncio
async def test_mojo_grouped_lines():
    """AC4: lines with different sm_mojo_id have mojo_id populated correctly."""
    crm_lines = [
        _make_line_item(amount=5000, product_id=f"prod_crm_{i}")
        for i in range(3)
    ]
    hcb_lines = [
        _make_line_item(amount=3000, product_id=f"prod_hcb_{i}")
        for i in range(2)
    ]
    invoice = _make_invoice(line_items=crm_lines + hcb_lines)

    crm_product = _make_product(mojo_id="crm")
    hcb_product = _make_product(mojo_id="healthcare_billing")

    def mock_retrieve(product_id):
        if "crm" in product_id:
            return crm_product
        return hcb_product

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    captured_payload = {}

    async def mock_get(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "SM Site Registry" in url:
            return _mock_registry_response()
        if "SM Invoice" in url:
            return _mock_no_existing_invoice()
        return _mock_no_existing_invoice()

    async def mock_post(*args, **kwargs):
        captured_payload.update(kwargs.get("json", {}))
        return _mock_create_success()

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.stripe.Product.retrieve", side_effect=mock_retrieve), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        await handle_invoice_sync(invoice)

    lines = captured_payload.get("lines", [])
    assert len(lines) == 5
    crm_count = sum(1 for ln in lines if ln["mojo_id"] == "crm")
    hcb_count = sum(1 for ln in lines if ln["mojo_id"] == "healthcare_billing")
    assert crm_count == 3
    assert hcb_count == 2


@pytest.mark.asyncio
async def test_invoice_payment_failed():
    """AC5: invoice.payment_failed -> SM Invoice synced (status from Stripe)."""
    invoice = _make_invoice(
        status="open",
        amount_paid=0,
        amount_remaining=10000,
    )

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    async def mock_get(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "SM Site Registry" in url:
            return _mock_registry_response()
        if "SM Invoice" in url:
            return _mock_existing_invoice()
        return _mock_no_existing_invoice()

    async def mock_put(*args, **kwargs):
        payload = kwargs.get("json", {})
        assert payload["status"] == "open"
        assert payload["amount_remaining"] == 100.0
        return _mock_update_success()

    mock_client.get = mock_get
    mock_client.put = mock_put

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        await handle_invoice_payment_failed(invoice)


@pytest.mark.asyncio
async def test_no_registry_for_customer_logs_warning():
    """AC6: No matching SM Site Registry -> warning logged, no error."""
    invoice = _make_invoice(customer="cus_unknown")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    async def mock_get(*args, **kwargs):
        return _mock_no_registry_response()

    mock_client.get = mock_get

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        await handle_invoice_sync(invoice)


@pytest.mark.asyncio
async def test_metered_line_detected():
    """AC7: Metered line detected by recurring.usage_type -> price_type=metered_overage."""
    line = _make_line_item(
        amount=2500, unit_amount=100, quantity=25, usage_type="metered"
    )
    invoice = _make_invoice(line_items=[line])
    product = _make_product(
        mojo_id="healthcare_billing",
        action_id="claim_submit",
        billing_type="metered_overage",
    )

    captured_payload = {}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    async def mock_get(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "SM Site Registry" in url:
            return _mock_registry_response()
        if "SM Invoice" in url:
            return _mock_no_existing_invoice()
        return _mock_no_existing_invoice()

    async def mock_post(*args, **kwargs):
        captured_payload.update(kwargs.get("json", {}))
        return _mock_create_success()

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.stripe.Product.retrieve", return_value=product), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        await handle_invoice_sync(invoice)

    lines = captured_payload.get("lines", [])
    assert len(lines) == 1
    assert lines[0]["price_type"] == "metered_overage"
    assert lines[0]["meter_name"] == "claim_submit"


@pytest.mark.asyncio
async def test_client_site_api_failure_raises():
    """AC8: Client site API failure -> RuntimeError propagated."""
    invoice = _make_invoice()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    async def mock_get(*args, **kwargs):
        url = args[0] if args else kwargs.get("url", "")
        if "SM Site Registry" in url:
            return _mock_registry_response()
        if "SM Invoice" in url:
            return _mock_no_existing_invoice()
        return _mock_no_existing_invoice()

    async def mock_post(*args, **kwargs):
        return _mock_failure_response()

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("routes.stripe_webhooks.httpx.AsyncClient", return_value=mock_client), \
         patch("routes.stripe_webhooks.ADMIN_FRAPPE_URL", "https://admin.test.com"):
        with pytest.raises(RuntimeError, match="Failed to upsert SM Invoice"):
            await handle_invoice_sync(invoice)
