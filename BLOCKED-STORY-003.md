# BLOCKED — STORY-003: SM Task DocType Core

**Date:** 2026-03-26
**Story:** STORY-003 — Create SM Task DocType with core fields and lifecycle hooks
**Type:** Frappe DocType | App: sm_widgets

## Blocking Issue

The story spec file does not exist at the expected path:

```
/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-003.md
```

The `stories/` directory does not exist in the governance repo at all.

Additionally, the following referenced governance files are also missing:

| File | Expected Path | Status |
|------|---------------|--------|
| STORY-003.md | `platform/feature-library/stories/STORY-003.md` | Missing (directory doesn't exist) |
| TASK-WORKBOARD.md | `platform/feature-library/TASK-WORKBOARD.md` | Missing |
| DECISION-014-sm-task-custom-doctype.md | `platform/decisions/DECISION-014-sm-task-custom-doctype.md` | Missing |
| WORKING_AGREEMENT.md | `platform/WORKING_AGREEMENT.md` | Missing |

## What Exists

- DECISION-003 (abstraction layer) confirms SM Task is a canonical DocType with `SM` prefix
- CLAUDE.md confirms SM Task goes in `sm_widgets` app and is NOT an ERPNext Task extension
- PROMPT.md provides a one-line description: "Create SM Task DocType with core fields and lifecycle hooks"

## What's Needed to Unblock

1. Create the `stories/` directory in the governance repo
2. Write STORY-003.md with:
   - Exact field list (field names, types, options, required flags)
   - Lifecycle hook specifications (validate, before_save, after_insert, etc.)
   - State machine definition (allowed states + transitions)
   - Naming rule
   - Permissions model
3. Write TASK-WORKBOARD.md (full feature spec with SM Task schema)
4. Write DECISION-014 (SM Task as custom DocType rationale)
5. Write WORKING_AGREEMENT.md (build rules)

## Action Required

James: Please create the story spec files in the governance repo, or provide the SM Task field definitions and lifecycle hooks so planning can proceed.
