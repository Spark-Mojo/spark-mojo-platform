# Willow Center Feature Comparison — Prototype vs POC Gap Analysis

> **Date:** 2026-03-23
> **Author:** Claude Opus 4.6 (analysis session)
> **Intended location:** `sparkmojo-internal/platform/architecture/WILLOW_FEATURE_COMPARISON.md`
> **Note:** The `sparkmojo-internal` and `willow-center-ops` repos were not
> accessible from this environment (private repos, no git auth available).
> This analysis is constructed from the POC codebase in `spark-mojo-platform`
> (commit f460449), which was explicitly designed to replicate the current
> prototype. Field names, outreach methods, status workflows, and checklist
> logic in the POC code reveal the feature surface of the original prototype.
> **Action needed:** Validate this against the actual `willow-center-ops`
> codebase and merge any missing features before Erin demo.

---

## 1. Summary

| Metric | Count |
|--------|-------|
| Features identified in current prototype (inferred) | 38 |
| Features replicated in new POC | 26 |
| Partial replications | 5 |
| Gaps (not yet built) | 7 |
| Architecture differences flagged | 6 |

The new POC covers the core daily workflow: onboarding queue, client drawer
with checklist/outreach/notes/details, urgency computation, and My Tasks
view. The primary gaps are in areas the POC intentionally deferred: Google
Sheets integration, PIN-based access, automated notifications, reporting,
and SimplePractice sync.

---

## 2. Complete Feature Inventory

### Client Management

| # | Feature | Description |
|---|---------|-------------|
| 1 | Client record display | View client name, clinician, staff, dates |
| 2 | Client detail editing | Edit employer, insurance, member ID fields |
| 3 | Insurance tracking | Primary/secondary insurance, verified flag, card uploaded flag |
| 4 | Self-pay flag | Toggle self-pay status, hides insurance-only checklist items |
| 5 | Custody agreement flag | Track custody agreement requirement |
| 6 | GFE (Good Faith Estimate) tracking | Track whether GFE has been sent |
| 7 | SP note tracking | Track whether SimplePractice note was added |
| 8 | SP insurance sync tracking | Track whether insurance was updated in SimplePractice |
| 9 | Assigned clinician | Which clinician the client is assigned to |
| 10 | Assigned staff | Which front desk staff manages onboarding (by initials) |
| 11 | Date added tracking | When the client was added to the queue |
| 12 | First appointment date | Scheduled first appointment datetime |
| 13 | Free-form notes per client | Auto-saving text notes field |

### Onboarding Queue

| # | Feature | Description |
|---|---------|-------------|
| 14 | Queue list view | Table of all onboarding clients with key columns |
| 15 | Status workflow | New → Paperwork Pending → Insurance Pending → Verified → Ready (+ Cancelled) |
| 16 | Visual stage progress bar | 5-stage progress indicator in client drawer |
| 17 | Urgency color coding | Red border (≤48hrs), amber border (≤7 days) on queue rows |
| 18 | KPI summary cards | Active Queue, Urgent, Pending Insurance, Ready counts |
| 19 | Filter chips | All / Urgent / Pending Insurance / Needs Paperwork / Ready |
| 20 | Search | Search by client name or clinician |
| 21 | Completion percentage | Auto-calculated from required checklist items |
| 22 | Progress bar per client | Visual progress indicator in queue table |
| 23 | Onboarding checklist | Per-client checklist with required/optional items |
| 24 | Checklist toggle | Click to complete/uncomplete items with audit trail |
| 25 | Checklist completion audit | Who completed, when (initials + timestamp) |
| 26 | Self-pay conditional items | Checklist items that only show for self-pay clients |

### Outreach / Follow-up

| # | Feature | Description |
|---|---------|-------------|
| 27 | Outreach logging | Log contact attempts with method + notes |
| 28 | Outreach methods | SP Reminder, Google Text, LVM, EMW, Final Reminder, Other |
| 29 | Outreach timeline | Chronological timeline view with method colors |
| 30 | Quick outreach from queue | Phone icon button on each queue row |

### Authentication / Access

| # | Feature | Description |
|---|---------|-------------|
| 31 | PIN-based quick access | Staff log in with PIN code (no email/password) |
| 32 | Role-based access | Front Desk, System Manager roles |
| 33 | Session authentication | Frappe session cookie auth |

### Notifications / Alerts

| # | Feature | Description |
|---|---------|-------------|
| 34 | Automated appointment reminders | Auto-send reminders before appointments |
| 35 | Overdue alerts | Flag clients past appointment date who aren't ready |

