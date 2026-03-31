# PLAN-INFRA-006: deploy.sh Phase 3 — Loop All SM Site Registry Sites

**Story ID:** INFRA-006
**Type:** Shell
**Branch:** `infra/INFRA-006-deploy-site-loop`
**Depends on:** INFRA-003-COMPLETE (present)
**Commit message:** `infra: deploy.sh Phase 3 loops all SM Site Registry sites (INFRA-006)`

---

## Files to Modify

1. **`/Users/jamesilsley/GitHub/spark-mojo-platform/deploy.sh`** — Replace Phase 3 `phase_3()` function
2. **`/Users/jamesilsley/GitHub/spark-mojo-platform/.env.example`** — Create new file with LEGACY_SITES

---

## Changes

### 1. deploy.sh — Phase 3 (`phase_3()` function, lines 254-302)

Replace the single-site `bench --site "$FRAPPE_SITE" migrate` with:

- Query SM Site Registry on admin.sparkmojo.com for all active frappe_site values
- Fallback to `LEGACY_SITES` env var (default: `frontend`) if admin site not reachable
- Loop over each site, run `bench --site $SITE migrate`
- Per-site pass/fail logging
- Count failures; log summary at end; do NOT abort on individual site failure
- Keep the existing VERIFY.txt DocType verification loop (runs per-site too, on each migrated site)

**Critical constraints:**
- Only modify `phase_3()`. Do NOT touch phases 0, 1, 2, 4, 5, 6, or 7.
- The `set -eo pipefail` at the top means we need `|| true` on commands that may fail
- `FRAPPE_BACKEND` container var already defined at line 14
- Admin site name is `admin.sparkmojo.com` (provisioned in INFRA-001)

### 2. .env.example — New file

```bash
# Fallback site list for deploy.sh Phase 3 when admin site is not yet reachable
# Space-separated Frappe site names
LEGACY_SITES=frontend
```

---

## Quality Gates (from spec Definition of Done)

| # | Gate | Command |
|---|------|---------|
| 1 | deploy.sh --verify-only passes | `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh --verify-only'` |
| 2 | Phase 3 runs without error | `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh --phase 3'` |
| 3 | Fallback works (manual) | Document result — temporarily stop admin site, run --phase 3, verify LEGACY_SITES fallback |
| 4 | LEGACY_SITES in .env.example | `grep LEGACY_SITES .env.example` |

---

## Env Vars Used

- `LEGACY_SITES` — new, fallback site list (default: `frontend`)
- Existing: `FRAPPE_BACKEND`, `FRAPPE_SITE`, `FRAPPE_APPS_DIR`

---

## Ambiguities

1. **VERIFY.txt loop also needs multi-site awareness.** Currently it runs against `$FRAPPE_SITE` (hardcoded `frontend`). The spec says "surgical change to Phase 3 only" but the VERIFY.txt check is part of Phase 3. I will run VERIFY.txt checks against each migrated site (same loop), which is consistent with the spec intent. If admin site doesn't have the same apps, VERIFY.txt checks may fail — will handle by only verifying DocTypes on the site that has the app installed.

2. **`frappe.db.get_all` output format via bench execute.** The output is a Python list printed to stdout. Will need to parse it (strip brackets/quotes). If the command returns `['frontend', 'admin.sparkmojo.com']`, need to extract site names. Alternative: use `frappe.db.get_all(..., pluck='frappe_site')` which returns a flat list, then strip with sed.

3. **No .env.example exists yet** — creating it fresh. Only contains LEGACY_SITES for now.
