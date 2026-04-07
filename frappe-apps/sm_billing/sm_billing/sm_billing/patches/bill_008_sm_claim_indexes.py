"""BILL-008: Add performance indexes to tabSM Claim"""
import frappe


def execute():
    frappe.db.sql(
        "CREATE INDEX IF NOT EXISTS `idx_sm_claim_canonical_state` ON `tabSM Claim` (`canonical_state`)"
    )
    print("Created index: idx_sm_claim_canonical_state")

    frappe.db.sql(
        "CREATE INDEX IF NOT EXISTS `idx_sm_claim_state_payer` ON `tabSM Claim` (`canonical_state`, `payer`)"
    )
    print("Created index: idx_sm_claim_state_payer")

    frappe.db.sql(
        "CREATE INDEX IF NOT EXISTS `idx_sm_claim_state_date` ON `tabSM Claim` (`canonical_state`, `date_of_service`)"
    )
    print("Created index: idx_sm_claim_state_date")

    frappe.db.commit()
