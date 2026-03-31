# PLAN-INFRA-003: Abstraction Layer — DocType-backed SITE_REGISTRY

**Story ID:** INFRA-003
**Type:** Python FastAPI
**Depends on:** INFRA-002-COMPLETE ✅ (present)
**Branch:** `infra/INFRA-003-doctype-registry`

---

## Summary

Replace the env-var-based `SITE_REGISTRY` in the abstraction layer with a DocType-backed registry that queries `SM Site Registry` on `admin.sparkmojo.com` at startup. Add subdomain-based per-request routing, cache with 5-min TTL, env var fallback, and a refresh endpoint.

---

## Files to Create or Modify

| File | Action | What |
|------|--------|------|
| `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/registry.py` | **Modify** | Add `SiteRegistry` class: loads from SM Site Registry DocType, 5-min TTL cache, env var fallback, subdomain lookup, refresh method |
| `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/main.py` | **Modify** | Add `SiteRegistry` to lifespan startup, add `POST /admin/registry/refresh` endpoint, add subdomain extraction middleware/dependency |
| `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/tests/test_registry.py` | **Create** | 6 test cases per story spec (mock DocType API, unknown subdomain 404, known subdomain resolves, env var fallback, refresh endpoint, inactive exclusion) |
| `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/requirements.txt` | **Modify** | Add `httpx` if not present (needed for async Frappe API calls) |

---

## Implementation Notes

1. **SiteRegistry** is separate from the existing `ConnectorRegistry`. ConnectorRegistry resolves tenant+capability→connector. SiteRegistry resolves subdomain→frappe_url+frappe_site.
2. The admin site URL comes from env var `ADMIN_FRAPPE_URL` (e.g. `http://frappe-poc-backend-1:8000` or `https://admin.sparkmojo.com`).
3. Query: `GET {ADMIN_FRAPPE_URL}/api/resource/SM Site Registry?filters=[["is_active","=",1]]&fields=["*"]&limit_page_length=0` with appropriate auth.
4. Auth to admin site: use `ADMIN_API_KEY` / `ADMIN_API_SECRET` env vars (or session token). For POC, may use Administrator credentials.
5. Cache: simple dict + timestamp. On lookup, if `now - last_load > 300s`, trigger background refresh.
6. Fallback: if Frappe call fails at startup, check `SITE_REGISTRY` env var, parse JSON, log warning.
7. Refresh endpoint: `POST /admin/registry/refresh` — clears cache, reloads from DocType, returns `{"status": "refreshed", "sites": N}`.

---

## Env Vars Used

- `ADMIN_FRAPPE_URL` — URL of admin site Frappe backend (new, needed for DocType query)
- `ADMIN_API_KEY` / `ADMIN_API_SECRET` — API credentials for admin site (new)
- `SITE_REGISTRY` — existing env var, used as fallback only
- `FRAPPE_URL` — existing, used by health check

---

## Quality Gates (Definition of Done)

| # | Check | Command |
|---|-------|---------|
| 1 | All existing tests pass | `cd abstraction-layer && pytest tests/ -v` |
| 2 | New registry tests pass (6 cases) | `pytest tests/test_registry.py -v` |
| 3 | Coverage ≥70% | `pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70` |
| 4 | Health endpoint responds after deploy | `ssh sparkmojo './deploy.sh --phase 5' && curl -s https://poc.sparkmojo.com/health` |
| 5 | Registry loads from DocType (or fallback warning in logs) | `ssh sparkmojo 'docker logs spark-mojo-platform-poc-api-1 2>&1 \| tail -20'` |

---

## Ambiguities

- **Admin site auth mechanism:** Story doesn't specify how the abstraction layer authenticates to admin.sparkmojo.com to read SM Site Registry. Options: API key pair, Administrator session, or unauthenticated (if DocType has guest read). Builder should check if SM Site Registry allows guest read; if not, use API key/secret env vars. For POC, Administrator cookie-based auth via `ADMIN_FRAPPE_URL` with basic auth is acceptable.
- **Subdomain extraction in POC:** The POC currently routes all traffic through `poc.sparkmojo.com` — there's no `willow.app.sparkmojo.com` yet. The subdomain extraction logic should be implemented but the per-request routing can gracefully skip if no subdomain match (fallback to default site config from `FRAPPE_URL`).
