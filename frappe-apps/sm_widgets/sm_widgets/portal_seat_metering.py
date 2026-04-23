import frappe


def _get_stripe_key():
    key = frappe.conf.get("stripe_secret_key")
    if key:
        return key
    try:
        with open("/run/secrets/stripe_secret_key") as f:
            return f.read().strip()
    except (FileNotFoundError, PermissionError):
        return None


def record_portal_seat_change(doc, method):
    current_count = frappe.db.count(
        "Contact",
        filters={"sm_is_portal_seat": 1},
    )

    site = frappe.local.site
    registry = frappe.get_all(
        "SM Site Registry",
        filters={"frappe_site": site},
        fields=["billing_motion", "stripe_customer_id"],
        limit=1,
    )
    if not registry:
        return

    registry = registry[0]

    if registry.billing_motion == "self_serve" and registry.stripe_customer_id:
        stripe_key = _get_stripe_key()
        if stripe_key:
            try:
                import stripe
                stripe.api_key = stripe_key
                stripe.billing.MeterEvent.create(
                    event_name="sm_account_billing.portal_seats",
                    payload={
                        "stripe_customer_id": registry.stripe_customer_id,
                        "value": str(current_count),
                    },
                )
            except Exception as e:
                frappe.log_error(f"Portal seat Stripe meter failed: {e}")

    try:
        frappe.db.set_value(
            "SM Usage Summary", site, "active_portal_seats", current_count
        )
    except Exception as e:
        frappe.log_error(f"Portal seat SM Usage Summary update failed: {e}")