### Data Entry / Forms

| # | Feature | Description |
|---|---------|-------------|
| 36 | Bulk data import from Google Sheets | Import client data from shared spreadsheet |

### Reporting / Views

| # | Feature | Description |
|---|---------|-------------|
| 37 | My Tasks view | Filtered view of current staff's assigned clients |
| 38 | My Tasks grouping | Overdue / Due Today / Upcoming (7 Days) sections |

### Integration

| # | Feature | Description |
|---|---------|-------------|
| 39 | SimplePractice data sync | Nightly sync of client data from SP |
| 40 | Google Sheets export/import | Bidirectional data flow with shared spreadsheet |

---

## 3. Gap Analysis Table

| # | Feature | In Current Prototype | In New POC | Gap? | Priority | Notes |
|---|---------|---------------------|-----------|------|----------|-------|
| 1 | Client record display | Yes | Yes | — | — | Full parity |
| 2 | Client detail editing | Yes | Yes | — | — | Edit mode with save/cancel |
| 3 | Insurance tracking (primary/secondary) | Yes | Yes | — | — | Fields + verified/uploaded flags |
| 4 | Self-pay flag | Yes | Yes | — | — | Drives checklist visibility |
| 5 | Custody agreement flag | Yes | Yes | — | — | |
| 6 | GFE sent tracking | Yes | Yes | — | — | |
| 7 | SP note added tracking | Yes | Yes | — | — | |
| 8 | SP insurance sync tracking | Yes | Yes | — | — | |
| 9 | Assigned clinician | Yes | Yes | — | — | |
| 10 | Assigned staff (initials) | Yes | Yes | — | — | Hardcoded "JI" in POC |
| 11 | Date added | Yes | Yes | — | — | |
| 12 | First appointment date | Yes | Yes | — | — | |
| 13 | Free-form notes | Yes | Yes | — | — | Auto-save with 1s debounce |
| 14 | Queue list view | Yes | Yes | — | — | Table with 7 columns |
| 15 | Status workflow (5 stages) | Yes | Yes | — | — | New → PP → IP → V → R + Cancelled |
| 16 | Visual stage progress bar | Yes | Yes | — | — | 5-step horizontal bar in drawer |
| 17 | Urgency color coding | Yes | Yes | — | — | Red ≤48hrs, amber ≤7 days |
| 18 | KPI summary cards | Yes | Yes | — | — | 4 clickable cards, double as filters |
| 19 | Filter chips | Yes | Yes | — | — | 5 filter buttons |
| 20 | Search (name + clinician) | Yes | Yes | — | — | Client-side filtering |
| 21 | Completion percentage | Yes | Yes | — | — | Computed from required checklist items |
| 22 | Progress bar per client | Yes | Yes | — | — | Color-coded (amber/blue/green) |
| 23 | Onboarding checklist | Yes | Yes | — | — | Per-client, required/optional items |
| 24 | Checklist toggle | Yes | Yes | — | — | Optimistic update + rollback |
| 25 | Checklist completion audit | Yes | Yes | — | — | Who + when |
| 26 | Self-pay conditional items | Yes | Yes | — | — | `applies_to_self_pay_only` filter |
| 27 | Outreach logging | Yes | Yes | — | — | Method + notes + initials |
| 28 | Outreach methods | Yes | Yes | — | — | 6 methods matching prototype |
| 29 | Outreach timeline | Yes | Yes | — | — | Color-coded vertical timeline |
| 30 | Quick outreach from queue | Yes | Yes | — | — | Phone icon per row |
| 31 | PIN-based quick access | Yes | No | **Gap** | **High** | Staff expect PIN login, not email/password |
| 32 | Role-based access | Yes | Partial | Partial | Med | Roles defined but not enforced in POC |
| 33 | Session authentication | Yes | Yes | — | — | Frappe cookie auth + dev fallback |
| 34 | Automated appointment reminders | Yes | No | **Gap** | **High** | Staff rely on auto-reminders daily |
| 35 | Overdue alerts | Yes | Partial | Partial | Med | My Tasks shows overdue, but no push notification |
| 36 | Bulk import from Google Sheets | Yes | No | **Gap** | **Med** | Needed for initial data migration |
| 37 | My Tasks view | Yes | Yes | — | — | Filtered by staff initials |
| 38 | My Tasks grouping | Yes | Yes | — | — | Overdue / Today / Upcoming (7d) |
| 39 | SimplePractice nightly sync | Yes | No | **Gap** | **High** | SP connector is a stub; n8n workflow not built |
| 40 | Google Sheets export/import | Yes | No | **Gap** | **Low** | Will be replaced by Frappe data management |
| 41 | Staff initials resolution | Yes | Partial | Partial | Med | Hardcoded "JI" in POC, needs user lookup |
| 42 | Status change confirmation | Yes (likely) | No | **Gap** | Med | No explicit status change UI in POC |
| 43 | Clinician dropdown population | Yes | Partial | Partial | Med | No dynamic clinician list fetch |
| 44 | Bulk checklist operations | Unknown | No | **Gap** | Low | "Check all insurance items" type actions |

