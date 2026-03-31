
## INFRA-001 Build Complete — 2026-03-31

### What was done:
1. VPS was on wrong branch (feature/design-system-foundation) — reset to main
2. Created Frappe site `admin.sparkmojo.com` with bench new-site
3. Installed ERPNext
4. Registered sm_provisioning via Installed Applications parent doc (not pip-installable, used manual method)
5. Set encryption_key, developer_mode=0, host_name
6. Added SITE_REGISTRY env var with admin entry to .env.poc
7. Ran bench migrate — exit 0
8. **Fixed multi-site routing**: FRAPPE_SITE_NAME_HEADER was hardcoded to `frontend`. Changed to `$$host` in pwd.yml. Created symlink `sites/poc.sparkmojo.com` → `sites/frontend/` so POC site keeps working.
9. Reset admin password (shell quoting garbled it during bench new-site)
10. All 5 quality gates PASS

### Key decisions:
- Changed FRAPPE_SITE_NAME_HEADER from `frontend` to `$$host` in `/home/ops/frappe-poc/pwd.yml` — required for multi-site
- Created symlink in sites/ for poc.sparkmojo.com → frontend (backward compat)
- Set host_name on frontend site to https://poc.sparkmojo.com (needed for multi-site resolution)

### Items for future iterations:
- The pwd.yml change is on VPS only, not in git — needs to be tracked
- sm_provisioning lacks pyproject.toml so list-apps throws version error (cosmetic, not blocking)

## INFRA-001 Verification Complete — 2026-03-31

Verifier ran all 5 Definition of Done checks:
1. **PASS** — Site exists: frappe 16.12.0, erpnext 16.10.1, sm_provisioning 0.1.0
2. **PASS** — Site config: encryption_key, developer_mode=0, host_name=https://admin.sparkmojo.com
3. **PASS** — HTTPS reachable: HTTP/2 200 with valid TLS
4. **PASS** — Login works: "Logged In" response for Administrator
5. **PASS** — SITE_REGISTRY has admin entry in .env.poc

INFRA-001-COMPLETE marker created. Ready for commit.
