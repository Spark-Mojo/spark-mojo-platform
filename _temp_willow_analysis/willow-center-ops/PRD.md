# Willow Ops — Product Requirements Document
## Version 1.2 — Onboarding Module + Admin Module

Status: READY FOR PROMPTS
Last updated: 2026-03-13

Modules deferred to Round 2 PRD: Revenue Cycle, Voicemail, Command Center,
Diagnostic Tasks, Custody Agreement Module, Reports.
This document covers the Onboarding module and the Admin module.

---

## Design System

### Logo
Use the Willow Center logo from the repo:
`assets/willow-center-logo.png`
https://github.com/Spark-Mojo/willow-center-ops/blob/main/assets/willow-center-logo.png

### Color Palette
- --accent: #2A7A65 (primary green)
- --accent-mid: #3D9B82
- --accent-light: #EAF4F1
- --bg: #F5F3EF
- --surface: #FFFFFF
- --sidebar: #161D2E
- --text: #1A1A1A
- --muted: #6B7280
- --border: #E4E1D8
- --red: #C94040
- --amber: #C47B1A
- --blue: #2065B8
- --green: #2A7A65

### Typography
- UI font: Sora (Google Fonts)
- Data/numbers: IBM Plex Mono

### Animation Philosophy
- Login page: impressive logo entrance — subtle botanical/leaf particle effect
  as logo fades and scales in, name fades up beneath it
- Client drawer progress bar: animated fill from 0% to actual % with easing;
  animated count-up of the number; re-triggers on every checklist toggle
- General: micro-interactions that feel delightful, not gratuitous
- Transitions: 200ms ease for most UI state changes

---

## Auth & Access

### Login
- Google OAuth 2.0 via sparkmojo.com workspace (temporary — migrates to
  willowcenter.com per migration checklist)
- Domain restriction via env var: VITE_ALLOWED_DOMAIN=sparkmojo.com
- Individual account whitelisting supported alongside domain restriction —
  Erin's and Kate's personal Google accounts can be added by James as admin
  without changing domain restriction

### Roles
- No role-based access control for MVP
- All authenticated users have identical permissions and views

---

## Global Shell

### Sidebar
- Willow Center logo at top
- Module navigation with count badges:
  - Onboarding (active count badge)
  - Revenue Cycle ("Coming in Phase 2")
  - Voicemail ("Coming in Phase 2")
  - Command Center ("Coming in Phase 2")
- Reports section below module nav (stub only — "Coming in Round 2")
- Admin section below Reports
- User name + role at bottom
- Logout button

### Top Bar
- Page title + subtitle
- View switcher: Queue | Kanban | My Tasks
- Search bar — placeholder: "Search by client or clinician name"
- Add Client button

### Toast Notifications
- Non-blocking, auto-dismiss (3 seconds)
- Confirm all write actions
- Error toasts for failed writes (red)

---

## Onboarding Module

### Definition
Onboarding = first contact through moment of first appointment.
Covers: scheduling, paperwork, insurance verification, SP record completion.

### Client Statuses
- **Urgent** — appt <=48hrs with any required item incomplete
- **Pending Insurance** — paperwork done, insurance not yet verified, not self-pay
- **Needs Paperwork** — paperwork not yet complete
- **Ready** — all required items complete
- **Archived** — soft-cancelled, removed from active queue but reactivatable
- **Completed** — historical, moved to Completed tab after first appointment

---

## Queue View

### KPI Cards
- Active Queue | Urgent | Pending Insurance | Appts This Week
- Clickable — sets corresponding filter chip as active

### Filter Chips
- All | Urgent | Pending Insurance | Needs Paperwork | Ready

### Client Table
Columns: Client Name | Clinician | First Appt | Progress | Insurance | Status | Actions

**Client Name:** urgency dot + name text; name is RED when status = Urgent only

**Clinician:** muted text, sortable

**First Appt:** IBM Plex Mono; red <=2 days, amber <=7 days, gray otherwise

**Progress:** mini bar + %; bar color red/amber/green by threshold

**Insurance:** Verified (green) | Self Pay (gray) | carrier name (blue = pending)

