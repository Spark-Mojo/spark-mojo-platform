# Willow Ops — Claude Code Build Prompts

Run these prompts IN ORDER in a Claude Code session. Each builds on the last.
Do not skip ahead. Do not start a new prompt until the previous one is working.

Before starting, read:
- PRD.md — full feature requirements
- MIGRATION_CHECKLIST.md — all required Google Sheets tabs and columns
- assets/willow-center-logo.png — the logo to use throughout

---

## PROMPT 1 — Project scaffold + design system

```
Create a React single-page application called "Willow Ops" using Vite + React + Tailwind CSS, configured for Vercel deployment.

Design system (implement as CSS variables in index.css):
  --accent: #2A7A65
  --accent-mid: #3D9B82
  --accent-light: #EAF4F1
  --bg: #F5F3EF
  --surface: #FFFFFF
  --sidebar: #161D2E
  --text: #1A1A1A
  --muted: #6B7280
  --border: #E4E1D8
  --red: #C94040
  --amber: #C47B1A
  --blue: #2065B8
  --green: #2A7A65

Fonts (load from Google Fonts):
  - Sora: 300, 400, 500, 600 — all UI text
  - IBM Plex Mono: 400, 500 — all numbers and data

Login page:
  - Full-screen, background color var(--bg)
  - Centered card (max-width 400px)
  - Logo animation on load: the Willow Center logo (from public/willow-center-logo.png)
    fades in and scales from 0.85 to 1.0 with a subtle upward drift over 600ms;
    simultaneously, 6-8 small leaf-shaped SVG particles drift upward and fade out
    from behind the logo (staggered, each particle is a simple teardrop/leaf path
    in var(--accent-light) at low opacity)
  - Logo sits above the app name "Willow Ops" (Sora 24px 500) and tagline
    "Practice Operations Platform" (Sora 13px muted)
  - "Sign in with Google" button below (standard Google OAuth button style)
  - Footer: "Powered by Spark Mojo" in 11px muted text

App shell (shown after login):
  Left sidebar (220px, fixed, background var(--sidebar)):
    - Logo + wordmark at top (logo 28px, "Willow Ops" in white Sora 13px 500,
      "Practice Platform" in 10px rgba(255,255,255,0.4))
    - Navigation items with count badges:
        Onboarding — active state: bg var(--accent), text white
        Revenue Cycle — shows "Phase 2" italic tag instead of badge
        Voicemail — shows "Phase 2" italic tag
        Command Center — shows "Phase 2" italic tag
    - Divider then "REPORTS" section label (9px uppercase letter-spaced muted white)
        Onboarding Reports (nav item, no badge)
    - Divider then "ADMIN" section label
        Manage Staff (nav item)
        Configuration (nav item)
    - Bottom: user avatar (initials circle, var(--accent) background) + name + role
      + logout button

  Top bar (height 56px, border-bottom 0.5px var(--border)):
    - Page title (Sora 18px 500) + subtitle (Sora 13px muted)
    - Right side: view switcher tabs (Queue / Kanban / My Tasks),
      search input (placeholder: "Search by client or clinician name"),
      "+ Add Client" button (var(--accent) background, white text)

  Main content area: background var(--bg), padding 24px

Toast system:
  - Fixed bottom-right, z-index above everything
  - Success toast: dark bg #1A2A24, left border 3px var(--accent), text #A8D5C2
  - Error toast: dark red bg, left border 3px var(--red)
  - Auto-dismiss after 3 seconds
  - Slide in from right, slide out to right

Create a .env.example:
  VITE_GOOGLE_CLIENT_ID=
  VITE_ALLOWED_DOMAIN=sparkmojo.com
  VITE_ONBOARDING_SHEET_ID=
  VITE_BILLING_SHEET_ID=

Create vercel.json for SPA routing (all routes -> index.html).

Do not implement any module content yet — just the shell with empty main content area
that says "Onboarding module loading..." as a placeholder.
```

---

## PROMPT 2 — Google OAuth + Sheets data layer

