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
  main.jsx
  App.jsx
  components/
    shell/
      Sidebar.jsx
      TopBar.jsx
      Toast.jsx
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
    sheets.js
    auth.js
  hooks/
    useToast.js
    useSheets.js
  utils/
    status.js
    dates.js
    progress.js
scripts/ralph/
  ralph.sh
  CLAUDE.md      <- this file
  prd.json
  progress.txt
```

---

## Environment Variables

All in `.env` at repo root. Never hardcode these.

```
VITE_GOOGLE_CLIENT_ID=
VITE_ALLOWED_DOMAIN=sparkmojo.com
VITE_ONBOARDING_SHEET_ID=
VITE_BILLING_SHEET_ID=
```

Access in code: `import.meta.env.VITE_GOOGLE_CLIENT_ID`

---

## Design System — Apply Exactly

### Colors (CSS custom properties in index.css)
```css
--accent: #2A7A65;
--accent-mid: #3D9B82;
--accent-light: #EAF4F1;
--bg: #F5F3EF;
--surface: #FFFFFF;
--sidebar: #161D2E;
--text: #1A1A1A;
--muted: #6B7280;
--border: #E4E1D8;
--red: #C94040;
--amber: #C47B1A;
--blue: #2065B8;
--green: #2A7A65;
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
| Archived | #F3F4F6 | #6B7280 |

### Progress Bar Thresholds
- < 50%: #E24B4A
- 50–79%: #EF9F27
- >= 80%: #2A7A65

### Animations
- Progress bar: animate from 0% to actual, ease-out 600ms on mount
- Number count-up: 0 to actual in sync with bar
- Re-triggers on every checklist toggle
- Drawer slide-in: 200ms ease from right
- All other transitions: 150ms ease

---

## Google Sheets Data Layer

### Golden Rule
Every user action that changes data MUST write back to the sheet immediately.
The sheet is the source of truth. The app is a read/write interface.

### Sheet IDs
- Onboarding: `import.meta.env.VITE_ONBOARDING_SHEET_ID`
- Billing: `import.meta.env.VITE_BILLING_SHEET_ID`

### API Pattern
```javascript
async function updateCell(accessToken, sheetId, range, value) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
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

### Tab Names (exact, spaces matter)
- `Need to Check` — active queue
- `Completed 2025`, `Completed 2026`
- `Cancellation 2025`, `Cancellation 2026`
- `Staff` — NEW, create if missing
- `Outreach_Log` — NEW
- `Tasks` — NEW
- `Audit_Log` — NEW
- `Config` — NEW

### Column Mapping
Always read row 1 headers to find column positions at runtime — do NOT hardcode indices.
Key columns in Need to Check: Date Added, Initials, Client Name, Clinician, First Appt,
Custody Agreement, GFE Sent, Paperwork Complete, Insurance Card, Primary Insurance,
Secondary Insurance, Member ID, DOB, Employer, Verified, Notes, SP Note Added,
Insurance Updated, Date_Attempt_1–5, Method_Attempt_1–5,
urgent_override (NEW), archive_reason (NEW), archive_date (NEW),
archived_by (NEW), Clinician_History (NEW)

### Status Derivation (NEVER store as a column)
```javascript
export function deriveStatus(client, config) {
  const threshold = config?.urgent_threshold_days ?? 2;
  const daysUntil = daysBetween(new Date(), new Date(client.firstAppt));
  const incomplete = !isComplete(client);
  if (client.archiveReason) return 'archived';
  if (client.urgentOverride || (daysUntil <= threshold && incomplete)) return 'urgent';
  if (!client.paperworkComplete) return 'needs-paperwork';
  if (!client.insuranceVerified && client.primaryInsurance !== 'Self Pay') return 'pending-insurance';
  if (isComplete(client)) return 'ready';
  return 'needs-paperwork';
}
```

### Creating Missing Tabs
If Staff, Tasks, Outreach_Log, Audit_Log, or Config tab is missing, create it
with correct headers using the Sheets batchUpdate API before writing.

---

## Auth Pattern

```jsx
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
// Wrap App in GoogleOAuthProvider with clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
// After login, validate: tokenInfo.hd === import.meta.env.VITE_ALLOWED_DOMAIN
// Store access_token in React context (not localStorage)
```

Login page requirements:
- Willow Center logo with botanical leaf particle entrance animation
- "Willow Ops" name fades up after logo animates
- "Sign in with Google" button

---

## Sidebar Structure (exact)

```
[Willow Center Logo]
Onboarding          [count badge]
Revenue Cycle       [Phase 2 — toast on click]
Voicemail           [Phase 2 — toast on click]
Command Center      [Phase 2 — toast on click]
──────────────────
Reports             [Round 2 stub]
  Onboarding
──────────────────
Admin
  Manage Staff
  Config
