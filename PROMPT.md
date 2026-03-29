# Night 1: Design System Foundation + Component Library Page

## How to Use This File
Work tasks in order. All tasks are on a single branch.
For each task:
1. Read CLAUDE.md for conventions and absolute paths — it is the master context doc
2. Read ADR-design-system.md for architecture decisions
3. Read COMPONENT_INVENTORY.md for component specs
4. Build exactly what the specs say — nothing more
5. Run all quality gates (see CLAUDE.md Definition of Done)
6. If ambiguous on any decision, write BLOCKED.md and stop

## Branch
```
git checkout -b feature/design-system-foundation
```

## Spec Files (read these before building)
- ADR: `/Users/jamesilsley/GitHub/spark-mojo-platform/ADR-design-system.md`
- Component Inventory: `/Users/jamesilsley/GitHub/spark-mojo-platform/COMPONENT_INVENTORY.md`

---

## Task Queue

---

### TASK-01: Create Design Token System
**Type:** Frontend CSS
**Priority:** 1 (everything depends on this)

Create `frontend/src/styles/tokens.css` with the full token set defined in the ADR-design-system.md "Theming Architecture" section and COMPONENT_INVENTORY.md "Token Quick Reference" appendix. This file is the single source of truth for all visual values.

Include:
- All brand color tokens (--sm-teal, --sm-coral, --sm-gold, --sm-offwhite, --sm-slate)
- All glass surface tokens (--sm-glass-bg, --sm-glass-border, --sm-glass-blur-*, etc.)
- Dark mode overrides in `[data-theme="dark"]`
- Typography tokens (--sm-font-display, --sm-font-body, --sm-font-ui)
- Spacing scale (base 4px: --sm-space-1 through --sm-space-8)
- Radius tokens (--sm-radius-sm/md/lg/pill)
- Shadow tokens (--sm-shadow-card/drawer/modal)
- Priority and status color tokens
- Overlay tokens (--sm-overlay-drawer, --sm-overlay-modal, --sm-overlay-blur)
- Glass surface tint tokens (--sm-glass-teal, --sm-glass-coral, --sm-glass-gold)

Import this file in the app's main CSS entry point so tokens are globally available.

**Gate:** Build passes. Tokens are accessible via `var(--sm-*)` in any component.

---

### TASK-02: Install and Initialize shadcn/ui
**Type:** Frontend Config
**Priority:** 2

