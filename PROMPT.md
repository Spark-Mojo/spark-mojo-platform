# Design System Sprint — Session 11 Queue

## How to Use This File
Three stories in strict dependency order. Run them in sequence — do not start the next
until the previous has all gates green and is merged to main.

1. Read CLAUDE.md first — it is the master context doc
2. Read each story spec in full before touching code
3. Run all quality gates before marking a story complete
4. Write QUEUE-COMPLETE.md when all three stories pass

## Pre-Reads (before touching any code)
- `/Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md` — build-time bible
- `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/WORKING_AGREEMENT.md`
- `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/CURRENT_SPRINT.md`

---

## Story Queue

### STORY-HOT-001 — Remove /library Production Guard
**Type:** Hotfix — Frontend routing
**Depends on:** none
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-HOT-001.md`
**Branch:** `hotfix/library-route-guard`

Removes the production guard (`const showLibrary = import.meta.env.DEV || ...`) from
`frontend/src/pages/index.jsx` so the /library route is accessible in all environments.
Then runs `./deploy.sh --phase 6` to redeploy the frontend.

**Gates:**
1. `grep -n "showLibrary" frontend/src/pages/index.jsx` — **MUST return 0 matches**
2. `grep -n "path=\"/library\"" frontend/src/pages/index.jsx` — MUST return 1 match (route present, unconditional)
3. `cd frontend && pnpm run build` — exit 0
4. After deploy: `curl -s -o /dev/null -w "%{http_code}" http://app.poc.sparkmojo.com/library` — MUST return 200

**Commit:** `fix: remove /library production guard — route accessible in all environments`

---

### STORY-DS-002 — Semantic Token Rename
**Type:** Design System — Token Infrastructure
**Depends on:** STORY-HOT-001 merged to main
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-DS-002.md`
**Branch:** `design-system/ds-002-semantic-token-rename`

Mechanical find/replace across all of `frontend/src/` renaming:
- `--sm-teal` → `--sm-primary`
- `--sm-coral` → `--sm-danger`
- `--sm-gold` → `--sm-warning`
- `--sm-glass-teal/coral/gold` → `--sm-glass-primary/danger/warning`

Affects: `tokens.css`, `StatusBadge.jsx`, `FilterTabBar.jsx`, `MojoHeader.jsx`, and any
other component files referencing these token names.

**Gates:**
1. `grep -rn "sm-teal\|sm-coral\|sm-gold" frontend/src/` — **MUST return 0 matches**
2. `grep -rn "sm-primary\|sm-danger\|sm-warning" frontend/src/styles/tokens.css` — MUST return ≥6 matches
3. `cd frontend && pnpm run build` — exit 0
4. After `./deploy.sh --phase 6`: site loads, /library badge colors render correctly

**Commit:** `refactor: rename color tokens to semantic roles — teal→primary, coral→danger, gold→warning`

---

### STORY-DS-003 — Refactor OnboardingMojo to Design System
**Type:** Design System — Phase 3 Mojo Refactor
**Depends on:** STORY-DS-002 merged to main
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-DS-003.md`
**Branch:** `design-system/ds-003-onboarding-mojo-refactor`

Refactors `frontend/src/pages/OnboardingMojo.jsx` to replace inline Tailwind color classes
and hand-rolled UI with mojo-pattern components: StatusBadge, MojoHeader, StatsCardRow,
FilterTabBar. Zero functional changes — UI layer swap only.

**Gates:**
1. `grep -n "STATUS_COLORS" frontend/src/pages/OnboardingMojo.jsx` — **MUST return 0 matches**
2. `grep -n "bg-amber\|bg-purple\|bg-yellow" frontend/src/pages/OnboardingMojo.jsx` — MUST return 0 matches
3. `grep -n "from '@/components/mojo-patterns" frontend/src/pages/OnboardingMojo.jsx` — MUST return ≥4 matches
4. `cd frontend && pnpm run build` — exit 0
5. Visual smoke test: status badges in /onboarding use SM token colors, filter tabs and stats row render correctly

**Commit:** `refactor(onboarding): replace inline colors with design system mojo-patterns`

---

## Completion
When all three stories are complete and merged to main:
1. Run `./deploy.sh --phase 6` one final time if not already done for DS-003
2. Write QUEUE-COMPLETE.md summarising what ran and any blockers encountered
3. Output: LOOP_COMPLETE
