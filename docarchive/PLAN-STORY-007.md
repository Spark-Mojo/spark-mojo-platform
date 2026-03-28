# PLAN — STORY-007: Tasks abstraction layer — write endpoints

## Story
- **ID:** STORY-007
- **Title:** Tasks abstraction layer — write endpoints (create, claim, assign, update_state, add_comment, complete)
- **Type:** Python API
- **Depends on:** STORY-006 (✅ STORY-006-COMPLETE exists)
- **Branch:** `story/STORY-007-tasks-api-write`

## Files to Modify

### 1. `abstraction-layer/modules/tasks/routes.py` — ADD 6 POST endpoints

Existing file has GET list + GET get. Add:

**POST `/api/modules/tasks/create`**
- Body: `{ title, task_type, description?, priority?, assigned_user?, assigned_role?, due_at?, source_system?, related_crm_record?, parent_task?, completion_criteria?, executor_type }`
- Logic: POST to `frappe.client.api.insert` (or `/api/resource/SM Task`) with body fields + `created_by_user = user.email`. Return `{ task: <created task> }`.

**POST `/api/modules/tasks/claim`**
- Body: `{ task_id }`
- Logic: GET task → verify assigned_user is empty and assigned_role in user's roles → PUT with `assigned_user = user.email`, `canonical_state = "In Progress"` if New/Ready. Return updated task.
- Error: 409 `{ "error": "task_already_owned" }` if assigned_user already set.

**POST `/api/modules/tasks/assign`**
- Body: `{ task_id, assigned_user?, assigned_role?, assigned_team? }`
- Logic: GET task → PUT with ownership fields. Controller handles assignment history. Return updated task.

**POST `/api/modules/tasks/update_state`**
- Body: `{ task_id, canonical_state, status_reason? }`
- Logic: GET task → PUT with canonical_state + status_reason. Controller handles state history + lifecycle timestamps.
- Error: Pass through Frappe 400/417 (ValidationError for Blocked/Failed without reason) as 400.

**POST `/api/modules/tasks/add_comment`**
- Body: `{ task_id, comment }`
- Logic: GET task → append row to comments child table → PUT. Return `{ comments: [...] }`.

**POST `/api/modules/tasks/complete`**
- Body: `{ task_id, completion_note? }`
- Logic: GET task → set `canonical_state = "Completed"`. If completion_note, append to comments. PUT. Return updated task.

**Implementation pattern:** All write endpoints use httpx to Frappe REST API:
- GET `/api/resource/SM Task/{task_id}` to load current state
- PUT `/api/resource/SM Task/{task_id}` with modified fields to save
- POST `/api/resource/SM Task` for create
- Follow existing `_headers()` and `FRAPPE_URL` pattern from STORY-006 code

### 2. `abstraction-layer/tests/test_tasks.py` — ADD write endpoint tests

Add tests for all 6 endpoints + error cases:
1. `test_tasks_create_returns_created_task` — POST create, verify 200 with task
2. `test_tasks_claim_assigns_current_user` — POST claim on unowned task, verify assigned_user set
3. `test_tasks_claim_returns_409_if_already_owned` — POST claim on owned task, verify 409
4. `test_tasks_assign_updates_ownership` — POST assign, verify fields updated
5. `test_tasks_update_state_transitions` — POST update_state, verify canonical_state changed
6. `test_tasks_update_state_blocked_without_reason_returns_400` — POST update_state to Blocked without reason, verify 400
7. `test_tasks_add_comment_appends_comment` — POST add_comment, verify comments array
8. `test_tasks_complete_sets_completed_state` — POST complete, verify canonical_state = Completed

Mock pattern: patch `modules.tasks.routes.httpx.AsyncClient` as in existing tests, but mock both GET and PUT/POST methods on the client.

## Files NOT Modified
- `main.py` — tasks_router already registered from STORY-006
- No new files needed — all additions go into existing routes.py and test_tasks.py

## Quality Gates
1. `pytest tests/ -v` — 0 failures
2. `pytest tests/ --cov=modules --cov-report=term-missing --cov-fail-under=70` — coverage >= 70%
3. Health endpoint responds at `/health`

## Ambiguity Check
- **None.** Story spec is fully specified. All endpoints, bodies, error codes, and behaviors are defined.
- Frappe REST API pattern for save: PUT `/api/resource/SM Task/{name}` with JSON body — consistent with Frappe REST conventions.
- Frappe REST API pattern for create: POST `/api/resource/SM Task` with JSON body.
