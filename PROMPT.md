# Spark Mojo — Three-Site Topology Build
# Overnight Task Queue — INFRA-001 through INFRA-007

## Context
This build implements the three-site topology defined in DECISION-016 and DECISION-017.
Read CLAUDE.md before starting. Read the story spec for each INFRA story before working it.
All governance docs are in the sparkmojo-internal repo at:
  /Users/jamesilsley/GitHub/sparkmojo-internal/

All story specs are at:
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/

## Rules
- Work stories in the order listed. Do not start the next story until the current one has a COMPLETE marker.
- Each story gets its own branch: `git checkout -b infra/INFRA-NNN-description`
- Read the full story spec before writing a single line of code.
- Run ALL quality gates before marking a story complete.
- If any gate fails: fix it. Do not skip gates.
- If a decision is ambiguous or conflicts with the story spec: write BLOCKED-INFRA-NNN.md and move to the next story.
- Deploy to POC VPS after each story that touches Python or shell: `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'`

## Story Queue

### INFRA-001 — Provision admin.sparkmojo.com
Branch: `infra/INFRA-001-admin-site`
Type: Infrastructure (bench + shell)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-001-provision-admin-site.md
Gates: See spec Definition of Done — 5 checks, all must pass.
No code files to commit — this is server-side provisioning. Commit a PROVISIONING_LOG.md entry.

### INFRA-002 — SM Site Registry DocType
Branch: `infra/INFRA-002-sm-site-registry`
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-002-sm-site-registry-doctype.md
Gates: bench migrate exit 0 + DocType exists + seed record present + JSON validation works + directory structure correct.

### INFRA-003 — Abstraction Layer DocType Registry
Branch: `infra/INFRA-003-doctype-registry`
Type: Python FastAPI
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-003-abstraction-layer-doctype-registry.md
Gates: All existing pytest pass + new test_registry.py (6 tests) pass + coverage ≥70% + health endpoint ok after deploy.

### INFRA-004 — sm_admin Service Account
Branch: `infra/INFRA-004-admin-service-account`
Type: Frappe / Python
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-004-sm-admin-service-account.md
Gates: Script exists + syntax valid + Role JSON exists + tests pass.

### INFRA-005 — register_sm_apps.py
Branch: `infra/INFRA-005-register-sm-apps`
Type: Python script
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-005-register-sm-apps-script.md
Gates: Script exists at correct path + syntax valid + --help works in container + tests pass.

### INFRA-006 — deploy.sh Site Registry Loop
Branch: `infra/INFRA-006-deploy-site-loop`
Type: Shell
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-006-deploy-sh-site-registry-loop.md
Gates: deploy.sh --verify-only passes + Phase 3 runs without error + fallback works + LEGACY_SITES in .env.example.

### INFRA-007 — Three-Site Topology Build
Branch: `infra/INFRA-007-three-site-topology`
Type: Infrastructure
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-007-three-site-topology-build.md
Gates: All 4 sites in bench list-sites + all 4 in SM Site Registry + smoke_test.sh passes + deploy --verify-only passes + frontend site renamed.

## Completion
When all stories have COMPLETE markers or BLOCKED files:
1. Write QUEUE-COMPLETE.md in repo root with:
   - Stories completed: list with branch names
   - Stories blocked: list with reason summary
   - Smoke test result: pass/fail
   - Any notes for James
2. Print: LOOP_COMPLETE
