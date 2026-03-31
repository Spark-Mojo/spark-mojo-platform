# PLAN-INFRA-005: register_sm_apps.py Script

**Story ID:** INFRA-005
**Type:** Python script
**Branch:** `infra/INFRA-005-register-sm-apps`
**Dependency:** INFRA-001-COMPLETE (VERIFIED: present)

---

## Files to Create or Modify

1. **CREATE** `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_provisioning/scripts/register_sm_apps.py`
   - Idempotent script to register SM apps in `tabInstalled Application`
   - CLI with `--site` (required) and `--apps` (optional, comma-separated)
   - DEFAULT_SM_APPS = ['sm_widgets', 'sm_connectors', 'sm_provisioning']
   - Uses frappe.init/connect/destroy pattern
   - Does NOT touch apps.txt (per CLAUDE.md Rules 11 and 17)

2. **CREATE** `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/tests/test_register_sm_apps.py`
   - 4 test cases: importable, idempotent, registers missing, custom app list
   - Mocks frappe module (script runs inside Frappe bench, tests run outside)
   - sys.path.insert for scripts/ directory import

## Env Vars Used

None directly. Script takes `--site` as CLI argument.

## Quality Gates

1. Script exists at `frappe-apps/sm_provisioning/scripts/register_sm_apps.py`
2. `python3 -c "import ast; ast.parse(...)"` — syntax valid
3. `docker exec ... python3 .../register_sm_apps.py --help` — usage prints, no error
4. `pytest abstraction-layer/tests/ -v` — 0 failures

## Ambiguities

- **Gate 3 (docker exec --help):** Requires sm_provisioning to be synced into the container. deploy.sh --phase 2 must run first to copy the script. The builder should deploy before running Gate 3.
- **scripts/ __init__.py:** Already created in INFRA-004. No action needed.
- **f-string nested quotes:** The spec's print statements use `f'..., '.join(...)...'` which has nested single quotes — builder should use double quotes for the f-string or an alternative approach to avoid syntax error.
