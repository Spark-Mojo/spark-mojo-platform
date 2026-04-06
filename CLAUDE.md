# CLAUDE.md — Spark Mojo Platform

## Before Starting — Read Governance Docs First

**Step 1:** Check `platform/HANDOFF.md` in sparkmojo-internal:
`/Users/jamesilsley/GitHub/sparkmojo-internal/platform/HANDOFF.md`
If it exists and is accurate, continue that in-progress task.
If it exists but is stale, overwrite it with current state before proceeding.

**Step 2:** Read `platform/AGENT_CONTEXT.md` in sparkmojo-internal:
`/Users/jamesilsley/GitHub/sparkmojo-internal/platform/AGENT_CONTEXT.md`
That is the master cold-start context for all agents.

**Step 3:** Read the story file for your current task:
`/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-NNN.md`
Then proceed with work in this repo.

---

Read this file completely before taking any action. This is the authoritative context document for every Claude Code session in this repository.

---

## Container Names — Critical Reference

The Frappe stack runs under `frappe-poc` Docker Compose. The correct container names are:

| Container | Name | Use for |
|-----------|------|---------|
| **Backend (bench commands)** | `frappe-poc-backend-1` | All `bench --site` commands |
| Frontend (nginx) | `frappe-poc-frontend-1` | Traefik routing only |
| Database | `frappe-poc-db-1` | Direct MariaDB access |
| Scheduler | `frappe-poc-scheduler-1` | Background jobs |
| Websocket | `frappe-poc-websocket-1` | Realtime |

**NEVER use `spark-mojo-platform-poc-frappe-1` — that container does not exist.**
The correct bench container is `frappe-poc-backend-1`.

Verify at any time: `ssh sparkmojo 'docker ps --format "{{.Names}}" | grep frappe'`

The abstraction layer and Medplum stack run under `spark-mojo-platform` Docker Compose:

| Container | Name | Use for |
|-----------|------|---------|
| **FastAPI abstraction layer** | `spark-mojo-platform-poc-api-1` | Restart after env changes: `docker restart spark-mojo-platform-poc-api-1` |
| React frontend | `spark-mojo-platform-poc-frontend-1` | Frontend container |
| Medplum server | `spark-mojo-platform-medplum-1` | FHIR server |
| Medplum Postgres | `spark-mojo-platform-medplum-postgres-1` | Medplum database |
| Medplum Redis | `spark-mojo-platform-medplum-redis-1` | Medplum cache |

Verify at any time: `ssh sparkmojo 'docker ps --format "{{.Names}}" | grep spark-mojo'`

---

## What This Repo Is

`spark-mojo-platform` is the production codebase for the Spark Mojo Platform — a unified business OS for small and mid-sized businesses. The UI is a desktop OS paradigm: draggable, resizable Mojo windows on a freeform canvas. The backend is Frappe/ERPNext with custom apps. Automation runs through n8n.

This is NOT a greenfield build. Architecture is fully designed. Your job is to execute against that design — not to make architectural decisions.

---

## Paths — Absolute References

| What | Absolute Path |
|------|---------------|
| This repo | `/Users/jamesilsley/GitHub/spark-mojo-platform/` |
| Governance repo | `/Users/jamesilsley/GitHub/sparkmojo-internal/` |
| Agent context | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/AGENT_CONTEXT.md` |
| Story files | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/` |
| Feature specs | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/` |
| Architecture decisions | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/` |
| Working agreement | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/WORKING_AGREEMENT.md` |

---

## Before Any Work — Read These

| File | What it is |
|------|------------|
| `platform/AGENT_CONTEXT.md` (governance repo) | Master cold-start context |
| `platform/WORKING_AGREEMENT.md` | Rules of engagement, architecture constants, global build rules |
| `platform/decisions/DECISION-003-abstraction-layer.md` | Abstraction layer — immutable |
| `platform/decisions/DECISION-014-sm-task-custom-doctype.md` | SM Task is custom DocType, NOT ERPNext Task extension |
| `platform/decisions/DECISION-015-design-system.md` | Design system architecture |
| `platform/feature-library/TASK-WORKBOARD.md` | Full Task & Workboard feature spec |
| `platform/feature-library/stories/STORY-NNN.md` | Individual story spec for current work |

---

## Repo Structure

```
spark-mojo-platform/
├── CLAUDE.md                        # This file — read first every session
├── PROMPT.md                        # Current overnight task queue
├── hats.yml                         # Ralph workflow
├── frontend/                        # React app (Vite + React 18, JSX, pnpm)
│   ├── src/
│   │   ├── api/
│   │   │   └── frappe-client.js     # Frappe REST client — DO NOT MODIFY
│   │   ├── components/
│   │   │   ├── mojos/               # NEW Mojo components go here
│   │   │   ├── mojo-patterns/       # Spark Mojo composite patterns
│   │   │   ├── ui/                  # shadcn/Radix UI primitives
│   │   │   └── [legacy folders]     # Pre-migration — do not touch
│   │   ├── pages/
│   │   │   └── Desktop.jsx          # Desktop canvas — DO NOT MODIFY STRUCTURE
│   │   ├── styles/
│   │   │   └── tokens.css           # Design tokens
│   │   └── types/                   # Static TS type files — reference only
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── abstraction-layer/               # Mojo Abstraction Layer (Python FastAPI)
│   ├── main.py
│   ├── auth.py
│   ├── routes/
│   └── tests/
├── frappe-apps/                     # Frappe custom apps
│   ├── sm_connectors/
│   ├── sm_widgets/                  # SM Task DocType lives here
│   ├── sm_billing/
│   └── sm_provisioning/
└── scripts/
    ├── smoke_test.sh                # 16-check smoke test across all 4 sites
    └── docker-cleanup.sh            # Weekly Docker disk maintenance (cron: Sunday 3am)
