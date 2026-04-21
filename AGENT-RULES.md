# Autonomous Agent Rules — Spark Mojo Platform

> Comprehensive guardrails, conventions, and constraints for any autonomous coding agent operating in this codebase. Synthesized from CLAUDE.md, PLATFORM-GUARDRAILS.md, WORKING_AGREEMENT.md, PROCESS.md, STORY_TEMPLATE.md, all DECISION-NNN files, feature specs, and codebase patterns.

---

## 1. PLATFORM PHILOSOPHY (Highest Authority)

| # | Rule |
|---|------|
| 1.1 | **Spark Mojo is a universal business OS** — NOT a healthcare app. Behavioral health is the first vertical, not the platform's identity |
| 1.2 | **Universality test:** "Can this serve a therapy practice, a hotel, a law firm, and a music teacher without modification?" YES → kernel/core. NO → industry-specific |
| 1.3 | **Build order:** Universal first → vertical second → client third → role fourth |
| 1.4 | **No pilot client names in stories/specs** — use "the client" or "the user." Pilot feedback informs the platform, not bespoke requests |
| 1.5 | **Everything is a workflow** — every capability must answer: What is the work? What enables each step? How is output stored/surfaced? |
| 1.6 | **Everything about a customer lives in the CRM** — unified activity timeline is mandatory, not optional. Every capability that touches a customer record MUST write to CRM timeline |
| 1.7 | **If architecture is ambiguous, write `BLOCKED-[TOPIC].md` and stop** — never improvise, never resolve unilaterally |
| 1.8 | **Archive, don't delete** — stale docs go to `platform/archive/` |
| 1.9 | **If you add a document, add it to `platform/README.md`** |

---

## 2. MANDATORY SPEC GATES

| # | Gate |
|---|------|
| 2.1 | **Gate 1:** What is the workflow? If none, explain why |
| 2.2 | **Gate 2:** What does it write to CRM timeline? If nothing, explain why |
| 2.3 | **Gate 3:** Is it at the right level of specificity? Could it be universal instead of vertical? Could it be configuration instead of code? |

---

## 3. IMMUTABLE ARCHITECTURE

| # | Rule |
|---|------|
| 3.1 | **React NEVER calls Frappe directly** — all data flows through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer (MAL) |
| 3.2 | **Never use `frappe.db.set_value()`** — always `frappe.get_doc("DocType", name).save()` |
| 3.3 | **Never modify core Frappe/ERPNext** — all custom logic in SM custom apps only |
| 3.4 | **All SM DocTypes prefixed `SM`** — no exceptions |
| 3.5 | **SM Task is a custom DocType** — NOT an ERPNext Task extension (DECISION-014) |
| 3.6 | **n8n handles ALL cross-system operations** — never in hot path of interactive UI |
| 3.7 | **The workflow/n8n boundary is the most locked rule:** Frappe Workflow / `transition_state()` manages internal document state. n8n manages cross-system actions triggered by state changes. Workflow engine NEVER calls external systems. n8n NEVER modifies document state. No exceptions |
| 3.8 | **Background jobs use `frappe.enqueue()`** — never Python threading |
| 3.9 | **All custom API endpoints use `@frappe.whitelist()` decorator** |
| 3.10 | **Architecture decisions in `platform/decisions/` are locked** — do not re-litigate any DECISION-NNN |
| 3.11 | **Backend evaluation order:** (1) Native Frappe/ERPNext → (2) Open-source community app → (3) Third-party integration → (4) Custom build. Skipping requires documented justification |
| 3.12 | **Admin API credentials NEVER stored/displayed in any Mojo** — only vault reference strings (e.g., `vault:willow/stedi`) |
| 3.13 | **Two-track app management (DECISION-021):** Ecosystem apps in `Dockerfile.frappe` (NEVER `bench get-app` on VPS). SM custom apps via `deploy.sh` Phase 2 |
| 3.14 | **Canonical identity rule (DECISION-020):** Frappe CRM Contact is canonical. Medplum Patient and ERPNext Customer are projections. n8n enforces single-view rule |
| 3.15 | **Medplum is internal only** — no public subdomain, headless API only. One Project per client for row-level isolation. Every Medplum/FHIR call MUST validate `project_id` — missing = HIPAA violation (DECISION-028) |
| 3.16 | **Data isolation:** Multi-tenancy = Frappe multi-site (one site per client, database-per-tenant). Clinical data = Medplum shared instance, one Project per client |

