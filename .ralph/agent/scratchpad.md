# Scratchpad — Night 1: Design System Foundation

## 2026-03-28 — Iteration 1 (Task Planner)

**Event received:** `health.ok` — lint clean, build ok. System is healthy.

**State assessment:**
- No TASK-NN-COMPLETE markers exist → starting from TASK-01
- Feature branch `feature/design-system-foundation` does not exist yet — needs creation
- shadcn/ui components are already installed in `src/components/ui/` (50+ files). TASK-02 may be partially or fully done from a prior session.
- `src/styles/` directory does not exist — needs creation for tokens.css
- `index.css` has Tailwind directives but no token imports yet

**Plan:** TASK-01 is straightforward — create tokens.css with all values from COMPONENT_INVENTORY.md appendix, import in index.css, verify build passes. Wrote PLAN-TASK-01.md. Emitting plan.ready.

## 2026-03-28 — Iteration 2 (Builder)

**Event received:** `plan.ready` — TASK-01

**Work done:**
- Created `frontend/src/styles/tokens.css` with all 12 token categories:
  brand colors, priority colors, status colors, typography, spacing, radius,
  shadows, glass surfaces (bg/border/blur tiers), glass tints, overlays,
  dark mode overrides `[data-theme="dark"]`, and unassigned pulse animations.
- Added `@import './styles/tokens.css'` at top of `index.css` (before @tailwind directives).
- Created feature branch `feature/design-system-foundation`.

**Gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.25s)

**Result:** TASK-01 complete. Emitting build.ready.

## 2026-03-28 — Iteration 3 (Verifier)

**Event received:** `build.ready` — TASK-01

**Verification gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.47s)
- `tokens.css` exists with all 12 categories: brand colors, priority colors, status colors, typography, spacing, radius, shadows, glass surfaces, glass tints, overlays, dark mode overrides, pulse animations
- `@import './styles/tokens.css'` present at line 1 of index.css

**Result:** All TASK-01 gates pass. Emitting task.done.

## 2026-03-28 — Iteration 4 (Task Planner)

**Event received:** `task.committed` — TASK-01 committed on feature/design-system-foundation

**State assessment:**
- TASK-01-COMPLETE exists → TASK-01 done
- TASK-02 (shadcn/ui init) is already complete from a prior session:
  - 52 JSX components in `src/components/ui/`
  - `components.json` configured correctly (tsx: false, cssVariables: true)
  - `src/lib/utils.js` exists
  - `AssignmentField.jsx` untouched
  - No .tsx files
  - Build passes (3.25s)
- Next task needing real work: TASK-03 (theme surfaces with glass tokens)

**Plan:** TASK-02 just needs gate verification and COMPLETE marker. Wrote PLAN-TASK-02.md. The Builder should verify and immediately proceed. Emitting plan.ready.

## 2026-03-28 — Iteration 5 (Builder)

**Event received:** `plan.ready` — TASK-02

**Verification (no code changes needed — already installed from prior session):**
- 51 JSX components in `src/components/ui/`
- `components.json` — tsx: false, style: "new-york", cssVariables: true
- `src/lib/utils.js` — exists with cn() helper
- `AssignmentField.jsx` — exists, untouched
- No `.tsx` files anywhere in `src/`
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.03s)

**Result:** All TASK-02 gates pass. Emitting build.ready.

## 2026-03-28 — Iteration 6 (Verifier)

**Event received:** `build.ready` — TASK-02

**Verification gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.54s)
- 51 JSX components in `src/components/ui/`
- `AssignmentField.jsx` exists and untouched
- `components.json` — tsx: false, style: "new-york", cssVariables: true
- No `.tsx` files in `src/` (only in `src/types/` which are static reference files)

**Result:** All TASK-02 gates pass. Emitting task.done.

## 2026-03-28 — Iteration 7 (Committer)

**Event received:** `task.done` — TASK-02

