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

## VPS Container Execution — Canonical Patterns

### CORRECT pattern for Frappe bench commands:
```bash
ssh sparkmojo 'docker exec frappe-poc-backend-1 bash -c "cd /home/frappe/frappe-bench && bench --site poc-dev.sparkmojo.com <command>"'
```

### NEVER use these patterns (they fail):
```
# WRONG - frappe-poc is not a service in docker-compose.poc.yml
docker compose -f docker-compose.poc.yml exec -T frappe-poc bash -c "..."

# WRONG - --list-sites flag does not exist
bench --list-sites

# WRONG - internal.localhost does not exist as a site
bench --site internal.localhost ...
```

### Site inventory (as of Session 43):
- **poc-dev.sparkmojo.com** — kitchen sink, ALL apps installed, sm_billing lives here. Use this for all sm_billing commands.
- **internal.sparkmojo.com** — Spark Mojo's own future client site, selective installs
- **willow.sparkmojo.com** — Willow Center client site
- **admin.sparkmojo.com** — admin site
- To list sites: `ssh sparkmojo 'ls /home/frappe/frappe-bench/sites/'`

### Test runner pre-flight (required before any bench run-tests):
1. Install pytest if not present:
   ```bash
   ssh sparkmojo 'docker exec frappe-poc-backend-1 bash -c "cd /home/frappe/frappe-bench && ./env/bin/pip install pytest"'
   ```
2. Enable tests on the site:
   ```bash
   ssh sparkmojo 'docker exec frappe-poc-backend-1 bash -c "cd /home/frappe/frappe-bench && bench --site poc-dev.sparkmojo.com set-config allow_tests true"'
   ```

### Frappe bench execute module path format:
```
Use: {python_package}.{frappe_module}.{filename}.{function_name}
The outer app directory (e.g. sm_billing/) is NOT part of the import path.

CORRECT: sm_billing.sm_billing.appeal_letter_generator.generate_appeal_letter
WRONG:   sm_billing.sm_billing.sm_billing.appeal_letter_generator.generate_appeal_letter
```



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

## VPS Branch Gotcha — CRITICAL
deploy.sh does NOT switch branches. If the VPS is on a feature branch,
deploy.sh will pull and rebuild that branch, not main.

Always verify before deploying:
  ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git branch --show-current'
Must show: main

If not on main:
  ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git checkout main && git pull origin main'
Then run deploy.sh.

