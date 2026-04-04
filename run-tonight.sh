#!/bin/bash

# Spark Mojo — Sequential overnight Ralph run
# Session 19, April 3 2026
# Runs three configs back-to-back. Each must complete before the next starts.
# Total estimated runtime: 4-6 hours.
# Usage: chmod +x run-tonight.sh && ./run-tonight.sh

set -e  # Exit on any error

REPO="/Users/jamesilsley/GitHub/spark-mojo-platform"
LOG_DIR="$REPO/run-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

echo "======================================"
echo "Spark Mojo Sequential Overnight Runs"
echo "Started: $(date)"
echo "======================================"

echo ""
echo "RUN 1 of 3 — PROV-001 Build"
echo "Started: $(date)"
cd "$REPO"
ralph run --config hats.yml 2>&1 | tee "$LOG_DIR/run1-prov001-$TIMESTAMP.log"
echo "RUN 1 COMPLETE: $(date)"

echo ""
echo "RUN 2 of 3 — Billing Research (DECISION-027)"
echo "Started: $(date)"
cd "$REPO"
ralph run --config BILLING-RESEARCH-HATS.yml 2>&1 | tee "$LOG_DIR/run2-billing-$TIMESTAMP.log"
echo "RUN 2 COMPLETE: $(date)"

echo ""
echo "RUN 3 of 3 — Medplum Implementation Design"
echo "Started: $(date)"
cd "$REPO"
ralph run --config MEDPLUM-HATS.yml 2>&1 | tee "$LOG_DIR/run3-medplum-$TIMESTAMP.log"
echo "RUN 3 COMPLETE: $(date)"

echo ""
echo "======================================"
echo "All three runs complete."
echo "Finished: $(date)"
echo "Read first:"
echo "  - MORNING-TEST-PLAN.md (PROV-001 results)"
echo "  - sparkmojo-internal/platform/research/billing/BILLING-SYNTHESIS.md"
echo "  - sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-IMPL-SYNTHESIS.md"
echo "======================================"
