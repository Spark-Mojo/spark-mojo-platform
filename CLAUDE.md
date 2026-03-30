# CLAUDE.md — Spark Mojo Platform

## Before Starting — Read Governance Docs First

**Step 1:** Check `platform/HANDOFF.md` in sparkmojo-internal:
`/Users/jamesilsley/GitHub/sparkmojo-internal/platform/HANDOFF.md`
If it exists and is accurate, continue that in-progress task.
If it exists but is stale, overwrite it with current state before proceeding.

**Step 2:** Read `platform/README.md` in sparkmojo-internal:
`/Users/jamesilsley/GitHub/sparkmojo-internal/platform/README.md`
That is the master navigation key for all platform documentation.

**Step 3:** Read the story file for your current task:
`/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-NNN.md`
Then proceed with work in this repo.

---

Read this file completely before taking any action. This is the authoritative context document for every Claude Code session in this repository.

---

## Step 0 — Before Anything Else

**Read the platform master navigation key in the governance repo:**

```
/Users/jamesilsley/GitHub/sparkmojo-internal/platform/README.md
```

That document is the index of all platform documentation — what every doc is, how they relate, and the sync rules. It takes 2 minutes to read and prevents 2-hour debugging sessions caused by acting on stale or conflicting information.

After reading it, come back here and continue.

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
| Platform nav key | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/README.md` |
| Story files | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/` |
| Feature specs | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/` |
| Architecture decisions | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/` |
| Working agreement | `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/WORKING_AGREEMENT.md` |

---

## Before Any Work — Read These

| File | What it is |
|------|------------|
| `platform/README.md` (governance repo) | Master nav key — doc index, sync rules, conflict protocol |
| `platform/WORKING_AGREEMENT.md` | Rules of engagement, architecture constants, global build rules |
| `platform/decisions/DECISION-003-abstraction-layer.md` | Abstraction layer — immutable |
| `platform/decisions/DECISION-014-sm-task-custom-doctype.md` | SM Task is custom DocType, NOT ERPNext Task extension |
| `platform/decisions/DECISION-015-design-system.md` | Design system architecture — semantic tokens, layer model, theming |
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
│   │   │   ├── mojo-patterns/       # Spark Mojo composite patterns
│   │   │   ├── ui/                  # shadcn/Radix UI primitives
│   │   │   └── [legacy folders]     # Pre-migration — do not touch
│   │   ├── pages/
│   │   │   └── Desktop.jsx          # Desktop canvas — DO NOT MODIFY STRUCTURE
│   │   ├── styles/
│   │   │   └── tokens.css           # Design tokens (colors, glass, typography, spacing)
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

# POC deployment — use deploy.sh (see Deployment section below)
```

---

## Deployment — Always Deploy to Production

**After every code change, deploy to the POC VPS.** Do not leave changes
undeployed unless the user explicitly says not to deploy.

### If SSH is available (Claude can run `ssh sparkmojo`):

Deploy automatically — do not ask the user for permission to deploy:

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
```

For frontend-only changes, use `--phase 6` instead of a full deploy:

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh --phase 6'
```

After deploying, run `--verify-only` and report the results:

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh --verify-only'
```

### If SSH is NOT available (user must deploy manually):

Tell the user clearly: **"This change is committed and pushed but NOT deployed.
Run these commands on the VPS to deploy:"**

Then give them these exact steps:

```
1. SSH into the VPS:
     ssh sparkmojo

2. Pull and deploy:
     cd /home/ops/spark-mojo-platform
     git pull origin main
     ./deploy.sh

3. If deploy.sh is not executable:
     chmod +x deploy.sh && ./deploy.sh

4. Verify (if deploy.sh didn't run Phase 7):
     ./deploy.sh --verify-only
```

### deploy.sh phases and flags

| Phase | Name | What it does |
|-------|------|-------------|
| 0 | Pre-flight | Verify directory, Docker, Frappe backend running |
| 1 | Pull | `git pull origin main`, print HEAD commit |
| 2 | Sync frappe-apps | docker cp + pip install into ALL Frappe containers, apps.txt, tabInstalled Application. Removes non-installable apps from apps.txt. |
| 3 | Migrate | `bench --site frontend migrate`, verify DocTypes via VERIFY.txt |
| 4 | Restart | Restart Frappe backend + workers, poll health for 60s |
| 5 | Abstraction layer | `docker compose build --no-cache poc-api` + restart |
| 6 | Frontend | `docker compose build --no-cache poc-frontend` + restart. Aborts if frontend/ has uncommitted changes. Verifies bundle hash sync. |
| 7 | Verification | 6 end-to-end checks: Frappe ping, health, abstraction layer, frontend, per-app DocType checks |

