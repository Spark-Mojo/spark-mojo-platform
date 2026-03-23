# PRD: Bug Fixes, UI Polish & Small Features — Round 1

## Introduction

A collection of 10 fixes and small features addressing usability issues, visual polish, and missing functionality in Willow Ops. These range from session persistence and status logic bugs to UI improvements and a new Edit Client tab. Grouped by priority: bugs first, then UI polish, then features.

## Goals

- Eliminate session loss on page refresh (login persistence)
- Fix drawer/state bugs that disrupt the checklist workflow
- Ensure status derivation correctly flags clients with missing appointments
- Bring Kanban cards and login page up to design-system standards
- Add read-only historical record viewing and inline client editing

---

## User Stories

### US-001: Login Persistence via localStorage
**Description:** As a staff member, I want to stay logged in after refreshing the page so that I don't have to re-authenticate every time.

**Acceptance Criteria:**
- [ ] On successful OAuth login, save `accessToken`, `name`, `email`, and `picture` to `localStorage`
- [ ] On app load (before rendering login screen), check `localStorage` for a saved session and restore it into auth state
- [ ] On logout, clear all auth keys from `localStorage`
- [ ] If a restored token results in a 401 from Google Sheets API, clear `localStorage` and show the login screen
- [ ] Session persists across tabs and browser restarts
- [ ] Typecheck/lint passes (`npm run build && npm run lint`)

**Scope:** `App.jsx`, `LoginPage.jsx`, auth context/state management

---

### US-002: Drawer Stays Open on Checkbox Toggle
**Description:** As a staff member, I want the client drawer to stay open when I toggle a checklist item so that I can continue working through the checklist without reopening the drawer.

**Acceptance Criteria:**
- [ ] Toggling any checklist checkbox writes to the sheet and updates the client record in local state
- [ ] The drawer remains open with the same client selected after the write completes
- [ ] The progress bar and checklist UI re-render with the updated value (animation re-triggers)
- [ ] No flash, flicker, or momentary close/reopen of the drawer
- [ ] Fix is in the state update path — the `selectedClient` must not be set to `null` during a checklist refresh. The data refresh callback (`onRefresh` or equivalent) should update the selected client in-place rather than clearing and re-selecting
- [ ] Typecheck/lint passes

**Scope:** `App.jsx` (where `selectedClient` state and `onRefresh` callback live), `ChecklistTab.jsx`, `ClientDrawer.jsx`

**Technical Note:** The current `onRefresh` flow appears to call `setSelectedClient(null)` after fetching updated data. The fix should update the client list and then re-set `selectedClient` to the updated version of the same client (match by row index or composite ID) rather than clearing it.

---

### US-003: Populate Staff Dropdown in Add Client Modal
**Description:** As a staff member, I want the "Staff Assigned" dropdown in the Add Client modal to show real staff names so that I can assign a clinician when adding a new client.

**Acceptance Criteria:**
- [ ] The dropdown shows all active staff members from the Staff tab (name + initials format)
- [ ] If the Staff tab doesn't exist or is empty, fall back to unique clinician values from the `Need to Check` sheet
- [ ] "Unassigned" remains as the default/first option
- [ ] Selected staff value is saved correctly when the client is added
- [ ] Typecheck/lint passes

**Scope:** `AddClientModal.jsx`, `useSheets.js` (ensure `staff` data is passed as prop), `App.jsx` (prop wiring)

**Technical Note:** The `getStaff()` function and `AddClientModal` already support a `staff` prop. Verify that `staff` is being fetched and passed through correctly — the issue may be that the Staff tab doesn't exist yet or the prop isn't wired.

---

### US-004: Style Kanban Cards to Match Design System
**Description:** As a staff member, I want Kanban cards to look like distinct, well-styled cards so that the board is easy to scan and visually professional.

**Acceptance Criteria:**
- [ ] Each card has: white background (`--surface`), 1px border (`--border`), `border-radius: 8px`, horizontal padding 12-16px, vertical padding 10-12px
- [ ] Cards have a subtle box shadow (e.g. `0 1px 3px rgba(0,0,0,0.08)`)
- [ ] Cards are visually separated from the column background with clear spacing (8px gap between cards)
- [ ] Hover state: slightly elevated shadow or border color change
- [ ] Cards retain existing content: client name, clinician, progress bar, checklist pills
- [ ] Column backgrounds use a muted tone (e.g. `--bg` or light gray) so cards stand out
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

