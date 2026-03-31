# PLAN — STORY-DS-002: Semantic Token Rename

## Summary
Mechanical find/replace renaming brand-specific token names to semantic role names:
- `--sm-teal` → `--sm-primary`
- `--sm-coral` → `--sm-danger`
- `--sm-gold` → `--sm-warning`
- `--sm-glass-teal` → `--sm-glass-primary`
- `--sm-glass-coral` → `--sm-glass-danger`
- `--sm-glass-gold` → `--sm-glass-warning`

Also rename Tailwind-style class references:
- `text-sm-teal` → `text-[var(--sm-primary)]`
- `bg-sm-teal` → `bg-[var(--sm-primary)]`
- `bg-sm-teal/90` → `bg-[var(--sm-primary)]/90` (or equivalent)

And string references in data structures:
- `'teal'` / `'coral'` / `'gold'` color keys in StatsCardRow COLOR_MAP and StatsCard variants

## Files to Modify (12 files)

### 1. `frontend/src/styles/tokens.css`
- Rename `--sm-teal` → `--sm-primary` (line 13)
- Rename `--sm-coral` → `--sm-danger` (line 14)
- Rename `--sm-gold` → `--sm-warning` (line 15)
- Update all internal references (`--sm-priority-high`, `--sm-status-ready`, etc.)
- Rename `--sm-glass-teal/coral/gold` → `--sm-glass-primary/danger/warning` (lines 70-72, 132-134)
- Update keyframe animation references (lines 181-182)

### 2. `frontend/src/pages/Library.jsx`
- Update color swatch data (lines 232-234)
- Update inline style references (line 493, 1319)

### 3. `frontend/src/components/mojos/WorkboardMojo.jsx`
- ~50 references to `sm-teal`, `sm-coral`, `sm-gold` and glass variants
- All are CSS var() references in className or style props

### 4. `frontend/src/components/mojo-patterns/FilterTabBar.jsx`
- 3 references to `sm-teal`

### 5. `frontend/src/components/mojo-patterns/StatsCard.jsx`
- variant map: `teal`/`coral`/`gold` keys with glass/color values

### 6. `frontend/src/components/mojo-patterns/MojoHeader.jsx`
- 1 reference to `sm-teal`

### 7. `frontend/src/components/mojo-patterns/AssignmentField.jsx`
- 7 references to `sm-teal`, `sm-coral`, `sm-glass-teal`

### 8. `frontend/src/components/mojo-patterns/StatsCardRow.jsx`
- COLOR_MAP keys: `teal`/`coral`/`gold`
- References to `sm-teal`, `sm-glass-teal`

### 9. `frontend/src/components/mojo-patterns/StatusBadge.jsx`
- Style map: `sm-teal`, `sm-gold`, `sm-coral`

### 10. `frontend/src/components/mojo-patterns/DataTable.jsx`
- 3 references to `sm-teal`, `sm-coral`, `sm-glass-teal`

### 11. `frontend/src/components/Auth.jsx`
- Uses Tailwind-style `text-sm-teal`, `bg-sm-teal` — convert to token-mapped `text-[var(--sm-primary)]`, `bg-[var(--sm-primary)]`

### 12. `frontend/src/components/COMPONENT_INVENTORY.md`
- Update token references in documentation

## Rename Strategy

1. Start with `tokens.css` — the source of truth
2. Then bulk rename in all component files using replace_all
3. Handle special cases (Auth.jsx Tailwind classes, StatsCard/StatsCardRow variant keys)
4. Update COMPONENT_INVENTORY.md

## Gates
1. `grep -rn "sm-teal\|sm-coral\|sm-gold" frontend/src/` → **0 matches**
2. `grep -rn "sm-primary\|sm-danger\|sm-warning" frontend/src/styles/tokens.css` → **≥6 matches**
3. `cd frontend && pnpm run build` → exit 0

## Branch
`design-system/ds-002-semantic-token-rename`

## Commit
`refactor: rename color tokens to semantic roles — teal→primary, coral→danger, gold→warning`
