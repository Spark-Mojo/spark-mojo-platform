# CLAUDE.md — Spark Mojo Platform

This file is the primary context document for any Claude Code session working
in this repository. Read it completely before taking any action.

---

## What This Repo Is

`spark-mojo-platform` is the production codebase for the Spark Mojo Platform
— a unified business OS for small and mid-sized businesses. The frontend is a
desktop OS paradigm (draggable, resizable Mojo windows on a freeform canvas).
The backend is Frappe/ERPNext with custom apps. Automation runs through n8n.

This is NOT a greenfield build. The frontend is migrated from a working
prototype (`sm-platform-experimental-platform`). The architecture is fully
designed and documented. Your job is to execute against that design — not
to make architectural decisions.

---

## Governance Repo — Read This First

All architecture decisions, PRDs, and project plans live in:
`Spark-Mojo/sparkmojo-internal`

Before doing any substantive work, read these files from sparkmojo-internal:

| File | What it is |
|------|-----------|
| `platform/prd/FRONTEND_PRD.md` | Complete frontend product requirements — authoritative spec |
| `platform/JAMES_PROJECT_PLAN.md` | Master project plan — what to build, in what order |
| `platform/decisions/FRONTEND_DECISIONS.md` | All locked frontend architecture decisions |
| `platform/architecture/PLATFORM_ARCHITECTURE.md` | Full system architecture |
| `platform/architecture/FRAPPE_POC_NOTES.md` | Frappe POC results — what works, exact commands |
| `platform/architecture/TASK_MANAGEMENT_POC_NOTES.md` | Task management POC results |
| `skills/platform/frappe/SKILL.md` | Frappe golden rules — read before any Frappe work |

To read these, clone sparkmojo-internal adjacent to this repo:
`git clone git@github.com:Spark-Mojo/sparkmojo-internal.git ../sparkmojo-internal`

---

## Repo Structure
```
spark-mojo-platform/
├── frontend/                 # React app — migrated from sm-platform-experimental-platform
│   ├── src/
│   │   ├── api/
│   │   │   ├── frappe-client.js    # Frappe REST client (replaces custom-sdk.js)
│   │   │   ├── base44Client.js     # Exports FrappeAuth + FrappeEntities
│   │   │   ├── entities.js         # SM DocType entity classes
│   │   │   └── integrations.js     # Frappe + n8n integration functions
│   │   ├── components/             # Shared UI components (Radix/shadcn)
│   │   ├── pages/
│   │   │   ├── Desktop.jsx         # The desktop canvas — DO NOT MODIFY STRUCTURE
│   │   │   ├── Layout.jsx          # App shell
│   │   │   └── [other pages]
│   └── ...
├── frappe-apps/
│   ├── sm_connectors/        # Canonical DocTypes — install first
│   ├── sm_widgets/           # Automation registry
│   ├── sm_billing/           # Usage metering
│   └── sm_provisioning/      # Tenant configuration
├── abstraction-layer/        # Mojo Abstraction Layer (Python FastAPI)
├── scripts/
└── CLAUDE.md
```

---

## Architecture — Locked Decisions

These decisions are final. Do not re-litigate them.

| Decision | Value |
|----------|-------|
| Frontend framework | Vite + React 18 |
| Deployment target | VPS (not Vercel) |
| Desktop paradigm | Draggable resizable Mojo windows on freeform canvas |
| Backend | Frappe/ERPNext (site-per-client multi-tenancy) |
| Automation engine | n8n for cross-system, Frappe Server Scripts for internal |
| API routing | All frontend calls go through /api/modules/[capability]/[action] |
| Auth | Frappe session cookie (credentials: include on every request) |
| Task management | ERPNext Task extended with SM custom fields |

**CRITICAL:** The React frontend NEVER calls Frappe directly. It always
calls the Mojo Abstraction Layer. This is DECISION-003 and it is immutable.

---

## Terminology

| Term | Meaning |
|------|---------|
| **Mojo** | A windowed capability on the desktop (brand term) |
| **Widget** | Code synonym for Mojo |
| **Workspace** | Architecture synonym for Mojo |
| **Automation** | An SM Automation Template record. NOT called a Mojo. |
| **Tenant** | A single client deployment — one Frappe site |
| **SM prefix** | All canonical Frappe DocTypes are prefixed SM |

---

## Frappe Golden Rules

Read `sparkmojo-internal/skills/platform/frappe/SKILL.md` before any Frappe
work. Key rules:

