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
11. **Never install Frappe apps via bench without explicit story instruction.**
    The frappe_types incident caused a VPS scheduler restart loop.
    Create DocType files directly in existing apps instead.

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

*Last updated: March 26, 2026 — Session 5*
