"""
Provisioning API routes.

Implements PROV-001: POST /api/admin/sites/create and supporting endpoints.
Turns the PROVISIONING_RUNBOOK into a programmatic API (DECISION-026).
All secrets read from env vars — no hardcoded credentials.
"""

import json
import logging
import os
import re
import secrets
import subprocess
import time
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx
import yaml
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from connectors.medplum_connector import MedplumClient
from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.provisioning")

router = APIRouter(tags=["provisioning"])

medplum_client = MedplumClient()


def _read_secret_or_empty(name: str) -> str:
    try:
        return read_secret(name)
    except SecretNotFoundError:
        return ""


# Environment configuration — no hardcoded secrets
FRAPPE_CONTAINER = os.getenv("FRAPPE_CONTAINER_NAME", "frappe-poc-backend-1")
MARIADB_ROOT_PASSWORD = _read_secret_or_empty("mariadb_root_password")
MEDPLUM_BASE_URL = os.getenv("MEDPLUM_BASE_URL", "")
N8N_BASE_URL = os.getenv("N8N_BASE_URL", "")
FRAPPE_HOST = os.getenv("FRAPPE_HOST", "localhost")
ADMIN_FRAPPE_URL = os.getenv("ADMIN_FRAPPE_URL", "")
ADMIN_API_KEY = _read_secret_or_empty("admin_api_key")
ADMIN_API_SECRET = _read_secret_or_empty("admin_api_secret")

# Template directory — templates live in sparkmojo-internal governance repo
# but are copied to this path at deploy time. Fallback to local path for dev.
TEMPLATE_DIR = os.getenv(
    "PROVISIONING_TEMPLATE_DIR",
    os.path.join(os.path.dirname(__file__), "..", "provisioning", "templates"),
)

VALID_SITE_TYPES = {"behavioral_health", "general_smb"}
VALID_SERVER_TIERS = {"hipaa", "standard"}
SUBDOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SiteCreateRequest(BaseModel):
    site_subdomain: str
    site_type: str
    server_tier: str
    admin_password: str
    display_name: str
    timezone: str
    apps_override: list[str] = []

    @field_validator("site_subdomain")
    @classmethod
    def validate_subdomain(cls, v):
        v = v.lower().strip()
        if not SUBDOMAIN_RE.match(v):
            raise ValueError(
                "site_subdomain must be alphanumeric + hyphens, 1-32 chars, "
                "cannot start or end with hyphen"
            )
        return v

    @field_validator("site_type")
    @classmethod
    def validate_site_type(cls, v):
        if v not in VALID_SITE_TYPES:
            raise ValueError(f"site_type must be one of: {', '.join(VALID_SITE_TYPES)}")
        return v

    @field_validator("server_tier")
    @classmethod
    def validate_server_tier(cls, v):
        if v not in VALID_SERVER_TIERS:
            raise ValueError(f"server_tier must be one of: {', '.join(VALID_SERVER_TIERS)}")
        return v


class SiteCreateResponse(BaseModel):
    success: bool
    site_name: str
    site_url: str
    medplum_project_id: str
    bench_name: str
    steps_completed: list[str]
    steps_failed: list[str]
    warnings: list[str]
    duration_seconds: float


# ---------------------------------------------------------------------------
# Helper: run docker exec command
# ---------------------------------------------------------------------------