Initialize shadcn/ui in the frontend directory:
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend
pnpm dlx shadcn@latest init
```

Configure to use:
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind CSS: Yes
- Components directory: `src/components/ui`
- Utils directory: `src/lib`

Then install ALL base components:
```bash
pnpm dlx shadcn@latest add --all
```

This installs every shadcn/ui primitive into `src/components/ui/`. Verify the directory populates with component files.

**CRITICAL:** The existing `src/components/ui/` directory already has `AssignmentField.jsx`. Do NOT delete or overwrite it. shadcn/ui will add its own files alongside it.

**CRITICAL:** shadcn/ui defaults to TypeScript. We use JavaScript JSX. If the CLI generates `.tsx` files, rename them to `.jsx` and remove type annotations. Check if shadcn/ui has a `--typescript false` flag or similar configuration.

**CRITICAL:** shadcn/ui init may create or modify `tailwind.config.js` and add CSS variable definitions. Ensure these do not conflict with our `tokens.css`. Our `--sm-*` tokens take precedence.

**Gate:** `pnpm run build` passes with all shadcn components installed. Existing `AssignmentField.jsx` is untouched.

---

### TASK-03: Theme All Surface Components with Glass Tokens
**Type:** Frontend Styling
**Priority:** 3

Apply the Spark Mojo liquid glass treatment to every shadcn/ui surface component. Read the "Visual North Star" section in ADR-design-system.md and the detailed specs in COMPONENT_INVENTORY.md.

**Light-mode-first glass strategy (critical):** Glass surfaces are frosted WHITE on a light canvas. NOT dark glass. The page background is `var(--sm-offwhite)`. Glass cards use `var(--sm-glass-bg)` (white at 70% opacity) with backdrop-blur. Dark mode is a TOKEN SWAP, not the default.

**Surface components (apply glass treatment):**
- `Card` — `var(--sm-glass-bg)`, `var(--sm-glass-border)`, `backdrop-filter: blur(var(--sm-glass-blur-md))`
- `Dialog` — glass surface + `var(--sm-overlay-modal)` backdrop
- `Drawer` / `Sheet` — glass surface + `var(--sm-overlay-drawer)` backdrop
- `Popover` — glass surface, blur-md
- `Tooltip` — glass surface, blur-sm
- `DropdownMenu` — glass surface, blur-md
- `ContextMenu` — glass surface, blur-md
- `HoverCard` — glass surface, blur-md
- `AlertDialog` — glass surface + modal overlay
- `NavigationMenu` — glass surface for dropdown panels

**Interactive components (apply brand tokens):**
- `Button` — `var(--sm-teal)` as primary, `var(--sm-coral)` as destructive
- `Input`, `Textarea`, `Select` — glass-bg background, teal focus ring
- `Checkbox`, `Switch`, `Radio` — teal checked state
- `Tabs` — active tab uses `var(--sm-teal)` with pill style (border-radius: `var(--sm-radius-pill)`)
- `Badge` — variants for each status/type color (see COMPONENT_INVENTORY.md StatusBadge mappings)
- `Avatar` — teal background, white text, rounded-full
- `Progress` — teal fill
- `Slider` — teal track

**Typography:**
- All component text defaults to `var(--sm-font-ui)` (Inter)
- Headings within components use `var(--sm-font-display)` (Montserrat) only when they are card/section titles

**Rules:**
- NO raw hex values. Every color must reference a `var(--sm-*)` token.
- NO `bg-white`. Use `var(--sm-glass-bg)` for surfaces or `var(--sm-offwhite)` for page backgrounds.
- NO hardcoded backdrop-blur values. Use `var(--sm-glass-blur-*)` tokens.

**Gate:** `pnpm run lint` and `pnpm run build` pass. Grep for raw hex values in `src/components/ui/` — only shadcn/ui's own defaults may contain them in comments or string constants, NOT in active style properties.

---

### TASK-04: Build Mojo Pattern Components
**Type:** Frontend Components
**Priority:** 4

Create `frontend/src/components/mojo-patterns/` directory. Build each composite component exactly as specified in COMPONENT_INVENTORY.md. Read that file carefully — it has props, visual specs, and color mappings for each.

1. **MojoHeader.jsx** — icon + title (Montserrat 600) + subtitle (Nunito Sans) + actions slot. Animated entrance.
2. **StatsCardRow.jsx** — 4-card grid using themed Card. Active state with teal left border + tinted glass.
3. **FilterTabBar.jsx** — Pill-style tabs. Active = solid teal fill, white text, border-radius 9999px. Right content slot.
4. **StatusBadge.jsx** — Three variants (type/status/priority). Color mappings per COMPONENT_INVENTORY.md.
5. **KanbanBoard.jsx** — Column layout with glass cards. Unassigned pulse animation. Scroll-area overflow.
6. **TaskDetailDrawer.jsx** — Right-slide drawer with glass surface. Frosted backdrop overlay. Scrollable sections.
7. **DataTable.jsx** — Sortable headers, priority left stripe, hover states, row actions. Unassigned row pulse animation.
8. **AssignmentField.jsx** — Move from `components/ui/` to `components/mojo-patterns/`. Segmented toggle (Person/Role/Unassigned) + user combobox + role dropdown. Update any existing imports.

Each component MUST:
- Import base primitives from `../ui/` (never recreate base components)
- Use only token variables for colors (no raw hex)
- Accept the props defined in COMPONENT_INVENTORY.md
- Include the glass surface treatment where specified
- Export as default

**Gate:** All components import cleanly. `pnpm run lint` and `pnpm run build` pass.

---

### TASK-05: Build the /library Demo Page
**Type:** Frontend Page
**Priority:** 5

Create `frontend/src/pages/Library.jsx` — a dev-only component library page.

**Dev-only gating:** Only render this route when `import.meta.env.DEV === true` or `import.meta.env.VITE_SHOW_LIBRARY === 'true'`. In production builds, the route should not exist or should render nothing.

**CRITICAL:** Read CLAUDE.md "Do Not Touch" section. `pages/index.jsx` is the app router. You MUST add the `/library` route here BUT do NOT alter any existing routes or imports. Add the library route ALONGSIDE existing routes. If you break routing, all existing mojos disappear from the bundle.

**Page structure:**

```
Page title: "Spark Mojo Component Library"
Subtitle: "Design system reference — dev only"
Dark mode toggle in top-right corner (sets data-theme="dark" on document root)

Section: Design Tokens
  - Color swatches: all --sm-* colors with names and hex values
  - Typography samples: Montserrat heading, Nunito Sans body, Inter UI text
  - Spacing scale: visual boxes at each spacing value
  - Glass surface demo: three cards showing blur-sm, blur-md, blur-lg side by side