1. Use `frappe.get_doc("DocType", name).save()` for updates — never `db.set_value()`
2. Custom logic lives in SM custom apps only — never modify core Frappe
3. All custom API endpoints use `@frappe.whitelist()` decorator
4. All SM DocTypes are prefixed SM
5. The Mojo Abstraction Layer is NEVER bypassed
6. Run `bench --site [sitename] migrate` after every DocType change
7. n8n handles all cross-system operations
8. Background jobs use `frappe.enqueue()`

---

## Brand Tokens

| Token | Value |
|-------|-------|
| Primary Teal | `#006666` (Tailwind: `sm-teal`) |
| Coral | `#FF6F61` (Tailwind: `sm-coral`) |
| Gold | `#FFB300` (Tailwind: `sm-gold`) |
| Slate | `#34424A` (Tailwind: `sm-slate`) |
| Off-white | `#F8F9FA` (Tailwind: `sm-off-white`) |

For runtime tenant theming: use CSS variables `var(--color-primary)` etc.
Never hardcode colors — always use tokens or CSS variables.

---

## Phase 2 Task Sequence

### Task 2.3 — Frontend Migration
**Full spec:** FRONTEND_PRD.md Section 8

The 4 gateway files to replace (everything else is untouched):
- `lib/custom-sdk.js` → DELETE, create `src/api/frappe-client.js`
- `src/api/base44Client.js` → REWRITE
- `src/api/entities.js` → REWRITE
- `src/api/integrations.js` → REWRITE (stub with console.warn)

Pages to DELETE:
POS.jsx, Inventory.jsx, Orders.jsx, OrdersMobile.jsx, Recharges.jsx,
TimeTracking.jsx, Technicians.jsx, Events.jsx, Expenses.jsx,
Financial.jsx, FinancialReports.jsx, Customers.jsx, CustomerPortal.jsx,
PinAccess.jsx, PinLogin.jsx

Infrastructure to DELETE:
src/Functions/, lib/supabase-client.js, lib/custom-sdk.js,
lib/unified-custom-sdk.js, start-functions-server.sh, stop-functions-server.sh

**KEY CONSTRAINT:** Desktop.jsx carries forward UNCHANGED. Zero Base44
dependencies. Do not touch its structure.

### Task 2.4 — Mojo Abstraction Layer
**Full spec:** FRONTEND_PRD.md Section 3.2

Required endpoints:
- GET  /api/modules/desktop/mojos
- GET  /api/modules/tenant/public-config (unauthenticated)
- GET  /api/modules/automations/contextual
- POST /api/modules/automations/run
- GET/POST/PUT/DELETE /api/modules/{capability}/{action}
- GET  /health

### Task 2.5 — SM Custom Frappe App Shells
Install order: sm_connectors FIRST

sm_connectors DocTypes:
SM Client, SM Appointment, SM Task (extended), SM Invoice, SM Document,
SM Employee, SM Connector Config, SM Desktop State, SM Tenant Config,
SM Mojo Definition, SM Sync Log

ERPNext Task custom fields (in sm_connectors):
sm_linked_doctype, sm_linked_docname, sm_assigned_role,
sm_source_template, sm_due_date

sm_widgets DocTypes:
SM Automation Template, SM Client Automation, SM Automation Log

---

## Verification Checklist

**After 2.3:**
- `pnpm install && pnpm run dev` starts without errors
- Desktop.jsx renders (login screen visible, auth errors expected)
- No missing import errors in console

**After 2.4:**
- `uvicorn main:app --reload` starts
- GET /health returns `{ "status": "ok", "frappe_connected": false }`

**After 2.5:**
- Each app passes `bench --check`
- install_apps.sh runs without errors

---

## What NOT to Do

- Do NOT make architectural decisions — all locked in sparkmojo-internal
- Do NOT build Mojo content (Onboarding, Billing AR) — that is Phase 3
- Do NOT deploy to HIPAA VPS — waits for Digital Ocean BAA
- Do NOT call Frappe directly from React — always through abstraction layer
- Do NOT use localStorage for auth — Frappe session cookies only
- Do NOT hardcode tenant colors — CSS variables only
- Do NOT modify Desktop.jsx structure
- Do NOT create signUp() — user creation is admin-only

---

## Commit Convention

- `feat:` new feature
- `chore:` setup/scaffolding
- `fix:` bug fix
- `docs:` documentation

---

## When in Doubt

Check FRAPPE_POC_NOTES.md for Frappe quirks.
Check SKILL.md for Frappe patterns.
STOP and report rather than improvise architectural decisions.

---

*Last updated: March 22, 2026 — Session 3c*
