import frappe
from frappe.model.document import Document
import logging

logger = logging.getLogger(__name__)


class SMAppeal(Document):
    def onload(self):
        if self.payer_deadline:
            today = frappe.utils.getdate(frappe.utils.today())
            deadline = frappe.utils.getdate(self.payer_deadline)
            self.days_until_deadline = (deadline - today).days

    def validate(self):
        if str(self.appeal_level) == "2":
            level_1_exists = frappe.db.exists(
                "SM Appeal",
                {
                    "denial": self.denial,
                    "appeal_level": "1",
                    "result": "lost",
                    "name": ("!=", self.name),
                },
            )
            if not level_1_exists:
                frappe.throw(
                    "Level 2 appeal requires a lost level 1 appeal for this denial",
                    frappe.ValidationError,
                )

        if self.is_new() and self.payer_deadline:
            today = frappe.utils.getdate(frappe.utils.today())
            deadline = frappe.utils.getdate(self.payer_deadline)
            if deadline < today:
                logger.warning(
                    "Appeal %s has payer_deadline %s in the past",
                    self.name or "(new)",
                    self.payer_deadline,
                )

    def before_insert(self):
        if not self.payer_deadline and self.denial:
            denial_doc = frappe.get_doc("SM Denial", self.denial)
            if denial_doc.appeal_deadline:
                self.payer_deadline = denial_doc.appeal_deadline

    def after_insert(self):
        self._transition_claim_to_in_appeal()
        self._create_workboard_task()

    def _transition_claim_to_in_appeal(self):
        claim_doc = frappe.get_doc("SM Claim", self.claim)
        if claim_doc.canonical_state != "denied":
            frappe.throw(
                "Cannot create appeal - claim is not in denied state",
                frappe.ValidationError,
            )
        claim_doc.transition_state(
            to_state="in_appeal",
            changed_by=frappe.session.user,
            trigger_type="api",
            reason=f"Appeal created by {frappe.session.user} at level {self.appeal_level}",
        )
        claim_doc.save(ignore_permissions=True)

    def _create_workboard_task(self):
        try:
            days_until = None
            if self.payer_deadline:
                today = frappe.utils.getdate(frappe.utils.today())
                deadline = frappe.utils.getdate(self.payer_deadline)
                days_until = (deadline - today).days

            priority = "High" if days_until is not None and days_until < 14 else "Normal"

            frappe.get_doc({
                "doctype": "SM Task",
                "title": f"Submit appeal for claim: {self.claim}",
                "task_type": "appeal_submission",
                "task_mode": "active",
                "source_system": "Healthcare Billing Mojo",
                "source_object_id": self.name,
                "assigned_role": "Billing Coordinator",
                "due_at": self.payer_deadline,
                "priority": priority,
                "executor_type": "Human",
            }).insert(ignore_permissions=True)
        except Exception:
            frappe.log_error(
                title=f"Failed to create workboard task for appeal {self.name}",
                message=frappe.get_traceback(),
            )
