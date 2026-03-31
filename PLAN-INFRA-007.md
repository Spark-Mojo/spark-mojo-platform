# PLAN — INFRA-007: Three-Site Topology Build

**Story ID:** INFRA-007
**Type:** Infrastructure (bench + shell + verification)
**Branch:** `infra/INFRA-007-three-site-topology`
**Depends on:** INFRA-001 through INFRA-006 (all COMPLETE ✅)
**Commit message:** `infra: three-site topology complete — poc-dev, sm-internal, willow sites + Round 1 app installs + smoke test (INFRA-007)`

---

## Env Vars Used

- `SM_MARIADB_ROOT_PASSWORD` — ✅ set
- `SM_ADMIN_SITE_PASSWORD` — ✅ set
- `SM_INTERNAL_SITE_PASSWORD` — ✅ set
- `SM_WILLOW_SITE_PASSWORD` — ✅ set

---

## Files to Create or Modify

| Action | Absolute Path |
|--------|---------------|
| Create | `/Users/jamesilsley/GitHub/spark-mojo-platform/scripts/smoke_test.sh` |
| Modify | `/Users/jamesilsley/GitHub/spark-mojo-platform/.env.example` (update LEGACY_SITES to poc-dev.sparkmojo.com) |

All other changes are VPS-side bench operations (rename site, new-site, install-app, set-config, register SM apps, register in SM Site Registry).

---

## Step-by-Step Plan

### Step 1: Rename existing POC site `frontend` → `poc-dev.sparkmojo.com`

1. `ssh sparkmojo` → `docker exec $FRAPPE_CONTAINER bench rename-site frontend poc-dev.sparkmojo.com`
2. Set host_name: `bench --site poc-dev.sparkmojo.com set-config host_name 'https://poc-dev.app.sparkmojo.com'`
3. Verify: `bench list-sites` — `poc-dev.sparkmojo.com` present, `frontend` absent
4. Update SM Site Registry on admin site: update existing poc-dev record (frappe_site → poc-dev.sparkmojo.com)
5. Update LEGACY_SITES in `.env.example` to `poc-dev.sparkmojo.com`

**Note:** The `frontend` symlink in sites/ (created in INFRA-001 for backward compat) may need cleanup. After rename, poc.sparkmojo.com routing needs the symlink updated or removed since the site name changes.

**Important:** `FRAPPE_CONTAINER` — scratchpad from INFRA-001 says the actual container name is `frappe-poc-backend-1`, NOT `spark-mojo-platform-poc-frappe-1` as in the spec. Builder must verify with `docker ps` first.

### Step 2: Install Round 1 Frappe Apps on poc-dev.sparkmojo.com

