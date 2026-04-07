import frappe
from frappe.model.document import Document


class SMClaimStateLog(Document):
    @staticmethod
    def on_doctype_update():
        frappe.db.add_index("SM Claim State Log", ["claim"], "idx_state_log_claim")
        frappe.db.add_index("SM Claim State Log", ["claim", "changed_at"], "idx_state_log_claim_time")
        frappe.db.add_index("SM Claim State Log", ["to_state", "changed_at"], "idx_state_log_state")
