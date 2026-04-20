# PLAN-SEC-001 — Secrets Loader Helper + MAL Migration

- **Story ID:** SEC-001
- **Branch:** `story/SEC-001-secrets-loader`
- **Story Type:** Python API (abstraction-layer)
- **Attempt:** 1 (no RETRY-SEC-001.count present)
- **Spec:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/SEC-001-secrets-loader.md`
- **Decision of record:** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-031-secrets-management.md`
- **Migration plan context:** `/Users/jamesilsley/GitHub/spark-mojo-platform/docs/superpowers/plans/2026-04-20-secrets-management-migration.md` (Phase 2 Tasks 2.1–2.3)

## Summary

Introduce `read_secret(name)` helper in the Mojo Abstraction Layer that reads a secret from `$SECRETS_DIR/<name>` when `SECRETS_DIR` is set (prod path via Compose `secrets:` mounts at `/run/secrets/*`) and falls back to the uppercase env var of the same name when unset (dev/test path). Migrate every actual-secret read in `abstraction-layer/` from `os.getenv(...)` to `read_secret(...)`. No compose changes, no `.env.poc` changes, no frontend changes — those belong to later SEC stories.

## Scope — Actual Secrets to Migrate

Classification rule from the spec: anything matching SECRET/PASSWORD/TOKEN/KEY (API credentials, DB passwords, service tokens) migrates. `GOOGLE_CLIENT_ID` stays on env (public, appears in OAuth redirects). `VITE_*` untouched.

Confirmed via `grep -rnE 'os\.(getenv|environ).{0,3}[A-Z_]*(SECRET|PASSWORD|TOKEN|KEY|DSN)' abstraction-layer/` — production call sites to migrate (exclude `tests/` — those set env vars as fallback fixtures, which remains a valid dev/test path):

| Secret (env var) | `read_secret()` name | File(s) |
|---|---|---|
| `GOOGLE_CLIENT_SECRET` | `google_client_secret` | `google_auth.py:22` |
| `FRAPPE_API_KEY` | `frappe_api_key` | `google_auth.py:25`, `auth.py:86`, `routes/clinical.py:24`, `routes/onboarding.py:23`, `routes/billing.py:27`, `modules/tasks/routes.py:74`, `connectors/frappe_native.py:58` |
| `FRAPPE_API_SECRET` | `frappe_api_secret` | `google_auth.py:26`, `auth.py:87`, `routes/clinical.py:25`, `routes/onboarding.py:24`, `routes/billing.py:28`, `modules/tasks/routes.py:75` |
| `ADMIN_SERVICE_KEY` | `admin_service_key` | `auth.py:114`, `routes/provisioning.py:496` |
| `ADMIN_API_KEY` | `admin_api_key` | `routes/provisioning.py:40`, `registry.py:46` |
| `ADMIN_API_SECRET` | `admin_api_secret` | `routes/provisioning.py:41`, `registry.py:47` |
| `MARIADB_ROOT_PASSWORD` | `mariadb_root_password` | `routes/provisioning.py:35` |
| `STEDI_API_KEY` | `stedi_api_key` | `routes/billing.py:29`, `connectors/stedi.py:16` |
| `MEDPLUM_CLIENT_SECRET` | `medplum_client_secret` | `connectors/medplum_connector.py:26` |

**Not migrated (not secrets):** `FRAPPE_URL`, `DEV_MODE`, `DEV_USER`, `SECRETS_DIR` itself, `GOOGLE_CLIENT_ID`, `VITE_*`.

**Tests (`abstraction-layer/tests/`) are NOT rewritten** — they set env vars before import (see `conftest.py:16-19`), which is exactly the dev/test fallback path of `read_secret()`. No test file changes needed for the core helper migration.

## Implementation Order (TDD)

1. **RED — Write `abstraction-layer/tests/test_secrets_loader.py` first** with the 4 tests from the spec:
   1. `$SECRETS_DIR/<name>` file read, trailing `\n` stripped.
   2. `SECRETS_DIR` set but file missing → `SecretNotFoundError` with filename in message.
   3. `SECRETS_DIR` unset, `GOOGLE_CLIENT_SECRET=xyz` set → returns `"xyz"`.
   4. Neither set → `SecretNotFoundError`.
   Tests must use `monkeypatch` / `tmp_path` (no real FS writes outside pytest tmpdir). Ensure `SECRETS_DIR` and target env var are cleared per-test so ordering does not leak state.

2. **GREEN — Write `abstraction-layer/secrets_loader.py`** exactly as in the spec (lines 33–60). Export `read_secret`, `SecretNotFoundError`.

