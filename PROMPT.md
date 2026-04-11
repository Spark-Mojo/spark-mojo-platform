# Fix Run — Session 42
# Generated: Session 41 Morning Verification, April 11 2026
## How to Use This File
Work stories in priority order. Each story gets its own branch except
infra stories (FIX-41-003) which execute directly on VPS.
For each story:
1. Check for COMPLETE marker (e.g. FIX-41-001a-COMPLETE). If exists, skip.
2. Check for BLOCKED marker (e.g. BLOCKED-FIX-41-001a.md). If exists, skip.
3. Check dependencies - all dependency COMPLETE markers must exist.
4. Read full story spec from the Spec path below.
5. Read CLAUDE.md for conventions.
6. Build exactly what the spec says - nothing more.
7. Run all quality gates listed in the spec.
8. If architectural ambiguity: write BLOCKED-[ID].md and move on.
## Retry Policy
After 5 consecutive failures on a story, write BLOCKED and move on.
## Story Queue
### FIX-41-001a - `story/fix-41-001a-bill011-route`
Register missing 277CA webhook route (BILL-011).
Type: Python FastAPI
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-001a-bill011-webhook-route.md
Dependencies: None
### FIX-41-001b - `story/fix-41-001b-bill018-route`
Register missing appeals transition route (BILL-018).
Type: Python FastAPI
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-001b-bill018-appeals-route.md
Dependencies: None
### FIX-41-001c - `story/fix-41-001c-bill020-route`
Register missing AR aging route (BILL-020).
Type: Python FastAPI
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-001c-bill020-ar-aging-route.md
Dependencies: None
### FIX-41-001d - `story/fix-41-001d-bill021-wildcard`
Move denials/analytics route above {name} wildcard (BILL-021).
Type: Python FastAPI
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-001d-bill021-wildcard-fix.md
Dependencies: None
### FIX-41-002 - `story/fix-41-002-test-auth-fixture`
Add auth fixture to conftest.py, fix 26 test_tasks.py failures.
Type: Python FastAPI (test infrastructure)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-002-test-auth-fixture.md
Dependencies: None
### FIX-41-003 - `no-branch (VPS infra)`
Fix Google OAuth host_name misconfiguration on poc-dev site.
Type: VPS Infrastructure
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-003-oauth-hostname.md
Dependencies: None
### FIX-41-005a - `story/fix-41-005a-kb-billing-a`
KB artifacts for BILL-011, BILL-012, BILL-014, BILL-015.
Type: Documentation (sparkmojo-internal)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-005a-kb-bill011-to-bill015.md
Dependencies: None
### FIX-41-005b - `story/fix-41-005b-kb-billing-b`
KB artifacts for BILL-017, BILL-018, BILL-019, BILL-020, BILL-021.
Type: Documentation (sparkmojo-internal)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-41-005b-kb-bill017-to-bill021.md
Dependencies: None
## Completion
When all 8 stories are COMPLETE or BLOCKED:
1. Write QUEUE-COMPLETE.md summarizing results.
2. Output: LOOP_COMPLETE
