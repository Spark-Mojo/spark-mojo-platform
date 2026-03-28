# PLAN-TASK-03: Theme All Surface Components with Glass Tokens

## Task
Apply Spark Mojo liquid glass treatment to every shadcn/ui surface component. Apply brand tokens to all interactive components. Light-mode-first: glass surfaces are frosted WHITE on a light canvas.

## Dependencies
- TASK-01 (tokens.css) — COMPLETE
- TASK-02 (shadcn/ui init) — COMPLETE

## Approach

shadcn/ui components currently use Tailwind's CSS variable system (`bg-card`, `bg-background`, `bg-primary`, etc.). Two-pronged approach:

### 1. Bridge shadcn CSS variables → SM tokens (in `index.css` or `tokens.css`)
Map shadcn's built-in CSS variables to our `--sm-*` tokens so that Tailwind utility classes like `bg-primary` automatically resolve to our brand colors:
```css
:root {
  --background: var(--sm-offwhite);
  --foreground: var(--sm-slate);
  --primary: var(--sm-teal);
  --primary-foreground: #ffffff;
  --destructive: var(--sm-coral);
  /* etc. */
}
```
This handles Button, Badge, and other components that use `bg-primary`, `bg-destructive`, etc.

### 2. Direct component modifications for glass surfaces
Surface components (Card, Dialog, Drawer, Popover, etc.) need `backdrop-filter: blur()` and translucent backgrounds that Tailwind CSS variables alone can't provide. These get inline style or custom class modifications directly in the component files.

## Files to Modify

### CSS Bridge (1 file)
1. **`frontend/src/styles/tokens.css`** — Add shadcn CSS variable bridge section mapping `--background`, `--foreground`, `--primary`, `--destructive`, `--muted`, `--accent`, `--border`, `--ring`, `--card`, etc. to SM tokens. Include dark mode overrides in `[data-theme="dark"]`.

### Surface Components — Glass Treatment (10 files)
2. **`frontend/src/components/ui/card.jsx`** — glass-bg, glass-border, backdrop-blur-md, shadow-card
3. **`frontend/src/components/ui/dialog.jsx`** — glass surface on content, overlay-modal backdrop
4. **`frontend/src/components/ui/drawer.jsx`** — glass surface, overlay-drawer backdrop
5. **`frontend/src/components/ui/sheet.jsx`** — glass surface, overlay-drawer backdrop
6. **`frontend/src/components/ui/popover.jsx`** — glass surface, blur-md
7. **`frontend/src/components/ui/tooltip.jsx`** — glass surface, blur-sm
8. **`frontend/src/components/ui/dropdown-menu.jsx`** — glass surface, blur-md
9. **`frontend/src/components/ui/context-menu.jsx`** — glass surface, blur-md
10. **`frontend/src/components/ui/hover-card.jsx`** — glass surface, blur-md
11. **`frontend/src/components/ui/alert-dialog.jsx`** — glass surface + modal overlay
12. **`frontend/src/components/ui/navigation-menu.jsx`** — glass surface for dropdown panels

### Interactive Components — Brand Tokens (11 files)
13. **`frontend/src/components/ui/button.jsx`** — primary=sm-teal, destructive=sm-coral (handled via CSS bridge)
14. **`frontend/src/components/ui/input.jsx`** — glass-bg background, teal focus ring
15. **`frontend/src/components/ui/textarea.jsx`** — glass-bg background, teal focus ring
16. **`frontend/src/components/ui/select.jsx`** — glass-bg background, teal focus ring
17. **`frontend/src/components/ui/checkbox.jsx`** — teal checked state
18. **`frontend/src/components/ui/switch.jsx`** — teal checked state
19. **`frontend/src/components/ui/radio-group.jsx`** — teal checked state
20. **`frontend/src/components/ui/tabs.jsx`** — active tab teal with pill style
21. **`frontend/src/components/ui/badge.jsx`** — status/type color variants
22. **`frontend/src/components/ui/avatar.jsx`** — teal background, white text
23. **`frontend/src/components/ui/progress.jsx`** — teal fill
24. **`frontend/src/components/ui/slider.jsx`** — teal track

## Glass Treatment Pattern
For each surface component, replace opaque bg classes with:
```jsx
style={{
  background: 'var(--sm-glass-bg)',
  borderColor: 'var(--sm-glass-border)',
  backdropFilter: `blur(var(--sm-glass-blur-md))`,
  WebkitBackdropFilter: `blur(var(--sm-glass-blur-md))`,
  boxShadow: 'var(--sm-shadow-card)',
}}
```
Or add equivalent Tailwind arbitrary value classes where possible.

## Rules
- NO raw hex values in component files
- All colors via var(--sm-*) tokens
- NO bg-white — use var(--sm-glass-bg) for surfaces
- NO hardcoded backdrop-blur values — use var(--sm-glass-blur-*) tokens
- Typography: var(--sm-font-ui) default, var(--sm-font-display) for titles only

## Gate Commands
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/frontend
pnpm run lint    # exit 0, 0 warnings
pnpm run build   # exit 0
```

Post-build verification: grep for raw hex values in active style properties in `src/components/ui/` — only allowed in comments or string constants.
