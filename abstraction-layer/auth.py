"""
Frappe session validation.

All requests include the Frappe session cookie (credentials: include).
This module validates the session with Frappe before routing.
"""

import os
import httpx
from fastapi import Request, HTTPException


FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")


async def validate_frappe_session(request: Request) -> dict:
    """
    Validate the Frappe session cookie by calling Frappe's auth endpoint.
    Returns the user email if valid, raises 401 if not.
    """
    cookies = request.cookies
    sid = cookies.get("sid")

    if not sid:
        raise HTTPException(status_code=401, detail="No session cookie")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{FRAPPE_URL}/api/method/frappe.auth.get_logged_user",
                cookies={"sid": sid},
                timeout=10,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")

            data = resp.json()
            return {"email": data.get("message")}
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Cannot reach Frappe backend")


async def get_current_user(request: Request) -> dict:
    """
    Dependency that validates the session and returns the current user.
    Returns a dict with at minimum: email, full_name, roles, tenant_id.
    """
    session = await validate_frappe_session(request)
    email = session["email"]

    # TODO: Fetch full user profile + roles + tenant from Frappe
    # For now, return minimal user info from session validation
    return {
        "email": email,
        "full_name": email,  # TODO: resolve from Frappe User doctype
        "roles": [],  # TODO: resolve from Frappe
        "tenant_id": "default",  # TODO: resolve from SM Tenant Config
    }