```

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18, JSX (not TypeScript), pnpm |
| Styling | Tailwind CSS + shadcn/Radix UI |
| Backend | Frappe/ERPNext — site-per-client multi-tenancy |
| Abstraction Layer | Python FastAPI — uvicorn |
| Automation | n8n (cross-system), Frappe Server Scripts (internal) |

**Frontend is JSX, not TypeScript.** Do not create `.tsx` or `.ts` files.

---

## Key Commands

```bash
# Frontend — run from frontend/
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:coverage

# Abstraction layer — run from abstraction-layer/
uvicorn main:app --reload
pytest tests/ -v
pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70

# Frappe bench — ALWAYS use frappe-poc-backend-1
ssh sparkmojo "docker exec frappe-poc-backend-1 bench --site poc-dev.sparkmojo.com migrate"
ssh sparkmojo "docker exec frappe-poc-backend-1 bench --site poc-dev.sparkmojo.com console"
ssh sparkmojo "docker exec frappe-poc-backend-1 bench list-sites"

# POC deployment
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
```

---

## Three-Site Topology — Live Sites

| Site | Subdomain | Type | Frappe site name |
|------|-----------|------|------------------|
| Admin Console | admin.sparkmojo.com | admin | admin.sparkmojo.com |
| POC/Dev | poc-dev.app.sparkmojo.com | dev | poc-dev.sparkmojo.com |
| SM Internal | internal.app.sparkmojo.com | internal | internal.sparkmojo.com |
| Willow Center | willow.app.sparkmojo.com | behavioral_health | willow.sparkmojo.com |

**Legacy access:** `poc.sparkmojo.com` (Frappe Desk), `app.poc.sparkmojo.com` (React) — both preserved.

**Frappe site name = hostname** (not `frontend` anymore). `FRAPPE_SITE_NAME_HEADER: $$host` in pwd.yml.

**Frappe Desk login:** `Administrator` + site admin password from Bitwarden.
Navigate to `/app` after login — the setup wizard is suppressed on all sites via Phase 5d.

---

## Deployment — Always Deploy to Production

**After every code change, deploy to the POC VPS.**

### If SSH is available:

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
```

For frontend-only changes:
```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh --phase 6'
```

After deploying, verify:
```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh --verify-only'
```

### If SSH is NOT available:

Tell the user clearly: **"This change is committed and pushed but NOT deployed. Run on VPS:"**
```
ssh sparkmojo
cd /home/ops/spark-mojo-platform
git pull origin main
./deploy.sh
```

### deploy.sh phases

| Phase | Name | What it does |
|-------|------|-------------|
| 0 | Pre-flight | Verify directory, Docker, Frappe running |
| 1 | Pull | `git pull origin main` |
| 2 | Sync frappe-apps | docker cp + pip install into Frappe containers |
| 3 | Migrate | `bench --site [all sites] migrate` via SM Site Registry loop |
| 4 | Restart | Restart Frappe backend + workers |
| 5 | Abstraction layer | Build + restart poc-api |
| 6 | Frontend | Build + restart poc-frontend |
| 7 | Verification | End-to-end checks |

---

## VPS Deployment Rules

1. **NEVER modify files directly on the VPS.** All changes go through git.
2. **The VPS must always be a clean checkout of main.**
3. **deploy.sh is the ONLY way code gets onto the VPS.**
4. **If you SSH in and modify ANY file**, commit and push before ending the session.
5. **After pushing changes, always run deploy.sh.**