Install in dependency order:
1. crm (bench get-app + install-app)
2. insights
3. payments
4. hrms (check if already in image first)
5. drive
6. wiki
7. lms
8. helpdesk
9. marley (from https://github.com/earthians/marley --branch main)

After all installs: `bench --site poc-dev.sparkmojo.com migrate`

**If any `bench get-app` fails:** Write `BLOCKED-INFRA-007-[APPNAME].md`, skip that app, continue.

### Step 3: Provision internal.sparkmojo.com

Run PROVISIONING_RUNBOOK.md Phases 1–8 (skip Phase 0.5 — server exists, skip Phase 9 — standard tier on Hostinger):

1. **Phase 0** — Pre-flight: confirm containers running, check DNS
2. **Phase 1** — `bench new-site internal.sparkmojo.com --mariadb-root-password ... --admin-password ...`
3. **Phase 2** — `bench --site internal.sparkmojo.com install-app erpnext`
4. **Phase 3** — `register_sm_apps.py --site internal.sparkmojo.com`
5. **Phase 4** — Skip (not behavioral_health)
6. **Phase 5** — Set developer_mode=0, host_name=https://internal.app.sparkmojo.com
7. **Phase 6** — Register in SM Site Registry (site_type: internal, server_tier: standard)
8. **Phase 7** — Check Traefik routing (wildcard should handle it)
9. **Phase 8** — `bench --site internal.sparkmojo.com migrate`

After: `create_admin_service_account.py --site internal.sparkmojo.com`
Print: `STORE IN BITWARDEN: sm_admin — internal.sparkmojo.com = [password]`

### Step 4: Provision willow.sparkmojo.com

Run PROVISIONING_RUNBOOK.md Phases 1–9:

1. **Phase 1** — `bench new-site willow.sparkmojo.com --mariadb-root-password ... --admin-password ...`
2. **Phase 2** — `bench --site willow.sparkmojo.com install-app erpnext`
3. **Phase 3** — `register_sm_apps.py --site willow.sparkmojo.com`
4. **Phase 4** — Install marley: `bench --site willow.sparkmojo.com install-app marley` (already fetched in Step 2)
5. **Phase 5** — Set developer_mode=0, host_name=https://willow.app.sparkmojo.com
6. **Phase 6** — Register in SM Site Registry (site_type: behavioral_health, server_tier: standard)
7. **Phase 7** — Check Traefik routing
8. **Phase 8** — `bench --site willow.sparkmojo.com migrate`
9. **Phase 9** — HIPAA checklist: run all 8 checks. CHECK 8 (DO BAA): "J-003 pending — synthetic data only."

After: `create_admin_service_account.py --site willow.sparkmojo.com`
Print: `STORE IN BITWARDEN: sm_admin — willow.sparkmojo.com = [password]`

### Step 5: Create scripts/smoke_test.sh

Create `/Users/jamesilsley/GitHub/spark-mojo-platform/scripts/smoke_test.sh` per spec.
`chmod +x`. Commit to branch.

---

## Quality Gates (Definition of Done — 8 checks)

1. **All 4 sites in bench:** admin.sparkmojo.com, poc-dev.sparkmojo.com, internal.sparkmojo.com, willow.sparkmojo.com
2. **All 4 sites in SM Site Registry:** admin, poc-dev, internal, willow
3. **Round 1 apps on poc-dev:** crm, insights, payments, hrms, drive, wiki, lms, helpdesk, marley (blocked apps documented)
4. **Marley on willow:** willow.sparkmojo.com list-apps includes marley
5. **Smoke test passes:** `scripts/smoke_test.sh` exits 0
6. **deploy.sh --verify-only passes:** all Phase 7 checks pass
7. **frontend site gone:** `bench list-sites | grep '^frontend$'` returns nothing
8. **smoke_test.sh committed:** commit message contains INFRA-007

---

## Ambiguities / Risks

1. **DNS records for internal/willow may not exist.** Memory mem-1774918483-c466 says DNS A records for internal.sparkmojo.com and willow.sparkmojo.com are not configured yet. This will cause:
   - Phase 0 pre-flight DNS check to fail (non-blocking — bench operations don't need DNS)
   - Smoke test HTTPS checks to fail (blocking for CHECK 5)
   - Traefik TLS cert issuance to fail (blocking for external access)
   - **If DNS is not set up:** smoke_test.sh will fail. Builder should document this in BLOCKED-INFRA-007.md and note that James needs to add DNS records.

2. **Container name mismatch.** Spec says `spark-mojo-platform-poc-frappe-1` but INFRA-001 scratchpad says actual name is `frappe-poc-backend-1`. Builder MUST verify with `docker ps`.

3. **Site rename may break deploy.sh Phase 3.** Phase 3 now queries SM Site Registry for active sites. If the poc-dev record still says `frappe_site: frontend` while the site is now `poc-dev.sparkmojo.com`, migrate will fail for that entry. Must update SM Site Registry BEFORE running deploy.sh.

4. **poc.sparkmojo.com routing after rename.** The `frontend` symlink in sites/ and host_name on the old `frontend` site were set to poc.sparkmojo.com. After rename to poc-dev.sparkmojo.com, Frappe will route by host_name. Need to understand if poc.sparkmojo.com should still work or if it's being deprecated in favor of poc-dev.app.sparkmojo.com.

5. **Round 1 app compatibility.** Some apps (crm, insights, drive, etc.) may require specific Frappe/ERPNext versions or have dependency conflicts. Each `bench get-app` may fail. Per spec: write BLOCKED file per app and continue.

6. **marley vs healthcare.** Spec says install `marley` (https://github.com/earthians/marley). The provisioning runbook Phase 4 references `healthcare`. The INFRA-007 spec explicitly says `marley`. Use `marley` per INFRA-007 spec.
