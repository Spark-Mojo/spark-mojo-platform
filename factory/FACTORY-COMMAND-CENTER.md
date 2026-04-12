# Spark Mojo Development Factory Command Center
## Product Requirements Document + Implementation Guide

**Author:** Claude Opus 4.6 for James Ilsley
**Date:** April 8, 2026
**Version:** 1.0
**Companion to:** Autonomous Dev Factory Design v3

---

## Part 1: Product Requirements

### 1.1 What It Is

The Factory Command Center is a single-screen dashboard and workflow enforcement layer for the Spark Mojo Autonomous Development Factory. It is the human interface to the two-pipeline factory system (Spec Factory + Build Factory), designed for a solo founder with ADHD who needs to see everything at a glance, get told exactly when action is needed, and never have to remember what step comes next.

It is NOT a project management tool. It is NOT a general-purpose dashboard. It is a purpose-built control room for one specific automated process with exactly four human touchpoints.

### 1.2 The Problem It Solves

The factory design document (v3) defines a technically excellent automated pipeline. But the human experience of operating it has these gaps:

- **No single view of what's happening.** Capabilities could be in various pipeline stages across different terminal sessions, directories, and Ralph runs. The human has to mentally track all of it.
- **No proactive notification system.** Ralph has Telegram integration for individual build runs, but nothing that orchestrates across the full pipeline or across multiple capabilities.
- **No guided checklists.** The human touchpoints (input prep, spec review, deploy approval, VPS verification) are documented in the design doc but not enforced or guided at runtime.
- **No history.** "What happened overnight?" requires reading Ralph event logs, git history, and file timestamps across multiple directories.
- **No dopamine.** Shipping capabilities is invisible. There's no moment of completion, no running tally, no sense of velocity.

### 1.3 Design Principles

1. **One number.** The home screen shows one number: how many things need your attention right now. Everything else is secondary.
2. **Cards, not dashboards.** Each capability is a card. Cards flow through columns. You see the whole pipeline at a glance.
3. **Checklists, not instructions.** When it's your turn, you get a step-by-step checklist with copy-paste commands. Not paragraphs to read.
4. **Push, don't pull.** Telegram tells you when you're needed. You don't check the dashboard. The dashboard checks on you.
5. **Celebrate completion.** When a capability ships, you see it. Running total. Cost. Time. Stories built. The win matters.

### 1.4 Users

One user: James. Solo founder. ADHD. Operates from Mac. Uses Telegram. Runs n8n on a VPS. Has Claude Code and OpenCode installed locally.

### 1.5 Core Features

#### F1: Pipeline Kanban Board

A single-screen Kanban with 7 columns representing the factory pipeline:

| Column | State | Card Color | Human Action? |
|--------|-------|-----------|---------------|
| Backlog | Research complete, not yet prepped | Gray | No |
| Input Prep | Human assembling inputs | Yellow | YES |
| Spec Running | Spec factory Ralph loop active | Blue (animated) | No |
| Spec Review | Spec complete, awaiting human review | Yellow (pulsing) | YES |
| Build Running | Build factory Ralph loop active | Blue (animated) | No |
| Deploy Review | Build complete, awaiting human verification | Yellow (pulsing) | YES |
| Shipped | Deployed, verified, done | Green | No |

Each card shows:
- Capability name (e.g., "CRM Client Identity")
- Time in current column (e.g., "2h 14m")
- If in Build Running: progress bar (e.g., "24/38 stories")
- If blocked: red border + "BLOCKED" badge
- If clinical: small shield icon

#### F2: Action Required Panel

When you tap a yellow card (or when the dashboard loads with pending actions), a right-side panel opens with:

- **What to do** (one sentence)
- **Why** (one sentence)
- **Step-by-step checklist** with checkboxes
- Each step includes a **copy button** for terminal commands or file paths
- Steps are context-aware (they know which capability, which directory, which phase)
- A "Done" button that writes the appropriate gate file (READY.md, APPROVED.md, etc.) and advances the card

Example for Spec Review:

