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
    Suppress the ERPNext setup wizard by setting setup_complete = 1 in System Settings.
    The wizard intercepts ALL URLs (including /app) until this flag is set.
    There is no skip option. This is required on every provisioned site.
    See PROVISIONING_RUNBOOK.md Phase 5d.
    """
    try:
        current = frappe.db.get_single_value('System Settings', 'setup_complete')
        if current:
            print(f'Setup wizard already suppressed on {site_name}')
            return
        frappe.db.set_single_value('System Settings', 'setup_complete', 1)
        frappe.db.commit()
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
        if not frappe.db.exists('Installed Application', app_name):
            doc = frappe.get_doc({
                'doctype': 'Installed Application',
                'app_name': app_name
            })
            doc.insert(ignore_permissions=True)
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