```
Add authentication and data access to Willow Ops.

Auth:
  - Use @react-oauth/google for Google OAuth 2.0
  - On successful login, check that the account's email domain matches
    VITE_ALLOWED_DOMAIN env var. If not, show an error: "Access restricted to
    [domain] accounts. Contact your administrator."
  - Additionally support individual account whitelisting: read a comma-separated
    list from VITE_ALLOWED_EMAILS env var; if the logged-in email is in that list,
    allow access regardless of domain. This allows Erin and Kate's personal Gmail
    accounts to be whitelisted without changing the domain restriction.
  - Store the OAuth access token in React context (AuthContext)
  - The access token is used for all Google Sheets API calls

Data layer — create src/services/sheets.js:

  All functions accept an accessToken parameter.
  All functions return parsed data objects, not raw API responses.
  All functions throw descriptive errors on failure.

  // READ functions
  getOnboardingClients(accessToken)
    Reads the "Need to Check" tab from VITE_ONBOARDING_SHEET_ID.
    Returns array of client objects with these fields:
      id (row number, used as unique identifier)
      dateAdded, staffInitials, clientName, clinician, firstAppt (datetime),
      custodyAgreement (bool), gfeSent (bool), paperworkComplete (bool),
      insuranceCardUploaded (bool), primaryInsurance, secondaryInsurance,
      memberId, dob, employer, verified (string: Verified|Pending|Invalid|''),
      notes, spNoteAdded (bool), insuranceUpdated (bool),
      outreachAttempts: array of {date, method} for attempts 1-5
      urgentOverride (bool), cancellationReason, cancellationDate,
      clinicanHistory (parse from JSON string, default [])

  getHistoricalClients(accessToken)
    Reads all Completed and Cancellation tabs.
    Returns same structure plus a sourceTab field.

  getStaff(accessToken)
    Reads the Staff tab. Returns array of {name, initials, email, role, status}.

  getConfig(accessToken)
    Reads the Config tab. Returns object keyed by the 'key' column.
    Example: { outreach_followup_days: '3', urgent_threshold_days: '2', ... }

  // WRITE functions (all return updated row or confirmation)
  updateClientField(accessToken, rowId, fieldName, value)
    Updates a single cell in the Need to Check tab.
    Handles the column mapping from field names to sheet columns.

  appendOutreachAttempt(accessToken, clientId, method, contextNote, staffInitials)
    For attempts 1-5: writes to Date_Attempt_N and Method_Attempt_N columns.
    For attempt 6+: appends a new row to the Outreach_Log tab.
    Always appends context note to Outreach_Log tab regardless of attempt number.

  appendNote(accessToken, rowId, text, staffInitials)
    Appends to the Notes column in format "[INITIALS] [DATE]: [text] | [existing]"

  cancelClient(accessToken, rowId, reason)
    Reads the full row, moves it to the appropriate Cancellation tab,
    writes cancellation_reason and cancellation_date, then deletes from Need to Check.

  addNewClient(accessToken, clientData)
    Appends a new row to Need to Check with the provided fields.

  addStaffMember(accessToken, staffData)
    Appends a new row to the Staff tab.

  deactivateStaffMember(accessToken, staffInitials)
    Sets the status column to 'Inactive' for the matching staff row.
    Returns count of clients in Need to Check assigned to that staff member.

  updateConfig(accessToken, key, value)
    Updates the value column for the matching key row in Config tab.

  appendAuditLog(accessToken, action, clientId, detail, staffEmail)
    Appends a row to the Audit_Log tab.

Create a useSheets() hook that exposes all these functions with the auth token
automatically injected, plus loading and error states.

Add a DataContext provider that:
  - Fetches clients, staff, and config on login
  - Exposes the data and refresh functions
  - Shows a loading spinner while initial data loads
  - Auto-refreshes every 60 seconds
```

---

## PROMPT 3 — Onboarding Queue View

