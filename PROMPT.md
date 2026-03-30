# Spark Mojo — Three-Site Topology Build
# Overnight Task Queue — INFRA-001 through INFRA-007

## Pre-flight: Credentials Required

Before this run starts, the following environment variables must be exported in the terminal session:

  SM_MARIADB_ROOT_PASSWORD   — from Bitwarden: "VPS — MariaDB Root"
  SM_ADMIN_SITE_PASSWORD     — from Bitwarden: "Site — admin.sparkmojo.com"
  SM_INTERNAL_SITE_PASSWORD  — from Bitwarden: "Site — internal.sparkmojo.com"
  SM_WILLOW_SITE_PASSWORD    — from Bitwarden: "Site — willow.sparkmojo.com"

If any of these are empty or unset, write BLOCKED-CREDENTIALS.md and stop immediately.
Do not attempt to provision any site without these values.
See: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/CREDENTIALS.md

## Context

This build implements the three-site topology defined in DECISION-016 and DECISION-017.
Read CLAUDE.md before starting. Read the story spec for each INFRA story before working it.

Governance repo (local): /Users/jamesilsley/GitHub/sparkmojo-internal/
Story specs: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/
Credentials doc: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/CREDENTIALS.md
Provisioning runbook: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/architecture/PROVISIONING_RUNBOOK.md

## Rules

- Check that all required env vars are set FIRST, before any other work.
- Work stories in the order listed. Do not start the next story until the current one has a COMPLETE marker.
- Each story gets its own branch: `git checkout -b infra/INFRA-NNN-description`
- Read the full story spec before writing a single line of code.
- Run ALL quality gates before marking a story complete.
- If any gate fails: fix it. Do not skip gates.
- If a decision is ambiguous: write BLOCKED-INFRA-NNN.md and move to the next story.
- Deploy to POC VPS after each story that touches Python or shell.
- When provisioning generates a password (sm_admin accounts): print it clearly to the log with the label "STORE IN BITWARDEN: [entry name] = [password]". James will store it manually.

## Story Queue

### INFRA-001 — Provision admin.sparkmojo.com
Branch: `infra/INFRA-001-admin-site`
Type: Infrastructure (bench + shell)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-001-provision-admin-site.md
Uses: SM_MARIADB_ROOT_PASSWORD, SM_ADMIN_SITE_PASSWORD
Gates: 5 checks in spec Definition of Done — all must pass.

### INFRA-002 — SM Site Registry DocType
Branch: `infra/INFRA-002-sm-site-registry`
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-002-sm-site-registry-doctype.md
Gates: bench migrate + DocType exists + seed record + JSON validation + directory structure.

### INFRA-003 — Abstraction Layer DocType Registry
Branch: `infra/INFRA-003-doctype-registry`
Type: Python FastAPI
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-003-abstraction-layer-doctype-registry.md
Gates: existing pytest pass + test_registry.py (6 tests) + coverage ≥70% + health ok after deploy.

### INFRA-004 — sm_admin Service Account
Branch: `infra/INFRA-004-admin-service-account`
Type: Frappe / Python
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-004-sm-admin-service-account.md
Gates: script exists + syntax valid + Role JSON exists + tests pass.

### INFRA-005 — register_sm_apps.py
Branch: `infra/INFRA-005-register-sm-apps`
Type: Python script
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-005-register-sm-apps-script.md
Gates: script exists + syntax valid + --help works in container + tests pass.

### INFRA-006 — deploy.sh Site Registry Loop
Branch: `infra/INFRA-006-deploy-site-loop`
Type: Shell
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-006-deploy-sh-site-registry-loop.md
Gates: deploy.sh --verify-only passes + Phase 3 runs + LEGACY_SITES in .env.example.

### INFRA-007 — Three-Site Topology Build
Branch: `infra/INFRA-007-three-site-topology`
Type: Infrastructure
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/INFRA-007-three-site-topology-build.md
Uses: SM_MARIADB_ROOT_PASSWORD, SM_INTERNAL_SITE_PASSWORD, SM_WILLOW_SITE_PASSWORD
Gates: all 4 sites in bench + all 4 in SM Site Registry + smoke_test.sh passes + deploy verify passes.
Note: When sm_admin account passwords are generated, print each clearly:
  STORE IN BITWARDEN: sm_admin — [site-name] = [generated-password]

## Completion

When all stories have COMPLETE markers or BLOCKED files:
1. Write QUEUE-COMPLETE.md at repo root with:
   - Stories completed: list with branch names
   - Stories blocked: list with reason summary
   - Smoke test result: pass/fail
   - Any Bitwarden entries that need manual storage (sm_admin passwords)
   - Notes for James
2. Print: LOOP_COMPLETE