---

## Known Gotchas

- **Frappe site names are now hostnames** — `poc-dev.sparkmojo.com`, `admin.sparkmojo.com`, etc. The old `frontend` site name no longer exists. `FRAPPE_SITE_NAME_HEADER: $$host` in pwd.yml means Frappe uses the Host header to select the site.
- **Bench container is `frappe-poc-backend-1`** — NOT `spark-mojo-platform-poc-frappe-1`. The wrong name will give "No such container" errors.
- **Setup wizard must be suppressed on every new site** — run `frappe.db.set_single_value('System Settings', 'setup_complete', 1)` in bench execute. Without this, ALL URLs including `/app` redirect to the setup wizard. There is no skip button. See PROVISIONING_RUNBOOK.md Phase 5d.
- **HostRegexp rules do NOT trigger ACME cert issuance** — every subdomain needs an explicit `Host()` rule in `docker-compose.poc.yml` for Let's Encrypt to issue a cert. Certs will not issue for wildcard/regex rules regardless of how long you wait.
- **SM Task `canonical_state`** maps to "Status" in the Frappe UI.
- **Non-installable apps in apps.txt** cause `ModuleNotFoundError` and total Frappe outage.
- **Alpine-based containers** need `sh -c` wrapper for glob expansion in `docker exec`.
- **Phase 7 `<div id="root">` check is a false positive.** Grep for unique string literals instead.
- **Ecosystem apps MUST be in the Docker image** — `bench get-app` on the VPS only installs into the backend container. Workers don't get it. Next container recreation = crash loop. All ecosystem apps go in `Dockerfile.frappe`. See DECISION-021.
- **Medplum docker compose MUST use `--env-file .env.poc`** — Docker compose defaults to `.env`, not `.env.poc`. Without `--env-file .env.poc`, all `${MEDPLUM_DB_PASSWORD}` and `${MEDPLUM_REDIS_PASSWORD}` vars are blank and Medplum fails silently. Always use: `docker compose -f docker-compose.poc.yml --env-file .env.poc up -d`
- **`.env.poc` canonical location is `/home/ops/spark-mojo-platform/.env.poc`** — The correct path on the VPS is `/home/ops/spark-mojo-platform/.env.poc`. The path `/home/ops/frappe-poc/.env.poc` does not exist. Any story verification step or doc referencing the old path is wrong. When using `--env-file .env.poc` in deploy commands, always run from `/home/ops/spark-mojo-platform/`.
- **Medplum v5.x ignores env vars for database/redis config** — `MEDPLUM_DATABASE_HOST` and similar env vars in docker-compose are NOT sufficient for v5.x. The `medplum/medplum.config.json` file on the VPS MUST contain the `database` and `redis` sections with actual values. The committed `medplum.config.json.example` is the template — the live file is in `.gitignore` because it holds passwords. When rotating passwords (J-014), update both `.env.poc` AND `medplum/medplum.config.json` on the VPS, then `docker restart spark-mojo-platform-medplum-1`.
- **Medplum healthcheck uses node, not curl** — the medplum-server image does not include curl. Use: `node -e "require('http').get('http://localhost:8103/healthcheck', r => { process.exit(r.statusCode === 200 ? 0 : 1) })"` inside the container.
- **Docker disk fills up over time** — build cache and old images accumulate. Run `scripts/docker-cleanup.sh` weekly or after heavy build sessions. A weekly cron is set up on the VPS (Sunday 3am). If disk exceeds 80%, run with `--aggressive` flag.
- **After `docker compose down/up`, restart the frontend container last** — `sudo docker restart frappe-poc-frontend-1`. Nginx caches the backend container's IP at startup. If the backend gets a new IP after recreation, nginx sends traffic to the old IP (502 Bad Gateway). A frontend restart forces DNS re-resolution.
- **`deploy.sh --verify-only` shows 5/6 on admin — this is expected** — The abstraction layer `tasks/list` check fails on `admin.sparkmojo.com` because SM Task DocType is not installed on the admin site (admin only has erpnext + sm_provisioning). 5/6 is a passing result for the admin site.
- **Routing: Modules vs Webhooks vs Frappe Desk — three distinct host rules in the POC environment. Do not mix them up in test commands or verification steps:**
  - `poc-dev.sparkmojo.com` — Frappe Desk only. No `/api/modules/` or `/api/webhooks/` routing. Those paths fall through to Frappe and will return `{"exc_type":"DoesNotExistError"}` — not the FastAPI response you expect.
  - `poc-dev.app.sparkmojo.com` — Abstraction layer module routes only. Use for: `GET/POST /api/modules/billing/...`, `GET /api/modules/provisioning/...`
  - `api.poc.sparkmojo.com` — Webhook routes only. Use for: `POST /api/webhooks/stedi/835`, `POST /api/webhooks/...`
  Always use the correct host in test commands and story verification steps. Using `poc-dev.sparkmojo.com` for API module calls is a silent failure — you get a Frappe error instead of a 401/422 from the app.

