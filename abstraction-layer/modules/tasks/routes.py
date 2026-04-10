"""
Tasks capability routes.

Handles SM Task list, get, and write endpoints for the WorkboardMojo.
All data flows through Frappe REST API via token auth.
"""

import os
import json
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user


class CreateTaskBody(BaseModel):
    title: str
    task_type: str
    description: Optional[str] = None
    priority: Optional[str] = None
    assigned_user: Optional[str] = None
    assigned_role: Optional[str] = None
    due_at: Optional[str] = None
    source_system: Optional[str] = None
    related_crm_record: Optional[str] = None
    parent_task: Optional[str] = None
    completion_criteria: Optional[str] = None
    executor_type: Optional[str] = None


class ClaimTaskBody(BaseModel):
    task_id: str


class AssignTaskBody(BaseModel):
    task_id: str
    assigned_user: Optional[str] = None
    assigned_role: Optional[str] = None
    assigned_team: Optional[str] = None
    due_at: Optional[str] = None


class UpdateStateBody(BaseModel):
    task_id: str
    canonical_state: str
    status_reason: Optional[str] = None


class AddCommentBody(BaseModel):
    task_id: str
    comment: str


class UpdateModeBody(BaseModel):
    task_id: str
    task_mode: str
    snooze_until: Optional[str] = None
    assigned_user: Optional[str] = None
    assigned_role: Optional[str] = None


class CompleteTaskBody(BaseModel):
    task_id: str
    completion_note: Optional[str] = None

