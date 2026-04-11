# Fix Run — Session 41
# Generated: Session 41 Morning Verification, April 11 2026
## How to Use This File
Work stories in priority order. Each story gets its own branch (code stories) 
or executes directly (infra stories). For each story:
1. Check for COMPLETE marker (e.g., FIX-41-001-COMPLETE). If exists, skip.
2. Check for BLOCKED marker (e.g., BLOCKED-FIX-41-001.md). If exists, skip.
3. Check dependencies — all dependency COMPLETE markers must exist first.
4. Read full story spec below.
5. Read CLAUDE.md for conventions.
6. Build exactly what the spec says — nothing more.
7. Run all quality gates.
8. If ambiguous on architecture, write BLOCKED-FIX-41-NNN.md and move on.
9. Commit/deploy/mark complete per story type.
## Retry Policy
After 5 consecutive failures, write BLOCKED and move on.
## Story Queue
### FIX-41-001 — `story/fix-41-001-route-registration`
Wire 4 missing and broken billing routes in the FastAPI abstraction layer.
Type: Python FastAPI
Dependencies: None
### FIX-41-002 — `story/fix-41-002-test-auth-fixture`
Add authenticated test client fixture to conftest.py. Fixes all 26 test_tasks.py auth failures.
Type: Python FastAPI (test infrastructure)
Dependencies: None
### FIX-41-003 — `story/fix-41-003-oauth-hostname`
Fix Frappe host_name misconfiguration on poc-dev site causing Google OAuth redirect loop.
Type: VPS Infrastructure — no git commit
Dependencies: None
### FIX-41-004 — `story/fix-41-004-dual-frontend-cleanup`
Stop stale frappe-poc-frontend-1 container after confirming no active Traefik routing.
Type: VPS Infrastructure — no git commit
Dependencies: FIX-41-003
### FIX-41-005 — `story/fix-41-005-kb-artifacts`
Author KB artifacts for 10 stories missing from last night's run. Commit to sparkmojo-internal.
Type: Documentation
Dependencies: None
---
## Story Specs
### FIX-41-001: Route Registration and Wildcard Fix
**Problem:** 4 billing routes returning 404 or wrong handler:
- `/api/modules/billing/webhooks/277ca` — 404
- `/api/modules/billing/appeals/transition` — 404
- `/api/modules/billing/ar/aging` — 404
- `/api/modules/billing/denials/analytics` — caught by `denials/{name}` wildcard
**Steps:**
1. Explore the abstraction layer structure. Find the main router file and all
   billing sub-router files. Start at `abstraction-layer/main.py` or equivalent.
2. For each missing route diagnose first:
   - Is handler code present but sub-router not mounted?
   - Is the route missing from the sub-router file entirely?
   - Is the route present but below a wildcard (BILL-021 case)?
3. Fix each:
   - BILL-011 `/api/modules/billing/webhooks/277ca`:
     If handler exists but sub-router not mounted, mount it.
     If handler is missing entirely, create it per spec at:
     /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-011-277ca-webhook-handler.md
   - BILL-018 `/api/modules/billing/appeals/transition`:
     Same pattern. Find handler, ensure route registered in router.
   - BILL-020 `/api/modules/billing/ar/aging`:
     Find the AR router. Add endpoint if missing. Ensure router mounted.
   - BILL-021 `/api/modules/billing/denials/analytics`:
     In the denials router file, the `analytics` route MUST be defined BEFORE
     any `/{name}` wildcard route. Move or add it above the wildcard.
4. Fast gate after each fix:
   docker exec spark-mojo-platform-poc-api-1 python -m pytest tests/ -x -q --tb=short 2>&1 | tail -10
5. Full gate (all 4 fixed):
   docker exec spark-mojo-platform-poc-api-1 python -m pytest tests/ -q --tb=no 2>&1 | tail -5
   PASS: 0 failures outside test_tasks.py (the 26 task failures are expected, fixed in FIX-41-002)
