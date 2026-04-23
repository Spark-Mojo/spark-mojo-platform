"""Tests for GET /api/modules/account/invoices/{id} detail and PDF."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient


def _make_user(roles=None, tenant_id="willow", site_name="willow.sparkmojo.com"):
    return {
        "email": "admin@willow.com",
        "full_name": "Test Admin",
        "roles": roles or ["System Manager"],
        "tenant_id": tenant_id,
        "site_name": site_name,
    }


SM_USER = _make_user()

INVOICE_DOC = {
    "name": "INV-001",
    "invoice_number": "INV-2026-001",
    "invoice_date": "2026-04-01",
    "due_date": "2026-05-01",
    "status": "paid",
    "total": 2500.00,
    "subtotal": 2300.00,
    "tax": 200.00,
    "amount_paid": 2500.00,
    "amount_remaining": 0,
    "currency": "USD",
    "period_start": "2026-03-01",
    "period_end": "2026-03-31",
    "source_system": "stripe",
    "hosted_invoice_url": "https://invoice.stripe.com/i/hosted-001",
    "invoice_pdf_url": "https://invoice.stripe.com/i/pdf-001",
    "erpnext_sales_invoice_name": "",
    "lines": [
        {
            "mojo_id": "mojo-task",
            "action_id": "willow.staff_seats",
            "invoice_line_label": "Staff Seats",
            "description": "5 staff seats",
            "quantity": 5,
            "unit_amount": 100.00,
            "amount": 500.00,
            "quoted_rack_rate": 120.00,
            "discount_amount": 100.00,
            "price_type": "flat",
            "billing_type": "recurring",
            "usage_quantity": 5,
            "included_quantity": 3,
            "overage_quantity": 2,
        },
        {
            "mojo_id": "mojo-task",
            "action_id": "willow.ai_tokens",
            "invoice_line_label": "AI Tokens",
            "description": "Tier 1 usage",
            "quantity": 1000,
            "unit_amount": 0.01,
            "amount": 10.00,
            "quoted_rack_rate": 0.02,
            "discount_amount": 10.00,
            "price_type": "per_unit",
            "billing_type": "usage",
            "usage_quantity": 1000,
            "included_quantity": 500,
            "overage_quantity": 500,
        },
        {
            "mojo_id": "mojo-billing",
            "action_id": "willow.claims_processed",
            "invoice_line_label": "Claims Processed",
            "description": "Monthly claims",
            "quantity": 200,
            "unit_amount": 1.50,
            "amount": 300.00,
            "quoted_rack_rate": 2.00,
            "discount_amount": 100.00,
            "price_type": "per_unit",
            "billing_type": "usage",
            "usage_quantity": 200,
            "included_quantity": 100,
            "overage_quantity": 100,
        },
    ],
}

ERPNEXT_INVOICE_DOC = {
    "name": "INV-ERP-001",
    "invoice_number": "INV-ERP-2026-001",
    "invoice_date": "2026-04-01",
    "due_date": "2026-05-01",
    "status": "paid",
    "total": 3000.00,
    "subtotal": 2800.00,
    "tax": 200.00,
    "amount_paid": 3000.00,
    "amount_remaining": 0,
    "currency": "USD",
    "period_start": "2026-03-01",
    "period_end": "2026-03-31",
    "source_system": "erpnext",
    "hosted_invoice_url": "",
    "invoice_pdf_url": "",
    "erpnext_sales_invoice_name": "ACC-SINV-2026-00012",
    "lines": [],
}


def _doc_response(doc):
    return httpx.Response(200, json={"data": doc})


def _not_found_response():
    return httpx.Response(404, json={"exc_type": "DoesNotExistError"})


@pytest.fixture
def client_sm():
    with patch.dict("os.environ", {"ADMIN_FRAPPE_URL": "http://admin:8080"}):
        import importlib
        import routes.account as mod
        importlib.reload(mod)
        mod.ADMIN_FRAPPE_URL = "http://admin:8080"
        mod.ADMIN_API_KEY = "key"
        mod.ADMIN_API_SECRET = "secret"

        from main import app
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: SM_USER
        yield TestClient(app, raise_server_exceptions=False)
        app.dependency_overrides.clear()


class TestAC1_InvoiceDetailSuccess:
    """200 with invoice object and mojo_groups dict keyed by mojo_id."""

    def test_returns_invoice_detail_with_mojo_groups(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                return_value=_doc_response(INVOICE_DOC)
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/invoices/INV-001")

        assert resp.status_code == 200
        data = resp.json()

        inv = data["invoice"]
        assert inv["name"] == "INV-001"
        assert inv["invoice_number"] == "INV-2026-001"
        assert inv["status"] == "paid"
        assert inv["total"] == 2500.00
        assert inv["subtotal"] == 2300.00
        assert inv["tax"] == 200.00
        assert inv["currency"] == "USD"
        assert inv["source_system"] == "stripe"
        assert inv["hosted_invoice_url"] == "https://invoice.stripe.com/i/hosted-001"
        assert inv["invoice_pdf_url"] == "https://invoice.stripe.com/i/pdf-001"
        assert len(inv) == 16

        groups = data["mojo_groups"]
        assert "mojo-task" in groups
        assert "mojo-billing" in groups
        assert len(groups["mojo-task"]) == 2
        assert len(groups["mojo-billing"]) == 1

        line = groups["mojo-task"][0]
        assert line["action_id"] == "willow.staff_seats"
        assert line["invoice_line_label"] == "Staff Seats"
        assert line["quantity"] == 5
        assert line["amount"] == 500.00
        assert len(line) == 13


class TestAC2_StripePDFRedirect:
    """source_system=stripe → 302 redirect to invoice_pdf_url."""

    def test_redirects_to_stripe_pdf(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                return_value=_doc_response(INVOICE_DOC)
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get(
                "/api/modules/account/invoices/INV-001/pdf",
                follow_redirects=False,
            )

        assert resp.status_code == 302
        assert resp.headers["location"] == "https://invoice.stripe.com/i/pdf-001"


class TestAC3_ERPNextPDFRedirect:
    """source_system=erpnext → 302 redirect to ERPNext print format URL."""

    def test_redirects_to_erpnext_pdf(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                return_value=_doc_response(ERPNEXT_INVOICE_DOC)
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get(
                "/api/modules/account/invoices/INV-ERP-001/pdf",
                follow_redirects=False,
            )

        assert resp.status_code == 302
        loc = resp.headers["location"]
        assert "admin.sparkmojo.com" in loc
        assert "ACC-SINV-2026-00012" in loc
        assert "SM%20Mojo-Grouped%20Invoice" in loc


class TestAC4_NotFound404:
    """Nonexistent invoice → 404 for both detail and pdf endpoints."""

    def test_detail_returns_404(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                return_value=_not_found_response()
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get(
                "/api/modules/account/invoices/NONEXISTENT"
            )

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"]

    def test_pdf_returns_404(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                return_value=_not_found_response()
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get(
                "/api/modules/account/invoices/NONEXISTENT/pdf",
                follow_redirects=False,
            )

        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"]