```
Build the Queue view for the Onboarding module. This is the default view when
the Onboarding nav item is active.

Client status logic (derive from data, no separate status column):
  Urgent: firstAppt is within urgent_threshold_days days AND any required item
    is incomplete OR urgentOverride = true
  Pending Insurance: paperworkComplete = true AND verified != 'Verified' AND
    primaryInsurance != 'Self Pay'
  Needs Paperwork: paperworkComplete = false AND not Urgent
  Ready: all required items complete (paperwork, insurance card, verified,
    sp note; custody if minor; gfe if self-pay)
  Cancelled / Completed: sourced from historical tabs, not shown in active queue

  Minor detection: if dob is present and age < 18, client is a minor.
    If dob is absent but custodyAgreement field is present in the row
    (even if false), treat as minor.

KPI strip (4 cards, top of queue):
  Urgent | Active Queue | Pending Insurance | Appts This Week
  Each card: label (11px uppercase letter-spaced muted), large IBM Plex Mono number,
  small subtitle. Urgent card has left border 3px var(--red) and red number.
  Clicking a card sets the corresponding filter chip as active.

Filter chips below KPI strip:
  All | Urgent | Pending Insurance | Needs Paperwork | Ready
  Active chip: bg var(--accent), white text. Inactive: outlined.
  Chips sync with KPI card clicks.

Client table:
  Columns: Client Name | Clinician | First Appt | Progress | Insurance | Status | Actions

  Client Name cell:
    - 8px colored dot (red=Urgent, amber=Needs Paperwork, blue=Pending Insurance,
      green=Ready)
    - Name text — when status = Urgent: color var(--red), font-weight 500
    - This red treatment applies ONLY to Urgent status

  Clinician cell: muted 13px text

  First Appt cell: IBM Plex Mono 12px
    - red if within 2 days
    - amber if within 7 days  
    - muted gray otherwise

  Progress cell:
    - Mini progress bar (4px height, border-radius 2px) + percentage text
    - Bar color: red <50%, amber 50-80%, green >=80%
    - Calculate progress as: completed required items / total required items

  Insurance cell: status badge
    - "Verified" green badge
    - "Self Pay" gray badge
    - Carrier name in blue badge (= pending verification)

  Status cell: colored badge with dot matching status color

  Actions cell:
    - Single icon button: outreach log icon (speech bubble or phone)
    - Clicking opens outreach quick-log popover (see below)
    - NO separate view button — clicking the row opens the client drawer

Outreach quick-log popover (from action button):
  Small popover anchored to the button.
  - Optional textarea: "Add context (optional)" placeholder, 3 rows
  - Row of method buttons: SP Reminders | Google Text | LVM | EMW | Final Reminder
  - Clicking a method button logs the attempt (context + method + timestamp +
    staff email) and closes the popover
  - Calls appendOutreachAttempt() and appendAuditLog(), shows success toast

Sorting:
  All columns sortable by clicking header. Direction indicator (↑↓) on active sort.
  Default: Urgent first, then by firstAppt ascending.

Search:
  Real-time filter on clientName AND clinician fields.
  Placeholder: "Search by client or clinician name"

Add Client modal:
  Opens from top bar button.
  Required: clientName, clinician (dropdown from staff/clinician list), firstAppt
    (datetime picker), primaryInsurance (text or 'Self Pay' checkbox)
  Optional: dob, memberId, employer, staffInitials (dropdown from Staff data)
  On save: calls addNewClient(), refreshes data, shows toast, closes modal.

Row click → opens Client Drawer (build in next prompt, stub it for now).
```

---

## PROMPT 4 — Kanban View

```
Build the Kanban view for the Onboarding module (shown when Kanban tab is active
in the view switcher).

Columns: Paperwork | Insurance | Ready | Urgent

Column placement logic (same status logic as Queue view):
  A client appears in exactly one column based on their derived status.
  Urgent overrides all other columns.

Column headers:
  Column name + count badge (bg var(--accent-light), color var(--accent), rounded).

Client cards:
  Background white, border 0.5px var(--border), border-radius 8px, padding 12px.
  Contents:
    - Client name (13px 500; red if Urgent) + status dot
    - Clinician name (12px muted)
    - First appt date (IBM Plex Mono 11px, colored by proximity same as queue)
    - Mini progress bar (same logic as queue)
    - Checklist pills row: Paperwork | Ins Card | Verified | SP Note
      Each pill: green with checkmark if done, red with X if not done.
      Self-pay clients: insurance pills replaced with GFE pill.
    - Hover state: subtle shadow, cursor grab

Drag and drop:
  Use @dnd-kit/core and @dnd-kit/sortable.
  Dragging a card between columns updates the underlying boolean fields in the
  sheet to match the target column's logic:
    Drop on Paperwork: sets paperworkComplete = false (moves back to paperwork stage)
    Drop on Insurance: sets paperworkComplete = true, verified = '' (insurance pending)
    Drop on Ready: sets paperworkComplete = true, verified = 'Verified',
      insuranceCardUploaded = true, spNoteAdded = true
    Drop on Urgent: sets urgentOverride = true
    Drag FROM Urgent to any other column: sets urgentOverride = false,
      then applies target column boolean logic

  On drop:
    1. Optimistic UI update (card moves immediately)
    2. Call updateClientField() for each affected boolean
    3. Call appendAuditLog() with the move action
    4. Show success toast: "[name] moved to [column]"
    5. On error: revert to original position, show error toast
```

