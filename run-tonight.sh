#!/bin/bash

# Spark Mojo — Sequential overnight Ralph run
# Updated: Session 19 — unified research run (billing + medplum)
# Usage: chmod +x run-tonight.sh && ./run-tonight.sh

set -e

REPO="/Users/jamesilsley/GitHub/spark-mojo-platform"
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
