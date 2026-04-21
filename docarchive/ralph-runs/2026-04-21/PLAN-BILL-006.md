# PLAN-BILL-006: Expand SM Claim canonical_state to 19 states with migration

## Story
- **ID:** BILL-006
- **Branch:** `story/bill-006-canonical-state-expansion`
- **Type:** DocType JSON change + migration patch
- **Dependencies:** None (BILL-004 and BILL-005 verified complete)

## Files to Create or Modify

| Action | Absolute Path |
|--------|---------------|
| **Modify** | `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/sm_claim.json` — update `canonical_state` options to 19 states, update `modified` timestamp |
| **Create** | `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/patches/__init__.py` — empty file |
| **Create** | `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/patches/bill_006_migrate_canonical_state.py` — migration patch: appealed->in_appeal, accepted->submitted |
| **Append** | `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/patches.txt` — add `sm_billing.sm_billing.patches.bill_006_migrate_canonical_state` |

## Summary of Changes

1. **sm_claim.json**: Replace 12-state `canonical_state` options with 19 states in exact order: draft, pending_info, pending_auth, validated, held, submitted, rejected, adjudicating, paid, partial_paid, denied, in_appeal, appeal_won, appeal_lost, pending_secondary, patient_balance, written_off, closed, voided
2. **Migration patch**: Two SQL UPDATEs — `appealed` -> `in_appeal`, `accepted` -> `submitted`. Idempotent by WHERE clause. Prints row counts.
3. **patches.txt**: Register the patch for `bench migrate`
4. **patches/__init__.py**: Required for Python module resolution

## Dependency Check
- No dependencies. Ready to build.

## Quality Gates (DocType)
1. `bench --site poc-dev.sparkmojo.com migrate` exits 0
2. Verify 19 canonical_state options via bench console
3. Run patch explicitly, verify row counts
4. Run patch a second time (idempotency), verify no error

## Commit Message
`feat: BILL-006 expand SM Claim canonical_state to 19 states with migration patch`
