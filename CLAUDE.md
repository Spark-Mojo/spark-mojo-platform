# CLAUDE.md — Spark Mojo Platform

Read this file completely before taking any action. This is the authoritative context document for every Claude Code session in this repository.

---

## What This Repo Is

`spark-mojo-platform` is the production codebase for the Spark Mojo Platform — a unified business OS for small and mid-sized businesses. The UI is a desktop OS paradigm: draggable, resizable Mojo windows on a freeform canvas. The backend is Frappe/ERPNext with custom apps. Automation runs through n8n.

This is NOT a greenfield build. Architecture is fully designed. Your job is to execute against that design — not to make architectural decisions.

---

## Governance Repo

All architecture decisions, feature specs, and sprint plans live in:
`Spark-Mojo/sparkmojo-internal` (cloned adjacent to this repo at `../sparkmojo-internal`)

Before any substantive work, read:

| File | What it is |
|------|------------|
| `platform/WORKING_AGREEMENT.md` | Rules of engagement, architecture constants, global build rules |
| `platform/decisions/DECISION-003-abstraction-layer.md` | Abstraction layer — immutable |
| `platform/decisions/DECISION-004-multi-tenancy.md` | Site-per-client — immutable |
| `platform/decisions/DECISION-013-crm-as-canonical-hub.md` | Frappe CRM is canonical person record |
| `platform/feature-library/TASK-WORKBOARD.md` | Full Task & Workboard feature spec |
| `platform/feature-library/stories/` | Individual story files for current sprint |

---

## Repo Structure

```
spark-mojo-platform/
├── CLAUDE.md                        # This file — read first every session
├── PROMPT.md                        # Current overnight task queue
├── hats.yml                         # Ralph workflow phases and quality gates
├── frontend/                        # React app (Vite + React 18, JSX, pnpm)
│   ├── src/
│   │   ├── api/                     # Abstraction layer client
│   │   │   └── frappe-client.js     # Frappe REST client — DO NOT MODIFY
│   │   ├── components/
│   │   │   ├── mojos/               # NEW Mojo components go here
│   │   │   ├── ui/                  # shadcn/Radix UI primitives
│   │   │   └── [legacy folders]     # Pre-migration — do not touch
│   │   ├── pages/
│   │   │   └── Desktop.jsx          # Desktop canvas — DO NOT MODIFY STRUCTURE
│   │   └── types/                   # Static TS type files — reference only, not used at runtime
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── abstraction-layer/               # Mojo Abstraction Layer (Python FastAPI)
│   ├── main.py                      # FastAPI app, router registration
│   ├── auth.py                      # Session validation
│   ├── routes/                      # Capability routers — one file per capability
│   │   └── onboarding.py            # Example capability router
│   ├── connectors/                  # Backend connectors per EHR/system
│   └── requirements.txt
├── frappe-apps/                     # Frappe custom apps
│   ├── sm_connectors/               # Canonical DocTypes — install first
│   ├── sm_widgets/                  # Mojo configs (SM Task lives here)
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
| Package manager (frontend) | pnpm |
| Package manager (Python) | pip |

**Frontend is JSX, not TypeScript.** Do not create `.tsx` or `.ts` files. Do not install TypeScript. Do not add `tsconfig.json`.

---

## Key Commands

```bash
# Frontend — run from frontend/
pnpm install                          # Install deps
pnpm run dev                          # Dev server (port 5173)
pnpm run build                        # Production build
pnpm run lint                         # ESLint — must pass with 0 warnings
pnpm run test                         # Vitest unit tests
pnpm run test:coverage                # Vitest with coverage report

# Abstraction layer — run from abstraction-layer/
uvicorn main:app --reload             # Dev server (port 8000)
pip install -r requirements.txt       # Install deps
pytest tests/ -v                      # Unit tests
pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70  # Coverage

