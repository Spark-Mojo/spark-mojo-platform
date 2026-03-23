# CLAUDE.md — Spark Mojo Platform

This file is the primary context document for any Claude Code session
working in this repository. Read it completely before taking any action.

---

## MANDATORY FIRST STEP — Load the Frappe Skill

**Before writing any code, before reading any other file, load this:**

```
sparkmojo-internal/skills/platform/frappe/SKILL.md
sparkmojo-internal/skills/platform/frappe/references/sm-doctypes.md
sparkmojo-internal/skills/platform/frappe/references/api-endpoints.md
```

These encode production-hardened Frappe patterns that prevent silent
failures. An AI agent that skips this will make the same mistakes every
time — import statements in Server Scripts, db.set_value() bypassing
hooks, calling Frappe directly from React.

**Critical sections to internalize before writing any Frappe code:**
- Section 1: Critical Failure Patterns (the top AI mistakes)
- Section 2: Spark Mojo Architecture Rules (non-negotiable decisions)
- Section 9: Docker-Specific Patterns (this platform runs in Docker)
- Section 15: Enforcement Checklist (run before every commit)

Do not write a single line of Frappe code until the skill is loaded.

---

## Governance Repo — Read After the Skill

All architecture decisions, PRDs, and project plans live in:
`Spark-Mojo/sparkmojo-internal`

Read these files for context:

| File | What it is |
|------|-----------|
| `platform/prd/FRONTEND_PRD.md` | Complete frontend requirements — authoritative spec |
| `platform/JAMES_PROJECT_PLAN.md` | Master project plan — what to build, in what order |
| `platform/decisions/FRONTEND_DECISIONS.md` | All locked frontend architecture decisions |
| `platform/architecture/PLATFORM_ARCHITECTURE.md` | Full system architecture |
| `platform/architecture/FRAPPE_POC_NOTES.md` | Frappe POC results — what works, exact commands |
| `platform/architecture/TASK_MANAGEMENT_POC_NOTES.md` | Task management POC results |
| `platform/architecture/WILLOW_FIELD_MAPPING.md` | Willow Center field mapping from real data |
| `platform/architecture/SP_FIELD_MAPPING.md` | SimplePractice billing field mapping |

To access sparkmojo-internal, clone it adjacent to this repo:
`git clone git@github.com:Spark-Mojo/sparkmojo-internal.git ../sparkmojo-internal`

---

## Repo Structure

```
spark-mojo-platform/
├── frontend/                 # React app — migrated from sm-platform-experimental-platform
│   ├── src/
│   │   ├── api/
│   │   │   ├── frappe-client.js    # Frappe REST client
│   │   │   ├── base44Client.js     # Exports FrappeAuth + FrappeEntities
│   │   │   ├── entities.js         # SM DocType entity classes
│   │   │   └── integrations.js     # Integration functions
│   │   ├── components/             # Shared UI components (Radix/shadcn)
│   │   ├── pages/
│   │   │   ├── Desktop.jsx         # The desktop canvas — DO NOT MODIFY STRUCTURE
│   │   │   ├── Layout.jsx          # App shell
│   │   │   └── [Mojo pages]        # OnboardingMojo.jsx etc.
│   └── ...
├── frappe-apps/
│   ├── sm_connectors/        # Canonical DocTypes — install first
│   ├── sm_widgets/           # Automation registry
│   ├── sm_billing/           # Usage metering
│   └── sm_provisioning/      # Tenant configuration
├── abstraction-layer/        # Mojo Abstraction Layer (Python FastAPI)
├── scripts/
└── CLAUDE.md                 # This file
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

**CRITICAL — DECISION-003:** The React frontend NEVER calls Frappe
directly. It always calls the Mojo Abstraction Layer. This is immutable.

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

## Client Workflow Philosophy

**Meet them where they are. Then elevate.**

When building Mojos for specific clients:
- REPLICATE their mental model — don't redesign their workflow
- IMPORT their data as-is — don't ask them to reclassify records
- OPTIMIZE without asking — automate what they did manually
- ASK before changing the workflow itself
- PRESERVE their vocabulary — status names, method names, column names

For Willow Center specifically: the onboarding tracker Google Sheet is
the reference spec. See WILLOW_FIELD_MAPPING.md for the exact column
mapping from Erin's actual spreadsheet.

See also: FRONTEND_PRD.md Section 1.3.1 for the full philosophy statement.

---

## Frappe Enforcement Checklist

Run this before committing ANY Frappe code (from SKILL.md Section 15):

**Server Scripts:**
- [ ] Zero import statements? (Server Scripts are sandboxed — ALL imports fail)
- [ ] Using get_doc().save() not db.set_value() for updates?
- [ ] Chose correct hook for intended behavior (validate vs on_update)?
- [ ] Not calling frappe.db.commit() in Document Event scripts?
- [ ] Not making HTTP calls to external services in document events?

**Controllers:**
- [ ] No self.save() inside validate() or on_update()?
- [ ] Calling super() before custom logic?
- [ ] has_permission() returns False (not throws) to deny?

**Architecture:**
- [ ] React code calls /api/modules/ not /api/resource/ directly?
- [ ] All new DocTypes have SM prefix?
- [ ] Business logic in SM custom app (not core Frappe)?
- [ ] n8n not in the hot path of any UI interaction?
- [ ] bench migrate run after schema changes?

---

## Brand Tokens

| Token | Value | Tailwind |
|-------|-------|---------|
| Primary Teal | `#006666` | `sm-teal` |
| Coral | `#FF6F61` | `sm-coral` |
| Gold | `#FFB300` | `sm-gold` |
| Slate | `#34424A` | `sm-slate` |
| Off-white | `#F8F9FA` | `sm-off-white` |

