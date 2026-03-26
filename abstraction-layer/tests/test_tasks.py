"""
Tests for the tasks capability routes (STORY-006).
Mocks Frappe REST API calls to test list and get endpoints.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport, Response
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


SAMPLE_TASKS = [
    {
        "name": "TASK-00001",
        "title": "Follow up with client",
        "task_type": "Follow Up",
        "canonical_state": "Open",
        "priority": "Medium",
        "assigned_user": "dev@willow.com",
        "assigned_role": "",
        "due_at": "2026-03-28 10:00:00",
        "source_system": "Manual",
        "related_crm_record": None,
    },
    {
        "name": "TASK-00002",
        "title": "Review intake form",
        "task_type": "Review",
        "canonical_state": "Open",
        "priority": "High",
        "assigned_user": "",
        "assigned_role": "Front Desk",
        "due_at": "2026-03-27 09:00:00",
        "source_system": "SimplePractice",
        "related_crm_record": "CRM-00001",
    },
    {
        "name": "TASK-00003",
        "title": "Completed task",
        "task_type": "Admin",
        "canonical_state": "Completed",
        "priority": "Low",
        "assigned_user": "dev@willow.com",
        "assigned_role": "",
        "due_at": None,
        "source_system": None,
        "related_crm_record": None,
    },
]

SAMPLE_FULL_TASK = {
    "name": "TASK-00001",
    "title": "Follow up with client",
    "task_type": "Follow Up",
    "description": "Call the client to confirm appointment",
    "canonical_state": "Open",
    "source_state": None,
    "status_reason": None,
    "priority": "Medium",
    "executor_type": "Human",
    "assigned_user": "dev@willow.com",
    "assigned_role": "",
    "assigned_team": None,
    "created_by_user": "dev@willow.com",
    "due_at": "2026-03-28 10:00:00",
    "started_at": None,
    "completed_at": None,
    "sla_hours": None,
    "sla_breached": 0,
    "source_system": "Manual",
    "source_object_id": None,
    "related_crm_record": None,
    "parent_task": None,
    "completion_criteria": None,
    "watchers": [],
    "tags": [],
    "comments": [],
    "state_history": [],
    "assignment_history": [],
}


def _mock_response(status_code: int, data: dict) -> Response:
    """Create a mock httpx Response."""
    return Response(
        status_code=status_code,
        json=data,
        request=MagicMock(),
    )


def _make_mock_client(responses: dict):
    """
    Create a mock httpx.AsyncClient that returns different responses
    based on URL path.
    """
    mock_client = AsyncMock()

    async def mock_get(url, **kwargs):
        params = kwargs.get("params", {})
        if "/api/resource/SM Task/" in url:
            # Single task get
            task_id = url.split("/api/resource/SM Task/")[1]
            if task_id in responses.get("tasks", {}):
                return _mock_response(200, {"data": responses["tasks"][task_id]})
            return _mock_response(404, {"exc_type": "DoesNotExistError"})
        elif url == "/api/resource/SM Task":
            # List endpoint — filter based on params
            filters_str = params.get("filters", "[]")
            filters = json.loads(filters_str) if isinstance(filters_str, str) else filters_str
            tasks = responses.get("list", [])

            # Apply basic filter simulation
            filtered = []
            for t in tasks:
                include = True
                for f in filters:
                    field, op, val = f[0], f[1], f[2]
                    task_val = t.get(field)
                    if op == "=" and task_val != val:
                        include = False
                    elif op == "in":
                        if isinstance(val, list):
                            if task_val not in val:
                                include = False
                        else:
                            if task_val != val:
                                include = False
                    elif op == "not in":
                        if task_val in val:
                            include = False
                return filtered

            return _mock_response(200, {"data": filtered})
        return _mock_response(404, {})

    mock_client.get = mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


@pytest.fixture
def mock_frappe_list():
    """Mock Frappe API for list endpoints returning filtered task data."""
    async def _mock_get(url, **kwargs):
        params = kwargs.get("params", {})
        filters_str = params.get("filters", "[]")
        filters = json.loads(filters_str) if isinstance(filters_str, str) else filters_str

        tasks = list(SAMPLE_TASKS)
        for f in filters:
            field, op, val = f[0], f[1], f[2]
            if op == "=":
                tasks = [t for t in tasks if t.get(field) == val]
            elif op == "in":
                tasks = [t for t in tasks if t.get(field) in val]
            elif op == "not in":
                tasks = [t for t in tasks if t.get(field) not in val]

        return _mock_response(200, {"data": tasks})

    mock_client = AsyncMock()
    mock_client.get = _mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


@pytest.fixture
def mock_frappe_get():
    """Mock Frappe API for single task get."""
    async def _mock_get(url, **kwargs):
        if "TASK-00001" in url:
            return _mock_response(200, {"data": SAMPLE_FULL_TASK})
        if "TASK-99999" in url:
            return _mock_response(404, {"exc_type": "DoesNotExistError"})
        return _mock_response(404, {})

    mock_client = AsyncMock()
    mock_client.get = _mock_get
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


@pytest.mark.anyio
async def test_tasks_list_returns_200(mock_frappe_list):
    """GET /api/modules/tasks/list returns 200 with tasks array."""
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock_frappe_list):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/modules/tasks/list")
    assert resp.status_code == 200
    data = resp.json()
    assert "tasks" in data
    assert "total" in data
    assert isinstance(data["tasks"], list)


@pytest.mark.anyio
async def test_tasks_list_view_mine(mock_frappe_list):
    """view=mine returns only tasks assigned to current user."""
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock_frappe_list):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/modules/tasks/list?view=mine")
    assert resp.status_code == 200
    data = resp.json()
    for task in data["tasks"]:
        assert task["assigned_user"] == "dev@willow.com"


@pytest.mark.anyio
async def test_tasks_list_view_role(mock_frappe_list):
    """view=role returns unowned tasks matching user's roles."""
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock_frappe_list):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/modules/tasks/list?view=role")
    assert resp.status_code == 200
    data = resp.json()
    for task in data["tasks"]:
        assert task["is_unowned"] is True


