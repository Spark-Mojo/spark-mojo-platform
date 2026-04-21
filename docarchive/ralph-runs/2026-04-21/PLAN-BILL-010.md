# PLAN-BILL-010: Implement VALID_TRANSITIONS and transition_state() controller

## Story ID
BILL-010

## Branch
story/bill-010-state-machine-controller

## Story Type
Python controller (API/Infrastructure)

## Dependency Check
- BILL-006: OK (commit 9e32451 on current branch)
- BILL-007: OK (commit d5b91e6 on current branch)
- BILL-009: OK (commit 742d515 + fixes on current branch)

All dependencies satisfied.

## Files to Create or Modify

### 1. MODIFY: sm_claim.py (replace contents)
**Path:** /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/sm_claim.py
**Action:** Replace stub with full controller implementation
**Contents:**
- Module-level VALID_TRANSITIONS dict (19 states, exact map from spec)
- VALID_TRIGGER_TYPES list: ["manual", "webhook_277ca", "webhook_835", "api", "scheduler"]
- SMClaim(Document) class with transition_state() method
- 8-step method: validate to_state, validate transition, validate trigger_type, validate reason for manual, capture financial snapshot, update fields, write State Log, no commit

### 2. CREATE: test_sm_claim.py
**Path:** /Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/test_sm_claim.py
**Action:** Create unit test file with 12 test cases
**Tests:**
1. Valid transition draft->validated succeeds
2. Invalid transition draft->paid raises ValidationError
3. Unknown to_state "banana" raises ValidationError
4. Unknown current state "invented" raises ValidationError
5. Manual without reason raises ValidationError
6. Manual with reason succeeds
7. Financial snapshot captured correctly
8. Terminal state closed->draft blocked
9. voided->draft blocked
10. written_off->anything blocked
11. webhook_835 with empty reason succeeds
12. Unknown trigger_type raises ValidationError

## Quality Gates (Python gates)
1. `python -m pytest frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/test_sm_claim.py -v` — 12 tests pass, 0 failures
2. `bench --site poc-dev.sparkmojo.com migrate` — exits 0
3. `hasattr(frappe.get_last_doc("SM Claim"), "transition_state")` returns True in bench console
4. Valid transition executes correctly in bench console
5. Invalid transition raises frappe.ValidationError in bench console

## Commit Message
`feat: BILL-010 implement VALID_TRANSITIONS and transition_state() controller in SMClaim`

## Notes
- Tests must mock frappe since they run outside Frappe bench context
- transition_state() does NOT call self.save() — caller responsibility
- transition_state() does NOT call frappe.db.commit() — caller responsibility
- No whitelist decorator — internal method only
- No validate() or before_save() hooks in this story
