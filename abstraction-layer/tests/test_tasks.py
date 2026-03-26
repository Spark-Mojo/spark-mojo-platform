"""
Tests for the tasks capability routes (STORY-006, STORY-007).
Mocks Frappe REST API calls to test list, get, and write endpoints.
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


# --- STORY-007: Write endpoint fixtures ---

UNOWNED_TASK = {
    **SAMPLE_FULL_TASK,
    "name": "TASK-00002",
    "assigned_user": "",
    "assigned_role": "Front Desk",
    "canonical_state": "New",
    "comments": [],
}

OWNED_TASK = {
    **SAMPLE_FULL_TASK,
    "name": "TASK-00001",
    "assigned_user": "other@willow.com",
    "canonical_state": "In Progress",
    "comments": [],
}


def _make_write_mock(task_data, *, post_response=None, put_response=None, put_status=200):
    """
    Create a mock httpx client that handles GET, POST, and PUT.
    task_data: dict keyed by task name → task dict (for GET)
    post_response: response data for POST create
    put_response: response data for PUT save (if None, echoes update merged with original)
    """
    mock_client = AsyncMock()

    async def mock_get(url, **kwargs):
        for name, task in task_data.items():
            if name in url:
                return _mock_response(200, {"data": task})
        return _mock_response(404, {"exc_type": "DoesNotExistError"})

    async def mock_post(url, **kwargs):
        if post_response is not None:
            return _mock_response(200, {"data": post_response})
        body = kwargs.get("json", {})
        body["name"] = "TASK-NEW-001"
        return _mock_response(200, {"data": body})

    async def mock_put(url, **kwargs):
        if put_status >= 400:
            return _mock_response(put_status, {"exc_type": "ValidationError", "message": "Status reason required"})
        if put_response is not None:
            return _mock_response(200, {"data": put_response})
        # Merge update into original task
        body = kwargs.get("json", {})
        task_id = url.split("/api/resource/SM Task/")[1] if "/api/resource/SM Task/" in url else ""
        original = task_data.get(task_id, {})
        merged = {**original, **body}
        return _mock_response(200, {"data": merged})

    mock_client.get = mock_get
    mock_client.post = mock_post
    mock_client.put = mock_put
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


# --- STORY-007: Write endpoint tests ---

@pytest.mark.anyio
async def test_tasks_create_returns_created_task():
    """POST /api/modules/tasks/create creates a task and returns it."""
    mock = _make_write_mock({})
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/create",
                json={"title": "New task", "task_type": "Follow Up"},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert "task" in data
    assert data["task"]["title"] == "New task"
    assert data["task"]["task_type"] == "Follow Up"
    assert data["task"]["created_by_user"] == "dev@willow.com"


@pytest.mark.anyio
async def test_tasks_claim_assigns_current_user():
    """POST /api/modules/tasks/claim on unowned task assigns current user."""
    mock = _make_write_mock({"TASK-00002": UNOWNED_TASK})
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/claim",
                json={"task_id": "TASK-00002"},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["task"]["assigned_user"] == "dev@willow.com"
    assert data["task"]["canonical_state"] == "In Progress"


@pytest.mark.anyio
async def test_tasks_claim_returns_409_if_already_owned():
    """POST /api/modules/tasks/claim on owned task returns 409."""
    mock = _make_write_mock({"TASK-00001": OWNED_TASK})
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/claim",
                json={"task_id": "TASK-00001"},
            )
    assert resp.status_code == 409
    data = resp.json()
    assert data["detail"]["error"] == "task_already_owned"


@pytest.mark.anyio
async def test_tasks_assign_updates_ownership():
    """POST /api/modules/tasks/assign updates ownership fields."""
    mock = _make_write_mock({"TASK-00002": UNOWNED_TASK})
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/assign",
                json={"task_id": "TASK-00002", "assigned_user": "new@willow.com"},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["task"]["assigned_user"] == "new@willow.com"


@pytest.mark.anyio
async def test_tasks_update_state_transitions():
    """POST /api/modules/tasks/update_state changes canonical_state."""
    mock = _make_write_mock({"TASK-00002": UNOWNED_TASK})
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/update_state",
                json={"task_id": "TASK-00002", "canonical_state": "In Progress"},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["task"]["canonical_state"] == "In Progress"


@pytest.mark.anyio
async def test_tasks_update_state_blocked_without_reason_returns_400():
    """POST /api/modules/tasks/update_state to Blocked without reason returns 400."""
    mock = _make_write_mock({"TASK-00002": UNOWNED_TASK}, put_status=417)
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/update_state",
                json={"task_id": "TASK-00002", "canonical_state": "Blocked"},
            )
    assert resp.status_code == 400


@pytest.mark.anyio
async def test_tasks_add_comment_appends_comment():
    """POST /api/modules/tasks/add_comment appends and returns comments."""
    task_with_comments = {**UNOWNED_TASK, "comments": []}
    put_response = {**task_with_comments, "comments": [
        {"comment": "Test comment", "created_by": "dev@willow.com", "created_at": "2026-03-26T12:00:00"}
    ]}
    mock = _make_write_mock({"TASK-00002": task_with_comments}, put_response=put_response)
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/add_comment",
                json={"task_id": "TASK-00002", "comment": "Test comment"},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert "comments" in data
    assert len(data["comments"]) == 1
    assert data["comments"][0]["comment"] == "Test comment"


@pytest.mark.anyio
async def test_tasks_complete_sets_completed_state():
    """POST /api/modules/tasks/complete sets canonical_state to Completed."""
    completed_task = {**UNOWNED_TASK, "canonical_state": "Completed"}
    mock = _make_write_mock({"TASK-00002": UNOWNED_TASK}, put_response=completed_task)
    with patch("modules.tasks.routes.httpx.AsyncClient", return_value=mock):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/modules/tasks/complete",
                json={"task_id": "TASK-00002"},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["task"]["canonical_state"] == "Completed"
