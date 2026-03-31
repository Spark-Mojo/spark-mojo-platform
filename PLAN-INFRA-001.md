# PLAN: INFRA-001 — Provision admin.sparkmojo.com

**Story ID:** INFRA-001
**Type:** Infrastructure (bench + shell)
**Branch:** `infra/INFRA-001-admin-site`
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-001-provision-admin-site.md`

---

## Dependency Check

- DECISION-018 locked: ✅
- DNS A record for admin.sparkmojo.com → 72.60.125.140: ✅
- DNS A record for internal.sparkmojo.com → 72.60.125.140: ✅
- DNS A record for willow.sparkmojo.com → 72.60.125.140: ✅
- All DNS blockers cleared as of 2026-03-31.

## Environment Variables Used

- `SM_MARIADB_ROOT_PASSWORD` — SET ✅
- `SM_ADMIN_SITE_PASSWORD` — SET ✅

## Implementation Steps

1. **Pre-flight checks** — SSH to VPS, verify containers running, confirm admin.sparkmojo.com not already a site
2. **Step 1: Create Frappe site** — `bench new-site admin.sparkmojo.com` with MariaDB root password and admin password from env vars. Container name: `frappe-poc-backend-1` (per memory — verify during pre-flight)
3. **Step 2: Install ERPNext** — `bench --site admin.sparkmojo.com install-app erpnext`
4. **Step 3: Install sm_provisioning** — Run `deploy.sh --phase 2` to sync frappe-apps, then register sm_provisioning via Python in tabInstalled Application (NOT apps.txt per CLAUDE.md Rule 11)
5. **Step 4: Configure site** — Set encryption_key (generated), developer_mode=0, host_name
6. **Step 5: Register in SITE_REGISTRY env var** — Add admin entry to abstraction layer .env, restart poc-api
7. **Step 6: Configure Traefik routing** — Check if wildcard HostRegexp already routes admin.sparkmojo.com; if not, add explicit Host rule
8. **Step 7: Run bench migrate** — `bench --site admin.sparkmojo.com migrate`

## Files to Create or Modify

- No files in the repo are created/modified by this story (it's all VPS provisioning commands)
- `.env` on VPS: add admin site to SITE_REGISTRY
- Traefik dynamic config on VPS (if needed): add admin.sparkmojo.com routing rule
- `INFRA-001-COMPLETE` marker file at repo root on success

## Quality Gates (Definition of Done)

1. **Site exists and apps installed:** `bench --site admin.sparkmojo.com list-apps` → frappe, erpnext, sm_provisioning
2. **Site config complete:** encryption_key, developer_mode=0, host_name all present in site config
3. **Site reachable over HTTPS:** `curl -sI https://admin.sparkmojo.com` → HTTP 200 or 302, valid TLS
4. **Login works:** POST to login endpoint with admin password → "Logged In"
5. **Abstraction layer sees admin site:** /sites endpoint or env var contains admin entry

## Ambiguities

- **Frappe container name:** Story spec says `spark-mojo-platform-poc-frappe-1`, memory says `frappe-poc-backend-1`. Builder must verify with `docker ps` during pre-flight and use the actual container name.
- **sm_provisioning installation:** Must use tabInstalled Application INSERT approach, not apps.txt. Story spec Step 3 shows the correct Python approach.

## Notes

- All BLOCKED-INFRA-*.md files for stories 002-007 are still present (dependency chain). They will be re-evaluated after INFRA-001 completes.
- Generated encryption key and admin password should NOT be committed. Admin password comes from env var.
