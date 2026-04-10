import frappe
from frappe.model.document import Document


VALID_TRANSITIONS = {
    "draft": ["pending_info", "pending_auth", "validated", "held", "voided"],
    "pending_info": ["draft", "validated", "held", "voided"],
    "pending_auth": ["draft", "validated", "held", "voided"],
    "validated": ["submitted", "held", "voided"],
    "held": ["draft", "validated", "voided"],
    "submitted": ["rejected", "adjudicating", "voided"],
    "rejected": ["draft", "voided"],
    "adjudicating": ["paid", "partial_paid", "denied", "voided"],
    "paid": ["closed", "patient_balance", "pending_secondary"],
    "partial_paid": ["patient_balance", "pending_secondary", "closed"],
    "denied": ["in_appeal", "draft", "written_off", "voided"],
    "in_appeal": ["appeal_won", "appeal_lost", "voided"],
    "appeal_won": ["adjudicating"],
    "appeal_lost": ["in_appeal", "written_off"],
    "pending_secondary": ["adjudicating", "patient_balance", "closed"],
    "patient_balance": ["closed", "written_off"],
    "written_off": [],
    "closed": [],
    "voided": [],
}

VALID_TRIGGER_TYPES = ["manual", "webhook_277ca", "webhook_835", "api", "scheduler"]


class SMClaim(Document):
    def transition_state(
        self,
        to_state: str,
        changed_by: str,
        trigger_type: str,
        reason: str = "",
        trigger_reference: str = "",
        metadata: dict = None,
    ) -> None:
        # 1. Validate to_state is a known state
        if to_state not in VALID_TRANSITIONS:
            frappe.throw(f"Unknown state: {to_state}", frappe.ValidationError)

        # 2. Validate the transition is allowed
        if self.canonical_state not in VALID_TRANSITIONS:
            frappe.throw(
                f"Unknown current state: {self.canonical_state}",
                frappe.ValidationError,
            )
        if to_state not in VALID_TRANSITIONS[self.canonical_state]:
            frappe.throw(
                f"Transition {self.canonical_state} -> {to_state} is not permitted",
                frappe.ValidationError,
            )

        # 3. Validate trigger_type
        if trigger_type not in VALID_TRIGGER_TYPES:
            frappe.throw(
                f"Unknown trigger_type: {trigger_type}", frappe.ValidationError
            )

        # 4. Validate reason for manual transitions
        if trigger_type == "manual" and not reason:
            frappe.throw(
                "reason is required for manual transitions", frappe.ValidationError
            )

        # 5. Capture financial snapshot
        paid_snap = self.paid_amount or 0
        adj_snap = self.adjustment_amount or 0
        pat_snap = self.patient_responsibility or 0

        # 6. Update SM Claim fields
        from_state = self.canonical_state
        self.canonical_state = to_state
        self.previous_state = from_state
        self.state_changed_at = frappe.utils.now_datetime()
        self.state_changed_by = changed_by

        # 7. Write SM Claim State Log record
        frappe.get_doc(
            {
                "doctype": "SM Claim State Log",
                "claim": self.name,
                "from_state": from_state,
                "to_state": to_state,
                "changed_at": self.state_changed_at,
                "changed_by": changed_by,
                "trigger_type": trigger_type,
                "trigger_reference": trigger_reference,
                "reason": reason,
                "paid_amount_at_change": paid_snap,
                "adjustment_amount_at_change": adj_snap,
                "patient_responsibility_at_change": pat_snap,
            }
        ).insert(ignore_permissions=True)

        # 8. Post-transition hooks
        if from_state == "adjudicating" and to_state == "denied":
            self._on_denied(metadata or {})

        # 9. Do NOT call frappe.db.commit() - caller's responsibility

    def _on_denied(self, metadata: dict) -> None:
        """Create SM Denial record after adjudicating -> denied transition."""
        carc_str = metadata.get("carc_codes", "")
        rarc_str = metadata.get("rarc_codes", "")

        carc_rows = []
        if carc_str:
            for code in carc_str.split(","):
                code = code.strip()
                if code:
                    carc_rows.append({
                        "carc_code": code,
                        "carc_description": "",
                    })

        if not carc_rows:
            carc_rows.append({
                "carc_code": "UNKNOWN",
                "carc_description": "CARC code not provided by ERA",
            })

        rarc_rows = []
        if rarc_str:
            for code in rarc_str.split(","):
                code = code.strip()
                if code:
                    rarc_rows.append({
                        "rarc_code": code,
                        "rarc_description": "",
                    })

        carc_descriptions = [r["carc_code"] for r in carc_rows]
        summary = metadata.get(
            "denial_reason_summary",
            "Denial reason: " + ", ".join(carc_descriptions),
        )

        denial_date = metadata.get("denial_date", frappe.utils.today())

        try:
            frappe.get_doc({
                "doctype": "SM Denial",
                "claim": self.name,
                "denial_date": denial_date,
                "carc_codes": carc_rows,
                "rarc_codes": rarc_rows if rarc_rows else [],
                "denial_reason_summary": summary,
                "ai_category": "pending",
            }).insert(ignore_permissions=True)
        except Exception:
            frappe.log_error(
                title=f"Failed to create SM Denial for {self.name}",
                message=frappe.get_traceback(),
            )


@frappe.whitelist()
def api_transition_state(
    claim_name: str,
    to_state: str,
    trigger_type: str,
    reason: str = "",
    trigger_reference: str = "",
    changed_by: str = "",
    metadata: str = "",
):
    """Whitelisted API to call transition_state() on an SM Claim.

    Used by the abstraction layer for webhook-driven state transitions.
    metadata is a JSON string containing optional context for post-transition hooks.
    """
    import json as _json

    doc = frappe.get_doc("SM Claim", claim_name)
    if not changed_by:
        changed_by = frappe.session.user

    meta = {}
    if metadata:
        try:
            meta = _json.loads(metadata) if isinstance(metadata, str) else metadata
        except (ValueError, TypeError):
            pass

    doc.transition_state(
        to_state=to_state,
        changed_by=changed_by,
        trigger_type=trigger_type,
        reason=reason,
        trigger_reference=trigger_reference,
        metadata=meta,
    )
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"claim_name": doc.name, "canonical_state": doc.canonical_state}