### Locked Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Frappe / ERPNext (custom apps only) |
| Abstraction Layer | FastAPI (Mojo Abstraction Layer) |
| Frontend | React JSX (no TypeScript) |
| Clinical Data | Medplum (self-hosted, internal Docker, headless) |
| Cross-system Automation | n8n (self-hosted) |
| HIPAA AI | AWS Bedrock (BAA covers all models) |
| Clearinghouse | Stedi |
| Cloud Host | DigitalOcean (HIPAA) / Hostinger (POC only) |

---

## 4. WORKFLOW ENGINE / n8n BOUNDARY (Most Locked Rule)

| # | Rule |
|---|------|
| 4.1 | **Frappe Workflow / `transition_state()` manages internal document state** |
| 4.2 | **n8n manages cross-system actions triggered by state changes** |
| 4.3 | **Workflow engine NEVER calls external systems** |
| 4.4 | **n8n NEVER modifies document state** |
| 4.5 | **This boundary is the most locked rule in the platform. No exceptions** |
| 4.6 | **Anti-pattern:** n8n must NOT be in the hot path of interactive UI. User opens record → UI calls Frappe API directly → renders. n8n never touches this flow |
| 4.7 | **Three-layer automation model (DECISION-005):** Layer 1 = Direct Frappe API (interactive). Layer 2 = Frappe Workflows/Server Scripts (internal events). Layer 3 = n8n (cross-system orchestration) |
| 4.8 | **Medplum Bots** stay within FHIR only. **n8n** handles any write to Frappe, any call to Stedi, any outbound notification |

---

## 5. FRONTEND RULES

| # | Rule |
|---|------|
| 5.1 | **Frontend is JSX, not TypeScript** — never create `.tsx` or `.ts` files |
| 5.2 | **NEVER hardcode hex colors** — use `var(--sm-*)` semantic tokens only |
| 5.3 | **NEVER use Tailwind color classes** (e.g., `text-blue-500`) — use token variables |
| 5.4 | **NEVER use opacity variants for visibility** |
| 5.5 | **All new colors MUST be added as tokens first** in `tokens.css` |
| 5.6 | **New Mojo components go in `frontend/src/components/mojos/` only** |
| 5.7 | **Use `cn()` utility** (clsx + tailwind-merge) for dynamic classNames |
| 5.8 | **Use `React.forwardRef()`** and set `displayName` on all base UI components |
| 5.9 | **Use framer-motion** for animations (motion.div, AnimatePresence) |
| 5.10 | **All API calls use `fetch` with `credentials: 'include'`** — handle 401 via `frappe-unauthorized` event dispatch |
| 5.11 | **React Query defaults:** staleTime = 5 minutes, refetchOnWindowFocus: false, retry: 1 |
| 5.12 | **File naming:** PascalCase for components (`WorkboardMojo.jsx`), kebab-case for hooks (`use-mobile.jsx`) |
| 5.13 | **Every new component must appear on `/library` page** and be added to `COMPONENT_INVENTORY.md` |
| 5.14 | **Do NOT modify legacy component folders** — they are excluded from linting |
| 5.15 | **Do NOT modify:** `Desktop.jsx`, `frappe-client.js`, `pages/index.jsx` (core routing), `src/types/` |
| 5.16 | **Disable prop-types per file:** `/* eslint-disable react/prop-types */` |
| 5.17 | **Environment variables prefixed `VITE_`** — accessed via `import.meta.env.VITE_*` |
| 5.18 | **Light mode is default.** Dark mode via `[data-theme="dark"]`. Tailwind darkMode config: `['selector', '[data-theme="dark"]']` — NOT `class` |
| 5.19 | **Per-client theming:** Override only 5-7 semantic base tokens. No component code changes |
| 5.20 | **Use Mojo patterns** for new features: MojoHeader, StatusBadge, StatsCard, DataTable, FilterTabBar, KanbanBoard, TaskDetailDrawer |
| 5.21 | **Package manager is pnpm** — not npm or yarn |
| 5.22 | **Path alias `@` maps to `./src`** in Vite config |
| 5.23 | **Use CVA (class-variance-authority)** for component variant patterns |
| 5.24 | **Frontend manual browser walkthrough required on VPS** before merge for all frontend stories |