6. Smoke all 4 routes FROM VPS:
   curl -s -w "\nHTTP:%{http_code}" -X POST https://api.poc.sparkmojo.com/api/modules/billing/webhooks/277ca \
     -H "Content-Type: application/json" \
     -d '{"stedi_transaction_id":"TEST","claim_control_number":"NONEXISTENT","stc_category":"A1","stc_status":"test"}'
   PASS: HTTP 200 with status:warning (claim not found is correct — endpoint exists)
   curl -s -w "\nHTTP:%{http_code}" https://api.poc.sparkmojo.com/api/modules/billing/ar/aging
   PASS: HTTP 200
   curl -s -w "\nHTTP:%{http_code}" https://api.poc.sparkmojo.com/api/modules/billing/denials/analytics
   PASS: HTTP 200 with analytics structure, NOT {"detail":"SM Denial 'analytics' not found"}
   curl -s -w "\nHTTP:%{http_code}" -X POST https://api.poc.sparkmojo.com/api/modules/billing/appeals/transition \
     -H "Content-Type: application/json" \
     -d '{"appeal_id":"NONEXISTENT","new_state":"submitted"}'
   PASS: HTTP 404 or 422 with app-level message (not generic FastAPI route-not-found)
**Commit message:** `fix(billing): register missing routes for BILL-011, BILL-018, BILL-020, fix BILL-021 wildcard order`
**Deploy after merge:** Yes — ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh'
---
### FIX-41-002: test_tasks.py Auth Fixture
**Problem:** All 26 tests in tests/test_tasks.py fail with 401. The ADMIN-001
auth middleware requires X-Admin-Key header. Tests do not send it.
**Steps:**
1. Read existing conftest.py (in abstraction-layer/tests/ or tests/).
   Look for how other passing test files handle auth — e.g., test_billing.py.
   If they also use an unauthenticated client, check if there is an
   ADMIN_SERVICE_KEY set in the test environment.
2. Understand the auth setup from ADMIN-001:
   The middleware checks X-Admin-Key header against ADMIN_SERVICE_KEY env var.
   Options in order of preference:
   a. If a test env ADMIN_SERVICE_KEY exists: add X-Admin-Key header to AsyncClient headers
   b. If not: use app.dependency_overrides to bypass the auth dependency in tests
   c. If neither works: check if there is a test-mode flag in the app config
3. Add authenticated client fixture to conftest.py. Pattern will be something like:
   @pytest.fixture
   def auth_client():
       headers = {"X-Admin-Key": os.getenv("ADMIN_SERVICE_KEY", "test-key")}
       return AsyncClient(app=app, base_url="http://test", headers=headers)
4. Update ALL tests in tests/test_tasks.py to use the auth fixture instead of
   the unauthenticated client. Change the fixture only — do not touch assertions.
5. Fast gate:
   docker exec spark-mojo-platform-poc-api-1 python -m pytest tests/test_tasks.py -v --tb=short 2>&1 | tail -30
   PASS: 0 failures
6. Full gate:
   docker exec spark-mojo-platform-poc-api-1 python -m pytest tests/ -q --tb=no 2>&1 | tail -5
   PASS: 0 failures total
**Commit message:** `fix(tests): add auth fixture to conftest.py, resolve 26 test_tasks.py auth failures`
**Deploy after merge:** Yes — ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh'
---
### FIX-41-003: OAuth host_name Fix (VPS Infrastructure — no git commit)
**Problem:** poc-dev Frappe site has host_name set to poc-dev.app.sparkmojo.com.
Traefik routes that subdomain to the React frontend. Google OAuth redirects land
on the React app instead of Frappe Desk.
**Steps — all via SSH:**
1. Confirm current wrong value:
   ssh sparkmojo 'docker exec frappe-poc-backend-1 bench --site poc-dev.sparkmojo.com config show 2>&1 | grep host_name'
2. Set correct value:
   ssh sparkmojo 'docker exec frappe-poc-backend-1 bench --site poc-dev.sparkmojo.com set-config host_name "https://poc-dev.sparkmojo.com"'
3. Confirm correct value written:
   ssh sparkmojo 'docker exec frappe-poc-backend-1 bench --site poc-dev.sparkmojo.com config show 2>&1 | grep host_name'
   PASS: shows "https://poc-dev.sparkmojo.com"
4. Deploy to restart with new config:
   ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh'
   PASS: exits 0
5. Verify Frappe is reachable:
   curl -s -o /dev/null -w "%{http_code}" https://poc-dev.sparkmojo.com/app
   PASS: 200 or 302
