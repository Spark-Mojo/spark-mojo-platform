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


class UpdateStateBody(BaseModel):
    task_id: str
    canonical_state: str
    status_reason: Optional[str] = None


class AddCommentBody(BaseModel):
    task_id: str
    comment: str


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
    "related_crm_record", "creation",
]


def _headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


def _build_filters(
    view: str,
    user_email: str,
    user_roles: list,
    canonical_state: Optional[str],
    priority: Optional[str],
    include_resolved: bool,
) -> list:
    """Build Frappe filter arrays for the list endpoint."""
    filters = []

    if view == "mine":
        filters.append(["assigned_user", "=", user_email])
    elif view == "role":
        filters.append(["assigned_role", "in", user_roles])
        filters.append(["assigned_user", "in", ["", None]])
    # view == "all" handled by combining two queries

    if canonical_state:
        filters.append(["canonical_state", "=", canonical_state])
    elif not include_resolved:
        filters.append(["canonical_state", "not in", list(RESOLVED_STATES)])

    if priority:
        filters.append(["priority", "=", priority])

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
    sort_by: str = "due_at",
    sort_order: str = "asc",
    include_resolved: bool = False,
    include_completed: bool = False,
    user: dict = Depends(get_current_user),
):
    """List SM Task records filtered by view, state, and priority."""
    VALID_VIEWS = {"mine", "role", "all"}
    if view not in VALID_VIEWS:
        raise HTTPException(status_code=400, detail=f"Invalid view '{view}'. Must be one of: {', '.join(VALID_VIEWS)}")

    effective_include_resolved = include_resolved or include_completed

    user_email = user.get("email", "")
    user_roles = user.get("roles", [])

    if view == "all":
        # Union of mine + role results
        mine_filters = _build_filters(
            "mine", user_email, user_roles,
            canonical_state, priority, effective_include_resolved,
        )
        role_filters = _build_filters(
            "role", user_email, user_roles,
            canonical_state, priority, effective_include_resolved,
        )
        mine_tasks = await _fetch_tasks(mine_filters, sort_by, sort_order)
        role_tasks = await _fetch_tasks(role_filters, sort_by, sort_order)

        # Deduplicate by name, mine takes precedence
        seen = set()
        tasks = []
        for t in mine_tasks + role_tasks:
            if t["name"] not in seen:
                seen.add(t["name"])
                tasks.append(_enrich_task_list_item(t))

        # Re-sort combined results
        reverse = sort_order.lower() == "desc"
        tasks.sort(key=lambda t: t.get(sort_by) or "", reverse=reverse)
    else:
        filters = _build_filters(
            view, user_email, user_roles,
            canonical_state, priority, effective_include_resolved,
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

        # Save
        put_resp = await client.put(
            f"/api/resource/SM Task/{body.task_id}",
            json=update,
            timeout=15,
        )
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
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"comments": updated_task.get("comments", [])}


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
        put_resp.raise_for_status()
        updated_task = put_resp.json().get("data", {})

    return {"task": updated_task}
