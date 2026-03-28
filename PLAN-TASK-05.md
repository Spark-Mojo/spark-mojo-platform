# PLAN-TASK-05: Build the /library Demo Page

## Task
Create `frontend/src/pages/Library.jsx` — a dev-only component library page showcasing all design tokens, base components, and mojo pattern components.

## Dependencies
- TASK-01 (tokens.css) ✅
- TASK-02 (shadcn/ui installed) ✅
- TASK-03 (glass theming) ✅
- TASK-04 (mojo-patterns) ✅

## Files to Create
1. `/Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/pages/Library.jsx` — Full component library page

## Files to Modify
2. `/Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/pages/index.jsx` — Add `/library` route (dev-only gated), DO NOT alter existing routes
3. `/Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/pages/Layout.jsx` — Add "Library" sidebar link (dev-only gated), DO NOT alter existing nav items

## Implementation Details

### Library.jsx Structure
The page has 4 sections:

**Section 1: Design Tokens**
- Color swatches: all `--sm-*` brand colors with name + hex
- Typography samples: Montserrat heading, Nunito Sans body, Inter UI
- Spacing scale: visual boxes at each spacing value
- Glass surface demo: 3 cards showing blur-sm, blur-md, blur-lg

**Section 2: Base Components (shadcn/ui)**
- Button (primary, secondary, destructive, outline, ghost)
- Card (glass treatment)
- Badge (status + type colors per COMPONENT_INVENTORY.md)
- Avatar (teal initials)
- Input, Textarea, Select (with placeholders)
- Checkbox, Switch, Radio
- Dialog (with trigger button)
- Drawer/Sheet (with trigger button)
- Tabs (pill style, teal active)
- Table (sample rows)
- Tooltip (hover example)
- Toast (trigger buttons)
- Skeleton (loading state)
- Progress, Slider

**Section 3: Mojo Patterns**
Each pattern: name + "Used by" list + live example with mock data
- MojoHeader, StatsCardRow, FilterTabBar, StatusBadge
- KanbanBoard, DataTable, TaskDetailDrawer, AssignmentField

**Section 4: Animation Accents**
- Unassigned row pulse animation
- Glass hover states
- MojoHeader entrance animation

### Route Integration
- `index.jsx`: Add lazy import + route for `/library`, gated behind `import.meta.env.DEV || import.meta.env.VITE_SHOW_LIBRARY === 'true'`
- `Layout.jsx`: Add "Library" item to sidebar nav, gated behind same dev check
- Both additions are ADDITIVE ONLY — no existing code modified

### Dev-Only Gating
- Route only renders when `import.meta.env.DEV === true` or `VITE_SHOW_LIBRARY === 'true'`
- In production builds, the route returns null / doesn't exist
- Sidebar link only shows in dev mode

### Dark Mode Toggle
- Top-right toggle button
- Sets `document.documentElement.setAttribute('data-theme', 'dark')` on toggle
- Resets to remove attribute (light mode default)

## Quality Gates
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend
pnpm run lint    # must exit 0
pnpm run build   # must exit 0
```

- `/library` route loads without console errors
- Every component from COMPONENT_INVENTORY.md visible
- Dark mode toggle works
- Existing routes (OnboardingMojo, WorkboardMojo) still work
- `pages/index.jsx` still imports OnboardingMojo and WorkboardMojo
