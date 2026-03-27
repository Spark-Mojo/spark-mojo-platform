# CLAUDE.md — Spark Mojo Platform

Read this file completely before taking any action. This is the authoritative context document for every Claude Code session in this repository.

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
| Story files | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/` |
| Feature specs | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/` |
| Architecture decisions | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/` |
| Working agreement | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/WORKING_AGREEMENT.md` |

---

## Before Any Work — Read These

| File | What it is |
|------|------------|
| `platform/WORKING_AGREEMENT.md` | Rules of engagement, architecture constants, global build rules |
| `platform/decisions/DECISION-003-abstraction-layer.md` | Abstraction layer — immutable |
| `platform/decisions/DECISION-014-sm-task-custom-doctype.md` | SM Task is custom DocType, NOT ERPNext Task extension |
| `platform/feature-library/TASK-WORKBOARD.md` | Full Task & Workboard feature spec and schema |
| `platform/feature-library/stories/STORY-NNN.md` | Individual story spec for current work |

---

## Repo Structure

```
spark-mojo-platform/
├── CLAUDE.md                        # This file — read first every session
├── PROMPT.md                        # Current overnight task queue
├── hats.yml                         # Ralph workflow — run with: ralph run --config hats.yml
├── frontend/                        # React app (Vite + React 18, JSX, pnpm)
│   ├── src/
│   │   ├── api/
│   │   │   └── frappe-client.js     # Frappe REST client — DO NOT MODIFY
│   │   ├── components/
│   │   │   ├── mojos/               # NEW Mojo components go here
│   │   │   ├── ui/                  # shadcn/Radix UI primitives
│   │   │   └── [legacy folders]     # Pre-migration — do not touch
│   │   ├── pages/
│   │   │   └── Desktop.jsx          # Desktop canvas — DO NOT MODIFY STRUCTURE
│   │   └── types/                   # Static TS type files — reference only
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── abstraction-layer/               # Mojo Abstraction Layer (Python FastAPI)
│   ├── main.py                      # FastAPI app, router registration
│   ├── auth.py                      # Session validation
│   ├── routes/                      # Capability routers — one file per capability
│   │   └── onboarding.py            # Pattern to follow for new routers
│   ├── tests/                       # pytest tests
│   └── requirements.txt
├── frappe-apps/                     # Frappe custom apps
│   ├── sm_connectors/               # Canonical DocTypes
│   ├── sm_widgets/                  # SM Task DocType lives here
│   ├── sm_billing/
│   └── sm_provisioning/
└── scripts/
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

**Frontend is JSX, not TypeScript.** Do not create `.tsx` or `.ts` files. Do not install TypeScript.

---

## Key Commands

```bash
# Frontend — run from frontend/
pnpm install
pnpm run dev
pnpm run build
pnpm run lint                         # Must pass with 0 warnings, 0 errors
pnpm run test
pnpm run test:coverage

# Abstraction layer — run from abstraction-layer/
uvicorn main:app --reload
pytest tests/ -v
pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70

# Frappe — run from Frappe bench root (NOT from this repo)
bench --site poc.sparkmojo.com migrate          # ALWAYS after any DocType change
bench --site poc.sparkmojo.com console          # Interactive testing

# POC deployment — run on server via ssh sparkmojo
cd /home/ops/spark-mojo-platform && git pull
sudo docker compose -f docker-compose.poc.yml build --no-cache poc-frontend   # frontend rebuild
sudo docker compose -f docker-compose.poc.yml up -d poc-frontend              # restart frontend
sudo docker compose -f docker-compose.poc.yml up -d poc-api                   # restart API
# IMPORTANT: `up -d` must be a SINGLE LINE. If `-d` wraps to a new line the
# shell runs `up` in attached mode and containers stop when the session ends.
```

---

## Verifying Production Bundles

Vite minifies all component and function names in production builds. **Never grep
for a React component name** (e.g. `WorkboardMojo`) to verify it is in the bundle —
the name will not survive minification.

Instead, grep for **unique string literals** that the component defines:
- API URL paths (e.g. `api/modules/tasks`)
- localStorage keys (e.g. `workboard_sort_preference`)
- Hard-coded display strings

```bash
# Wrong — will always return 0
grep -c "WorkboardMojo" /usr/share/nginx/html/assets/index-*.js

