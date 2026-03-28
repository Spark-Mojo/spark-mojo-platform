# PLAN — STORY-010: WorkboardMojo kanban view toggle

## Story
- **ID:** STORY-010
- **Title:** WorkboardMojo kanban view toggle
- **Type:** React Frontend
- **Depends on:** STORY-008b ✅, STORY-009 ✅

## Dependency Check
- STORY-008b-COMPLETE: exists ✅
- STORY-009-COMPLETE: exists ✅

## What to Build

### View Toggle
- Add List | Kanban toggle buttons to the workboard toolbar (right side, next to sort controls)
- Default: List view
- Persist preference in `localStorage` key `workboard_view_preference`

### Kanban View
- Columns: New | Ready | In Progress | Waiting | Blocked (5 active columns — omit Completed, Cancelled, Failed)
- Each column shows tasks matching that canonical_state from the current list response
- Task cards: title, priority dot, due date, assigned user/role, is_unowned pulse if applicable
- Clicking a card opens the same detail drawer as the list view (STORY-009)
- Column headers show task count badge
- Empty columns are shown (do not hide)
- No drag-and-drop — state changes happen via the drawer only

### NOT in scope
- Drag and drop between columns
- Swimlanes
- Collapsed columns

## Files to Modify

1. **`/Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/components/mojos/WorkboardMojo.jsx`**
   - Add `VIEW_STORAGE_KEY = 'workboard_view_preference'`
   - Add `KANBAN_COLUMNS = ['New', 'Ready', 'In Progress', 'Waiting', 'Blocked']`
   - Add `viewMode` state (list/kanban), initialized from localStorage, persisted on change
   - Add `ViewToggle` component: two buttons (List icon, Kanban icon), placed right of sort controls
   - Add `KanbanBoard` component: renders 5 columns
   - Add `KanbanColumn` component: header with name + count badge, vertical list of cards
   - Add `KanbanCard` component: title, priority dot, due date, assigned user/role, is_unowned pulse
   - KanbanCard onClick → same selectedTaskId / drawer flow as list rows
   - Sort controls only visible in list view (kanban uses column grouping)
   - Existing list view wrapped in conditional render

2. **`/Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/components/mojos/WorkboardMojo.test.jsx`**
   - Test: view toggle renders with List and Kanban buttons
   - Test: default view is list
   - Test: clicking Kanban toggle shows kanban columns
   - Test: kanban columns show correct task counts
   - Test: tasks appear in correct columns by canonical_state
   - Test: clicking kanban card opens detail drawer
   - Test: empty columns render with zero count
   - Test: view preference persists to localStorage
   - Test: view preference restores from localStorage

## Quality Gates (React Frontend)
1. `pnpm run lint` — 0 warnings, 0 errors
2. `pnpm run test` — 0 failures
3. `pnpm run build` — succeeds

## Key Decisions
- Story spec says `.tsx` but CLAUDE.md forbids TypeScript — using `.jsx` (CLAUDE.md is authoritative)
- Sort controls hide in kanban view (kanban groups by state, sort within columns uses current sort preference)
- No new files needed — all additions to existing WorkboardMojo.jsx + test file
- No new API calls needed — kanban uses same task list response, just groups by canonical_state
