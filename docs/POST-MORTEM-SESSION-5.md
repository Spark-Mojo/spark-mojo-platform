# Session 5 Post-Mortem: VPS Drift and Integration Gaps

**Date:** 2026-03-26 to 2026-03-27
**Duration:** 18+ hours across multiple sessions
**Impact:** 4 of 8 stories failed testing (all same root cause)

---

## Root Cause

Uncommitted local changes on the VPS diverged from git main over multiple
sessions. A locally modified `frontend/src/pages/index.jsx` on the VPS had a
completely different routing structure (traditional sidebar with routes to
`/onboarding`, `/billing`, `/sync`, `/settings`) that was never committed to git.
The git-tracked version still had the old Desktop.jsx widget prototype routing.

When `deploy.sh` was introduced in Session 6 and ran `git pull`, it restored
the git-tracked Desktop version — overwriting the sidebar routing that had been
running in production for weeks. This caused Vite to tree-shake out
WorkboardMojo as dead code (since Desktop.jsx's Mojo system used a dynamic
component map that Vite couldn't statically analyze).

The sidebar layout was then properly committed to git as the production UI, and
Desktop.jsx was archived to `_archive/`.

---

## Contributing Factors

1. **No rule preventing direct VPS file edits.** Files were modified on the VPS
   via tools and SSH sessions without committing to git. Over time, the VPS
   working tree drifted significantly from the git-tracked state.

2. **Ralph orchestrator completed 8 stories but never verified integration.**
   Each story was marked complete based on component existence and unit tests,
   but no story verified that the component was reachable via the actual UI
   routing and navigation.

3. **`sm_billing` in apps.txt without pyproject.toml.** This caused
   `ModuleNotFoundError` during `bench migrate`, which made Frappe treat SM Task
   and all child table DocTypes as "orphaned" and delete them. Total data loss
   for the DocType schema.

4. **deploy.sh Phase 7 verification was a false positive.** The check for
   `<div id="root">` passed with any React bundle — including stale ones
   missing all Mojo code. Bundle content verification was added after
   discovering this.

5. **Multiple sessions over weeks built on top of uncommitted local state.**
   Each session assumed the VPS state was correct without checking git status.
   No one ran `git diff` to compare the VPS working tree to HEAD.

---

## Timeline (Session 6)

1. **Traefik routing fix** — `/api/modules/` requests were going to Frappe
   instead of the abstraction layer. Added PathPrefix rule with priority=100.

2. **Frontend container not running** — `docker compose up -d` had been run
   with `-d` on a new line, causing attached mode. Containers stopped when
   SSH session ended.

3. **deploy.sh created** — Automated 7-phase deployment to eliminate manual
   failure points.

4. **sm_billing crash** — Non-installable app in apps.txt caused bench migrate
   to delete SM Task. Fixed by removing non-installable apps from apps.txt in
   Phase 2.

5. **Alpine glob expansion** — `docker exec` without `sh -c` doesn't expand
   globs in busybox shell. Bundle verification failed silently.

6. **WorkboardMojo missing from bundle** — Root cause discovered: VPS had
   different `index.jsx`. Restored git version, then properly committed the
   sidebar layout. Desktop.jsx archived.

---

## Fixes Implemented

| Fix | Where |
|-----|-------|
| deploy.sh removes non-installable apps from apps.txt | `deploy.sh` Phase 2 |
| Alpine glob expansion uses `sh -c` wrapper | `deploy.sh` Phase 6 |
| bench execute failures don't kill script | `deploy.sh` Phase 2 step 2d |
| Phase 6 aborts if frontend/ has uncommitted changes | `deploy.sh` Phase 6 |
| Sidebar layout committed as production UI | `pages/index.jsx`, `pages/Layout.jsx` |
| Desktop.jsx archived to `_archive/` | `pages/_archive/Desktop.jsx` |
| VPS deployment rules added | `CLAUDE.md` |
| Ralph orchestrator rules updated | `CLAUDE.md` |
| Volume mount for frappe-apps | `compose.poc-apps.yml` on VPS |
| Traefik route for `/api/modules/` | `docker-compose.poc.yml` |

---

## Prevention

1. **All VPS changes must go through git.** New CLAUDE.md rule. deploy.sh
   Phase 6 enforces this by aborting on uncommitted frontend changes.

2. **Ralph stories must include UI smoke tests.** Not just "component exists"
   but "feature is navigable from the live UI."

3. **deploy.sh Phase 7 verifies bundle contents**, not just DOM structure.
   Checks for `api/modules/tasks` and per-app VERIFY.txt DocTypes.

4. **deploy.sh is the single deployment path.** No manual `docker compose
   build` or `docker cp` outside the script.

---

*Written: 2026-03-27*
