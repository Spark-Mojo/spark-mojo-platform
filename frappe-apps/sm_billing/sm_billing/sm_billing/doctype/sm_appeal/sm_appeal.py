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
        self._generate_appeal_letter()

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

    def _generate_appeal_letter(self):
        try:
            from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

            denial_doc = frappe.get_doc("SM Denial", self.denial)
            claim_doc = frappe.get_doc("SM Claim", self.claim)

            carc_codes = [c.strip() for c in (denial_doc.carc_codes or "").split(",") if c.strip()]
            rarc_codes = [c.strip() for c in (denial_doc.rarc_codes or "").split(",") if c.strip()]

            cpt_codes = []
            if hasattr(claim_doc, "claim_lines") and claim_doc.claim_lines:
                cpt_codes = [line.cpt_code for line in claim_doc.claim_lines if line.cpt_code]

            letter = generate_appeal_letter(
                carc_codes=carc_codes,
                rarc_codes=rarc_codes,
                payer_name=claim_doc.payer or "",
                cpt_codes=cpt_codes,
                service_date=str(claim_doc.date_of_service) if claim_doc.date_of_service else "",
                appeal_level=int(self.appeal_level or 1),
                denial_reason_summary=denial_doc.denial_reason_summary or "",
            )

            frappe.db.set_value("SM Appeal", self.name, "appeal_letter", letter)
            logger.debug(
                "Appeal letter generated for appeal %s, length %d chars",
                self.name,
                len(letter),
            )

            self._add_task_comment()

        except Exception as e:
            logger.warning("Failed to generate appeal letter for %s: %s", self.name, str(e))
            fallback = (
                f"[Appeal letter generation failed - please draft manually. "
                f"Denial reason: {getattr(frappe.get_doc('SM Denial', self.denial), 'denial_reason_summary', 'Unknown') if self.denial else 'Unknown'}]"
            )
            try:
                frappe.db.set_value("SM Appeal", self.name, "appeal_letter", fallback)
            except Exception:
                pass

    def _add_task_comment(self):
        try:
            tasks = frappe.get_all(
                "SM Task",
                filters={
                    "source_object_id": self.name,
                    "task_type": "appeal_submission",
                },
                fields=["name"],
                limit=1,
            )
            if tasks:
                task_doc = frappe.get_doc("SM Task", tasks[0].name)
                comments = frappe.parse_json(task_doc.comments or "[]")
                comments.append({
                    "user": frappe.session.user,
                    "timestamp": str(frappe.utils.now()),
                    "comment": "AI-generated appeal letter ready for review. Open the appeal record to edit and approve.",
                })
                frappe.db.set_value("SM Task", tasks[0].name, "comments", frappe.as_json(comments))
        except Exception as e:
            logger.warning("Failed to add comment to task for appeal %s: %s", self.name, str(e))
