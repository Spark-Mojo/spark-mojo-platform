# Willow Center Onboarding POC — Status Report

**Date:** March 23, 2026
**Session:** 3c
**Executed by:** Claude Code (AI agent) with James Ilsley

---

## Task Completion Summary

| Task | Status | Notes |
|------|--------|-------|
| 1. Create SM DocTypes | Complete | Updated SM Client (10 new fields), SM Onboarding Item (3 new fields), created SM Outreach Attempt |
| 2. Seed Data Import | Complete | 15 SM Client records — 10 active queue, 3 completed, 2 cancelled |
| 3. Wire Abstraction Layer | Complete | 6 onboarding endpoints + updated desktop/mojos, tenant/public-config |
| 4. Build React Onboarding Mojo | Complete | Queue View, Client Drawer (4 tabs), My Tasks View |
| 5. Register Mojo in Desktop.jsx | Complete | Dynamic Mojo loading from API with fallback |
| 6. Connect Frontend to Frappe | Complete | Dev mode auth bypass, .env configured |
| 7. End-to-End Verification | Complete | All API tests pass (see below) |
| 8. Commit and Document | Complete | This document |

---

## API Test Results

| Test | Result | Detail |
|------|--------|--------|
| Health endpoint | PASS | `{ "status": "ok", "frappe_connected": true }` |
| Desktop/mojos | PASS | Returns Onboarding Mojo definition |
| Auth (dev mode) | PASS | Returns dev user without session cookie |
| Onboarding list | PASS | 15 clients with computed urgency_level + completion_pct |
| Client detail | PASS | Full record with child tables (checklist, outreach) |
| KPI counts | PASS | Active queue, urgent, pending insurance counts correct |
| Checklist toggle | PASS | Toggles item, updates completed_by/completed_at |
| Outreach log | PASS | Creates new outreach attempt entry |
| Notes update | PASS | Saves via POST /api/modules/onboarding/update |
| Tenant config | PASS | Returns Willow Center branding |

---

## Architecture Decisions Made

1. **Dedicated onboarding routes** — Added `routes/onboarding.py` to the abstraction layer with specialized endpoints rather than using the generic CRUD connector, because onboarding requires computed fields (urgency_level, completion_pct) and composite operations (checklist toggle, outreach log).

2. **Dev mode auth bypass** — Auth module returns a mock dev user when `DEV_MODE=true` and no Frappe session cookie is present. This allows frontend development without Frappe login.

3. **Mojo loading from API** — Desktop.jsx now fetches available Mojos from `/api/modules/desktop/mojos` on mount, with a fallback to hardcoded Onboarding Mojo if the API is unreachable.

4. **Urgency computation** — Calculated server-side in the abstraction layer based on first_appointment_date proximity (48hrs = urgent, 7 days = warning).

---

## What Was Built

### Frappe DocTypes (on POC VPS)
- **SM Client** — Extended with 10 new fields: assigned_staff, self_pay, gfe_sent, insurance_card_uploaded, updated_insurance_text, insurance_verified, employer, sp_note_added, insurance_updated_in_sp, outreach_log
- **SM Onboarding Item** — Extended with 3 new fields: category, applies_to_self_pay_only, completed_at
- **SM Outreach Attempt** — New child table: attempt_date, method, staff_initials, notes

### Abstraction Layer Endpoints
- `GET /api/modules/onboarding/list` — List with urgency + completion
- `GET /api/modules/onboarding/get/{name}` — Full record with child tables
- `POST /api/modules/onboarding/update/{name}` — Field updates
- `POST /api/modules/onboarding/checklist/toggle` — Toggle checklist item
- `POST /api/modules/onboarding/outreach/log` — Log outreach attempt
- `GET /api/modules/desktop/mojos` — Mojo registry (hardcoded for POC)
- `GET /api/modules/tenant/public-config` — Willow Center branding

### React Components
- **OnboardingMojo.jsx** — Full Onboarding Mojo with:
  - Queue View: KPI cards, filter chips, searchable table, urgency colors
  - Client Drawer: 5-stage progress, Checklist tab (optimistic toggle), Outreach tab (timeline + inline form), Notes tab (auto-save), Details tab (editable grid)
  - My Tasks View: grouped by overdue/today/upcoming

### Seed Data
- 15 SM Client records covering all status states
- Each with onboarding checklist items (9 template items)
- Active clients have 1-5 outreach log entries
- Realistic appointment dates (urgent, warning, normal)

---

## What Is NOT Yet Built

- **Billing AR Mojo** — Phase 3, not in scope for this POC
- **Real Frappe authentication** — Login form submits to Frappe, but dev mode bypasses it
- **Real-time updates** — No WebSocket/polling; manual refresh only
- **Role-based My Tasks** — Currently hardcoded to "JI" staff initials
- **Desktop state persistence** — Window positions not saved to SM Desktop State
- **Status auto-progression** — Checking all required items doesn't auto-update onboarding_status
- **Client creation** — No "Add Client" flow in the Mojo
- **SimplePractice sync** — SP fields are display-only; no actual sync
- **Mobile responsiveness** — Designed for desktop use only
- **Keyboard shortcuts** — No Alt+Tab or keyboard navigation

---

## Gaps Between Spec and Build

1. **FRONTEND_PRD Section 9.2 not found** — The PRD doesn't have a Section 9.2 specifically for Onboarding Mojo. Built based on the task description in CLAUDE.md and the field mapping from Willow Center spreadsheet structure.

2. **Onboarding status options** — Session 3b used "Paperwork" and "Insurance"; updated to "Paperwork Pending" and "Insurance Pending" per the task spec. These differ from sm-doctypes.md reference.

3. **assigned_clinician field type** — sm-doctypes.md specifies Link to User, but task spec uses Data type (clinician names as strings). Used Data type for POC since there are no Frappe User records for clinicians.

---

## Next Recommended Steps

1. **Browser testing** — Open http://localhost:5173 with both servers running and verify the full UI renders
2. **Status auto-progression** — Add server-side logic to auto-update onboarding_status when all required checklist items are complete
3. **Client creation flow** — Add "New Client" button with modal form
4. **SimplePractice integration** — Wire SP fields to n8n webhook for sync
5. **Billing AR Mojo** — Begin Phase 3 with ERPNext accounting data (sales invoices exist from Session 3b)
6. **Production auth** — Replace dev mode bypass with real Frappe session login
7. **Willow Center demo** — Deploy to VPS with Traefik HTTPS for client preview

---

*POC completed March 23, 2026 · Session 3c · James Ilsley + Claude Code*
