#!/usr/bin/env python3
"""
Register Spark Mojo custom apps for a Frappe site and apply required site configuration.
Uses tabInstalled Application (NOT apps.txt) per CLAUDE.md Rules 11 and 17.
Idempotent — safe to run multiple times.

Also suppresses the ERPNext setup wizard automatically. The wizard has no skip
option and intercepts all URLs including /app. This must be suppressed on every
provisioned site. It is never a human step.

NOTE on sm_connectors: sm_connectors is currently an empty placeholder app.
It is NOT in DEFAULT_SM_APPS and must NOT be registered until the app is
properly scaffolded as a real Frappe app. Registering a non-existent app causes
bench list-apps discrepancies. See BACKLOG: scaffold sm_connectors.

Usage:
  python3 register_sm_apps.py --site willow.sparkmojo.com
  python3 register_sm_apps.py --site willow.sparkmojo.com --apps sm_widgets,sm_provisioning
"""
import argparse

# sm_connectors intentionally excluded — it is an empty placeholder, not a real Frappe app yet
# Do not add sm_connectors here until it is scaffolded with pyproject.toml and module directory
DEFAULT_SM_APPS = ['sm_widgets', 'sm_provisioning']


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
    4. tabDefaultValue desktop:home_page (prevents redirect loop)
    """
    try:
        if frappe.is_setup_complete():
            home_page = frappe.db.sql(
                "SELECT defvalue FROM tabDefaultValue "
                "WHERE defkey='desktop:home_page' AND parent='__default'",
                as_dict=True,
            )
            if home_page and home_page[0].get('defvalue') == 'setup-wizard':
                frappe.db.sql(
                    "UPDATE tabDefaultValue SET defvalue='desktop' "
                    "WHERE defkey='desktop:home_page' AND parent='__default'"
                )
                frappe.db.commit()
                frappe.clear_cache()
                print(f'Setup wizard already suppressed on {site_name} (fixed stale home_page)')
            else:
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

        # 4. Fix home_page if it points to setup-wizard (causes redirect loop)
        frappe.db.sql(
            "UPDATE tabDefaultValue SET defvalue='desktop' "
            "WHERE defkey='desktop:home_page' AND defvalue='setup-wizard' AND parent='__default'"
        )

        frappe.db.commit()
        frappe.clear_cache()
        print(f'Setup wizard suppressed on {site_name}')
    except Exception as e:
        print(f'Warning: Could not suppress setup wizard on {site_name}: {e}')


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
                        help='Comma-separated app names (default: sm_widgets,sm_provisioning)')
    args = parser.parse_args()

    apps = args.apps.split(',') if args.args else None
    register_sm_apps(args.site, apps)
