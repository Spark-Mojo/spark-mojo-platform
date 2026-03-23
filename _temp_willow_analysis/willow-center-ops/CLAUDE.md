# Willow Ops — Claude Code Project Context

Read this file at the start of every session. It contains everything you need
to work on this codebase without asking clarifying questions.

---

## What This Is

Willow Ops is a modular operations platform for Willow Center, a multi-clinician
therapy practice in Ohio. It replaces manual Google Sheets workflows with a
professional web application. Google Sheets remains the data layer (PHI-safe
under Google Workspace BAA). The app reads and writes directly to the sheets.

**This is a real clinical application. PHI lives in Google Sheets. Never log,
cache, or transmit PHI outside of authorized Google API calls.**

---

## Stack

- **Framework:** Vite + React 18
- **Styling:** Tailwind CSS (CDN, not compiled — use only core utility classes)
- **Auth:** Google OAuth 2.0 via `@react-oauth/google`
- **Data:** Google Sheets API v4 (read/write via OAuth access token)
- **Hosting:** Vercel (static, no server — all API calls go directly to Google)
- **Fonts:** Sora (UI), IBM Plex Mono (data/numbers) — load from Google Fonts
- **Icons:** lucide-react
- **Drag and drop:** @dnd-kit/core + @dnd-kit/sortable
- **Charts (future):** recharts — import but don't build charts until Revenue Cycle module

---

## Project Structure

```
src/
  main.jsx                  # entry point
  App.jsx                   # OAuth provider + route shell
  components/
    shell/
      Sidebar.jsx
      TopBar.jsx
      Toast.jsx             # global toast system
    onboarding/
      QueueView.jsx
      KanbanView.jsx
      MyTasksView.jsx
      ClientDrawer.jsx
      ChecklistTab.jsx
      OutreachTab.jsx
      NotesTab.jsx
      DetailsTab.jsx
      AddClientModal.jsx
      HistoricalView.jsx
    admin/
      ManageStaff.jsx
      ReassignTasks.jsx
      AutomationConfig.jsx
  services/
    sheets.js               # ALL Google Sheets read/write functions
    auth.js                 # token management helpers
  hooks/
    useToast.js
    useSheets.js
  utils/
    status.js               # derive client status from boolean fields
    dates.js                # date helpers, age calculation
    progress.js             # calculate onboarding % from checklist fields
scripts/
  ralph/
    ralph.sh
    CLAUDE.md               # this file
prd.json
progress.txt
```

---

## Environment Variables

All in `.env`. Never hardcode these.

```
VITE_GOOGLE_CLIENT_ID=         # Google OAuth client ID
VITE_ALLOWED_DOMAIN=sparkmojo.com  # restrict login to this domain
VITE_ONBOARDING_SHEET_ID=      # Google Sheet ID for 24c onboarding spreadsheet
VITE_BILLING_SHEET_ID=         # Google Sheet ID for billing spreadsheet
```

Access in code: `import.meta.env.VITE_GOOGLE_CLIENT_ID`

---

## Design System — Apply Exactly

### Colors (use as CSS custom properties)
```css
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
```

### Typography
- All UI text: `font-family: 'Sora', sans-serif`
- All numbers/data/dates/money: `font-family: 'IBM Plex Mono', monospace`

### Status Badge Colors
| Status | Background | Text |
|--------|-----------|------|
| Urgent | #FCEAEA | #A32D2D |
| Needs Paperwork | #FEF4E7 | #854F0B |
| Pending Insurance | #EAF2FB | #185FA5 |
| Ready | #EAF3DE | #3B6D11 |
| Archived | bg-secondary | muted |