---

## PROMPT 5 — Client Drawer

```
Build the Client Drawer — a slide-in panel from the right that opens when a
client row or task is clicked anywhere in the app.

Trigger: a global openDrawer(clientId) function available via React context.

Layout:
  - Fixed overlay, right-aligned, width 520px, full height
  - Background white, left border 1px var(--border)
  - Background dims to rgba(0,0,0,0.3) behind the drawer
  - Slides in from right (transform translateX), 250ms ease
  - Close button (X) top-right corner

Header section:
  - Client name (Sora 20px 500) + status badge (same as queue badges)
  - Row below: clinician name | staff assigned (editable inline — click to open
    dropdown sourced from Staff data; on change calls updateClientField +
    appendAuditLog + toast) | date added
  - Cancel/Archive button (right-aligned, outline red button)
    On click: opens cancellation confirm modal (see Cancellation Workflow)

Age-18 transition banner:
  Shown when: client is a minor AND their 18th birthday is within
  age18_warning_days days (from Config).
  Amber banner below header: "This client turns 18 on [date]. Adult paperwork
  re-send will be required." Dismissable per session (not persisted).

Progress bar section:
  - Full-width bar, height 8px, border-radius 4px
  - On drawer open: animate fill from 0% to actual % over 500ms with ease-out
  - Percentage number in IBM Plex Mono 24px var(--accent): count up from 0 to
    actual value synchronized with bar animation
  - Bar color: red <50%, amber 50-80%, green >=80%
  - Re-triggers animation on every checklist item toggle
  - Stage pips below bar: 5 dots (Scheduled, Paperwork, Insurance, Verified, Ready)
    Done: filled var(--accent)
    Current: filled var(--accent) with pulse ring (box-shadow 0 0 0 4px
      rgba(42,122,101,0.2))
    Future: filled var(--border)
  - Stage labels: done = var(--accent) 500, current = var(--accent), future = muted

Tabs: Checklist | Outreach | Notes | Details
Active tab: bottom border 2px var(--accent), text var(--accent) 500.

--- CHECKLIST TAB ---
Required items (always shown unless noted):
  1. Paperwork completed — maps to paperworkComplete
  2. Insurance card uploaded — hidden if Self Pay — maps to insuranceCardUploaded
  3. Insurance verified — hidden if Self Pay — maps to verified (true = 'Verified')
  4. Custody agreement collected — shown only if client is minor — maps to
     custodyAgreement
  5. Good Faith Estimate sent — shown only if Self Pay — maps to gfeSent
  6. SP note added — maps to spNoteAdded

Optional items:
  7. Insurance updated in SimplePractice — maps to insuranceUpdated

Each item: toggle switch (left) + label (middle) + "Required"/"Optional" tag (right).
Toggling calls updateClientField() + appendAuditLog() immediately.
Progress bar re-animates on each toggle.
If all required items complete: update derived status to Ready, show toast
  "[name] is Ready for their first appointment."

Appointment info section below checklist:
  First appt date/time (IBM Plex Mono) | Clinician | Days until appt
  Days until appt: count shown as "in X days" — green if >7, amber if 3-7,
  red if ≤2, "TODAY" if same day.

--- OUTREACH TAB ---
Timeline of logged attempts:
  Each entry: colored method badge + date (IBM Plex Mono) + staff initials +
  context note (if present, shown in a muted text block below)
  Connector line between entries (1px var(--border), vertical)
  Total count shown above timeline: "X outreach attempts logged"

Log new attempt panel (below timeline or sticky at bottom):
  - Textarea: placeholder "Add context (optional)" — 3 rows
  - Row of method buttons: SP Reminders | Google Text | LVM | EMW | Final Reminder
    Each is an outline button. Clicking logs the attempt.
  - On click: calls appendOutreachAttempt() + appendAuditLog(), refreshes
    timeline, clears textarea, shows toast.

--- NOTES TAB ---
Threaded display:
  Each note: initials avatar circle (24px) + name + date in header row,
  note text below. Separator between notes. Oldest first.

Add note:
  Textarea at bottom (placeholder: "Add a note...") + "Add Note" button.
  On submit: calls appendNote() + appendAuditLog(), refreshes thread, clears
  textarea, shows toast.

--- DETAILS TAB ---
Client info grid (2 columns):
  DOB | Employer | Primary Insurance | Member ID | Secondary Insurance |
  Verification Status | Staff Assigned

Clinician history section:
  Title: "Clinician History"
  List in reverse chronological order:
    Current: [clinician name] (shown in accent color, bold)
    [start date]–[end date]: [clinician name] (for each historical entry)
  Sourced from clinicanHistory JSON field.
  "Add history entry" button: opens small inline form to add a new
  {clinician, start_date, end_date} entry. On save: calls updateClientField()
  with updated JSON array.

SimplePractice sync section:
  SP note added: checkbox toggle — synced with Checklist item 6
  Insurance updated in SP: checkbox toggle — synced with Checklist item 7
  Both write immediately on toggle. Checking here also checks the checklist
  item and recalculates progress.

--- CANCELLATION MODAL ---
Triggered from drawer header Cancel button.
Confirm dialog (centered modal, not full-screen):
  "Cancel onboarding for [name]?"
  Reason dropdown (required):
    Client changed mind | Insurance issue | Incomplete paperwork — client
    unresponsive | Distance / location | Clinician not available | Other
  If Other: text input appears
  Confirm button (red) + Cancel button
  On confirm: calls cancelClient() + appendAuditLog(), closes drawer,
  removes client from queue, shows toast.
```

