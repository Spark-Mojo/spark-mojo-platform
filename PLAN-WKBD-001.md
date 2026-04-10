# PLAN-WKBD-001: Add task_mode Field to SM Task

## Story
- **ID:** WKBD-001
- **Branch:** `story/wkbd-001-task-mode`
- **Type:** DocType field addition + Python API
- **Retry count:** 0 (first attempt)
- **Dependencies:** None

## Current State (Partial Work Already on Branch)

The following changes are already staged/unstaged on the branch:

### Already Done
1. **SM Task DocType JSON** (`frappe-apps/sm_widgets/sm_widgets/sm_widgets/doctype/sm_task/sm_task.json`):
   - `task_mode` Select field added (active/watching/snoozed, default: active, required, in_list_view, in_standard_filter)
   - `snooze_until` Datetime field added
   - `section_mode` Section Break added

2. **SM Task Controller** (`frappe-apps/sm_widgets/sm_widgets/sm_widgets/doctype/sm_task/sm_task.py`):
   - `validate_snooze_until()` method added — throws ValidationError if task_mode=snoozed and snooze_until is empty

3. **Abstraction Layer Routes** (`abstraction-layer/modules/tasks/routes.py`):
   - `UpdateModeBody` Pydantic model defined (task_id, task_mode, snooze_until, assigned_user, assigned_role)
   - `VALID_TASK_MODES = ("active", "watching", "snoozed")` constant added
   - `task_mode` query parameter added to `GET /list` endpoint
   - `task_mode` added to `LIST_FIELDS`
   - `_build_filters()` accepts and applies `task_mode` filter

### NOT Yet Done
1. **`POST /api/modules/tasks/update_mode` endpoint handler** — The `UpdateModeBody` model exists but no `@router.post("/update_mode")` handler function. This is the main remaining implementation work.

2. **Tests for WKBD-001** — No tests exist for:
   - `update_mode` endpoint (happy path, 404, 422 invalid mode, 422 snoozed without snooze_until, 422 past snooze_until)
   - `task_mode` filter on `/list` endpoint

## Files to Create/Modify

| File | Action | What |
|------|--------|------|
| `abstraction-layer/modules/tasks/routes.py` | **Modify** | Add `@router.post("/update_mode")` handler |
| `abstraction-layer/tests/test_tasks.py` | **Modify** | Add WKBD-001 tests (update_mode + task_mode filter) |

## Endpoint: POST /api/modules/tasks/update_mode

**Request body** (already defined as `UpdateModeBody`):
```json
{
  "task_id": "TASK-00001",
  "task_mode": "active | watching | snoozed",
  "snooze_until": "2026-01-01T09:00:00",
  "assigned_user": "optional",
  "assigned_role": "optional"
}
```

**Logic:**
1. Validate `task_mode` is in `VALID_TASK_MODES` → 422 if not
2. If `task_mode = snoozed`: require `snooze_until` present and in the future → 422 if not
3. GET task from Frappe → 404 if not found
4. Build update payload: `task_mode`, `snooze_until` (if snoozed)
5. If transitioning TO `active`: include `assigned_user`/`assigned_role` if provided
6. PUT to Frappe → return updated task

**Error cases:**
- Task not found: 404
- Invalid task_mode: 422
- Snoozed without snooze_until: 422
- Snoozed with past snooze_until: 422

## Tests to Add

1. `test_update_mode_to_watching` — happy path, mode changes
2. `test_update_mode_to_snoozed_with_future_date` — happy path
3. `test_update_mode_invalid_mode_returns_422` — bad mode value
4. `test_update_mode_snoozed_without_date_returns_422` — missing snooze_until
5. `test_update_mode_snoozed_past_date_returns_422` — past snooze_until
6. `test_update_mode_not_found_returns_404` — missing task
7. `test_tasks_list_filter_by_task_mode` — task_mode filter on /list

## Quality Gates

**Type:** Python API

1. `pytest tests/ -v` — 0 failures
2. `pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70` — coverage ≥ 70%
3. Health endpoint responds

## Commit Message

`feat(workboard): add task_mode field to SM Task with watching/active/snoozed support`