For runtime tenant theming: use CSS variables `var(--color-primary)` etc.
Never hardcode colors — always use tokens or CSS variables.

---

## Phase 3 Build Context (Current Work)

Building the Willow Center Onboarding POC on the existing VPS
with anonymized data. No real PHI until Digital Ocean HIPAA VPS
is provisioned.

**Reference WILLOW_FIELD_MAPPING.md before building the Onboarding
Mojo — it documents exact field mappings from Erin's actual spreadsheet.**

Key reference files:
- `platform/architecture/WILLOW_FIELD_MAPPING.md` — exact field mapping
  from Erin's actual spreadsheet (analysis of anonymized data)
- `platform/prd/FRONTEND_PRD.md` Section 9.2 — Onboarding Mojo spec
- `platform/architecture/FRAPPE_POC_NOTES.md` — Docker commands that work

The Frappe POC containers from Session 3b are on the existing VPS.
SSH: `ssh sparkmojo`, then use Docker commands from FRAPPE_POC_NOTES.md.

---

## What NOT to Do

- Do NOT load the skill AFTER starting to write code — load it FIRST
- Do NOT make architectural decisions — all locked in sparkmojo-internal
- Do NOT build Mojo content before Phase 3 spec (Onboarding, Billing AR)
- Do NOT deploy to HIPAA VPS — waits for Digital Ocean BAA
- Do NOT call Frappe directly from React — always through abstraction layer
- Do NOT use localStorage for auth — Frappe session cookies only
- Do NOT hardcode tenant colors — CSS variables only
- Do NOT modify Desktop.jsx structure
- Do NOT create signUp() — user creation is admin-only
- Do NOT redesign a client's workflow — replicate their mental model and add automation on top. The client's vocabulary, status names, and process steps are the spec. See FRONTEND_PRD.md Section 1.3.1 and sparkmojo-internal/platform/architecture/WILLOW_FIELD_MAPPING.md.
- Do NOT write import statements in Server Scripts — they will fail silently

---

## Commit Convention

- `feat:` new feature
- `chore:` setup/scaffolding
- `fix:` bug fix
- `docs:` documentation

---

## When in Doubt

1. Check SKILL.md Section 12 for common error messages and fixes
2. Check FRAPPE_POC_NOTES.md for Docker-specific patterns
3. Run the enforcement checklist before committing
4. STOP and document in WILLOW_POC_STATUS.md rather than improvise

---

*Last updated: March 23, 2026 — Session 3c*