def _docker_exec(cmd: str, timeout: int = 120) -> subprocess.CompletedProcess:
    """Run a command inside the Frappe container via docker exec."""
    full_cmd = f"docker exec {FRAPPE_CONTAINER} {cmd}"
    logger.info("Executing: %s", full_cmd)
    result = subprocess.run(
        full_cmd,
        shell=True,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        logger.error("Command failed (exit %d): %s\nstderr: %s", result.returncode, full_cmd, result.stderr)
    return result


def _admin_headers() -> dict:
    """Headers for Frappe admin API calls."""
    headers = {"Content-Type": "application/json"}
    if ADMIN_API_KEY and ADMIN_API_SECRET:
        headers["Authorization"] = f"token {ADMIN_API_KEY}:{ADMIN_API_SECRET}"
    return headers


# ---------------------------------------------------------------------------
# Provisioning steps (each is a separate function per story spec)
# ---------------------------------------------------------------------------

async def step_01_preflight(req: SiteCreateRequest) -> dict:
    """Pre-flight validation. HARD STOP on failure."""
    site_name = f"{req.site_subdomain}.sparkmojo.com"
    site_url = f"https://{req.site_subdomain}.app.sparkmojo.com"

    # Check for existing site in SM Site Registry
    if ADMIN_FRAPPE_URL:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry/{req.site_subdomain}",
                headers=_admin_headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                raise HTTPException(
                    status_code=409,
                    detail=f"Site with subdomain '{req.site_subdomain}' already exists",
                )

    return {"site_name": site_name, "site_url": site_url}


def step_02_load_template(req: SiteCreateRequest) -> dict:
    """Load vertical template YAML. HARD STOP on failure."""
    template_path = os.path.join(TEMPLATE_DIR, f"{req.site_type}.yaml")
    if not os.path.exists(template_path):
        raise HTTPException(
            status_code=400,
            detail=f"No vertical template found for site_type '{req.site_type}'",
        )

    with open(template_path) as f:
        template = yaml.safe_load(f)

    # Resolve app list
    core_apps = template.get("apps", {}).get("core", [])
    default_on = template.get("apps", {}).get("default_on", [])
    optional_apps = template.get("apps", {}).get("optional", [])

    # Start with core + default_on
    final_apps = list(core_apps) + list(default_on)

    # Apply overrides: add optional apps that are in apps_override
    for app in req.apps_override:
        if app in optional_apps and app not in final_apps:
            final_apps.append(app)

    bench_tier = template.get("bench_tier", "standard-smb")

    return {
        "template": template,
        "final_apps": final_apps,
        "core_apps": core_apps,
        "bench_tier": bench_tier,
    }


async def step_02_select_bench(bench_tier: str, warnings: list[str]) -> dict:
    """Select a bench from SM Bench Registry. HARD STOP if no bench found."""
    if not ADMIN_FRAPPE_URL:
        # Dev fallback: use defaults
        return {
            "bench_name": f"{bench_tier}-01",
            "bench_host": FRAPPE_HOST,
        }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Bench Registry",
            params={
                "filters": json.dumps([
                    ["bench_tier", "=", bench_tier],
                    ["is_active", "=", 1],
                ]),
                "fields": json.dumps([
                    "bench_name", "bench_host", "active_site_count",
                    "capacity_threshold",
                ]),
                "order_by": "active_site_count asc",
                "limit_page_length": 1,
            },
            headers=_admin_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        benches = resp.json().get("data", [])

    if not benches:
        raise HTTPException(
            status_code=503,
            detail=f"BENCH_NOT_FOUND: No active bench found for tier '{bench_tier}'",
        )

    bench = benches[0]
    if bench.get("capacity_threshold") and bench.get("active_site_count", 0) >= bench["capacity_threshold"] * 0.8:
        warnings.append(
            f"BENCH_CAPACITY_WARNING: Bench {bench['bench_name']} is at "
            f"{bench['active_site_count']}/{bench['capacity_threshold']} sites "
            f"({round(bench['active_site_count'] / bench['capacity_threshold'] * 100)}% utilization)"
        )

    return {
        "bench_name": bench["bench_name"],
        "bench_host": bench["bench_host"],
    }


def step_03_create_frappe_site(site_name: str, admin_password: str) -> None:
    """Create Frappe site via bench new-site. HARD STOP on failure."""
    result = _docker_exec(
        f"bench new-site {site_name} "
        f"--mariadb-root-password '{MARIADB_ROOT_PASSWORD}' "
        f"--admin-password '{admin_password}' "
        f"--no-mariadb-socket",
        timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(f"bench new-site failed: {result.stderr}")


def step_04_install_erpnext(site_name: str) -> None:
    """Install ERPNext on the new site."""
    result = _docker_exec(
        f"bench --site {site_name} install-app erpnext",
        timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(f"install erpnext failed: {result.stderr}")


def step_05_install_sm_apps(site_name: str) -> None:
    """Register SM custom apps for this site."""
    result = _docker_exec(
        f"python3 /home/frappe/frappe-bench/apps/sm_provisioning/scripts/register_sm_apps.py "
        f"--site {site_name}",
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"register SM apps failed: {result.stderr}")


def step_06_install_vertical_apps(site_name: str, final_apps: list[str], core_apps: list[str]) -> None:
    """Install vertical-specific apps (non-core, non-erpnext)."""
    skip = set(core_apps) | {"erpnext", "sm_widgets", "sm_connectors", "sm_provisioning"}
    for app in final_apps:
        if app in skip:
            continue
        result = _docker_exec(
            f"bench --site {site_name} install-app {app}",
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f"install {app} failed: {result.stderr}")


def step_07_configure_site(
    site_name: str,
    site_subdomain: str,
    site_type: str,
    server_tier: str,
) -> None:
    """Configure site settings (encryption, hostname, dev mode, setup wizard)."""
    # HIPAA: generate and set encryption key
    if server_tier == "hipaa":
        encryption_key = secrets.token_hex(32)
        result = _docker_exec(
            f"bench --site {site_name} set-config encryption_key '{encryption_key}'"
        )
        if result.returncode != 0:
            raise RuntimeError(f"set encryption_key failed: {result.stderr}")

    # Developer mode
    dev_mode = "1" if site_type == "dev" else "0"
    _docker_exec(f"bench --site {site_name} set-config developer_mode {dev_mode}")

    # Host name
    _docker_exec(
        f"bench --site {site_name} set-config host_name "
        f"'https://{site_subdomain}.app.sparkmojo.com'"
    )

    # Suppress setup wizard (Phase 5d — required)
    result = _docker_exec(
        f'bench --site {site_name} execute '
        f'"frappe.db.set_single_value(\'System Settings\', \'setup_complete\', 1); '
        f'frappe.db.commit(); '
        f'print(\'Setup wizard suppressed\')"'
    )
    if result.returncode != 0:
        raise RuntimeError(f"suppress setup wizard failed: {result.stderr}")


async def step_08_create_medplum_project(
    site_subdomain: str,
    warnings: list[str],
    steps_completed: list[str],
    steps_failed: list[str],
) -> str:
    """Create Medplum project via MedplumClient or return stub (DECISION-028)."""
    if medplum_client.is_configured:
        try:
            project = await medplum_client.create_project(site_subdomain)
            medplum_project_id = project["id"]
            steps_completed.append("create_medplum_project")
            return medplum_project_id
        except Exception as e:
            medplum_project_id = f"stub-{uuid4().hex[:8]}"
            steps_failed.append(f"create_medplum_project: {str(e)}")
            warnings.append(f"medplum_project_creation_failed: {str(e)}. Using stub ID.")
            return medplum_project_id
    else:
        medplum_project_id = f"stub-{uuid4().hex[:8]}"
        warnings.append("medplum_project_stub")
        return medplum_project_id


async def step_08b_create_client_application(
    medplum_project_id: str,
    site_subdomain: str,
    warnings: list[str],
    steps_completed: list[str],
    steps_failed: list[str],
) -> Optional[str]:
    """Create a Medplum ClientApplication for tenant-scoped FHIR access.

    Returns the client_id (safe to store) or None on failure.
    The client_secret is logged to stdout and then discarded (HIPAA).
    """
    if medplum_project_id.startswith("stub-"):
        warnings.append("medplum_client_app_skipped: no real project")
        return None

    if not medplum_client.is_configured:
        return None

    try:
        result = await medplum_client.create_client_application(
            medplum_project_id, f"{site_subdomain}-abstraction-layer"
        )
        client_id = result.get("id") or result.get("clientId")
        client_secret = result.get("secret")
        logger.warning(
            "WARNING MEDPLUM_CLIENT_SECRET for %s: %s — COPY THIS NOW, it will not be stored",
            site_subdomain, client_secret,
        )
        steps_completed.append("create_client_application")
        return client_id
    except Exception as e:
        steps_failed.append(f"create_client_application: {str(e)}")
        warnings.append(f"medplum_client_app_failed: {str(e)}. Tenant-scoped FHIR access unavailable.")
        return None


async def step_09_seed_n8n(site_subdomain: str, site_type: str, warnings: list[str]) -> Optional[str]:
    """Seed n8n workspace. Stub — template seeding is PROV-007."""
    if not N8N_BASE_URL:
        warnings.append("n8n_not_configured: N8N_BASE_URL not set. n8n workspace not created.")
        return None

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{N8N_BASE_URL}/api/v1/workflows",
                json={"name": f"{site_subdomain}-workspace"},
                timeout=15,
            )
            resp.raise_for_status()
            ref = resp.json().get("id", resp.json().get("name", site_subdomain))
            logger.info(
                "n8n workspace created. Workflow template seeding: no templates "
                "defined for vertical %s — seeding skipped. Add templates in PROV-007.",
                site_type,
            )
            return str(ref)
    except Exception as exc:
        warnings.append(f"n8n_workspace_failed: {exc}")
        return None


async def step_10_register_site(
    req: SiteCreateRequest,
    site_name: str,
    site_url: str,
    bench_name: str,
    bench_host: str,
    medplum_project_id: str,
    n8n_workspace_ref: Optional[str],
    installed_apps: list[str],
    steps_failed: list[str],
    medplum_client_id: Optional[str] = None,
) -> None:
    """Register site in SM Site Registry on admin.sparkmojo.com. HARD STOP on failure."""
    provisioning_status = "complete" if not steps_failed else "partial"

    registry_data = {
        "doctype": "SM Site Registry",
        "site_subdomain": req.site_subdomain,
        "frappe_site": site_name,
        "frappe_url": "http://frappe:8080",
        "server_tier": req.server_tier,
        "site_type": req.site_type,
        "display_name": req.display_name,
        "timezone": req.timezone,
        "is_active": 1,
        "bench_name": bench_name,
        "bench_host": bench_host,
        "medplum_project_id": medplum_project_id,
        "medplum_client_id": medplum_client_id or "",
        "n8n_workspace_ref": n8n_workspace_ref,
        "installed_apps": json.dumps(installed_apps),
        "connectors_json": "{}",
        "capability_routing_json": "{}",
        "feature_flags_json": "{}",
        "provisioning_timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "provisioning_status": provisioning_status,
    }

    if not ADMIN_FRAPPE_URL:
        logger.warning("ADMIN_FRAPPE_URL not set — skipping SM Site Registry creation")
        return

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            json=registry_data,
            headers=_admin_headers(),
            timeout=15,
        )
        if resp.status_code == 409:
            raise HTTPException(
                status_code=409,
                detail=f"Site '{req.site_subdomain}' already exists in registry",
            )
        resp.raise_for_status()

    # Increment active_site_count on SM Bench Registry
    try:
        async with httpx.AsyncClient() as client:
            # Get current count
            bench_resp = await client.get(
                f"{ADMIN_FRAPPE_URL}/api/resource/SM Bench Registry/{bench_name}",
                headers=_admin_headers(),
                timeout=10,
            )
            if bench_resp.status_code == 200:
                bench_data = bench_resp.json().get("data", {})
                new_count = (bench_data.get("active_site_count") or 0) + 1
                await client.put(
                    f"{ADMIN_FRAPPE_URL}/api/resource/SM Bench Registry/{bench_name}",
                    json={"active_site_count": new_count},
                    headers=_admin_headers(),
                    timeout=10,
                )
    except Exception as exc:
        logger.warning("Failed to update bench site count: %s", exc)

    # Trigger registry refresh
    try:
        admin_key = _read_secret_or_empty("admin_service_key")
        headers = {"X-Admin-Key": admin_key} if admin_key else {}
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{ADMIN_FRAPPE_URL.replace('/api', '')}/admin/registry/refresh",
                headers=headers,
                timeout=5,
            )
    except Exception:
        pass


