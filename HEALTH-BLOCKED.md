# HEALTH-BLOCKED

## Date: 2026-03-26 (Session 5)

## Failing Gate: `pnpm run build`

```
vite v6.4.1 building for production...
✗ Build failed in 417ms
error during build:
[vite]: Rollup failed to resolve import "frappe-react-sdk" from "frontend/src/App.jsx".
```

`App.jsx` imports `frappe-react-sdk` which is not installed as a dependency. This package is typically available when the frontend runs inside a Frappe bench context. The standalone Vite build cannot resolve it.

## Suggested Fix

Either:
1. Add `frappe-react-sdk` to `package.json` devDependencies, or
2. Add `"frappe-react-sdk"` to `build.rollupOptions.external` in `vite.config.js`

## Passing Gates

- `pnpm run lint` — PASS (0 errors, 0 warnings)
- Python imports (`fastapi`, `httpx`) — PASS
