# BLOCKED — SEC-002 post-deploy verification

**Story:** SEC-002 — Docker Compose secrets blocks + Medplum config renderer
**Branch:** `story/SEC-002-compose-secrets-blocks` (merged to `main` as `fbc1668`)
**Timestamp:** 2026-04-20 22:52 UTC

## Deploy result

**Deploy succeeded** — 5/6 Phase 7 checks pass, J-027 known pre-existing WARN.
Log: `/home/ops/deploy-logs/deploy-20260420-224631.log`

- `[Phase 2.5] Rendering config files from secrets... / [Phase 2.5] DONE` appears before Phase 3 ✓
- `medplum/medplum.config.json` rendered at 0600 with 0 unresolved `${...}` placeholders ✓
- `/run/secrets/` inside `spark-mojo-platform-poc-api-1` lists all 9 app secrets
  (admin_api_key, admin_api_secret, admin_service_key, frappe_api_key, frappe_api_secret,
  google_client_secret, mariadb_root_password, medplum_client_secret, stedi_api_key) ✓
- OAuth smoke: `HTTP/2 307` with correct `client_id=664352319997...` in `location:` ✓
- Medplum container: `healthy` ✓

## Verification step that failed

Spec acceptance criterion #4 (Test Step 5):
```
ssh sparkmojo 'docker inspect spark-mojo-platform-poc-api-1 | grep -iE "(PASSWORD|SECRET|TOKEN)" | grep -v "/run/secrets"'
# Required: no matches.
```

Actual output includes raw values in the container env block, e.g.:
```
"MEDPLUM_CLIENT_SECRET=<redacted>"
"FRAPPE_API_SECRET=<redacted>"
"GOOGLE_CLIENT_SECRET=<redacted>"
"MARIADB_ROOT_PASSWORD=<redacted>"
"MEDPLUM_DB_PASSWORD=<redacted>"
"MEDPLUM_REDIS_PASSWORD=<redacted>"
"AWS_SECRET_ACCESS_KEY=<redacted>"
"ADMIN_API_SECRET=<redacted>"
```

These come from `env_file: .env.poc` in `docker-compose.app.yml` (still in place by design).

## Root cause — plan vs spec mismatch

- **SEC-002 spec, "What to Build":**
  > Remove `GOOGLE_CLIENT_SECRET` from `env_file: .env.poc` reads that are redundant.
  > (Keep `.env.poc` for non-secret public config like `VITE_FRAPPE_URL` for now;
  > SEC-004 retires `.env.poc` entirely.)

- **PLAN-SEC-002.md explicitly contradicted this:**
  > Leave `env_file: .env.poc` in place for now (non-secret config). **Do not remove
  > secret keys from `.env.poc`** — the env-var fallback in `read_secret()` must still
  > work until SEC-004.

- Builder followed the plan; the committed changeset does not strip migrated secret keys
  from `.env.poc`, so `docker inspect` still exposes raw values.

The spec's intent is correct: the file-based reads now supersede the env vars (secrets
are mounted in `/run/secrets/` and `SECRETS_DIR=/run/secrets` is set), so the redundant
env entries for the 9 migrated secrets can and should be removed from `.env.poc`.

## Proposed fix (for the next planner iteration)

1. On the VPS (`.env.poc` is not in git, lives at `/home/ops/spark-mojo-platform/.env.poc`),
   comment out or remove these 9 keys only:
   - `GOOGLE_CLIENT_SECRET`
   - `FRAPPE_API_KEY`
   - `FRAPPE_API_SECRET`
   - `STEDI_API_KEY`
   - `MEDPLUM_CLIENT_SECRET`
   - `ADMIN_SERVICE_KEY`
   - `ADMIN_API_KEY`
   - `ADMIN_API_SECRET`
   - `MARIADB_ROOT_PASSWORD`
2. Keep `MEDPLUM_DB_PASSWORD` and `MEDPLUM_REDIS_PASSWORD` in `.env.poc` until
   SEC-003/SEC-004 — they are consumed by the Medplum stack (`docker-compose.medplum.yml`),
   not by `poc-api`, so they do not appear in the failing `docker inspect` scope for
   `poc-api`.
3. `./deploy.sh` to restart `poc-api`.
4. Re-run Test Step 5 — expect no matches.

The committer did not perform this change in-loop because:
- CLAUDE.md discourages ad-hoc VPS file edits outside an orchestrated story/deploy.
- The gap is a plan authorship issue, not a builder error; the Planner should
  re-plan with the corrected scope.
- Extending committer scope mid-hat violates the hat boundary contract.

## Keep, not revert

The merged work is structurally correct and must stay on `main`:
- Compose `secrets:` blocks + file mounts — correct.
- `medplum.config.json.example` envsubst template — correct.
- `scripts/render-medplum-config.sh` — correct.
- `deploy.sh` Phase 2.5 — correct.
- `.gitignore` `secrets/` — correct.

Only the `.env.poc` cleanup (spec item 4) is missing, and it is VPS-side only.

## Next event

`story.committed` with verification-FAILED — passes control back to the Planner so
SEC-002 can be re-opened with a trivial follow-up task (either a SEC-002.1 plan to
strip the 9 keys from VPS `.env.poc`, or roll it into SEC-004).
