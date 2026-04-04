# PLAN — STORY-HOT-001: Remove /library Production Guard

## Summary
Remove the `showLibrary` guard from `frontend/src/pages/index.jsx` so the `/library`
route is unconditionally available in all environments (dev, staging, production).

## Dependencies
None — this is the first story in the queue.

## Files to Modify

### 1. `frontend/src/pages/index.jsx`
- **Remove line 12:** `const showLibrary = import.meta.env.DEV || import.meta.env.VITE_SHOW_LIBRARY === 'true';`
- **Replace lines 25-34** (the conditional `{showLibrary && (...)}` block) with an unconditional `<Route>`:
  ```jsx
  <Route
    path="/library"
    element={
      <Suspense fallback={<div className="p-8 text-gray-400">Loading library...</div>}>
        <LibraryPage />
      </Suspense>
    }
  />
  ```
- No other files need changes.

## Files to Create
None.

## Tokens to Add
None.

## Quality Gates
1. `grep -n "showLibrary" frontend/src/pages/index.jsx` → 0 matches
2. `grep -n 'path="/library"' frontend/src/pages/index.jsx` → 1 match (unconditional)
3. `cd frontend && pnpm run build` → exit 0
4. After deploy: `curl -s -o /dev/null -w "%{http_code}" http://app.poc.sparkmojo.com/library` → 200

## Commit Message
`fix: remove /library production guard — route accessible in all environments`

## Branch
`hotfix/library-route-guard`
