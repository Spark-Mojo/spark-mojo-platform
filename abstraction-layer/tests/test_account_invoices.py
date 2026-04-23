"""Tests for GET /api/modules/account/invoices — paginated invoice list."""

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

INVOICE_RECORDS = [
    {
        "name": "INV-001",
        "invoice_number": "INV-2026-001",
        "invoice_date": "2026-04-01",
        "due_date": "2026-05-01",
        "status": "paid",
        "total": 2500.00,
        "amount_paid": 2500.00,
        "amount_remaining": 0,
        "currency": "USD",
        "period_start": "2026-03-01",
        "period_end": "2026-03-31",
        "source_system": "stripe",
    },
    {
        "name": "INV-002",
        "invoice_number": "INV-2026-002",
        "invoice_date": "2026-03-01",
        "due_date": "2026-04-01",
        "status": "paid",
        "total": 2500.00,
        "amount_paid": 2500.00,
        "amount_remaining": 0,
        "currency": "USD",
        "period_start": "2026-02-01",
        "period_end": "2026-02-28",
        "source_system": "stripe",
    },
    {
        "name": "INV-003",
        "invoice_number": "INV-2026-003",
        "invoice_date": "2026-02-01",
        "due_date": "2026-03-01",
        "status": "open",
        "total": 3200.00,
        "amount_paid": 0,
        "amount_remaining": 3200.00,
        "currency": "USD",
        "period_start": "2026-01-01",
        "period_end": "2026-01-31",
        "source_system": "stripe",
    },
    {
        "name": "INV-004",
        "invoice_number": "INV-2026-004",
        "invoice_date": "2026-01-01",
        "due_date": "2026-02-01",
        "status": "paid",
        "total": 2500.00,
        "amount_paid": 2500.00,
        "amount_remaining": 0,
        "currency": "USD",
        "period_start": "2025-12-01",
        "period_end": "2025-12-31",
        "source_system": "stripe",
    },
    {
        "name": "INV-005",
        "invoice_number": "INV-2026-005",
        "invoice_date": "2025-12-01",
        "due_date": "2026-01-01",
        "status": "paid",
        "total": 2500.00,
        "amount_paid": 2500.00,
        "amount_remaining": 0,
        "currency": "USD",
        "period_start": "2025-11-01",
        "period_end": "2025-11-30",
        "source_system": "stripe",
    },
]


def _invoice_response(invoices=None):
    return httpx.Response(
        200,
        json={"data": invoices if invoices is not None else INVOICE_RECORDS},
    )


def _count_response(count=5):
    return httpx.Response(200, json={"message": count})


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


class TestAC1_InvoiceListSuccess:
    """Site has 5 SM Invoice records → 200 with invoices array, total=5."""

    def test_returns_invoice_list(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                side_effect=[_invoice_response(), _count_response(5)]
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get("/api/modules/account/invoices")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["invoices"]) == 5
        assert data["total"] == 5
        assert data["limit"] == 20
        assert data["offset"] == 0
        inv = data["invoices"][0]
        assert inv["invoice_number"] == "INV-2026-001"
        assert inv["status"] == "paid"
        assert inv["total"] == 2500.00
        assert inv["currency"] == "USD"
        assert inv["source_system"] == "stripe"


class TestAC2_PaginationLimitOffset:
    """limit=2, offset=0 → 2 invoices returned, total reflects full count."""

    def test_pagination(self, client_sm):
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                side_effect=[
                    _invoice_response(INVOICE_RECORDS[:2]),
                    _count_response(5),
                ]
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get(
                "/api/modules/account/invoices?limit=2&offset=0"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["invoices"]) == 2
        assert data["total"] == 5
        assert data["limit"] == 2
        assert data["offset"] == 0


class TestAC3_StatusFilter:
    """status=paid filter → only paid invoices, total reflects filtered count."""

    def test_status_filter(self, client_sm):
        paid_invoices = [i for i in INVOICE_RECORDS if i["status"] == "paid"]
        with patch("routes.account.httpx.AsyncClient") as mock_http:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(
                side_effect=[
                    _invoice_response(paid_invoices),
                    _count_response(len(paid_invoices)),
                ]
            )
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_http.return_value = mock_client

            resp = client_sm.get(
                "/api/modules/account/invoices?status=paid"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["invoices"]) == 4
        assert data["total"] == 4
        for inv in data["invoices"]:
            assert inv["status"] == "paid"


class TestAC4_Unauthenticated401:
    """No auth → 401."""

    def test_returns_401(self):
        import auth as auth_mod
        from main import app
        app.dependency_overrides.clear()
        original_dev_mode = auth_mod.DEV_MODE
        auth_mod.DEV_MODE = False
        try:
            raw_client = TestClient(app, raise_server_exceptions=False)
            resp = raw_client.get("/api/modules/account/invoices")
        finally:
            auth_mod.DEV_MODE = original_dev_mode
        assert resp.status_code == 401
