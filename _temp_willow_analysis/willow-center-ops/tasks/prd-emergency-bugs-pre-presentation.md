# PRD: Emergency Bug Fixes — Pre-Presentation

## Introduction

Seven bugs that must be fixed before the presentation. All involve data displaying incorrectly ($0 values, swapped fields, empty states) or layout issues (horizontal scrolling). Each bug is independently fixable and affects a different view in Willow Ops. The root causes are field mapping errors, missing filter logic, and fetch/initialization failures.

## Goals

- All KPI cards and financial totals display correct, non-zero values derived from real sheet data
- Client drawer fields map to the correct columns
- Staff Registry and My Tasks render their data on load
- No page causes horizontal scrolling at any standard browser width
- Every fix is browser-verified before marking complete

## User Stories

### US-001: Fix Command Center AR Total Showing $0
**Description:** As a staff member, I want the Command Center "Total AR Unpaid" KPI card to show the correct AR total so that the dashboard is trustworthy at a glance.

**Acceptance Criteria:**
- [ ] Command Center KPI card for "Total AR Unpaid" displays the same value as the AR Dashboard page (over $700K from current data)
- [ ] The card reads from the same derived total that AR Dashboard already computes correctly in `BillingContext`
- [ ] While billing data is loading, the KPI card shows a spinner or loading skeleton — never $0
- [ ] If billing data fails to load, the card shows an error state — never $0
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

**Scope:** Command Center KPI card component, `BillingContext` consumption

---

### US-002: Fix DOB and Member ID Swapped in Client Drawer
**Description:** As a staff member, I want DOB and Member ID to display in the correct fields so that I'm not reading the wrong data for a client.

**Acceptance Criteria:**
- [ ] The Details tab in the client drawer shows DOB in the DOB field and Member ID in the Member ID field
- [ ] Per the column layout: DOB is column index 12, Member ID is column index 13
- [ ] Swap the mapping in the column map or field assignment where these two values are read from the sheet row
- [ ] Verify with at least one client that has both a DOB and a Member ID populated — both should appear in the correct field
- [ ] No other field mappings are affected by this change
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

**Scope:** Column mapping in `sheets.js` or wherever the onboarding row-to-object mapping occurs

---

### US-003: Fix Client Balance Collections — All Amounts Show $0
**Description:** As a staff member, I want each client card in the Collections worklist to show their actual outstanding balance so that I can prioritize collection efforts.

**Acceptance Criteria:**
- [ ] Each client card in Collections shows the sum of Billed Amount (column index 5 in `unpaid at 350pm` tab) for all rows where Client Payment Status = UNPAID, grouped by client name
- [ ] The balance displayed is non-zero for clients that have unpaid claims in the sheet
- [ ] Grouping by client name is case-insensitive and handles minor whitespace differences
- [ ] If a client has no UNPAID rows, their balance correctly shows $0 (this is the only valid $0 case)
- [ ] Dollar amounts are formatted with commas and two decimal places (e.g. $1,234.56)
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

**Scope:** Collections view component, billing data derivation logic

---

### US-004: Fix Staff Registry Shows No Staff
**Description:** As a staff member, I want the Staff Registry page to display all clinicians and their NPI data on load so that I have a quick operational reference.

**Acceptance Criteria:**
- [ ] Staff Registry fetches from the `Clinician NPIs` tab of the onboarding Google Sheet (`VITE_ONBOARDING_SHEET_ID`)
- [ ] The tab name in the API call is exactly `Clinician NPIs` (capital C, capital N, with space) — URL-encoded as needed
- [ ] The sheet ID used is `VITE_ONBOARDING_SHEET_ID` (not the billing sheet)
- [ ] Data renders on page load: Clinician Name, Individual NPI, Supervisor Name, Supervisor NPI, Notes
- [ ] If the tab is missing or fetch fails, show an error message — not a blank page
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

**Scope:** `StaffRegistry.jsx`, sheets fetch call for `Clinician NPIs` tab

---

### US-005: Fix Billing Reports — Collected Amount Shows $0
**Description:** As a staff member, I want the Billing Reports "Collected" figure to reflect actual paid claims so that the report is accurate.