```
ACTION REQUIRED: Review specs for CRM Client Identity

The spec factory completed 47 minutes ago. 38 atomic stories were generated.
2 open questions flagged (non-blocking).

CHECKLIST:
□ Read verification report
  [COPY] cat factory/capabilities/crm-client-identity/spec/VERIFICATION-REPORT.md

□ Skim story list (38 stories, all size S or XS)
  [COPY] cat factory/capabilities/crm-client-identity/spec/STORIES.md

□ Check open questions
  [COPY] cat factory/capabilities/crm-client-identity/spec/OPEN-QUESTIONS.md

□ Spot-check 2-3 story specs
  [COPY] ls factory/capabilities/crm-client-identity/spec/stories/
  [COPY] cat factory/capabilities/crm-client-identity/spec/stories/CRM-001.md

□ Skim KB draft quality
  [COPY] head -100 factory/capabilities/crm-client-identity/spec/kb-drafts/USER-GUIDE.md

□ Verify PROMPT.md is lightweight
  [COPY] wc -w factory/capabilities/crm-client-identity/spec/build-factory/PROMPT.md

[APPROVE] → Creates APPROVED.md and triggers build factory
[REQUEST CHANGES] → Opens text input for revision notes
```

#### F3: Telegram Notifications

N8n sends Telegram messages at these moments:

| Trigger | Message | Urgency |
|---------|---------|---------|
| Spec factory complete | "Spec factory done for {capability}. 38 stories generated. Review needed. ~10 min task." | Normal |
| Build factory 50% milestone | "{capability} build: 19/38 stories complete. Running smoothly. No action needed." | Low |
| Build factory BLOCKED | "BLOCKED: {capability} story CRM-024 hit a blocker. See BLOCKED-CRM-024.md. Needs your input." | High |
| Clinical deploy gate | "CLINICAL GATE: {capability} ready to deploy. Reply YES to approve or NO to hold." | High |
| Build factory complete | "Build factory done for {capability}. All 38 stories built. VPS verification needed. ~15 min task." | Normal |
| Capability shipped | "SHIPPED: {capability}. 38 stories, 6 KB articles, $14.20 total cost. Capability #7 complete." | Celebration |
| Morning digest (8 AM) | "Good morning. 2 capabilities in flight. Billing waiting on spec review (14h). CRM building, ETA 3h." | Daily |
| Stale reminder (24h+ in yellow) | "{capability} has been waiting on your review for 26 hours. ~10 min task." | Nudge |

#### F4: Overnight Log (What Happened While I Slept)

A timeline view for any capability showing human-readable events:

```
CRM Client Identity - Last 12 Hours

04:47 AM  All 38 stories complete. KB verification starting.
04:31 AM  CRM-038 passed secondary review (MiniMax 2.7)
04:14 AM  CRM-037 built, static analysis passed, under review
03:52 AM  CRM-036 passed all 4 verification layers
...
10:45 PM  Build factory started. 38 stories queued.
10:44 PM  You approved specs.
10:30 PM  Spec factory complete. You were notified via Telegram.
```

Not log files. Not JSON. Human sentences with timestamps.

#### F5: Shipped Board

A permanent record of everything the factory has produced:

```
SHIPPED CAPABILITIES

#7  CRM Client Identity    April 9, 2026     38 stories  $14.20   12h 34m
#6  Workflow Engine         April 7, 2026     42 stories  $18.50   14h 12m
#5  Configuration Mojo     April 5, 2026     22 stories  $ 8.30    6h 45m
...

TOTALS: 7 capabilities | 194 stories | $72.40 | 62 hours factory time
```

#### F6: Pre-Flight Readiness Check

Before starting input prep for a new capability, the dashboard checks:

- [ ] Research pack exists (all 4 docs present in platform/research/)
- [ ] RESEARCH-CORRECTIONS.md checked for this capability
- [ ] Model bakeoff current (MODEL-ASSIGNMENTS.md less than 30 days old)
- [ ] No unresolved BLOCKED files from previous capabilities
- [ ] VPS is reachable (simple health check)
- [ ] Git repo is clean (no uncommitted changes)

Green = ready to start. Red = fix before proceeding.

#### F7: Factory Process Enforcement

N8n enforces the pipeline sequence. You cannot skip steps:

- Build factory will not start unless APPROVED.md exists
- Deploy will not proceed if clinical_feature is true without Telegram YES
- A capability cannot move to Shipped unless post-deploy verification checklist is complete
- READY.md cannot be created if pre-flight checks fail