### Semantic Tokens

| Token | Role |
|-------|------|
| `--sm-primary` | Primary actions, active states, CTAs |
| `--sm-danger` | Warnings, urgent states, errors |
| `--sm-warning` | Medium priority, pending |
| `--sm-success` | Confirmed, complete, verified |
| `--sm-info` | Informational, neutral highlight |
| `--sm-slate` | Text, headers |
| `--sm-offwhite` | Page background |
| `--sm-glass-bg/border/blur` | Liquid glass surfaces |
| `--sm-font-display` | Montserrat — headers |
| `--sm-font-body` | Nunito Sans — body text |
| `--sm-font-ui` | Inter — UI elements |

### Component Directory Structure

```
src/components/
├── ui/              ← shadcn/ui base (glass-themed)
├── charts/          ← shadcn/ui charts
├── magicui/         ← Magic UI animation accents (selective use)
├── mojo-patterns/   ← Spark Mojo composite patterns
└── mojos/           ← Individual Mojo implementations
```

---

## 6. ABSTRACTION LAYER RULES

| # | Rule |
|---|------|
| 6.1 | **All endpoints are `async def`** — use `async with httpx.AsyncClient()` for HTTP |
| 6.2 | **Set `timeout=15` on all HTTP calls** to Frappe |
| 6.3 | **Wrap all responses in `{"data": result}`** — consistent format |
| 6.4 | **Use `Depends(get_current_user)` for auth** on all authenticated endpoints |
| 6.5 | **Router prefix convention:** `/api/modules/[capability]` for capability routes, `/api/webhooks/[provider]` for webhooks, `/api/admin/` for provisioning |
| 6.6 | **Register dedicated routers BEFORE generic catch-all** in main.py |
| 6.7 | **Logger naming:** `logging.getLogger("abstraction-layer")` or `"abstraction-layer.module"` |
| 6.8 | **Use `%s` format strings** in logger calls (not f-strings) |
| 6.9 | **Pydantic models for request/response** — use `field_validator` for domain validation |
| 6.10 | **Frappe API auth header:** `Authorization: token {API_KEY}:{API_SECRET}` |
| 6.11 | **Always call `resp.raise_for_status()`** — but handle specific status codes (404, 409) BEFORE it |
| 6.12 | **Graceful degradation in webhooks** — log errors, don't crash the handler |
| 6.13 | **Use Python 3.10+ union syntax:** `dict | None` not `Optional[dict]` |
| 6.14 | **Test with:** `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")` |
| 6.15 | **Coverage target: >= 70%** (new code: >= 80%) |
| 6.16 | **Auth order:** sm_session cookie → Frappe sid cookie → DEV_MODE fallback → 401 |
| 6.17 | **Subdomain extraction from Host header** for multi-tenant routing |
| 6.18 | **SiteRegistry cache TTL: 5 minutes** — fallback to SITE_REGISTRY env var if admin site unreachable |
| 6.19 | **Computed/enriched fields** (urgency, completion_pct) added via helper functions before returning |
| 6.20 | **Helper functions prefixed with `_`** — keep private to module |
| 6.21 | **Module docstrings** explaining purpose at top of every file |
| 6.22 | **Import organization:** stdlib → third-party → local, with `load_dotenv()` early |
| 6.23 | **Constants at module top** after imports: `FRAPPE_URL = os.getenv(...)` |
| 6.24 | **Endpoint naming convention:** `/list`, `/get/{id}`, `/create`, `/update/{id}`, `/archive/{id}` |
| 6.25 | **Global httpx.HTTPStatusError handler** converts to HTTPException so CORS headers are added |

---

## 7. FRAPPE / DOCTYPE RULES

