# Morning Test Plan — Three-Site Topology Verification
**Date:** April 1, 2026 (morning after Session 15)  
**Time required:** ~30 minutes  
**Goal:** Confirm all four sites are fully operational before starting the Mega Agent Run

Work through each section in order. Mark each check ✅ or ❌ as you go.

---

## Section 1 — Basic Access (5 minutes)

Open each URL in a browser tab. Log in with `Administrator` + password from Bitwarden.

| URL | Expected | Result |
|-----|----------|--------|
| https://admin.sparkmojo.com/app | Frappe desktop — no wizard | |
| https://poc-dev.sparkmojo.com/app | Frappe desktop — no wizard | |
| https://internal.sparkmojo.com/app | Frappe desktop — no wizard | |
| https://willow.sparkmojo.com/app | Frappe desktop — no wizard | |
| https://app.poc.sparkmojo.com | React frontend loads | |
| https://poc-dev.app.sparkmojo.com | React frontend loads | |

**If any site still shows the setup wizard:** Run the HOTFIX-WIZARD.md Claude Code session — it fixes this via direct SQL.

**If TLS cert error on poc-dev.sparkmojo.com:** Wait 5 more minutes and retry. Traefik is still issuing the cert. Do not proceed until TLS is clean.

---

## Section 2 — Installed Apps Check (5 minutes)

SSH into the VPS and verify apps on each site:

```bash
ssh sparkmojo

FRAPPE="frappe-poc-backend-1"

for SITE in admin.sparkmojo.com poc-dev.sparkmojo.com internal.sparkmojo.com willow.sparkmojo.com; do
  echo "=== $SITE ==="
  docker exec $FRAPPE bench --site $SITE list-apps 2>/dev/null
  echo ""
done
```

**Expected results:**

| Site | Expected Apps |
|------|--------------|
| admin.sparkmojo.com | frappe, erpnext, sm_provisioning, sm_widgets, sm_connectors |
| poc-dev.sparkmojo.com | frappe, erpnext, sm_provisioning, sm_widgets, sm_connectors, crm, payments, hrms, wiki, lms, helpdesk, marley |
| internal.sparkmojo.com | frappe, erpnext, sm_provisioning, sm_widgets, sm_connectors |
| willow.sparkmojo.com | frappe, erpnext, sm_provisioning, sm_widgets, sm_connectors, marley |

**If poc-dev is missing Round 1 apps:** This is the issue from last night — the apps show as installed in bench but may not be visible in Frappe Desk. See Section 4.

---

## Section 3 — Abstraction Layer Health (2 minutes)

```bash
for URL in \
  https://poc.sparkmojo.com/health \
  https://poc-dev.app.sparkmojo.com/health \
  https://internal.app.sparkmojo.com/health \
  https://willow.app.sparkmojo.com/health; do
  echo -n "$URL → "
  curl -s --max-time 10 "$URL" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "unreachable"
done
```

**Expected:** All four return `ok`

---

## Section 4 — Round 1 Apps Visible in Frappe Desk (10 minutes)

This is what you reported last night — apps installed but not visible. Work through this on poc-dev only.

**Step 4a: Check via browser**

Log into https://poc-dev.sparkmojo.com/app  
Go to: Search bar (top) → type "CRM" → look for CRM module  
Go to: Search bar → type "HRMS" → look for HR module  
Go to: Search bar → type "LMS" → look for Learning module  

If modules appear in search: apps are installed and working. They may just not be on the home screen. ✅  
If modules don't appear: apps are registered but not migrated, or installation failed. ❌

**Step 4b: If Step 4a fails — check via bench**

```bash
ssh sparkmojo

# Check if crm tables exist in the poc-dev database
docker exec frappe-poc-backend-1 \
  bench --site poc-dev.sparkmojo.com execute \
  "print(frappe.db.table_exists('CRM Lead'))"
# PASS: True
# FAIL: False — CRM not properly installed

# If False, re-run migrate
docker exec frappe-poc-backend-1 \
  bench --site poc-dev.sparkmojo.com migrate
# Then recheck
```

**Step 4c: If migrate doesn't fix it — re-install the app**

```bash
# Example for CRM — repeat pattern for any failing app
docker exec frappe-poc-backend-1 \
  bench --site poc-dev.sparkmojo.com install-app crm
docker exec frappe-poc-backend-1 \
  bench --site poc-dev.sparkmojo.com migrate
```

---

## Section 5 — SM Site Registry Check (3 minutes)

Verify the Admin Console has all four sites registered:

Log into https://admin.sparkmojo.com/app  
Go to: Search → "SM Site Registry"  
Should see 4 records: admin, poc-dev, internal, willow  

| Site Subdomain | Active | Server Tier | Site Type |
|---------------|--------|-------------|-----------|
| admin | ✅ | standard | admin |
| poc-dev | ✅ | standard | dev |
| internal | ✅ | standard | internal |
| willow | ✅ | standard | behavioral_health |

---

## Section 6 — Google OAuth (2 minutes)

Test that Google OAuth still works on the React frontend:

1. Go to https://app.poc.sparkmojo.com
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Should land on the Spark Mojo React desktop

**If Google OAuth fails with redirect_uri_mismatch:**  
Go to https://console.cloud.google.com → APIs & Services → Credentials → OAuth Client  
Add these authorized redirect URIs:
- `https://poc-dev.app.sparkmojo.com/api/method/frappe.integrations.oauth2_logins.login_via_google`
- `https://admin.app.sparkmojo.com/api/method/frappe.integrations.oauth2_logins.login_via_google`
- `https://internal.app.sparkmojo.com/api/method/frappe.integrations.oauth2_logins.login_via_google`
- `https://willow.app.sparkmojo.com/api/method/frappe.integrations.oauth2_logins.login_via_google`

---

## Section 7 — Smoke Test (1 minute)

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./scripts/smoke_test.sh'
```

**Expected:** 16/16 checks pass

---

## Summary Scorecard

Fill this in after working through all sections:

| Check | Status |
|-------|--------|
| All 4 sites load without wizard | |
| TLS certs valid on all subdomains | |
| Round 1 apps visible on poc-dev | |
| Abstraction layer healthy on all 4 sites | |
| SM Site Registry has 4 active records | |
| Google OAuth works on React frontend | |
| Smoke test 16/16 | |

**If all green:** Three-site topology is fully verified. Ready to plan the Mega Agent Run.  
**If any red:** Note which section failed and start a Claude Code session with the specific failure.

---

## If Round 1 Apps Are Still Not Showing

The most likely cause: the apps were fetched and installed during INFRA-007 but 
`bench migrate` didn't run after installation, so the DocTypes weren't created in the database.

Run this Claude Code prompt if needed:

```
SSH into the VPS (ssh sparkmojo).
For poc-dev.sparkmojo.com, run bench migrate and verify that the following
apps have their DocTypes accessible: crm, payments, hrms, wiki, lms, helpdesk, marley.

For each app, check by searching for a known DocType:
- crm: CRM Lead
- payments: Payment Gateway
- hrms: Employee
- wiki: Wiki Page
- lms: Course
- helpdesk: HD Ticket
- marley: Patient

For any app where the DocType doesn't exist, run:
  bench --site poc-dev.sparkmojo.com install-app [app]
  bench --site poc-dev.sparkmojo.com migrate

Verify all 7 apps are working at the end.
```