---

## Ralph Orchestrator Rules

- Every story **MUST** include a smoke test step.
- After merging feature branches, **always trigger a deploy**.
- Never mark a story complete if the feature is unreachable from the UI.
- **MANDATORY: After building and committing a code story to its feature branch, always run:** `git push origin <branch-name>` Feature branches must exist on GitHub origin, not only on the local machine. Failure to push means the VPS cannot access the branch and the branch is at risk of being lost.
- **Design system verification** on any story touching `frontend/src/`:
  - No hardcoded hex colors
  - Every new component in Library.jsx
  - COMPONENT_INVENTORY.md updated
  - All `var(--sm-*)` references resolve
  - `npm run build` succeeds

---

## Verifying Production Bundles

Vite minifies component names. Never grep for React component names — grep for unique string literals:

```bash
# Wrong
grep -c "WorkboardMojo" /usr/share/nginx/html/assets/index-*.js

# Right
grep -c "api/modules/tasks" /usr/share/nginx/html/assets/index-*.js
```

---

## Definition of Done

**Frappe DocType stories:**
1. `bench --site [site] migrate` — exit 0
2. All fields visible in Frappe Desk
3. Controller hooks verified in bench console

**Python API stories:**
1. `pytest tests/ -v` — 0 failures
2. Coverage >= 70%
3. Health endpoint responds

**React Frontend stories:**
1. `pnpm run lint` — 0 warnings, 0 errors
2. `pnpm run test` — 0 failures
3. `pnpm run build` — succeeds
4. Design system pre-commit checklist passes

Never emit `LOOP_COMPLETE` without running every gate.

---

## Architecture — Immutable Rules

1. **React NEVER calls Frappe directly.** Always via `/api/modules/[capability]/[action]`.
2. **Never use `frappe.db.set_value()`.** Always `frappe.get_doc("DocType", name).save()`.
3. **Custom logic lives in SM custom apps only.**
4. **All SM DocTypes prefixed `SM`.** SM Task goes in `sm_widgets`.
5. **SM Task is a custom DocType — NOT ERPNext Task extension.** See DECISION-014.
6. **All custom API endpoints use `@frappe.whitelist()` decorator.**
7. **Always run `bench migrate` after any DocType change.**
8. **n8n handles all cross-system operations.**
9. **Background jobs use `frappe.enqueue()`.** Never Python threading.
10. **New Mojo components go in `frontend/src/components/mojos/` only.**
11. **Never run `bench install-app` or `bench get-app` without explicit story instruction.**
    These add to `sites/apps.txt` which imports `{app}.hooks` on every request.
    If the Python package isn't available → total Frappe outage.
    **Instead:** Register in `tabInstalled Application` via MariaDB only.
12. **`apps.txt` vs `tabInstalled Application`:**
    - `apps.txt` → Frappe imports at startup. App MUST be pip-installed. Adding without pip install = outage.
    - `tabInstalled Application` → database record for module routing. Safe via MariaDB INSERT.
    - SM custom apps deployed via `docker cp`: add to `tabInstalled Application` only.
13. **Custom Frappe app directory structure requires extra module subfolder:**
    `frappe-apps/{app}/{app}/{module_folder}/doctype/`
    NOT `frappe-apps/{app}/{app}/doctype/`
14. **Use `deploy.sh` for all deployments — never deploy manually.**
15. **Docker `--no-cache` builds change the Vite bundle filename hash.**
    `deploy.sh` handles this automatically (Phase 6 verifies hash sync).
16. **/api/modules/ routing requires Traefik priority rule.**
    The abstraction layer must have higher priority than Frappe's `/api/` catch-all.
    If `/api/modules/tasks/list` returns a Frappe error, the Traefik priority rule is missing.
17. **`frappe-apps/` is not volume-mounted in the POC — this is intentional.**
    Do not attempt to fix this without reading DEPLOY.md.
