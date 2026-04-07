import frappe
from frappe.model.document import Document


class SMClaimStateLog(Document):
    @staticmethod
    def on_doctype_update():
        frappe.db.sql(
            "CREATE INDEX IF NOT EXISTS `idx_state_log_claim`"
            " ON `tabSM Claim State Log` (`claim`)"
        )
        frappe.db.sql(
            "CREATE INDEX IF NOT EXISTS `idx_state_log_claim_time`"
            " ON `tabSM Claim State Log` (`claim`, `changed_at`)"
        )
        frappe.db.sql(
            "CREATE INDEX IF NOT EXISTS `idx_state_log_state`"
            " ON `tabSM Claim State Log` (`to_state`, `changed_at`)"
        )