def step_11_log_traefik(site_subdomain: str, warnings: list[str]) -> None:
    """Log Traefik routing requirement. Manual step — PROV-008 automates this."""
    msg = (
        f"TRAEFIK: Add explicit Host() rule for {site_subdomain}.app.sparkmojo.com "
        f"to docker-compose.poc.yml and redeploy. ACME cert will not issue until "
        f"this is done. See PROVISIONING_RUNBOOK.md Phase 7."
    )
    logger.warning(msg)
    warnings.append(msg)
    warnings.append("traefik_manual_step_required")


def step_12_bench_migrate(site_name: str) -> None:
    """Run bench migrate on the new site."""
    result = _docker_exec(
        f"bench --site {site_name} migrate",
        timeout=300,
    )
    if result.returncode != 0:
        raise RuntimeError(f"bench migrate failed: {result.stderr}")


def step_13_hipaa_verification(
    site_name: str,
    site_subdomain: str,
    server_tier: str,
    steps_failed: list[str],
    warnings: list[str],
) -> bool:
    """HIPAA controls verification (hipaa tier only)."""
    if server_tier != "hipaa":
        return True

    passed = True

    # Check 1: Encryption key exists
    result = _docker_exec(f"bench --site {site_name} show-config")
    if "encryption_key" not in result.stdout:
        steps_failed.append("hipaa_check_encryption_key: encryption key not found in site config")
        passed = False

    # Checks 2-3: TLS and redirect — these require external HTTP access
    # which may not be available during provisioning (Traefik rule not yet added)
    # Log as informational warnings
    warnings.append(
        "hipaa_tls_check: TLS and HTTP redirect checks require Traefik routing to be configured. "
        "Verify manually after adding Host() rule."
    )

    # Checks 4-8: Manual confirmation required
    warnings.append(
        "hipaa_manual_checks: Audit log flags, backup cron, port isolation, "
        "and BAA require manual confirmation. See PROVISIONING_RUNBOOK Phase 9."
    )

    return passed


