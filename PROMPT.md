# Overnight Task Queue — Session 40
# WKBD-001 + BILL-011 through BILL-021

## How Ralph Uses This File

Work stories in priority order, top to bottom. Each story gets its own
feature branch. After each story passes all gates, merge to main and deploy
before moving to the next story.

For each story:
1. Check for a COMPLETE marker file at repo root (e.g., WKBD-001-COMPLETE).
   If it exists, skip to the next story.
2. Check for a BLOCKED marker file at repo root (e.g., BLOCKED-WKBD-001.md).
   If it exists, skip to the next story.
3. Check that all dependency COMPLETE markers exist. If any dependency is
   missing its COMPLETE marker (and also does not have a BLOCKED marker),
   skip this story for now - it will be retried after its dependency completes.
   If a dependency has a BLOCKED marker, this story is also blocked - write
   BLOCKED-[ID].md noting the blocked dependency and skip to the next story.
4. Create branch: `git checkout -b story/[branch-name]`
5. Read the full story spec from the absolute path listed below.
6. Read CLAUDE.md for conventions, gotchas, and Definition of Done.
7. Build exactly what the spec says. Nothing more. Nothing less.
8. If ambiguous on any architectural decision: write BLOCKED-[ID].md
   at repo root and move to the next story. Never improvise on architecture.
9. Run all quality gates (see CLAUDE.md Definition of Done for your story type).
10. When all gates pass:
    a. Commit using the exact commit message from the story spec.
    b. Push the feature branch: `git push origin [branch-name]`
    c. Merge to main: `git checkout main && git merge story/[branch-name] && git push origin main`
    d. Deploy to VPS: `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh'`
    e. Wait for deploy.sh to complete. If it exits non-zero, write BLOCKED-[ID]-DEPLOY.md
       and stop. Do not proceed to the next story on a failed deploy.
    f. Touch COMPLETE marker: `touch [STORY-ID]-COMPLETE`
    g. Remove the PLAN file: `rm -f PLAN-[STORY-ID].md`
    h. Append a line to QUEUE-PROGRESS.md: `[STORY-ID]: COMPLETE at [timestamp]`
11. Move to next story.

## Retry Policy

If a story fails verification, the builder gets another attempt. After 5
consecutive failures on the same story, write BLOCKED-[STORY-ID].md with
the exact failure details from all 5 attempts and move to the next story.
Do not burn the entire run on one broken story.

## Governance Repo

All story specs are in the governance repo at:
/Users/jamesilsley/GitHub/sparkmojo-internal/

## Story Queue

---

### WKBD-001 — `story/wkbd-001-task-mode`
Add task_mode field (active/watching/snoozed) to SM Task DocType.
Add POST /api/modules/tasks/update_mode endpoint.
Add task_mode filter to GET /api/modules/tasks/list.
Type: DocType field addition + Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/WKBD-001-task-mode.md
Dependencies: None
Note: This story must complete and deploy before BILL-013 runs.
      BILL-013 depends on task_mode existing on SM Task.

---

### BILL-011 — `story/bill-011-277ca-webhook`
277CA acknowledgment webhook handler. Stedi posts 277CA to
/api/webhooks/stedi/277ca. Handler parses response, transitions
SM Claim state via transition_state().
Type: Python API (webhook handler)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-011-277ca-webhook-handler.md
Dependencies: None

---

### BILL-012 — `story/bill-012-835-era-state-integration`
Wire existing 835 ERA processor (BILL-004) into the state machine
(BILL-006 through BILL-010). ERA processing now drives SM Claim
state transitions via transition_state().
Type: Python API (integration)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-012-835-era-state-integration.md
Dependencies: None

---

### BILL-013 — `story/bill-013-sm-denial-doctype`
SM Denial DocType. Created automatically when a claim transitions
to denied. Stores CARC/RARC codes, payer info, denial metadata,
and AI classification fields (ai_category, ai_appealable,
ai_action, ai_confidence - populated in BILL-014).
Type: Frappe DocType
Dependencies: WKBD-001, BILL-012
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-013-sm-denial-doctype.md

---

### BILL-014 — `story/bill-014-ai-denial-classification`
after_insert hook on SM Denial. Calls AWS Bedrock (Claude Sonnet)
to classify denial. Writes ai_category, ai_appealable, ai_action,
ai_confidence back to the record. Graceful fallback on any error.
Type: Python API (Frappe hook + Bedrock call)
Dependencies: BILL-013
Env vars required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                   AWS_REGION - all present in .env.poc
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-014-ai-denial-classification.md

---

### BILL-015 — `story/bill-015-denial-worklist`
Denial worklist API endpoint. Returns open denials for a tenant
with filtering by payer, date range, ai_category, and state.
Powers the billing coordinator's daily work queue.
Type: Python API
Dependencies: BILL-013
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-015-denial-worklist.md

---

### BILL-016 — `story/bill-016-sm-appeal-doctype`
SM Appeal DocType. Created manually by billing coordinator from
a denied claim. Stores appeal level, letter content, submission
status, and deadline. Links back to SM Denial and SM Claim.
Type: Frappe DocType
Dependencies: BILL-013
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-016-sm-appeal-doctype.md

---

### BILL-017 — `story/bill-017-appeal-letter-generation`
after_insert hook on SM Appeal. Calls AWS Bedrock (Claude Sonnet)
to generate a draft appeal letter. Writes to appeal_letter field
via frappe.db.set_value(). Updates linked WorkboardMojo task with
a comment. Graceful fallback on any error.
Type: Python API (Frappe hook + Bedrock call)
Dependencies: BILL-016
Env vars required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                   AWS_REGION - all present in .env.poc
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-017-appeal-letter-generation.md

---

### BILL-018 — `story/bill-018-appeal-transitions`
State machine transitions for SM Appeal. Appeal moves through
draft, submitted, upheld, overturned, abandoned states.
Wires into SM Claim state on appeal resolution.
Type: Python API (state machine extension)
Dependencies: BILL-016
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-018-appeal-transitions.md

---

### BILL-019 — `story/bill-019-ar-summary`
AR summary endpoint. Returns current accounts receivable totals
for a tenant grouped by state bucket and payer. Single aggregate
query, no pagination needed.
Type: Python API
Dependencies: None
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-019-ar-summary.md

---

### BILL-020 — `story/bill-020-ar-aging`
AR aging report endpoint. Returns open claims bucketed by age
(0-30, 31-60, 61-90, 91-120, 120+ days). Payer and state filters.
Universal Aging Engine pattern - build generically.
Type: Python API
Dependencies: None
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-020-ar-aging.md

---

### BILL-021 — `story/bill-021-denial-analytics`
Denial analytics endpoint. Returns denial rates, top denial
reasons by CARC code, payer denial trends, and appeal success
rates over a configurable date range.
Type: Python API
Dependencies: BILL-013
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-021-denial-analytics.md

---

## Completion

When all 13 stories are either COMPLETE or BLOCKED:

1. Write QUEUE-COMPLETE.md at repo root with:
   - Each story and its result (COMPLETE or BLOCKED)
   - Any BLOCKED files and the exact reason recorded in each
   - Test results summary (pass counts, coverage) for each story
   - Total elapsed time from QUEUE-PROGRESS.md
   - Any warnings or gotchas for James's morning verification

2. Output: LOOP_COMPLETE
