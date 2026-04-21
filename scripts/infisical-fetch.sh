#!/usr/bin/env bash
# Materialises every secret in the configured Infisical project(s)/environment
# into one file per secret at ./secrets/<lowercase_name>, 0600.
#
# Auth: Universal Auth (machine identity client-id + client-secret).
#   /home/ops/.infisical-ua-client-id      (0600, ops:ops)
#   /home/ops/.infisical-ua-client-secret  (0600, ops:ops)
#
# Config (non-secret): /etc/default/spark-mojo
#   INFISICAL_PROJECT_IDS=<uuid1>,<uuid2>
#   INFISICAL_ENV=prod
#
# Called by deploy.sh Phase 0.5 and scripts/rotate-secrets.sh.
# See DECISION-031 (sparkmojo-internal) for topology and rotation cadence.

set -euo pipefail

# shellcheck disable=SC1091
[ -f /etc/default/spark-mojo ] && source /etc/default/spark-mojo

OUTPUT_DIR="${1:-secrets}"
: "${INFISICAL_PROJECT_IDS:?set INFISICAL_PROJECT_IDS in /etc/default/spark-mojo}"
: "${INFISICAL_ENV:=prod}"

CLIENT_ID_FILE="${INFISICAL_UA_CLIENT_ID_FILE:-$HOME/.infisical-ua-client-id}"
CLIENT_SECRET_FILE="${INFISICAL_UA_CLIENT_SECRET_FILE:-$HOME/.infisical-ua-client-secret}"

if [ ! -r "$CLIENT_ID_FILE" ] || [ ! -r "$CLIENT_SECRET_FILE" ]; then
  echo "ERROR: Universal Auth credential files not readable:" >&2
  echo "  $CLIENT_ID_FILE" >&2
  echo "  $CLIENT_SECRET_FILE" >&2
  exit 1
fi

CLIENT_ID="$(<"$CLIENT_ID_FILE")"
CLIENT_SECRET="$(<"$CLIENT_SECRET_FILE")"

# Mint a short-lived access token via Universal Auth.
# --silent suppresses welcome banner; --plain prints only the token value.
if ! INFISICAL_TOKEN="$(infisical login \
      --method=universal-auth \
      --client-id="$CLIENT_ID" \
      --client-secret="$CLIENT_SECRET" \
      --silent --plain 2>/dev/null)"; then
  echo "ERROR: 'infisical login' failed. Check client-id/secret validity and network reachability to app.infisical.com." >&2
  exit 1
fi

if [ -z "${INFISICAL_TOKEN:-}" ]; then
  echo "ERROR: 'infisical login' returned an empty token." >&2
  exit 1
fi
export INFISICAL_TOKEN

mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"

TMPFILE="$(mktemp)"
trap 'shred -u "$TMPFILE" 2>/dev/null || rm -f "$TMPFILE"' EXIT
umask 077

IFS=',' read -ra PROJECTS <<< "$INFISICAL_PROJECT_IDS"
for PID in "${PROJECTS[@]}"; do
  [ -z "$PID" ] && continue
  if ! infisical export \
        --projectId "$PID" \
        --env "$INFISICAL_ENV" \
        --format=dotenv \
        >> "$TMPFILE" 2>/dev/null; then
    echo "ERROR: 'infisical export' failed for project $PID (env=$INFISICAL_ENV). Check identity permissions." >&2
    exit 1
  fi
done

# Parse the aggregated dotenv stream: one file per KEY at $OUTPUT_DIR/<key-lowercased>.
# Later occurrences of a key overwrite earlier ones — project order in
# INFISICAL_PROJECT_IDS determines precedence (last-write-wins).
#
# Infisical exports as KEY='value' (single-quoted). We strip single OR double
# quotes if present, and write WITHOUT a trailing newline to match the byte
# format that SEC-002 established (read_secret() and bash $(<file) strip
# trailing newlines anyway — but consistent byte format means the
# rotate-secrets.sh hash-comparison doesn't false-positive on first run).
COUNT=0
while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  # Strip surrounding single OR double quotes if present.
  if [[ "$value" == \"*\" ]]; then
    value="${value#\"}"; value="${value%\"}"
  elif [[ "$value" == \'*\' ]]; then
    value="${value#\'}"; value="${value%\'}"
  fi
  # Lowercase key to match /run/secrets/<name> convention used by Compose secrets: mounts.
  fname="$(echo "$key" | tr '[:upper:]' '[:lower:]')"
  printf '%s' "$value" > "$OUTPUT_DIR/$fname"
  COUNT=$((COUNT + 1))
done < "$TMPFILE"

# Normalise mode on everything we just wrote.
find "$OUTPUT_DIR" -type f -exec chmod 600 {} +

echo "Fetched $(ls -1 "$OUTPUT_DIR" | wc -l) secret file(s) from Infisical (env=$INFISICAL_ENV, projects=${#PROJECTS[@]})."