# Frappe — run from bench root (NOT from this repo)
bench --site poc.sparkmojo.com migrate          # After any DocType change — ALWAYS run this
bench --site poc.sparkmojo.com list-apps        # Verify app installation
bench --site poc.sparkmojo.com console          # Interactive console for testing
```

---

## Definition of Done

A story is ONLY complete when ALL of these pass with zero errors:

**Frontend stories:**
1. `pnpm run lint` — 0 warnings, 0 errors
2. `pnpm run test` — all tests pass
3. `pnpm run build` — build succeeds

**Abstraction layer stories:**
1. `pytest tests/ -v` — all tests pass
2. `pytest tests/ --cov=. --cov-fail-under=70` — coverage met
3. App starts: `uvicorn main:app` — no import errors

**Frappe/DocType stories:**
1. `bench --site poc.sparkmojo.com migrate` — exit code 0, no errors
2. DocType visible in Frappe Desk with all fields present
3. Validation hooks fire correctly (manual test in bench console)

Never emit `LOOP_COMPLETE` or mark a task done without running every gate for that story type.

---

## Architecture — Immutable Rules

1. **React NEVER calls Frappe directly.** Always through `/api/modules/[capability]/[action]`.
2. **Never use `frappe.db.set_value()`.** Always `frappe.get_doc("DocType", name).save()`.
3. **Custom logic lives in SM custom apps only.** Never modify core Frappe or ERPNext.
4. **All SM DocTypes are prefixed `SM`.** Never create a DocType without the prefix.
5. **All custom API endpoints use `@frappe.whitelist()` decorator.**
6. **Always run `bench --site [sitename] migrate` after any DocType change.**
7. **n8n handles all cross-system operations.** No direct external API calls from Frappe in the hot path.
8. **Background jobs use `frappe.enqueue()`.** Never Python threading.
9. **New Mojo components go in `frontend/src/components/mojos/`.** Never in legacy folders.
10. **Never install Frappe apps on the bench without explicit story instruction.** The frappe_types incident caused a VPS restart loop — app installation has side effects.

---

## Frappe App Installation Warning

⚠️ **CRITICAL:** Installing a Frappe app via `bench get-app` + `bench install-app` registers it in `sites/apps.txt`. If the Python module is not importable, the scheduler crashes on every startup in a loop. **Never install a Frappe app unless the story explicitly instructs it AND the app is confirmed to be properly packaged.** If in doubt, create the DocType JSON directly in the existing `sm_widgets` or `sm_connectors` app instead.

---

## New Capability Router Pattern

When adding a new capability to the abstraction layer:

1. Create `abstraction-layer/routes/[capability].py`
2. Define a FastAPI `APIRouter` with prefix `/api/modules/[capability]`
3. Import and register in `main.py`: `app.include_router([capability]_router)`
4. Follow the pattern in `abstraction-layer/routes/onboarding.py`

Do NOT add capability logic to `main.py` directly. Each capability is its own router file.

---

## New Mojo Component Pattern

When adding a new Mojo component:

1. Create `frontend/src/components/mojos/[MojoName]Mojo.jsx`
2. Export as default: `export default function [MojoName]Mojo() {}`
3. All data fetching via abstraction layer — never direct Frappe calls
4. Use existing shadcn/Radix UI primitives from `frontend/src/components/ui/`
5. Use brand tokens (see below) — never hardcode colors
6. Register in the Mojo registry so it appears in the launcher

---

## Brand Tokens

| Token | Value | Tailwind class |
|-------|-------|----------------|
| Primary Teal | `#006666` | `sm-teal` |
| Coral (CTA) | `#FF6F61` | `sm-coral` |
| Gold (highlights) | `#FFB300` | `sm-gold` |
| Slate (body text) | `#34424A` | `sm-slate` |
| Off-white (bg) | `#F8F9FA` | `sm-off-white` |

For runtime tenant theming: use CSS variables `var(--color-primary)` etc. Never hardcode hex values.

---

## Do Not Touch

- `frontend/src/pages/Desktop.jsx` — desktop canvas structure is immutable
- `frontend/src/api/frappe-client.js` — Frappe REST client is load-bearing, do not modify
- `frontend/src/types/` — static type reference files, do not modify or delete
- Any file in legacy component folders (cash/, pos/, quickrepairs/, workorder/, technicians/, orders/, inventory/) — pre-migration artifacts, leave as-is
- `sites/apps.txt` on the bench — never modify directly
- Core Frappe or ERPNext source files — always use custom apps

---

## When Ambiguous

- Check `platform/feature-library/TASK-WORKBOARD.md` for feature spec
- Check `platform/decisions/` for architectural decisions
- Check `abstraction-layer/routes/onboarding.py` for router pattern
- **STOP and write a `BLOCKED-[STORY-NNN].md` file** rather than improvise on any structural decision
- Never guess at field names, DocType names, or API shapes — they are all specified in story files

---

## Commit Convention

- `feat:` new feature or capability
- `chore:` setup, config, scaffolding
- `fix:` bug fix
- `docs:` documentation only
- `test:` test files only

Branch naming: `story/STORY-NNN-short-description`

---

*Last updated: March 25, 2026 — Session 5*
