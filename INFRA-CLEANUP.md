# INFRA-CLEANUP: Post-Ralph Three-Site Topology Cleanup

**Priority:** High — sites are broken  
**Assigned to:** Claude Code (interactive session)  
**Do not run via Ralph** — interactive session required.

---

## Context

The Ralph INFRA-001 through INFRA-007 run completed successfully. All 7 stories are done
but on stacked feature branches — nothing is merged to main yet. Additionally two issues
were documented in QUEUE-COMPLETE.md that need fixing before the sites are usable.

---

## Step 1: Merge All INFRA Branches to Main

All 7 branches need to be merged in order. They are stacked (each builds on the previous).
The simplest approach: merge the final branch (INFRA-007) which contains all the work.

```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform

# Pull latest
git fetch origin

# Check the branch state
git log --oneline origin/infra/INFRA-007-three-site-topology | head -10

# Merge INFRA-007 branch (which contains all 7 stories) to main
git checkout main
git pull origin main
git merge origin/infra/INFRA-007-three-site-topology --no-ff \
  -m "infra: merge three-site topology build (INFRA-001 through INFRA-007)"
git push origin main
```

If there are merge conflicts: resolve in favour of the INFRA branch for all infrastructure
files (docker-compose.poc.yml, deploy.sh, abstraction-layer files). The INFRA branch is
more recent and correct.

---

## Step 2: Deploy to VPS

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
```

Watch the deploy output. It will run all phases including Phase 3 (bench migrate on all
registered sites) and Phase 5 (abstraction layer rebuild).

Expected: exits 0, all Phase 7 checks pass.

If deploy.sh fails on Phase 3 with ModuleNotFoundError for sm_widgets: see Step 3.

---

## Step 3: Fix sm_widgets DocTypes Deleted on poc-dev

The QUEUE-COMPLETE notes say sm_widgets DocTypes were deleted from poc-dev during
bench migrate because sm_widgets is not pip-installed on that site.

Check if this happened:

```bash
ssh sparkmojo "docker exec spark-mojo-platform-poc-frappe-1 \
  bench --site poc-dev.sparkmojo.com execute \
  frappe.db.get_value --args \"['SM Task', None, 'name']\""
```

If this returns an error (not None or a value): SM Task DocType is gone. Fix:

```bash
# Re-sync sm_widgets files into container
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh --phase 2'

# Re-register sm_widgets for poc-dev site
ssh sparkmojo "docker exec spark-mojo-platform-poc-frappe-1 \
  python3 /home/frappe/frappe-bench/apps/sm_provisioning/scripts/register_sm_apps.py \
  --site poc-dev.sparkmojo.com"

# Run migrate to recreate the DocTypes
ssh sparkmojo "docker exec spark-mojo-platform-poc-frappe-1 \
  bench --site poc-dev.sparkmojo.com migrate"

# Verify SM Task is back
ssh sparkmojo "docker exec spark-mojo-platform-poc-frappe-1 \
  bench --site poc-dev.sparkmojo.com execute \
  frappe.db.get_value --args \"['SM Task', None, 'name']\""
# PASS: None or a value (not an error/traceback)
```

Repeat the register + migrate steps for any other site that is missing SM Task.

---

## Step 4: Fix Traefik /api/modules/ Priority for New Subdomains

CLAUDE.md Rule 16: The abstraction layer must intercept `/api/modules/` before Frappe's
catch-all `/api/` rule.

The current docker-compose.poc.yml has a modules router for `poc.sparkmojo.com` but the
new subdomains need the same treatment.

Check the current docker-compose.poc.yml modules router rule. It should use a HostRegexp
that covers all `*.app.sparkmojo.com` subdomains, not just `poc.sparkmojo.com`.

Read the current file:

```bash
cat /Users/jamesilsley/GitHub/spark-mojo-platform/docker-compose.poc.yml | grep -A3 "modules"
```

If the modules router rule only covers `poc.sparkmojo.com`, update it to cover all
subdomains using the same HostRegexp pattern used for the main wildcard routers
that INFRA-TRAEFIK.md established.

The correct rule for the modules router should be:
```
Host(`poc.sparkmojo.com`) || HostRegexp(`[a-z0-9-]+\\.app\\.sparkmojo\\.com`)
```

Update docker-compose.poc.yml, commit, push, deploy:

```bash
git add docker-compose.poc.yml
git commit -m "fix: extend /api/modules/ Traefik priority rule to all app subdomains"
git push origin main
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
```

---

## Step 5: Verify All Sites

```bash
# Abstraction layer health on each site
curl -s https://poc.sparkmojo.com/health
curl -s https://poc-dev.app.sparkmojo.com/health
curl -s https://internal.app.sparkmojo.com/health
curl -s https://willow.app.sparkmojo.com/health
# PASS: all return {"status":"ok","frappe_connected":true} or similar

# React frontend loads on each app subdomain
curl -sI https://app.poc.sparkmojo.com
curl -sI https://poc-dev.app.sparkmojo.com
curl -sI https://internal.app.sparkmojo.com
curl -sI https://willow.app.sparkmojo.com
# PASS: all return HTTP/2 200

# Frappe Desk loads on each direct subdomain
curl -sI https://poc.sparkmojo.com
curl -sI https://admin.sparkmojo.com
curl -sI https://internal.sparkmojo.com
curl -sI https://willow.sparkmojo.com
# PASS: all return HTTP/2 200 or redirect to /login

# SM Task DocType accessible on all sites
for SITE in poc-dev.sparkmojo.com admin.sparkmojo.com internal.sparkmojo.com willow.sparkmojo.com; do
  echo "=== $SITE ==="
  ssh sparkmojo "docker exec spark-mojo-platform-poc-frappe-1 \
    bench --site $SITE execute frappe.db.get_value --args \"['SM Task', None, 'name']\""
done
# PASS: each returns None or a value (not an error)
```

---

## Step 6: Run Smoke Test

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./scripts/smoke_test.sh'
# PASS: exits 0, all green
```

---

## Step 7: Clean Up Prompt Files from Repo Root

Remove the temporary prompt files that are no longer needed:

```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform
git rm HOTFIX-POC-502.md HOTFIX-POC-502-COMPLETE INFRA-TRAEFIK.md INFRA-TRAEFIK-COMPLETE QUEUE-COMPLETE.md 2>/dev/null || true
# Also remove any INFRA-NNN-COMPLETE marker files
git rm INFRA-*-COMPLETE 2>/dev/null || true
git rm PLAN-INFRA-*.md BLOCKED-*.md 2>/dev/null || true
git commit -m "chore: remove temporary build prompt and marker files post-INFRA build"
git push origin main
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main'
```

---

## Do NOT

- Do not run `bench get-app` or install new apps — that is for the Mega Agent Run
- Do not modify any Mojo frontend code
- Do not touch index.jsx routing structure
- Do not modify FRAPPE_SITE_NAME_HEADER — leave as-is per INFRA-TRAEFIK decision

---

## When Complete

All sites should be accessible:
- `poc.sparkmojo.com` — existing POC Frappe Desk (legacy access)
- `app.poc.sparkmojo.com` — existing React frontend (legacy access)
- `admin.sparkmojo.com` — Admin Console Frappe Desk
- `poc-dev.app.sparkmojo.com` — React frontend for POC/Dev
- `internal.app.sparkmojo.com` — React frontend for SM Internal  
- `willow.app.sparkmojo.com` — React frontend for Willow
- All `/health` endpoints returning `{"status":"ok","frappe_connected":true}`
- SM Task DocType accessible on all four Frappe sites