| Command | What it does |
|---------|-------------|
| `./deploy.sh` | Full deploy — all 7 phases |
| `./deploy.sh --verify-only` | Check current state, no changes |
| `./deploy.sh --phase 2` | Sync frappe-apps only |
| `./deploy.sh --phase 3` | bench migrate only |
| `./deploy.sh --phase 6` | Frontend rebuild only |

---

## VPS Deployment Rules

1. **NEVER modify files directly on the VPS.** All changes go through git.
   History: on 2026-03-27 an uncommitted `index.jsx` on the VPS had a completely
   different routing structure. When deploy.sh ran `git pull`, it overwrote
   the local state and broke the UI. This triggered an 18-hour debug session.
2. **The VPS must always be a clean checkout of main.** No local modifications.
3. **deploy.sh is the ONLY way code gets onto the VPS.** Do not manually
   `docker compose build` or `docker cp` outside of deploy.sh.
4. **If you SSH in and modify ANY file**, you MUST `git add`, `git commit`,
   `git push` before ending the session. No exceptions.
5. **After pushing changes, always run deploy.sh** to ensure the VPS matches main.

---

## Known Gotchas

- **Frappe site name** inside the Docker container is `frontend`, NOT
  `poc.sparkmojo.com`. All `bench --site` commands use `frontend`.
- **SM Task `canonical_state`** maps to "Status" in the Frappe UI — not `status`.
- **Non-installable apps in apps.txt** (e.g. `sm_billing` without `pyproject.toml`)
  cause `ModuleNotFoundError` during `bench migrate`. This makes Frappe treat valid
  DocTypes from other apps as "orphaned" and **DELETE them**. deploy.sh Phase 2
  now removes non-installable apps from apps.txt automatically.
- **Alpine-based containers** (nginx) need `sh -c` wrapper for glob expansion
  in `docker exec` commands. `docker exec container ls *.js` fails silently;
  use `docker exec container sh -c 'ls *.js'` instead.
- **Phase 7 `<div id="root">` check is a false positive.** A stale bundle still
  has `<div id="root">`. Always verify by grepping the bundle for expected string
  literals (e.g. `api/modules/tasks`). See "Verifying Production Bundles" section.
- **Desktop.jsx is archived** (`_archive/`). The sidebar layout is production.
  Do not import Desktop.jsx — it will pull in all widget/desktop components
  and bloat the bundle. WorkboardMojo renders inside the sidebar layout, not
  as a draggable desktop window.

---

## Ralph Orchestrator Rules

- Every story **MUST** include a smoke test step that verifies the feature is
  navigable from the live UI, not just that the component file exists.
- After merging feature branches, **always trigger a deploy** to the VPS.
- Never mark a story as complete if the feature is unreachable from the UI.
- If a story adds a new route or component, the smoke test must verify:
  1. The route is defined in `pages/index.jsx`
  2. The sidebar link exists in `pages/Layout.jsx`
  3. The production bundle contains the component's string literals
- **Design system verification** (run on any story touching `frontend/src/`):
  - No hardcoded hex colors in changed files: `grep -r '#[0-9a-fA-F]\{6\}' frontend/src/components/`
  - Every new component file has a corresponding section in Library.jsx
  - COMPONENT_INVENTORY.md updated if components/ changed
  - All `var(--sm-*)` references resolve to defined tokens in tokens.css
  - `npm run build` succeeds

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
4. Design system pre-commit checklist passes (see Design System Rules section)

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
4. Check /library page before building any UI — use existing components from `components/ui/` and `components/mojo-patterns/`
5. Use `var(--sm-*)` tokens from `tokens.css` — NEVER hardcode hex, NEVER use Tailwind color classes
6. Register in Mojo registry (`sparkmojo-internal/platform/MOJO_REGISTRY.md`)
7. Add cross-links: feature spec → stories → MOJO_REGISTRY (see platform/README.md sync rules)
8. See the Design System Rules section below for full component creation protocol

---

## Brand Tokens

Use `var(--sm-*)` CSS variables from `frontend/src/styles/tokens.css`. Never hardcode hex in component files.

| Semantic Token | Role | Value |
|----------------|------|-------|
| `--sm-primary` | Primary actions, active states, avatars | `#006666` |
| `--sm-danger` | Warnings, urgent states, errors | `#FF6F61` |
| `--sm-warning` | Medium priority, pending, review | `#FFB300` |
| `--sm-slate` | Text, headers | `#34424A` |
| `--sm-offwhite` | Page background | `#F8F9FA` |