---

## PROMPT 6 — My Tasks View

```
Build the My Tasks view for the Onboarding module.

Task generation logic (computed from client data, not stored until acted on):
  For each active client, generate tasks for incomplete required items:
    "Complete paperwork for [name]" — if paperworkComplete = false
    "Collect insurance card for [name]" — if insuranceCardUploaded = false, not self-pay
    "Verify insurance for [name]" — if verified != 'Verified', not self-pay
    "Send Good Faith Estimate to [name]" — if self-pay and gfeSent = false
    "Collect custody agreement for [name]" — if minor and custodyAgreement = false
    "Add SP note for [name]" — if spNoteAdded = false
    "Log outreach for [name]" — if lastOutreachDate is > outreach_followup_days ago
      (outreach_followup_days from Config)

  Assign due date logic:
    Urgent clients: due = today
    Others: due = firstAppt minus 2 days (or today if that's past)
    Tasks with due date in the past: status = Overdue
    Tasks due today: status = Today
    Tasks due in future: status = Upcoming

  Assignment: tasks are assigned to the staffInitials on the client record.

Staff switcher:
  Top of view: "Viewing tasks for: [current user name]" + dropdown to select
  any active staff member from Staff data. Default = logged-in user.
  Switching shows that person's tasks (tasks on clients assigned to them).
  Any user can act on any task regardless of assignment.

Clinician filter:
  Dropdown chip above task list to filter by clinician name.

Group headers:
  Overdue (red badge with count) | Today (amber badge) | Upcoming (blue badge)
  Summary strip at top: 3 count bubbles side by side.

Task items:
  Row: task description | client name (clickable → opens drawer) | clinician |
  due date badge (red=Overdue, amber=Today, blue=Upcoming)
  Clicking anywhere on the row opens the client drawer for that client.
  Hover: background var(--accent-light)
```

---

## PROMPT 7 — Historical View + Admin Module