| # | Rule |
|---|------|
| 7.1 | **Three-level nesting required:** `frappe-apps/{app}/{app}/{module_folder}/doctype/{doctype_folder}/` — NOT `{app}/{app}/doctype/` |
| 7.2 | **Every directory needs `__init__.py`** |
| 7.3 | **`__init__.py` at app root must contain `__version__ = "x.y.z"`** |
| 7.4 | **JSON `"module"` field must match title in `modules.txt`** |
| 7.5 | **All DocTypes use `"engine": "InnoDB"`** |
| 7.6 | **All substantive DocTypes have `canonical_state` field** with predefined Select options |
| 7.7 | **Child tables:** `"istable": 1`, `"track_changes": 0`, `"permissions": []` (always empty) |
| 7.8 | **Never call `frappe.db.commit()` in document controllers** — caller's responsibility |
| 7.9 | **State transitions tracked in audit tables** with `from_state, to_state, changed_by, changed_at, reason, trigger_type` |
| 7.10 | **System timestamps are `"read_only": 1`** — `started_at, completed_at, canceled_at` |
| 7.11 | **Boolean fields:** `"fieldtype": "Check"` with explicit `"default"` value. Prefix: `is_` or `supports_` |
| 7.12 | **Timestamp fields:** `_at` suffix. User fields: `_by` suffix |
| 7.13 | **Unique fields:** `"unique": 1` for natural keys (npi, payer_short_name, site_subdomain) |
| 7.14 | **Always run `bench --site [site] migrate` after ANY DocType change** |
| 7.15 | **Never run `bench install-app` or `bench get-app`** without explicit story instruction |
| 7.16 | **`apps.txt` vs `tabInstalled Application`:** SM apps go in `tabInstalled Application` only (MariaDB INSERT). Adding to `apps.txt` without pip install = total outage |
| 7.17 | **Patches are additive** — create new patches, never modify existing ones |
| 7.18 | **Patch format:** `def execute():` with `frappe.db.commit()` at end. Use `CREATE INDEX IF NOT EXISTS` for idempotency |
| 7.19 | **Use `pyproject.toml` with flit** — `requires-python = ">=3.10"` |
| 7.20 | **No cross-app dependencies** — each SM app (sm_widgets, sm_billing, sm_provisioning, sm_connectors) is independent |
| 7.21 | **hooks.py standard fields:** app_name, app_title, app_publisher="Spark Mojo", app_email="dev@sparkmojo.com", app_license="MIT", app_color="#006666" |
| 7.22 | **Concurrency control:** Use `for_update=True` when reading then updating the same record (e.g., ERA processing) |
| 7.23 | **Permissions:** `ignore_permissions=True` only for system-generated records (e.g., State Log entries) |
| 7.24 | **Validation errors:** Raise `frappe.ValidationError` with descriptive message |
| 7.25 | **Section breaks organized as:** `section_{domain}` naming (section_ownership, section_state, section_dates, section_audit) |
| 7.26 | **Fixtures:** Declared in hooks.py (`fixtures = ["SM Payer"]`), stored as JSON arrays in `fixtures/` directory |
| 7.27 | **VERIFY.txt:** Each app can have a `VERIFY.txt` file — first line = primary DocType name to verify after migrate |

### Autoname Conventions

| Pattern | Example | Used For |
|---------|---------|----------|
| `CLM-.YYYY.MM.-.####` | CLM-2026.04-0001 | SM Claim |
| `TASK-.#####` | TASK-00001 | SM Task |
| `field:payer_short_name` | By field value | SM Payer, SM Provider |
| `CLM-LOG-.YYYY.-.####` | CLM-LOG-2026-0001 | SM Claim State Log |

---

## 8. STATE MACHINE RULES

