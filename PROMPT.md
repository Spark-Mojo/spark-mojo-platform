# Overnight Task Queue — Session 25
# Started: April 5, 2026
## How to Use This File
Work stories in priority order. Each story gets its own branch for code stories.
Documentation and research stories commit directly to main in sparkmojo-internal.
For each story:
1. Read the story spec at the absolute path shown
2. Read CLAUDE.md for conventions and gotchas
3. Determine story type from the spec (code / documentation / research)
4. For CODE stories: create branch, build, run gates, commit
5. For DOCUMENTATION stories: read actual committed code + story spec,
   write artifacts to sparkmojo-internal, commit, no branch needed
6. For RESEARCH stories: conduct research per spec instructions,
   write research documents to sparkmojo-internal, commit, no branch needed
7. Run all quality gates appropriate to story type (see CLAUDE.md)
8. If ambiguous on any architectural decision: write BLOCKED-[STORY-ID].md and
   move to next story. Never improvise on architecture.
## Absolute Paths Reference
| What | Path |
|------|------|
| This repo | /Users/jamesilsley/GitHub/spark-mojo-platform/ |
| Governance repo | /Users/jamesilsley/GitHub/sparkmojo-internal/ |
| Story files | /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ |
| Knowledge base output | /Users/jamesilsley/GitHub/sparkmojo-internal/platform/knowledge-base/ |
| Research output | /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/ |
| CLAUDE.md | /Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md |
| PROCESS.md | /Users/jamesilsley/GitHub/sparkmojo-internal/platform/PROCESS.md |
## Routing Reference (CRITICAL - read before any VPS test)
- poc-dev.sparkmojo.com — Frappe Desk ONLY. Never use for API tests.
- poc-dev.app.sparkmojo.com — Module routes: /api/modules/billing/...,
  /api/modules/clinical/..., /api/modules/provisioning/...
- api.poc.sparkmojo.com — Webhook routes: /api/webhooks/stedi/835, etc.
## Story Queue
---
### STORY 1: BILL-005 — Real-time eligibility check endpoint
Type: CODE
Branch: story/bill-005-eligibility-check
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-005-eligibility-check.md
Files to create/modify:
- abstraction-layer/connectors/stedi.py (add check_eligibility method)
- abstraction-layer/routes/billing.py (add eligibility endpoints)
- abstraction-layer/tests/ (add eligibility tests)
Quality gates (ALL must pass before BILL-005-COMPLETE):
1. pytest tests/ -v — 0 failures
2. pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70
3. Eligibility endpoint reachable:
   curl -s poc-dev.app.sparkmojo.com/api/modules/billing/eligibility/check
   Expected: any response from the app (not Traefik 404)
---
### STORY 2: STORY-018 — Patient and Appointment FHIR R4 resources
Type: CODE
Branch: story/story-018-medplum-phase1-fhir-resources
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-018-medplum-phase1-fhir-resources.md
Files to create/modify:
- abstraction-layer/connectors/medplum.py (add Patient + Appointment methods)
- abstraction-layer/routes/clinical.py (NEW FILE - do not add to billing.py)
- abstraction-layer/main.py (register clinical router)
- abstraction-layer/tests/ (add clinical tests)
Quality gates (ALL must pass before STORY-018-COMPLETE):
1. pytest tests/ -v — 0 failures
2. pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70
3. Clinical endpoint reachable:
   curl -s "poc-dev.app.sparkmojo.com/api/modules/clinical/patients?tenant_site=invalid"
   Expected: 422 from app (not Traefik 404)
4. clinical.py exists as a separate file - verify billing.py has no clinical routes
---
### STORY 3: KB-001 — Knowledge base for Provisioning
Type: DOCUMENTATION
Branch: none - commit directly to sparkmojo-internal main
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/KB-001-provisioning-knowledge-base.md
Output path: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/knowledge-base/provisioning/PROV-001-provisioning-api/
Read before writing:
- The story spec (above)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/PROV-001-provisioning-api.md
- /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/ (provisioning routes)
- /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_provisioning/ (entire app)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/provisioning/templates/
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-026-client-provisioning-architecture.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-024-bench-topology.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/PROCESS.md (verbosity standard)
Files to create:
- DEPLOYMENT.md
- INTERNAL-PLAYBOOK.md
- FAQ.md (minimum 20 admin questions)
- DEFICIENCIES.md (brutal honest assessment - read the actual code)
- EXTENSION-ROADMAP.md
Quality gates (ALL must pass before KB-001-COMPLETE):
1. All 5 files exist at output path
2. Each file is non-empty (minimum 500 words each)
3. DEFICIENCIES.md contains specific file/function references, not generic statements
4. FAQ.md contains minimum 20 numbered questions with answers
---
### STORY 4: KB-002 — Knowledge base for Billing Infrastructure
Type: DOCUMENTATION
Branch: none - commit directly to sparkmojo-internal main
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/KB-002-billing-infrastructure-knowledge-base.md
Output path: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/knowledge-base/billing/billing-infrastructure/
Read before writing:
- The story spec (above)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-001-sm-billing-app-scaffold.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-002-core-billing-doctypes.md
- /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/ (entire app)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-027-billing-architecture.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/PROCESS.md (verbosity standard)
Files to create:
- DEPLOYMENT.md
- DEFICIENCIES.md (specific DocType names and field names)
- EXTENSION-ROADMAP.md
Quality gates:
1. All 3 files exist at output path
2. Each file is non-empty (minimum 300 words each)
3. DEFICIENCIES.md references specific DocType names
---
### STORY 5: KB-003 — Knowledge base for Billing Pipeline
Type: DOCUMENTATION
Branch: none - commit directly to sparkmojo-internal main
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/KB-003-billing-pipeline-knowledge-base.md
Output path: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/knowledge-base/billing/billing-pipeline/
Read before writing:
- The story spec (above)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-003-stedi-claim-submission.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-004-era-835-processing.md
- /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/billing.py
- /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/connectors/stedi.py
- /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_era/
- /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_denial/
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-011-stedi-clearinghouse-connector.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/PROCESS.md (verbosity standard)
Files to create:
- DEPLOYMENT.md
- INTERNAL-PLAYBOOK.md
- FAQ.md (minimum 20 admin questions)
- DEFICIENCIES.md (brutally honest - address each item in story spec)
- EXTENSION-ROADMAP.md
Quality gates:
1. All 5 files exist at output path
2. INTERNAL-PLAYBOOK.md documents every claim state transition explicitly
3. DEFICIENCIES.md addresses ERA atomicity, large ERA TODO, duplicate webhook
   handling - by file and function name