**Status:** badge, color matches status

**Actions:** Log Outreach icon button only (View icon removed — row click opens drawer)

### Sorting
- All columns sortable, default: Urgent first then appt date asc
- Sort indicator on active column header

### Search
- Real-time filter on client name AND clinician name

### Add Client (modal)
- Required: name, clinician, first appt date/time, primary insurance (or Self Pay)
- Optional: DOB, member ID, employer, staff assigned
- Writes new row to "Need to Check" tab

---

## Kanban View

### Columns
Paperwork | Insurance | Ready | Urgent

### Column Logic
- **Paperwork:** paperwork_complete = FALSE
- **Insurance:** paperwork_complete = TRUE AND verified != Verified AND not self-pay
- **Ready:** all required items complete
- **Urgent:** appt <=48hrs AND any required item incomplete (overrides all other columns)

### Drag and Drop
- Dragging updates underlying boolean fields to match target column logic
- Dragging to Urgent: sets urgent_override = TRUE
- Dragging out of Urgent: clears urgent_override
- Toast confirms every move

### Client Cards
- Name (red if Urgent), clinician, appt date, mini progress bar
- Checklist pills: Paperwork | Ins Card | Verified | SP Note (green check or red X)

---

## My Tasks View

### Staff Toggle
- Default: logged-in user's tasks
- Dropdown to switch to any other staff member's tasks
- Tasks are not private — coverage use case
- Any user can act on any task regardless of assignment

### Task Groups
- Overdue (red) | Today (amber) | Upcoming (blue)
- Count summary row at top

### Task Items
- Description | Client name (opens drawer) | Clinician | Due date badge

### Filters
- Clinician filter (dropdown or chip)

### Auto-generated Task Types
- "Complete paperwork" — paperwork_complete = FALSE
- "Collect insurance card" — ins_card = FALSE, not self-pay
- "Verify insurance" — verified != Verified, not self-pay
- "Send Good Faith Estimate" — self-pay AND gfe_sent = FALSE
- "Collect custody agreement" — minor AND custody_agreement = FALSE
- "Add SP note" — sp_note_added = FALSE
- "Log outreach attempt" — last attempt was >N days (N from Config tab)
- "Reassign client" — assigned staff member has been deactivated
- "Prepare age-18 paperwork" — client turns 18 within N days (N from Config tab)

---

## Client Drawer

### Header
- Client name | Status badge | Clinician | Staff assigned (editable) | Date added
- Archive button (opens archive flow)
- Reactivate button (shown only on archived clients in Historical view)

### Staff Reassignment (inline in header)
- Staff assigned field is a clickable dropdown
- Sourced from Staff tab (Active only)
- On select: writes new staff initials to Initials column, toast confirms

### Progress Bar
- Animated fill from 0% to actual % on open (easing)
- Animated number count-up
- Re-animates on every checklist toggle
- Color: red <50%, amber 50-80%, green >=80%
- Stage labels: Scheduled -> Paperwork -> Insurance -> Verified -> Ready
- Label states: done (green) | current (accent) | future (muted)

### Tabs: Checklist | Outreach | Notes | Details

---

### Checklist Tab

Items:
1. Paperwork completed [Required — always shown]
2. Insurance card uploaded [Required — hidden if Self Pay]
3. Insurance verified [Required — hidden if Self Pay]
4. Custody agreement collected [Required — shown only if minor or custody field present]
5. Good Faith Estimate sent [Required — shown only if Self Pay]
6. SP note added [Required — always shown]
7. Insurance updated in SimplePractice [Optional — always shown]

**Minor detection:** if DOB present and age < 18, show item 4. If DOB absent
but custody_agreement column exists in row, show item 4 as fallback.

**Behavior:**
- Toggle writes to sheet immediately
- Progress bar re-animates on each toggle
- All required items complete -> status -> Ready, writes to sheet

**Appointment info section:**
- First appt date/time | Clinician | Days until appt (calculated, countdown style)

---

### Outreach Tab

**Timeline:**
- Each entry: date, method badge, staff initials, context note (if provided)
- Connector line between entries
- Total attempt count shown (no cap)