| # | Rule |
|---|------|
| 8.1 | **SM Claim uses 19-state model:** draft → pending_info → pending_auth → validated → held → submitted → rejected → adjudicating → paid → partial_paid → denied → in_appeal → appeal_won → appeal_lost → pending_secondary → patient_balance → written_off → closed → voided |
| 8.2 | **SM Task uses 8-state model:** New → Ready → In Progress → Waiting → Blocked → Completed → Canceled → Failed |
| 8.3 | **Terminal states have empty transition lists** — no further transitions allowed |
| 8.4 | **VALID_TRANSITIONS dict is authoritative** — all transitions not in dict are rejected |
| 8.5 | **Manual transitions (trigger_type="manual") REQUIRE non-empty reason** — raise ValidationError if missing |
| 8.6 | **SM Task: status_reason REQUIRED when canonical_state is Blocked or Failed** |
| 8.7 | **Financial snapshot before state change:** Capture paid_amount, adjustment_amount, patient_responsibility and store in State Log |
| 8.8 | **Trigger types:** manual, webhook_277ca, webhook_835, api, scheduler |
| 8.9 | **State history is standalone DocType** (not child table) to avoid performance penalty as history accumulates |
| 8.10 | **Automatic date setting:** In Progress → set `started_at`; Completed/Failed → set `completed_at`; Canceled → set `canceled_at` (only if empty) |
| 8.11 | **State machine approach:** Custom `canonical_state` field + Python `VALID_TRANSITIONS` dict + controller validation (NOT Frappe Workflow Engine for complex state machines) |
| 8.12 | **`transition_state()` does NOT call `frappe.db.commit()`** — caller responsible |

---

## 9. DEPLOYMENT RULES

| # | Rule |
|---|------|
| 9.1 | **NEVER modify files directly on the VPS** — all changes go through git |
| 9.2 | **`deploy.sh` is the ONLY way code gets onto the VPS** — never `docker compose restart` as substitute |
| 9.3 | **Always deploy after every code change:** `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'` |
| 9.4 | **Bench container is `frappe-poc-backend-1`** — NOT `spark-mojo-platform-poc-frappe-1` |
| 9.5 | **Frontend build always uses `--no-cache`** — prevents stale bundle serving |
| 9.6 | **docker compose on VPS requires `-f` flag:** `docker compose -f docker-compose.poc.yml ...` |
| 9.7 | **Runtime secrets live in Infisical** — `deploy.sh` Phase 0.5 fetches them to `secrets/<name>` (0600). Compose mounts at `/run/secrets/*`. `read_secret()` in Python. Never `os.getenv` for secrets. See `docs/ops/secret-rotation-runbook.md`. |
| 9.8 | **After `docker compose down/up`, restart frontend container last** — nginx caches backend IP |
| 9.9 | **HostRegexp rules do NOT trigger ACME cert issuance** — every subdomain needs explicit `Host()` rule |
| 9.10 | **VPS must always be a clean checkout of main** |
| 9.11 | **Phase 2 syncs SM apps to ALL Frappe containers** (backend + workers) — not just backend |
| 9.12 | **Phase 2 checks for pyproject.toml before pip install** — REMOVES from apps.txt if missing (prevents ModuleNotFoundError) |
| 9.13 | **Phase 6 guards against uncommitted frontend changes** — aborts if `git diff -- frontend/` is dirty |
| 9.14 | **Phase 6 verifies bundle hash matches index.html reference** after build |
| 9.15 | **Phase 7 runs 6+ end-to-end verification checks** before deploy is considered complete |
| 9.16 | **`deploy.sh --verify-only` shows 5/6 on admin** — this is expected (SM Task not on admin site) |
| 9.17 | **Never grep for React component names in production bundles** — Vite minifies them. Grep for unique string literals |
| 9.18 | **Medplum v5.x ignores env vars for database/redis config** — `medplum/medplum.config.json` is rendered at deploy time (Phase 2.5) from `secrets/medplum_db_password` + `secrets/medplum_redis_password`. Never hand-edit. |
| 9.19 | **Setup wizard must be suppressed on every new site** — `frappe.db.set_single_value('System Settings', 'setup_complete', 1)` |
| 9.20 | **Non-installable apps in apps.txt cause total Frappe outage** — `ModuleNotFoundError` on startup |
| 9.21 | **`.env.poc` is RETIRED (SEC-004)** — encrypted archive at `/home/ops/backups/env-poc-archive-20260421.gpg`. Non-secret runtime config now lives in `config.prod.env` (VPS-local, gitignored). Secrets are in Infisical. |
| 9.22 | **Never commit any of:** `.env`, `.env.poc`, `config.prod.env`, `medplum/medplum.config.json`, `secrets/*`, `.infisical-*`. All are in `.gitignore`. |

### Routing — Three Distinct Hosts

| Host | Routes to |
|------|-----------|
| `poc-dev.sparkmojo.com` | Frappe Desk only — no `/api/modules/` |
| `poc-dev.app.sparkmojo.com` | Abstraction layer module routes |
| `api.poc.sparkmojo.com` | Webhook routes only |

