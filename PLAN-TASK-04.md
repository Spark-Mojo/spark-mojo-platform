# PLAN — TASK-04: Build Mojo Pattern Components

## Task
Create `frontend/src/components/mojo-patterns/` directory and build 8 composite components from COMPONENT_INVENTORY.md specs.

## Dependencies
- TASK-01 (tokens.css) ✓
- TASK-02 (shadcn/ui installed) ✓
- TASK-03 (glass theming) ✓

## Files to Create

| # | File | Description |
|---|------|-------------|
| 1 | `frontend/src/components/mojo-patterns/MojoHeader.jsx` | Icon + title (Montserrat 600) + subtitle (Nunito Sans) + actions slot. Animated entrance (fade + slide up). |
| 2 | `frontend/src/components/mojo-patterns/StatsCardRow.jsx` | 4-card grid using themed Card. Active = teal left border + tinted glass. Responsive 4→2→1 columns. |
| 3 | `frontend/src/components/mojo-patterns/FilterTabBar.jsx` | Pill tabs. Active = solid teal fill, white text, radius 9999px. Right content slot. |
| 4 | `frontend/src/components/mojo-patterns/StatusBadge.jsx` | Three variants (type/status/priority). Color mappings per COMPONENT_INVENTORY.md. |
| 5 | `frontend/src/components/mojo-patterns/KanbanBoard.jsx` | Column layout with glass cards. Unassigned pulse animation. ScrollArea overflow. |
| 6 | `frontend/src/components/mojo-patterns/TaskDetailDrawer.jsx` | Right-slide drawer with glass surface. Frosted backdrop. Scrollable sections. Sticky footer. |
| 7 | `frontend/src/components/mojo-patterns/DataTable.jsx` | Sortable headers, priority left stripe, hover states, row actions. Unassigned row pulse. |
| 8 | `frontend/src/components/mojo-patterns/AssignmentField.jsx` | Move from `components/ui/`. See conflict resolution below. |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/ui/AssignmentField.jsx` | Replace contents with re-export from `../mojo-patterns/AssignmentField` so WorkboardMojo.jsx import still works (guardrail 1004: cannot modify WorkboardMojo.jsx). |

## Conflict Resolution: AssignmentField Move

The spec says move AssignmentField from `ui/` to `mojo-patterns/`. But WorkboardMojo.jsx imports from `@/components/ui/AssignmentField` and guardrail 1004 prohibits modifying WorkboardMojo.jsx.

**Resolution:** Move the actual implementation to `mojo-patterns/AssignmentField.jsx`. Replace `ui/AssignmentField.jsx` with a one-line re-export: `export { default } from '../mojo-patterns/AssignmentField'`. This preserves the existing import path while moving canonical code to the right location.

## Component Rules (from COMPONENT_INVENTORY.md)
- All colors via `var(--sm-*)` tokens — NO raw hex
- Import base primitives from `../ui/` — never recreate
- Accept props defined in COMPONENT_INVENTORY.md
- Include glass surface treatment where specified
- Export as default

## Gate Commands
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend
pnpm run lint    # Must exit 0
pnpm run build   # Must exit 0
```
- Verify 8 files exist in `src/components/mojo-patterns/`
- Verify no raw hex in new component files
- Verify existing WorkboardMojo import still resolves
