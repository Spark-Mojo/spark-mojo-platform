# PLAN — STORY-013: AnimatedThemeToggler

## Dependency
- STORY-011: ✅ COMPLETE (marker exists)

## Files to Create
1. `frontend/src/components/magicui/animated-theme-toggler.jsx`
   - Manual copy from Magic UI GitHub source
   - Convert to JSX (no TypeScript)
   - Wire to `document.documentElement.dataset.theme` mechanism

## Files to Modify
2. `frontend/src/pages/Library.jsx`
   - Import `AnimatedThemeToggler` from `@/components/magicui/animated-theme-toggler`
   - Replace the existing dark/light mode `<Button>` toggle (lines 425–433) with `<AnimatedThemeToggler />`
   - Add "Universal Components" section BEFORE "Base Components" section
   - Demo the toggle with description and props listing
   - Remove `Sun`, `Moon` from lucide imports if no longer used elsewhere

3. `frontend/src/components/COMPONENT_INVENTORY.md`
   - Add row: `| AnimatedThemeToggler.jsx | magicui | className, duration | --sm-glass-* (indirectly via theme) | ✅ | Universal — use everywhere theme toggle is needed |`

## Tokens to Add
- None — existing theme tokens handle dark mode

## Implementation Notes
- Magic UI AnimatedThemeToggler source must be fetched from GitHub
- Component likely uses framer-motion or CSS animations — check deps
- Must use `[data-theme="dark"]` attribute, NOT class-based dark mode
- Must preserve existing `darkMode` state + `toggleDarkMode` function logic
- Optional localStorage persistence is acceptable

## Gates
1. `ls frontend/src/components/magicui/animated-theme-toggler.jsx` — file exists
2. Old text-based toggle buttons removed from Library.jsx
3. COMPONENT_INVENTORY.md has AnimatedThemeToggler row
4. `cd frontend && pnpm run build` — exit 0

## Commit
`feat(design-system): STORY-013 AnimatedThemeToggler universal component`
