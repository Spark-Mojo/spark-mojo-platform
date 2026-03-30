# Design System Retrofit — Overnight Build Queue

## How to Use This File
Work stories in order. Each depends on the prior.
For each story:
1. Read CLAUDE.md first — it is the master context doc
2. Read the full story spec from the governance repo (absolute paths below)
3. Read DECISION-015 for design system architecture rules
4. Build exactly what the spec says — nothing more
5. Run all quality gates (see CLAUDE.md Definition of Done)
6. If ambiguous on any decision, write BLOCKED-STORY-NNN.md and stop

## Pre-Reads (before touching any code)
- `/Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md` — build-time bible
- `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/WORKING_AGREEMENT.md`
- `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-015-design-system.md`
- `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/CURRENT_SPRINT.md`

## Known Issues — Handle Before Starting

**Junk files:** `Icon\r` (carriage return in filename) exists in both `frontend/src/components/ui/` and `frontend/src/components/mojo-patterns/`. Delete these files before building COMPONENT_INVENTORY.md. They are not real components.

```bash
# Clean up junk files
find frontend/src/components/ -name $'Icon\r' -delete
git add -A && git commit -m "chore: remove Icon carriage-return junk files"
```

---

## Story Queue

### STORY-011 — Design System: COMPONENT_INVENTORY + fill /library to 100%
**Type:** React Frontend
**Depends on:** none
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-011.md`
**Branch:** `story/STORY-011-component-inventory-library`

Creates COMPONENT_INVENTORY.md, fills /library page to 100% coverage of all components in ui/ and mojo-patterns/, relocates StatsCard.jsx from ui/ to mojo-patterns/ (with re-export shim in ui/).

**Gates:**
1. `cd frontend && pnpm run build` — exit 0
2. `grep -rn '#[0-9a-fA-F]\{6\}' frontend/src/pages/Library.jsx` — only pre-existing lines, no new hex
3. `cat frontend/src/components/ui/StatsCard.jsx` — must be re-export shim only
4. `cat frontend/src/components/mojo-patterns/StatsCard.jsx` — must have full component
5. `frontend/src/components/COMPONENT_INVENTORY.md` exists with row for every component

**Commit:** `feat(design-system): STORY-011 COMPONENT_INVENTORY + fill /library to 100%`

---

### STORY-012 — Design System: Token Compliance Retrofit
**Type:** React Frontend
**Depends on:** STORY-011 (StatsCard must be in mojo-patterns/ first)
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-012.md`
**Branch:** `story/STORY-012-token-compliance`

Fixes all token violations in StatsCard.jsx and WorkboardMojo.jsx. Replaces hardcoded hex and Tailwind color classes with var(--sm-*) token references. Adds missing status background tokens to tokens.css.

**Gates (critical — run these exact commands):**
1. `grep -rn 'bg-emerald\|bg-blue\|bg-purple\|bg-amber\|bg-teal-\|text-teal-\|text-amber-\|text-orange-' frontend/src/components/mojo-patterns/StatsCard.jsx` — MUST return 0 results
2. `grep -rn '#[0-9a-fA-F]\{6\}' frontend/src/components/mojos/WorkboardMojo.jsx` — MUST return 0 results
3. `grep -rn 'bg-teal\|text-teal\|bg-amber\|text-amber\|bg-orange\|text-orange' frontend/src/components/mojos/WorkboardMojo.jsx` — MUST return 0 results
4. `cd frontend && pnpm run build` — exit 0
5. Visual appearance of badges and stats cards unchanged (compare before/after)

**Commit:** `fix(design-system): STORY-012 token compliance retrofit StatsCard + WorkboardMojo`

---

### STORY-013 — Design System: AnimatedThemeToggler
**Type:** React Frontend
**Depends on:** STORY-011 (needs /library Universal Components section)
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-013.md`
**Branch:** `story/STORY-013-animated-theme-toggler`

Installs Magic UI AnimatedThemeToggler, wires to [data-theme="dark"] mechanism, replaces text toggle in Library.jsx, adds Universal Components section to /library.

**Gates:**
1. `ls frontend/src/components/magicui/animated-theme-toggler.jsx` — file exists
2. Old text-based toggle buttons removed from Library.jsx
3. COMPONENT_INVENTORY.md has AnimatedThemeToggler row
4. `cd frontend && pnpm run build` — exit 0

**Commit:** `feat(design-system): STORY-013 AnimatedThemeToggler universal component`

---

### TASK-ADR — ADR Cleanup (no story file — small task)
**Type:** Documentation
**Depends on:** none (can run after any story)

In `spark-mojo-platform` repo root, replace the contents of `ADR-design-system.md` with:

```markdown
# Design System ADR

This document has been superseded. See the canonical decision record:
[DECISION-015](https://github.com/Spark-Mojo/sparkmojo-internal/blob/main/platform/decisions/DECISION-015-design-system.md)
```

**Commit:** `chore: replace ADR-design-system.md with pointer to DECISION-015`

---

## Completion
When all stories complete or are blocked:
1. Write QUEUE-COMPLETE.md summarising results per story
2. Output: LOOP_COMPLETE
