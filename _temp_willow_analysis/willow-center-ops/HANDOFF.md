# Willow Ops — Session Handoff

This file is the authoritative context document for any new Claude session
working on this project. Read this first. Then read DECISIONS.md and
PRESENTATION.md for full detail.

---

## Who We Are

**James** — business automation consultant, owns Spark Mojo (a platform business
for modular ops tools). Pro bono engagement with Willow Center to build credibility
and prove out the Spark Mojo platform concept.

**Erin Wiley** — owner of Willow Center, a multi-clinician therapy practice chain
in Ohio. 30-year friend of James. Stream-of-consciousness communicator. Responds
to vision and emotion.

**Kate Torres** — owns a separate successful therapy practice, does her own billing
in-house, sharp domain expert. Emerging friend of both James and Erin. Potential
co-founder of a future venture (see below).

**The venture:** James + Erin + Kate have discussed building a billing/ops SaaS
platform for therapy practices. Willow Center is patient zero. Everything we build
for Willow is a reference implementation for that platform.

---

## The Product: Willow Ops

A modular web application for therapy practice operations. Each operational area
is a module. They share a design language, notification layer, and executive view.

**Modules planned:**
1. Onboarding (first contact → first appointment) — designed, prototype built
2. Revenue Cycle (billing dashboard, AR, collections) — data available, not built
3. Voicemail Triage — concept only, not designed
4. Command Center (cross-module KPIs + diagnostic tasks) — concept only

---

## The Stack

```
NOW:
  Vercel (static hosting, temporary)
  React + Vite + Tailwind
  Google Sheets API (data layer — PHI-safe under Workspace BAA)
  Google OAuth via sparkmojo.com (James's workspace — migrates to
    willowcenter.com when they connect their workspace)
  n8n (James's instance — task automation bridge)

SOON (when Willow VPS is live):
  Willow's own HIPAA-compliant VPS replaces Vercel
  n8n migrates to Willow's instance
  SimplePractice nightly dump → data lake replaces manual Google Sheets

FUTURE:
  Willow becomes an instance on the Spark Mojo platform
```

**HIPAA posture:** PHI lives in Google Sheets (Workspace BAA covers it). Vercel
serves static files only — no PHI touches it. Documented as intentional temporary
bridge. Defensible.

**Auth domain env var:** VITE_ALLOWED_DOMAIN — currently sparkmojo.com, will
change to willowcenter.com when Willow connects their workspace.

---

## Data Sources

### 1. Onboarding Sheet (24c spreadsheet)
Already lives in Google Sheets. 15 tabs. Key tabs:
- **Need to Check** — active onboarding queue (~25 current clients)
- **Completed 2025/2026** — historical completions
- **Cancellation 2025/2026** — failed onboardings
- **VM** — voicemail log
- **Clinician NPIs** — org reference data

**Core fields per client row:**
Date added, Staff initials, Client name, Clinician, First appt datetime,
Custody agreement (bool), GFE sent (bool — self-pay only), Paperwork complete
(bool), Insurance card uploaded (bool), Primary insurance, Secondary insurance,
Member ID, DOB, Employer, Verified status, Notes (free text), SP Note Added
(bool), Insurance Updated (bool), Outreach attempts 1-5 (each: date + method)

**Outreach methods in use:** SP Reminders, Google Text, LVM, EMW, Final Reminder

### 2. Billing Sheet (outstanding ledger)
One row per appointment session. Columns:
- Date of Service, Client, Clinician, Billing Code
- Primary Insurance, Secondary Insurance
- Rate per Unit, Units, Total Fee
- Client Payment Status (UNINVOICED / PAID)
- Client: Charge, Uninvoiced, Paid, Unpaid
- Insurance Payment Status (PAID / UNBILLED)
- Insurance: Charge, Paid, Write Off, Unpaid

This gives us: AR aging by clinician, outstanding client balances, unbilled
sessions (UNBILLED insurance = money sitting uncollected), write-off tracking.