3. **REFACTOR — Migrate call sites.** For each file in the table above:
   - Replace `FOO = os.getenv("FOO", "")` module-level bindings with a thin accessor `def _foo() -> str: return read_secret("foo")` (or call `read_secret(...)` inline at the use site). **Defer reads to call-time** so module import does not raise when a secret is absent in a context where it is not needed (e.g., tests that only exercise unrelated routes).
   - Where a module-level constant is referenced from tests (e.g. `auth.ADMIN_SERVICE_KEY` in `tests/test_admin_auth.py:24,34`), preserve that attribute on the module so existing tests keep working. Simplest pattern: module-level `ADMIN_SERVICE_KEY = _load("admin_service_key", default="")` that swallows `SecretNotFoundError` → returns `""` in dev when neither is set. Only do this for names that are externally referenced by tests or other modules; inline `read_secret()` calls at use sites elsewhere.
   - Remove `os.getenv("<SECRET>", ...)` references to migrated keys in production code.

## Files to Create

- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/secrets_loader.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/tests/test_secrets_loader.py`

## Files to Modify

- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/google_auth.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/auth.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/registry.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/clinical.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/onboarding.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/billing.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/provisioning.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/modules/tasks/routes.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/connectors/frappe_native.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/connectors/stedi.py`
- `/Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/connectors/medplum_connector.py`

## Files NOT to Touch (per spec "What Is NOT in Scope")

- `docker-compose.poc.yml`, `docker-compose.app.yml`, any compose file — SEC-002
- `deploy.sh` — SEC-002
- `.env.poc` anywhere — SEC-004
- `medplum/medplum.config.json*` — SEC-002
- `frappe-apps/` and `frontend/` — out of scope entirely

## Gate Commands

### Fast gates (run locally before commit)

```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer

# Unit tests for the new helper only
pytest tests/test_secrets_loader.py -v

# Full suite + coverage (CLAUDE.md Definition of Done: >=70%)
pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70

# Post-migration grep: no direct reads of migrated secrets remain in production code
grep -rnE 'os\.(getenv|environ).{0,3}["'"'"']?GOOGLE_CLIENT_SECRET' . --include='*.py' --exclude-dir=tests --exclude-dir=__pycache__

grep -rnE 'os\.(getenv|environ).{0,3}["'"'"']?(FRAPPE_API_KEY|FRAPPE_API_SECRET|ADMIN_SERVICE_KEY|ADMIN_API_KEY|ADMIN_API_SECRET|MARIADB_ROOT_PASSWORD|STEDI_API_KEY|MEDPLUM_CLIENT_SECRET)' . --include='*.py' --exclude-dir=tests --exclude-dir=__pycache__
```

Both greps must return 0 lines.

### Full gates (VPS, after push to main)

```bash
# Deploy
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'

# Expected: deploy.sh completes; Phase 7 = 5/6 (J-027 pre-existing).

# OAuth smoke — behaviour must be unchanged because dev fallback path
# (env var) is still active; SECRETS_DIR is not set until SEC-002.
ssh sparkmojo 'curl -s -o /dev/null -D - -X GET https://api.poc.sparkmojo.com/auth/google | head -5'
# Expected: HTTP/2 307 with location: accounts.google.com/o/oauth2/v2/auth?client_id=664352319997-...
```

If OAuth smoke fails with `SecretNotFoundError` in `docker logs spark-mojo-platform-poc-api-1`, the dev fallback path broke — fix before marking complete.

## Acceptance Criteria Mapping

Each spec AC maps to a gate above:
- ACs 1–4 → `pytest tests/test_secrets_loader.py -v`
- AC 5 (OAuth 307 unchanged) → VPS curl smoke
- AC 6 (coverage ≥70%) → `pytest --cov-fail-under=70`
- AC 7 (grep for `GOOGLE_CLIENT_SECRET` env reads = 0) → first grep above

## Retry Count

0 (no `RETRY-SEC-001.count` file present — first attempt).

## Commit Message

```
feat(mal): add secrets_loader and migrate MAL secrets to file-based reads with env-var fallback
```

## Completion Markers

On successful deploy + verification, touch `/Users/jamesilsley/GitHub/spark-mojo-platform/SEC-001-COMPLETE`.
On exhaustion (5 fails) or architectural ambiguity, write `BLOCKED-SEC-001.md` with reason and append to `QUEUE-PROGRESS.md`.

## Knowledge-Base Artifacts (per PROCESS.md)

Output under `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/knowledge-base/secrets-management/SEC-001-secrets-loader/`:
- `DEPLOYMENT.md` — deploy steps run + output summary
- `DEFICIENCIES.md` — anything discovered that needs follow-up (module-level read deferral decisions, env-var fallback gaps, etc.)

Builder owns populating these after the gates pass.
