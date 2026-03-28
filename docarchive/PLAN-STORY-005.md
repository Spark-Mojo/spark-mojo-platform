# PLAN — STORY-005: SM Task Extended Fields

**Story:** STORY-005 — SM Task extended fields (SLA, source system, recurrence, execution logic)
**Type:** Frappe DocType
**Size:** S
**Dependency:** STORY-003 ✅ (STORY-003-COMPLETE exists)

---

## Files to Modify

### 1. `frappe-apps/sm_widgets/sm_widgets/doctype/sm_task/sm_task.json`

Append 14 new fields after `canceled_at` (field index 18) and before `section_activity` (field index 19). Insert in this order:

**SLA Section (3 fields + 1 section break):**

| Fieldname | Label | Fieldtype | Notes |
|-----------|-------|-----------|-------|
| `section_sla` | SLA | Section Break | |
| `sla_hours` | SLA Hours | Float | Optional |
| `sla_breached` | SLA Breached | Check | Default 0, read_only |
| `sla_breached_at` | SLA Breached At | Datetime | read_only |

**Source & Context Section (6 fields + 1 section break):**

| Fieldname | Label | Fieldtype | Notes |
|-----------|-------|-----------|-------|
| `section_source` | Source & Context | Section Break | |
| `source_system` | Source System | Select | Options: Frappe\nn8n\nEHR\nStripe\nManual\nAI |
| `source_object_id` | Source Object ID | Data | |
| `related_crm_record` | Related CRM Contact | Link | Options: CRM Contact |
| `workflow_id` | Workflow | Link | Options: SM Workflow Config |
| `workflow_stage` | Workflow Stage | Data | |
| `parent_task` | Parent Task | Link | Options: SM Task (self-referential) |

**Execution Logic Section (4 fields + 1 section break):**

| Fieldname | Label | Fieldtype | Notes |
|-----------|-------|-----------|-------|
| `section_execution` | Execution | Section Break | |
| `completion_criteria` | Completion Criteria | Small Text | |
| `waiting_trigger` | Waiting Trigger | Small Text | |
| `is_recurring` | Recurring Instance | Check | |
| `recurrence_template_id` | Recurrence Template ID | Data | |

**Total fields after change:** 26 existing + 14 new = 40 fields

### 2. No other files

No controller changes. No new child tables. No new DocTypes. Fields are additive only.

---

## Quality Gate

- **Gate type:** Frappe DocType
- JSON syntax validation: `python -m json.tool sm_task.json`
- Field count verification: 40 fields
- Field order: SLA → Source & Context → Execution → Activity → Audit (existing)
- `bench --site poc.sparkmojo.com migrate` — deferred to James (CLAUDE.md rule #11)

---

## Ambiguity Check

No ambiguity. All fields fully specified in STORY-005.md. `CRM Contact` is the correct Link target per DECISION-013. `SM Workflow Config` is specified in the story as-is (DocType may not exist yet but the Link field is valid regardless).
