#!/usr/bin/env bash
# deploy.sh — Spark Mojo POC automated deployment
# Eliminates manual failure modes from the 2026-03-26 debug session.
# Usage:
#   ./deploy.sh                  Full deploy (phases 0-7)
#   ./deploy.sh --verify-only   Run only Phase 7 verification
#   ./deploy.sh --phase N       Run only phase N (0-7)

set -eo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
DEPLOY_DIR="/home/ops/spark-mojo-platform"
COMPOSE_FILE="docker-compose.poc.yml"
FRAPPE_BACKEND="frappe-poc-backend-1"
FRAPPE_WORKERS="frappe-poc-queue-short-1 frappe-poc-queue-long-1 frappe-poc-scheduler-1"
ALL_FRAPPE_CONTAINERS="$FRAPPE_BACKEND $FRAPPE_WORKERS"
FRONTEND_CONTAINER="spark-mojo-platform-poc-frontend-1"
FRAPPE_BENCH="/home/frappe/frappe-bench"
FRAPPE_SITE="frontend"
LOG_DIR="/home/ops/deploy-logs"
START_TIME=$(date +%s)

# ── Logging ──────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

# ── Error trap ───────────────────────────────────────────────────────────────
trap_handler() {
  local exit_code=$?
  local line_no=$1
  echo ""
  echo "=========================================="
  echo "DEPLOY FAILED at line $line_no (exit code $exit_code)"
  echo "=========================================="
  echo ""
  echo "--- Last 30 lines of Frappe backend logs ---"
  sudo docker logs "$FRAPPE_BACKEND" --tail 30 2>&1 || echo "(could not read backend logs)"
  echo ""
  echo "--- Last 10 lines of abstraction layer logs ---"
  sudo docker logs "$FRONTEND_CONTAINER" --tail 10 2>&1 || echo "(could not read frontend logs)"
  echo ""
  echo "Log file: $LOG_FILE"
  elapsed=$(( $(date +%s) - START_TIME ))
  echo "Failed after ${elapsed}s"
}
trap 'trap_handler $LINENO' ERR

# ── Argument parsing ─────────────────────────────────────────────────────────
VERIFY_ONLY=false
RUN_PHASE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify-only)
      VERIFY_ONLY=true
      shift
      ;;
    --phase)
      RUN_PHASE="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: ./deploy.sh [--verify-only] [--phase N]"
      exit 1
      ;;
  esac
done

