#!/usr/bin/env python3
"""
Create sm_admin service account and SM Admin Service role on a Frappe site.
Idempotent — safe to run multiple times.

Usage (inside Frappe bench):
  bench --site willow.sparkmojo.com execute sm_provisioning.scripts.create_admin_service_account.create_admin_service_account

Standalone:
  python3 create_admin_service_account.py --site willow.sparkmojo.com

Credentials are printed to stdout for vault storage. Never stored in this script.
"""
import argparse
import secrets
import string


def generate_password(length=32):
    """Generate a secure random alphanumeric password."""
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def create_admin_service_account(site_name):
    """Create SM Admin Service role and sm_admin user on the given Frappe site.

    Idempotent: skips creation if role/user already exist.
    """
    import frappe

    frappe.init(site=site_name)
    frappe.connect()

    try:
        # Create role if it doesn't exist
        if not frappe.db.exists("Role", "SM Admin Service"):
            role = frappe.get_doc(
                {
                    "doctype": "Role",
                    "role_name": "SM Admin Service",
                    "description": "Admin Console service account — minimum permissions only",
                }
            )
            role.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Role SM Admin Service created on {site_name}")
        else:
            print(f"Role SM Admin Service already exists on {site_name}")

        # Create service account user if it doesn't exist
        email = "sm_admin@sparkmojo.internal"
        if not frappe.db.exists("User", email):
            password = generate_password()
            user = frappe.get_doc(
                {
                    "doctype": "User",
                    "email": email,
                    "first_name": "SM",
                    "last_name": "Admin Service",
                    "enabled": 1,
                    "send_welcome_email": 0,
                    "roles": [{"role": "SM Admin Service"}],
                }
            )
            user.new_password = password
            user.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Service account created: {email}")
            print(f"STORE IN BITWARDEN: sm_admin — {site_name} = {password}")
        else:
            print(f"Service account already exists: {email}")
    finally:
        frappe.destroy()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create sm_admin service account on a Frappe site"
    )
    parser.add_argument("--site", required=True, help="Frappe site name")
    args = parser.parse_args()
    create_admin_service_account(args.site)
