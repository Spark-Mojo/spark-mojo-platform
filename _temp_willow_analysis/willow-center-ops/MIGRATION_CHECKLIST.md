# Willow Ops — Migration & Setup Checklist

This file tracks all changes needed to the Google Sheets data source and
all configuration steps required when transitioning between environments.

**Current environment:** James's sparkmojo.com Google Workspace (dev/demo)
**Target environment:** Erin's willowcenter.com Google Workspace (production)

---

## Phase 1 → Phase 2 Migration Steps

### Google Workspace
- [ ] Erin sets up Google Workspace BAA (confirm which services covered)
- [ ] Create shared drive on willowcenter.com workspace for all PHI sheets
- [ ] Move 24c onboarding spreadsheet to willowcenter.com drive
- [ ] Move billing spreadsheet to willowcenter.com drive
- [ ] Update VITE_ALLOWED_DOMAIN env var: sparkmojo.com → willowcenter.com
- [ ] Update Google OAuth client in Google Cloud Console with new domain
- [ ] Re-authorize all staff users under new domain
- [ ] Revoke sparkmojo.com demo access (James, Erin personal, Kate personal)

### Google Sheets — New Tabs to Add Before Launch

All tabs below must be added to the 24c spreadsheet before the app can function.
Columns marked [NEW] do not exist in the current sheet.

#### Staff Tab (new)
```
name | initials | email | role | status
```
Prepopulate with current Willow Center staff:
- [ ] Erin Wiley | EW | erin@willowcenter.com | Owner | Active
- [ ] Lisa [last name] | [initials] | [email] | Clinical Director | Active
- [ ] Sarah [last name] | [initials] | [email] | Practice Coordinator | Active
- [ ] Kaila [last name] | [initials] | [email] | Medical Director | Active
- [ ] Vanessa [last name] | [initials] | [email] | Insurance Verification | Active
(add all remaining staff before go-live)

#### Outreach_Log Tab (new)
```
client_id | date | method | context | staff_initials | attempt_number
```
- [ ] Create tab
- [ ] Backfill from existing outreach columns in Need to Check? (decision: NO —
  going forward only, existing columns remain as-is)

#### Tasks Tab (new)
```
task_id | client_id | task_type | assigned_to | due_date |
priority | status | created_at | completed_at | notes | module
```
- [ ] Create tab
- [ ] Confirm n8n has write access to this tab

#### Audit_Log Tab (new)
```
timestamp | staff_email | action | client_id | detail
```
- [ ] Create tab

#### Config Tab (new)
```
key | value | description
```
Initial config rows:
- [ ] outreach_followup_days | 3 | Days after last outreach attempt before generating a new task
- [ ] urgent_threshold_days | 2 | Days before appt that triggers Urgent status
- [ ] admin_default_assignee | EW | Initials of staff who receives auto-generated admin tasks
- [ ] age18_warning_days | 90 | Days before 18th birthday to show transition banner

### New Columns in Need to Check Tab

Columns to add to the existing Need to Check tab:
- [ ] urgent_override (boolean, default FALSE) — manual Urgent flag from Kanban drag
- [ ] cancellation_reason (text) — populated when client is cancelled via app
- [ ] cancellation_date (date) — populated when client is cancelled via app
- [ ] Clinician_History (text/JSON) — history of clinician assignments
  Format: JSON array [{"clinician": "Dr. Ann", "start": "2024-10-21", "end": "2026-01-01"}, ...]

---

## App Configuration Steps

### Environment Variables (update for each environment)
```
VITE_GOOGLE_CLIENT_ID=        # Google OAuth client ID
VITE_ALLOWED_DOMAIN=          # sparkmojo.com (dev) or willowcenter.com (prod)
VITE_ONBOARDING_SHEET_ID=     # Google Sheet ID for 24c onboarding spreadsheet
VITE_BILLING_SHEET_ID=        # Google Sheet ID for billing spreadsheet
```

### Vercel (current hosting)
- [ ] Set all env vars in Vercel project settings
- [ ] Confirm PHI never touches Vercel (static files only — confirmed by design)
- [ ] Document Vercel as temporary bridge in HIPAA posture doc

### Willow VPS (Phase 2 hosting)
- [ ] VPS setup with HIPAA-compliant configuration
- [ ] Deploy app to VPS
- [ ] Migrate env vars to VPS config
- [ ] Decommission Vercel deployment after VPS confirmed working
- [ ] Update DNS

---

## User Onboarding Steps (at go-live)
- [ ] Add each staff member's Google account to authorized users
- [ ] Walk through login flow with each user
- [ ] Confirm Staff tab is accurate before first login
- [ ] Set Config tab values with Erin (confirm outreach timing, admin assignee)
- [ ] Demo the reassignment flow with Sarah or Lisa
- [ ] Confirm n8n automation is running and connected to the new sheet IDs

---

## Known Constraints
- SimplePractice has no API access — all SP sync is manual (checkboxes in app)
- ESI IVR contract limits voicemail integration options in Phase 1
- Google Sheets is PHI data layer for Phase 1 only — data lake in Phase 2