def step_14_smoke_test(
    site_name: str,
    site_subdomain: str,
) -> tuple[bool, list[str]]:
    """Run 5 smoke test checks from PROVISIONING_RUNBOOK Phase 10."""
    failures = []

    # Test 1: Frappe site exists (bench list-sites)
    result = _docker_exec("bench list-sites")
    if site_name not in result.stdout:
        failures.append(f"smoke_test_1: {site_name} not found in bench list-sites")

    # Test 2: Site apps are listed
    result = _docker_exec(f"bench --site {site_name} list-apps")
    if result.returncode != 0:
        failures.append(f"smoke_test_2: bench list-apps failed: {result.stderr}")
    elif "erpnext" not in result.stdout:
        failures.append("smoke_test_2: erpnext not found in installed apps")

    # Test 3: SM Task DocType accessible
    result = _docker_exec(
        f'bench --site {site_name} execute '
        f'"frappe.db.get_list(\'SM Task\', limit=1)"'
    )
    if result.returncode != 0 and "DoesNotExistError" in result.stderr:
        failures.append("smoke_test_3: SM Task DocType not accessible")

    # Test 4: setup_complete is set
    result = _docker_exec(
        f'bench --site {site_name} execute '
        f'"print(frappe.db.get_single_value(\'System Settings\', \'setup_complete\'))"'
    )
    if "1" not in result.stdout:
        failures.append("smoke_test_4: setup_complete not set to 1")

    # Test 5: Site config has host_name
    result = _docker_exec(f"bench --site {site_name} show-config")
    expected_host = f"https://{site_subdomain}.app.sparkmojo.com"
    if expected_host not in result.stdout:
        failures.append(f"smoke_test_5: host_name not set to {expected_host}")

    return (len(failures) == 0, failures)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/sites/create", response_model=SiteCreateResponse)
