"""
Frappe session validation.

All requests include the Frappe session cookie (credentials: include).
This module validates the session with Frappe before routing.
For POC dev mode, falls back to a mock user when Frappe is unreachable.
"""

import os
from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import Request, HTTPException


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
    Validate the Frappe session cookie by calling Frappe's auth endpoint.
    Returns the user email if valid. In dev mode, falls back to mock user.
    """
    cookies = request.cookies
    sid = cookies.get("sid")

    if not sid:
        if DEV_MODE:
            return DEV_USER
        raise HTTPException(status_code=401, detail="No session cookie")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{FRAPPE_URL}/api/method/frappe.auth.get_logged_user",
                cookies={"sid": sid},
                timeout=10,
            )
            if resp.status_code != 200:
                if DEV_MODE:
                    return DEV_USER
                raise HTTPException(status_code=401, detail="Invalid session")

            data = resp.json()
            return {"email": data.get("message")}
    except httpx.RequestError:
        if DEV_MODE:
            return DEV_USER
        raise HTTPException(status_code=502, detail="Cannot reach Frappe backend")


async def get_current_user(request: Request) -> dict:
    """
    Dependency that validates the session and returns the current user.
    Returns a dict with at minimum: email, full_name, roles, tenant_id.
    """
    session = await validate_frappe_session(request)

    # If we got the full dev user back, return it directly
    if session.get("full_name"):
        return session

    email = session["email"]
    return {
        "email": email,
        "full_name": email,
        "roles": [],
        "tenant_id": "default",
    }