**Log Attempt panel:**
- Optional free-text field: "Add context (optional)"
- Method buttons sourced from Config tab — NOT hardcoded
- Default methods (prepopulated in Config): SP Reminders | Google Text | LVM | EMW | Final Reminder
- Clicking a method button saves: timestamp + method + context + staff email

**Write spec:**
- Attempts 1-5: Date_Attempt_N + Method_Attempt_N columns in Need to Check
- Attempts 6+: new row in Outreach_Log tab
- Context note always written to Outreach_Log tab for all attempts

---

### Notes Tab

- Threaded display: author initials + date + text, oldest first
- Add note: text input + Add button
- Writes to Notes column appended with separator
- Toast confirms
- Post-MVP: @mention staff members

---

### Details Tab

**Client info grid:**
DOB | Employer | Primary Insurance | Member ID | Secondary Insurance |
Verification Status | Staff

**Clinician history:**
- Reverse chronological list of clinician assignments
- Format: Current: [Name] | [Date range]: [Prior Name] ...
- Sourced from Clinician_History column (JSON array of {clinician, start_date, end_date})
- Editable: new entry added on clinician change, history preserved

**SimplePractice sync:**
- SP note added: checkbox (synced with checklist item 6)
- Insurance updated in SP: checkbox (synced with checklist item 7)

---

### Age-18 Transition Flow

**Trigger:** client DOB within N days of 18th birthday (N from Config, default 90)

**What happens:**
1. Amber banner appears in drawer above tabs:
   "This client turns 18 on [date]. Adult paperwork re-send will be required."
2. Auto-generated task: "Prepare age-18 paperwork re-send for [client name]"
   — assigned to client's staff member, due N days before birthday (Config, default 30)
3. Task links to client drawer
4. When task is marked complete: paperwork_complete resets to FALSE,
   triggering the normal paperwork workflow for the client as an adult

**Rationale:** At 18, parental consent is no longer valid. The client must
re-execute all consent, ROI, and treatment agreement documents. The PPW Update
sheet currently tracks these manually — this replaces that process.

---

## Archive / Reactivation Workflow

### Archiving
1. Click Archive in drawer header
2. Confirm modal with reason dropdown:
   - Client changed mind
   - Insurance issue
   - Incomplete paperwork — client unresponsive
   - Distance / location
   - Clinician not available
   - Other (free text)
3. On confirm: row moves to Cancellation [year] tab
   Writes: archive_reason, archive_date, archived_by
   Client removed from active queue, visible in Historical view

### Reactivating
- Reactivate button on archived rows in Historical view
- Confirm modal: "Reactivate [name]'s onboarding?"
- On confirm: row moves back to Need to Check
- Clears archive fields, writes reactivated_date + reactivated_by
- Previous checklist state intact
- Client reappears in active queue
- Toast: "[name] has been reactivated and returned to the queue."

---

## Historical / Completed Clients View

- Tab/link from queue view header
- Shows Completed + Archived (Cancellation) data combined
- Same columns as queue, read-only
- Reactivate button visible on Archived rows
- Filters: year | status (Completed / Archived) | clinician
- Search by name

---

## Admin Module

Sidebar section. Named "Admin."

### Manage Staff

**Staff list:** name | initials | email | role | status (Active/Inactive)

**Add staff:** modal -> writes to Staff tab

**Deactivate staff:**
- Sets status = Inactive (row preserved for history)
- Scans Need to Check for affected clients
- Auto-generates "Reassign client" task for each affected client
- Toast: "[N] clients were assigned to [name]. Reassignment tasks created."

**Reassign All Tasks:**
- From -> To staff dropdowns
- Scope: All tasks | Onboarding only
- Preview count before confirming
- Bulk updates Tasks tab + Need to Check Initials
- Writes audit log entry

### Automation Config

All values stored in Config tab (key | value | description). Editable via Admin UI.

**Settings:**
- outreach_followup_days (default: 3) — days after last attempt before new task
- urgent_threshold_days (default: 2) — days before appt = Urgent
- admin_default_assignee (default: EW) — receives auto-generated admin tasks
- age18_warning_days (default: 90) — days before 18th birthday to trigger flow
- age18_task_due_days (default: 30) — days before birthday when task is due