async def create_site(req: SiteCreateRequest):
    """
    Provision a new Frappe site with full multi-service setup.
    Implements PROVISIONING_RUNBOOK Phases 0-10 as a single API call.
    """
    start_time = time.time()
    steps_completed: list[str] = []
    steps_failed: list[str] = []
    warnings: list[str] = []
    medplum_project_id = ""
    bench_name = ""
    bench_host = ""
    site_name = ""
    site_url = ""
    installed_apps: list[str] = []

    # Step 1 — Pre-flight validation (HARD STOP)
    try:
        result = await step_01_preflight(req)
        site_name = result["site_name"]
        site_url = result["site_url"]
        steps_completed.append("preflight_validation")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Pre-flight validation failed: {exc}")

    # Step 2 — Load vertical template (HARD STOP)
    try:
        tmpl = step_02_load_template(req)
        final_apps = tmpl["final_apps"]
        core_apps = tmpl["core_apps"]
        bench_tier = tmpl["bench_tier"]

        bench_info = await step_02_select_bench(bench_tier, warnings)
        bench_name = bench_info["bench_name"]
        bench_host = bench_info["bench_host"]
        steps_completed.append("load_template")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Template loading failed: {exc}")

    # Step 3 — Create Frappe site (HARD STOP)
    try:
        step_03_create_frappe_site(site_name, req.admin_password)
        steps_completed.append("create_frappe_site")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Create Frappe site failed: {exc}")

    # Step 4 — Install ERPNext
    try:
        step_04_install_erpnext(site_name)
        steps_completed.append("install_erpnext")
        installed_apps.append("erpnext")
    except Exception as exc:
        steps_failed.append(f"install_erpnext: {exc}")

    # Step 5 — Install SM custom apps
    try:
        step_05_install_sm_apps(site_name)
        steps_completed.append("install_sm_apps")
        installed_apps.extend(["sm_widgets", "sm_connectors", "sm_provisioning"])
    except Exception as exc:
        steps_failed.append(f"install_sm_apps: {exc}")

    # Step 6 — Install vertical-specific apps
    try:
        step_06_install_vertical_apps(site_name, final_apps, core_apps)
        steps_completed.append("install_vertical_apps")
        # Add non-core, non-SM apps to installed list
        skip = set(core_apps) | {"erpnext", "sm_widgets", "sm_connectors", "sm_provisioning"}
        for app in final_apps:
            if app not in skip and app not in installed_apps:
                installed_apps.append(app)
    except Exception as exc:
        steps_failed.append(f"install_vertical_apps: {exc}")

    # Always include frappe in installed_apps
    installed_apps = ["frappe"] + installed_apps

    # Step 7 — Configure site
    try:
        step_07_configure_site(site_name, req.site_subdomain, req.site_type, req.server_tier)
        steps_completed.append("configure_site")
    except Exception as exc:
        steps_failed.append(f"configure_site: {exc}")

    # Step 8 — Create Medplum project
    medplum_project_id = await step_08_create_medplum_project(
        req.site_subdomain, warnings, steps_completed, steps_failed
    )
    if not medplum_project_id:
        medplum_project_id = f"stub-{uuid4().hex[:8]}"

    # Step 8b — Create Medplum ClientApplication (STORY-017)
    medplum_client_id = await step_08b_create_client_application(
        medplum_project_id, req.site_subdomain, warnings, steps_completed, steps_failed
    )

    # Step 9 — Seed n8n workspace (STUB)
    n8n_workspace_ref = None
    try:
        n8n_workspace_ref = await step_09_seed_n8n(req.site_subdomain, req.site_type, warnings)
        if n8n_workspace_ref:
            steps_completed.append("n8n_workspace_created")
    except Exception as exc:
        steps_failed.append(f"seed_n8n: {exc}")

    # Step 10 — Register in SM Site Registry (HARD STOP)
    try:
        await step_10_register_site(
            req, site_name, site_url, bench_name, bench_host,
            medplum_project_id, n8n_workspace_ref, installed_apps,
            steps_failed, medplum_client_id=medplum_client_id,
        )
        steps_completed.append("register_in_site_registry")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Site registry registration failed: {exc}",
        )

    # Step 11 — Log Traefik routing requirement
    step_11_log_traefik(req.site_subdomain, warnings)
    steps_completed.append("log_traefik_requirement")

    # Step 12 — Run bench migrate
    try:
        step_12_bench_migrate(site_name)
        steps_completed.append("bench_migrate")
    except Exception as exc:
        steps_failed.append(f"bench_migrate: {exc}")

    # Step 13 — HIPAA controls verification
    try:
        step_13_hipaa_verification(
            site_name, req.site_subdomain, req.server_tier,
            steps_failed, warnings,
        )
        steps_completed.append("hipaa_verification")
    except Exception as exc:
        steps_failed.append(f"hipaa_verification: {exc}")

    # Step 14 — Smoke test
    try:
        passed, failures = step_14_smoke_test(site_name, req.site_subdomain)
        if passed:
            steps_completed.append("smoke_test")
        else:
            steps_failed.append(f"smoke_test: {'; '.join(failures)}")
    except Exception as exc:
        steps_failed.append(f"smoke_test: {exc}")

    duration = round(time.time() - start_time, 2)

    return SiteCreateResponse(
        success=len(steps_failed) == 0,
        site_name=site_name,
        site_url=site_url,
        medplum_project_id=medplum_project_id,
        bench_name=bench_name,
        steps_completed=steps_completed,
        steps_failed=steps_failed,
        warnings=warnings,
        duration_seconds=duration,
    )


