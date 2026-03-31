# PLAN: INFRA-002 — SM Site Registry DocType

**Story ID:** INFRA-002
**Type:** Frappe DocType
**Branch:** `infra/INFRA-002-sm-site-registry`
**Dependency:** INFRA-001-COMPLETE ✅ (present)
**Env vars used:** SM_MARIADB_ROOT_PASSWORD (for bench migrate), SM_ADMIN_SITE_PASSWORD (implicit — admin site already provisioned)

---

## Current State

- `sm_provisioning` app directory exists at `frappe-apps/sm_provisioning/` but is empty (only `.gitkeep`)
- INFRA-001 is complete — `admin.sparkmojo.com` Frappe site exists on VPS
- Frappe container: `spark-mojo-platform-poc-frappe-1` (verify — memory says `frappe-poc-backend-1`)

## Files to Create

All paths relative to `/Users/jamesilsley/GitHub/spark-mojo-platform/`:

1. **`frappe-apps/sm_provisioning/pyproject.toml`** — flit build config
2. **`frappe-apps/sm_provisioning/sm_provisioning/__init__.py`** — `__version__ = "0.1.0"`
3. **`frappe-apps/sm_provisioning/sm_provisioning/hooks.py`** — app metadata
4. **`frappe-apps/sm_provisioning/sm_provisioning/modules.txt`** — `SM Provisioning`
5. **`frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/__init__.py`** — empty (module folder)
6. **`frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/doctype/__init__.py`** — empty
7. **`frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/doctype/sm_site_registry/__init__.py`** — empty
8. **`frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/doctype/sm_site_registry/sm_site_registry.json`** — DocType schema (15 fields from spec)
9. **`frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/doctype/sm_site_registry/sm_site_registry.py`** — Controller with validate() and as_registry_dict()

## Files to Modify

None — all new files.

## Build Steps

1. Create branch `infra/INFRA-002-sm-site-registry` from current branch (or main)
2. Create full app directory structure per CLAUDE.md Rule 13
3. Create DocType JSON with all 15 fields from spec
4. Create controller with JSON validation and hipaa flag logic
5. Commit and push
6. Deploy to VPS: `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin infra/INFRA-002-sm-site-registry && ./deploy.sh --phase 2'` (sync frappe-apps)
7. Run `bench migrate` on admin.sparkmojo.com
8. Seed admin record
9. Seed poc-dev record
10. Run all 5 Definition of Done checks

## Quality Gates (from spec)

1. `bench --site admin.sparkmojo.com migrate` exits 0, SM Site Registry in output
2. DocType exists in Frappe (frappe.db.get_value doesn't error)
3. Admin seed record exists with frappe_site = admin.sparkmojo.com
4. JSON validation rejects invalid JSON (ValidationError on bad connectors_json)
5. Module folder structure correct: `sm_provisioning/sm_provisioning/sm_provisioning/doctype/sm_site_registry/` has .json and .py

## Ambiguities

- **Frappe container name**: Memory says `frappe-poc-backend-1`, spec says `spark-mojo-platform-poc-frappe-1`. Builder must verify with `docker ps` on VPS.
- **Which site to run migrate on**: Story spec says admin.sparkmojo.com. But deploy.sh Phase 3 may run on `frontend` site. Builder should run migrate on admin.sparkmojo.com explicitly per spec, and also on frontend if needed.
- **Branch strategy**: Currently on `infra/INFRA-001-admin-site`. INFRA-002 should branch from main after INFRA-001 is merged, or from current branch if INFRA-001 hasn't been merged yet. Builder should check.
