# HEALTH-BLOCKED

## Date: 2026-03-26

## Failing Gate: `pnpm run lint`

ESLint exits with code 1. Errors are in two folders that should be excluded from linting:

### 1. `src/components/desktop/` (Folder.jsx, Taskbar.jsx, Widget.jsx)
- `no-unused-vars` (React import, unused icons)
- `react/prop-types` (all props missing validation)

### 2. `src/components/ui/` (shadcn/Radix UI primitives — many files)
- `react/prop-types` on all forwarded-ref components
- `react-refresh/only-export-components` warnings

These folders are not application code — `desktop/` contains pre-migration desktop components and `ui/` contains generated shadcn/Radix primitives. Neither should be linted.

## Fix

Add these two lines to the `ignores` array in `frontend/eslint.config.js`:

```js
'src/components/desktop/**',
'src/components/ui/**',
```

This matches the pattern already used for other legacy folders (commit 39452d1).

## Other Gates (not reached)
- `pnpm run build` — not tested (blocked by lint)
- Python imports — not tested