@router.get("/sites")
async def list_sites():
    """List all SM Site Registry entries."""
    if not ADMIN_FRAPPE_URL:
        return {"data": []}

    fields = [
        "site_subdomain", "frappe_site", "server_tier", "site_type",
        "display_name", "bench_name", "is_active", "installed_apps",
        "provisioning_timestamp",
    ]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry",
            params={
                "fields": json.dumps(fields),
                "limit_page_length": 0,
                "order_by": "creation desc",
            },
            headers=_admin_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        sites = resp.json().get("data", [])

    # Derive site_name and site_url for each
    for site in sites:
        site["site_name"] = f"{site['site_subdomain']}.sparkmojo.com"
        site["site_url"] = f"https://{site['site_subdomain']}.app.sparkmojo.com"

    return {"data": sites}


@router.get("/sites/{site_subdomain}")
async def get_site(site_subdomain: str):
    """Get full SM Site Registry record for a given subdomain."""
    if not ADMIN_FRAPPE_URL:
        raise HTTPException(status_code=503, detail="Admin site not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Site Registry/{site_subdomain}",
            headers=_admin_headers(),
            timeout=10,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Site '{site_subdomain}' not found")
        resp.raise_for_status()
        site = resp.json().get("data", {})

    site["site_name"] = f"{site.get('site_subdomain', site_subdomain)}.sparkmojo.com"
    site["site_url"] = f"https://{site.get('site_subdomain', site_subdomain)}.app.sparkmojo.com"

    return {"data": site}


@router.get("/benches")
async def list_benches():
    """List all SM Bench Registry records with utilization."""
    if not ADMIN_FRAPPE_URL:
        return {"data": []}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ADMIN_FRAPPE_URL}/api/resource/SM Bench Registry",
            params={
                "fields": json.dumps(["*"]),
                "limit_page_length": 0,
            },
            headers=_admin_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        benches = resp.json().get("data", [])

    for bench in benches:
        threshold = bench.get("capacity_threshold") or 1
        count = bench.get("active_site_count") or 0
        bench["utilization_pct"] = round((count / threshold) * 100, 1)

    return {"data": benches}