### 1.6 What It Is NOT

- Not a code editor or IDE integration
- Not a replacement for reading specs and docs (it links to them)
- Not a multi-user collaboration tool
- Not a general project management tool
- Not where you write research or user stories (those happen elsewhere)

### 1.7 Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Dashboard UI | React JSX, single page | Matches your platform stack. No new tech. |
| State management | JSON files in factory/ directory | Disk is state. Same philosophy as Ralph. |
| Workflow automation | n8n (self-hosted, automation.sparkmojo.com) | Already running. Already in your stack. |
| Push notifications | Telegram via n8n | Already wired into Ralph. |
| Hosting | Local dev server or VPS static site | Lightweight. No infrastructure needed. |

---

## Part 2: Implementation Guide

### Overview of What You're Building

There are 3 components to build:

1. **State files and conventions** - The JSON state file format and directory conventions
2. **N8n workflows** - 5 workflows that watch, enforce, notify, and orchestrate
3. **Dashboard UI** - A React JSX single-page app that reads state and renders the Kanban

Build them in this order. Each step is independently useful.

---

### Step 1: State File Convention

Create the state tracking infrastructure. This is manual setup, no code needed.

#### 1a: Create the state directory

```bash
mkdir -p factory/state
```

#### 1b: Create a template state file

Create `factory/templates/STATE-TEMPLATE.json`:

```json
{
  "capability": "",
  "capability_short": "",
  "phase": "backlog",
  "phase_entered": "",
  "human_action_required": false,
  "human_action_type": null,
  "stories_total": 0,
  "stories_complete": 0,
  "blocked": false,
  "blocked_reason": null,
  "clinical_feature": false,
  "cost_so_far": "$0.00",
  "spec_factory_started": null,
  "spec_factory_completed": null,
  "build_factory_started": null,
  "build_factory_completed": null,
  "deployed_at": null,
  "shipped_at": null,
  "total_elapsed_minutes": 0,
  "events": []
}
```

#### 1c: Define the phase state machine

Valid phase transitions (n8n will enforce these):

```
backlog -> input_prep -> spec_running -> spec_review -> build_running -> deploy_review -> shipped
                                ^                            |
                                |                            v
                                +--- spec_rejected (loops back to spec_running)
```

The `events` array captures the overnight log. Each entry:

```json
{
  "time": "2026-04-09T03:14:00Z",
  "type": "story_complete",
  "message": "CRM-024 passed secondary review",
  "phase": "build_running"
}
```

---

### Step 2: N8n Workflows

Build 5 n8n workflows. Each is independent and can be built/tested separately.

#### Workflow 1: Factory State Watcher

**Purpose:** Watches the factory directory for gate files (READY.md, APPROVED.md, LOOP_COMPLETE) and updates state accordingly.

**Claude Code prompt to generate this workflow:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Cron schedule, runs every 60 seconds.

LOGIC:
1. List all directories under factory/capabilities/ (each is a capability)
2. For each capability, read factory/state/{capability}.json (or create from template if missing)
3. Check the current phase and look for transition triggers:

   Phase "backlog":
   - If factory/capabilities/{cap}/input/READY.md exists -> transition to "input_prep"

   Phase "input_prep":
   - If READY.md contains "## GO" -> transition to "spec_running"
   - (The transition to spec_running also triggers Workflow 2: Ralph Runner)

   Phase "spec_running":
   - If factory/capabilities/{cap}/spec/VERIFICATION-REPORT.md exists
     AND spec/OPEN-QUESTIONS.md exists
     AND no BLOCKED-*.md files in the capability root
     -> transition to "spec_review", set human_action_required: true

   Phase "spec_review":
   - If factory/capabilities/{cap}/spec/APPROVED.md exists -> transition to "build_running"
   - If factory/capabilities/{cap}/spec/REVISE.md exists -> transition to "spec_running" (re-run)

   Phase "build_running":
   - Read factory/capabilities/{cap}/spec/build-factory/PROMPT.md
   - Count checked [x] vs unchecked [ ] stories
   - Update stories_total and stories_complete
   - If build/STORIES-STATUS.md exists -> transition to "deploy_review"
   - If any BLOCKED-*.md exists -> set blocked: true

   Phase "deploy_review":
   - If human confirms via Telegram (clinical) or checklist (non-clinical)
     -> transition to "shipped"

