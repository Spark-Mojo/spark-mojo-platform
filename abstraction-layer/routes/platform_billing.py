import json
import logging
import os
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