**Acceptance Criteria:**
- [ ] "Collected" is calculated as the sum of Billed Amount (column index 5) for rows where Insurance Payment Status = PAID in the `unpaid at 350pm` tab
- [ ] The filter checks for status value "PAID" (confirm exact string match — may be "Paid", "PAID", or other casing; use case-insensitive comparison)
- [ ] The collected amount is non-zero when paid claims exist in the sheet
- [ ] This uses the same `unpaid at 350pm` data already loaded in `BillingContext` — no additional fetch needed
- [ ] Dollar amount is formatted consistently with other financial figures in the report
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

**Scope:** Billing Reports view, billing data derivation/aggregation logic

---

### US-006: Fix AR Dashboard Horizontal Scrolling
**Description:** As a staff member, I want the AR Dashboard to fit within the viewport without horizontal scrolling so that the page is usable without side-scrolling.

**Acceptance Criteria:**
- [ ] The AR Dashboard page does not cause horizontal scrolling at any viewport width ≥ 1024px
- [ ] All filter dropdowns are constrained with `max-width: 100%` and `overflow: hidden` / `text-overflow: ellipsis` for long option text
- [ ] All chart containers are constrained to their parent's width — no chart overflows its card
- [ ] Long clinician names, payer names, or chart labels are truncated with ellipsis rather than expanding the container
- [ ] The fix does not hide important data — truncated text should have a title attribute or tooltip showing the full value
- [ ] No content is clipped or inaccessible after the fix
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

**Scope:** AR Dashboard layout, filter dropdowns, chart container styling

---

### US-007: Fix My Tasks Shows No Tasks
**Description:** As a staff member, I want the task board to show all tasks when "All Staff" is selected, including unassigned tasks, so that the board is functional.

**Acceptance Criteria:**
- [ ] When "All Staff" is selected, ALL tasks are shown regardless of assignee value — including tasks where assignee is null, undefined, or empty string
- [ ] The 12 diagnostic seed tasks from the spec are present in the task context on app start (verify seed initialization runs)
- [ ] If seed tasks are not loading, fix the initialization code so they are populated into the task state on app mount
- [ ] Individual staff filter still works correctly — shows only tasks assigned to that person
- [ ] Task count badge in the top bar reflects the correct number of visible tasks
- [ ] `npm run build` and `npm run lint` pass
- [ ] Verify in browser using dev-browser skill

**Scope:** Task filter logic, task seed initialization, task context/state

---

## Functional Requirements

- FR-1: Command Center KPI cards must wait for `BillingContext` data to load before rendering values — show loading state during fetch
- FR-2: Onboarding column mapping must assign DOB to column index 12 and Member ID to column index 13
- FR-3: Collections client balance = SUM(Billed Amount) WHERE Client Payment Status = "UNPAID", grouped by Client Name
- FR-4: Staff Registry fetch must target `Clinician NPIs` tab on `VITE_ONBOARDING_SHEET_ID`
- FR-5: Billing Reports collected amount = SUM(Billed Amount) WHERE Insurance Payment Status = "PAID" (case-insensitive)
- FR-6: All page containers must be constrained to viewport width — no element may cause horizontal overflow
- FR-7: Task filter "All Staff" must include tasks with null/undefined/empty assignee
- FR-8: Seed tasks must initialize into task state on app mount if no persisted tasks exist

## Non-Goals

- No new features — these are all fixes to existing functionality
- No changes to the data model or sheet structure
- No changes to the billing sheet (read-only)
- No changes to auth, permissions, or navigation
- No refactoring beyond what's needed to fix each bug

## Technical Considerations

- Bugs 1, 3, and 5 all read from `BillingContext` / `unpaid at 350pm` tab — they share the same data source but the fixes are independent (different views, different derivations)
- Bug 2 is a simple index swap in the column mapping — high confidence, low risk
- Bug 4 may be a tab name mismatch (case-sensitive) or wrong sheet ID — check the actual fetch URL
- Bug 6 is CSS-only — look for unconstrained flex/grid children or absolutely-positioned elements
- Bug 7 may have two independent causes: filter logic excluding unassigned tasks AND seed tasks not initializing

## Success Metrics

- All 7 bugs are fixed and verified in-browser before presentation
- No KPI card or financial total displays $0 when real data exists
- Every field displays the correct value from the correct column
- All pages fit within the viewport without horizontal scrolling
- Task board shows seed tasks on fresh load

## Open Questions

- None — these are well-defined bugs with clear expected behavior. Fix and verify.
