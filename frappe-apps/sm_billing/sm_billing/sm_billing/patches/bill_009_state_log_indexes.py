"""BILL-009: Add performance indexes to tabSM Claim State Log"""
import frappe


def execute():
    if not frappe.db.table_exists("SM Claim State Log"):
        # Table not yet created — will be created by model sync.
        # Re-run this patch after migrate completes.
        return

    frappe.db.sql(
        "CREATE INDEX IF NOT EXISTS `idx_state_log_claim`"
        " ON `tabSM Claim State Log` (`claim`)"
    )
    print("BILL-009: idx_state_log_claim created")

    frappe.db.sql(
        "CREATE INDEX IF NOT EXISTS `idx_state_log_claim_time`"
        " ON `tabSM Claim State Log` (`claim`, `changed_at`)"
    )
    print("BILL-009: idx_state_log_claim_time created")

    frappe.db.sql(
        "CREATE INDEX IF NOT EXISTS `idx_state_log_state`"
        " ON `tabSM Claim State Log` (`to_state`, `changed_at`)"
    )
    print("BILL-009: idx_state_log_state created")

    frappe.db.commit()
