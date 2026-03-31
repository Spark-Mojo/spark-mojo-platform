# PLAN — INFRA-004: sm_admin Service Account + SM Admin Service Role

**Story ID:** INFRA-004
**Type:** Frappe / Python
**Branch:** `infra/INFRA-004-admin-service-account`
**Depends on:** INFRA-002-COMPLETE ✅ (present)
**Commit message:** `infra: sm_admin service account and SM Admin Service role in provisioning (INFRA-004)`

---

## Files to Create

### 1. Provisioning script
**Path:** `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_provisioning/scripts/create_admin_service_account.py`

- `generate_password(length=32)` — alphanumeric, uses `secrets` module
- `create_admin_service_account(site_name)` — idempotent: creates Role + User only if they don't exist
- CLI interface: `--site` argument
- Prints password to stdout with `STORE IN BITWARDEN:` label (adapted from spec's vault format)
- Email: `sm_admin@sparkmojo.internal`
- Role: `SM Admin Service`

### 2. Role definition (custom Role JSON)
**Path:** `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/role/sm_admin_service.json`

- Role name: `SM Admin Service`
- Description: Admin Console service account — minimum permissions only
- Permissions: User (R/W), Has Role (R/W), System Settings (R), Installed Application (R)
- Explicit exclusions: SM Task, CRM Lead, CRM Contact, File, Attachment, any healthcare/billing

Note: Check if Frappe uses `role/` directory or if custom role definitions go elsewhere. The spec says "Role JSON exists in sm_provisioning" and CHECK 3 looks for `role/` directory. May need to verify Frappe's role export format.

### 3. Tests
**Path:** `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/tests/test_admin_service.py`

- `test_script_importable()` — imports `create_admin_service_account` without error
- `test_generate_password()` — length=32, alphanumeric
- `test_idempotent_when_user_exists()` — mock frappe.db.exists → True, assert no insert called

Note: Import path needs adjustment since the script is in `frappe-apps/sm_provisioning/scripts/`, not in the abstraction-layer. Will need sys.path manipulation or conftest fixture.

---

## Quality Gates (from Definition of Done)

1. **Script exists:** `ls frappe-apps/sm_provisioning/scripts/create_admin_service_account.py`
2. **Syntax valid:** `python3 -c "import ast; ast.parse(...)"`
3. **Role JSON exists:** `ls frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/role/sm_admin_service.json`
4. **Tests pass:** `pytest abstraction-layer/tests/ -v` — 0 failures

---

## Env Vars Used

None directly (INFRA-004 creates the script; INFRA-007 runs it with site passwords).

---

## Ambiguities

1. **Role JSON format:** Spec says CHECK 3 looks for `role/` directory with `sm_admin_service.json`. Frappe typically exports roles via `bench export-fixtures`. The builder should create a Frappe-compatible role JSON that can be imported via `bench import-doc` or loaded by the controller. Alternatively, the script itself creates the role at runtime — the JSON file may be a reference/fixture rather than auto-loaded.

2. **Test import path:** The script lives in `frappe-apps/` but tests are in `abstraction-layer/tests/`. Builder needs to handle the import path (sys.path insert or conftest).

3. **scripts/ directory:** May need `__init__.py` for importability.
