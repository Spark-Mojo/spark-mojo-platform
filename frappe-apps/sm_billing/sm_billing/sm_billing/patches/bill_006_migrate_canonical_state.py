"""BILL-006: Migrate canonical_state values - appealed->in_appeal, accepted->submitted"""
import frappe


def execute():
    frappe.db.sql(
        "UPDATE `tabSM Claim` SET canonical_state = 'in_appeal' WHERE canonical_state = 'appealed'"
    )
    appealed_count = frappe.db.sql("SELECT ROW_COUNT()")[0][0]

    frappe.db.sql(
        "UPDATE `tabSM Claim` SET canonical_state = 'submitted' WHERE canonical_state = 'accepted'"
    )
    accepted_count = frappe.db.sql("SELECT ROW_COUNT()")[0][0]

    frappe.db.commit()

    print(f"BILL-006 migration: appealed->in_appeal: {appealed_count} rows, accepted->submitted: {accepted_count} rows")
