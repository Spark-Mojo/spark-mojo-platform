"""
Onboarding capability routes.

Handles SM Client CRUD with computed fields (urgency_level, completion_pct).
All data flows through Frappe REST API via token auth.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user
from secrets_loader import read_secret

router = APIRouter(prefix="/api/modules/onboarding", tags=["onboarding"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")


def _headers():
    return {
        "Authorization": (
            f"token {read_secret('frappe_api_key')}:"
            f"{read_secret('frappe_api_secret')}"
        ),
        "Content-Type": "application/json",
    }


def _compute_urgency(client: dict) -> str:
    """Compute urgency level based on appointment proximity and status."""
    status = client.get("onboarding_status", "")
    if status in ("Ready", "Cancelled"):
        return "normal"

    appt = client.get("first_appointment_date")
    if not appt:
        return "normal"

    try:
        if isinstance(appt, str):
            # Handle both datetime and date formats
            for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                try:
                    appt_dt = datetime.strptime(appt, fmt)
                    break
                except ValueError:
                    continue
            else:
                return "normal"
        else:
            appt_dt = appt

        now = datetime.now()
        delta = appt_dt - now

        if delta <= timedelta(hours=48):
            return "urgent"
        elif delta <= timedelta(days=7):
            return "warning"
    except Exception:
        pass

    return "normal"


def _compute_completion(client: dict) -> int:
    """Compute completion percentage from checklist items."""
    checklist = client.get("onboarding_checklist", [])
    if not checklist:
        return 0

    required = [item for item in checklist if item.get("is_required")]
    if not required:
        return 100

    done = sum(1 for item in required if item.get("is_complete"))
    return round((done / len(required)) * 100)


def _enrich_client(client: dict) -> dict:
    """Add computed fields to a client record."""
    client["urgency_level"] = _compute_urgency(client)
    if client.get("onboarding_status") == "Ready":
        client["completion_pct"] = 100
    else:
        client["completion_pct"] = _compute_completion(client)
    return client


@router.get("/list")
async def onboarding_list(
    status: Optional[str] = None,
    clinician: Optional[str] = None,
    search: Optional[str] = None,
    page_length: int = 0,
    user: dict = Depends(get_current_user),
):
    """List SM Client records with computed urgency and completion fields.

    page_length=0 fetches all matching records. With Cancelled excluded by
    default, this is typically ~2500 records for a single clinic.
    """
    filters = []
    if status:
        filters.append(["onboarding_status", "=", status])
    else:
        # Exclude Cancelled by default so active + Ready clients aren't
        # pushed off by recently-modified archived records. The frontend
        # needs Ready records for the "Ready" KPI card and filter chip.
        # The History tab passes status=Cancelled explicitly to fetch those.
        filters.append(["onboarding_status", "not in", ["Cancelled"]])
    if clinician:
        filters.append(["assigned_clinician", "=", clinician])

    fields = [
        "name", "client_name", "date_added", "assigned_clinician",
        "assigned_staff", "first_appointment_date", "onboarding_status",
        "insurance_primary", "insurance_secondary", "insurance_verified",
        "insurance_card_uploaded", "self_pay", "gfe_sent",
        "custody_agreement_required", "member_id", "employer",
        "sp_note_added", "insurance_updated_in_sp",
    ]

    params = {
        "fields": json.dumps(fields),
        "limit_page_length": page_length,
        "order_by": "modified desc",
    }
    if filters:
        params["filters"] = json.dumps(filters)

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.get("/api/resource/SM Client", params=params, timeout=15)
        resp.raise_for_status()
        clients = resp.json().get("data", [])

        # Fetch checklist detail only for active clients (not Ready —
        # Ready clients are 100% complete by definition). This avoids
        # ~2000+ sequential HTTP requests for the N+1 detail fetch.
        SKIP_DETAIL_STATUSES = {"Ready", "Cancelled"}
        enriched = []
        for c in clients:
            if c.get("onboarding_status") not in SKIP_DETAIL_STATUSES:
                detail_resp = await client.get(
                    f"/api/resource/SM Client/{c['name']}",
                    timeout=15,
                )
                if detail_resp.status_code == 200:
                    full = detail_resp.json().get("data", {})
                    c["onboarding_checklist"] = full.get("onboarding_checklist", [])

            c = _enrich_client(c)

            # Apply search filter client-side (Frappe doesn't do OR search well)
            if search:
                search_lower = search.lower()
                if (search_lower not in c.get("client_name", "").lower() and
                    search_lower not in c.get("assigned_clinician", "").lower()):
                    continue

            # Remove raw checklist from list response (too verbose)
            c.pop("onboarding_checklist", None)
            enriched.append(c)

    return {"data": enriched}


@router.get("/get/{client_name}")
async def onboarding_get(
    client_name: str,
    user: dict = Depends(get_current_user),
):
    """Get full SM Client record including child tables."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.get(
            f"/api/resource/SM Client/{client_name}",
            timeout=15,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Client not found")
        resp.raise_for_status()
        record = resp.json().get("data", {})

    record = _enrich_client(record)
    return {"data": record}