router = APIRouter(prefix="/api/modules/tasks", tags=["tasks"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

RESOLVED_STATES = ("Completed", "Canceled", "Failed")

LIST_FIELDS = [
    "name", "title", "task_type", "canonical_state", "priority",
    "assigned_user", "assigned_role", "due_at", "source_system",
    "related_crm_record", "creation", "task_mode",
]


def _headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


VALID_TASK_MODES = ("active", "watching", "snoozed")


def _build_filters(
    view: str,
    user_email: str,
    user_roles: list,
    canonical_state: Optional[str],
    priority: Optional[str],
    include_resolved: bool,
    task_mode: Optional[str] = None,
) -> list:
    """Build Frappe filter arrays for the list endpoint."""
    filters = []

    if view == "mine":
        filters.append(["assigned_user", "=", user_email])
    elif view == "role":
        filters.append(["assigned_role", "in", user_roles])
        filters.append(["assigned_user", "in", ["", None]])
    # view == "all": no user/role filter — return all tasks

    if canonical_state:
        filters.append(["canonical_state", "=", canonical_state])
    elif not include_resolved:
        filters.append(["canonical_state", "not in", list(RESOLVED_STATES)])

    if priority:
        filters.append(["priority", "=", priority])

    if task_mode:
        filters.append(["task_mode", "=", task_mode])

    return filters


def _sort_key(sort_by: str, sort_order: str) -> str:
    """Build Frappe order_by clause."""
    direction = sort_order if sort_order in ("asc", "desc") else "asc"
    field = sort_by if sort_by in ("due_at", "priority", "created_at", "canonical_state") else "due_at"
    return f"{field} {direction}"


def _enrich_task_list_item(task: dict) -> dict:
    """Add computed fields to a task list item."""
    task["is_unowned"] = bool(task.get("assigned_role") and not task.get("assigned_user"))
    return task


async def _fetch_tasks(filters: list, sort_by: str, sort_order: str) -> list:
    """Fetch SM Task records from Frappe with given filters."""
    params = {
        "fields": json.dumps(LIST_FIELDS),
        "filters": json.dumps(filters),
        "order_by": _sort_key(sort_by, sort_order),
        "limit_page_length": 0,
    }
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.get("/api/resource/SM Task", params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", [])


@router.get("/list")
async def tasks_list(
    view: str = "mine",
    canonical_state: Optional[str] = None,
    priority: Optional[str] = None,
    task_mode: Optional[str] = None,
    sort_by: str = "due_at",
    sort_order: str = "asc",
    include_resolved: bool = False,
    include_completed: bool = False,
    user: dict = Depends(get_current_user),
):
    """List SM Task records filtered by view, state, priority, and task_mode."""
    VALID_VIEWS = {"mine", "role", "all"}
    if view not in VALID_VIEWS:
        raise HTTPException(status_code=400, detail=f"Invalid view '{view}'. Must be one of: {', '.join(VALID_VIEWS)}")

    effective_include_resolved = include_resolved or include_completed

    user_email = user.get("email", "")
    user_roles = user.get("roles", [])

    if view == "all":
        all_filters = _build_filters(
            "all", user_email, user_roles,
            canonical_state, priority, effective_include_resolved,
            task_mode=task_mode,
        )
        tasks = [_enrich_task_list_item(t) for t in await _fetch_tasks(all_filters, sort_by, sort_order)]
    else:
        filters = _build_filters(
            view, user_email, user_roles,
            canonical_state, priority, effective_include_resolved,
            task_mode=task_mode,
        )
        tasks = [_enrich_task_list_item(t) for t in await _fetch_tasks(filters, sort_by, sort_order)]

    return {"tasks": tasks, "total": len(tasks)}


@router.get("/get")
async def tasks_get(
    task_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single SM Task with all child tables."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.get(
            f"/api/resource/SM Task/{task_id}",
            timeout=15,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail={"error": "task_not_found"})
        if resp.status_code == 403:
            raise HTTPException(status_code=403, detail={"error": "unauthorized"})
        resp.raise_for_status()
        task = resp.json().get("data", {})

    return {"task": task}


@router.post("/create")
async def tasks_create(
    body: CreateTaskBody,
    user: dict = Depends(get_current_user),
):
    """Create a new SM Task."""
    task_data = body.model_dump(exclude_none=True)
    task_data["doctype"] = "SM Task"
    task_data["created_by_user"] = user.get("email", "")

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.post(
            "/api/resource/SM Task",
            json=task_data,
            timeout=15,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json())
        resp.raise_for_status()
        task = resp.json().get("data", {})

    return {"task": task}


@router.post("/claim")
async def tasks_claim(
    body: ClaimTaskBody,
    user: dict = Depends(get_current_user),
):
    """Claim an unowned task assigned to one of the user's roles."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Load current task
        get_resp = await client.get(
            f"/api/resource/SM Task/{body.task_id}",
            timeout=15,
        )
        if get_resp.status_code == 404:
            raise HTTPException(status_code=404, detail={"error": "task_not_found"})
        get_resp.raise_for_status()
        task = get_resp.json().get("data", {})

        # Check if already owned
        if task.get("assigned_user"):
            raise HTTPException(status_code=409, detail={"error": "task_already_owned"})

        # Check role eligibility
        task_role = task.get("assigned_role")
        if task_role and task_role not in user.get("roles", []):
            raise HTTPException(status_code=403, detail={"error": "not_in_role"})

        # Build update payload
        update = {"assigned_user": user.get("email", "")}
        if task.get("canonical_state") in ("New", "Ready"):
            update["canonical_state"] = "In Progress"

        # Save
        put_resp = await client.put(
            f"/api/resource/SM Task/{body.task_id}",
            json=update,
            timeout=15,
        )
        if put_resp.status_code >= 400:
            raise HTTPException(status_code=422, detail=put_resp.json())
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"task": updated_task}


@router.post("/assign")
async def tasks_assign(
    body: AssignTaskBody,
    user: dict = Depends(get_current_user),
):
    """Update ownership fields on a task."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Load current task
        get_resp = await client.get(
            f"/api/resource/SM Task/{body.task_id}",
            timeout=15,
        )
        if get_resp.status_code == 404:
            raise HTTPException(status_code=404, detail={"error": "task_not_found"})
        get_resp.raise_for_status()

        # Build update with provided fields
        update = {}
        if body.assigned_user is not None:
            update["assigned_user"] = body.assigned_user
        if body.assigned_role is not None:
            update["assigned_role"] = body.assigned_role
        if body.assigned_team is not None:
            update["assigned_team"] = body.assigned_team
        if body.due_at is not None:
            update["due_at"] = body.due_at or None

        # Save
        put_resp = await client.put(
            f"/api/resource/SM Task/{body.task_id}",
            json=update,
            timeout=15,
        )
        if put_resp.status_code >= 400:
            raise HTTPException(status_code=422, detail=put_resp.json())
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"task": updated_task}


@router.post("/update_state")
async def tasks_update_state(
    body: UpdateStateBody,
    user: dict = Depends(get_current_user),
):
    """Transition task to a new canonical state."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Load current task
        get_resp = await client.get(
            f"/api/resource/SM Task/{body.task_id}",
            timeout=15,
        )
        if get_resp.status_code == 404:
            raise HTTPException(status_code=404, detail={"error": "task_not_found"})
        get_resp.raise_for_status()

        # Build update
        update = {"canonical_state": body.canonical_state}
        if body.status_reason is not None:
            update["status_reason"] = body.status_reason

        # Save — Frappe controller validates Blocked/Failed require reason
        put_resp = await client.put(
            f"/api/resource/SM Task/{body.task_id}",
            json=update,
            timeout=15,
        )
        if put_resp.status_code in (400, 417):
            raise HTTPException(status_code=400, detail=put_resp.json())
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"task": updated_task}


@router.post("/add_comment")
async def tasks_add_comment(
    body: AddCommentBody,
    user: dict = Depends(get_current_user),
):
    """Append a comment to a task's comments child table."""
    from datetime import datetime

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Load current task
        get_resp = await client.get(
            f"/api/resource/SM Task/{body.task_id}",
            timeout=15,
        )
        if get_resp.status_code == 404:
            raise HTTPException(status_code=404, detail={"error": "task_not_found"})
        get_resp.raise_for_status()
        task = get_resp.json().get("data", {})

        # Append comment row
        comments = task.get("comments", [])
        comments.append({
            "comment": body.comment,
            "created_by": user.get("email", ""),
            "created_at": datetime.utcnow().isoformat(),
        })

        # Save
        put_resp = await client.put(
            f"/api/resource/SM Task/{body.task_id}",
            json={"comments": comments},
            timeout=15,
        )
        if put_resp.status_code >= 400:
            raise HTTPException(status_code=422, detail=put_resp.json())
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"comments": updated_task.get("comments", [])}


@router.post("/update_mode")
async def tasks_update_mode(
    body: UpdateModeBody,
    user: dict = Depends(get_current_user),
):
    """Update task_mode on an SM Task (active, watching, snoozed)."""
    from datetime import datetime

    # Validate task_mode value
    if body.task_mode not in VALID_TASK_MODES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid task_mode '{body.task_mode}'. Must be one of: {', '.join(VALID_TASK_MODES)}",
        )

    # Validate snooze_until for snoozed mode
    if body.task_mode == "snoozed":
        if not body.snooze_until:
            raise HTTPException(
                status_code=422,
                detail="snooze_until required when task_mode is snoozed",
            )
        try:
            snooze_dt = datetime.fromisoformat(body.snooze_until)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=422,
                detail="snooze_until must be a valid ISO datetime",
            )
        if snooze_dt <= datetime.now():
            raise HTTPException(
                status_code=422,
                detail="snooze_until must be a future datetime",
            )

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Load current task
        get_resp = await client.get(
            f"/api/resource/SM Task/{body.task_id}",
            timeout=15,
        )
        if get_resp.status_code == 404:
            raise HTTPException(status_code=404, detail={"error": "task_not_found"})
        get_resp.raise_for_status()

        # Build update payload
        update = {"task_mode": body.task_mode}
        if body.task_mode == "snoozed":
            update["snooze_until"] = body.snooze_until
        else:
            update["snooze_until"] = None

        # If transitioning TO active, include optional assignment fields
        if body.task_mode == "active":
            if body.assigned_user is not None:
                update["assigned_user"] = body.assigned_user
            if body.assigned_role is not None:
                update["assigned_role"] = body.assigned_role

        # Save
        put_resp = await client.put(
            f"/api/resource/SM Task/{body.task_id}",
            json=update,
            timeout=15,
        )
        if put_resp.status_code >= 400:
            raise HTTPException(status_code=422, detail=put_resp.json())
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"task": updated_task}