### Deploy Phases

| Phase | Name | What |
|-------|------|------|
| 0 | Pre-flight | Verify directory, Docker, Frappe running |
| 1 | Pull | `git pull origin main` |
| 2 | Sync | docker cp + pip install SM apps into ALL containers |
| 3 | Migrate | `bench --site [all sites] migrate` |
| 4 | Restart | Restart Frappe backend + workers |
| 5 | API | Build + restart abstraction layer |
| 6 | Frontend | Build + restart frontend (no-cache, hash verify) |
| 7 | Verify | End-to-end checks (6+ tests) |

---

## 10. GIT & WORKFLOW RULES

| # | Rule |
|---|------|
| 10.1 | **Commit prefixes:** `feat:`, `chore:`, `fix:`, `docs:`, `test:`, `infra:` |
| 10.2 | **Story/feature work uses PRs on feature branches** — direct-to-main only for deploy/infra/docs |
| 10.3 | **Always push feature branches to origin** — `git push origin <branch-name>` (mandatory Ralph rule) |
| 10.4 | **Slack alert webhook fires on direct push to main** — enforces PR process |
| 10.5 | **Commit messages from story specs are verbatim** — Ralph copies exactly |
| 10.6 | **COMPLETE marker files:** `touch BILL-NNN-COMPLETE` after story verification passes |
| 10.7 | **BLOCKED files:** `BLOCKED-[STORY-ID].md` when dependencies missing or architecture ambiguous |
| 10.8 | **Branch naming:** `story/BILL-NNN-description` for feature branches |
| 10.9 | **Story sizing:** S (1-3 files), M (3-6 files), L (5-8 files). No story exceeds L. More than 8 files = two stories |

---

## 11. AGENT ROLE BOUNDARIES (Immutable)

| Agent | May Read GitHub | May Write GitHub | Constraints |
|-------|----------------|-----------------|-------------|
| **Claude Chat** | Yes (via MCP) | **NO — NEVER** | Produces content only. Does NOT commit under ANY circumstances. No exceptions for mechanical updates |
| **Claude CoWork** | Yes | Yes | Primary committer. Git ops, SSH, VPS, doc sync |
| **Ralph (Claude Code)** | Yes | Yes — story branches only | Never commit directly to main. Never modify CLAUDE.md, hats.yml, PROMPT.md during build |

---

## 12. TESTING & VERIFICATION RULES

| # | Rule |
|---|------|
| 12.1 | **Frontend gates:** `pnpm run lint` (0 warnings, 0 errors), `pnpm run test` (0 failures), `pnpm run build` (succeeds) |
| 12.2 | **Abstraction layer:** `pytest tests/ -v` (0 failures), coverage >= 70% (new code >= 80%) |
| 12.3 | **Frappe:** `bench --site [site] migrate` must exit 0 |
| 12.4 | **Smoke test:** `scripts/smoke_test.sh` checks all 4 sites (16 checks total) |
| 12.5 | **Minimum 12 test cases per controller story** covering happy path, validation, edge cases |
| 12.6 | **No test file deleted to make coverage pass** |
| 12.7 | **No regressions in smoke_test.sh** (16/16 checks) after changes |
| 12.8 | **Patch idempotency:** Every patch safe to run twice with no error on second run |
| 12.9 | **VPS verification steps run on live site** after deployment — exact commands in story spec |
| 12.10 | **Design system pre-commit checklist** for any story touching `frontend/src/`: no hardcoded hex, no Tailwind color classes, component in /library, `COMPONENT_INVENTORY.md` updated, all `var(--sm-*)` references resolve, build passes |

---

## 13. PROCESS & LIFECYCLE RULES

| # | Rule |
|---|------|
| 13.1 | **Feature Development Lifecycle has 8 steps — no skipping:** Strategy → Business Research → Business Definition → Technical Research → Spike/Build Gate → Story Decomposition + Prep Run → Overnight Build → Morning Verification + Sign-off |
| 13.2 | **Prep Run MUST execute before every overnight build** — no exceptions |
| 13.3 | **Nothing enters Claude Code queue without passing Definition of Shippable Story checklist** |
| 13.4 | **Stories run in series** — one at a time, fully verified before next |
| 13.5 | **Dependencies first** — Story B only after Story A is fully verified |
| 13.6 | **No story enters overnight queue without a TEST-SPEC** |
| 13.7 | **KB artifacts run in same queue after code stories** — never deferred |
| 13.8 | **Ralph loop:** PLAN (day) → QUEUE (end of day) → BUILD (overnight) → TEST (morning, James) → REVIEW → repeat |

