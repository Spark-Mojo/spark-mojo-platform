# PLAN-BILL-009: Create SM Claim State Log DocType with indexes

## Story ID
BILL-009

## Branch
story/bill-009-state-log-doctype

## Story Type
DocType JSON + patch file

## Dependency Check
- BILL-006: COMMITTED (9e32451) ✓

## Files to Create

1. **`/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim_state_log/__init__.py`** (create empty)

2. **`/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim_state_log/sm_claim_state_log.py`** (create - minimal Document subclass)

3. **`/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim_state_log/sm_claim_state_log.json`** (create - DocType definition with 11 fields)

4. **`/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/patches/bill_009_state_log_indexes.py`** (create - 3 indexes with IF NOT EXISTS)

## Files to Modify

5. **`/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/patches.txt`** (append patch registration)

## Quality Gate Type
DocType gates:
1. bench --site poc-dev.sparkmojo.com migrate - exits 0
2. All 11 fields visible via bench console meta inspection
3. SHOW INDEX returns 4 rows for the 3 custom indexes
4. Patch idempotency - runs twice without error

## Key Details
- autoname: "CLM-LOG-.YYYY.-.####"
- module: "SM Billing"
- 11 fields: claim, from_state, to_state, changed_at, changed_by, trigger_type, trigger_reference, reason, paid_amount_at_change, adjustment_amount_at_change, patient_responsibility_at_change
- 3 indexes: idx_state_log_claim, idx_state_log_claim_time (composite), idx_state_log_state (composite)
- Standalone DocType (NOT a child table of SM Claim)
