"""
Tasks capability routes.

Handles SM Task list and get endpoints for the WorkboardMojo.
All data flows through Frappe REST API via token auth.
"""

import os
import json
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user

router = APIRouter(prefix="/api/modules/tasks", tags=["tasks"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

RESOLVED_STATES = ("Completed", "Canceled", "Failed")

LIST_FIELDS = [
    "name", "title", "task_type", "canonical_state", "priority",
    "assigned_user", "assigned_role", "due_at", "source_system",
    "related_crm_record",
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
    user: dict = Depends(get_current_user),
):
    """List SM Task records filtered by view, state, and priority."""
    user_email = user.get("email", "")
    user_roles = user.get("roles", [])

    if view == "all":
        # Union of mine + role results
        mine_filters = _build_filters(
            "mine", user_email, user_roles,
            canonical_state, priority, include_resolved,
        )
        role_filters = _build_filters(
            "role", user_email, user_roles,
            canonical_state, priority, include_resolved,
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
    else:
        filters = _build_filters(
            view, user_email, user_roles,
            canonical_state, priority, include_resolved,
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
