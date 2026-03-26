"""
Baseline health test for the abstraction layer.
Verifies the app starts and the health endpoint responds correctly.
"""
import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


@pytest.mark.anyio
async def test_health_endpoint_returns_ok():
    """Health endpoint must return status ok."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "frappe_connected" in data