──────────────────
[avatar] Name  Role
[Logout]
```

Sidebar: background #161D2E, active #2A7A65, inactive rgba(255,255,255,0.6)

---

## Kanban Column Logic

| Column | Condition |
|--------|-----------|
| Paperwork | paperworkComplete = false |
| Insurance | paperworkComplete = true AND not verified AND not self-pay |
| Ready | all required items complete |
| Urgent | appt <= threshold days AND any required incomplete (overrides all) |

Dragging updates booleans to match target column. Dragging to/from Urgent sets urgentOverride.

---

## Checklist Visibility Rules

| # | Item | Show when | Required |
|---|------|-----------|----------|
| 1 | Paperwork completed | always | yes |
| 2 | Insurance card uploaded | not self-pay | yes |
| 3 | Insurance verified | not self-pay | yes |
| 4 | Custody agreement | minor OR custody field present | yes |
| 5 | Good Faith Estimate sent | self-pay only | yes |
| 6 | SP note added | always | yes |
| 7 | Insurance updated in SP | always | optional |

Progress % = completedRequired / totalRequired

---

## Minor Detection

```javascript
export function isMinor(dob) {
  if (!dob || dob === 'n/a' || dob === '') return null;
  const ageYears = daysBetween(new Date(dob), new Date()) / 365.25;
  return ageYears < 18;
}
// null = unknown; fall back to: show custody item if custodyAgreement column exists
```

---

## Toast System

```javascript
toast.success('Message here');
toast.error('Error message');
// Auto-dismiss 3 seconds. Non-blocking.
```

---

## Audit Log

Every sheet write MUST append a row to Audit_Log:
`timestamp | staff_email | action | client_id | detail`
Handle this in the sheets.js service layer automatically.

---

## DO NOT

- Hardcode staff names, clinician names, or outreach methods
- Store status as a sheet column — always derive
- Build Revenue Cycle, Voicemail, or Command Center (Phase 2 stubs only)
- Build reports charts (Round 2 stub only)
- Use Inter, Roboto, or system fonts
- Skip Audit_Log on any mutation
- Hardcode Sheet IDs, OAuth client IDs, or domain names
- Set passes=true in prd.json WITHOUT first updating progress.txt
- Skip ANY step in the Story Completion Protocol

---

## Quality Checks (run after EVERY story before committing)

```bash
npm run build   # must pass
npm run lint    # must pass
```

Fix all errors before committing. A story is not done until both pass.

---
## Verify in Browser

After implementing, use agent-browser to verify your work:

1. Open the local server URL:
   ```
   agent-browser open http://localhost:3000
   ```

2. Take a snapshot to see the page structure:
   ```
   agent-browser snapshot -i -c
   ```

3. Take a screenshot for visual verification:
   ```
   agent-browser screenshot screenshots/[task-name].png
   ```

4. Check for any console errors or layout issues

5. If the task involves interactive elements, test them:
   ```
   agent-browser click "[selector]"
   agent-browser fill "[selector]" "test value"
   ```
---

## Story Completion Protocol (MANDATORY — follow in exact order)

After implementing a story, you MUST complete ALL of the following steps before
moving to the next story. Do NOT skip any step. Do NOT set passes=true until
all steps are done.

### Step 1: Quality checks
```bash
npm run build   # must pass
npm run lint    # must pass
```
If either fails, fix and re-run until both pass.

### Step 2: Update progress.txt
Append a block to `scripts/ralph/progress.txt` in this exact format:
```
## [STORY-ID]: [Story Title]
Completed: [YYYY-MM-DD]
Status: DONE
- What you changed
- What commands you ran
- The screenshot filename
- Any issues encountered and how you resolved them

### Learnings
- [What you discovered while implementing]
- [Gotchas or surprises]
- [Decisions made that aren't in the PRD]
- [Anything the next iteration needs to know]

### Files Changed
- [list of files created or modified]

---
```
**VERIFY** the file was updated: read `scripts/ralph/progress.txt` after writing
and confirm your new block appears at the bottom.

### Step 3: Update prd.json
Set `"passes": true` for the completed story. Add a `"notes"` field with a
one-line summary of what was done (e.g., `"notes": "Added localStorage auth
persistence with 401 auto-logout"`).

### Step 4: Commit
Stage and commit all changes (including progress.txt and prd.json updates)
Make one git commit for that task only with a clear, descriptive message:
```
git add .
git commit -m "feat: [brief description of what was implemented]"
```

Do NOT run `git init`, do NOT change git remotes, and do NOT push.

### Step 5: Verify
Run `git log --oneline -1` to confirm the commit landed.

---

## Important Rules

- ONLY work on a SINGLE task per iteration
- Always verify in browser before marking a task as passing
- Always log your progress in progress.txt
- Always commit after completing a task

---

## Loop Completion

Output `<promise>COMPLETE</promise>` ONLY when ALL stories in prd.json have
passes=true. If any story has passes=false, pick the next one by priority
order and implement it — do NOT output COMPLETE.