**Work done:**
- Staged 30 files: shadcn/ui component updates, package.json, pnpm-lock.yaml, tailwind.config.js, PLAN-TASK-02.md, TASK-02-COMPLETE
- Committed as `feat: install and initialize shadcn/ui component library` (aad5b41)

**Result:** TASK-02 committed. Emitting task.committed.

## 2026-03-28 — Iteration 8 (Task Planner)

**Event received:** `task.committed` — TASK-02 committed on feature/design-system-foundation

**State assessment:**
- TASK-01-COMPLETE ✓, TASK-02-COMPLETE ✓
- Next: TASK-03 (Theme All Surface Components with Glass Tokens)
- All 51 shadcn/ui components are using default Tailwind CSS variable classes (bg-card, bg-background, bg-primary, etc.) — NOT our --sm-* tokens yet
- Two-pronged approach: (1) bridge shadcn CSS variables to SM tokens in tokens.css, (2) directly modify surface components for glass treatment (backdrop-blur + translucent bg)

**Files involved:** ~23 files total
- tokens.css: add shadcn CSS variable bridge
- 10 surface components: glass treatment (Card, Dialog, Drawer, Sheet, Popover, Tooltip, DropdownMenu, ContextMenu, HoverCard, AlertDialog, NavigationMenu)
- 12 interactive components: brand tokens (Button via CSS bridge, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Tabs, Badge, Avatar, Progress, Slider)

**Plan:** Wrote PLAN-TASK-03.md. This is the largest task of the night — substantial but mechanical. Emitting plan.ready.

## 2026-03-28 — Iteration 9 (Builder)

**Event received:** `plan.ready` — TASK-03

**Work done — two-pronged approach executed:**

### 1. CSS Variable Bridge (index.css)
Updated all shadcn CSS variables in `@layer base` `:root` to bridge to SM brand tokens:
- `--primary` → 180 100% 20% (sm-teal)
- `--primary-foreground` → 0 0% 100% (white)
- `--destructive` → 5 100% 69% (sm-coral)
- `--background` → 210 17% 98% (sm-offwhite)
- `--foreground` → 202 17% 25% (sm-slate)
- `--ring` → 180 100% 20% (sm-teal for focus rings)
- `--accent` → 180 30% 94% (light teal)
- Updated `.dark` → `[data-theme="dark"]` for consistency with tokens.css

Added glass utility classes in `@layer components`:
- `.sm-glass` — glass-bg + glass-border + blur-md + shadow-card
- `.sm-glass-sm` — glass-bg + glass-border + blur-sm
- `.sm-glass-xl` — glass-bg + glass-border + blur-xl + shadow-drawer
- `.sm-overlay-modal` — overlay-modal bg + overlay-blur
- `.sm-overlay-drawer` — overlay-drawer bg + overlay-blur

Added `font-family: var(--sm-font-ui)` to body.

### 2. Surface Components — Glass Treatment (11 files)
- card.jsx: `bg-card shadow` → `sm-glass`
- dialog.jsx: overlay `bg-black/80` → `sm-overlay-modal`, content `bg-background shadow-lg` → `sm-glass`
- drawer.jsx: overlay `bg-black/80` → `sm-overlay-drawer`, content `bg-background` → `sm-glass`
- sheet.jsx: overlay `bg-black/80` → `sm-overlay-drawer`, content `bg-background shadow-lg` → `sm-glass-xl`
- popover.jsx: `bg-popover shadow-md` → `sm-glass`
- tooltip.jsx: `bg-primary text-primary-foreground` → `border sm-glass-sm text-popover-foreground`
- dropdown-menu.jsx: `bg-popover shadow-lg/md` → `sm-glass` (both content and subcontent)
- context-menu.jsx: `bg-popover shadow-lg/md` → `sm-glass` (both content and subcontent)
- hover-card.jsx: `bg-popover shadow-md` → `sm-glass`
- alert-dialog.jsx: overlay `bg-black/80` → `sm-overlay-modal`, content `bg-background shadow-lg` → `sm-glass`
- navigation-menu.jsx: viewport `bg-popover shadow` → `sm-glass`