@router.get("/users")
async def tasks_get_users(user: dict = Depends(get_current_user)):
    """Return active system users eligible for task assignment."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.get(
            "/api/resource/User",
            params={
                "filters": json.dumps([
                    ["enabled", "=", 1],
                    ["user_type", "=", "System User"],
                    ["name", "not in", ["Administrator", "Guest"]],
                ]),
                "fields": json.dumps(["name", "full_name", "first_name"]),
                "limit_page_length": 100,
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json())
        users = resp.json().get("data", [])
        result = []
        for u in users:
            display = u.get("full_name") or u.get("first_name") or u["name"]
            parts = display.strip().split()
            initials = "".join(p[0].upper() for p in parts[:2])
            result.append({
                "email": u["name"],
                "full_name": u.get("full_name", u["name"]),
                "first_name": u.get("first_name", u["name"]),
                "initials": initials or u["name"][:2].upper(),
            })
        return {"users": result}


@router.get("/roles")
async def tasks_get_roles(user: dict = Depends(get_current_user)):
    """Return roles available for task assignment."""
    EXCLUDED_ROLES = ["Administrator", "Guest", "All", "System Manager", "Desk User"]
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.get(
            "/api/resource/Role",
            params={
                "filters": json.dumps([
                    ["name", "not in", EXCLUDED_ROLES],
                ]),
                "fields": json.dumps(["name"]),
                "limit_page_length": 100,
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json())
        roles = resp.json().get("data", [])
        return {"roles": [{"name": r["name"]} for r in roles]}


@router.post("/complete")
async def tasks_complete(
    body: CompleteTaskBody,
    user: dict = Depends(get_current_user),
):
    """Mark a task as completed, optionally adding a completion note."""
    from datetime import datetime

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Load current task
        get_resp = await client.get(
            f"/api/resource/SM Task/{body.task_id}",
            timeout=15,
        )
        if get_resp.status_code == 404:
            raise HTTPException(status_code=404, detail={"error": "task_not_found"})
        get_resp.raise_for_status()
        task = get_resp.json().get("data", {})

        # Build update
        update = {"canonical_state": "Completed"}

        # If completion_note, append to comments
        if body.completion_note:
            comments = task.get("comments", [])
            comments.append({
                "comment": body.completion_note,
                "created_by": user.get("email", ""),
                "created_at": datetime.utcnow().isoformat(),
            })
            update["comments"] = comments

        # Save
        put_resp = await client.put(
            f"/api/resource/SM Task/{body.task_id}",
            json=update,
            timeout=15,
        )
        if put_resp.status_code >= 400:
            raise HTTPException(status_code=422, detail=put_resp.json())
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"task": updated_task}
