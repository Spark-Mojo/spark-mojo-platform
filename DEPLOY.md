# DEPLOY.md — Spark Mojo POC Deployment

Automated deployment for the Spark Mojo POC VPS (`poc.sparkmojo.com`).

---

## Quick Start

```bash
# Full deploy (all phases)
./deploy.sh

# Check current state without deploying
./deploy.sh --verify-only

# Run a single phase
./deploy.sh --phase 2    # sync sm_widgets only
./deploy.sh --phase 3    # bench migrate only
./deploy.sh --phase 6    # frontend rebuild only
./deploy.sh --phase 7    # verification only (same as --verify-only)
```

---

## What Each Phase Does

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Pre-flight | Verifies directory, Docker access, and Frappe backend is running |
| 1 | Pull | `git pull origin main` and prints HEAD commit |
| 2 | Sync sm_widgets | Copies app into ALL Frappe containers, pip installs, ensures apps.txt + tabInstalled Application |
| 3 | Migrate | Runs `bench migrate` and verifies SM Task DocType exists |
| 4 | Restart Frappe | Restarts backend + workers, polls health until responsive (60s timeout) |
| 5 | Abstraction layer | Rebuilds and restarts the FastAPI container (no-cache) |
| 6 | Frontend | Rebuilds React app (no-cache), verifies bundle hash matches index.html |
| 7 | Verification | Runs 6 end-to-end checks and prints pass/fail table |

---

## Failure Modes This Script Prevents

### 1. sm_widgets not installed in worker containers

**What happened:** sm_widgets was pip-installed only in `frappe-poc-backend-1` but not in queue or scheduler containers. Adding it to `apps.txt` caused `ModuleNotFoundError` on workers, crashing background jobs.

**How deploy.sh prevents it:** Phase 2 copies and pip-installs sm_widgets into ALL four Frappe containers (backend, queue-short, queue-long, scheduler) before touching apps.txt.

### 2. Docker cached build serving stale bundle

**What happened:** `docker compose build` used cached layers. The nginx container served an old `index.html` referencing an old JS bundle that didn't include new components like WorkboardMojo.

**How deploy.sh prevents it:** Phase 6 always builds with `--no-cache`. After rebuild, it verifies the bundle filename on disk matches what `index.html` references. It also checks the bundle contains expected string literals.

### 3. Traefik routing not verified after deploy

**What happened:** `/api/modules/` requests were routed to Frappe instead of the abstraction layer. The only symptom was `DoesNotExistError` — which looked like a Frappe issue, not a routing issue. Took hours to diagnose.

**How deploy.sh prevents it:** Phase 7 Check 4 explicitly tests that `poc.sparkmojo.com/api/modules/tasks/list` returns JSON from the abstraction layer (not a Frappe error). If Traefik is misrouting, this check fails immediately.

---

## Logs

All output is logged to:

```
/home/ops/deploy-logs/deploy-YYYYMMDD-HHMMSS.log
```

The log file path is printed at the end of every run.

---

## Prerequisites

- Run from the VPS as the `ops` user
- Docker must be accessible via `sudo docker`
- The Frappe stack (`frappe-poc`) must already be running
- The repo must be at `/home/ops/spark-mojo-platform`

---

*Created: March 27, 2026*