### Outreach Methods

Managed in Admin — not hardcoded.

**Default methods:** SP Reminders | Google Text | LVM | EMW | Final Reminder

- Add method: text input -> new entry in Config outreach_methods list
- Remove method: removes from list (existing logged attempts retain label)
- Reorder: drag to reorder display sequence on the Log Attempt panel

---

## Custody Agreement Module (Planned — Deferred)

**Status:** Identified as its own module. Requirements definition incomplete.
Do NOT build in Round 1.

**What we know:**
- Currently a boolean in the 24c sheet
- Applies to minor clients only
- High legal stakes — wrong handling creates liability
- The boolean is insufficient for the actual workflow

**Open questions (must answer before scoping):**
- What specific documents are collected? (court order, consent form, both?)
- Are there different custody types requiring different handling?
  (sole custody, joint, no-contact order, shared with restrictions)
- Who reviews the documents — Lisa (clinical) or Sarah (admin)?
- What happens if custody arrangement changes mid-treatment?
- Does the agreement expire or require annual renewal?
- What does "complete" mean — uploaded, reviewed, countersigned, all three?
- Connection to SimplePractice for document storage?

**Interim (Round 1):** custody agreement stays as a checklist item (boolean).
The full module replaces this when requirements are defined.

---

## Reports Section (Deferred to Round 2)

Reports section stub in sidebar (expandable, shows "Coming in Round 2").
No reports built in Round 1. Full brainstorm and implementation deferred.

---

## Google Sheets Structure

### Existing Tabs (unchanged)
- Need to Check | Completed [year] | Cancellation [year] | VM | Clinician NPIs

### New Tabs Required
- **Staff** — name | initials | email | role | status
- **Outreach_Log** — client_id | date | method | context | staff_initials | attempt_number
- **Tasks** — task_id | client_id | task_type | assigned_to | due_date | priority | status | created_at | completed_at | notes | module
- **Audit_Log** — timestamp | staff_email | action | client_id | detail
- **Config** — key | value | description

### New Columns in Need to Check
- urgent_override (boolean)
- archive_reason (text)
- archive_date (date)
- archived_by (text)
- reactivated_date (date)
- reactivated_by (text)
- Clinician_History (JSON)

---

## Write Specifications

| Action | Tab | Columns Written |
|--------|-----|-----------------|
| Toggle checklist item | Need to Check | Corresponding boolean |
| Log outreach attempt 1-5 | Need to Check | Date_Attempt_N, Method_Attempt_N |
| Log outreach attempt 6+ | Outreach_Log | New row |
| Log outreach context (all) | Outreach_Log | New row |
| Add note | Need to Check | Notes (append) |
| Change staff assignment | Need to Check | Initials |
| Archive client | Need to Check -> Cancellation[yr] | Move row + archive fields |
| Reactivate client | Cancellation[yr] -> Need to Check | Move row + reactivated fields |
| Complete client | Need to Check -> Completed[yr] | Move row + completion_date |
| Add new client | Need to Check | New row |
| Drag kanban card | Need to Check | Boolean fields for target column |
| Drag to/from Urgent | Need to Check | urgent_override |
| Toggle SP sync checkboxes | Need to Check | SP_Note_Added, Insurance_Updated |
| Add/deactivate staff | Staff | Row add or status = Inactive |
| Auto-generate task | Tasks | New task row |
| Reassign all tasks | Tasks + Need to Check | assigned_to + Initials bulk |
| Update config value | Config | value column |
| Add/remove outreach method | Config | outreach_methods value |
| Any write action | Audit_Log | New row |

---

## Out of Scope for Round 1

- Revenue Cycle module
- Voicemail Triage module
- Command Center landing page
- Diagnostic open questions as seeded tasks
- Custody Agreement module (requirements incomplete)
- Reports (Round 2)
- @mention in notes
- Bulk actions on queue
- Export to CSV/PDF
- Mobile optimization
- Role-based access control