4. FAQ.md minimum 20 questions
---
### STORY 6: KB-004 — Knowledge base for Clinical Layer Infrastructure
Type: DOCUMENTATION
Branch: none - commit directly to sparkmojo-internal main
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/KB-004-clinical-layer-knowledge-base.md
Output path: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/knowledge-base/clinical/clinical-layer-infrastructure/
Read before writing:
- The story spec (above)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-014-medplum-docker-service.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-015-medplum-abstraction-layer-connector.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-016-medplum-project-provisioning.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-017-medplum-client-application.md
- /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/connectors/medplum.py
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-020-medplum-fhir-clinical-layer.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-028-medplum-multi-tenancy.md
- /Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md (Medplum gotchas section)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/PROCESS.md (verbosity standard)
Files to create:
- DEPLOYMENT.md (must include both CLAUDE.md Medplum gotchas verbatim)
- INTERNAL-PLAYBOOK.md
- FAQ.md (minimum 20 admin questions)
- DEFICIENCIES.md (address backup/persistence and OOM risk specifically)
- EXTENSION-ROADMAP.md
Quality gates:
1. All 5 files exist at output path
2. DEPLOYMENT.md contains both Medplum gotchas from CLAUDE.md
3. DEFICIENCIES.md addresses persistence/backup question with specific findings
4. FAQ.md minimum 20 questions
---
### STORY 7: KB-005 — Knowledge base for WorkboardMojo MVP
Type: DOCUMENTATION
Branch: none - commit directly to sparkmojo-internal main
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/KB-005-workboardmojo-knowledge-base.md
Output path: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/knowledge-base/task-workboard/workboardmojo-mvp/
Read before writing:
- The story spec (above)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-003.md through STORY-013.md
- /Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/components/mojos/ (all Mojo components)
- /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/ (task routes)
- /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_widgets/ (SM Task DocType)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/MOJO_REGISTRY.md (entry #4)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/BACKLOG.md (TW-D01 through TW-D09)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/PROCESS.md (verbosity standard,
  USER-GUIDE.md requirements - fifth-grader readable, click by click)
Files to create:
- DEPLOYMENT.md
- INTERNAL-PLAYBOOK.md
- USER-GUIDE.md (minimum 10 real-world scenario walkthroughs, click by click,
  "You will see..." language throughout, minimum 20 FAQ questions)
- FAQ.md (minimum 20 end user questions AND minimum 20 admin questions)
- DEFICIENCIES.md (reference specific React component names and API endpoints)
- EXTENSION-ROADMAP.md (reference all TW-D backlog items by ID)
Quality gates:
1. All 6 files exist at output path
2. USER-GUIDE.md contains minimum 10 numbered scenario walkthroughs
3. USER-GUIDE.md uses "You will see..." and "Click..." language - verify with grep
4. FAQ.md has two clearly labeled sections with minimum 20 questions each
5. DEFICIENCIES.md references specific component file names
6. EXTENSION-ROADMAP.md references TW-D01 through TW-D09 by ID
---
### STORY 8: RESEARCH-BILL-006 — Claim lifecycle state machine research
Type: RESEARCH
Branch: none - commit directly to sparkmojo-internal main
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/RESEARCH-BILL-006-claim-lifecycle.md
Output paths:
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILL-006-claim-lifecycle-business-requirements.md
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILL-006-claim-lifecycle-technical-research.md
Read before writing:
- The story spec (above)
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-004-era-835-processing.md
- /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/sm_claim.json
- /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/billing.py
- /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-027-billing-architecture.md
Research approach:
- Use web search to research billing platform claim state models (Kareo,
  AdvancedMD, CollaborateMD, Waystar, Availity)
- Research billing coordinator workflows on forums and support threads
- Research Frappe Workflow engine documentation
- Research X12 EDI claim status codes and lifecycle standards
- Be verbose, specific, and opinionated. Cite sources where possible.
- Write so the next Claude Chat session can write BILL-006 story specs directly
  from these documents without additional research.
Quality gates:
1. Both files exist at output paths
2. Business requirements document is minimum 2000 words
3. Technical research document is minimum 1500 words and includes a clear
   recommendation on Frappe state machine implementation approach
4. Both documents answer all questions listed in the story spec
---
## Completion
When all stories complete or are blocked:
1. Write RUN-SUMMARY-SESSION-25.md at repo root of spark-mojo-platform with:
   - Each story ID and result (COMPLETE / BLOCKED / FAILED)
   - Test counts for code stories
   - File counts for documentation stories
   - Any BLOCKED files written and why
2. Output: LOOP_COMPLETE
---