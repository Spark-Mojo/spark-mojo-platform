# Hotfix Queue — Remove /library Production Guard

## How to Use This File
Single hotfix story. No dependencies.
1. Read CLAUDE.md first — it is the master context doc
2. Read the full story spec from the governance repo (absolute path below)
3. Build exactly what the spec says — nothing more
4. Run all quality gates (see CLAUDE.md Definition of Done)

## Pre-Reads (before touching any code)
- `/Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md` — build-time bible
- `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/WORKING_AGREEMENT.md`
- `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/CURRENT_SPRINT.md`

---

## Story Queue

### STORY-HOT-001 — Remove /library Production Guard
**Type:** Hotfix — Frontend routing
**Depends on:** none
**Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-HOT-001.md`
**Branch:** `hotfix/library-route-guard`

Removes the production guard (`const showLibrary = import.meta.env.DEV || ...`) from `frontend/src/pages/index.jsx` so the /library route is accessible in all environments. Then runs `./deploy.sh --phase 6` to redeploy the frontend.

**Gates:**
1. `grep -n "showLibrary" frontend/src/pages/index.jsx` — **MUST return 0 matches**
2. `grep -n "path=\"/library\"" frontend/src/pages/index.jsx` — MUST return 1 match (route present, unconditional)
3. `cd frontend && pnpm run build` — exit 0
4. After deploy: `curl -s -o /dev/null -w "%{http_code}" http://app.poc.sparkmojo.com/library` — MUST return 200

**Commit:** `fix: remove /library production guard — route accessible in all environments`

---

## Completion
When story completes or is blocked:
1. Write QUEUE-COMPLETE.md summarising result
2. Output: LOOP_COMPLETE
