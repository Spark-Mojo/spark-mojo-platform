# PLAN — TASK-06: Update CLAUDE.md + Final Verification

## Task Number and Name
TASK-06: Update CLAUDE.md + Final Verification

## Dependencies
- TASK-01 ✓ (tokens.css)
- TASK-02 ✓ (shadcn/ui init)
- TASK-03 ✓ (glass theming)
- TASK-04 ✓ (mojo-pattern components)
- TASK-05 ✓ (Library page)

## Files to Modify

### 1. CLAUDE.md — `/Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md`

**Part A — Update Repo Structure (line ~85):**
Add new directories to the existing tree:
- `├── mojo-patterns/   # Spark Mojo composite patterns` — after `ui/` line
- `├── styles/` with `└── tokens.css` — add under `src/` before `types/`

**Part B — Append Design System section (before line 554 "Last updated"):**
Insert the full design system section as specified in the TASK-06 spec.

**Part C — Update "Last updated" line (line 554):**
Change to: `*Last updated: March 28, 2026 — Night 1 (design system foundation)*`

### 2. NIGHT1-COMPLETE.md — `/Users/jamesilsley/GitHub/spark-mojo-platform/NIGHT1-COMPLETE.md`
New file — summary of what was built.

### 3. TASK-06-COMPLETE — `/Users/jamesilsley/GitHub/spark-mojo-platform/TASK-06-COMPLETE`
Empty marker file.

## Part B — Final Verification Gates (run in sequence)

1. `cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend && pnpm run lint` — must exit 0
2. `cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend && pnpm run build` — must exit 0
3. Verify `src/styles/tokens.css` exists and contains all token categories
4. Verify `src/components/mojo-patterns/` contains all 8 pattern files
5. Verify `src/pages/Library.jsx` exists and imports all pattern components
6. Verify existing routes still work — `pages/index.jsx` still imports OnboardingMojo and WorkboardMojo

## Completion

After all gates pass:
- `git add -A`
- `git commit -m "feat: design system foundation — shadcn/ui + glass tokens + mojo patterns + library page"`
- Write NIGHT1-COMPLETE.md
- Output: LOOP_COMPLETE
