# Spark Mojo Platform — Overnight Task Queue
# Session 5 — Task & Workboard Management
# Date: March 25, 2026

## How to Use This File

Work the stories in priority order. Each story has its own branch.
For each story:
1. Create branch: `git checkout -b story/STORY-NNN-short-description`
2. Read the full story file from `../sparkmojo-internal/platform/feature-library/stories/STORY-NNN.md`
3. Read `CLAUDE.md` for project conventions
4. Build exactly what the story specifies — nothing more, nothing less
5. Run all quality gates for that story type (see CLAUDE.md Definition of Done)
6. If a story is ambiguous on any structural decision, write `BLOCKED-STORY-NNN.md` at repo root and move to next story
7. Commit and move to next story

## Story Queue (work in this order — dependencies respected)

### Priority 1 — DocType Foundation (sequential, each depends on previous)

**STORY-003** — `story/STORY-003-sm-task-doctype-core`
Create SM Task DocType with core fields and lifecycle hooks.
Type: Frappe DocType | App: sm_widgets | Size: M
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-003.md`

**STORY-004** — `story/STORY-004-sm-task-child-tables`
Add child tables to SM Task (state history, assignment history, comments, watchers, tags).
Type: Frappe DocType | App: sm_widgets | Size: M
Depends on: STORY-003 merged
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-004.md`

**STORY-005** — `story/STORY-005-sm-task-extended-fields`
Add extended fields to SM Task (SLA, source system, recurrence, execution logic).
Type: Frappe DocType | App: sm_widgets | Size: S
Depends on: STORY-003 merged
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-005.md`

### Priority 2 — Abstraction Layer API (sequential)

**STORY-006** — `story/STORY-006-tasks-api-list-get`
Create tasks capability router with list and get endpoints.
Type: Python FastAPI | File: abstraction-layer/routes/tasks.py | Size: M
Depends on: STORY-003 merged (DocType must exist for integration tests)
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-006.md`

**STORY-007** — `story/STORY-007-tasks-api-write`
Add write endpoints to tasks router (create, claim, assign, update_state, add_comment, complete).
Type: Python FastAPI | Size: M
Depends on: STORY-006 merged
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-007.md`

### Priority 3 — React Frontend (sequential)

**STORY-008a** — `story/STORY-008a-workboard-list-view`
WorkboardMojo React component — task list view, personal + role queue, due date sort.
Type: React JSX | File: frontend/src/components/mojos/WorkboardMojo.jsx | Size: M
Depends on: STORY-006 merged (API must exist)
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-008a.md`

**STORY-008b** — `story/STORY-008b-workboard-claim-sort`
WorkboardMojo — claim action with pulse indicator, sort controls, localStorage persistence.
Type: React JSX | Size: M
Depends on: STORY-008a merged
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-008b.md`

**STORY-009** — `story/STORY-009-task-detail-drawer`
Task detail drawer — slide-in panel, full context, state change, comments, complete action.
Type: React JSX | Size: M
Depends on: STORY-008a + STORY-007 merged
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-009.md`

**STORY-010** — `story/STORY-010-workboard-kanban`
WorkboardMojo kanban view toggle — canonical state columns, card click opens drawer.
Type: React JSX | Size: M
Depends on: STORY-008b + STORY-009 merged
Full spec: `../sparkmojo-internal/platform/feature-library/stories/STORY-010.md`

## If You Finish All Stories

Do not start new work. Write `QUEUE-COMPLETE.md` at repo root with:
- List of completed stories and their branch names
- Any blocked stories and their BLOCKED-NNN.md file contents summarised
- Any observations about the codebase that James should review

## Critical Reminders

- NEVER install a Frappe app via bench without explicit story instruction (see CLAUDE.md warning)
- NEVER call Frappe directly from React — always through abstraction layer
- NEVER use frappe.db.set_value() — always frappe.get_doc().save()
- NEVER modify Desktop.jsx structure
- NEVER create .tsx or .ts files — this is a JSX codebase
- If ambiguous on any architectural decision — BLOCKED file, not improvisation