**Scope:** `KanbanView.jsx`

---

### US-005: Flag Missing/Invalid Appointment Dates as Urgent
**Description:** As a staff member, I want clients with missing or unparseable appointment dates to show as urgent so that they don't slip through the cracks.

**Acceptance Criteria:**
- [ ] If `firstAppt` is null, undefined, empty string, or `"n/a"`, the client is flagged as urgent
- [ ] If `firstAppt` is a non-empty string that fails `Date.parse()` (returns `NaN`), the client is flagged as urgent
- [ ] Urgent status from missing/invalid dates appears consistently in Queue, Kanban, and My Tasks views
- [ ] Clients with valid future dates beyond the threshold are NOT incorrectly flagged
- [ ] Typecheck/lint passes

**Scope:** `src/utils/status.js` — `deriveStatus()` function

**Implementation hint:**
```javascript
const parsedDate = client.firstAppt ? new Date(client.firstAppt) : null;
const isValidDate = parsedDate && !isNaN(parsedDate.getTime());
if (!isValidDate) return 'urgent';
```

---

### US-006: Login Page — Dark Background, Centered, Large Logo
**Description:** As a user, I want the login page to have a dark background with a prominent centered logo so that it looks polished and professional.

**Acceptance Criteria:**
- [ ] Background color is dark navy (`#161D2E`, matching the sidebar)
- [ ] All content (logo, app name, sign-in button) is centered vertically and horizontally
- [ ] Logo is large — hero treatment, at least `h-32` (128px) or larger
- [ ] App name "Willow Ops" text is white or light-colored for contrast on dark background
- [ ] "Sign in with Google" button is clearly visible on dark background (white or light button style)
- [ ] Existing leaf particle animation still works on dark background
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

**Scope:** `LoginPage.jsx`

---

### US-007: Increase Sidebar Logo Size
**Description:** As a user, I want the Willow logo in the sidebar to be larger so that it's clearly readable.

**Acceptance Criteria:**
- [ ] Logo height increased from `h-8` (32px) to `h-12` (48px) or similar appropriate size
- [ ] Logo remains in the sidebar header area, properly aligned
- [ ] No layout overflow or clipping issues in the sidebar
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

**Scope:** `Sidebar.jsx`

---

### US-008: My Tasks Defaults to Logged-In User
**Description:** As a staff member, I want My Tasks to automatically filter to my tasks when I open it so that I see my work first without manually selecting myself.

**Acceptance Criteria:**
- [ ] On load, the staff filter defaults to the logged-in user's name (from Google OAuth `name` or `given_name`)
- [ ] Matching is case-insensitive and supports partial match (e.g. "James" matches "James Ilsley")
- [ ] Match is attempted against both the clinician/staff name fields and initials
- [ ] If no match is found, show all tasks unfiltered (no empty state due to bad match)
- [ ] User can still manually switch to "All Staff" or another staff member
- [ ] Typecheck/lint passes

