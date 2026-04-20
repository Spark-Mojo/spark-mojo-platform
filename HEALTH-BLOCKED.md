# Health Check Blocked — Secrets Migration Phase 2 Overnight Run

**Timestamp (UTC):** 2026-04-20
**Failing check:** Check 2 — repos clean and on main

## Failing command

```
cd /Users/jamesilsley/GitHub/spark-mojo-platform && git status --porcelain && git branch --show-current
```

## Output

```
 M abstraction-layer/.coverage
 M hats.yml
branch: main
```

## Requirement

> Required: spark-mojo-platform branch=main, porcelain empty.

Porcelain is NOT empty. Branch is correct.

## Details

- `abstraction-layer/.coverage` — pytest coverage artifact produced by Check 1 of this same health-check run. Not in `.gitignore`. Recommendation: add `.coverage` to `.gitignore`.
- `hats.yml` — pre-existing working-tree modification carried over from before this iteration started (present in session-start git status). Last committed in `b6fd2db chore(ralph): add PROMPT.md + hats.yml for Phase 2 overnight run`; working tree differs by a 2-line change.

`sparkmojo-internal` is clean and on main. All other checks (1, 4, 5) would likely pass but were not run because the flow requires stopping on first failure.

## Stale artifact noted (Check 3 would also fail)

The pre-existing `HEALTH-BLOCKED.md` from Session 42 (2026-04-11) was present at the start of this iteration and has now been overwritten with this report. Any stale `*-COMPLETE`, `BLOCKED-*.md`, `PLAN-*.md`, `QUEUE-*.md` markers should also be cleaned before re-running.

## Resolution

Human must:
1. Commit, stash, or discard the `hats.yml` working-tree change.
2. Delete or gitignore `abstraction-layer/.coverage`.
3. Remove any stale run artifacts (see Check 3 glob).
4. Re-launch the overnight loop.