```
Add the Historical View and the Admin module.

=== HISTORICAL VIEW ===

Accessible from a "View History" link/tab in the queue view header area.

Shows clients from all Completed and Cancellation sheet tabs combined.
Same table columns as Queue view. All cells read-only (no row actions except
opening the drawer, which is also read-only in historical mode).

Filters above table:
  Year (dropdown, sourced from available tab names) |
  Status (All / Completed / Cancelled) |
  Clinician (dropdown)
Search: same as queue.

In historical drawer mode: checklist toggles are disabled, outreach log button
is hidden, cancel button is hidden. Details and Notes tabs are still readable.

=== ADMIN MODULE ===

Reachable from sidebar Admin section.
Two sub-pages: Manage Staff and Configuration.

--- MANAGE STAFF PAGE ---

Staff table:
  Columns: Name | Initials | Email | Role | Status | Actions
  Status: Active (green badge) or Inactive (gray badge)
  Actions column: Edit (pencil icon) | Deactivate (if Active) or Reactivate (if Inactive)

Add Staff button (top right):
  Modal with fields: Full Name, Initials (auto-populated from name, editable),
  Email, Role (free text).
  On save: calls addStaffMember() + appendAuditLog(), refreshes staff list.

Deactivate staff flow:
  Click Deactivate → confirm modal:
  "Deactivate [name]? This will create reassignment tasks for their [N] active clients."
  On confirm:
    1. Calls deactivateStaffMember() — sets status to Inactive in sheet
    2. Finds all clients in queue assigned to that staff member
    3. For each: creates a task in the Tasks sheet tab:
       task_type = 'reassign_client'
       description = 'Reassign [client name] — [staff name] is no longer active'
       assigned_to = admin_default_assignee (from Config)
       due_date = today
       priority = high
       module = 'onboarding'
    4. Shows toast: "[N] clients were assigned to [name]. Reassignment tasks have been created."
    5. Refreshes staff list

Reassign All Tasks panel (below staff table):
  Title: "Bulk Task Reassignment"
  Description: "Transfer all task assignments from one staff member to another.
  Use this when someone is out or has left."
  Two dropdowns: From → To (both sourced from staff list, including inactive for From)
  Scope radio: All Modules | Onboarding Only
  Preview button: shows count without executing
    "This will reassign [N] tasks and [M] clients from [From] to [To]."
  Confirm Reassign button (only enabled after preview):
    On confirm:
      1. Updates all Tasks tab rows where assigned_to = From initials → To initials
      2. Updates all Need to Check rows where Initials = From → To
      3. Calls appendAuditLog() with full detail
      4. Shows toast with counts

--- CONFIGURATION PAGE ---

Title: "Automation & App Settings"

Settings displayed as labeled input fields, each with a description:

  Outreach follow-up timing
  Description: "Generate a 'Log outreach' task N days after the last attempt."
  Input: number field, min 1, max 30, default 3
  Key: outreach_followup_days

  Urgent threshold
  Description: "Flag a client as Urgent when their appointment is within N days
  and required items are incomplete."
  Input: number field, min 1, max 14, default 2
  Key: urgent_threshold_days

  Default admin assignee
  Description: "Staff member who receives auto-generated admin tasks (e.g.,
  reassignment tasks when a staff member is deactivated)."
  Input: dropdown from active staff list
  Key: admin_default_assignee

  Age-18 warning window
  Description: "Show the adult paperwork warning banner N days before a minor
  client turns 18."
  Input: number field, min 7, max 180, default 90
  Key: age18_warning_days

Each setting: read from Config data on load. "Save" button per row (or a global
Save Changes button at bottom). On save: calls updateConfig() + appendAuditLog().
```

---

## PROMPT 8 — Reports Section

