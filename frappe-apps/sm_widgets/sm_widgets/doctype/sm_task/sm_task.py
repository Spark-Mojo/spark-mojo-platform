import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class SMTask(Document):
    def before_save(self):
        self.validate_status_reason()
        self.set_lifecycle_timestamps()

    def validate_status_reason(self):
        if self.canonical_state in ("Blocked", "Failed") and not self.status_reason:
            frappe.throw(
                "Status Reason is required when Status is Blocked or Failed",
                frappe.ValidationError
            )

    def set_lifecycle_timestamps(self):
        if self.canonical_state == "In Progress" and not self.started_at:
            self.started_at = now_datetime()
        if self.canonical_state in ("Completed", "Failed") and not self.completed_at:
            self.completed_at = now_datetime()
        if self.canonical_state == "Canceled" and not self.canceled_at:
            self.canceled_at = now_datetime()
