# PLAN — STORY-011: COMPONENT_INVENTORY + fill /library to 100%

## Objective
Create COMPONENT_INVENTORY.md cataloging every component in `ui/` and `mojo-patterns/`. Fill the /library page to 100% coverage. Relocate StatsCard.jsx from `ui/` to `mojo-patterns/` (it's a composite pattern, not a base primitive).

## Pre-Conditions
- No dependencies on prior stories
- Icon\r junk files already cleaned (commit 7cca1d1)

---

## Files to Create

### 1. `frontend/src/components/COMPONENT_INVENTORY.md`
Markdown table with columns: Component | Location | Type (base/pattern) | Props | Variants | Token Usage | Used By (mojos)

Must include a row for every file in `ui/` and `mojo-patterns/`.

**ui/ components (51 files):**
accordion, alert-dialog, alert, aspect-ratio, AssignmentField (re-export shim after move), avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, StatsCard (re-export shim after move), switch, table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip, use-toast

**mojo-patterns/ components (8 → 9 files after StatsCard move):**
AssignmentField, DataTable, FilterTabBar, KanbanBoard, MojoHeader, StatsCard (moved here), StatsCardRow, StatusBadge, TaskDetailDrawer

---

## Files to Modify

### 2. Relocate StatsCard.jsx: `ui/` → `mojo-patterns/`
- **Copy** `frontend/src/components/ui/StatsCard.jsx` → `frontend/src/components/mojo-patterns/StatsCard.jsx`
- **Replace** `frontend/src/components/ui/StatsCard.jsx` with a re-export shim:
  ```jsx
  // Re-export from canonical location (mojo-patterns/)
  // Shim kept for backwards-compatibility with existing imports
  export { default } from '@/components/mojo-patterns/StatsCard';
  ```
- **Verify** existing imports still work: `pages/Clients.jsx` and `pages/Dashboard.jsx` both import from `@/components/ui/StatsCard`

### 3. `frontend/src/pages/Library.jsx` — Fill to 100% coverage

**Currently showcased (20 base + 8 patterns = 28 components):**

Base UI (20): Button, Card, Badge, Avatar, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Label, Dialog, Sheet, Tabs, Table, Tooltip, Skeleton, Progress, Slider, Separator

Mojo Patterns (8): MojoHeader, StatsCardRow, FilterTabBar, StatusBadge, KanbanBoard, DataTable, TaskDetailDrawer, AssignmentField

**Must ADD to Library — Base UI (~29 missing):**

These are shadcn components that exist in `ui/` but have no Library showcase. Many are utility/internal components (form, use-toast, toaster, sonner) that don't need visual demos — just a mention or minimal render. Group by complexity:

**Visual demos needed (high-priority, user-facing components):**
1. Accordion
2. Alert
3. AlertDialog
4. Breadcrumb
5. Calendar
6. Carousel
7. Collapsible
8. Command (command palette)
9. ContextMenu
10. Drawer
11. DropdownMenu
12. HoverCard
13. InputOTP
14. Menubar
15. NavigationMenu
16. Pagination
17. Popover
18. Resizable
19. ScrollArea
20. Toggle / ToggleGroup

**Minimal/reference-only (internal utilities):**
21. AspectRatio (simple wrapper)
22. Chart (data viz wrapper)
23. Form (react-hook-form wrapper)
24. Sidebar (layout component)
25. Sonner (toast alternative)
26. Toast / Toaster / useToast (notification system)

**Must ADD to Library — Mojo Patterns (1):**
27. StatsCard (individual card, after relocation to mojo-patterns/)

**Approach:** Add subsections for each missing component with at minimum a rendered example. Group internal/utility components in a "Utility Components" subsection with descriptions but minimal demos where visual rendering is impractical.

### 4. No other files need modification

---

## Token Additions
None required for STORY-011 (token work is STORY-012).

---

## Quality Gates (run in order)

```bash
# Gate 1: Build passes
cd frontend && pnpm run build

# Gate 2: No new hex colors in Library.jsx (pre-existing OK)
grep -rn '#[0-9a-fA-F]\{6\}' frontend/src/pages/Library.jsx
# Compare against baseline — no NEW lines

# Gate 3: StatsCard.jsx in ui/ is re-export shim only
cat frontend/src/components/ui/StatsCard.jsx
# Must be 2-3 lines, re-export only

# Gate 4: StatsCard.jsx in mojo-patterns/ has full component
cat frontend/src/components/mojo-patterns/StatsCard.jsx
# Must have the full framer-motion component

# Gate 5: COMPONENT_INVENTORY.md exists with row for every component
cat frontend/src/components/COMPONENT_INVENTORY.md
# Must have rows for all 51 ui/ + 9 mojo-patterns/ components

# Gate 6: Lint passes
cd frontend && pnpm run lint
```

---

## Estimated Scope
- 3 files to modify (StatsCard ui/ shim, StatsCard mojo-patterns/ new, Library.jsx)
- 1 file to create (COMPONENT_INVENTORY.md)
- ~400-600 lines added to Library.jsx for missing component demos
- Branch: `story/STORY-011-component-inventory-library`
- Commit: `feat(design-system): STORY-011 COMPONENT_INVENTORY + fill /library to 100%`
