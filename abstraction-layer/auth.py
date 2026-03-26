"""
Session validation.

Checks the sm_session cookie (set by Google OAuth flow) first,
then falls back to Frappe session cookie, then dev mode fallback.
"""

import os
import json
from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import Request, HTTPException

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

    # Fetch roles for authenticated session user
    roles = []
    sid = request.cookies.get("sid")
    if sid:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{FRAPPE_URL}/api/method/frappe.client.get_list",
                    params={
                        "doctype": "Has Role",
                        "filters": json.dumps({"parent": email}),
                        "fields": json.dumps(["role"]),
                        "limit_page_length": 0,
                    },
                    cookies={"sid": sid},
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