@router.post("/update/{client_name}")
async def onboarding_update(
    client_name: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Update fields on an SM Client record."""
    body = await request.json()

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.put(
            f"/api/resource/SM Client/{client_name}",
            json=body,
            timeout=15,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Client not found")
        resp.raise_for_status()
        record = resp.json().get("data", {})

    record = _enrich_client(record)
    return {"data": record}


@router.post("/checklist/toggle")
async def onboarding_checklist_toggle(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Toggle a checklist item and recalculate completion."""
    body = await request.json()
    client_name = body.get("client_name")
    item_name = body.get("item_name")
    is_complete = body.get("is_complete", False)
    completed_by = body.get("completed_by", user.get("initials", ""))

    if not client_name or not item_name:
        raise HTTPException(status_code=400, detail="client_name and item_name required")

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Fetch current record
        resp = await client.get(
            f"/api/resource/SM Client/{client_name}",
            timeout=15,
        )
        resp.raise_for_status()
        record = resp.json().get("data", {})

        # Update the specific checklist item
        checklist = record.get("onboarding_checklist", [])
        for item in checklist:
            if item.get("item_name") == item_name:
                item["is_complete"] = 1 if is_complete else 0
                if is_complete:
                    item["completed_by"] = completed_by
                    item["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                else:
                    item["completed_by"] = ""
                    item["completed_at"] = None
                break

        # Save back via PUT
        update_resp = await client.put(
            f"/api/resource/SM Client/{client_name}",
            json={"onboarding_checklist": checklist},
            timeout=15,
        )
        update_resp.raise_for_status()
        updated = update_resp.json().get("data", {})

    updated = _enrich_client(updated)
    return {"data": updated}


@router.post("/outreach/log")
async def onboarding_outreach_log(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Log a new outreach attempt for a client."""
    body = await request.json()
    client_name = body.get("client_name")
    method = body.get("method")
    staff_initials = body.get("staff_initials", user.get("initials", ""))
    notes = body.get("notes", "")

    if not client_name or not method:
        raise HTTPException(status_code=400, detail="client_name and method required")

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        # Fetch current outreach log
        resp = await client.get(
            f"/api/resource/SM Client/{client_name}",
            timeout=15,
        )
        resp.raise_for_status()
        record = resp.json().get("data", {})

        outreach = record.get("outreach_log", [])
        outreach.append({
            "attempt_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "method": method,
            "staff_initials": staff_initials,
            "notes": notes,
        })

        update_resp = await client.put(
            f"/api/resource/SM Client/{client_name}",
            json={"outreach_log": outreach},
            timeout=15,
        )
        update_resp.raise_for_status()
        updated = update_resp.json().get("data", {})

    return {"data": updated}


# ─── Default checklist items for new clients ───
DEFAULT_CHECKLIST = [
    {"item_name": "Collect Paperwork", "category": "Paperwork", "is_required": 1, "is_complete": 0, "applies_to_self_pay_only": 0},
    {"item_name": "Insurance Card Uploaded", "category": "Insurance", "is_required": 1, "is_complete": 0, "applies_to_self_pay_only": 0},
    {"item_name": "Verify Primary Insurance", "category": "Insurance", "is_required": 1, "is_complete": 0, "applies_to_self_pay_only": 0},
    {"item_name": "Enter Insurance in SimplePractice", "category": "Administrative", "is_required": 1, "is_complete": 0, "applies_to_self_pay_only": 0},
    {"item_name": "SP Note Added", "category": "Administrative", "is_required": 1, "is_complete": 0, "applies_to_self_pay_only": 0},
    {"item_name": "Confirm First Appointment", "category": "Administrative", "is_required": 1, "is_complete": 0, "applies_to_self_pay_only": 0},
    {"item_name": "Send Welcome Email", "category": "Administrative", "is_required": 0, "is_complete": 0, "applies_to_self_pay_only": 0},
    {"item_name": "GFE Sent", "category": "Administrative", "is_required": 0, "is_complete": 0, "applies_to_self_pay_only": 1},
    {"item_name": "Custody Agreement Collected", "category": "Paperwork", "is_required": 0, "is_complete": 0, "applies_to_self_pay_only": 0},
]


@router.post("/create")
async def onboarding_create(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Create a new SM Client with default onboarding checklist."""
    body = await request.json()

    client_name = body.get("client_name", "").strip()
    clinician = body.get("clinician", "").strip()
    first_appointment_date = body.get("first_appointment_date")

    if not client_name or not clinician or not first_appointment_date:
        raise HTTPException(status_code=400, detail="client_name, clinician, and first_appointment_date are required")

    client_data = {
        "client_name": client_name,
        "assigned_clinician": clinician,
        "first_appointment_date": first_appointment_date,
        "date_added": datetime.now().strftime("%Y-%m-%d"),
        "onboarding_status": "New",
        "insurance_primary": body.get("insurance_primary", ""),
        "insurance_secondary": body.get("insurance_secondary", ""),
        "self_pay": 1 if body.get("self_pay") else 0,
        "gfe_sent": 1 if body.get("gfe_sent") else 0,
        "custody_agreement_required": 1 if body.get("custody_agreement_required") else 0,
        "assigned_staff": body.get("staff_initials", ""),
        "notes": body.get("notes", ""),
        "onboarding_checklist": DEFAULT_CHECKLIST,
    }

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.post(
            "/api/resource/SM Client",
            json=client_data,
            timeout=15,
        )
        if resp.status_code == 409:
            raise HTTPException(status_code=409, detail="A client with this name already exists")
        resp.raise_for_status()
        record = resp.json().get("data", {})

    record = _enrich_client(record)
    return {"data": record}


@router.post("/archive/{client_name}")
async def onboarding_archive(
    client_name: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Archive/cancel a client with a reason."""
    body = await request.json()
    reason = body.get("reason", "")
    notes = body.get("notes", "")

    if not reason:
        raise HTTPException(status_code=400, detail="reason is required")

    update_data = {
        "onboarding_status": "Cancelled",
        "archive_reason": reason,
        "archived_date": datetime.now().strftime("%Y-%m-%d"),
        "archived_notes": notes,
    }

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.put(
            f"/api/resource/SM Client/{client_name}",
            json=update_data,
            timeout=15,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Client not found")
        resp.raise_for_status()
        record = resp.json().get("data", {})

    record = _enrich_client(record)
    return {"data": record}


@router.post("/reactivate/{client_name}")
async def onboarding_reactivate(
    client_name: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Reactivate a cancelled client."""
    body = await request.json()
    first_appointment_date = body.get("first_appointment_date")

    if not first_appointment_date:
        raise HTTPException(status_code=400, detail="first_appointment_date is required")

    update_data = {
        "onboarding_status": "New",
        "first_appointment_date": first_appointment_date,
        "archive_reason": "",
        "archived_date": None,
        "archived_notes": "",
    }

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.put(
            f"/api/resource/SM Client/{client_name}",
            json=update_data,
            timeout=15,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Client not found")
        resp.raise_for_status()
        record = resp.json().get("data", {})

    record = _enrich_client(record)
    return {"data": record}


@router.post("/complete/{client_name}")
async def onboarding_complete(
    client_name: str,
    user: dict = Depends(get_current_user),
):
    """Mark a client as complete."""
    update_data = {
        "onboarding_status": "Ready",
        "completed_date": datetime.now().strftime("%Y-%m-%d"),
    }

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.put(
            f"/api/resource/SM Client/{client_name}",
            json=update_data,
            timeout=15,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Client not found")
        resp.raise_for_status()
        record = resp.json().get("data", {})

    record = _enrich_client(record)
    return {"data": record}


@router.get("/history")
async def onboarding_history(
    status_filter: Optional[str] = None,
    year: Optional[int] = None,
    clinician: Optional[str] = None,
    search: Optional[str] = None,
    page_length: int = 200,
    page: int = 1,
    user: dict = Depends(get_current_user),
):
    """List completed and cancelled clients for historical view."""
    filters = []

    if status_filter == "completed":
        filters.append(["onboarding_status", "=", "Ready"])
    elif status_filter == "cancelled":
        filters.append(["onboarding_status", "=", "Cancelled"])
    else:
        filters.append(["onboarding_status", "in", ["Ready", "Cancelled"]])

    if clinician:
        filters.append(["assigned_clinician", "=", clinician])

    fields = [
        "name", "client_name", "date_added", "assigned_clinician",
        "assigned_staff", "first_appointment_date", "onboarding_status",
        "insurance_primary", "insurance_secondary", "self_pay",
        "archive_reason", "archived_date", "archived_notes", "completed_date",
    ]

    limit_start = (page - 1) * page_length

    params = {
        "fields": json.dumps(fields),
        "filters": json.dumps(filters),
        "limit_start": limit_start,
        "limit_page_length": page_length,
        "order_by": "modified desc",
    }

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_headers()) as client:
        resp = await client.get("/api/resource/SM Client", params=params, timeout=15)
        resp.raise_for_status()
        clients_list = resp.json().get("data", [])

        if year:
            year_str = str(year)
            clients_list = [
                c for c in clients_list
                if (c.get("archived_date", "") or "").startswith(year_str)
                or (c.get("completed_date", "") or "").startswith(year_str)
                or (c.get("date_added", "") or "").startswith(year_str)
            ]

        if search:
            search_lower = search.lower()
            clients_list = [
                c for c in clients_list
                if search_lower in (c.get("client_name", "") or "").lower()
                or search_lower in (c.get("assigned_clinician", "") or "").lower()
            ]

        enriched = [_enrich_client(c) for c in clients_list]

    return {"data": enriched}
