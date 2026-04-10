import frappe
from frappe.model.document import Document
from datetime import timedelta


APPEAL_WINDOW_DAYS = 90


class SMDenial(Document):
    def validate(self):
        if not self.carc_codes or len(self.carc_codes) == 0:
            frappe.throw(
                "At least one CARC code is required",
                frappe.ValidationError,
            )

    def before_save(self):
        if self.denial_date:
            denial_dt = frappe.utils.getdate(self.denial_date)
            self.appeal_deadline = denial_dt + timedelta(days=APPEAL_WINDOW_DAYS)

    def after_insert(self):
        self._create_workboard_task()

    def _create_workboard_task(self):
        """Create an SM Task for denial review via the workboard."""
        try:
            days_until = None
            if self.appeal_deadline:
                today = frappe.utils.getdate(frappe.utils.today())
                deadline = frappe.utils.getdate(self.appeal_deadline)
                days_until = (deadline - today).days

            priority = "High" if days_until is not None and days_until < 14 else "Normal"

            frappe.get_doc({
                "doctype": "SM Task",
                "title": f"Review denied claim: {self.claim}",
                "task_type": "denial_review",
                "task_mode": "watching",
                "source_system": "Healthcare Billing Mojo",
                "source_object_id": self.name,
                "assigned_role": "Billing Coordinator",
                "due_at": self.appeal_deadline,
                "priority": priority,
                "executor_type": "Human",
            }).insert(ignore_permissions=True)
        except Exception:
            frappe.log_error(
                title=f"Failed to create workboard task for {self.name}",
                message=frappe.get_traceback(),
            )
