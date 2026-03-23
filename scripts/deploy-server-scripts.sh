#!/bin/bash
# Deploy Server Scripts to Frappe POC VPS
# Run from the VPS: bash deploy-server-scripts.sh
#
# Prerequisites:
#   - Frappe POC containers running
#   - server_script_enabled = 1 in site_config.json
#   - SM Client DocType has: archive_reason (Small Text), archived_date (Date),
#     archived_notes (Small Text), completed_date (Date) custom fields

set -euo pipefail

CONTAINER="frappe-poc-backend-1"
SITE="frontend"

echo "=== Step 1: Ensure Server Scripts are enabled ==="
docker exec "$CONTAINER" bench --site "$SITE" set-config server_script_enabled 1

echo "=== Step 2: Add custom fields (archive_reason, archived_date, archived_notes, completed_date) ==="
docker exec "$CONTAINER" bench --site "$SITE" execute 'frappe.get_doc' --args '[]' --kwargs '{}' 2>/dev/null || true

# Add custom fields via bench console
docker exec "$CONTAINER" bench --site "$SITE" console <<'PYEOF'
import frappe

# Add archive_reason field if not exists
if not frappe.db.exists("Custom Field", {"dt": "SM Client", "fieldname": "archive_reason"}):
    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "SM Client",
        "fieldname": "archive_reason",
        "fieldtype": "Small Text",
        "label": "Archive Reason",
        "insert_after": "notes"
    }).insert(ignore_permissions=True)
    print("Created: archive_reason")
else:
    print("Exists: archive_reason")

if not frappe.db.exists("Custom Field", {"dt": "SM Client", "fieldname": "archived_date"}):
    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "SM Client",
        "fieldname": "archived_date",
        "fieldtype": "Date",
        "label": "Archived Date",
        "insert_after": "archive_reason"
    }).insert(ignore_permissions=True)
    print("Created: archived_date")
else:
    print("Exists: archived_date")

if not frappe.db.exists("Custom Field", {"dt": "SM Client", "fieldname": "archived_notes"}):
    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "SM Client",
        "fieldname": "archived_notes",
        "fieldtype": "Small Text",
        "label": "Archive Notes",
        "insert_after": "archived_date"
    }).insert(ignore_permissions=True)
    print("Created: archived_notes")
else:
    print("Exists: archived_notes")

if not frappe.db.exists("Custom Field", {"dt": "SM Client", "fieldname": "completed_date"}):
    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "SM Client",
        "fieldname": "completed_date",
        "fieldtype": "Date",
        "label": "Completed Date",
        "insert_after": "archived_notes"
    }).insert(ignore_permissions=True)
    print("Created: completed_date")
else:
    print("Exists: completed_date")

frappe.db.commit()
print("Custom fields ready.")
PYEOF

echo "=== Step 3: Create Status Auto-Progression Server Script ==="
docker exec "$CONTAINER" bench --site "$SITE" console <<'PYEOF'
import frappe

script_name = "SM Client Status Auto-Progression"

if frappe.db.exists("Server Script", script_name):
    doc = frappe.get_doc("Server Script", script_name)
    print(f"Updating existing script: {script_name}")
else:
    doc = frappe.new_doc("Server Script")
    doc.name = script_name
    print(f"Creating new script: {script_name}")

doc.script_type = "DocType Event"
doc.reference_doctype = "SM Client"
doc.doctype_event = "Before Save"
doc.enabled = 1
doc.script = """# Auto-advance onboarding_status based on checklist completion
# Server Script: Before Save (validate hook) — SM Client
# ZERO imports — RestrictedPython sandbox

if doc.onboarding_checklist:
    if doc.self_pay:
        required = [i for i in doc.onboarding_checklist if i.is_required]
    else:
        required = [i for i in doc.onboarding_checklist
                    if i.is_required and not i.applies_to_self_pay_only]

    completed = [i for i in required if i.is_complete]

    if len(required) > 0 and len(completed) == len(required):
        if doc.onboarding_status not in ("Ready", "Cancelled"):
            doc.onboarding_status = "Ready"
    elif len(completed) > 0:
        if doc.onboarding_status == "New":
            doc.onboarding_status = "Paperwork Pending"
        elif doc.onboarding_status == "Paperwork Pending":
            insurance_items = [i for i in doc.onboarding_checklist
                               if i.category == "Insurance" and i.is_required]
            insurance_done = [i for i in insurance_items if i.is_complete]
            if len(insurance_items) > 0 and len(insurance_done) == len(insurance_items):
                doc.onboarding_status = "Insurance Pending"
"""

doc.save(ignore_permissions=True)
frappe.db.commit()
print(f"Server Script '{script_name}' saved and enabled.")
PYEOF

echo "=== Step 4: Run bench migrate ==="
docker exec "$CONTAINER" bench --site "$SITE" migrate

echo "=== Done! Server Script deployed. ==="
echo "Test: Toggle all required checklist items on a test client and verify status auto-advances."