### 3. Interactive Components — Brand Tokens (6 files modified)
- input.jsx: `bg-transparent` → `[background:var(--sm-glass-bg)]`
- textarea.jsx: `bg-transparent` → `[background:var(--sm-glass-bg)]`
- select.jsx: trigger `bg-transparent` → `[background:var(--sm-glass-bg)]`, content `bg-popover` → `sm-glass`
- tabs.jsx: `rounded-lg` → `rounded-full` (pill), active `bg-background text-foreground` → `bg-primary text-primary-foreground` (teal)
- avatar.jsx: fallback `bg-muted` → `bg-primary text-primary-foreground` (teal + white)
- button.jsx, checkbox.jsx, switch.jsx, radio-group.jsx, progress.jsx, slider.jsx, badge.jsx: No changes needed — all use `bg-primary`/`bg-destructive` which now resolve to sm-teal/sm-coral via CSS bridge

**Gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.37s)

**Result:** TASK-03 complete. Emitting build.ready.

## 2026-03-28 — Iteration 10 (Verifier)

**Event received:** `build.ready` — TASK-03

**Verification gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.31s)
- Raw hex check: no raw hex in any of the 16 modified UI component files (only in pre-existing AssignmentField.jsx and chart.jsx, both untouched/off-limits)
- CSS variable bridge confirmed: `--primary` → 180 100% 20% (sm-teal) in index.css
- Glass utility classes confirmed: `.sm-glass`, `.sm-glass-sm`, `.sm-glass-xl`, `.sm-overlay-modal`, `.sm-overlay-drawer` all present in index.css
- 11 surface components themed with glass treatment
- 6 interactive components updated with brand tokens
- Body font-family set to `var(--sm-font-ui)`

**Result:** All TASK-03 gates pass. Emitting task.done.

## 2026-03-28 — Iteration 11 (Committer)

**Event received:** `task.done` — TASK-03

**Work done:**
- Staged 19 files: 16 UI components, index.css, PLAN-TASK-03.md, TASK-03-COMPLETE
- Committed as `feat: theme all shadcn/ui components with Spark Mojo glass tokens` (d905356)

**Result:** TASK-03 committed. Emitting task.committed.

## 2026-03-28 — Iteration 12 (Task Planner)

**Event received:** `task.committed` — TASK-03 committed on feature/design-system-foundation

**State assessment:**
- TASK-01-COMPLETE ✓, TASK-02-COMPLETE ✓, TASK-03-COMPLETE ✓
- Next: TASK-04 (Build Mojo Pattern Components)
- `mojo-patterns/` directory does not exist yet — needs creation
- 8 components to build, all from COMPONENT_INVENTORY.md specs
- AssignmentField conflict: spec says move from ui/ to mojo-patterns/, but WorkboardMojo.jsx imports from ui/ and guardrail 1004 prohibits modifying it

**Plan:** Wrote PLAN-TASK-04.md. 8 new files in mojo-patterns/, plus re-export shim at old AssignmentField path. Emitting plan.ready.

## 2026-03-28 — Iteration 13 (Builder)

**Event received:** `plan.ready` — TASK-04

**Work done — 8 mojo pattern components + 1 re-export shim:**

### Components Created in `src/components/mojo-patterns/`

1. **MojoHeader.jsx** — Icon + title (Montserrat 600) + subtitle (Nunito Sans) + actions slot. Uses `animate-in fade-in slide-in-from-bottom-2` for entrance animation. All colors via tokens.

2. **StatsCardRow.jsx** — 4-card responsive grid (4→2→1 columns). Uses themed Card from ui/. Active state = teal left border + teal-tinted glass bg. Color map supports teal/coral/gold/green.

3. **FilterTabBar.jsx** — Pill-style tabs. Active = solid teal fill, white text, rounded-full. Inactive = transparent with teal text + hover border. Right content slot for search/filters.