### 3. Tasks Tab (to be created)
New tab added to the onboarding sheet. Written to by n8n and by the app.
```
task_id | client_id | task_type | assigned_to | due_date |
priority | status | created_at | completed_at | notes | module
```

### 4. Audit Log Tab (to be created)
```
timestamp | staff_email | action | client_id | detail
```

---

## The Prototype

A working HTML prototype was built in the previous session and is available at:
`/mnt/user-data/outputs/willow-ops-prototype.html`

It uses mock data (real client names from the 24c spreadsheet). It is NOT
connected to Google Sheets yet. It demonstrates the full UI.

**What the prototype contains — full feature inventory:**

### Global Shell
- Sidebar: logo, module nav with badges, user identity + logout at bottom
- Top bar: page title, subtitle, view switcher, search, Add Client button
- Toast notifications

### Onboarding — Queue View
- 4 KPI cards (Active Queue, Urgent, Pending Insurance, Appts This Week)
- KPI cards clickable → filter queue
- Filter chips (All, Urgent, Pending Insurance, Needs Paperwork, Ready)
- Client table: name, clinician, first appt, progress bar + %, insurance
  status badge, status badge, action buttons
- Urgency dot color per row
- Appt date color-coded (red ≤2 days, amber ≤7 days)
- Search by name or clinician
- Two action buttons per row: View, Log Outreach

### Onboarding — Kanban View
- 4 columns: Paperwork, Insurance, Ready, Urgent
- Column headers with counts
- Client cards: name, clinician, appt, mini progress bar, checklist pills
- Drag and drop between columns — writes status change + toast

### Onboarding — My Tasks View
- Auto-generated tasks from client data
- Grouped: Overdue / Today / Upcoming
- Summary counts at top
- Click task → opens client drawer

### Client Drawer (slide-in)
- Header: name, status badge, clinician, staff, date added
- Progress bar with stage labels (Scheduled→Paperwork→Insurance→Verified→Ready)
- Progress % display, color by completion
- Four tabs: Checklist, Outreach, Notes, Details

**Checklist tab:**
- Interactive toggles, Required/Optional tags
- Self-pay logic (irrelevant items hidden)
- Checking item updates progress bar live
- Auto-promotes to Ready when all done
- Appointment info section

**Outreach tab:**
- Timeline with connector line
- Attempt N of 5 indicator
- One-click log buttons (SP Reminders, Google Text, LVM, EMW, Final Reminder)

**Notes tab:**
- Threaded notes (author, date, text)
- Add note input

**Details tab:**
- Client info grid (DOB, employer, insurance, member ID, verification, staff)
- SP sync status (SP note added, insurance updated)

---

## What Is NOT Built Yet (discussed, not implemented)

- Revenue Cycle / billing module
- Voicemail module
- Command Center cross-module view
- Diagnostic open questions as seeded tasks
- Real Google Sheets read/write connection
- Google OAuth login
- Role-based views
- Sorting on queue table columns
- Cancellation workflow
- Historical/completed clients view
- Age-18 transition flag
- Custody agreement workflow detail
- Staff reassignment
- Bulk actions
- Export/reporting

---

## The Immediate Task: PRD

We were in the middle of defining the PRD when this session ended.

**The approach agreed upon:**
1. Use the prototype feature inventory above as the baseline
2. James reviews each feature and annotates: keep / change / cut
3. James adds new features not yet in the prototype
4. The annotated list becomes the PRD
5. PRD becomes the basis for Claude Code prompts

**James had just confirmed:** Every action in the app writes back to the Google
Sheet in real time. The sheet is the source of truth. The app is a read/write
interface. This is a foundational constraint — every feature needs a corresponding
write spec (what column, what format).

**Next step in the new session:** Present James with the feature inventory
from the prototype and ask him to annotate it. Do NOT start building.
Do NOT write Claude Code prompts until the PRD is complete and approved.

---

## The Meeting Tomorrow (1pm)

