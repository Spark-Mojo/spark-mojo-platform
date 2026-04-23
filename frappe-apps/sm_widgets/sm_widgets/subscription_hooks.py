import frappe


def append_managed_account_lines(doc, method):
    """Auto-append professional services and overages for Managed Account invoices."""
    if not doc.subscription:
        return

    sub = frappe.get_doc("Subscription", doc.subscription)
    if getattr(sub, "sm_billing_motion", None) != "managed_account":
        return

    customer = sub.customer

    for ps in getattr(sub, "sm_professional_services", []) or []:
        if ps.status != "ready_to_invoice":
            continue
        item_code = resolve_item_for_professional_service(ps.mojo_id, ps.description)
        doc.append("items", {
            "item_code": item_code,
            "qty": 1,
            "rate": ps.amount,
            "description": ps.description,
            "sm_commission_eligible": 1,
        })
        frappe.db.set_value("SM Professional Services Line", ps.name, {
            "status": "invoiced",
            "sales_invoice": doc.name,
        })

    site = resolve_site_for_customer(customer)
    if not site:
        return

    usage = get_usage_summary(site)
    if not usage:
        return

    for dim, meter_action in [
        ("ai_tokens", "ai_token_usage"),
        ("claims", "claims_processed"),
        ("storage", "storage_gb"),
        ("staff_seats", "staff_seats"),
        ("portal_seats", "portal_seats"),
    ]:
        used = getattr(usage, f"{dim}_used", 0) or 0
        included = getattr(usage, f"{dim}_included", 0) or 0
        overage = max(0, used - included)
        if overage <= 0:
            continue
        scba = frappe.db.get_value(
            "SM Client Billable Action",
            {"customer": customer, "action_id": meter_action},
            ["item_code", "contracted_rate"],
            as_dict=True,
        )
        if not scba:
            continue
        doc.append("items", {
            "item_code": scba.item_code,
            "qty": overage,
            "rate": scba.contracted_rate,
            "description": f"{dim} overage (used {used}, included {included})",
        })


def resolve_item_for_professional_service(mojo_id, description):
    """Look up Item by sm_mojo_id or return generic professional services item."""
    item_code = frappe.db.get_value("Item", {"sm_mojo_id": mojo_id}, "item_code")
    if item_code:
        return item_code
    return "SM-PROFESSIONAL-SERVICES"


def resolve_site_for_customer(customer):
    """Look up SM Site Registry by customer."""
    return frappe.db.get_value(
        "SM Site Registry",
        {"customer": customer},
        "name",
    )


def get_usage_summary(site):
    """Look up SM Usage Summary for a site. Returns None if DocType doesn't exist yet."""
    try:
        return frappe.get_doc("SM Usage Summary", site)
    except Exception:
        return None