**No git commit.** Touch FIX-41-003-COMPLETE after step 5 passes.
---
### FIX-41-004: Dual Frontend Container Cleanup (VPS Infrastructure — no git commit)
**Problem:** frappe-poc-frontend-1 (8 days old) is running alongside the current
spark-mojo-platform-poc-frontend-1. May be serving stale frontend to some users.
**Steps:**
1. Check Traefik labels on stale container:
   ssh sparkmojo 'docker inspect frappe-poc-frontend-1 --format "{{json .Config.Labels}}" | python3 -m json.tool 2>&1 | grep -i traefik'
2. Decision:
   - NO Traefik labels found: safe to stop. Continue to step 3.
   - Traefik labels found pointing to live domain: write BLOCKED-FIX-41-004.md
     with the label details. Do not stop the container. Mark blocked and move on.
3. If safe to stop:
   ssh sparkmojo 'docker stop frappe-poc-frontend-1'
4. Verify active frontend still works:
   curl -s -o /dev/null -w "%{http_code}" https://app.poc.sparkmojo.com
   PASS: 200
   FAIL: restart frappe-poc-frontend-1 immediately, write BLOCKED-FIX-41-004.md
**No git commit.** Touch FIX-41-004-COMPLETE after step 4 passes.
---
### FIX-41-005: KB Artifacts for 10 Missing Stories
**Work in governance repo:** /Users/jamesilsley/GitHub/sparkmojo-internal/
**Stories and required files:**
BILL-011 → platform/knowledge-base/billing/BILL-011-277ca-webhook/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-012 → platform/knowledge-base/billing/BILL-012-835-era-integration/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-014 → platform/knowledge-base/billing/BILL-014-ai-denial-classification/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-015 → platform/knowledge-base/billing/BILL-015-denial-worklist/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-017 → platform/knowledge-base/billing/BILL-017-appeal-letter-generation/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-018 → platform/knowledge-base/billing/BILL-018-appeal-transitions/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-019 → platform/knowledge-base/billing/BILL-019-ar-summary/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-020 → platform/knowledge-base/billing/BILL-020-ar-aging/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
BILL-021 → platform/knowledge-base/billing/BILL-021-denial-analytics/
  DEPLOYMENT.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
WKBD-001 → platform/knowledge-base/workboard/WKBD-001-task-mode/
  DEPLOYMENT.md, INTERNAL-PLAYBOOK.md, USER-GUIDE.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md
Story specs at: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/
**Quality bar — billing stories (BILL-*):**
- DEPLOYMENT.md: env var checklist, migration steps (if any), rollback procedure
- DEFICIENCIES.md: honest record of what was stubbed or deferred
- EXTENSION-ROADMAP.md: concrete next steps, spec'd to commissioning-ready level where possible
**Quality bar — WKBD-001 (elevated — Platform Foundation):**
Read the KB Artifacts section of the WKBD-001 spec carefully. It contains
explicit instructions for each artifact. Non-negotiable requirements:
- INTERNAL-PLAYBOOK.md must include a section titled exactly:
  "This Is Foundation, Not Finish Line"
  This section must document: what was built, what it intentionally enables
  but does not yet implement, and a plain-language warning that building a
  parallel task visibility mechanism outside task_mode is an architectural mistake.
  Must reference DECISION-029.
- USER-GUIDE.md must be fifth-grader readable with minimum 15 FAQs.
  Use billing and sales examples for watching vs. active.
- EXTENSION-ROADMAP.md is the most important artifact. Write it with genuine
  ambition. Required sections: WKBD-002 through WKBD-005 each spec'd in enough
  detail to commission directly, plus a product vision narrative section.
- DEFICIENCIES.md must call out these 4 specific items:
  snoozed auto-promotion scheduler not built (WKBD-002),
  per-Mojo watching task registration not built,
  notification logic on mode transitions not built,
  WorkboardMojo UI not yet updated to filter by task_mode.
**Commit:**
cd /Users/jamesilsley/GitHub/sparkmojo-internal
git add platform/knowledge-base/
git commit -m "feat(kb): add missing KB artifacts for BILL-011 through BILL-021 and WKBD-001"
git push origin main
---
## Completion
When all 5 stories are either COMPLETE or BLOCKED:
1. Write QUEUE-COMPLETE.md summarizing results.
2. Output: LOOP_COMPLETE