# Helper: should this phase run?
should_run() {
  local phase=$1
  if [ "$VERIFY_ONLY" = true ]; then
    [ "$phase" -eq 7 ]
  elif [ -n "$RUN_PHASE" ]; then
    [ "$phase" -eq "$RUN_PHASE" ]
  else
    return 0
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 0 — Pre-flight
# ══════════════════════════════════════════════════════════════════════════════
phase_0() {
  echo ""
  echo "=== Spark Mojo POC Deploy — $(date) ==="
  echo ""

  echo "[Phase 0] Pre-flight checks..."

  # Correct directory
  if [ "$(pwd)" != "$DEPLOY_DIR" ]; then
    cd "$DEPLOY_DIR" || { echo "ABORT: Cannot cd to $DEPLOY_DIR"; exit 1; }
    echo "  Changed to $DEPLOY_DIR"
  fi
  echo "  Directory: OK ($DEPLOY_DIR)"

  # Docker accessible
  sudo docker ps > /dev/null 2>&1 || { echo "ABORT: docker not accessible (is sudo configured?)"; exit 1; }
  echo "  Docker: OK"

  # Frappe backend running
  if ! sudo docker ps --format '{{.Names}}' | grep -q "^${FRAPPE_BACKEND}$"; then
    echo "ABORT: $FRAPPE_BACKEND is not running."
    echo "  Start the Frappe stack first:"
    echo "  cd /home/ops/frappe-poc && sudo docker compose up -d"
    exit 1
  fi
  echo "  Frappe backend: OK ($FRAPPE_BACKEND running)"

  echo "[Phase 0] Pre-flight PASSED"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — Pull latest code
# ══════════════════════════════════════════════════════════════════════════════
phase_1() {
  echo ""
  echo "[Phase 1] Pulling latest code..."

  cd "$DEPLOY_DIR"
  if ! git pull origin main; then
    echo "ABORT: git pull failed."
    echo "  If merge conflict: git status, resolve, then re-run."
    echo "  If network issue: check connectivity and retry."
    exit 1
  fi

  echo "  HEAD: $(git log --oneline -1)"
  echo "[Phase 1] Pull DONE"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — Sync sm_widgets into ALL Frappe containers
# ══════════════════════════════════════════════════════════════════════════════
phase_2() {
  echo ""
  echo "[Phase 2] Syncing sm_widgets into Frappe containers..."

  cd "$DEPLOY_DIR"

  # Step 2a — Copy app files into ALL containers
  echo "  [2a] Copying sm_widgets app files..."
  for container in $ALL_FRAPPE_CONTAINERS; do
    if sudo docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
      sudo docker cp frappe-apps/sm_widgets "$container:$FRAPPE_BENCH/apps/"
      echo "    Copied to $container"
    else
      echo "    SKIP: $container not running"
    fi
  done

  # Step 2b — Pip install in ALL containers
  echo "  [2b] Pip installing sm_widgets..."
  for container in $ALL_FRAPPE_CONTAINERS; do
    if sudo docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
      sudo docker exec "$container" bash -c \
        "$FRAPPE_BENCH/env/bin/pip install -e $FRAPPE_BENCH/apps/sm_widgets -q" 2>&1 | tail -1
      echo "    Installed in $container"
    fi
  done

  # Step 2c — Ensure sm_widgets is in apps.txt
  echo "  [2c] Checking apps.txt..."
  if sudo docker exec "$FRAPPE_BACKEND" bash -c "grep -q sm_widgets $FRAPPE_BENCH/sites/apps.txt"; then
    echo "    apps.txt: sm_widgets already present"
  else
    sudo docker exec "$FRAPPE_BACKEND" bash -c "echo sm_widgets >> $FRAPPE_BENCH/sites/apps.txt"
    echo "    apps.txt: sm_widgets ADDED"
  fi

  # apps.txt lives on a shared volume — but verify workers can see it too
  for container in $FRAPPE_WORKERS; do
    if sudo docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
      if ! sudo docker exec "$container" bash -c "grep -q sm_widgets $FRAPPE_BENCH/sites/apps.txt" 2>/dev/null; then
        sudo docker exec "$container" bash -c "echo sm_widgets >> $FRAPPE_BENCH/sites/apps.txt" 2>/dev/null
        echo "    apps.txt: sm_widgets added to $container"
      fi
    fi
  done

  # Step 2d — Ensure sm_widgets is in tabInstalled Application
  echo "  [2d] Checking tabInstalled Application..."
  INSTALL_RESULT=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$FRAPPE_SITE" execute \
    "existing = frappe.db.get_value('Installed Application', {'app_name': 'sm_widgets'}, 'name')
if existing:
    print('already_present')
else:
    frappe.get_doc({'doctype': 'Installed Application', 'app_name': 'sm_widgets', 'app_version': '0.0.1'}).insert(ignore_permissions=True)
    frappe.db.commit()
    print('inserted')" 2>&1)
  echo "    tabInstalled Application: $INSTALL_RESULT"

  echo "[Phase 2] sm_widgets sync DONE"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — Run bench migrate
# ══════════════════════════════════════════════════════════════════════════════
phase_3() {
  echo ""
  echo "[Phase 3] Running bench migrate..."

  MIGRATE_OUTPUT=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$FRAPPE_SITE" migrate 2>&1) || true
  echo "$MIGRATE_OUTPUT" | tail -20

  if echo "$MIGRATE_OUTPUT" | grep -qi "error"; then
    echo ""
    echo "ABORT: bench migrate reported errors."
    echo ""
    echo "--- Last 30 lines of backend logs ---"
    sudo docker logs "$FRAPPE_BACKEND" --tail 30
    exit 1
  fi

  # Verify SM Task exists
  echo "  Verifying SM Task DocType..."
  SM_TASK_CHECK=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$FRAPPE_SITE" execute \
    "print(frappe.db.exists('DocType', 'SM Task'))" 2>&1)

  if echo "$SM_TASK_CHECK" | grep -q "SM Task"; then
    echo "  SM Task DocType: EXISTS"
  else
    echo "ABORT: SM Task DocType not found after migrate."
    echo "  Check app directory structure (see CLAUDE.md 'New DocType / Module Pattern')."
    echo "  bench execute output: $SM_TASK_CHECK"
    exit 1
  fi

  echo "[Phase 3] Migrate DONE"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 4 — Restart Frappe backend + workers
# ══════════════════════════════════════════════════════════════════════════════
phase_4() {
  echo ""
  echo "[Phase 4] Restarting Frappe containers..."

  sudo docker restart $ALL_FRAPPE_CONTAINERS
  echo "  Containers restarted. Waiting for Frappe to be healthy..."

  HEALTHY=false
  for i in {1..12}; do
    response=$(curl -s --max-time 5 https://poc.sparkmojo.com/api/method/frappe.ping 2>/dev/null || true)
    if echo "$response" | grep -q "pong"; then
      echo "  Frappe healthy after $((i * 5)) seconds"
      HEALTHY=true
      break
    fi
    echo "  Waiting for Frappe... attempt $i/12"
    sleep 5
  done

  if [ "$HEALTHY" = false ]; then
    echo "ABORT: Frappe did not become healthy within 60 seconds."
    echo ""
    echo "--- Backend logs ---"
    sudo docker logs "$FRAPPE_BACKEND" --tail 30
    exit 1
  fi

  echo "[Phase 4] Frappe restart DONE"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 5 — Rebuild abstraction layer
# ══════════════════════════════════════════════════════════════════════════════
phase_5() {
  echo ""
  echo "[Phase 5] Rebuilding abstraction layer..."

  cd "$DEPLOY_DIR"
  sudo docker compose -f "$COMPOSE_FILE" build --no-cache poc-api
  sudo docker compose -f "$COMPOSE_FILE" up -d poc-api

  # Wait a moment for uvicorn to start
  sleep 3
  if sudo docker ps --format '{{.Names}}' | grep -q "spark-mojo-platform-poc-api-1"; then
    echo "  Abstraction layer container: running"
  else
    echo "ABORT: Abstraction layer container failed to start."
    sudo docker logs spark-mojo-platform-poc-api-1 --tail 20
    exit 1
  fi

  echo "[Phase 5] Abstraction layer DONE"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 6 — Rebuild frontend
# ══════════════════════════════════════════════════════════════════════════════
phase_6() {
  echo ""
  echo "[Phase 6] Rebuilding frontend (no-cache)..."

  cd "$DEPLOY_DIR"
  sudo docker compose -f "$COMPOSE_FILE" build --no-cache poc-frontend
  sudo docker compose -f "$COMPOSE_FILE" up -d poc-frontend

  sleep 2

  # Verify index.html and bundle are in sync
  echo "  Verifying bundle hash sync..."

  BUNDLE=$(sudo docker exec "$FRONTEND_CONTAINER" \
    ls /usr/share/nginx/html/assets/*.js 2>/dev/null | head -1 | xargs basename)
  REFERENCED=$(sudo docker exec "$FRONTEND_CONTAINER" \
    grep -o 'assets/index-[^"]*\.js' /usr/share/nginx/html/index.html | head -1)
  REFERENCED_BASENAME=$(basename "$REFERENCED" 2>/dev/null || echo "")

  echo "  Bundle on disk: $BUNDLE"
  echo "  index.html refs: $REFERENCED_BASENAME"

  if [ -z "$BUNDLE" ]; then
    echo "ABORT: No JS bundle found in container."
    exit 1
  fi

  if [ "$BUNDLE" != "$REFERENCED_BASENAME" ]; then
    echo "ABORT: Bundle hash mismatch!"
    echo "  index.html references $REFERENCED but bundle file is $BUNDLE"
    exit 1
  fi
  echo "  Bundle hash: MATCHED"

  # Verify bundle contains WorkboardMojo content (use string literals, not component names)
  # Vite minifies component names — grep for unique string literals instead.
  MOJO_CHECK=$(sudo docker exec "$FRONTEND_CONTAINER" \
    grep -c "api/modules/tasks" "/usr/share/nginx/html/assets/$BUNDLE" 2>/dev/null || echo "0")

  if [ "$MOJO_CHECK" -gt "0" ] 2>/dev/null; then
    echo "  WorkboardMojo content: CONFIRMED ($MOJO_CHECK occurrences of api/modules/tasks)"
  else
    echo "  WARNING: WorkboardMojo string literals not found in bundle."
    echo "  This may be normal if the component was refactored. Check manually."
  fi

  echo "[Phase 6] Frontend DONE"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 7 — End-to-end verification
# ══════════════════════════════════════════════════════════════════════════════
phase_7() {
  echo ""
  echo "[Phase 7] End-to-end verification..."
  echo ""

  PASS_COUNT=0
  FAIL_COUNT=0

  # CHECK 1 — Frappe ping
  if curl -s --max-time 10 https://poc.sparkmojo.com/api/method/frappe.ping | grep -q "pong"; then
    echo "  1/6  Frappe ping                  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  1/6  Frappe ping                  FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 2 — Health endpoint
  HEALTH_RESULT=$(curl -s --max-time 10 https://poc.sparkmojo.com/health 2>/dev/null || echo "")
  if echo "$HEALTH_RESULT" | grep -q '"status"'; then
    echo "  2/6  Health endpoint               PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  2/6  Health endpoint               FAIL"
    echo "       Response: $(echo "$HEALTH_RESULT" | head -c 200)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 3 — SM Task accessible via REST API
  # A PermissionError proves the DocType exists and Frappe routes to it (auth required).
  # DoesNotExistError means the DocType is missing — that's the real failure.
  SM_API_RESULT=$(curl -s --max-time 10 "https://poc.sparkmojo.com/api/resource/SM%20Task?limit=1" 2>/dev/null || echo "")
  if echo "$SM_API_RESULT" | grep -q '"data"'; then
    echo "  3/6  SM Task REST API              PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  elif echo "$SM_API_RESULT" | grep -q "PermissionError"; then
    echo "  3/6  SM Task REST API              PASS (auth required — DocType exists)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  3/6  SM Task REST API              FAIL"
    echo "       Response: $(echo "$SM_API_RESULT" | head -c 200)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 4 — Abstraction layer tasks/list (must NOT be Frappe DoesNotExistError)
  AL_RESULT=$(curl -s --max-time 10 https://poc.sparkmojo.com/api/modules/tasks/list 2>/dev/null || echo "")
  if echo "$AL_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if 'DoesNotExistError' not in str(d) and 'exc_type' not in str(d) else 1)" 2>/dev/null; then
    echo "  4/6  Abstraction layer tasks/list  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  4/6  Abstraction layer tasks/list  FAIL"
    echo "       Response: $(echo "$AL_RESULT" | head -c 200)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 5 — Frontend loads with root element
  FE_RESULT=$(curl -s --max-time 10 https://app.poc.sparkmojo.com 2>/dev/null || echo "")
  if echo "$FE_RESULT" | grep -q 'id="root"'; then
    echo "  5/6  Frontend root element         PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  5/6  Frontend root element         FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 6 — SM Task DocType exists in Frappe
  SM_DT_RESULT=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$FRAPPE_SITE" execute \
    "print(frappe.db.exists('DocType', 'SM Task'))" 2>/dev/null || echo "")
  if echo "$SM_DT_RESULT" | grep -q "SM Task"; then
    echo "  6/6  SM Task DocType               PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  6/6  SM Task DocType               FAIL"
    echo "       Result: $SM_DT_RESULT"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # Summary
  echo ""
  echo "=========================================="
  ELAPSED=$(( $(date +%s) - START_TIME ))
  echo "  Results: $PASS_COUNT/6 passed, $FAIL_COUNT/6 failed"
  echo "  Elapsed: ${ELAPSED}s"
  echo "  Log: $LOG_FILE"
  echo "=========================================="

  if [ "$FAIL_COUNT" -eq 0 ]; then
    echo ""
    echo "  Deploy complete — all checks passed."
    echo ""
  else
    echo ""
    echo "  Deploy has failures. Fix blockers before testing."
    echo ""
    exit 1
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

# Phase 0 always runs (pre-flight)
if should_run 0 || [ "$VERIFY_ONLY" = true ] || [ -n "$RUN_PHASE" ]; then
  phase_0
fi

should_run 1 && phase_1
should_run 2 && phase_2
should_run 3 && phase_3
should_run 4 && phase_4
should_run 5 && phase_5
should_run 6 && phase_6

# Phase 7 runs at end of full deploy, or on --verify-only, or --phase 7
if should_run 7; then
  phase_7
elif [ "$VERIFY_ONLY" = false ] && [ -z "$RUN_PHASE" ]; then
  phase_7
fi

echo ""
echo "Log file: $LOG_FILE"
