# PLAN — STORY-008b: WorkboardMojo claim action and sort controls

## Story Info
- **ID:** STORY-008b
- **Title:** WorkboardMojo — claim action and sort controls
- **Type:** React Frontend
- **Depends on:** STORY-008a — ✅ STORY-008a-COMPLETE exists
- **Branch:** `story/STORY-008b-workboard-claim-sort`

## Files to Modify

### 1. `frontend/src/components/mojos/WorkboardMojo.jsx` (modify)

**Claim action — additions:**
- Add `claimTask(taskId)` async function: `POST /api/modules/tasks/claim` with `{ task_id }`
- Add `claimingId` state to track in-flight claim
- On TaskRow where `is_unowned = true`: render "Claim" button at right edge
- Button disabled + spinner while `claimingId === task.name`
- On success: update `tasks` state — set `assigned_user = current_user`, `is_unowned = false`
- On 409: show inline toast "This task was already claimed", re-fetch task list
- On other error: show inline toast "Could not claim task — please try again"

**Sort controls — additions:**
- Add sort toolbar between header and task list
- Sort options: `Due Date` (default) | `Priority` | `Created Date` | `Status`
- Each option is a clickable chip — active highlighted in teal (`var(--color-primary)`)
- Sort direction toggle: asc/desc arrow button next to active chip
- All sorting is client-side (no re-fetch)
- Replace hardcoded `sortByDueDate` with generic sort function supporting all four fields
- Persist sort preference (field + direction) in `localStorage` key `workboard_sort_preference`
- On mount: restore sort from localStorage, default to due_date asc

**Toast — inline implementation:**
- Simple toast state: `{ message, visible }` with auto-dismiss after 3s
- Positioned at bottom of the Mojo, not a global toast system
- Minimal — no external toast library needed

**Field mapping for sort:**
| Sort option | Field | Nulls |
|-------------|-------|-------|
| Due Date | `due_at` | last |
| Priority | `priority` | last (order: Urgent > High > Medium > Low) |
| Created Date | `created_at` | last |
| Status | `canonical_state` | last |

### 2. `frontend/src/components/mojos/__tests__/WorkboardMojo.test.jsx` (modify)

**New tests to add (in addition to existing 8):**
- Claim button renders only on unowned rows
- Clicking Claim calls POST /api/modules/tasks/claim with correct task_id
- Claim success updates row: removes pulse, removes Claim button, shows assigned_user
- Claim 409 shows "already claimed" toast
- Claim error shows generic error toast
- Sort chips render above task list
- Clicking sort chip re-sorts list
- Sort preference persists to localStorage
- Sort preference restores from localStorage on mount

## Quality Gates (React Frontend)
1. `pnpm run lint` — 0 warnings, 0 errors
2. `pnpm run test` — 0 failures
3. `pnpm run build` — succeeds

## Key Decisions
- JSX not TSX (CLAUDE.md rule)
- Plain fetch to abstraction layer (established pattern, DECISION-003)
- Inline toast within Mojo — no global toast system needed for this story
- Note: story spec references `.tsx` file — using `.jsx` per CLAUDE.md authority
- Note: story spec says "Zero TypeScript errors" — interpreted as "Zero lint errors" since we use JSX
