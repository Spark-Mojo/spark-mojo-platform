"""
Mojo Abstraction Layer — FastAPI application.

Routes all frontend requests to the correct backend connector based on
SM Connector Config for the authenticated tenant. The React frontend
NEVER calls Frappe directly — it always calls this layer (DECISION-003).
"""

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from auth import validate_frappe_session, get_current_user, verify_admin_key
from registry import ConnectorRegistry, SiteRegistry
from connectors import frappe_native, simplepractice, valant, plane
from routes.onboarding import router as onboarding_router
from routes.provisioning import router as provisioning_router
from routes.billing import router as billing_router, webhook_router as billing_webhook_router
from routes.clinical import router as clinical_router
from google_auth import router as google_auth_router
from modules.tasks.routes import router as tasks_router


import logging

logger = logging.getLogger("abstraction-layer")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    app.state.registry = ConnectorRegistry()

    # Initialize SiteRegistry (DocType-backed, env var fallback)
    site_registry = SiteRegistry()
    try:
        await site_registry.load()
    except RuntimeError:
        logger.warning("SiteRegistry: no sites available at startup, continuing anyway")
    app.state.site_registry = site_registry

    yield


app = FastAPI(
    title="Mojo Abstraction Layer",
    description="Routes frontend requests to backend connectors per tenant config.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global handler for unhandled httpx errors — converts them to proper
# HTTPExceptions so CORS middleware adds headers and the browser can read the body.
import httpx as _httpx

@app.exception_handler(_httpx.HTTPStatusError)
async def httpx_error_handler(request: Request, exc: _httpx.HTTPStatusError):
    try:
        detail = exc.response.json()
    except Exception:
        detail = {"error": exc.response.text or str(exc)}
    raise HTTPException(status_code=exc.response.status_code or 502, detail=detail)


# Dedicated capability routers (registered before generic catch-all)
app.include_router(onboarding_router)
app.include_router(
    provisioning_router,
    prefix="/api/admin",
    dependencies=[Depends(verify_admin_key)],
)
app.include_router(billing_router, prefix="/api/modules/billing")
app.include_router(billing_webhook_router, prefix="/api/webhooks/stedi")
app.include_router(clinical_router, prefix="/api/modules/clinical")
app.include_router(google_auth_router)
app.include_router(tasks_router)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Health check. Returns Frappe connectivity status."""
    frappe_url = os.getenv("FRAPPE_URL", "")
    frappe_connected = False
    if frappe_url:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{frappe_url}/api/method/frappe.auth.get_logged_user", timeout=5)
                # Even a 403 means Frappe is reachable
                frappe_connected = resp.status_code in (200, 401, 403)
        except Exception:
            frappe_connected = False
    return {"status": "ok", "frappe_connected": frappe_connected}


@app.post("/admin/registry/refresh")
async def registry_refresh(request: Request, _: None = Depends(verify_admin_key)):
    """Force refresh the SiteRegistry cache from SM Site Registry DocType."""
    site_registry: SiteRegistry = request.app.state.site_registry
    await site_registry.refresh()
    return {"status": "refreshed", "sites": site_registry.site_count}


def extract_subdomain(host: str) -> str | None:
    """
    Extract subdomain from Host header.
    New pattern: 'willow.app.sparkmojo.com' → 'willow'
    Legacy pattern: 'app.poc.sparkmojo.com' → 'poc'
    Admin/bare: 'poc.sparkmojo.com' → 'poc'
    Local: 'localhost:5173' → None
    """
    # Strip port
    host = host.split(":")[0]
    parts = host.split(".")
    # Need at least 3 parts: subdomain.domain.tld
    if len(parts) >= 3 and parts[-2] == "sparkmojo" and parts[-1] == "com":
        # Legacy pattern: app.{subdomain}.sparkmojo.com → subdomain is parts[1]
        if len(parts) == 4 and parts[0] == "app":
            return parts[1]
        return parts[0]
    return None


# ---------------------------------------------------------------------------
# Unauthenticated endpoints
# ---------------------------------------------------------------------------

@app.get("/api/modules/tenant/public-config")
async def tenant_public_config(request: Request):
    """
    Returns tenant branding and login-screen config.
    Unauthenticated — used by the login screen to show tenant logo/colors.
    Reads from SM Tenant Config based on subdomain or VITE_TENANT_SUBDOMAIN.
    """
    # POC: Hardcoded Willow Center config
    return {
        "data": {
            "tenant_name": "Willow Center",
            "primary_color": "#006666",
            "accent_color": "#FF6F61",
            "background_type": "color",
            "background_color": "#1e293b",
            "logo_url": None,
            "powered_by_visible": True,
        }
    }


# ---------------------------------------------------------------------------
# Authenticated endpoints — Desktop & User
# ---------------------------------------------------------------------------

@app.get("/api/modules/desktop/mojos")
async def desktop_mojos(user: dict = Depends(get_current_user)):
    """
    Returns the Mojo registry for the current user.
    For POC: hardcoded Onboarding Mojo definition.
    """
    return {"data": [
        {
            "id": "onboarding",
            "title": "Onboarding",
            "icon": "UserCheck",
            "color": "from-teal-500/20 to-teal-600/20",
            "component": "OnboardingMojo",
            "defaultWidth": 900,
            "defaultHeight": 600,
        }
    ]}


@app.get("/api/modules/desktop/me")
async def desktop_me(user: dict = Depends(get_current_user)):
    """
    Returns the current user's profile through the abstraction layer.
    Frontend calls this instead of /api/resource/User directly.
    """
    # TODO: Query Frappe for user details and return normalized profile
    return {"data": user}


# ---------------------------------------------------------------------------
# Automations
# ---------------------------------------------------------------------------

@app.get("/api/modules/automations/contextual")
async def automations_contextual(
    mojo: str = "",
    record_id: str = "",
    user: dict = Depends(get_current_user),
):
    """
    Returns contextual automations for a specific Mojo.
    Queries SM Automation Template where visibility includes 'contextual'
    and context_workspace matches the requested mojo.
    """
    # TODO: Query SM Automation Template with context_workspace filter
    return {"data": []}


@app.post("/api/modules/automations/run")
async def automations_run(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """
    Execute an automation. Calls the configured n8n webhook or
    Frappe Server Script for the given automation template.
    """
    body = await request.json()
    automation_id = body.get("automation_id")
    context = body.get("context", {})
    if not automation_id:
        raise HTTPException(status_code=400, detail="automation_id is required")
    # TODO: Look up SM Automation Template, call n8n webhook or Frappe endpoint
    return {"data": {"status": "queued", "automation_id": automation_id}}


# ---------------------------------------------------------------------------
# Generic capability routing — the core of the abstraction layer
# ---------------------------------------------------------------------------

@app.api_route(
    "/api/modules/{capability}/{action}",
    methods=["GET", "POST", "PUT", "DELETE"],
)
async def route_capability(
    capability: str,
    action: str,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """
    Generic capability router. Reads SM Connector Config to determine which
    backend connector handles this capability for the authenticated tenant.
    Default: frappe_native for all capabilities.
    """
    registry: ConnectorRegistry = request.app.state.registry
    tenant_id = user.get("tenant_id", "default")

    connector = registry.get_connector(tenant_id, capability)

    body = None
    if request.method in ("POST", "PUT"):
        body = await request.json()

    params = dict(request.query_params)

    result = await connector.handle(
        capability=capability,
        action=action,
        method=request.method,
        body=body,
        params=params,
        user=user,
    )

    return {"data": result}
