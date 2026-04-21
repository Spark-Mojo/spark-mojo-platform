# PLAN-BILL-007: Add 10 new supporting fields to SM Claim

## Story ID
BILL-007

## Branch
`story/bill-007-sm-claim-new-fields`

## Story Type
DocType JSON change (fields only — no patch, no controller logic)

## Dependency Check
- **BILL-006**: COMMITTED and PUSHED on `story/bill-006-canonical-state-expansion` ✓

## Files to Modify

| Action | Absolute Path |
|--------|---------------|
| Modify | `/Users/jamesilsley/GitHub/spark-mojo-platform/frappe-apps/sm_billing/sm_billing/sm_billing/doctype/sm_claim/sm_claim.json` |

**1 file total. No new files to create.**

## What to Do

1. Add 10 field entries to the `fields` array in sm_claim.json (after existing `claim_lines` entry)
2. Append 10 fieldnames to `field_order` after `claim_lines`
3. Update `modified` timestamp to `2026-04-06 00:00:00.000000`

### Fields to Add

| fieldname | fieldtype | label | constraints |
|-----------|-----------|-------|-------------|
| state_changed_at | Datetime | State Changed At | — |
| state_changed_by | Data | State Changed By | length: 140 |
| previous_state | Data | Previous State | length: 64 |
| state_change_reason | Small Text | State Change Reason | — |
| is_overdue | Check | Overdue | default: 0 |
| hold_reason | Small Text | Hold Reason | — |
| secondary_payer | Link | Secondary Payer | options: "SM Payer" |
| patient_balance_amount | Currency | Patient Balance Amount | — |
| write_off_amount | Currency | Write-Off Amount | — |
| write_off_approved_by | Data | Write-Off Approved By | length: 140 |

### NOT in Scope
- No reqd: 1 on any new field
- No in_list_view on any new field
- No indexes (BILL-008)
- No controller logic (BILL-010)
- No migration patch needed

## Quality Gates (DocType)

1. `bench --site poc-dev.sparkmojo.com migrate` — exit 0
2. Verify all 10 fields exist via bench console (`frappe.get_meta`)
3. Verify DB columns exist via MariaDB `DESCRIBE`

## Commit Message
`feat: BILL-007 add 10 state machine supporting fields to SM Claim DocType`