---

## 14. STORY QUALITY RULES

| # | Rule |
|---|------|
| 14.1 | **Single responsibility** — does exactly one thing, title has no "and" |
| 14.2 | **Vertically sliced** — thin but complete across all layers. Not "build DocType" or "build API" alone |
| 14.3 | **INVEST compliant:** Independent, Negotiable (all decisions resolved before queue), Valuable, Estimable, Small, Testable |
| 14.4 | **Given/When/Then acceptance criteria** — prose checklists not acceptable |
| 14.5 | **NOT IN SCOPE section mandatory** — cannot be "Not applicable" |
| 14.6 | **Dependencies explicit** — dependent story IDs listed, appear earlier in queue |
| 14.7 | **Files to read listed** — every file agent needs, absolute path |
| 14.8 | **Story type classified** — API/Infrastructure, Internal Tool, or Client-facing |
| 14.9 | **Commit message pre-written** — Ralph uses verbatim |
| 14.10 | **Design system compliance section** filled out for any frontend story |
| 14.11 | **Foolproof test:** "Could Ralph build this without asking architecture questions?" If no → not ready |

---

## 15. KNOWLEDGE BASE ARTIFACT RULES

### Required Artifacts by Story Type

| Story Type | Required |
|-----------|----------|
| API/Infrastructure | DEPLOYMENT.md + DEFICIENCIES.md + EXTENSION-ROADMAP.md |
| Internal Tool | DEPLOYMENT.md + INTERNAL-PLAYBOOK.md + FAQ.md + DEFICIENCIES.md + EXTENSION-ROADMAP.md |
| Client-facing | DEPLOYMENT.md + INTERNAL-PLAYBOOK.md + USER-GUIDE.md + FAQ.md + DEFICIENCIES.md + EXTENSION-ROADMAP.md |

| # | Rule |
|---|------|
| 15.1 | **All KB artifacts at:** `sparkmojo-internal/platform/knowledge-base/[CAPABILITY]/[STORY-ID]-[slug]/` |
| 15.2 | **Verbosity standard:** Fifth-grader readable, 100x the detail you think needed — this is a build gate |
| 15.3 | **DEFICIENCIES.md must be brutally honest** — what was cut, what edge cases unhandled, what breaks under load, what was stubbed, technical debt incurred |
| 15.4 | **USER-GUIDE.md requires:** minimum 10 real-world use case scenarios, minimum 20 FAQ questions from confused first-time user |
| 15.5 | **FAQ.md requires:** minimum 20 questions per applicable section (end user + admin/support) |

---

## 16. DEFINITION OF DONE (Story-Level)

ALL must be true:

- [ ] Prep Run GO from Spec Validator
- [ ] TEST-SPEC-[STORY-ID].md exists
- [ ] All tests pass (pytest, coverage >= 80% on new code)
- [ ] No test file deleted to make coverage pass
- [ ] UI verified — manual browser walkthrough on VPS (frontend stories)
- [ ] VPS verified — verification steps run on live site
- [ ] Merged to main
- [ ] Deployed via deploy.sh
- [ ] KB artifacts committed
- [ ] MOJO_REGISTRY.md updated (if Mojo added/changed)
- [ ] Endpoints registered in MOJO_REGISTRY.md
- [ ] CREDENTIALS.md updated (if new env vars)
- [ ] No outstanding BLOCKED-*.md files for this story
- [ ] No regressions in smoke_test.sh (16/16)

---

## 17. CAPABILITY CLASSIFICATION RULES

| Tier | Definition | Example |
|------|-----------|---------|
| **KERNEL** | Always present, cannot be disabled. Platform non-functional without it | Auth, CRM, Workflows |
| **CORE** | Cross-industry, optional. Same capability serves all verticals unmodified | Billing & Payments, Wiki |
| **INDUSTRY** | Domain-specific. Installed only for that vertical | Healthcare Billing, Clinical Records |
| **ADMIN** | Spark Mojo internal infrastructure. Never visible to clients | Provisioning, Platform Billing |

