#!/usr/bin/env python3
"""
Register Spark Mojo custom apps for a Frappe site.
Uses tabInstalled Application (NOT apps.txt) per CLAUDE.md Rules 11 and 17.
Idempotent — safe to run multiple times.

Usage:
  python3 register_sm_apps.py --site willow.sparkmojo.com
  python3 register_sm_apps.py --site willow.sparkmojo.com --apps sm_widgets,sm_connectors
"""
import argparse

DEFAULT_SM_APPS = ['sm_widgets', 'sm_connectors', 'sm_provisioning']


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
    frappe.destroy()

    if registered:
        print(f"Registered for {site_name}: {', '.join(registered)}")
    if already_present:
        print(f"Already present on {site_name}: {', '.join(already_present)}")

    return registered, already_present


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Register Spark Mojo custom apps in tabInstalled Application'
    )
    parser.add_argument('--site', required=True, help='Frappe site name')
    parser.add_argument('--apps', default=None,
                        help='Comma-separated app names (default: sm_widgets,sm_connectors,sm_provisioning)')
    args = parser.parse_args()

    apps = args.apps.split(',') if args.apps else None
    register_sm_apps(args.site, apps)