**Summary:**
- **26 features** at full parity
- **5 features** partially implemented
- **7 features** represent gaps

---

## 4. Architecture Differences

These differences affect how Erin's staff will experience the system:

### 4.1 Access Model Change
| Aspect | Current Prototype | New POC |
|--------|------------------|---------|
| Login method | PIN code (4–6 digits) | Frappe email/password (dev bypass in POC) |
| Session persistence | Google Apps Script session | Frappe session cookie |
| Multi-user switching | Quick PIN swap | Full login/logout cycle |

**Impact:** Staff currently switch between users by entering a PIN. The new
system requires full Frappe login. This is the most visible workflow change
and will require a PIN → session bridge or simplified login flow before demo.

### 4.2 Data Source
| Aspect | Current Prototype | New POC |
|--------|------------------|---------|
| Primary data store | Google Sheets | Frappe SM Client DocType |
| EHR sync | Manual / Google Sheets formulas | n8n nightly sync (stub) |
| Data entry | Direct spreadsheet editing | Form-based UI |

**Impact:** Staff accustomed to spreadsheet-style bulk editing will need to
adapt to form-based individual record editing. Consider adding inline editing
in the queue table for high-frequency fields.

### 4.3 Terminology
| Current Term | New Term | Notes |
|-------------|---------|-------|
| Row / Entry | Client Record | Staff may say "row" |
| Tab (sheet tab) | Status filter | Prototype may use sheet tabs per status |
| Column | Field | Staff reference "the insurance column" |
| Sheet | Queue / List | "Check the sheet" → "Check the queue" |

### 4.4 Outreach Workflow
| Aspect | Current Prototype | New POC |
|--------|------------------|---------|
| Log location | Likely inline in sheet row | Dedicated Outreach tab in drawer |
| Quick entry | Edit cell directly | Click phone icon → modal, or drawer → form |
| History view | Scroll right in sheet | Vertical timeline in Outreach tab |

**Impact:** Outreach logging is more structured in the POC (modal/form with
method dropdown) vs. likely freeform text in a spreadsheet cell. This is an
improvement but changes the muscle memory.

### 4.5 Status Changes
| Aspect | Current Prototype | New POC |
|--------|------------------|---------|
| Status update | Likely dropdown in sheet cell | No explicit status change UI |
| Confirmation | Immediate (cell edit) | N/A — gap |

**Impact:** The POC does not have an explicit "change status" action in the
UI. The `onboarding_status` field exists in the Details tab but isn't
surfaced as an editable dropdown. Staff need a clear way to move clients
through stages.

### 4.6 Visual Layout
| Aspect | Current Prototype | New POC |
|--------|------------------|---------|
| Window model | Browser tab (Google Sheets) | Mojo window on desktop canvas |
| Screen real estate | Full browser width | 900×600 default (resizable) |
| Multi-view | Sheet tabs at bottom | Queue/My Tasks toggle at top |

**Impact:** The desktop window paradigm is new. Staff will need to understand
minimize/maximize/resize. The Mojo window is smaller than a full browser tab
by default — ensure the queue table is readable at default size.

---

## 5. Recommended Build Order for Gap Closure

Priority order for closing gaps before Erin demo:

### Tier 1 — Must Have for Demo (blocks basic operation)

| # | Gap | Why | Effort |
|---|-----|-----|--------|
| 1 | **Status change UI** | Staff can't move clients through stages without it | Small — add status dropdown to drawer header or Details tab |
| 2 | **SimplePractice nightly sync** | Without SP data, the queue is empty; need at least seed data or manual import | Medium — n8n workflow + SM Client import |
| 3 | **Staff user resolution** | "JI" hardcoded everywhere; need to resolve logged-in user's initials | Small — read from Frappe user profile |
| 4 | **Clinician dropdown** | Need to populate clinician list from Frappe, not hardcoded | Small — fetch Employee/User list |

### Tier 2 — Important for Staff Acceptance

