# PRD: Billing Data Layer, Task Board Fixes, Staff Registry Split, and Reporting Enhancements

## Introduction

Five interconnected improvements to Willow Ops that unblock the billing module, fix the task board, reorganize navigation, and add polish to reporting. The billing data layer is the foundational change — all billing views currently require a manual .xlsx upload, but the real data already lives in a Google Sheet connected via `VITE_BILLING_SHEET_ID`. Removing the upload gate and reading directly from the sheet (same pattern as onboarding) unblocks everything downstream.

## Goals

- Eliminate the upload gate — billing views load data from Google Sheets on navigation, never show an empty/upload state
- Move My Tasks out of sidebar into a persistent top bar button with badge
- Split Staff Registry (operational NPI reference) from Manage Staff (admin access control)
- Fix task board: replace seed tasks with 12 real diagnostic blockers, support module-specific statuses
- Add time window toggles and click-to-expand modals to all report charts
- Fix the Payer Mix chart legend bug

## User Stories

### US-001: Fetch billing data from Google Sheets on navigation
**Description:** As a staff member, I want billing data to load automatically from the Google Sheet when I navigate to any billing view, so I never have to manually upload a spreadsheet.

**Acceptance Criteria:**
- [ ] `BillingDataProvider` fetches from `VITE_BILLING_SHEET_ID` using OAuth access token on first billing view navigation
- [ ] Reads two tabs: `unpaid at 350pm` (all unpaid/unbilled claims) and `ins unbilled` (never-submitted claims)
- [ ] Header row is read first to confirm column positions; fixed indices used after that
- [ ] `unpaid at 350pm` columns mapped: Date of Service, Client Name, Clinician, Billing Code, Payer, Billed Amount, Insurance Payment Status, Client Payment Status, Date Billed, Notes
- [ ] `ins unbilled` columns mapped using same header-confirmation pattern
- [ ] Data stored in `BillingDataContext` as `unpaidClaims` and `unbilledClaims`
- [ ] Fetch uses same API pattern as onboarding: `GET /v4/spreadsheets/{id}/values/{tab}` with Bearer token
- [ ] All 4 billing views (AR Dashboard, Unbilled Worklist, Collections, Billing Reports) read from context — never show upload prompt
- [ ] Data re-fetches when navigating to a billing view if not already loaded in current session
- [ ] Existing `parseUnpaidClaims()` and `parseUnbilledClaims()` in `billing.js` are reused for row-to-object mapping
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

### US-002: Remove upload gate from billing views
**Description:** As a staff member, I want to see billing data immediately when I open any billing view, without being told to upload a file first.

**Acceptance Criteria:**
- [ ] AR Dashboard (`/billing`) no longer checks `isLoaded` to show an upload prompt — shows a loading spinner while fetching, then data
- [ ] Unbilled Worklist (`/billing/unbilled`) same behavior
- [ ] Collections (`/billing/collections`) same behavior
- [ ] Billing Reports (`/reports/billing`) same behavior
- [ ] Config page (`/admin/config`) retains the `SpreadsheetUpload` component as a manual data refresh option (not a prerequisite)
- [ ] `BillingDataContext` `isLoaded` flag is set after sheet fetch completes (not after upload)
- [ ] If sheet fetch fails, show an error state with retry button — not an upload prompt
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

### US-003: Move My Tasks from sidebar to top bar
**Description:** As a staff member, I want a persistent task button in the top bar header so I can access My Tasks from any page without it cluttering the sidebar navigation.

**Acceptance Criteria:**
- [ ] Remove "My Tasks" item from `Sidebar.jsx`
- [ ] Add a task button (checklist icon from lucide-react, e.g. `CheckSquare` or `ListTodo`) to the top bar/header area
- [ ] Top bar is a global component visible on every page (not just onboarding)
- [ ] Button shows a count badge of open tasks assigned to the logged-in user (tasks where status !== 'Done')
- [ ] Badge uses the accent color for count > 0, muted when 0
- [ ] Clicking the button navigates to `/tasks` (the full-page My Tasks view)
- [ ] The `/tasks` route continues to work as before
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

### US-004: Create Staff Registry as top-level sidebar item
**Description:** As a staff member, I want a Staff Registry view that shows all clinicians with their NPI data, so I have a quick operational reference without going into admin settings.