**Rename status:** Current code uses `--sm-teal`, `--sm-coral`, `--sm-gold` (brand-specific names). Semantic rename to `--sm-primary`, `--sm-danger`, `--sm-warning` is a pending Ralph build (DECISION-015). Use semantic names in ALL new code. The rename is mechanical — find/replace plus token file update.

---

## Do Not Touch

- `frontend/src/pages/Desktop.jsx` — immutable structure
- `frontend/src/pages/index.jsx` — app routing, imports Desktop. If this file is changed,
  Vite tree-shakes out all Mojo components (WorkboardMojo, etc.) as dead code.
  History: on 2026-03-27 this file was overwritten on the VPS by a tool, replacing
  Desktop routing with placeholder pages. The bundle silently lost all Mojo code.
- `frontend/src/api/frappe-client.js` — load-bearing, do not modify
- `frontend/src/types/` — static reference files
- All legacy component folders (cash/, pos/, quickrepairs/, workorder/, technicians/, orders/, inventory/)
- `sites/apps.txt` on the bench
- Core Frappe or ERPNext source

**VPS working tree must match git HEAD before any Docker build.**
Never modify files directly on the VPS without committing. `deploy.sh` Phase 6
will abort if `frontend/` has uncommitted changes.

---

## When Ambiguous

- Check story spec file first
- Check `platform/feature-library/TASK-WORKBOARD.md`
- Check `platform/decisions/` for architectural decisions
- **Write `BLOCKED-[STORY-NNN].md` and stop** — never improvise on architecture

---

## Git Workflow

### Commit prefixes

`feat:` / `chore:` / `fix:` / `docs:` / `test:`

### When to use PRs vs direct commits

| Change type | Workflow | Example |
|-------------|----------|---------| 
| Story / feature work | PR on feature branch | New Mojo component, new DocType, new API route |
| Bug fixes to app code | PR on feature branch | Fixing a broken component, controller logic |
| Deploy/infra fixes | Direct to main | deploy.sh changes, Traefik routing, Docker config |
| Docs / CLAUDE.md | Direct to main | Updating instructions, adding conventions |
| Branding / config | Direct to main | Title changes, env vars, .env files |

### PR workflow (for story/feature/bugfix work)

```bash
# 1. Create branch
git checkout -b story/STORY-NNN-short-description

# 2. Make changes, commit
git add <files>
git commit -m "feat: description"

# 3. Push and create PR
git push -u origin story/STORY-NNN-short-description
gh pr create --title "feat: description" --body "## Summary\n- ..."

# 4. After approval/merge, clean up
git checkout main
git pull origin main
git branch -d story/STORY-NNN-short-description
```

When creating PRs, use `gh pr create` (GitHub CLI). After the PR is merged,
delete the remote branch: `gh pr merge --delete-branch`

### Direct-to-main workflow (for fixes/docs/deploy)

```bash
git add <files>
git commit -m "fix: description"
git push origin main
```

Then deploy per the Deployment section above.

---

## Design System — Rules and Governance