18. **Setup wizard must be suppressed on every new site** — see Known Gotchas.
19. **HostRegexp rules do NOT trigger ACME cert issuance** — see Known Gotchas.
20. **Two-track app management (DECISION-021):**
    - Ecosystem apps (`telephony`, `crm`, `helpdesk`, `lms`, `wiki`, `hrms`, `healthcare`/marley, `payments`) are managed EXCLUSIVELY via `Dockerfile.frappe`. NEVER run `bench get-app` on the VPS for these.
    - SM custom apps (`sm_widgets`, `sm_connectors`, `sm_provisioning`, `sm_billing`) are managed EXCLUSIVELY via `deploy.sh` Phase 2.
    - Adding a new ecosystem app = update `Dockerfile.frappe` + rebuild image. Adding a new SM app = add to `frappe-apps/` + run `deploy.sh`.

---

## New DocType / Module Pattern

Required directory structure:
```
frappe-apps/{app_name}/
├── pyproject.toml
└── {app_name}/
    ├── __init__.py         # MUST contain __version__ = "x.y.z"
    ├── hooks.py
    ├── modules.txt
    └── {module_folder}/    # snake_case of module name
        ├── __init__.py
        └── doctype/
            ├── __init__.py
            └── {doctype_folder}/
                ├── __init__.py
                ├── {doctype_name}.json
                └── {doctype_name}.py
```

Checklist:
1. Module folder exists and matches snake_case of module name in `modules.txt`
2. Every directory has an `__init__.py`
3. JSON `"module"` field matches title in `modules.txt`
4. Child table DocTypes go in the same module folder

---

## New Capability Router Pattern

1. Create `abstraction-layer/routes/[capability].py`
2. Define `APIRouter` with prefix `/api/modules/[capability]`
3. Register in `main.py`: `app.include_router([capability]_router)`
4. Follow pattern in `abstraction-layer/routes/onboarding.py`

---

## New Mojo Component Pattern

1. Create `frontend/src/components/mojos/[Name]Mojo.jsx`
2. Default export: `export default function [Name]Mojo() {}`
3. All data via abstraction layer — never direct Frappe calls
4. Check /library page before building any UI
5. Use `var(--sm-*)` tokens — NEVER hardcode hex
6. Register in Mojo registry
7. Add cross-links: feature spec → stories → MOJO_REGISTRY

---

## Brand Tokens

| Semantic Token | Role |
|----------------|------|
| `--sm-primary` | Primary actions, active states, avatars |
| `--sm-danger` | Warnings, urgent states, errors |
| `--sm-warning` | Medium priority, pending, review |
| `--sm-slate` | Text, headers |
| `--sm-offwhite` | Page background |

---

## Do Not Touch

- `frontend/src/pages/Desktop.jsx` — immutable structure
- `frontend/src/pages/index.jsx` — protect core routing structure only
- `frontend/src/api/frappe-client.js` — load-bearing, do not modify
- `frontend/src/types/` — static reference files
- All legacy component folders
- `sites/apps.txt` on the bench
- Core Frappe or ERPNext source

---

## When Ambiguous

- Check story spec file first
- Check `platform/feature-library/TASK-WORKBOARD.md`
- Check `platform/decisions/`
- **Write `BLOCKED-[STORY-NNN].md` and stop** — never improvise on architecture

---

## Git Workflow

### Commit prefixes
`feat:` / `chore:` / `fix:` / `docs:` / `test:`

### When to use PRs vs direct commits

| Change type | Workflow |
|-------------|----------|
| Story / feature work | PR on feature branch |
| Bug fixes to app code | PR on feature branch |
| Deploy/infra fixes | Direct to main |
| Docs / CLAUDE.md | Direct to main |

---

## Design System — Rules and Governance

**Decision:** DECISION-015
**Light mode is the default.** Dark mode via `[data-theme="dark"]`.

### Component Architecture
```
src/components/
├── ui/              ← shadcn/ui base components
├── charts/          ← shadcn/ui chart components
├── magicui/         ← Magic UI animation accents
├── mojo-patterns/   ← Spark Mojo composite patterns
└── mojos/           ← Individual mojo implementations
```

### Token Usage — MANDATORY
- **NEVER hardcode hex colors**
- **NEVER use Tailwind color classes**
- **NEVER use opacity variants for visibility**
- **ALL new colors MUST be added as tokens first**

### Pre-Commit Checklist
- [ ] No hardcoded hex colors
- [ ] No new Tailwind color classes
- [ ] Any new component is in /library
- [ ] COMPONENT_INVENTORY.md updated
- [ ] Build passes

---

*Last updated: April 6, 2026 — Session 26. .env.poc canonical path clarified. Mandatory git push origin rule added to Ralph Orchestrator Rules. Previous: Session 25 — Abstraction layer + Medplum container names added to reference table. Routing gotcha added (modules vs webhooks vs Frappe Desk).*
