"""
Session validation.

Checks the sm_session cookie (set by Google OAuth flow) first,
then falls back to Frappe session cookie, then dev mode fallback.
"""

import os
import json
import secrets
from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import Request, Header, HTTPException

from session_store import get_session

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
DEV_MODE = os.getenv("DEV_MODE", "true").lower() in ("true", "1", "yes")


DEV_USER = {
    "email": "dev@willow.com",
    "full_name": "Dev User",
    "roles": ["Front Desk", "System Manager"],
    "tenant_id": "willow",
    "initials": "JI",
}


async def validate_frappe_session(request: Request) -> dict:
    """
    Validate session. Checks sm_session cookie first (Google OAuth),
    then Frappe sid cookie, then dev mode fallback.
    """
    cookies = request.cookies

    # 1. Check abstraction-layer session (from Google OAuth)
    sm_token = cookies.get("sm_session")
    if sm_token:
        session = get_session(sm_token)
        if session:
            return {"email": session["email"], "full_name": session["full_name"]}

    # 2. Check Frappe session cookie
    sid = cookies.get("sid")
    if sid:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{FRAPPE_URL}/api/method/frappe.auth.get_logged_user",
                    cookies={"sid": sid},
                    timeout=10,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {"email": data.get("message")}
        except httpx.RequestError:
            pass

    # 3. Dev mode fallback
    if DEV_MODE:
        return DEV_USER

    raise HTTPException(status_code=401, detail="Not authenticated")


async def get_current_user(request: Request) -> dict:
    """
    Dependency that validates the session and returns the current user.
    Returns a dict with at minimum: email, full_name, roles, tenant_id.
    """
    session = await validate_frappe_session(request)

    # If we got the full dev user back, return it directly
    if session.get("tenant_id"):
        return session

    email = session["email"]
    full_name = session.get("full_name", email)

    # Fetch roles for authenticated user via token auth (works regardless of cookie type)
    roles = []
    try:
        api_key = os.getenv("FRAPPE_API_KEY", "")
        api_secret = os.getenv("FRAPPE_API_SECRET", "")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{FRAPPE_URL}/api/method/frappe.client.get_list",
                params={
                    "doctype": "Has Role",
                    "filters": json.dumps({"parent": email}),
                    "fields": json.dumps(["role"]),
                    "limit_page_length": 0,
                },
                headers={"Authorization": f"token {api_key}:{api_secret}"},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json().get("message", [])
                roles = [r["role"] for r in data if r.get("role")]
    except httpx.RequestError:
        pass

    return {
        "email": email,
        "full_name": full_name,
        "roles": roles,
        "tenant_id": "default",
    }


ADMIN_SERVICE_KEY = os.getenv("ADMIN_SERVICE_KEY", "")


async def verify_admin_key(x_admin_key: str = Header(None, alias="X-Admin-Key")) -> None:
    """
    Dependency for admin-only routes.
    Validates the X-Admin-Key header against ADMIN_SERVICE_KEY env var.
    Raises 500 if ADMIN_SERVICE_KEY is not configured (misconfigured server).
    Raises 403 if header is missing or does not match.
    """
    if not ADMIN_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="ADMIN_SERVICE_KEY not configured")
    if not x_admin_key or not secrets.compare_digest(x_admin_key, ADMIN_SERVICE_KEY):
        raise HTTPException(status_code=403, detail="Invalid or missing admin key")
