#!/usr/bin/env python3
"""
Register Spark Mojo custom apps for a Frappe site and apply required site configuration.
Uses tabInstalled Application (NOT apps.txt) per CLAUDE.md Rules 11 and 17.
Idempotent — safe to run multiple times.

Also suppresses the ERPNext setup wizard automatically. The wizard has no skip
option and intercepts all URLs including /app. This must be suppressed on every
provisioned site. It is never a human step.

Usage:
  python3 register_sm_apps.py --site willow.sparkmojo.com
  python3 register_sm_apps.py --site willow.sparkmojo.com --apps sm_widgets,sm_connectors
"""
import argparse

DEFAULT_SM_APPS = ['sm_widgets', 'sm_connectors', 'sm_provisioning']


def suppress_setup_wizard(frappe, site_name):
    """
    Suppress the ERPNext setup wizard.

    frappe.is_setup_complete() checks tabInstalled Application — it returns True
    only when BOTH 'frappe' and 'erpnext' rows have is_setup_complete = 1.
    The tabSingles / tabDefaultValue entries alone are NOT sufficient.

    This function sets all three locations for belt-and-suspenders safety:
    1. tabInstalled Application.is_setup_complete (the authoritative check)
    2. tabSingles System Settings.setup_complete
    3. tabDefaultValue __default.setup_complete
    """
    try:
        if frappe.is_setup_complete():
            print(f'Setup wizard already suppressed on {site_name}')
            return

        # 1. The real check: tabInstalled Application
        frappe.db.sql(
            "UPDATE `tabInstalled Application` SET is_setup_complete=1 "
            "WHERE app_name IN ('frappe', 'erpnext')"
        )

        # 2. tabSingles (System Settings)
        frappe.db.set_single_value('System Settings', 'setup_complete', 1)

        # 3. tabDefaultValue (sysdefaults cache)
        if frappe.db.exists('DefaultValue', {'defkey': 'setup_complete', 'parent': '__default'}):
            frappe.db.sql(
                "UPDATE tabDefaultValue SET defvalue='1' "
                "WHERE defkey='setup_complete' AND parent='__default'"
            )
        else:
            frappe.db.sql(
                "INSERT INTO tabDefaultValue (name, defkey, defvalue, parent, parenttype, parentfield) "
                "VALUES (%s, 'setup_complete', '1', '__default', '__default', 'system_defaults')",
                frappe.generate_hash(length=10),
            )

        frappe.db.commit()
        frappe.clear_cache()
        print(f'Setup wizard suppressed on {site_name}')
    except Exception as e:
        print(f'Warning: Could not suppress setup wizard on {site_name}: {e}')
        # Non-fatal — site may still work, log and continue


def register_sm_apps(site_name, apps=None):
    import frappe

    if apps is None:
        apps = DEFAULT_SM_APPS

    frappe.init(site=site_name)
    frappe.connect()

    registered = []
    already_present = []

    for app_name in apps:
        exists = frappe.db.sql(
            "SELECT name FROM `tabInstalled Application` WHERE app_name=%s",
            app_name,
        )
        if not exists:
            # Installed Application is a child table — insert directly via SQL
            # to avoid parent/parenttype validation issues across Frappe versions
            frappe.db.sql(
                """INSERT INTO `tabInstalled Application`
                   (name, app_name, creation, modified, modified_by, owner, docstatus, idx)
                   VALUES (%s, %s, NOW(), NOW(), 'Administrator', 'Administrator', 0, 0)""",
                (frappe.generate_hash(length=10), app_name),
            )
            registered.append(app_name)
        else:
            already_present.append(app_name)

    frappe.db.commit()

    if registered:
        print(f"Registered for {site_name}: {', '.join(registered)}")
    if already_present:
        print(f"Already present on {site_name}: {', '.join(already_present)}")

    # Always suppress setup wizard — never a human step
    suppress_setup_wizard(frappe, site_name)

    frappe.destroy()

    return registered, already_present


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Register Spark Mojo custom apps and apply required site config'
    )
    parser.add_argument('--site', required=True, help='Frappe site name')
    parser.add_argument('--apps', default=None,
                        help='Comma-separated app names (default: sm_widgets,sm_connectors,sm_provisioning)')
    args = parser.parse_args()

    apps = args.apps.split(',') if args.apps else None
    register_sm_apps(args.site, apps)
