# PLAN — STORY-012: Token Compliance Retrofit

## Summary
Replace ALL hardcoded hex colors and Tailwind color classes in `StatsCard.jsx` and `WorkboardMojo.jsx` with `var(--sm-*)` design token references. Visual output must remain unchanged.

## Scope Assessment

**StatsCard.jsx** (34 lines) — straightforward:
- Replace `color` prop with `variant` prop (teal/coral/gold/slate)
- Replace Tailwind color classes with inline styles using tokens
- Replace card wrapper classes with token equivalents

**WorkboardMojo.jsx** (~1800 lines) — extensive:
- 3 color constant objects (TYPE_COLORS, TYPE_BADGE_STYLES, STATUS_COLORS) — spec calls out explicitly
- PRIORITY_STRIPE — 4 hardcoded hex values (#E53935, #FF6F61, #FFB300, #B0BEC5)
- PRIORITY_COLORS — 4 Tailwind classes (bg-red-500, bg-orange-400, bg-amber-400, bg-gray-400)
- ~60+ inline hex color references scattered through JSX (border colors, bg colors, text colors, SVG strokes)
- ~20+ Tailwind color class violations (bg-teal-*, text-teal-*, bg-amber-*, bg-orange-*, etc.)
- CSS keyframe animations with hardcoded hex (pulse animations ~lines 1674-1693)
- SVG elements with hardcoded strokes/fills

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/styles/tokens.css` | Add missing tokens: `--sm-status-inprogress-bg`, `--sm-status-completed-bg`, `--sm-status-new-bg`, `--sm-status-waiting-bg`, `--sm-status-blocked-bg`, `--sm-status-failed-bg`, `--sm-status-canceled-bg` |
| `frontend/src/components/mojo-patterns/StatsCard.jsx` | Full rewrite: variant prop, token-based styles |
| `frontend/src/components/mojos/WorkboardMojo.jsx` | Replace ALL hex + Tailwind color classes with token refs |
| `frontend/src/pages/Library.jsx` | Update StatsCard demo (color→variant prop) |
| `frontend/src/components/COMPONENT_INVENTORY.md` | Update StatsCard row (new prop name, remove compliance flag) |

## Detailed Change Plan

### Part 1: tokens.css additions

Add to `:root`:
```css
/* Status background tints */
--sm-status-new-bg: var(--sm-surface-muted);
--sm-status-ready-bg: var(--sm-glass-teal);
--sm-status-inprogress-bg: rgba(30, 136, 229, 0.10);
--sm-status-completed-bg: rgba(67, 160, 71, 0.10);
--sm-status-waiting-bg: var(--sm-glass-gold);
--sm-status-blocked-bg: var(--sm-glass-coral);
--sm-status-failed-bg: var(--sm-glass-coral);
--sm-status-canceled-bg: var(--sm-surface-muted);
```

Add dark mode overrides in `[data-theme="dark"]`:
```css
--sm-status-inprogress-bg: rgba(30, 136, 229, 0.12);
--sm-status-completed-bg: rgba(67, 160, 71, 0.12);
```

### Part 2: StatsCard.jsx rewrite

- Rename `color` prop to `variant` (default: `teal`)
- Replace `colorClasses` map with `iconStyles` map using inline styles
- Card wrapper: replace `bg-white border-slate-100 shadow-sm` with token-based inline styles
- Text elements: replace `text-slate-*` classes with token-based inline styles

Mapping: emerald→teal, blue→slate (or a new neutral), purple→coral, amber→gold

### Part 3: WorkboardMojo.jsx — Color Constants

**TYPE_COLORS** (line 187): Used at line 749 (drawer). Replace Tailwind classes with inline style objects using tokens, OR convert the line 749 usage to use TYPE_BADGE_STYLES instead (they serve the same purpose).

**TYPE_BADGE_STYLES** (line 193): Replace hex with token refs per story spec.

**STATUS_COLORS** (line 199): Replace hex with token refs per story spec.

**PRIORITY_STRIPE** (line 210): Replace hex with `var(--sm-priority-*)` tokens (already defined in tokens.css).

**PRIORITY_COLORS** (line 217): Replace Tailwind classes with inline style approach using `var(--sm-priority-*)` tokens.

### Part 4: WorkboardMojo.jsx — Inline Hex Replacements

Systematic mapping for all inline hex values:

| Hex | Token Reference |
|-----|----------------|
| `#006666` | `var(--sm-teal)` |
| `#34424A` | `var(--sm-slate)` |
| `#F8F9FA` | `var(--sm-offwhite)` |
| `#FF6F61` | `var(--sm-coral)` |
| `#FFB300` | `var(--sm-gold)` |
| `#B0BEC5` | `var(--sm-priority-low)` |
| `#E53935` | `var(--sm-priority-urgent)` |
| `#E2E8EB` | `var(--sm-control-border)` — close match to existing border token |
| `#6B7A84` | `var(--sm-text-muted)` — close equivalent |
| `#94A3B8` | `var(--sm-text-placeholder)` — close equivalent |
| `#F0F4F5` | `var(--sm-surface-muted)` — close equivalent |
| `#B45309` | `var(--sm-gold)` — used for warning/review text |

### Part 5: WorkboardMojo.jsx — Tailwind Class Replacements

All `bg-teal-*`, `text-teal-*`, `bg-amber-*`, `bg-orange-*`, `bg-red-*`, `bg-gray-*` classes need to be converted to inline styles or token-mapped Tailwind utilities like `bg-[var(--sm-teal)]`.

Key patterns:
- `bg-teal-600` → `bg-[var(--sm-teal)]`
- `text-teal-600` / `text-teal-700` → `text-[var(--sm-teal)]`
- `bg-teal-50` / `bg-teal-100` → `bg-[var(--sm-glass-teal)]`
- `bg-gray-50/100` → `bg-[var(--sm-surface-muted)]`
- `text-gray-600` → `text-[var(--sm-text-muted)]`
- `border-gray-200` → `border-[var(--sm-control-border)]`
- `bg-gray-900` → `bg-[var(--sm-slate)]`

### Part 6: CSS Keyframe Animations (lines 1674-1693)

Replace hex in `@keyframes` embedded in JSX style tag:
- `#ffffff` → use token or keep as pure white (acceptable for animation)
- `#fff0ee` → `var(--sm-glass-coral)` equivalent rgba
- `#fff8e6` → `var(--sm-glass-gold)` equivalent rgba
- `#FF6F61` → `var(--sm-coral)`
- `#FFB300` → `var(--sm-gold)`

Note: CSS keyframes in inline `<style>` tags CAN use `var()` — this works.

### Part 7: SVG Elements (line ~1701)

Replace hardcoded `stroke="#006666"` with `stroke="var(--sm-teal)"` or `stroke="currentColor"` (since parent sets color).

## Tokens That May Need Adding

Check if these exist in tokens.css before adding:
- `--sm-status-inprogress-bg` — MISSING, add
- `--sm-status-completed-bg` — MISSING, add
- Additional status bg tokens for consistency

## Gates (exact commands from spec)

```bash
# Gate 1: No Tailwind color classes in StatsCard
grep -rn 'bg-emerald\|bg-blue\|bg-purple\|bg-amber\|bg-teal-\|text-teal-\|text-amber-\|text-orange-' frontend/src/components/mojo-patterns/StatsCard.jsx
# Expected: 0 results

# Gate 2: No hex colors in WorkboardMojo
grep -rn '#[0-9a-fA-F]\{6\}' frontend/src/components/mojos/WorkboardMojo.jsx
# Expected: 0 results

# Gate 3: No Tailwind color classes in WorkboardMojo
grep -rn 'bg-teal\|text-teal\|bg-amber\|text-amber\|bg-orange\|text-orange' frontend/src/components/mojos/WorkboardMojo.jsx
# Expected: 0 results

# Gate 4: Build passes
cd frontend && pnpm run build
# Expected: exit 0
```

## Risk Assessment

- **High risk:** WorkboardMojo is a large, production file. Changing ~80 color references could break visual rendering if any mapping is wrong.
- **Mitigation:** Map every hex to its closest token, ensure dark mode tokens exist for all new additions.
- **CSS var() in Tailwind bracket notation** `bg-[var(--sm-teal)]` is supported in Tailwind v3+.
- **Inline styles vs classes:** For color constants (TYPE_BADGE_STYLES, STATUS_COLORS), inline styles using `var()` is the correct approach since these are already style objects.

## Execution Order

1. Add new tokens to `tokens.css` (both light and dark mode)
2. Fix StatsCard.jsx (small, contained)
3. Fix WorkboardMojo.jsx color constants (TYPE_COLORS, TYPE_BADGE_STYLES, STATUS_COLORS, PRIORITY_STRIPE, PRIORITY_COLORS)
4. Fix WorkboardMojo.jsx inline hex values (systematic pass)
5. Fix WorkboardMojo.jsx Tailwind color classes (systematic pass)
6. Fix WorkboardMojo.jsx keyframe animations and SVG
7. Update Library.jsx StatsCard demo
8. Update COMPONENT_INVENTORY.md
9. Run all gates