### Registry Rules

- A Mojo added to MOJO_REGISTRY.md ONLY when it has: (1) React component, (2) API endpoints wired, (3) Passing acceptance criteria
- CURRENT_SPRINT.md and Trello always synced by CoWork at end-of-session
- Deferred stories go to BACKLOG.md with context before session end

---

## 18. PROVISIONING RULES

| # | Rule |
|---|------|
| 18.1 | **POST /api/admin/sites/create** is the single provisioning call (5-min target) |
| 18.2 | **site_subdomain:** alphanumeric + hyphens, max 32 chars, no start/end with hyphen |
| 18.3 | **Vertical templates:** YAML-defined starting points (behavioral_health, general_smb) |
| 18.4 | **Bench selection:** Auto-select by utilization (capacity_threshold: 60 for hipaa, 100 for standard) |
| 18.5 | **HIPAA sites:** encryption_key must be 64-char hex |
| 18.6 | **Traefik routing is manual** — provisioning logs the requirement but does NOT modify docker-compose.poc.yml |
| 18.7 | **SM Site Registry is authoritative** per-client record (apps, medplum_project_id, n8n_workspace_ref, feature_flags) |

---

## 19. ANTI-PATTERNS (Explicit "Never Do This")

| # | Anti-Pattern |
|---|-------------|
| 19.1 | **Never route interactive UI requests through n8n** — n8n is for background/cross-system only |
| 19.2 | **Never use `frappe.db.set_value()`** — use `get_doc().save()` |
| 19.3 | **Never put behavioral-health-specific logic in kernel/core** — use feature flags in vertical template |
| 19.4 | **Never store secrets in code or Mojo UI** — vault references only |
| 19.5 | **Never run `bench get-app` on VPS for ecosystem apps** — they go in `Dockerfile.frappe` |
| 19.6 | **Never modify apps.txt directly** — use `tabInstalled Application` for SM apps |
| 19.7 | **Never `docker compose restart` as deployment** — always `deploy.sh` |
| 19.8 | **Never use GitHub MCP subagents for STATUS_BOARD.html** — they hallucinate new HTML |
| 19.9 | **Never run `git pull` manually on VPS** — always deploy.sh |
| 19.10 | **Never skip the Prep Run before overnight builds** |
| 19.11 | **Never delete BLOCKED-*.md files** — James must manually resolve then archive |
| 19.12 | **Never commit any host-local secret/config file** — `.env`, `.env.poc`, `config.prod.env`, `medplum.config.json`, `secrets/*`, `.infisical-*` are all gitignored |
| 19.13 | **Never use `class` for Tailwind dark mode** — use `['selector', '[data-theme="dark"]']` |

---

## 20. CONTAINER REFERENCE

### Frappe Stack (`frappe-poc` compose)

| Container | Name |
|-----------|------|
| Backend (bench) | `frappe-poc-backend-1` |
| Frontend (nginx) | `frappe-poc-frontend-1` |
| Database | `frappe-poc-db-1` |
| Scheduler | `frappe-poc-scheduler-1` |

### Platform Stack (`spark-mojo-platform` compose)

| Container | Name |
|-----------|------|
| FastAPI | `spark-mojo-platform-poc-api-1` |
| React frontend | `spark-mojo-platform-poc-frontend-1` |
| Medplum server | `spark-mojo-platform-medplum-1` |

### Four Live Sites

| Site | Frappe Name | Type |
|------|-------------|------|
| Admin | admin.sparkmojo.com | admin |
| POC/Dev | poc-dev.sparkmojo.com | dev |
| SM Internal | internal.sparkmojo.com | internal |
| Willow | willow.sparkmojo.com | behavioral_health |

---

*~200 discrete rules across 20 categories. Sourced from CLAUDE.md, PLATFORM-GUARDRAILS.md, WORKING_AGREEMENT.md, PROCESS.md, STORY_TEMPLATE.md, all DECISION-NNN files, feature specs, story specs, and codebase patterns.*

*Last generated: April 7, 2026*
