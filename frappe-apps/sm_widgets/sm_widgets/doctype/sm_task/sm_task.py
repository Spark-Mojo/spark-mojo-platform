import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class SMTask(Document):
    def before_save(self):
        self.validate_status_reason()
        self.set_lifecycle_timestamps()
        self.track_state_change()
        self.track_assignment_change()

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

    def track_state_change(self):
        previous = self.get_doc_before_save()
        if not previous:
            return
        if previous.canonical_state != self.canonical_state:
            self.append("state_history", {
                "from_state": previous.canonical_state,
                "to_state": self.canonical_state,
                "changed_by": frappe.session.user,
                "changed_at": now_datetime(),
                "reason": self.status_reason or ""
            })

    def track_assignment_change(self):
        previous = self.get_doc_before_save()
        if not previous:
            return

        assignment_fields = [
            ("assigned_user", "User"),
            ("assigned_role", "Role"),
            ("assigned_team", "Team"),
        ]

        for field, owner_type in assignment_fields:
            old_value = getattr(previous, field, None) or ""
            new_value = getattr(self, field, None) or ""
            if old_value != new_value:
                self.append("assignment_history", {
                    "from_owner": old_value,
                    "to_owner": new_value,
                    "owner_type": owner_type,
                    "changed_by": frappe.session.user,
                    "changed_at": now_datetime(),
                })
