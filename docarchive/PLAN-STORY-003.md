# PLAN — STORY-003: SM Task DocType — Core Fields

**Story:** STORY-003
**Type:** Frappe DocType
**App:** sm_widgets
**Branch:** `story/STORY-003-sm-task-doctype-core`
**Depends on:** None
**Prior block resolved:** BLOCKED-STORY-003.md is stale — all governance files now exist. Delete it during build.

---

## Summary

Create the `SM Task` custom DocType in the `sm_widgets` Frappe app with core identity, ownership, state/lifecycle, and date fields. Add server-side controller hooks for state-driven timestamp auto-population and validation.

---

## Files to Create

### 1. DocType JSON definition
**Path:** `frappe-apps/sm_widgets/sm_widgets/doctype/sm_task/sm_task.json`

Standard Frappe DocType JSON with:
- `module`: `SM Widgets`
- `is_submittable`: 0
- `track_changes`: 1
- `autoname`: `TASK-.#####`

**Fields (exact order from story spec):**

| # | Fieldname | Label | Fieldtype | Required | Options / Default |
|---|-----------|-------|-----------|----------|-------------------|
| 1 | `title` | Title | Data | Yes | max_length: 200 |
| 2 | `task_type` | Task Type | Select | Yes | `Action\nReview\nApproval\nInput\nException\nMonitoring\nSystem` |
| 3 | `description` | Description | Long Text | No | |
| 4 | `section_ownership` | Ownership | Section Break | — | |
| 5 | `assigned_user` | Assigned User | Link | No | Options: `User` |
| 6 | `assigned_role` | Assigned Role | Link | No | Options: `Role` |
| 7 | `assigned_team` | Assigned Team | Link | No | Options: `Team` |
| 8 | `executor_type` | Executor Type | Select | Yes | `Human\nSystem\nHybrid` |
| 9 | `created_by_user` | Created By | Link | Yes | Options: `User`. Read only. Default: `__user` (session user) |
| 10 | `section_state` | State & Lifecycle | Section Break | — | |
| 11 | `canonical_state` | Status | Select | Yes | `New\nReady\nIn Progress\nWaiting\nBlocked\nCompleted\nCanceled\nFailed`. Default: `New` |
| 12 | `source_state` | Source State | Data | No | |
| 13 | `status_reason` | Status Reason | Small Text | No | |
| 14 | `priority` | Priority | Select | Yes | `Low\nMedium\nHigh\nUrgent`. Default: `Medium` |
| 15 | `section_dates` | Dates | Section Break | — | |
| 16 | `due_at` | Due Date | Datetime | No | |
| 17 | `started_at` | Started At | Datetime | No | Read only |
| 18 | `completed_at` | Completed At | Datetime | No | Read only |
| 19 | `canceled_at` | Canceled At | Datetime | No | Read only |

### 2. Controller (Python)
**Path:** `frappe-apps/sm_widgets/sm_widgets/doctype/sm_task/sm_task.py`

```python
import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class SMTask(Document):
    def before_save(self):
        self.validate_status_reason()
        self.set_lifecycle_timestamps()

    def validate_status_reason(self):
        if self.canonical_state in ("Blocked", "Failed") and not self.status_reason:
            frappe.throw(
                "Status Reason is required when Status is Blocked or Failed",
                frappe.ValidationError
            )

    def set_lifecycle_timestamps(self):
        if self.canonical_state == "In Progress" and not self.started_at:
            self.started_at = now_datetime()
        if self.canonical_state in ("Completed", "Failed") and not self.completed_at:
            self.completed_at = now_datetime()
        if self.canonical_state == "Canceled" and not self.canceled_at:
            self.canceled_at = now_datetime()
```

### 3. Module __init__ files (scaffolding)

These empty `__init__.py` files are needed for Python module resolution:

- `frappe-apps/sm_widgets/sm_widgets/__init__.py`
- `frappe-apps/sm_widgets/sm_widgets/doctype/__init__.py`
- `frappe-apps/sm_widgets/sm_widgets/doctype/sm_task/__init__.py`

### 4. Modules file
**Path:** `frappe-apps/sm_widgets/sm_widgets/modules.txt`

Contents: `SM Widgets`

---

## Files to Modify

None — all files are new.

---

## Files to Delete

- `BLOCKED-STORY-003.md` — stale block file; governance files now exist.

---

## Quality Gates

Per CLAUDE.md Definition of Done for Frappe DocType stories:

1. `bench --site poc.sparkmojo.com migrate` — exit 0
2. All fields from story spec visible in Frappe Desk
3. Controller hooks verified in bench console

**Note:** Gates 1-3 require a running Frappe bench with the sm_widgets app installed. Since CLAUDE.md rule #11 prohibits installing Frappe apps via bench, the builder should:
- Create all files with correct structure
- Verify file validity (JSON parses, Python syntax checks)
- Document that `bench migrate` must be run manually by James on the VPS

---

## Dependency Check

- STORY-003 has no dependencies. ✅
- No prior COMPLETE marker required. ✅

---

## Ambiguity Check

No ambiguity found. The story spec, TASK-WORKBOARD.md, and DECISION-014 are all aligned:
- SM Task is a custom DocType in sm_widgets ✅
- Field list is explicit with types and options ✅
- Controller hooks are fully specified ✅
- Auto-name format is specified (`TASK-.#####`) ✅
- No permissions work needed (explicitly out of scope) ✅
