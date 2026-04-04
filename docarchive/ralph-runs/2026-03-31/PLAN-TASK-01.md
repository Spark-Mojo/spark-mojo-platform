# PLAN — TASK-01: Create Design Token System

## Task
Create `frontend/src/styles/tokens.css` with the full token set from ADR-design-system.md and COMPONENT_INVENTORY.md. Import it in the app's main CSS entry point.

## Dependencies
None — this is the foundation task.

## Files to Create or Modify

| Action | Absolute Path |
|--------|---------------|
| **Create** | `/Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/styles/tokens.css` |
| **Modify** | `/Users/jamesilsley/GitHub/spark-mojo-platform/frontend/src/index.css` (add `@import './styles/tokens.css';` at top) |

## Token Categories (from COMPONENT_INVENTORY.md Appendix)

1. **Brand colors** — `--sm-teal`, `--sm-coral`, `--sm-gold`, `--sm-offwhite`, `--sm-slate`
2. **Priority colors** — `--sm-priority-urgent/high/medium/low`
3. **Status colors** — `--sm-status-new/ready/inprogress/waiting/blocked/completed/canceled`
4. **Typography** — `--sm-font-display` (Montserrat), `--sm-font-body` (Nunito Sans), `--sm-font-ui` (Inter)
5. **Spacing** — `--sm-space-1` through `--sm-space-8` (base 4px)
6. **Radius** — `--sm-radius-sm/md/lg/pill`
7. **Shadows** — `--sm-shadow-card/drawer/modal`
8. **Glass surfaces** — `--sm-glass-bg`, `--sm-glass-bg-hover`, `--sm-glass-bg-active`, `--sm-glass-border`, `--sm-glass-border-strong`, `--sm-glass-blur-sm/md/lg/xl`
9. **Glass tints** — `--sm-glass-teal/coral/gold`
10. **Overlays** — `--sm-overlay-drawer/modal/blur`
11. **Dark mode** — `[data-theme="dark"]` block swapping offwhite, slate, glass-bg, glass-border, glass-blur values
12. **Unassigned pulse animations** — `@keyframes pulse-unassigned-bg` and `pulse-unassigned-border`

## Dark Mode Values (from ADR)

```css
[data-theme="dark"] {
  --sm-offwhite: #0f1117;
  --sm-slate: #e8eaed;
  --sm-glass-bg: rgba(255, 255, 255, 0.06);
  --sm-glass-border: rgba(255, 255, 255, 0.10);
  --sm-glass-blur-md: 24px;
  /* brand colors stay the same */
}
```

## Integration

Add to top of `index.css` (before `@tailwind` directives):
```css
@import './styles/tokens.css';
```

## Gate Commands

```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend
pnpm run build   # Must exit 0
```

Verify tokens accessible: any component can use `var(--sm-teal)` etc.

## Notes
- `src/styles/` directory does not exist yet — create it
- shadcn/ui components are already installed in `src/components/ui/`
- Do NOT modify any existing shadcn component files in this task
- The feature branch `feature/design-system-foundation` needs to be created from main
