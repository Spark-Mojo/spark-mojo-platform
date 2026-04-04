# MORNING-TEST-PLAN: PROV-001 Provisioning API

**Branch:** `queue/session-19-prov-001`
**Date:** April 4, 2026
**Story:** PROV-001

---

## What Was Built

1. **`abstraction-layer/routes/provisioning.py`** — Full provisioning API with 14-step orchestration
2. **SM Bench Registry DocType** — New DocType in sm_provisioning for bench tracking
3. **SM Site Registry schema extensions** — 9 new fields (bench_name, bench_host, medplum_project_id, n8n_workspace_ref, timezone, installed_apps, provisioning_timestamp, provisioning_status)
4. **Vertical templates** — behavioral_health.yaml and general_smb.yaml in abstraction-layer/provisioning/templates/
5. **Router registration** — provisioning_router registered in main.py at `/api/admin`
6. **Tests** — Validation, template loading, endpoint structure, and Pydantic model tests
7. **.env.example** — Updated with provisioning env vars

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/sites/create` | Full 14-step provisioning |
| GET | `/api/admin/sites` | List all sites |
| GET | `/api/admin/sites/{subdomain}` | Get single site |
| GET | `/api/admin/benches` | List benches with utilization |

---

## Pre-Merge Test Plan

### 1. Unit Tests (run locally)

```bash
cd abstraction-layer
pip install pyyaml
pytest tests/test_provisioning.py -v
pytest tests/test_provisioning.py --cov=routes --cov-report=term-missing
```

**Expected:** 58 tests pass. Coverage on routes/provisioning.py >= 80%.

**Test classes:**
- `TestSiteCreateValidation` (5 tests) — Pydantic validation via API
- `TestTemplateLoading` (4 tests) — YAML template file existence and content
- `TestListEndpoints` (3 tests) — GET endpoint structure in empty state
- `TestProvisioningModels` (3 tests) — Pydantic models directly
- `TestDockerExecHelper` (4 tests) — Docker exec wrapper and admin headers
- `TestPreflightStep` (3 tests) — Pre-flight with/without admin URL, duplicate detection
- `TestTemplateLoadingStep` (5 tests) — Template loading, overrides, invalid types
- `TestBenchSelection` (3 tests) — Dev fallback, no-bench-found, capacity warning
- `TestFrappeSiteSteps` (8 tests) — All Docker exec steps: create site, erpnext, SM apps, vertical apps
- `TestConfigureAndVerify` (12 tests) — Site config, HIPAA verification, smoke test, bench migrate, Traefik
- `TestMedplumAndN8n` (5 tests) — Stub mode, real API calls, n8n failure handling
- `TestSiteRegistration` (2 tests) — No admin URL skip, duplicate 409
- `TestCreateSiteEndpoint` (2 tests) — Full orchestration success and partial failure

### 2. Code Review Checklist

- [ ] No hardcoded credentials in provisioning.py (all from env vars)
- [ ] SiteCreateRequest validates subdomain, site_type, server_tier
- [ ] HARD STOP steps (1, 2, 3, 10) raise HTTPException
- [ ] Non-HARD-STOP steps catch exceptions and add to steps_failed
- [ ] Medplum stub mode works when MEDPLUM_BASE_URL is empty
- [ ] n8n stub mode works when N8N_BASE_URL is empty
- [ ] Traefik warning always added to response warnings
- [ ] SM Bench Registry DocType has correct field structure
- [ ] SM Site Registry has all 9 new fields
- [ ] Router registered in main.py with prefix `/api/admin`
- [ ] pyyaml added to requirements.txt
- [ ] Duplicate subdomain returns 409

### 3. Post-Merge VPS Verification

After merging and running `deploy.sh`:

```bash
# 1. Verify bench migrate succeeds on admin site
ssh sparkmojo "docker exec frappe-poc-backend-1 bench --site admin.sparkmojo.com migrate"

# 2. Verify SM Bench Registry DocType accessible
ssh sparkmojo "docker exec frappe-poc-backend-1 bench --site admin.sparkmojo.com execute \
  'frappe.db.get_list(\"SM Bench Registry\", limit=1)'"

# 3. Seed the initial bench record
ssh sparkmojo "docker exec frappe-poc-backend-1 bench --site admin.sparkmojo.com execute \
  'doc = frappe.get_doc({\"doctype\": \"SM Bench Registry\", \"bench_name\": \"hipaa-health-01\", \"bench_host\": \"72.60.125.140\", \"bench_tier\": \"hipaa-health\", \"is_active\": 1, \"active_site_count\": 3, \"capacity_threshold\": 60}); doc.insert(ignore_permissions=True); frappe.db.commit(); print(\"Seeded:\", doc.name)'"

# 4. Test provisioning endpoint (creates a real site!)
curl -X POST https://poc.sparkmojo.com/api/admin/sites/create \
  -H 'Content-Type: application/json' \
  -d '{
    "site_subdomain": "test-prov-01",
    "site_type": "behavioral_health",
    "server_tier": "hipaa",
    "admin_password": "Test1234!",
    "display_name": "Test Practice",
    "timezone": "America/New_York"
  }'

# 5. Verify list endpoint
curl https://poc.sparkmojo.com/api/admin/sites

# 6. Verify single site endpoint
curl https://poc.sparkmojo.com/api/admin/sites/test-prov-01

# 7. Verify bench list
curl https://poc.sparkmojo.com/api/admin/benches

# 8. Verify duplicate returns 409
# (run same create call again — expect HTTP 409)

# 9. Verify new site in bench
ssh sparkmojo "docker exec frappe-poc-backend-1 bench list-sites"
```

### 4. Known Limitations (Expected)

- Medplum project creation is STUB mode (MEDPLUM_BASE_URL not set) — returns stub-* ID
- n8n workspace seeding is STUB (N8N_BASE_URL not set)
- Traefik Host() rule must be added manually for new subdomains
- HIPAA checks 4-8 require manual confirmation
- Multi-bench SSH routing not implemented (PROV-006)
- No auth on admin endpoints yet — admin auth is a follow-on

---

## Risk Assessment

**Low risk:** All changes are additive. No existing endpoints or DocTypes modified in breaking ways. SM Site Registry gains new optional fields only. New router prefix `/api/admin` does not conflict with existing routes.

**Rollback:** Revert the branch merge. No destructive schema changes.
