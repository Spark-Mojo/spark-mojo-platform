# spark-mojo-platform

The Spark Mojo Platform codebase — React frontend, Frappe custom apps, and the Mojo Abstraction Layer.

**Status:** Phase 2 — initial structure. Migration from experimental platform prototype in progress.

---

## Repository Structure

| Directory | Contents |
|-----------|----------|
| `/frontend` | React + Vite application (migrating from `sm-platform-experimental-platform`) |
| `/frappe-apps` | SM custom Frappe apps (`sm_connectors`, `sm_widgets`, `sm_billing`, `sm_provisioning`) |
| `/abstraction-layer` | Mojo Abstraction Layer — Python FastAPI routing service |
| `/scripts` | Deployment, provisioning, and utility scripts |

## Architecture Documentation

All architecture decisions, PRDs, and planning documents live in the `sparkmojo-internal` repo:

- **Platform overview:** `platform/architecture/PLATFORM_ARCHITECTURE.md`
- **Frontend PRD:** `platform/prd/FRONTEND_PRD.md` — read this before any frontend work
- **Frontend decisions:** `platform/decisions/FRONTEND_DECISIONS.md`
- **Migration guide:** `platform/prd/FRONTEND_PRD.md` Section 8
- **ADRs:** `adrs/` — all architecture decision records

## Build Sequence

See `sparkmojo-internal/platform/JAMES_PROJECT_PLAN.md` Phase 2 for the exact build order and copy-paste agent prompts for each phase.

**Current phase:** 2.2 complete (repo structure). Next: 2.3 (frontend migration) and 2.4 (abstraction layer) — both unblocked.

## Branch Governance

Direct pushes to `main` trigger a Slack alert to `#alerts`. All production changes should go through a PR. See `sparkmojo-internal/runbooks/NEW_REPO_BOOTSTRAP.md` for the full governance model.

---

*Spark Mojo Platform · [sparkmojo.com](https://sparkmojo.com)*