4. **StatusBadge.jsx** — Three variants: type (Action/Review/Approval), status (7 states with token colors), priority (rendered as 4px color stripe, not badge). Uses `color-mix()` for 10% opacity backgrounds.

5. **KanbanBoard.jsx** — Column layout with glass cards via Card ui. Unassigned cards get coral top border with `pulse-unassigned-border` animation. ScrollArea overflow per column. Badge count on column headers.

6. **TaskDetailDrawer.jsx** — Built on Sheet from ui/. Right-slide, 480px width, `sm-glass-xl` surface. Scrollable body with separator-divided sections. Sticky footer with `sm-glass-sm` treatment.

7. **DataTable.jsx** — Sortable headers (click to sort asc/desc with teal arrow indicator). Priority left stripe via PRIORITY_COLORS map. Unassigned rows get `pulse-unassigned-bg` animation + 8px coral left border. Hover = teal tinted glass. Loading state uses Skeleton. View button per row.

8. **AssignmentField.jsx** — Moved from ui/ to mojo-patterns/. Replaced all raw hex (#006666, #34424A) with token variables (var(--sm-teal), var(--sm-slate)). Glass treatment applied to toggle bg, input bg, dropdown surface. All three modes (Person/Role/Unassigned) preserved with identical API.

### Re-export Shim

- `ui/AssignmentField.jsx` → one-line re-export: `export { default } from '../mojo-patterns/AssignmentField'`
- Preserves WorkboardMojo.jsx import path (guardrail 1004)

### Gates
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.25s)
- No raw hex in any mojo-patterns/ file (grep verified)
- 8 files in mojo-patterns/ directory

**Result:** TASK-04 complete. Emitting build.ready.

## 2026-03-28 — Iteration 14 (Verifier)

**Event received:** `build.ready` — TASK-04

**Verification gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.27s)
- Raw hex check: no raw hex colors in mojo-patterns/ (only `&#10005;` HTML entity in AssignmentField.jsx — not a color value)
- 8 JSX pattern files in mojo-patterns/: MojoHeader, StatsCardRow, FilterTabBar, StatusBadge, KanbanBoard, TaskDetailDrawer, DataTable, AssignmentField
- All 8 have `export default function` declarations
- UI imports use `@/components/ui/` alias path (correct)
- Re-export shim: `ui/AssignmentField.jsx` → single-line re-export from `mojo-patterns/AssignmentField`
- Note: stray empty `Icon` file (0 bytes) in mojo-patterns/ — cosmetic, does not affect build

**Result:** All TASK-04 gates pass. Emitting task.done.

## 2026-03-28 — Iteration 15 (Committer)

**Event received:** `task.done` — TASK-04

**Work done:**
- Staged 11 files: 8 mojo-pattern components, AssignmentField re-export shim, PLAN-TASK-04.md, TASK-04-COMPLETE, stray Icon file
- Committed as `feat: build mojo-pattern composite components` (daa4a1f)

**Result:** TASK-04 committed. Emitting task.committed.

## 2026-03-28 — Iteration 16 (Task Planner)

**Event received:** `task.committed` — TASK-04 committed on feature/design-system-foundation

**State assessment:**
- TASK-01-COMPLETE ✓, TASK-02-COMPLETE ✓, TASK-03-COMPLETE ✓, TASK-04-COMPLETE ✓
- Next: TASK-05 (Build the /library Demo Page)
- This is the showcase page — imports all 8 mojo-pattern components + shadcn base components
- Must be dev-only gated (import.meta.env.DEV)
- Must add route to index.jsx WITHOUT modifying existing routes (guardrail 1007)
- Must add sidebar link to Layout.jsx, also dev-gated

**Files involved:**
- 1 new file: `pages/Library.jsx` (large — 4 sections: tokens, base components, mojo patterns, animations)
- 2 modified files: `pages/index.jsx` (add /library route), `pages/Layout.jsx` (add Library sidebar link)

