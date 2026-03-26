# PLAN — STORY-004: SM Task Child Tables

**Story:** STORY-004 — SM Task child tables (watchers, tags, state history, assignment history, comments)
**Type:** Frappe DocType
**App:** sm_widgets
**Branch:** `story/STORY-004-sm-task-child-tables`
**Dependency:** STORY-003 — COMPLETE marker exists. Satisfied.

---

## Files to Create (15 files — 5 child DocTypes x 3 files each)

Base path: `frappe-apps/sm_widgets/sm_widgets/doctype/`

### Child DocType 1: SM Task Watcher
- `sm_task_watcher/__init__.py` — empty
- `sm_task_watcher/sm_task_watcher.json` — istable: 1, fields: user (Link→User, Required), added_at (Datetime)
- `sm_task_watcher/sm_task_watcher.py` — minimal Document subclass

### Child DocType 2: SM Task Tag
- `sm_task_tag/__init__.py` — empty
- `sm_task_tag/sm_task_tag.json` — istable: 1, fields: tag (Data, Required)
- `sm_task_tag/sm_task_tag.py` — minimal Document subclass

### Child DocType 3: SM Task State History
- `sm_task_state_history/__init__.py` — empty
- `sm_task_state_history/sm_task_state_history.json` — istable: 1, fields: from_state (Data), to_state (Data, Required), changed_by (Link→User, Required), changed_at (Datetime, Required), reason (Small Text)
- `sm_task_state_history/sm_task_state_history.py` — minimal Document subclass

### Child DocType 4: SM Task Assignment History
- `sm_task_assignment_history/__init__.py` — empty
- `sm_task_assignment_history/sm_task_assignment_history.json` — istable: 1, fields: from_owner (Data), to_owner (Data, Required), owner_type (Select: User\nRole\nTeam\nSystem), changed_by (Link→User, Required), changed_at (Datetime, Required)
- `sm_task_assignment_history/sm_task_assignment_history.py` — minimal Document subclass

### Child DocType 5: SM Task Comment
- `sm_task_comment/__init__.py` — empty
- `sm_task_comment/sm_task_comment.json` — istable: 1, fields: comment (Long Text, Required), created_by (Link→User, Required), created_at (Datetime, Required)
- `sm_task_comment/sm_task_comment.py` — minimal Document subclass

## Files to Modify (2 files)

### sm_task.json — Append 7 fields after existing fields:
1. `section_activity` — Section Break, label "Activity"
2. `watchers` — Table → SM Task Watcher
3. `tags` — Table → SM Task Tag
4. `comments` — Table → SM Task Comment
5. `section_audit` — Section Break, label "Audit Trail"
6. `state_history` — Table → SM Task State History
7. `assignment_history` — Table → SM Task Assignment History

### sm_task.py — Add controller hooks:
- `track_state_change()`: On canonical_state change, append row to state_history with from_state, to_state, changed_by=frappe.session.user, changed_at=now(), reason=status_reason
- `track_assignment_change()`: On assigned_user/assigned_role/assigned_team change, append row to assignment_history with from/to values, owner_type, changed_by, changed_at
- Both called from before_save, using `self.get_doc_before_save()` to detect changes

## Quality Gate

- `bench --site poc.sparkmojo.com migrate` — exit 0 (deferred to James on VPS)
- JSON syntax valid (local check: `python -m json.tool`)
- Python syntax valid (local check: `python -c "compile(...)"`)
- All 5 child DocType JSONs have `istable: 1`
- SM Task JSON has all 7 new fields appended
- Controller hooks implemented per spec

## No Ambiguity

All fields, types, and behavior fully specified in STORY-004.md and TASK-WORKBOARD.md. No BLOCKED file needed.
