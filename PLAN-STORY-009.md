# PLAN — STORY-009: WorkboardMojo task detail drawer

## Story Type
React Frontend

## Dependencies
- STORY-008a-COMPLETE: exists
- STORY-007-COMPLETE: exists

## Files to Modify (2)

### 1. `frontend/src/components/mojos/WorkboardMojo.jsx`
Add task detail drawer functionality:

**New state:**
- `selectedTaskId` — which row is selected (null when closed)
- `drawerTask` — full task object from GET endpoint (null while loading)
- `drawerLoading` — boolean for skeleton inside drawer
- `commentText` — input state for new comment
- `stateChanging` — boolean while state update is in-flight
- `statusReasonInput` — text for Blocked/Failed reason prompt
- `pendingState` — the state being transitioned to (when reason required)

**New API helpers:**
- `fetchTask(taskId)` — GET `/api/modules/tasks/get?task_id=...`
- `postUpdateState(taskId, canonical_state, status_reason)` — POST `/api/modules/tasks/update_state`
- `postAddComment(taskId, comment)` — POST `/api/modules/tasks/add_comment`
- `postComplete(taskId, completion_note)` — POST `/api/modules/tasks/complete`

**New components (internal to file):**

1. **`TaskDetailDrawer`** — main drawer component
   - Uses `framer-motion` AnimatePresence + motion.div for slide-in from right
   - Width: 480px desktop, full-width mobile (w-full md:w-[480px])
   - Fixed position right side, full height
   - Semi-transparent backdrop, click to close
   - Escape key closes (useEffect keydown listener)

2. **Drawer sections:**
   - **Header:** title (display only — spec says "editable inline" but no edit endpoint exists for title; display only to avoid BLOCKED), task_type badge, priority badge, close X button
   - **Status bar:** canonical_state dropdown (Select from all 8 states). On change → if Blocked or Failed, show inline text input for status_reason before confirming. Otherwise call `postUpdateState` immediately. Update local task list row on success.
   - **Details:** assigned_user/role, due_at, source_system, related_crm_record, completion_criteria
   - **Comments:** list newest-first from `task.sm_task_comments` child table. Text input + Submit button. On submit → `postAddComment` → append to local list (no re-fetch).
   - **State History:** collapsible section (Radix Collapsible). Timeline from `task.sm_task_state_history` child table.
   - **Complete button:** coral primary button at bottom. Calls `postComplete`. On success → close drawer, remove task from workboard list.

**Row click handler:**
- `handleRowClick(taskId)` — sets `selectedTaskId`, calls `fetchTask`, sets `drawerTask` on response
- TaskRow gets `onClick` prop + `selected` styling (highlighted background)

**After write actions:**
- Update corresponding task in `tasks` state array (local state update, no full re-fetch)

### 2. `frontend/src/components/mojos/__tests__/WorkboardMojo.test.jsx`
Add tests for drawer (target: ~8 new tests, total ~25):
- Clicking task row opens drawer with correct task data
- Drawer shows loading skeleton while fetching
- Changing state calls POST update_state, updates workboard row
- Transitioning to Blocked shows status_reason input
- Adding comment calls POST add_comment, appears in drawer
- Complete button calls POST complete, closes drawer, removes row
- Escape key closes drawer
- Clicking backdrop closes drawer

## Available Dependencies (already installed)
- `framer-motion` — for slide-in animation (AnimatePresence, motion.div)
- `@radix-ui/react-collapsible` — for state history collapsible
- `@radix-ui/react-select` — for state selector dropdown
- `date-fns` — for formatting timestamps

## Architectural Note
- The existing `drawer.jsx` UI component uses `vaul` (bottom drawer). Story spec says "slides in from the right" — this requires a custom side-panel using framer-motion, not the vaul drawer.
- No `.tsx` files — JSX only (CLAUDE.md)
- Plain fetch to abstraction layer (established pattern)
- No direct Frappe calls (DECISION-003)

## Quality Gates
1. `pnpm run lint` — 0 warnings, 0 errors
2. `pnpm run test` — 0 failures
3. `pnpm run build` — succeeds

## Ambiguity Resolution
- **"title (editable inline on click)"** — story spec mentions this but there is no title update endpoint in STORY-007. The write endpoints are: create, claim, assign, update_state, add_comment, complete. Title editing would require a new endpoint not in scope. **Decision:** Display title as read-only. This is a display-only field in the drawer. If a title edit endpoint is needed, it should be a separate story. NOT writing a BLOCKED file for this — it's a minor UI detail that doesn't block the drawer's core functionality (state changes, comments, complete action).