# Right — checks for a string literal the component must contain
grep -c "api/modules/tasks" /usr/share/nginx/html/assets/index-*.js
```

---

## Definition of Done

A story is ONLY complete when ALL gates for its type pass:

**Frappe DocType stories:**
1. `bench --site poc.sparkmojo.com migrate` — exit 0
2. All fields from story spec visible in Frappe Desk
3. Controller hooks verified in bench console

**Python API stories:**
1. `pytest tests/ -v` — 0 failures
2. Coverage >= 70%
3. Health endpoint responds

**React Frontend stories:**
1. `pnpm run lint` — 0 warnings, 0 errors
2. `pnpm run test` — 0 failures
3. `pnpm run build` — succeeds

Never emit `LOOP_COMPLETE` or mark a task done without running every gate.

---

## Architecture — Immutable Rules

1. **React NEVER calls Frappe directly.** Always via `/api/modules/[capability]/[action]`.
2. **Never use `frappe.db.set_value()`.** Always `frappe.get_doc("DocType", name).save()`.
3. **Custom logic lives in SM custom apps only.** Never modify core Frappe or ERPNext.
4. **All SM DocTypes prefixed `SM`.** SM Task goes in `sm_widgets`.
5. **SM Task is a custom DocType — NOT ERPNext Task extension.** See DECISION-014.
6. **All custom API endpoints use `@frappe.whitelist()` decorator.**
7. **Always run `bench migrate` after any DocType change.**
8. **n8n handles all cross-system operations.**
9. **Background jobs use `frappe.enqueue()`.** Never Python threading.
10. **New Mojo components go in `frontend/src/components/mojos/` only.**
11. **Never run `bench install-app` or `bench get-app` without explicit story instruction.**
    These commands add the app to `sites/apps.txt`, which makes Frappe try to
    `import {app}.hooks` on every gunicorn request. If the Python package isn't
    available to all worker processes, the entire Frappe Desk goes down with
    `ModuleNotFoundError` — no partial failure, total outage.
    History: `frappe_types` crashed the scheduler; `sm_widgets` crashed all of Desk.
    **Instead:** Create DocType files directly in existing apps. If a new app is
    truly needed, register it in `tabInstalled Application` via MariaDB only —
    never in `apps.txt`.
12. **`apps.txt` vs `tabInstalled Application` — know the difference.**
    - `apps.txt` → Frappe imports `{app}.hooks` at startup. App MUST be pip-installed
      in the bench venv. Adding an entry here without a working Python package = total outage.
    - `tabInstalled Application` → database record for module routing and DocType discovery.
      Safe to add via MariaDB INSERT. Does NOT trigger Python imports.
    - For SM custom apps deployed via `docker cp`: add to `tabInstalled Application` only.
      Never add to `apps.txt` unless the app is pip-installed in all Frappe containers.
13. **Custom Frappe app directory structure must have an extra module subfolder.**
    Frappe expects: `frappe-apps/{app}/{app}/{module_folder}/doctype/`
    NOT: `frappe-apps/{app}/{app}/doctype/`
    The module subfolder (same name as the app) must exist between the app
    root and the doctype folder. If it's missing, `bench migrate` runs silently
    and creates no DocTypes. This burned 6+ hours on 2026-03-26.
    Before creating any new DocType in a custom app, verify the directory
    structure matches the pattern above. The sm_widgets fix is in commit 7ad311e.
14. **Use `deploy.sh` for all deployments — never deploy manually.**
    A `deploy.sh` script exists in the repo root. It must be used for all
    deployments. It handles: git pull, sm_widgets sync (apps.txt +
    tabInstalled Application + pip install), bench migrate, Docker rebuilds
    with `--no-cache`, and post-deploy verification.
    Never execute deployment steps manually — the manual process is what
    caused the 18-hour incident on 2026-03-26.
    If `deploy.sh` doesn't exist yet, create it before deploying. The spec
    for `deploy.sh` is in DEPLOY.md.
15. **Docker `--no-cache` builds change the Vite bundle filename hash.**
    When rebuilding the frontend with `--no-cache`, Vite generates a new
    content-hash filename (e.g. `index-BeuH284U.js` → `index-XxYzAb12.js`).
    If nginx continues serving the old `index.html`, the app loads as a blank
    page with no `<div id="root">`.
    `deploy.sh` handles this automatically (Phase 6 verifies hash sync).
    If you ever rebuild the frontend outside of `deploy.sh`, manually verify:
    `docker exec {frontend-container} grep -o 'assets/index-[^"]*\.js' /usr/share/nginx/html/index.html`
    `docker exec {frontend-container} ls /usr/share/nginx/html/assets/*.js`
    Both must reference the same filename.
16. **/api/modules/ routing requires Traefik priority rule.**
    The Mojo Abstraction Layer serves all routes under `/api/modules/`.
    Frappe has a catch-all rule for `/api/` that intercepts these routes
    unless Traefik gives the abstraction layer a higher priority.
    If `/api/modules/tasks/list` returns a Frappe `DoesNotExistError`, the
    Traefik priority rule is missing or wrong — not a code bug.
    This is the same class of issue fixed in commit 5e22e49d for `/health`.
    `deploy.sh` Phase 7 Check 4 verifies this explicitly on every deploy.
