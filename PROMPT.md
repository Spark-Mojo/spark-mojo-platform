# Overnight Task Queue - Session 28
# Started: April 6, 2026

## How to Use This File

Work stories in priority order. Each story gets its own branch.
For each story:
1. Create branch: git checkout -b story/BILL-NNN-description
2. Read full story spec from the absolute path shown
3. Read CLAUDE.md for conventions and gotchas
4. Build exactly what the spec says - nothing more, nothing less
5. Run all quality gates (see Definition of Done below)
6. If ambiguous on any architectural decision: write BLOCKED-BILL-NNN.md and skip to next story. Never improvise on architecture.
7. Commit using the exact commit message from the story spec

## Absolute Paths Reference

| What | Path |
|------|------|
| This repo | /Users/jamesilsley/GitHub/spark-mojo-platform/ |
| Governance repo | /Users/jamesilsley/GitHub/sparkmojo-internal/ |
| Story files | /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ |
| BILLING.md feature spec | /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/BILLING.md |
| CLAUDE.md | /Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md |
| PROCESS.md | /Users/jamesilsley/GitHub/sparkmojo-internal/platform/PROCESS.md |
| sm_billing app | /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/ |
| patches.txt | /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/patches.txt |
## Routing Reference (CRITICAL - read before any VPS test)

- poc-dev.sparkmojo.com - Frappe Desk ONLY. Never use for API tests.
- poc-dev.app.sparkmojo.com - Module routes: /api/modules/billing/...
- api.poc.sparkmojo.com - Webhook routes: /api/webhooks/stedi/...

## Definition of Done - Frappe DocType stories (BILL-006, BILL-007, BILL-008, BILL-009)

ALL must pass before touching COMPLETE marker:
1. bench --site poc-dev.sparkmojo.com migrate - exits 0, no errors
2. Field/index verification via bench console (exact commands in each story spec)
3. Index verification via MariaDB SHOW INDEX query (exact commands in each story spec)
4. Patch idempotency confirmed (run patch twice, no error on second run)

## Definition of Done - Python controller story (BILL-010)

ALL must pass before touching COMPLETE marker:
1. python -m pytest frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/test_sm_claim.py -v - 12 tests pass, 0 failures
2. bench --site poc-dev.sparkmojo.com migrate - exits 0
3. hasattr(frappe.get_last_doc("SM Claim"), "transition_state") returns True in bench console
4. Valid transition executes correctly in bench console
5. Invalid transition raises frappe.ValidationError in bench console

## Story Queue
---

### STORY 1: BILL-006 - Expand canonical_state to 19 states with migration

Type: CODE (Frappe DocType)
Branch: story/bill-006-canonical-state-expansion
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-006-canonical-state-expansion.md

Files to create/modify:
- frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/sm_claim.json (modify options only)
- frappe-apps/sm_billing/sm_billing/sm_billing/patches/__init__.py (create empty)
- frappe-apps/sm_billing/sm_billing/sm_billing/patches/bill_006_migrate_canonical_state.py (create)
- frappe-apps/sm_billing/sm_billing/patches.txt (append one line)

---

### STORY 2: BILL-007 - Add 10 new supporting fields to SM Claim

Type: CODE (Frappe DocType)
Branch: story/bill-007-sm-claim-new-fields
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-007-sm-claim-new-fields.md

Depends on: BILL-006 must be committed before this story starts.

Files to create/modify:
- frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/sm_claim.json (add 10 fields)
---

### STORY 3: BILL-008 - Add DB indexes on SM Claim

Type: CODE (Frappe DocType / patch)
Branch: story/bill-008-sm-claim-indexes
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-008-sm-claim-indexes.md

Depends on: BILL-007 must be committed before this story starts.

Files to create/modify:
- frappe-apps/sm_billing/sm_billing/sm_billing/patches/bill_008_sm_claim_indexes.py (create)
- frappe-apps/sm_billing/sm_billing/patches.txt (append one line)

---

### STORY 4: BILL-009 - Create SM Claim State Log DocType with indexes

Type: CODE (Frappe DocType)
Branch: story/bill-009-state-log-doctype
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-009-state-log-doctype.md

Depends on: BILL-006 must be committed before this story starts.
Note: BILL-009 can run in parallel with BILL-007 and BILL-008 logically,
but Ralph runs stories serially. Run after BILL-008 completes.
Files to create/modify:
- frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim_state_log/__init__.py (create empty)
- frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim_state_log/sm_claim_state_log.py (create)
- frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim_state_log/sm_claim_state_log.json (create)
- frappe-apps/sm_billing/sm_billing/sm_billing/patches/bill_009_state_log_indexes.py (create)
- frappe-apps/sm_billing/sm_billing/patches.txt (append one line)

---

### STORY 5: BILL-010 - Implement VALID_TRANSITIONS and transition_state() controller

Type: CODE (Python)
Branch: story/bill-010-state-machine-controller
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-010-state-machine-controller.md

Depends on: BILL-006, BILL-007, BILL-009 must all be committed before this story starts.

Files to create/modify:
- frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/sm_claim.py (replace contents)
- frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/test_sm_claim.py (create)

---

## Completion

When all stories complete or are blocked:
1. Write RUN-SUMMARY-SESSION-28.md at repo root with:
   - Each story ID and result (COMPLETE / BLOCKED / FAILED)
   - Test counts for BILL-010
   - Migrate exit codes for DocType stories
   - Any BLOCKED files written and why
   - VPS verification results for each story
2. git push origin for all story branches
3. Output: LOOP_COMPLETE