```
Build the Onboarding Reports section, accessible from the sidebar Reports nav item.

All reports are read-only. No write operations. Data sourced from:
  - Need to Check (active clients)
  - All Completed tabs (historical completed)
  - All Cancellation tabs (historical cancelled)

Use Recharts for all charts.

Reports layout: left sidebar sub-nav listing all reports, main area shows
selected report. Default: Onboarding Velocity.

Report 1: Onboarding Velocity
  Title: "Average Days to First Appointment"
  Subtitle: "From date added to first appointment, by month"
  Chart: Line chart, x = month, y = avg days. Current month highlighted.
  Metric cards above chart: Overall avg | Best month | Current month
  Data: for each completed client, calculate (firstAppt - dateAdded) in days.

Report 2: Cancellation Rate
  Title: "Cancellation Rate by Month"
  Subtitle: "% of new clients who cancelled before their first appointment"
  Chart: Bar chart, x = month, y = cancellation %
  Metric cards: Overall rate | Highest month | Lowest month

Report 3: Cancellation Reasons
  Title: "Why Clients Cancel"
  Subtitle: "Going-forward data only — reason codes captured via Willow Ops"
  Chart: Donut chart of reason codes
  Table below: reason | count | % — sorted by count desc
  Note shown if data is sparse: "Structured reason tracking began [first app
  cancellation date]. Historical cancellations used free-text notes."

Report 4: Outreach Effectiveness
  Title: "Outreach Attempts"
  Subtitle: "Average attempts before completion vs. cancellation"
  Chart: Side-by-side horizontal bar: Completed (green) vs Cancelled (red)
  Shows: avg attempts for completed clients vs avg attempts before cancellation

Report 5: Insurance Mix
  Title: "Clients by Insurance Carrier"
  Subtitle: "Distribution of primary insurance carriers — active queue"
  Chart: Donut chart. Top 5 carriers named, rest grouped as "Other".
  Toggle: Active Queue / All Time

Report 6: Self-Pay vs. Insured
  Title: "Self-Pay vs. Insured Over Time"
  Subtitle: "New clients by payment type, by month"
  Chart: Stacked bar, green = insured, gray = self-pay
  Metric cards: Current self-pay % | Trend (up/down arrow)

All charts:
  - Color palette: use var(--accent) as primary, var(--amber) as secondary,
    var(--red) as tertiary — consistent across all charts
  - Font: Sora for labels, IBM Plex Mono for numbers/axes
  - Empty state: friendly illustration + "No data yet. Data will appear as
    clients complete onboarding."
  - Loading state: skeleton pulse placeholders while data loads
```

---

## PROMPT 9 — Polish + Vercel deploy

```
Final polish pass before deployment.

Animation audit:
  - Confirm login logo animation works smoothly (leaf particles + logo entrance)
  - Confirm drawer progress bar animates on open and on each checklist toggle
  - Confirm all toasts slide in/out correctly
  - Confirm kanban drag has smooth placeholder animation (@dnd-kit default is fine)
  - Add subtle fade-in (opacity 0 -> 1, 150ms) when switching between Queue /
    Kanban / My Tasks views
  - Add subtle row hover background transition (150ms) in queue table

Empty states:
  Every view needs an empty state when no data matches:
  - Queue: "No clients match this filter."
  - Kanban column: "No clients here."
  - My Tasks: "You're all caught up."
  - Reports: "No data yet."
  - Staff list: (should never be empty if prepopulated)

Error states:
  - If Google Sheets API call fails: show a banner at top of content area
    "Unable to load data. Check your connection." with a Retry button.
  - Failed writes: error toast + revert optimistic UI update.

Responsiveness:
  - Minimum supported width: 1024px (desktop only, no mobile needed for MVP)
  - Sidebar collapses to icon-only at widths 1024-1200px (icons with tooltips)

Accessibility basics:
  - All interactive elements keyboard-navigable
  - Focus rings visible (use box-shadow, not outline:none)
  - ARIA labels on icon-only buttons

Vercel deployment:
  - Confirm vercel.json is correct for SPA routing
  - Document the 4 required env vars in README.md
  - Add a simple README.md with:
    Project overview (2 sentences)
    Stack (Vite + React + Tailwind + Google Sheets API + Google OAuth)
    Setup instructions (clone, npm install, copy .env.example, fill in values,
    npm run dev)
    Deployment instructions (Vercel, set env vars in project settings)
    Link to DECISIONS.md and PRD.md for full context
```

---

## Notes for Claude Code

- Run `npm run build` after each prompt to catch type/lint errors before moving on
- Test Google Sheets reads with real data before testing writes
- The Google Sheet column mapping in updateClientField() is the most fragile part —
  verify column indices carefully against the actual sheet structure
- Do not hardcode any column indices — derive them from a header row read on init
- All PHI stays in Google Sheets — never log client data to console in production
- The Outreach_Log, Tasks, Audit_Log, Config, and Staff tabs must exist in the
  sheet before the app will function — see MIGRATION_CHECKLIST.md
