#!/usr/bin/env bash
# Render medplum/medplum.config.json from the tracked template plus the
# mounted secret files. Run by deploy.sh Phase 2.5 on the VPS.
#
# Medplum v5.x ignores env vars for DB/Redis config (CLAUDE.md gotcha),
# so the JSON file must be regenerated at deploy time from secrets on disk.
set -euo pipefail

SECRETS_DIR="${SECRETS_DIR:-/home/ops/spark-mojo-platform/secrets}"
TEMPLATE="medplum/medplum.config.json.example"
OUTPUT="medplum/medplum.config.json"

DB_PASSWORD="$(<"$SECRETS_DIR/medplum_db_password")"
REDIS_PASSWORD="$(<"$SECRETS_DIR/medplum_redis_password")"
export DB_PASSWORD REDIS_PASSWORD

umask 077
envsubst < "$TEMPLATE" > "$OUTPUT"
chmod 600 "$OUTPUT"
