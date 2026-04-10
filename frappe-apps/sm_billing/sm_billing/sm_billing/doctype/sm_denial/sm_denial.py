import frappe
from frappe.model.document import Document
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


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
        self._classify_denial()
        self._create_workboard_task()

    def _classify_denial(self):
        """Classify denial via AWS Bedrock and write AI fields."""
        try:
            from sm_billing.sm_billing.denial_classifier import classify_denial

            carc_codes = [row.carc_code for row in (self.carc_codes or [])]
            rarc_codes = [row.rarc_code for row in (self.rarc_codes or [])]

            # Get payer and CPT codes from linked claim
            payer_name = ""
            cpt_codes = []
            if self.claim:
                try:
                    claim_doc = frappe.get_doc("SM Claim", self.claim)
                    payer_name = getattr(claim_doc, "payer_name", "") or ""
                    cpt_codes = [
                        row.cpt_code
                        for row in getattr(claim_doc, "claim_lines", [])
                        if hasattr(row, "cpt_code") and row.cpt_code
                    ]
                except Exception:
                    logger.debug("Could not load linked claim %s for classification", self.claim)

            result = classify_denial(carc_codes, rarc_codes, payer_name, cpt_codes)

            frappe.db.set_value(
                "SM Denial",
                self.name,
                {
                    "ai_category": result["ai_category"],
                    "ai_appealable": result["ai_appealable"],
                    "ai_action": result["ai_action"],
                    "ai_confidence": result["ai_confidence"],
                },
                update_modified=False,
            )
            logger.debug(
                "Denial %s classified: category=%s, confidence=%s",
                self.name,
                result["ai_category"],
                result["ai_confidence"],
            )
        except Exception as e:
            logger.warning("Denial classification failed for %s: %s", self.name, str(e))
            try:
                frappe.db.set_value(
                    "SM Denial",
                    self.name,
                    {
                        "ai_category": "pending",
                        "ai_appealable": False,
                        "ai_action": "Classification failed - manual review required",
                        "ai_confidence": 0.0,
                    },
                    update_modified=False,
                )
            except Exception:
                logger.warning("Could not write fallback classification for %s", self.name)

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