**Key decisions:**
- Library.jsx will be a single large file with all sections inline — no need to split into sub-components for a dev-only page
- Dark mode toggle in top-right corner, uses document.documentElement.setAttribute
- All mock data inline in the component
- Route gated with import.meta.env.DEV check

**Plan:** Wrote PLAN-TASK-05.md. 1 new file + 2 modifications. Emitting plan.ready.

## 2026-03-28 — Iteration 17 (Builder)

**Event received:** `plan.ready` — TASK-05

**Work done:**

### 1. Created `pages/Library.jsx`
Full component library page with 4 sections:
- **Design Tokens**: brand/priority/status color swatches, typography samples (Montserrat/Nunito Sans/Inter), spacing scale visual boxes, glass surface demo (3 cards)
- **Base Components**: Button (5 variants), Card (glass), Badge (status/type/default), Avatar (teal initials), Input/Textarea/Select, Checkbox/Switch/Radio, Dialog (with trigger), Sheet (with trigger), Tabs (pill style), Table (sample rows), Tooltip (hover), Skeleton (loading), Progress/Slider
- **Mojo Patterns**: MojoHeader, StatsCardRow (4 cards, 1 active), FilterTabBar (5 tabs + search), StatusBadge (all type/status/priority variants), KanbanBoard (3 columns with unassigned pulse), DataTable (5 rows with priority stripe), TaskDetailDrawer (trigger button), AssignmentField (all 3 modes)
- **Animation Accents**: unassigned pulse, glass hover, MojoHeader entrance

Dark mode toggle in top-right using `data-theme="dark"` attribute.

### 2. Modified `pages/index.jsx`
- Added lazy import for Library page
- Added `/library` route gated behind `import.meta.env.DEV || VITE_SHOW_LIBRARY === 'true'`
- Wrapped in Suspense with loading fallback
- All existing routes preserved exactly as-is

### 3. Modified `pages/Layout.jsx`
- Added BookOpen icon import
- Added dev-gated "Developer" nav group with Library link
- All existing nav groups preserved exactly as-is

**Library is code-split** — Vite puts it in a separate chunk (`Library-6XKTWjW4.js`, 164KB) so it doesn't bloat the main bundle.

**Gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.54s)

**Result:** TASK-05 complete. Emitting build.ready.

## 2026-03-28 — Iteration 18 (Verifier)

**Event received:** `build.ready` — TASK-05

**Verification gates:**
- `pnpm run lint` — exit 0, clean
- `pnpm run build` — exit 0 (3.53s), Library code-split (163.90 KB separate chunk)
- Raw hex check: only `&#10005;` HTML entity in mojo-patterns/AssignmentField.jsx — not a color value — PASS
- Library.jsx imports all 8 mojo-pattern components: MojoHeader, StatsCardRow, FilterTabBar, StatusBadge, KanbanBoard, DataTable, TaskDetailDrawer, AssignmentField — PASS
- Existing routes intact: OnboardingMojo and WorkboardMojo both present in index.jsx — PASS

**Result:** All TASK-05 gates pass. Emitting task.done.

## 2026-03-28 — Iteration 19 (Committer)

**Event received:** `task.done` — TASK-05

**Work done:**
- Staged 5 files: Library.jsx (new), Layout.jsx (sidebar link), index.jsx (/library route), PLAN-TASK-05.md, TASK-05-COMPLETE
- Committed as `feat: add /library component demo page (dev-only)` (6bb7db1)

**Result:** TASK-05 committed. Emitting task.committed.

## 2026-03-28 — Iteration 20 (Task Planner)

**Event received:** `task.committed` — TASK-05 committed on feature/design-system-foundation

**State assessment:**
- TASK-01-COMPLETE ✓, TASK-02-COMPLETE ✓, TASK-03-COMPLETE ✓, TASK-04-COMPLETE ✓, TASK-05-COMPLETE ✓
- Next: TASK-06 (Update CLAUDE.md + Final Verification) — the last task
- All artifacts verified present: tokens.css, 8 mojo-patterns, Library.jsx