### Progress Bar Thresholds
- < 50%: red (#E24B4A)
- 50–79%: amber (#EF9F27)
- ≥ 80%: green (#2A7A65)

### Animations
- Progress bar: animate from 0% to actual value on mount, ease-out 600ms
- Count-up: number animates from 0 to actual on mount
- Re-triggers on every checklist toggle
- Drawer slide-in: 200ms ease from right
- All other transitions: 150ms ease

---

## Google Sheets Data Layer

### The Golden Rule
Every user action that changes data MUST write back to the sheet immediately.
The sheet is the source of truth. The app is a read/write interface.

### Sheet IDs
- Onboarding: `import.meta.env.VITE_ONBOARDING_SHEET_ID`
- Billing: `import.meta.env.VITE_BILLING_SHEET_ID`

### API Call Pattern
```javascript
// Always use the OAuth access token from Google login
// Token is stored in React context after login

async function updateCell(accessToken, sheetId, range, value) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[value]] }),
    }
  );
}
```

### Onboarding Sheet — Key Tab Names
- `Need to Check` — active queue (NOTE: space in name, escape in API calls)
- `Completed 2025`, `Completed 2026` — historical completions
- `Cancellation 2025`, `Cancellation 2026` — archived clients
- `Staff` — staff list (NEW — may not exist yet, create if missing)
- `Outreach_Log` — extended outreach log (NEW)
- `Tasks` — task list (NEW)
- `Audit_Log` — audit trail (NEW)
- `Config` — configuration values (NEW)

### Onboarding Sheet — Need to Check Column Mapping
Columns are approximate — read row 1 headers to get exact positions at runtime.
Key columns: Date Added, Initials, Client Name, Clinician, First Appt,
Custody Agreement, GFE Sent, Paperwork Complete, Insurance Card,
Primary Insurance, Secondary Insurance, Member ID, DOB, Employer,
Verified, Notes, SP Note Added, Insurance Updated,
Date_Attempt_1 through Date_Attempt_5, Method_Attempt_1 through Method_Attempt_5,
urgent_override (NEW), archive_reason (NEW), archive_date (NEW),
archived_by (NEW), Clinician_History (NEW)

### Status Derivation (never store status as a column — always derive)
```javascript
export function deriveStatus(client) {
  const urgentThreshold = config.urgent_threshold_days ?? 2;
  const daysUntilAppt = daysBetween(new Date(), client.firstAppt);
  const hasIncomplete = !isComplete(client);

  if (client.urgentOverride || (daysUntilAppt <= urgentThreshold && hasIncomplete))
    return 'urgent';
  if (!client.paperworkComplete) return 'needs-paperwork';
  if (!client.insuranceVerified && client.primaryInsurance !== 'Self Pay')
    return 'pending-insurance';
  if (isComplete(client)) return 'ready';
  return 'needs-paperwork';
}
```

### Writing to New Tabs
If a required tab (Staff, Tasks, Outreach_Log, Audit_Log, Config) doesn't exist,
create it with headers before writing. Use the batchUpdate API to add sheets.

---

## Auth Pattern

```jsx
// App.jsx wraps everything in GoogleOAuthProvider
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// After login, store access_token in React context
// Check hd (hosted domain) claim against VITE_ALLOWED_DOMAIN
// Individual whitelisted accounts bypass domain check (store list in Config tab)
```

Login page must have:
- Willow Center logo (fetch from `/assets/willow-center-logo.png` in repo)
- Botanical leaf particle animation on logo entrance
- "Sign in with Google" button
- App name "Willow Ops" fades up after logo animates

---

## Sidebar Structure

```
[Logo]
Onboarding          [23]
Revenue Cycle       [Phase 2]
Voicemail           [Phase 2]
Command Center      [Phase 2]
---
Reports             [Round 2]
  Onboarding
---
Admin
  Manage Staff
  Config
---
[User avatar] [Name] [Role]
[Logout]
```

Sidebar background: #161D2E
Active item: #2A7A65 background, white text
Inactive: rgba(255,255,255,0.6) text
Phase 2 / Round 2 items: show italic "Phase 2" or "Round 2" label, clicking shows a toast: "Coming in Phase 2"

---

## Client Status Logic — Kanban Column Mapping

| Column | Condition |
|--------|----------|
| Paperwork | paperwork_complete = false |
| Insurance | paperwork_complete = true AND not verified AND not self-pay |
| Ready | all required items complete |
| Urgent | appt ≤ urgent_threshold_days AND any required incomplete (overrides others) |

When dragging to a column, update booleans to match that column's condition.
Dragging to Urgent sets `urgent_override = true`.
Dragging out of Urgent sets `urgent_override = false`.

---

## Checklist Items and Visibility Rules

| # | Item | Condition to Show | Required |
|---|------|------------------|----------|
| 1 | Paperwork completed | always | yes |
| 2 | Insurance card uploaded | not self-pay | yes |
| 3 | Insurance verified | not self-pay | yes |
| 4 | Custody agreement | minor (DOB < 18) OR custody field present | yes |
| 5 | Good Faith Estimate sent | self-pay only | yes |
| 6 | SP note added | always | yes |
| 7 | Insurance updated in SP | always | optional |

Progress % = completed required items / total required items (for this client's profile).

---

## Minor Detection

```javascript
export function isMinor(dob) {
  if (!dob || dob === 'n/a' || dob === '') return null; // unknown
  const age = daysBetween(new Date(dob), new Date()) / 365.25;
  return age < 18;
}
// If isMinor returns null, fall back to: show custody item if custody column exists in row
```

---

## Toast System

Global non-blocking toasts. Auto-dismiss after 3 seconds.
```javascript
// Usage anywhere in app:
toast.success('Outreach logged — Google Text attempt #3 for Eleanor Marriott');
toast.error('Failed to save — check your connection');
```
Toast colors: success = #1A2A24 bg, #2A7A65 left border. Error = red.

---

## Audit Log

Every write to the sheet appends a row to Audit_Log:
```
timestamp | staff_email | action | client_id | detail
```
Do this automatically in the sheets.js service layer — callers don't need to think about it.

---

## Things NOT To Do

- Do NOT hardcode staff names, clinician names, or outreach methods
- Do NOT store status as a column — always derive from booleans
- Do NOT use localStorage or sessionStorage for app data — exception: auth token persistence in localStorage is allowed (Bug #1 fix)
- Do NOT build the Revenue Cycle, Voicemail, or Command Center modules —
  they are Phase 2. Sidebar stubs only.
- Do NOT build reporting charts — Reports section is a stub (Round 2)
- Do NOT add role-based access control — all users have identical permissions
- Do NOT use Inter, Roboto, or system fonts — use Sora + IBM Plex Mono only
- Do NOT invent data — all content comes from Google Sheets
- Do NOT skip the Audit_Log write on any mutation

---

## Quality Checks (run after every story)

```bash
npm run build          # must pass with no errors
npm run lint           # must pass
```

If either fails, fix before committing.

---

## progress.txt

After completing each story, append learnings to `progress.txt`:
- Patterns discovered
- Gotchas encountered
- Decisions made that aren't in the PRD
- Anything the next iteration should know
