"""
Shared test fixtures for the abstraction layer test suite.

Ensures DEV_MODE is enabled so auth falls back to DEV_USER,
and provides reusable authenticated client fixtures.
"""

import os
import sys

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DEV_MODE"] = "true"
os.environ.setdefault("FRAPPE_URL", "http://localhost:8080")
os.environ.setdefault("FRAPPE_API_KEY", "test")
os.environ.setdefault("FRAPPE_API_SECRET", "test")

from main import app  # noqa: E402


@pytest.fixture
def auth_client():
    """Async client factory for tests requiring authentication.

    DEV_MODE=true means validate_frappe_session returns DEV_USER
    without needing cookies or headers.
    """
    async def _make_client():
        return AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        )
    return _make_client
