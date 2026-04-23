import json
import logging
import os
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.platform-billing")

router = APIRouter(
    prefix="/api/modules/platform-billing",
    tags=["platform-billing"],
)

ADMIN_FRAPPE_URL = os.getenv("ADMIN_FRAPPE_URL", "")


def _read_secret_or_empty(name: str) -> str:
    try:
        return read_secret(name)
    except SecretNotFoundError:
        return ""


ADMIN_API_KEY = _read_secret_or_empty("admin_api_key")
ADMIN_API_SECRET = _read_secret_or_empty("admin_api_secret")
STRIPE_SECRET_KEY = _read_secret_or_empty("stripe_secret_key")


def _admin_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if ADMIN_API_KEY and ADMIN_API_SECRET:
        headers["Authorization"] = f"token {ADMIN_API_KEY}:{ADMIN_API_SECRET}"
    return headers


@router.get("/mrr")
async def get_mrr(user: dict = Depends(get_current_user)):
    allowed_roles = {"SM Finance", "SM Exec", "SM Ops"}
    user_roles = set(user.get("roles", []))
    if not allowed_roles & user_roles:
        raise HTTPException(
            status_code=403,
            detail="Requires SM Finance, SM Exec, or SM Ops role",
        )

    if not ADMIN_FRAPPE_URL:
        raise HTTPException(status_code=500, detail="Admin site not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Platform Billing",
            params={
                "fields": json.dumps([
                    "site_registry", "billing_motion",
                    "monthly_revenue", "annual_revenue",
                    "billing_health",
                ]),
                "limit_page_length": 1000,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail="Failed to query SM Platform Billing",
            )
        records = resp.json().get("data", [])

    total_mrr = sum(float(r.get("monthly_revenue") or 0) for r in records)
    self_serve_mrr = sum(
        float(r.get("monthly_revenue") or 0)
        for r in records
        if r.get("billing_motion") == "self_serve"
    )
    managed_mrr = sum(
        float(r.get("monthly_revenue") or 0)
        for r in records
        if r.get("billing_motion") == "managed_account"
    )

    total_arr = total_mrr * 12
    active_clients = len([
        r for r in records
        if r.get("billing_health") in ("healthy", "at_risk")
    ])

    by_motion = {
        "self_serve": {
            "mrr": self_serve_mrr,
            "arr": self_serve_mrr * 12,
            "client_count": len([
                r for r in records
                if r.get("billing_motion") == "self_serve"
            ]),
        },
        "managed_account": {
            "mrr": managed_mrr,
            "arr": managed_mrr * 12,
            "client_count": len([
                r for r in records
                if r.get("billing_motion") == "managed_account"
            ]),
        },
    }

    return {
        "total_mrr": total_mrr,
        "total_arr": total_arr,
        "active_clients": active_clients,
        "by_motion": by_motion,
        "as_of": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/dunning")
async def get_dunning_queue(user: dict = Depends(get_current_user)):
    allowed_roles = {"SM Finance", "SM Exec", "SM Ops"}
    user_roles = set(user.get("roles", []))
    if not allowed_roles & user_roles:
        raise HTTPException(
            status_code=403,
            detail="Requires SM Finance, SM Exec, or SM Ops role",
        )

    now_ts = int(time.time())
    stripe_past_due = []

    if STRIPE_SECRET_KEY:
        async with httpx.AsyncClient() as client:
            stripe_resp = await client.get(
                "https://api.stripe.com/v1/invoices",
                params={"status": "open", "limit": 100},
                headers={
                    "Authorization": f"Bearer {STRIPE_SECRET_KEY}",
                },
                timeout=15,
            )
            if stripe_resp.status_code == 200:
                invoices = stripe_resp.json().get("data", [])
                for inv in invoices:
                    due_date = inv.get("due_date")
                    if not due_date or due_date >= now_ts:
                        continue
                    cust_id = inv.get("customer")
                    site_resp = await client.get(
                        f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
                        params={
                            "filters": json.dumps(
                                [["stripe_customer_id", "=", cust_id]]
                            ),
                            "fields": json.dumps(["name", "site_name"]),
                            "limit_page_length": 1,
                        },
                        headers=_admin_headers(),
                        timeout=10,
                    )
                    site_name = None
                    if site_resp.status_code == 200:
                        sites = site_resp.json().get("data", [])
                        if sites:
                            site_name = sites[0].get("site_name")

                    next_retry_ts = inv.get("next_payment_attempt")
                    next_retry = (
                        datetime.fromtimestamp(
                            next_retry_ts, tz=timezone.utc
                        ).isoformat()
                        if next_retry_ts
                        else None
                    )

                    stripe_past_due.append({
                        "motion": "self_serve",
                        "site_name": site_name,
                        "customer_name": inv.get("customer_name"),
                        "stripe_invoice_id": inv.get("id"),
                        "amount_due": (inv.get("amount_due", 0)) / 100,
                        "days_overdue": (now_ts - due_date) // 86400,
                        "next_retry": next_retry,
                        "retry_count": inv.get("attempt_count", 0),
                    })

    managed_past_due = []

    if ADMIN_FRAPPE_URL:
        async with httpx.AsyncClient() as client:
            dunning_resp = await client.get(
                f"{ADMIN_FRAPPE_URL}/api/resource/Dunning",
                params={
                    "filters": json.dumps([["status", "=", "Unresolved"]]),
                    "fields": json.dumps([
                        "name", "customer_name",
                        "sales_invoice", "dunning_type",
                    ]),
                    "limit_page_length": 1000,
                },
                headers=_admin_headers(),
                timeout=10,
            )
            if dunning_resp.status_code == 200:
                dunnings = dunning_resp.json().get("data", [])
                for d in dunnings:
                    si_name = d.get("sales_invoice")
                    outstanding = 0.0
                    due_date_str = None

                    if si_name:
                        si_resp = await client.get(
                            f"{ADMIN_FRAPPE_URL}/api/resource/Sales Invoice/{si_name}",
                            params={
                                "fields": json.dumps([
                                    "outstanding_amount", "due_date",
                                ]),
                            },
                            headers=_admin_headers(),
                            timeout=10,
                        )
                        if si_resp.status_code == 200:
                            si_data = si_resp.json().get("data", {})
                            outstanding = float(
                                si_data.get("outstanding_amount", 0)
                            )
                            due_date_str = si_data.get("due_date")

                    days_overdue = 0
                    if due_date_str:
                        from datetime import date
                        try:
                            due_dt = date.fromisoformat(due_date_str)
                            days_overdue = (date.today() - due_dt).days
                        except (ValueError, TypeError):
                            pass

                    customer_name = d.get("customer_name")
                    reg_resp = await client.get(
                        f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
                        params={
                            "filters": json.dumps(
                                [["erpnext_customer_name", "=", customer_name]]
                            ),
                            "fields": json.dumps(["name", "site_name"]),
                            "limit_page_length": 1,
                        },
                        headers=_admin_headers(),
                        timeout=10,
                    )
                    site_name = None
                    if reg_resp.status_code == 200:
                        regs = reg_resp.json().get("data", [])
                        if regs:
                            site_name = regs[0].get("site_name")

                    managed_past_due.append({
                        "motion": "managed_account",
                        "site_name": site_name,
                        "customer_name": customer_name,
                        "sales_invoice": si_name,
                        "dunning_name": d.get("name"),
                        "amount_due": outstanding,
                        "days_overdue": days_overdue,
                        "dunning_type": d.get("dunning_type"),
                    })

    dunning_queue = sorted(
        stripe_past_due + managed_past_due,
        key=lambda x: x["days_overdue"],
        reverse=True,
    )

    return {
        "dunning_queue": dunning_queue,
        "self_serve_count": len(stripe_past_due),
        "managed_account_count": len(managed_past_due),
        "total_count": len(stripe_past_due) + len(managed_past_due),
    }