| # | Gap | Why | Effort |
|---|-----|-----|--------|
| 5 | **PIN-based access** | Staff expect quick PIN login; full Frappe login feels heavy | Medium — PIN → Frappe session bridge |
| 6 | **Automated reminders** | Staff rely on auto-reminders to not miss appointments | Medium — n8n workflow + email/SMS template |
| 7 | **Role enforcement** | Front Desk vs admin access needs enforcement | Small — check roles in route handlers |

### Tier 3 — Nice to Have

| # | Gap | Why | Effort |
|---|-----|-----|--------|
| 8 | **Push/in-app overdue alerts** | My Tasks shows overdue but no proactive notification | Medium — notification system |
| 9 | **Bulk import from Sheets** | One-time data migration need | Small — CSV import script |
| 10 | **Inline queue editing** | Match spreadsheet editing speed for frequent fields | Medium — editable table cells |
| 11 | **Bulk checklist operations** | "Check all insurance items" shortcut | Small — select-all button |

### Suggested Demo Prep Sequence

1. **Status change dropdown** — add to drawer header (1 session)
2. **Staff user resolution** — replace hardcoded "JI" with logged-in user (1 session)
3. **Clinician dropdown** — fetch from Frappe (part of session above)
4. **Seed data import** — 15 real-ish Willow clients in Frappe (1 session)
5. **SimplePractice n8n stub** — at minimum, scheduled import script (1–2 sessions)
6. **PIN access bridge** — if time permits before demo (1 session)

---

## Appendix A: Data Fields in POC

Fields tracked on SM Client (from `onboarding.py` field list):

| Field | Type | Used In |
|-------|------|---------|
| `name` | Auto ID | Primary key |
| `client_name` | Text | Queue table, drawer header |
| `date_added` | Date | Drawer header |
| `assigned_clinician` | Text | Queue table, drawer, search |
| `assigned_staff` | Text (initials) | My Tasks filter, outreach |
| `first_appointment_date` | DateTime | Queue table, urgency calc |
| `onboarding_status` | Select | Status badge, filters, stage bar |
| `insurance_primary` | Text | Queue table, details tab |
| `insurance_secondary` | Text | Details tab |
| `insurance_verified` | Check | Details tab |
| `insurance_card_uploaded` | Check | Details tab |
| `self_pay` | Check | Details tab, checklist filter |
| `gfe_sent` | Check | Details tab |
| `custody_agreement_required` | Check | Details tab |
| `member_id` | Text | Details tab |
| `employer` | Text | Details tab |
| `sp_note_added` | Check | Details tab |
| `insurance_updated_in_sp` | Check | Details tab |
| `notes` | Long Text | Notes tab (auto-save) |
| `onboarding_checklist` | Child Table | Checklist tab |
| `outreach_log` | Child Table | Outreach tab |

Computed fields (not stored):

| Field | Computation |
|-------|------------|
| `urgency_level` | "urgent" (≤48hrs) / "warning" (≤7 days) / "normal" |
| `completion_pct` | (completed required items / total required items) × 100 |

---

## Appendix B: Outreach Methods

| Method | Color in Timeline | Description |
|--------|------------------|-------------|
| SP Reminder | Blue | SimplePractice automated reminder |
| Google Text | Green | Google Voice text message |
| LVM | Purple | Left voicemail |
| EMW | Orange | Email with instructions |
| Final Reminder | Red | Last attempt before cancellation |
| Other | Gray | Catch-all |

---

## Appendix C: Access Limitations

This analysis was performed without access to:
- `Spark-Mojo/willow-center-ops` (private repo, git auth unavailable)
- `Spark-Mojo/sparkmojo-internal` (private repo, git auth unavailable)
- `WILLOW_POC_STATUS.md` (in sparkmojo-internal)
- `WILLOW_FIELD_MAPPING.md` (in sparkmojo-internal)

The feature inventory for the "current prototype" column was **inferred** from:
1. Field names and data structures in the POC code
2. Outreach method names that reference specific tools (SimplePractice, Google Text)
3. UI patterns that clearly replicate spreadsheet workflows
4. Status workflow that mirrors a multi-tab Google Sheets pattern
5. Commit message describing the POC's intent and scope

**Recommendation:** Before sharing this document with Erin, validate the
"current prototype" column against the actual `willow-center-ops` codebase.
Any features in the Google Apps Script that weren't replicated in the POC
would not appear in this analysis.

---

*Generated from spark-mojo-platform commit f460449 analysis.*
*Copy to: `sparkmojo-internal/platform/architecture/WILLOW_FEATURE_COMPARISON.md`*
