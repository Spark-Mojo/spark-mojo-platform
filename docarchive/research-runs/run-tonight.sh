#!/bin/bash

# Spark Mojo — Sequential overnight Ralph run
# Updated: Session 19 — unified research run (billing + medplum)
# Usage: chmod +x run-tonight.sh && ./run-tonight.sh

set -e

REPO="/Users/jamesilsley/GitHub/spark-mojo-platform"

# Auto-commit any pending changes Ralph left from the previous run
# (Ralph updates PROMPT.md and hats.yml at end of session but doesn't always commit)
cd "$REPO"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Committing Ralph's uncommitted changes before pull..."
  git add -A
  git commit -m "chore: auto-commit pending changes before run start"
fi
git pull
LOG_DIR="$REPO/run-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

echo "======================================"
echo "Spark Mojo Overnight Runs"
echo "Started: $(date)"
echo "======================================"

echo ""
echo "RUN 1 — Billing + Medplum Research (unified, traditional mode)"
echo "Started: $(date)"
cd "$REPO"
ralph run --config RESEARCH-HATS.yml
echo "RUN 1 COMPLETE: $(date)"

echo ""
echo "======================================"
echo "All runs complete."
echo "Finished: $(date)"
echo ""
echo "Read first:"
echo "  sparkmojo-internal/platform/research/billing/BILLING-SYNTHESIS.md"
echo "  sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-IMPL-SYNTHESIS.md"
echo "  sparkmojo-internal/platform/research/billing/BILLING-EXEC-SUMMARY.pptx"
echo "  sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-IMPL-EXEC-SUMMARY.pptx"
echo "======================================"
