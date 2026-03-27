"""
Google OAuth2 flow for the POC app.

Handles the full OAuth dance on the abstraction layer domain
(api.poc.sparkmojo.com) so cookies are set on the right domain.
After authentication, validates/creates the user in Frappe and
sets a session cookie that the abstraction layer can verify.
"""

import os
import json
import secrets
import urllib.parse

import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://app.poc.sparkmojo.com")
FRAPPE_URL = os.getenv("FRAPPE_URL", "http://frontend:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# In-memory state store (fine for single-instance POC)
_pending_states: dict[str, bool] = {}


def _get_redirect_uri(request: Request) -> str:
    """Build callback URL from the current request's base."""
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.hostname)
    return f"{scheme}://{host}/auth/google/callback"


@router.get("/google")
async def google_login(request: Request):
    """Step 1: Redirect user to Google consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")

    state = secrets.token_urlsafe(32)
    _pending_states[state] = True

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": _get_redirect_uri(request),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """Step 2: Google redirects back here with an auth code."""
    if error:
        return RedirectResponse(f"{FRONTEND_URL}?auth_error={error}")

    if not state or state not in _pending_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    del _pending_states[state]

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _get_redirect_uri(request),
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Token exchange failed: {token_resp.text}")

        tokens = token_resp.json()
        access_token = tokens.get("access_token")

        # Get user info from Google
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to get user info from Google")

        userinfo = userinfo_resp.json()

    email = userinfo.get("email", "")
    full_name = userinfo.get("name", email)

    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    # Verify user exists in Frappe (don't auto-create for POC security)
    async with httpx.AsyncClient() as client:
        frappe_headers = {"Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}"}
        user_resp = await client.get(
            f"{FRAPPE_URL}/api/resource/User/{urllib.parse.quote(email)}",
            headers=frappe_headers,
        )

        if user_resp.status_code == 404:
            # User doesn't exist in Frappe — redirect with error
            return RedirectResponse(
                f"{FRONTEND_URL}?auth_error=no_account&email={urllib.parse.quote(email)}"
            )

        if user_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to verify user in Frappe")

        # Log the user into Frappe and get a session cookie
        login_resp = await client.post(
            f"{FRAPPE_URL}/api/method/frappe.auth.get_logged_user",
            headers=frappe_headers,
        )

    # Generate a simple session token for the abstraction layer
    # Store it so validate_frappe_session can check it
    from session_store import create_session
    session_token = create_session(email, full_name)

    response = RedirectResponse(FRONTEND_URL, status_code=302)
    # domain must cover all subdomains (app.poc, api.poc, poc) so the
    # browser sends the cookie on cross-subdomain API requests.
    cookie_domain = os.getenv("COOKIE_DOMAIN", ".poc.sparkmojo.com")
    response.set_cookie(
        key="sm_session",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=86400,  # 24 hours
        path="/",
        domain=cookie_domain,
    )
    return response


@router.get("/me")
async def auth_me(request: Request):
    """Return current user from session."""
    from session_store import get_session
    token = request.cookies.get("sm_session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    return {"email": session["email"], "full_name": session["full_name"]}


@router.post("/logout")
async def auth_logout(request: Request):
    """Clear session."""
    from session_store import delete_session
    token = request.cookies.get("sm_session")
    if token:
        delete_session(token)
    response = RedirectResponse(FRONTEND_URL, status_code=302)
    cookie_domain = os.getenv("COOKIE_DOMAIN", ".poc.sparkmojo.com")
    response.delete_cookie("sm_session", domain=cookie_domain, path="/")
    return response