4. On any transition, append an event to the events array
5. Write updated state back to factory/state/{capability}.json

ENVIRONMENT:
- n8n has filesystem access to the repo at /path/to/spark-mojo-platform
- Use the "Read/Write File" and "Execute Command" nodes
- Use "If" nodes for phase logic

OUTPUT: Valid n8n workflow JSON I can import directly.
```

#### Workflow 2: Ralph Runner

**Purpose:** Automatically starts Ralph loops when a capability enters spec_running or build_running phase.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Webhook - POST /factory/run-ralph
Payload: { "capability": "crm-client-identity", "phase": "spec" | "build" }

LOGIC:
For phase "spec":
1. Set working directory to the platform repo root
2. Execute command (async, don't wait for completion):
   ralph run \
     -c factory/spec-factory/ralph.yml \
     -H factory/spec-factory/hats.yml \
     --no-tui \
     -p "Build specifications for the {capability} capability. Input: factory/capabilities/{capability}/input/. Output: factory/capabilities/{capability}/spec/." \
     2>&1 | tee factory/state/{capability}-spec-factory.log
3. Update state JSON: spec_factory_started = now()
4. Append event: "Spec factory started"

For phase "build":
1. Copy CLAUDE.md to repo root:
   cp factory/capabilities/{capability}/spec/build-factory/CLAUDE.md ./CLAUDE.md
2. Execute command (async):
   ralph run \
     -c factory/capabilities/{capability}/spec/build-factory/ralph.yml \
     -H factory/build-factory/hats.yml \
     --no-tui \
     2>&1 | tee factory/state/{capability}-build-factory.log
3. Update state JSON: build_factory_started = now()
4. Append event: "Build factory started"

ENVIRONMENT:
- n8n server can execute shell commands on the machine where Ralph runs
- If Ralph runs on a different machine (Mac Mini), use SSH Execute node instead
- The ralph binary is in PATH

OUTPUT: Valid n8n workflow JSON I can import.
```

#### Workflow 3: Telegram Notifier

**Purpose:** Sends context-aware Telegram messages at key moments.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Webhook - POST /factory/notify
Payload: {
  "capability": "crm-client-identity",
  "event_type": "spec_complete" | "build_progress" | "blocked" | "clinical_gate" | "build_complete" | "shipped" | "stale_reminder",
  "details": { ... event-specific data }
}

LOGIC:
Based on event_type, compose and send a Telegram message:

"spec_complete":
  "Spec factory done for {capability}. {stories_total} stories generated.
  {open_questions} open questions. Review needed. ~10 min task."

"build_progress" (only send at 25%, 50%, 75%):
  "{capability} build: {complete}/{total} stories done. Running smoothly."

"blocked":
  "BLOCKED: {capability} story {story_id} hit a blocker.
  Reason: {reason}. Needs your input."

"clinical_gate":
  "CLINICAL GATE: {capability} ready to deploy.
  clinical_feature is TRUE. Reply YES to approve deploy or NO to hold."
  (Wait for reply using Telegram Trigger node, timeout 4 hours)
  (Write response to factory/state/{capability}-clinical-response.txt)

"build_complete":
  "Build factory done for {capability}. All {total} stories built.
  6 KB articles written. VPS verification needed. ~15 min task."

"shipped":
  "SHIPPED: {capability}. {stories} stories, {kb_count} KB articles,
  {cost} total cost, {elapsed} elapsed. Capability #{number} complete."

"stale_reminder":
  "{capability} has been waiting on your review for {hours} hours.
  ~{estimated_minutes} min task."

TELEGRAM CONFIG:
- Bot token: (use environment variable TELEGRAM_BOT_TOKEN)
- Chat ID: (use environment variable TELEGRAM_CHAT_ID)
- Use Telegram node for sending
- For clinical_gate, use Telegram Trigger node to wait for reply