**Acceptance Criteria:**
- [ ] New sidebar item "Staff Registry" between Voicemail and Reports
- [ ] Route: `/staff`
- [ ] New component: `src/components/staff/StaffRegistry.jsx`
- [ ] Header card shows org info: Practice Name (Willow Center), TIN (812069415), Billing NPI (1336596550)
- [ ] Reads from `Clinician NPIs` tab of the onboarding sheet (`VITE_ONBOARDING_SHEET_ID`)
- [ ] Displays table: Clinician Name, Individual NPI, Supervisor Name, Supervisor NPI, Notes/Supervision Details
- [ ] Column positions confirmed via header row (0-indexed: [0] Clinician name, [1] Individual NPI, [2] Supervisor name, [3] Supervisor NPI, [4] Notes)
- [ ] Active/inactive status shown if available
- [ ] Add and edit capabilities available (writes back to sheet)
- [ ] Manage Staff (`/admin/staff`) remains under Admin — handles app-level access, roles, assignments, not NPI data
- [ ] Remove org info card and NPI columns from `ManageStaff.jsx` to avoid duplication
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

### US-005: Replace task board seed data with 12 diagnostic blockers
**Description:** As a staff member, I want the task board pre-loaded with the 12 real diagnostic action items from the Willow Center assessment, so the task board is immediately useful.

**Acceptance Criteria:**
- [ ] Remove existing seed tasks from `sheets.js` `SEED_TASKS` array
- [ ] Replace with exactly these 12 tasks (all status: "To Do"):

| # | Title | Assigned To | Category |
|---|-------|-------------|----------|
| 1 | Define unified balance threshold across all service lines | Erin | Billing |
| 2 | Clarify deductible billing decision logic — who pays what, when | Erin + Kate | Billing |
| 3 | Define write-off authorization criteria and approval chain | Erin | Billing |
| 4 | Confirm secondary insurance audit scope and assign owner | Erin + Lisa | Claims |
| 5 | Resolve Sarah's clearinghouse access — is this an ESI contract issue? | Erin + Sarah | Operations |
| 6 | Define supervisor co-sign SLA — 48 hours non-negotiable? | Lisa | Clinical |
| 7 | Configure SimplePractice inquiry form — 15-minute fix, assign owner | Sarah | Operations |
| 8 | Clarify FMLA billing — patient-pay, not insurance | Julia / Erin | Billing |
| 9 | Confirm Google Workspace BAA scope — which services are covered | Erin | Compliance |
| 10 | Define Julia transition timeline and billing handoff plan | Erin | Operations |
| 11 | Discovery: custody agreement workflow — documents, custody types, who reviews | Lisa | Clinical |
| 12 | Discovery: age-18 transition — which documents require re-execution at 18 | Lisa | Clinical |

- [ ] Tasks are in-memory — reset on refresh is acceptable
- [ ] Task creation and status changes are also in-memory only
- [ ] Do NOT pull onboarding clients into the task board — these are separate systems
- [ ] `npm run build` and `npm run lint` pass

### US-006: Module-specific task statuses
**Description:** As a staff member, I want tasks grouped by category with statuses appropriate to each category, so billing tasks show billing statuses instead of generic To Do/In Progress/Done.

**Acceptance Criteria:**
- [ ] General tasks: statuses are To Do / In Progress / Done (unchanged)
- [ ] Billing-linked tasks: show Unbilled / Submitted / Resubmitting / Blocked / Written Off / Resolved
- [ ] Voicemail-linked tasks: show New / In Progress / Needs Followup / Closed
- [ ] Onboarding-linked tasks: show Urgent / Needs Paperwork / Pending Insurance / Ready
- [ ] Claims-linked tasks: use same statuses as Billing (Unbilled / Submitted / Resubmitting / Blocked / Written Off / Resolved)
- [ ] Kanban view groups by category first, then shows appropriate status columns per category
- [ ] The three-column layout (To Do / In Progress / Done) only applies when viewing General tasks or "All" with no category filter
- [ ] Status dropdown in list view shows only valid statuses for the task's category
- [ ] Drag-and-drop in kanban respects category-specific columns
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

### US-007: Add time window toggles to all report charts
**Description:** As a staff member, I want to filter report charts by time window so I can focus on recent trends or see the full picture.

**Acceptance Criteria:**
- [ ] Each chart card has a pill toggle in its top-right corner (e.g. "3mo / 12mo / All")
- [ ] Toggle options per chart:

| Chart | Default | Options |
|-------|---------|---------|
| New Client Volume by Month | 12 months | 3mo / 12mo / All |
| Cancellation Rate by Month | 12 months | 3mo / 12mo / All |
| Cancel Rate KPI card | This month | This month / This quarter / All |
| Payer Mix Over Time | 12 months | 12mo / All |
| Clinician Caseload Growth | 12 months | 12mo / All |
| Time to Completion | 12 months | 12mo / All |
| Avg Outreach Attempts | 12 months | 12mo / All |
| Cancellation Reason Analysis | 12 months | 12mo / All |