The VPS was found on story/bill-009-state-log-doctype in Session 41,
having silently deployed the wrong branch for multiple sessions.
Consider adding `git checkout main` as the first line of deploy.sh.

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
- **Runtime secrets live in Infisical, not on disk** (SEC-003/SEC-004, DECISION-031) — `.env.poc` has been retired. `deploy.sh` Phase 0.5 runs `scripts/infisical-fetch.sh` which pulls every secret from the configured Infisical projects (`sm-platform-shared`, `sm-willow` — env `prod`) into `/home/ops/spark-mojo-platform/secrets/<lowercase_name>` (0600, dir 0700). Containers mount those files via Compose `secrets:` blocks at `/run/secrets/<name>`. Python reads via `read_secret()` (`abstraction-layer/secrets_loader.py`); Medplum reads from a generated `medplum/medplum.config.json` rendered at deploy time. Never edit `secrets/*` by hand. Never `os.getenv` for real secrets.
- **Non-secret runtime config is `/home/ops/spark-mojo-platform/config.prod.env`** (SEC-004) — URLs, public OAuth client IDs, feature flags, infra pointers. 0600 ops:ops. Gitignored (host-local). `docker-compose.app.yml` loads it via `env_file:` for `poc-api`. `deploy.sh` Phase 5/6 passes it via `--env-file config.prod.env` to `docker compose`. Do NOT put secrets in this file — Infisical is the source of truth.
- **Medplum compose variable substitution uses shell env, not a file** — `docker-compose.medplum.yml` references `${MEDPLUM_DB_PASSWORD}` / `${MEDPLUM_REDIS_PASSWORD}` for Postgres and Redis container config. When you have to restart Medplum manually (rare — `deploy.sh` does not touch it), export from `secrets/` first: `MEDPLUM_DB_PASSWORD=$(<secrets/medplum_db_password) MEDPLUM_REDIS_PASSWORD=$(<secrets/medplum_redis_password) sudo -E docker compose -f docker-compose.medplum.yml up -d`. The monthly sync cron (`scripts/rotate-secrets.sh`) already does this. The old `--env-file .env.poc` pattern no longer works — `.env.poc` is retired.
- **Infisical Universal Auth credentials on the VPS** — `/home/ops/.infisical-ua-client-id` + `/home/ops/.infisical-ua-client-secret` (both 0600 ops:ops). Non-secret project IDs + environment live in `/etc/default/spark-mojo` (0644 root:root). Rotate the Client Secret every 90 days — see `docs/ops/secret-rotation-runbook.md` section 4.
- **The retired `.env.poc` is archived, not forgotten** — encrypted symmetric GPG at `/home/ops/backups/env-poc-archive-YYYYMMDD.gpg`. GPG passphrase in Bitwarden under `VPS .env.poc archive — YYYY-MM-DD`. Keep the archive indefinitely for compliance; it is NOT a hot backup (Infisical is the live source of truth).
- **Medplum v5.x ignores env vars for database/redis config** — `MEDPLUM_DATABASE_HOST` and similar env vars in docker-compose are NOT sufficient for v5.x. The `medplum/medplum.config.json` file on the VPS MUST contain the `database` and `redis` sections with actual values. The committed `medplum.config.json.example` is the template (uses `${DB_PASSWORD}` / `${REDIS_PASSWORD}` placeholders); the live file is gitignored and is regenerated at deploy time by `scripts/render-medplum-config.sh` (Phase 2.5) from `secrets/medplum_db_password` and `secrets/medplum_redis_password` (fetched from Infisical in Phase 0.5). To rotate a Medplum password: update Infisical, run `scripts/rotate-secrets.sh` (which re-renders the config and force-recreates Medplum containers). Never hand-edit `medplum.config.json`.
- **Medplum healthcheck uses node, not curl** — the medplum-server image does not include curl. Use: `node -e "require('http').get('http://localhost:8103/healthcheck', r => { process.exit(r.statusCode === 200 ? 0 : 1) })"` inside the container.
- **Docker disk fills up over time** — build cache and old images accumulate. Run `scripts/docker-cleanup.sh` weekly or after heavy build sessions. A weekly cron is set up on the VPS (Sunday 3am). If disk exceeds 80%, run with `--aggressive` flag.
- **After `docker compose down/up`, restart the frontend container last** — `sudo docker restart frappe-poc-frontend-1`. Nginx caches the backend container's IP at startup. If the backend gets a new IP after recreation, nginx sends traffic to the old IP (502 Bad Gateway). A frontend restart forces DNS re-resolution.
- **`deploy.sh --verify-only` shows 5/6 on admin - this is expected** — The abstraction layer `tasks/list` check fails on `admin.sparkmojo.com` because SM Task DocType is not installed on the admin site (admin only has erpnext + sm_provisioning). 5/6 is a passing result for the admin site.
- **docker compose restart requires the -f flag on the VPS** — The VPS uses a non-default compose file. Always specify the file explicitly: `docker compose -f /home/ops/spark-mojo-platform/docker-compose.poc.yml restart poc-api`. Running `docker compose restart poc-api` without the -f flag will fail with 'no such service' because docker compose cannot find the service without knowing which compose file to use.
- **Always use deploy.sh for deploys - never docker compose restart as a substitute** — docker compose restart skips the full deploy cycle. It does not run bench migrate, does not run Phase 0.5 (Infisical fetch), does not run Phase 7 end-to-end verification checks, and does not update SM apps. Always deploy using: `cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh`. The only valid exception is restarting a container after a `config.prod.env` change where no code changed. Even then, prefer deploy.sh.
- **Routing: Modules vs Webhooks vs Frappe Desk - three distinct host rules in the POC environment. Do not mix them up in test commands or verification steps:**
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
17. **`frappe-apps/` is not volume-mounted in the POC - this is intentional.**
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

*Last updated: April 21, 2026 — SEC-003 / SEC-004. Infisical is now the source of truth for runtime secrets; `.env.poc` retired (archived at `/home/ops/backups/env-poc-archive-20260421.gpg`). Non-secret runtime config moved to `config.prod.env`. Monthly Infisical sync cron installed. See `docs/ops/secret-rotation-runbook.md`.*