OUTPUT: Valid n8n workflow JSON I can import.
```

#### Workflow 4: Morning Digest

**Purpose:** Sends a daily summary at 8 AM.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Cron - every day at 8:00 AM Eastern

LOGIC:
1. Read all state files from factory/state/*.json
2. Categorize capabilities by phase
3. Identify any that are human_action_required: true
4. Calculate time-in-phase for anything in a yellow state

5. Compose Telegram message:
   "Good morning James.

   ACTION NEEDED:
   - {capability}: waiting on spec review (Xh)
   - {capability}: waiting on deploy verification (Xh)

   IN PROGRESS:
   - {capability}: building, {n}/{total} stories (ETA ~Xh)
   - {capability}: spec factory running (~Xm remaining)

   SHIPPED THIS WEEK: {count} capabilities

   Nothing else needs you right now. Have a good morning."

   If nothing needs attention:
   "Good morning James. Factory is quiet. No action needed.
   {count} capabilities shipped total."

6. Send via Telegram

OUTPUT: Valid n8n workflow JSON I can import.
```

#### Workflow 5: Stale Checker

**Purpose:** Detects capabilities stuck waiting for human action and nudges.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Cron - every 4 hours

LOGIC:
1. Read all state files from factory/state/*.json
2. For each capability where human_action_required is true:
   - Calculate hours since phase_entered
   - If > 24 hours: send stale_reminder via Workflow 3 webhook
   - If > 48 hours: send escalated reminder with stronger language
3. For each capability where blocked is true:
   - If blocked for > 12 hours: send reminder about the blocked item

OUTPUT: Valid n8n workflow JSON I can import.
```

---

### Step 3: Dashboard UI

A single React JSX file that reads state files and renders the Kanban board.

**Claude Code prompt for the dashboard:**

```
Build a single-file React JSX dashboard for the Spark Mojo Development
Factory Command Center. No TypeScript. No separate CSS file - use inline
styles or a style block.

REQUIREMENTS:

1. DATA SOURCE:
   - Fetch state from a local API endpoint: GET /api/factory/state
     (This will be served by a simple Express server or n8n webhook that
     reads all factory/state/*.json files and returns them as an array)
   - Poll every 30 seconds for updates
   - Also accept a static JSON file for development/testing

2. LAYOUT (single screen, no scrolling on desktop):
   - Top bar: "Spark Mojo Factory" title on left, "Action Required: {n}"
     badge on right (yellow pulsing if n > 0)
   - Main area: 7-column Kanban board
   - Bottom bar: "Shipped: {n} capabilities | {total_stories} stories |
     {total_cost} | {total_hours}h factory time"

3. KANBAN COLUMNS:
   - Backlog (gray header)
   - Input Prep (yellow header)
   - Spec Running (blue header)
   - Spec Review (yellow header)
   - Build Running (blue header)
   - Deploy Review (yellow header)
   - Shipped (green header)

4. CAPABILITY CARDS:
   - Rounded rectangle, white background
   - Capability name (bold, 14px)
   - Time in phase: "2h 14m" (gray, 12px)
   - If build_running: progress bar showing stories_complete/stories_total
   - If blocked: red left border, "BLOCKED" badge
   - If clinical_feature: small shield icon in top-right corner
   - If human_action_required: yellow glow/pulse animation
   - Cards are clickable

5. ACTION PANEL (slides in from right when card clicked):
   - Shows context-aware checklist based on current phase
   - Each step has a "copy to clipboard" button for commands
   - Commands use the actual capability name from state
   - For spec_review phase, checklist items:
     a. Read verification report [COPY: cat factory/capabilities/{cap}/spec/VERIFICATION-REPORT.md]
     b. Skim story list [COPY: cat factory/capabilities/{cap}/spec/STORIES.md]
     c. Check open questions [COPY: cat factory/capabilities/{cap}/spec/OPEN-QUESTIONS.md]
     d. Spot-check story specs [COPY: ls factory/capabilities/{cap}/spec/stories/]
     e. Skim KB draft quality [COPY: head -100 factory/capabilities/{cap}/spec/kb-drafts/USER-GUIDE.md]
     f. Verify PROMPT.md size [COPY: wc -w factory/capabilities/{cap}/spec/build-factory/PROMPT.md]
   - For deploy_review phase, checklist items:
     a. Read stories status [COPY: cat factory/capabilities/{cap}/build/STORIES-STATUS.md]
     b. Read deficiencies [COPY: cat factory/capabilities/{cap}/build/kb/DEFICIENCIES.md]
     c. Check for blockers [COPY: ls factory/capabilities/{cap}/BLOCKED-*.md 2>/dev/null]
     d. Browser walkthrough on VPS [LINK: https://poc-dev.sparkmojo.com]
     e. Spot-check user guide [COPY: head -100 factory/capabilities/{cap}/build/kb/USER-GUIDE.md]
   - [APPROVE] button at bottom (green, makes POST to /api/factory/approve)
   - [REQUEST CHANGES] button (orange, opens text input)

6. OVERNIGHT LOG (accessible via clock icon in top bar):
   - Modal overlay
   - Dropdown to select capability
   - Shows events array from state file in reverse chronological order
   - Format: "HH:MM AM/PM - {message}"
   - Group by date if multiple days

7. SHIPPED BOARD (accessible via trophy icon in top bar):
   - Modal overlay
   - Table of all shipped capabilities
   - Columns: #, Name, Date, Stories, Cost, Time
   - Running totals at bottom

8. STYLING:
   - Use CSS variables: --sm-bg: #f8f9fa, --sm-card: #ffffff,
     --sm-yellow: #fbbf24, --sm-blue: #3b82f6, --sm-green: #22c55e,
     --sm-red: #ef4444, --sm-gray: #6b7280
   - No hardcoded hex colors outside the variable definitions
   - Clean, minimal. Geist or Inter font if available, system-ui fallback
   - Dark mode support via prefers-color-scheme media query

9. ANIMATIONS:
   - Yellow pulse on cards requiring action (CSS keyframes, subtle)
   - Blue shimmer on cards in automated phases (CSS keyframes, very subtle)
   - Smooth slide-in for action panel
   - Confetti or checkmark animation when a capability moves to Shipped
     (keep it brief, 2 seconds)

10. RESPONSIVE:
    - Desktop: full 7-column Kanban
    - Mobile (< 768px): single column, stacked phases, only show
      cards requiring action at the top

Do NOT use TypeScript. Do NOT use external component libraries.
Use only React hooks (useState, useEffect, useCallback).
The entire dashboard must be a single .jsx file.
```

---

### Step 4: Simple API Server

The dashboard needs an API to read state and trigger actions. Build a minimal Express server or use n8n webhooks.

**Claude Code prompt for the API:**

```
Build a minimal Express.js server (single file, server.jsx is fine or
server.js) that serves the Factory Command Center dashboard and provides
these API endpoints:

1. GET /api/factory/state
   - Reads all .json files from factory/state/ directory
   - Returns them as a JSON array
   - Sorts by phase (action-required phases first)

2. POST /api/factory/approve
   Body: { "capability": "crm-client-identity", "phase": "spec_review" | "deploy_review" }
   - For spec_review: creates factory/capabilities/{cap}/spec/APPROVED.md
     with reviewer name "James", current timestamp, and "## GO"
   - For deploy_review: updates state to "shipped", appends shipped event
   - Returns updated state

3. POST /api/factory/request-changes
   Body: { "capability": "crm-client-identity", "notes": "..." }
   - Creates factory/capabilities/{cap}/spec/REVISE.md with the notes
   - Updates state phase to "spec_running" (triggers re-run)
   - Returns updated state

4. GET /api/factory/events/{capability}
   - Returns the events array from that capability's state file
   - Supports ?since=ISO_DATE query param to filter

5. GET /
   - Serves the dashboard JSX file (use a simple static file serve
     or inline it)

CONFIGURATION:
- FACTORY_ROOT environment variable points to the factory/ directory
- PORT defaults to 3333
- No authentication needed (local use only)

Keep it minimal. Under 200 lines. No database.
```

---

### Step 5: Wire It All Together

#### 5a: Start the state watcher

Import Workflow 1 (Factory State Watcher) into n8n. Activate it. It will start polling the factory directory every 60 seconds and creating/updating state files.

#### 5b: Configure Telegram

If not already done:

```bash
# Set these in your n8n environment
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

Import Workflows 3, 4, and 5 (Notifier, Morning Digest, Stale Checker). Activate them.

#### 5c: Configure Ralph Runner

Import Workflow 2 (Ralph Runner). Update the working directory paths to match your setup. Activate it.

The State Watcher (Workflow 1) calls the Ralph Runner webhook when a capability transitions to spec_running or build_running.

#### 5d: Start the dashboard

```bash
cd spark-mojo-platform
node factory/command-center/server.js
# Dashboard available at http://localhost:3333
```

#### 5e: Test with a dry run

Create a test capability to verify the full flow:

```bash
# Create a test capability
mkdir -p factory/capabilities/test-capability/input

# Create minimal input files
echo "# Test Synthesis" > factory/capabilities/test-capability/input/SYNTHESIS.md
echo "# Test Technical" > factory/capabilities/test-capability/input/TECHNICAL-RESEARCH.md
echo "# Test Workflow" > factory/capabilities/test-capability/input/WORKFLOW-RESEARCH.md
echo "# Test AI" > factory/capabilities/test-capability/input/AI-ANALYSIS.md
echo "# Test Stories" > factory/capabilities/test-capability/input/USER-STORIES.md

# Create RUN-META.yml
cat > factory/capabilities/test-capability/input/RUN-META.yml << 'EOF'
capability: TEST-CAPABILITY
capability_short: TEST
environment: poc-dev
branch: main
risk_level: preprod
clinical_feature: false
vertical: behavioral_health
lms_stubs: false
EOF

# Watch the dashboard - test-capability should appear in Backlog

# Create READY.md to trigger transition to Input Prep
cat > factory/capabilities/test-capability/input/READY.md << 'EOF'
# Capability Ready for Spec Factory
- Capability: Test Capability
- Date: 2026-04-08
## GO
EOF

# Watch the dashboard - card should move through phases
# (Spec factory will fail on test data, which tests your blocked/error handling)
```

---

### Build Order Summary

| Step | What | Time Estimate | Dependencies |
|------|------|---------------|-------------|
| 1 | State file convention + templates | 15 min (manual) | None |
| 2a | N8n Workflow 1: State Watcher | 1-2 hours (Claude Code) | Step 1 |
| 2b | N8n Workflow 2: Ralph Runner | 1 hour (Claude Code) | Step 1 |
| 2c | N8n Workflow 3: Telegram Notifier | 1 hour (Claude Code) | Telegram bot configured |
| 2d | N8n Workflow 4: Morning Digest | 30 min (Claude Code) | Workflow 3 |
| 2e | N8n Workflow 5: Stale Checker | 30 min (Claude Code) | Workflow 3 |
| 3 | Dashboard UI | 2-3 hours (Claude Code) | Step 1 |
| 4 | API Server | 1 hour (Claude Code) | Steps 1, 3 |
| 5 | Wire and test | 1-2 hours (manual) | All above |
| **Total** | | **8-12 hours** | |

You can build this incrementally. Steps 1 + 2a + 2c give you the state tracking and Telegram notifications without any dashboard. That alone is high value. Add the dashboard later when you want the visual layer.

---

### File Locations

After building, your factory directory gains:

```
factory/
├── state/                          # NEW: State files
│   ├── crm-client-identity.json
│   └── ...
├── command-center/                 # NEW: Dashboard app
│   ├── dashboard.jsx               # The single-file React dashboard
│   ├── server.js                   # Minimal Express API
│   └── package.json                # Express dependency only
├── templates/
│   ├── STATE-TEMPLATE.json         # NEW: State file template
│   └── ... (existing templates)
└── ... (existing factory structure)
```

---

### Future Enhancements (Not in V1)

- **Voice command integration:** "Hey Siri, what's the factory status?" via Shortcuts + API
- **Cost tracking integration:** Read Ralph diagnostics for actual token usage and compute real costs per capability
- **Velocity chart:** Graph showing capabilities shipped per week over time
- **Dependency visualization:** If two capabilities have dependencies, show them on the Kanban
- **Auto-prioritization:** Suggest which capability to prep next based on platform roadmap and dependency graph
- **iPad companion:** Optimized tablet view for reviewing specs on the couch

---

*Path audit complete Session 41 - no stale references found. All factory/ paths use the correct prefix for spark-mojo-platform/factory/ structure. No references to the archived spark-mojo-factory standalone repo were found in this document.*
