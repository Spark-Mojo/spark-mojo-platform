# Secrets Migration Phase 2 — Overnight Run
# Generated: 2026-04-20

## How to Use This File

Work stories in order. Each story gets its own branch.
For each story:
1. Check for `[STORY-ID]-COMPLETE` marker at repo root. If present, skip.
2. Check for `BLOCKED-[STORY-ID].md` marker at repo root. If present, skip.
3. Check dependencies — every dependency must have a `-COMPLETE` marker.
4. Read the full story spec from the absolute path listed below.
5. Read `CLAUDE.md` (this repo) for conventions and the Definition of Done.
6. Read `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-031-secrets-management.md` for the architecture the stories must match.
7. Build exactly what the spec says — nothing more. No gold-plating.
8. Run all quality gates per CLAUDE.md Definition of Done.
9. If architectural ambiguity arises: write `BLOCKED-[STORY-ID].md` with the question and move on.

## Retry Policy

After 5 consecutive failures on a single story, write `BLOCKED-[STORY-ID].md` with the failure summary and move on. Do not retry past the budget.

## Story Queue

### SEC-001 — `story/SEC-001-secrets-loader`
Introduce `read_secret()` helper in abstraction-layer with env-var fallback; migrate MAL secret reads (GOOGLE_CLIENT_SECRET etc.) from `os.getenv` to the helper. TDD: 4 unit tests first.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/SEC-001-secrets-loader.md
Dependencies: None

### SEC-002 — `story/SEC-002-compose-secrets-blocks`
Add Docker Compose `secrets:` blocks to `docker-compose.app.yml`, convert `medplum.config.json.example` to envsubst template, create `scripts/render-medplum-config.sh`, add `phase_2_5_render_configs()` to `deploy.sh`. VPS-side seeding of `secrets/` files is part of the deploy verification for this story.
Type: VPS Infra
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/SEC-002-compose-secrets-blocks.md
Dependencies: SEC-001

## Completion

When both stories are COMPLETE or BLOCKED:
1. Write `QUEUE-COMPLETE.md` summarising each story's outcome (committed + deployed + verified, or blocked with reason).
2. Output: `LOOP_COMPLETE`
