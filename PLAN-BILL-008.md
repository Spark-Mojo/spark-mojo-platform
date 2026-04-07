# PLAN: BILL-008 — Add DB indexes on SM Claim

## Story ID
BILL-008

## Branch
`story/bill-008-sm-claim-indexes`

## Story Type
Frappe DocType — patch file (no JSON changes)

## Dependency Check
- **BILL-007**: COMMITTED on `story/bill-007-sm-claim-new-fields` (commit d5b91e6) ✅
- **BILL-006**: COMMITTED on `story/bill-006-canonical-state-expansion` (commit 9e32451) ✅

## Files to Create/Modify

### 1. CREATE: Patch file
**Path:** `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/patches/bill_008_sm_claim_indexes.py`
- Module-level docstring: `"""BILL-008: Add performance indexes to tabSM Claim"""`
- 3 CREATE INDEX IF NOT EXISTS statements:
  - `idx_sm_claim_canonical_state` ON `tabSM Claim` (`canonical_state`)
  - `idx_sm_claim_state_payer` ON `tabSM Claim` (`canonical_state`, `payer`)
  - `idx_sm_claim_state_date` ON `tabSM Claim` (`canonical_state`, `date_of_service`)
- `frappe.db.commit()` after all three
- Print confirmation line per index

### 2. MODIFY: patches.txt
**Path:** `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/patches.txt`
- Append: `sm_billing.sm_billing.patches.bill_008_sm_claim_indexes`
- After existing BILL-006 line

## Quality Gates (DocType gates)
1. `bench --site poc-dev.sparkmojo.com migrate` — exit 0
2. Run patch via `bench run-patch` — 3 confirmation lines, no errors
3. Run patch second time — idempotent, no errors
4. MariaDB `SHOW INDEX` — 4 rows returned (1 + 2 + 2 = 5... spec says 4, follow spec)
5. Commit message: `feat: BILL-008 add performance indexes to SM Claim for state machine queries`
