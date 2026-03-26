# PLAN — STORY-006: Tasks abstraction layer — list and get endpoints

## Story Info
- **Story ID:** STORY-006
- **Title:** Tasks abstraction layer — list and get endpoints
- **Type:** Python FastAPI
- **Size:** M
- **Depends on:** STORY-003 (✅ COMPLETE), STORY-004 (✅ COMPLETE)

## Branch
`story/STORY-006-tasks-api-list-get`

## Files to Create

### 1. `abstraction-layer/modules/__init__.py`
- Empty file — new package

### 2. `abstraction-layer/modules/tasks/__init__.py`
- Empty file — tasks subpackage

### 3. `abstraction-layer/modules/tasks/routes.py`
- `APIRouter(prefix="/api/modules/tasks", tags=["tasks"])`
- Uses same pattern as `routes/onboarding.py`: httpx → Frappe REST API, `get_current_user` dependency

**Endpoint 1: GET `/api/modules/tasks/list`**
- Query params: `view` (mine|role|all, default mine), `canonical_state`, `priority`, `sort_by` (due_at|priority|created_at|canonical_state, default due_at), `sort_order` (asc|desc, default asc for due_at), `include_resolved` (default false)
- Logic:
  - `mine`: SM Tasks where assigned_user = current_user.email
  - `role`: SM Tasks where assigned_role in current_user.roles AND assigned_user is empty
  - `all`: union of mine + role
  - Exclude canonical_state in (Completed, Canceled, Failed) unless include_resolved=true
  - Sort by sort_by field, nulls last for due_at
- Response: `{"tasks": [...], "total": N}`
- Each task in list: name, title, task_type, canonical_state, priority, assigned_user, assigned_role, due_at, is_unowned, source_system, related_crm_record
- `is_unowned` = true when assigned_role set and assigned_user empty

**Endpoint 2: GET `/api/modules/tasks/get`**
- Query param: `task_id` (required)
- Returns full SM Task record with all child tables (watchers, tags, comments, state_history, assignment_history)
- Response: `{"task": {...}}`
- 404 with `{"error": "task_not_found"}` if not found
- 403 if unauthorized

## Files to Modify

### 4. `abstraction-layer/main.py`
- Import: `from modules.tasks.routes import router as tasks_router`
- Register: `app.include_router(tasks_router)` (before generic catch-all)

## Files to Create (Tests)

### 5. `abstraction-layer/tests/test_tasks.py`
- Test list endpoint returns 200 with tasks array
- Test list with view=mine, view=role, view=all
- Test list excludes resolved tasks by default
- Test get endpoint returns 200 with task object
- Test get with invalid task_id returns 404
- Mock Frappe API calls via httpx respx or monkeypatch

## Quality Gates
1. `pytest tests/ -v` — 0 failures
2. `pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70` — coverage >= 70%
3. Health endpoint responds (existing test)

## Notes
- Story spec uses `modules/tasks/` path (not `routes/`). This creates a new `modules/` directory — different from the `routes/onboarding.py` pattern in CLAUDE.md. Following story spec as authoritative per working agreement.
- DEV_MODE user has roles `["Front Desk", "System Manager"]` — tests can use these for role-based filtering.
- `pytest-anyio` is used for async tests (per existing test_health.py pattern).