Erin + Kate. Presentation structure:
1. Empathy + Hard Truth (fires perpetuate fires, capacity vs. information problem)
2. The Standard (BPM, RACI, SOP library — what good looks like)
3. The Diagnostic (walk the HTML, let them think it's the deliverable)
4. The Vision + Price Tag (what this costs to buy: $30-120k + maintenance)
5. The Reveal ("we built it for you")
6. The Demo + Callback (demo the app, then show diagnostic tasks as seeded tasks)
7. The Roadmap (3 phases: Workspace now → VPS → Spark Mojo)
8. Close ("what do you want to tackle first?")

**Full presentation content is in PRESENTATION.md.**

**Assets still needed for the meeting:**
- [ ] Diagnostic HTML — add open questions section at bottom
- [ ] Diagnostic HTML — tighten language throughout
- [ ] Command Center — built by Claude Code with billing module + seeded tasks
- [ ] Vercel deployment
- [ ] Gamma deck assembled from PRESENTATION.md content

**The 10 diagnostic open questions (appear in diagnostic HTML AND as seeded
tasks in the command center — same list, two places, one callback moment):**

| # | Question | Assigned To | Category |
|---|----------|-------------|----------|
| 1 | Define unified balance threshold across all service lines | Erin | Billing |
| 2 | Clarify deductible billing decision logic | Erin + Kate | Billing |
| 3 | Define write-off authorization criteria and approval chain | Erin | Billing |
| 4 | Confirm secondary insurance audit scope and assign owner | Erin + Lisa | Claims |
| 5 | Resolve Sarah's clearinghouse access | Erin + Sarah | Operations |
| 6 | Define supervisor co-sign SLA | Lisa | Clinical |
| 7 | Configure SimplePractice inquiry form | Sarah | Operations |
| 8 | Clarify FMLA billing (patient-pay, not insurance) | Julia / Erin | Billing |
| 9 | Confirm Google Workspace BAA scope | Erin | Compliance |
| 10 | Define Julia transition timeline and billing handoff plan | Erin | Operations |

---

## Key People at Willow Center

| Name | Role | Notes |
|------|------|-------|
| Erin Wiley | Owner | Vision/people person, 30yr friend of James |
| Lisa | Clinical Director | Process oversight, supervisor compliance |
| Sarah | Practice Coordinator | Scheduling, clearinghouse access issue |
| Kaila | Medical Director/CEO | Stepping up on process/governance |
| Julia | External biller | Being minimized, eventual termination. Do not reference in client-facing materials. |
| Vanessa | Insurance verification | Runs Availity verifications |
| Kate Torres | External (friend/advisor) | Billing expert, potential co-founder |
| Michelle Nargisa | External billing consultant | Auditor role |

---

## Consulting Principles (maintain across sessions)

1. Reframe problems as information gaps, not capacity issues
2. Two-answer framework: manual fix now / automation handles permanently
3. Work within SimplePractice API constraints (no access) and ESI IVR contract
4. HIPAA compliance non-negotiable — flag any PHI-touching decision
5. Live demos over async docs for Erin
6. Julia still employed — all analysis internal-facing only
7. James is pro bono building credibility for paid referrals from Erin's network
8. Do NOT start building without confirming scope first
9. Do NOT consume large files without asking first
10. Do NOT write Claude Code prompts until PRD is complete and approved

---

## Repo Structure

```
willow-center-ops/
  HANDOFF.md          ← this file, read first
  DECISIONS.md        ← architecture decisions with rationale (D-001 to D-008)
  PRESENTATION.md     ← full meeting narrative, slide content, assets tracker
  CLAUDE_CODE_PROMPTS.md  ← DO NOT CREATE until PRD is done
  PRD.md              ← TO BE CREATED in next session
```

---

## Important Rules for New Sessions

- **Always ask before building anything complex or consuming large data files**
- The context window is precious — do not burn it on HTML builds or file reads
  without explicit instruction
- All decisions go in DECISIONS.md
- Presentation content goes in PRESENTATION.md
- PRD content goes in PRD.md (to be created)
- Claude Code prompts go in CLAUDE_CODE_PROMPTS.md (after PRD is approved)
- When in doubt, ask James what he wants to work on next