17. **`frappe-apps/` is not volume-mounted in the POC — this is intentional.**
    The Frappe Docker container does not have `frappe-apps/` volume-mounted.
    This is a known POC trade-off. The fix (volume mount) is in the
    `deploy.sh` upgrade task. The production fix is Frappe Press (Phase 5).
    Do not attempt to "fix" this by modifying the `frappe-poc` docker-compose.yml
    without reading DEPLOY.md first and understanding the full deployment flow.

---

## New DocType / Module Pattern

Frappe discovers DocTypes by walking `apps/{app}/{package}/{module_folder}/doctype/`.
**The module folder is a subdirectory inside the package**, named as the snake_case
of the module title in `modules.txt`. Getting this nesting wrong causes `bench migrate`
to silently skip every DocType with no error.

Required directory structure for a custom app:

```
frappe-apps/{app_name}/                         # app root
├── pyproject.toml                              # flit build config
└── {app_name}/                                 # Python package
    ├── __init__.py                             # MUST contain __version__ = "x.y.z"
    ├── hooks.py                                # app_name, app_title, etc.
    ├── modules.txt                             # one module name per line
    └── {module_folder}/                        # snake_case of module name
        ├── __init__.py                         # can be empty
        └── doctype/
            ├── __init__.py
            └── {doctype_folder}/               # snake_case of DocType name
                ├── __init__.py
                ├── {doctype_name}.json          # DocType schema
                └── {doctype_name}.py            # controller
```

Example: app `sm_widgets`, module "SM Widgets", DocType "SM Task":

```
frappe-apps/sm_widgets/
├── pyproject.toml
└── sm_widgets/
    ├── __init__.py          # __version__ = "0.1.0"
    ├── hooks.py
    ├── modules.txt          # "SM Widgets"
    └── sm_widgets/          # ← module folder matches "SM Widgets"
        ├── __init__.py
        └── doctype/
            └── sm_task/
                ├── __init__.py
                ├── sm_task.json
                └── sm_task.py
```

**Checklist for every new DocType:**
1. Module folder exists and matches the snake_case of the module name in `modules.txt`
2. Every directory in the path has an `__init__.py`
3. JSON `"module"` field matches the exact title in `modules.txt` (e.g. `"SM Widgets"`)
4. Child table DocTypes go in the same module folder alongside the parent

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
4. Use `frontend/src/components/ui/` primitives
5. Use brand tokens — never hardcode colors
6. Register in Mojo registry

---

## Brand Tokens

| Token | Value |
|-------|-------|
| Primary Teal | `#006666` |
| Coral (CTA) | `#FF6F61` |
| Gold | `#FFB300` |
| Slate | `#34424A` |
| Off-white | `#F8F9FA` |

Use CSS variables `var(--color-primary)` for runtime theming. Never hardcode hex.

---

## Do Not Touch

- `frontend/src/pages/Desktop.jsx` — immutable structure
- `frontend/src/api/frappe-client.js` — load-bearing, do not modify
- `frontend/src/types/` — static reference files
- All legacy component folders (cash/, pos/, quickrepairs/, workorder/, technicians/, orders/, inventory/)
- `sites/apps.txt` on the bench
- Core Frappe or ERPNext source

---

## When Ambiguous

- Check story spec file first
- Check `platform/feature-library/TASK-WORKBOARD.md`
- Check `platform/decisions/` for architectural decisions
- **Write `BLOCKED-[STORY-NNN].md` and stop** — never improvise on architecture

---

## Commit Convention

`feat:` / `chore:` / `fix:` / `docs:` / `test:`

Branch naming: `story/STORY-NNN-short-description`

---

*Last updated: March 26, 2026 — Session 5 (Rules 13–17 added)*