@pytest.mark.anyio
async def test_tasks_list_view_all(mock_frappe_list):
    """view=all returns union of mine + role with is_unowned correctly set."""
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock_frappe_list):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/modules/tasks/list?view=all")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["tasks"], list)
    # Check that is_unowned is present on all tasks
    for task in data["tasks"]:
        assert "is_unowned" in task


@pytest.mark.anyio
async def test_tasks_list_excludes_resolved_by_default(mock_frappe_list):
    """Default list excludes Completed, Canceled, Failed tasks."""
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock_frappe_list):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/modules/tasks/list")
    assert resp.status_code == 200
    data = resp.json()
    for task in data["tasks"]:
        assert task["canonical_state"] not in ("Completed", "Canceled", "Failed")


@pytest.mark.anyio
async def test_tasks_get_returns_full_task(mock_frappe_get):
    """GET /api/modules/tasks/get?task_id=TASK-00001 returns full task."""
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock_frappe_get):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/modules/tasks/get?task_id=TASK-00001")
    assert resp.status_code == 200
    data = resp.json()
    assert "task" in data
    task = data["task"]
    assert task["name"] == "TASK-00001"
    assert "watchers" in task
    assert "tags" in task
    assert "comments" in task
    assert "state_history" in task
    assert "assignment_history" in task


@pytest.mark.anyio
async def test_tasks_get_returns_404_for_missing_task(mock_frappe_get):
    """GET /api/modules/tasks/get?task_id=TASK-99999 returns 404."""
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock_frappe_get):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/modules/tasks/get?task_id=TASK-99999")
    assert resp.status_code == 404
    data = resp.json()
    assert data["detail"]["error"] == "task_not_found"
