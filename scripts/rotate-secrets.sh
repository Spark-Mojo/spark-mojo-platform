#!/usr/bin/env bash
# Monthly Infisical sync (cron entry point).
#
# Pulls current Infisical values into secrets/ and force-recreates any
# containers whose secret files changed. This is a SYNC, not a rotation:
# rotation (generating new secret values) is driven from the Infisical UI
# per the DECISION-031 cadence matrix. This script's job is to propagate
# whatever is in Infisical today.
#
# Called by /etc/cron.d/spark-mojo-secrets (schedule file in
# scripts/cron/spark-mojo-secrets.cron).
#
# See DECISION-031 (sparkmojo-internal) and docs/ops/secret-rotation-runbook.md.

set -euo pipefail

REPO_DIR="/home/ops/spark-mojo-platform"
cd "$REPO_DIR"

# Snapshot the current secrets/ directory before fetching so we can tell
# whether anything actually changed. If secrets/ doesn't exist yet (first
# run), BEFORE_HASH will be empty — treat that as "changed" and proceed.
BEFORE_HASH=$(find secrets -type f -exec sha256sum {} + 2>/dev/null | sort | sha256sum | awk '{print $1}')

bash scripts/infisical-fetch.sh

AFTER_HASH=$(find secrets -type f -exec sha256sum {} + 2>/dev/null | sort | sha256sum | awk '{print $1}')

if [ "$BEFORE_HASH" = "$AFTER_HASH" ] && [ -n "$BEFORE_HASH" ]; then
  echo "No secret changes — no container recreation needed"
  exit 0
fi

echo "Secret change detected — recreating affected containers"

# --- App stack (poc-api, poc-frontend) ---
# docker-compose.app.yml references no ${VAR} substitutions, so no --env-file
# is needed. config.prod.env is loaded by poc-api via the service's env_file:.
sudo docker compose -f docker-compose.app.yml up -d --force-recreate

# --- Medplum stack ---
# Medplum v5.x reads DB/Redis passwords from medplum.config.json (CLAUDE.md
# gotcha). Re-render from the new secrets first, then force-recreate.
bash scripts/render-medplum-config.sh

# docker-compose.medplum.yml uses ${MEDPLUM_DB_PASSWORD} / ${MEDPLUM_REDIS_PASSWORD}
# for variable substitution (POSTGRES_PASSWORD env, redis --requirepass,
# healthcheck). Export them from the just-fetched secret files so compose
# can resolve the placeholders. -E preserves these vars across sudo.
MEDPLUM_DB_PASSWORD="$(<"$REPO_DIR/secrets/medplum_db_password")" \
MEDPLUM_REDIS_PASSWORD="$(<"$REPO_DIR/secrets/medplum_redis_password")" \
sudo -E docker compose -f docker-compose.medplum.yml up -d --force-recreate medplum medplum-postgres medplum-redis

echo "Container recreation complete"
