# Fix Run — Session 43
# Generated: Session 41 close, April 11 2026

## How to Use This File
Work stories in priority order. Each story gets its own branch.
For each story:
1. Check for COMPLETE marker. If exists, skip.
2. Check for BLOCKED marker. If exists, skip.
3. All stories have Dependencies: None.
4. Read full story spec from the Spec path below.
5. Read CLAUDE.md for conventions.
6. Build exactly what the spec says. Nothing more.
7. Run all quality gates listed in the spec.
8. If architectural ambiguity: write BLOCKED-[ID].md and move on.

## Retry Policy
After 5 consecutive failures, write BLOCKED and move on.

## Story Queue

### FIX-42-001 - `story/fix-42-001-bill021-analytics-logic`
Fix cpt_code field reference in BILL-021 denial analytics handler.
Type: Python FastAPI
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-42-001-bill021-analytics-logic.md
Dependencies: None

### FIX-42-002 - `story/fix-42-002-test-tasks-remaining`
Resolve remaining test_tasks.py failures after partial auth fixture fix.
Type: Python FastAPI (test infrastructure)
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-42-002-test-tasks-remaining-failures.md
Dependencies: None

### FIX-42-003 - `story/fix-42-003-wikimojo-lint`
Clean up safe ESLint errors in WikiMojo.jsx (unused imports, missing keys).
Type: React JSX
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/FIX-42-003-wikimojo-lint.md
Dependencies: None

## Completion
When all 3 stories are COMPLETE or BLOCKED:
1. Write QUEUE-COMPLETE.md summarizing results.
2. Output: LOOP_COMPLETE