**Scope:** `MyTasksView.jsx`, auth context (to access logged-in user's name)

**Technical Note:** `MyTasksView` already receives `userEmail` as a prop and sets it as the default `viewAs`. The issue may be that the email doesn't match the staff initials/name. Try matching by name (from the OAuth user info) rather than email. If the staff list is available, find the staff member whose name best matches the OAuth `name` field.

---

### US-009: Open Historical Records in Read-Only Drawer
**Description:** As a staff member, I want to click on a historical client record to view their details in the drawer so that I can review past onboarding information.

**Acceptance Criteria:**
- [ ] Clicking a row in HistoricalView opens the ClientDrawer with that client's data
- [ ] Historical records are sourced from both `Completed YYYY` and `Cancellation YYYY` tabs
- [ ] The drawer opens in read-only mode: all checkboxes are disabled, no edit/toggle actions fire
- [ ] A visible "Historical Record" badge or banner is shown at the top of the drawer to indicate read-only state
- [ ] All existing drawer tabs (Checklist, Outreach, Notes, Details) display data but inputs are disabled
- [ ] Close/back button works normally
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

**Scope:** `HistoricalView.jsx`, `ClientDrawer.jsx` (add `readOnly` prop), `ChecklistTab.jsx`, `OutreachTab.jsx`, `NotesTab.jsx`, `DetailsTab.jsx`

---

### US-010: Edit Client Tab in Drawer
**Description:** As a staff member, I want an "Edit Client" tab in the drawer so that I can update client information without going to the spreadsheet directly.

**Acceptance Criteria:**
- [ ] A 5th tab labeled "Edit" appears in the ClientDrawer tab bar
- [ ] The tab shows all client fields as editable form inputs: Client Name, Clinician (dropdown from staff list), Date Added, First Appt (date picker), DOB (date picker), Primary Insurance, Secondary Insurance, Member ID, Employer, Notes
- [ ] Date fields use `<input type="date">` for consistent formatting
- [ ] Clinician dropdown is populated from the same staff source as Add Client modal
- [ ] A "Save Changes" button at the bottom is disabled until at least one field is modified
- [ ] On save, each changed field is written to the sheet via `updateClientField()`
- [ ] A success toast is shown after save completes ("Client updated successfully")
- [ ] If save fails, an error toast is shown and no fields are cleared
- [ ] The Edit tab is hidden when the drawer is in read-only mode (historical records)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

**Scope:** New `EditClientTab.jsx` component, `ClientDrawer.jsx` (add tab), `sheetsWrite.js` (existing `updateClientField` should suffice)

---

## Functional Requirements

- FR-1: Auth tokens are persisted in `localStorage` and restored on app load
- FR-2: Expired/invalid tokens trigger automatic logout and `localStorage` cleanup
- FR-3: Checklist toggle updates client data in-place without clearing `selectedClient`
- FR-4: Staff dropdown in Add Client shows active staff from Staff tab with fallback to sheet-derived clinician list
- FR-5: Kanban cards have card-style treatment (bg, border, shadow, rounded corners, hover state)
- FR-6: `deriveStatus()` returns `'urgent'` when `firstAppt` is missing, empty, or unparseable
- FR-7: Login page has dark navy background with centered, large logo
- FR-8: Sidebar logo is visually prominent (48px+ height)
- FR-9: My Tasks defaults to logged-in user via name matching against staff list
- FR-10: Historical view rows are clickable and open a read-only drawer
- FR-11: Historical records are fetched from both Completed and Cancellation tabs for all available years
- FR-12: ClientDrawer accepts a `readOnly` prop that disables all mutations
- FR-13: Edit Client tab provides form inputs for all client fields with save-to-sheet functionality
- FR-14: All sheet mutations continue to write to the Audit_Log automatically

## Non-Goals

- No role-based access control (all users have equal permissions)
- No offline support or service worker caching
- No token refresh flow (Google OAuth tokens are short-lived; user re-authenticates when expired)
- No batch editing of multiple clients at once
- No drag-and-drop reordering in historical view
- No undo/revert for edits made via the Edit Client tab
- No changes to Revenue Cycle, Voicemail, or Command Center modules (Phase 2)

## Design Considerations

- All UI changes must follow the existing design system: Sora font for UI, IBM Plex Mono for data, color palette from CLAUDE.md
- Login page dark background matches sidebar color (`#161D2E`) for visual consistency
- Read-only historical drawer should use muted/disabled styling (reduced opacity or gray tones on inputs)
- Edit Client tab form layout should be consistent with the existing Details tab layout

## Technical Considerations

- `localStorage` is used instead of `sessionStorage` per user preference — session survives tabs and restarts
- The `selectedClient` state bug likely lives in the `onRefresh` callback chain in `App.jsx` — the fix should update the clients array and then find + re-select the matching client by ID
- `deriveStatus()` is called in multiple views — fixing it once in `status.js` propagates everywhere
- The Edit Client tab reuses `updateClientField()` for individual field writes; a batch update helper is optional but not required
- Historical data fetch should check for existence of `Completed YYYY` and `Cancellation YYYY` tabs dynamically (2025, 2026, etc.)

## Success Metrics

- Zero re-authentication required on page refresh (until token expires)
- Checklist workflow is uninterrupted — no drawer closing during toggle
- All clients without valid appointments are visible in the urgent column/status
- Login page and Kanban board pass visual design review
- Staff can view any historical record without leaving the app
- Staff can edit any client field without opening Google Sheets directly

## Open Questions

- Should there be a visual indicator (e.g., warning icon) on clients flagged urgent due to missing appointment vs. upcoming appointment?
- For Edit Client, should changes be tracked in a revision history beyond the audit log?
- Should the historical view support bulk export or printing in a future iteration?