**Decision:** DECISION-015 in `sparkmojo-internal/platform/decisions/DECISION-015-design-system.md`
**Visual North Star:** Ein UI (https://ui.eindev.ir/) — liquid glass aesthetic.
**Light mode is the default** working environment. Dark mode is opt-in via `[data-theme="dark"]`.
**Tailwind dark mode config:** Must use `darkMode: ['selector', '[data-theme="dark"]']` — NOT `class`.

### Component Architecture

```
src/components/
├── ui/              ← shadcn/ui base components (themed with SM glass tokens)
├── charts/          ← shadcn/ui chart components (install when data viz mojos begin)
├── magicui/         ← Magic UI animation accents (selective use only)
├── mojo-patterns/   ← Spark Mojo composite patterns (MojoHeader, StatsCardRow, etc.)
└── mojos/           ← Individual mojo implementations (assemble from above)
```

### Token Usage — MANDATORY

- **NEVER hardcode hex colors** in component files. Use `var(--sm-*)` tokens from `frontend/src/styles/tokens.css`.
- **NEVER use Tailwind color classes** (`bg-teal-600`, `text-red-500`, etc.) — use token-mapped utility classes like `bg-[var(--sm-primary)]` or `text-[var(--sm-danger)]`.
- **NEVER use opacity variants for visibility** (`bg-primary/20`). Use dedicated track/surface tokens (`var(--sm-track-bg)`, `var(--sm-surface-secondary)`). Opacity on near-white = still near-white, invisible in light mode.
- **ALL new colors MUST be added as tokens first**, then referenced.

### Token Naming Convention

Semantic role names ONLY. Never color-descriptive or brand-specific names.

| Semantic Token | Role |
|----------------|------|
| `--sm-primary` | Primary actions, active states, avatars |
| `--sm-danger` | Warnings, urgent states, errors |
| `--sm-warning` | Medium priority, pending, review |
| `--sm-success` | Confirmed, complete, verified |
| `--sm-info` | Informational, neutral highlight |

**Derived pattern:**
- Status tokens reference semantic base: `--sm-status-ready: var(--sm-primary)`
- Glass tints reference semantic base: `--sm-glass-primary`, `--sm-glass-danger`
- Per-client theming overrides ONLY the 5-7 base semantic colors

**Control/surface tokens** — use these for all interactive elements:
- `--sm-control-bg` — input/select background
- `--sm-control-border` — input/select border
- `--sm-control-border-heavy` — checkbox, strong borders
- `--sm-track-bg` — progress/slider track
- `--sm-track-fill` — progress/slider fill
- `--sm-surface-secondary` — tab list background, secondary surfaces
- `--sm-accent-solid` — solid accent color (no opacity)
- `--sm-accent-fg` — text on accent surfaces

### Component Creation Protocol

When creating a NEW UI component:
1. Check if shadcn/ui has it: `npx shadcn@latest add <component-name>` from `frontend/`
2. If shadcn has it → install it, apply SM token overrides, add to /library page
3. If custom → build it from shadcn primitives, add to `components/mojo-patterns/`, add to /library page
4. Update `COMPONENT_INVENTORY.md` with: component name, props, variants, token usage, which mojos use it

### Component Usage Protocol

When using a component in a mojo:
1. Check /library page first — does this component already exist?
2. If yes → import and use it as-is. Do NOT create a one-off variant.
3. If you need a variant that doesn't exist → add the variant to the BASE component, update /library, THEN use it.
4. NEVER create a local/inline version of something that exists in `components/ui/` or `components/mojo-patterns/`

### /library Page Contract

- `frontend/src/pages/Library.jsx` is the CANONICAL visual reference for the entire design system.
- Every component in `components/ui/` and `components/mojo-patterns/` MUST appear in /library.
- Every variant, size, and state MUST be demonstrated.
- If you add a component and don't add it to /library, the story is not done. Do not mark it complete.

### Design System Rules (Full List)

1. All mojos MUST import from `components/ui/`, `components/charts/`, or `components/mojo-patterns/`. Never create custom implementations of shared components.
2. All colors MUST reference design tokens (`var(--sm-primary)`), never raw hex or Tailwind color classes.
3. All typography MUST use the token font stack: Montserrat (display), Nunito Sans (body), Inter (UI controls).
4. All surface components MUST use liquid glass treatment from `styles/tokens.css`.
5. New shared components require a `COMPONENT_INVENTORY.md` entry before implementation.
6. Magic UI components are accent only — they enhance, never replace base components.
7. React NEVER calls Frappe directly — always via `/api/modules/[capability]/[action]`. (Restated for completeness.)

### Pre-Commit Checklist — Design System

Before committing any frontend change, verify:
- [ ] No hardcoded hex colors in component files (`grep -r '#[0-9a-fA-F]\{6\}' frontend/src/components/`)
- [ ] No new Tailwind color classes (grep for `bg-teal`, `bg-red`, `text-blue`, etc.)
- [ ] Any new component is in /library (`frontend/src/pages/Library.jsx`)
- [ ] `COMPONENT_INVENTORY.md` is updated if components changed
- [ ] Build passes: `cd frontend && npm run build`

### Key Design System Files

- `frontend/src/styles/tokens.css` — all design tokens (the single source of truth)
- `frontend/src/pages/Library.jsx` — canonical component showcase (/library route)
- `COMPONENT_INVENTORY.md` — component catalog with props, variants, token usage, mojo associations
- `sparkmojo-internal/platform/decisions/DECISION-015-design-system.md` — architectural ADR

### Design System Debt Tracker

| Item | Status |
|------|--------|
| Base components in /library | 20/49 (41%) — fill to 100% is a pending Ralph build |
| Token semantic rename | PENDING — `--sm-teal/coral/gold` → `--sm-primary/danger/warning` |
| Missing high-priority components | Accordion, Alert, Dropdown Menu, Pagination, Toast, Breadcrumb |

---

*Last updated: March 29, 2026 — Design system governance expansion (semantic tokens, library contract, component protocols)*