Section: Base Components (shadcn/ui)
  For each, show a live rendered example with realistic content:
    Button (primary, secondary, destructive, outline, ghost variants)
    Card (with glass treatment visible)
    Badge (all status colors, all type colors per COMPONENT_INVENTORY.md)
    Avatar (teal initials style)
    Input, Textarea, Select (with focus states)
    Checkbox, Switch, Radio
    Dialog (with trigger button that opens it)
    Drawer/Sheet (with trigger button)
    Tabs (pill style, teal active)
    Table (with sample rows)
    Tooltip (hover example)
    Toast (trigger buttons for success/error)
    Skeleton (loading state examples)
    Progress, Slider

Section: Mojo Patterns
  For each, show component name + "Used by: [mojo list]" + live example with mock data:
    MojoHeader (sample icon, title, subtitle, action buttons)
    StatsCardRow (4 cards, one active, sample numbers)
    FilterTabBar (5 tabs, one active, search bar in right slot)
    StatusBadge (all type variants, all status variants, priority stripe demo)
    KanbanBoard (3 columns with sample cards, including one unassigned with pulse)
    DataTable (5 sample rows with all column types, one unassigned row with pulse)
    TaskDetailDrawer (trigger button that opens drawer with sample task data)
    AssignmentField (all three modes shown)

Section: Animation Accents
  - Unassigned row pulse animation (isolated demo)
  - Glass surface hover states
  - MojoHeader entrance animation
```

**Add the route** to `pages/index.jsx` — gated behind the dev-mode check. Add a "Library" link to the sidebar in `pages/Layout.jsx`, also gated behind dev-mode check. DO NOT change any existing routes or sidebar links.

**Gate:**
- `/library` route loads without console errors
- Every component from COMPONENT_INVENTORY.md is visible on the page
- Dark mode toggle works (all surfaces switch between light and dark glass)
- `pnpm run build` passes
- All existing routes still work (OnboardingMojo, WorkboardMojo are still reachable)

---

### TASK-06: Update CLAUDE.md + Final Verification
**Type:** Documentation + Quality Gate
**Priority:** 6

**Part A: Append design system section to CLAUDE.md**

Open `/Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md`. DO NOT delete or modify any existing content. APPEND a new section before the `*Last updated*` line at the bottom:

```markdown
---

## Design System (ADR-2026-03-28)

**Visual North Star:** Ein UI (https://ui.eindev.ir/) — liquid glass aesthetic.
**Light mode is the default** working environment. Dark mode is opt-in via `[data-theme="dark"]`.

### Component Architecture
```
src/components/
├── ui/              ← shadcn/ui base components (themed with glass tokens)
├── charts/          ← shadcn/ui chart components (install when data viz mojos begin)
├── magicui/         ← Magic UI animation accents (selective use only)
├── mojo-patterns/   ← Spark Mojo composite patterns
└── mojos/           ← Individual mojo implementations
```

### Design System Rules
1. All mojos MUST import from `components/ui/`, `components/charts/`, or `components/mojo-patterns/`. Never create custom implementations of shared components.
2. All colors MUST reference design tokens (`var(--sm-teal)`), never raw hex values in component files.
3. All typography MUST use the token font stack: Montserrat (display), Nunito Sans (body), Inter (UI controls).
4. All surface components MUST use liquid glass treatment from `styles/tokens.css`.
5. New shared components require a COMPONENT_INVENTORY.md entry before implementation.
6. Magic UI components are accent only — they enhance, never replace base components.

### Key Files
- `frontend/src/styles/tokens.css` — all design tokens (colors, glass, typography, spacing)
- `ADR-design-system.md` — architecture decision record
- `COMPONENT_INVENTORY.md` — component catalog with props and specs
- `frontend/src/pages/Library.jsx` — dev-only component showcase (visible in dev mode only)
```

Also update the "Repo Structure" section in CLAUDE.md to reflect the new directories (`mojo-patterns/`, `styles/`).

Update the `*Last updated*` line to today's date.

**Part B: Run all gates in sequence:**
1. `cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend && pnpm run lint` — must exit 0
2. `cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend && pnpm run build` — must exit 0
3. Verify `src/styles/tokens.css` exists and contains all token categories
4. Verify `src/components/mojo-patterns/` contains all 8 pattern files
5. Verify `src/pages/Library.jsx` exists and imports all pattern components
6. Verify existing routes still work — `pages/index.jsx` still imports OnboardingMojo and WorkboardMojo

If all pass: commit and output LOOP_COMPLETE.
If any fail: fix the issue, re-run gates.

---

## Completion
When all tasks complete:
1. `git add -A`
2. `git commit -m "feat: design system foundation — shadcn/ui + glass tokens + mojo patterns + library page"`
3. Write NIGHT1-COMPLETE.md summarizing what was built
4. Output: LOOP_COMPLETE
