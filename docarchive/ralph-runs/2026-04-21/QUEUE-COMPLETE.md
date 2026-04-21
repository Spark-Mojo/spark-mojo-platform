# Queue Complete — Secrets Migration Phase 2

**Generated:** 2026-04-20
**Queue source:** `PROMPT.md` — Secrets Migration Phase 2 overnight run

## Summary

| Story | Status | Outcome |
|-------|--------|---------|
| SEC-001 | COMPLETE | `read_secret()` helper + MAL migration merged (`32eab49`), deployed to POC; `/auth/google` returns 307 with correct `client_id`; coverage 85% / 223 tests pass. |
| SEC-002 | BLOCKED | Code merged (`fbc1668`) and deployed (5/6 Phase 7 checks, J-027 pre-existing WARN). Spec acceptance #4 failed: `docker inspect` still exposes raw secret values because plan explicitly kept migrated keys in `.env.poc`. |

1/2 COMPLETE, 1/2 BLOCKED.

## SEC-001 — COMPLETE

- **Branch:** `story/SEC-001-secrets-loader` → merged to `main` as `32eab49`.
- **Artefact:** `abstraction-layer/secrets_loader.py` + 4 TDD unit tests; MAL call sites migrated.
- **Gates:** `pytest tests/test_secrets_loader.py -v` (4/4), `pytest tests/ --cov=. --cov-fail-under=70` (223 pass, 85% cov), grep guards 0 lines.
- **Deploy:** POC deploy succeeded; `/auth/google` 307 with correct `client_id`.
- **Marker:** `SEC-001-COMPLETE` at repo root.

## SEC-002 — BLOCKED

- **Branch:** `story/SEC-002-compose-secrets-blocks` → merged to `main` as `fbc1668` (pre-merge commit `a7ae6b9`).
- **Artefacts merged (all correct, stay on main):**
  - `docker-compose.app.yml` — top-level `secrets:` block (9 app-read secrets), per-service mount on `poc-api`, `SECRETS_DIR=/run/secrets`.
  - `medplum/medplum.config.json.example` — envsubst template.
  - `scripts/render-medplum-config.sh` — umask 077, 0600 output.
  - `deploy.sh` — `phase_2_5_render_configs()` wired between Phase 2 and Phase 3.
  - `.gitignore` — `secrets/`.
- **Deploy:** succeeded (log `/home/ops/deploy-logs/deploy-20260420-224631.log`); Phase 2.5 ran; `/run/secrets/` inside `poc-api` lists all 9 secrets; OAuth smoke 307; Medplum healthy.
- **Blocker:** Spec acceptance criterion #4 (Test Step 5) failed — `docker inspect spark-mojo-platform-poc-api-1 | grep -iE "(PASSWORD|SECRET|TOKEN)" | grep -v "/run/secrets"` still returns matches because migrated keys remain in `.env.poc`.
- **Root cause:** Plan-vs-spec mismatch. Spec said remove migrated keys from `.env.poc`; `PLAN-SEC-002.md` explicitly said to leave them for the env-var fallback. Builder followed the plan.
- **Marker:** `BLOCKED-SEC-002-DEPLOY.md` at repo root (details + proposed fix inside).
- **Proposed next step (out of scope for this run):** VPS-side `.env.poc` cleanup of 9 migrated keys, then `./deploy.sh` and re-run Test Step 5. Either as a SEC-002.1 follow-up or rolled into SEC-004 (`.env.poc` retirement).

## Deliverables on `main`

- `32eab49` — feat(mal): secrets_loader + MAL migration.
- `a7ae6b9` — feat(compose): secrets blocks + Medplum renderer + deploy.sh Phase 2.5.
- `fbc1668` — merge SEC-002.

LOOP_COMPLETE
