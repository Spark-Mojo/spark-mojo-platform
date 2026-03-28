# PLAN — STORY-008a: WorkboardMojo — task list view

**Story type:** React Frontend
**Branch:** `story/STORY-008a-workboard-list-view`
**Dependencies:** STORY-006 ✅, STORY-007 ✅

---

## Key Decisions

1. **File extension:** Story spec says `.tsx` but CLAUDE.md forbids TypeScript. Use `.jsx`.
2. **Data fetching:** Story spec says `useFrappeGetCall` but the established pattern (OnboardingMojo) uses plain `fetch` to abstraction layer. Follow established pattern — plain fetch to `/api/modules/tasks/list?view=all` via abstraction layer. This aligns with DECISION-003 (React never calls Frappe directly).
3. **Mojo registration:** Desktop.jsx has `MOJO_COMPONENT_MAP` — add WorkboardMojo entry. Import from `@/components/mojos/WorkboardMojo`. Note: CLAUDE.md says "DO NOT MODIFY Desktop.jsx structure" — adding an import and map entry is not a structural change, it's the documented registration mechanism.
4. **OnboardingMojo lives in `pages/`** (legacy location). New Mojo goes in `components/mojos/` per CLAUDE.md.

---

## Files to Create

### 1. `frontend/src/components/mojos/WorkboardMojo.jsx`
- Default export: `export default function WorkboardMojo()`
- **Data fetching:** On mount, fetch `GET /api/modules/tasks/list?view=all` via abstraction layer base URL
- **Loading state:** Skeleton loader while fetching
- **Error state:** Error message if fetch fails
- **Empty state:** Centered text "No tasks on your plate. You're all caught up."
- **List rendering:** One row per task, sorted client-side by `due_at` ascending (nulls last)
- Each row shows:
  - Title (truncated at 60 chars with ellipsis)
  - Task type badge (Action: teal, Review: gold, Approval: coral, others: slate)
  - Canonical state badge
  - Priority indicator (colored dot — Urgent: red, High: coral, Medium: gold, Low: slate)
  - Due date (relative: "Today", "Tomorrow", "3 days", "Overdue" in red)
  - Assigned user avatar or role name
  - `is_unowned` indicator: pulsing ring animation (CSS `animate-pulse` or custom keyframe `pulse 2s infinite`)
- Clicking a row: no-op (STORY-009 adds drawer)
- Brand tokens via CSS variables — never hardcode hex

### 2. `frontend/src/components/mojos/__tests__/WorkboardMojo.test.jsx`
- Test: renders loading skeleton initially
- Test: renders task list after successful fetch
- Test: renders empty state when no tasks
- Test: renders error state on fetch failure
- Test: truncates long titles at 60 chars
- Test: sorts tasks by due_at ascending, nulls last
- Test: shows "Overdue" in red for past due dates
- Test: shows pulsing indicator for unowned tasks

## Files to Modify

### 3. `frontend/src/pages/Desktop.jsx` (minimal addition only)
- Add import: `import WorkboardMojo from '@/components/mojos/WorkboardMojo';`
- Add to `MOJO_COMPONENT_MAP`: `WorkboardMojo,`
- Add to `ICON_MAP`: `CheckSquare` (already imported)
- Add to `FALLBACK_MOJOS`: WorkboardMojo entry with id 'workboard', title 'Workboard', icon CheckSquare

---

## Quality Gates (React Frontend)

1. `pnpm run lint` — 0 warnings, 0 errors
2. `pnpm run test` — 0 failures
3. `pnpm run build` — succeeds

---

## Not in Scope
- Claim action (STORY-008b)
- Sort controls (STORY-008b)
- Task detail drawer (STORY-009)
- Kanban view (STORY-010)
- Filter controls
