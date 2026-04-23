import frappe


def populate_sm_fields(doc, method):
    if not doc.item_code:
        return

    parent = frappe.get_doc("Sales Invoice", doc.parent) if doc.parent else None
    customer = parent.customer if parent else None
    if not customer:
        return

    scba = frappe.db.get_value(
        "SM Client Billable Action",
        {"customer": customer, "item_code": doc.item_code},
        ["quoted_rack_rate", "discount_amount", "commission_eligible"],
        as_dict=True,
    )

    if scba:
        doc.sm_quoted_rack_rate = scba.quoted_rack_rate or doc.rate
        doc.sm_discount_amount = scba.discount_amount or 0
        doc.sm_commission_eligible = scba.commission_eligible
    else:
        item = frappe.get_doc("Item", doc.item_code)
        doc.sm_quoted_rack_rate = doc.rate
        doc.sm_discount_amount = 0
        doc.sm_commission_eligible = item.sm_commission_eligible