- [ ] KPI cards show their time window as muted text label beneath the number (e.g. "this month")
- [ ] Data correctly filters to the selected window
- [ ] Toggle state is local to each chart (not global)
- [ ] Defaults applied on mount
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

### US-008: Click-to-expand chart modals
**Description:** As a staff member, I want to click any chart to see it full-screen so I can examine details more closely.

**Acceptance Criteria:**
- [ ] Every chart card is clickable (cursor pointer, subtle hover effect)
- [ ] Clicking opens a full-screen modal overlay with just that chart
- [ ] Chart re-renders at full modal size (not CSS-scaled from small)
- [ ] Time window toggles available in the modal
- [ ] Close with Escape key or X button in top-right corner
- [ ] Modal has semi-transparent backdrop
- [ ] Smooth open/close transition (200ms)
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

### US-009: Fix Payer Mix chart legend
**Description:** As a staff member, I want the Payer Mix chart to show actual insurance payer names in the legend, not raw outreach notes text.

**Acceptance Criteria:**
- [ ] Payer Mix chart groups by Primary Insurance field (not outreach notes or any other field)
- [ ] Legend shows payer names (e.g. "Aetna", "UHC", "Self Pay")
- [ ] Top 8 payers shown; remaining grouped as "Other" if needed
- [ ] Colors are distinguishable
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: `BillingDataProvider` must fetch from Google Sheets API using OAuth access token on first billing view navigation
- FR-2: Tab names used in API calls must be exact: `unpaid at 350pm` and `ins unbilled` (URL-encoded as needed)
- FR-3: Column mapping must be confirmed via header row on first read, then fixed indices used for data rows
- FR-4: All KPIs derived from sheet data: Total AR unpaid = sum of Billed Amount where Insurance Payment Status = UNPAID; Insurance unpaid count = rows where Insurance = UNPAID; Client unpaid count = rows where Client = UNPAID; Unbilled count = rows where Insurance = UNBILLED
- FR-5: AR aging buckets: 0-30 / 31-60 / 61-90 / 91-120 / 120+ days from Date of Service to today
- FR-6: Collections rate by payer = paid claims / total claims per payer name
- FR-7: Top bar must be a global shell component visible on every page, not just onboarding
- FR-8: Staff Registry reads from `Clinician NPIs` tab of onboarding sheet
- FR-9: Task categories supported: General, Billing, Claims, Operations, Clinical, Compliance
- FR-10: Task status sets are determined by task category — no cross-category status mixing
- FR-11: Chart time window filters must re-aggregate data, not just hide rendered elements
- FR-12: Chart expand modal must instantiate a new chart at modal dimensions
- FR-13: Config page upload remains functional as a manual refresh/override mechanism

## Non-Goals

- No write-back to billing sheet (read-only for now)
- No auto-refresh interval for billing data — fetch on navigation only
- No role-based access control
- No task persistence to Google Sheets — fully in-memory, resets on refresh
- No building Revenue Cycle, Voicemail, or Command Center modules (Phase 2 stubs only)
- No new chart types — only enhancing existing charts
- No billing report charts with time windows (only onboarding report charts listed above)

## Technical Considerations

- Billing sheet may have ~6,500+ rows in `unpaid at 350pm` and ~1,000+ in `ins unbilled` — fetch will return large payloads. Consider showing a loading state.
- Tab name `unpaid at 350pm` contains spaces — must be URL-encoded in Sheets API calls (same as `Need to Check` in onboarding)
- The existing `parseUnpaidClaims()` and `parseUnbilledClaims()` in `billing.js` currently parse from xlsx upload format — may need adjustment to work with Sheets API row arrays
- `TopBar.jsx` currently only lives in the onboarding module. It needs to become a global shell component (like Sidebar) mounted in `App.jsx`
- Task category list expands from current 4 (Onboarding, Billing, Voicemail, General) to 6 (add Claims, Operations, Clinical, Compliance)
- Chart expand modal should use a portal to render above all other content
- Recharts components accept `width` and `height` props — modal chart should use `ResponsiveContainer` at 100% of modal dimensions

## Success Metrics

- All billing views render real data from Google Sheets without any upload step
- Staff can access My Tasks from any page via top bar button
- Staff Registry shows NPI data separately from admin staff management
- Task board shows 12 real diagnostic tasks on load
- All report charts support time window filtering
- Any chart can be expanded to full-screen for detailed viewing

## Open Questions

- Should billing data show a "last fetched" timestamp so users know data freshness?
- Should the task board eventually persist to Google Sheets, or will a different persistence layer be introduced?
- Are there additional task categories beyond the 6 listed that should be supported?
- Should the chart expand modal support downloading/exporting the chart as an image?