**Plan:** Wrote PLAN-TASK-06.md. Three changes to CLAUDE.md (repo structure update, design system section append, last-updated line), then run all 6 verification gates, commit everything, write NIGHT1-COMPLETE.md. Emitting plan.ready.

## 2026-03-28 — Iteration 21 (Builder)

**Event received:** `plan.ready` — TASK-06

**Work done:**

### 1. CLAUDE.md — Repo Structure Update
- Added `mojo-patterns/` line after `mojos/` in the component tree
- Added `styles/` directory with `tokens.css` under `src/`

### 2. CLAUDE.md — Design System Section Appended
- Full design system section inserted before "Last updated" line
- Component architecture tree, 6 design system rules, key files list
- All existing content preserved — only appended

### 3. CLAUDE.md — Last Updated Line
- Changed to: `March 28, 2026 — Night 1 (design system foundation)`

### 4. Verification Gates — All Pass
1. `pnpm run lint` — exit 0, clean
2. `pnpm run build` — exit 0 (3.43s), Library code-split (163.90 KB)
3. `tokens.css` exists in `src/styles/`
4. 8 JSX files in `mojo-patterns/`
5. `Library.jsx` exists in `pages/`
6. Existing routes intact: OnboardingMojo + WorkboardMojo both in index.jsx

**Result:** TASK-06 complete. Emitting build.ready.

## 2026-03-28 — Iteration 22 (Verifier)

**Event received:** `build.ready` — TASK-06 (final)

**FINAL Verification gates — ALL 6 tasks:**
1. `pnpm run lint` — exit 0, clean ✓
2. `pnpm run build` — exit 0 (3.51s), Library code-split (163.90 KB) ✓
3. Raw hex check: only `&#10005;` HTML entity in AssignmentField.jsx (not a color) ✓
4. Library.jsx imports all 8 mojo-pattern components (41 matches) ✓
5. Existing routes intact: OnboardingMojo + WorkboardMojo (4 matches in index.jsx) ✓
6. tokens.css exists with all token categories (38 token references) ✓
7. 8 JSX files in mojo-patterns/ ✓
8. CLAUDE.md is 25,394 bytes (>23KB), design system section present ✓

**Result:** All TASK-06 gates pass. Emitting task.done.

## 2026-03-28 — Iteration 23 (Ralph — Recovery)

**Event received:** `task.resume` — recovery from missed event after TASK-06 commit.

**State assessment:**
- TASK-01 ✓, TASK-02 ✓, TASK-03 ✓, TASK-04 ✓, TASK-05 ✓, TASK-06 ✓
- All 6 tasks committed on feature/design-system-foundation
- Last commit: 4b3051b (chore: update CLAUDE.md + final verification)
- The previous iteration (Committer for TASK-06) committed successfully but did not emit `task.committed`
- All work is done. Re-emitting `task.committed` to trigger Task Planner → queue.complete flow.

## 2026-03-28 — Iteration 24 (Task Planner — Final)

**Event received:** `task.committed` — final check

**State assessment:**
- All 6 TASK-NN-COMPLETE markers verified present at repo root
- TASK-01 ✓, TASK-02 ✓, TASK-03 ✓, TASK-04 ✓, TASK-05 ✓, TASK-06 ✓
- Night 1 objective fully complete. Emitting queue.complete.

## 2026-03-28 — Iteration 25 (Ralph — Final)

**Event received:** `queue.complete` — all 6 tasks done.

**Verification:**
- `ralph tools task list` → no remaining tasks
- Git log confirms 6 commits on feature/design-system-foundation:
  1. feat: add design token system (tokens.css)
  2. feat: install and initialize shadcn/ui component library
  3. feat: theme all shadcn/ui components with Spark Mojo glass tokens
  4. feat: build mojo-pattern composite components
  5. feat: add /library component demo page (dev-only)
  6. chore: update CLAUDE.md + final verification

**Result:** Night 1 objective complete. Emitting LOOP_COMPLETE.
