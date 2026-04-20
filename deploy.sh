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
COMPOSE_FILE="docker-compose.yml"               # umbrella — full-stack operations
APP_COMPOSE_FILE="docker-compose.app.yml"       # app-only — Phase 5/6 rebuilds
# docker-compose.poc.yml retained on disk for 7-day soak; not referenced here.
FRAPPE_BACKEND="frappe-poc-backend-1"
FRAPPE_WORKERS="frappe-poc-queue-short-1 frappe-poc-queue-long-1 frappe-poc-scheduler-1"
ALL_FRAPPE_CONTAINERS="$FRAPPE_BACKEND $FRAPPE_WORKERS"
FRONTEND_CONTAINER="spark-mojo-platform-poc-frontend-1"
FRAPPE_BENCH="/home/frappe/frappe-bench"
FRAPPE_SITE="poc-dev.sparkmojo.com"
FRAPPE_APPS_DIR="frappe-apps"
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
BACKEND_ONLY=false

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
    --backend-only)
      BACKEND_ONLY=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: ./deploy.sh [--verify-only] [--phase N] [--backend-only]"
      exit 1
      ;;
  esac
done

if [ "$BACKEND_ONLY" = true ]; then
  echo "[INFO] --backend-only: skipping frontend rebuild"
fi

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

  # Discover frappe apps
  if [ -d "$FRAPPE_APPS_DIR" ]; then
    DISCOVERED_APPS=$(ls -d "$FRAPPE_APPS_DIR"/*/ 2>/dev/null | xargs -I{} basename {} || true)
    echo "  Frappe apps: $DISCOVERED_APPS"
  else
    echo "  Frappe apps: (none — $FRAPPE_APPS_DIR not found)"
  fi

  echo "[Phase 0] Pre-flight PASSED"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — Pull latest code
# ══════════════════════════════════════════════════════════════════════════════
phase_1() {
  echo ""
  echo "[Phase 1] Pulling latest code..."

  cd "$DEPLOY_DIR"
  git checkout main
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
# PHASE 2 — Sync ALL frappe-apps into Frappe containers
# ══════════════════════════════════════════════════════════════════════════════
#
# TWO-TRACK APP MANAGEMENT (DECISION-021):
#   This phase handles SM custom apps ONLY (sm_widgets, sm_connectors, etc.).
#   Ecosystem apps (telephony, crm, helpdesk, lms, wiki, hrms, healthcare,
#   payments) are baked into the Docker image via Dockerfile.frappe.
#   Do NOT add ecosystem apps here — they belong in the image.
#
# Note: frappe-apps/ can also be volume-mounted into the Frappe containers
# via compose.poc-apps.yml. When the volume mount is active, docker cp below
# is a redundant safety sync — the mount is the canonical path.
# Once volume mounts are confirmed stable, this phase can be reduced to just:
#   pip install -e and apps.txt/tabInstalled Application checks.
#
phase_2() {
  echo ""
  echo "[Phase 2] Syncing frappe-apps into Frappe containers..."

  cd "$DEPLOY_DIR"

  # Discover all app directories
  APPS=$(ls -d "$FRAPPE_APPS_DIR"/*/ 2>/dev/null | xargs -I{} basename {} || true)
  if [ -z "$APPS" ]; then
    echo "  No apps found in $FRAPPE_APPS_DIR/ — skipping."
    echo "[Phase 2] DONE (nothing to sync)"
    return
  fi
  echo "  Discovered apps: $APPS"

  for APP in $APPS; do
    echo ""
    echo "  ── Syncing $APP ──"

    # Step 2a — Copy app files into ALL containers
    echo "  [2a] Copying $APP app files..."
    for container in $ALL_FRAPPE_CONTAINERS; do
      if sudo docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        sudo docker cp "$FRAPPE_APPS_DIR/$APP" "$container:$FRAPPE_BENCH/apps/"
        echo "    Copied to $container"
      else
        echo "    SKIP: $container not running"
      fi
    done

    # Step 2b — Pip install in ALL containers
    # Skip apps that have no pyproject.toml (not installable yet).
    # CRITICAL: Also REMOVE from apps.txt if present — a non-installable app in
    # apps.txt causes ModuleNotFoundError which makes bench migrate delete all
    # DocTypes from other custom apps as "orphaned". This destroyed SM Task on
    # 2026-03-27.
    if [ ! -f "$FRAPPE_APPS_DIR/$APP/pyproject.toml" ] && [ ! -f "$FRAPPE_APPS_DIR/$APP/setup.py" ]; then
      echo "  [2b] SKIP $APP — no pyproject.toml or setup.py (not a pip-installable app yet)"
      # Remove from apps.txt if accidentally present (prevents ModuleNotFoundError)
      for container in $ALL_FRAPPE_CONTAINERS; do
        if sudo docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
          if sudo docker exec "$container" bash -c "grep -q '^${APP}$' $FRAPPE_BENCH/sites/apps.txt" 2>/dev/null; then
            sudo docker exec "$container" bash -c "sed -i '/^${APP}$/d' $FRAPPE_BENCH/sites/apps.txt" 2>/dev/null || true
            echo "    REMOVED $APP from apps.txt in $container (was present but not installable)"
          fi
        fi
      done
      echo "  [2c] SKIP $APP — not adding to apps.txt (no Python package)"
      echo "  [2d] SKIP $APP — not adding to tabInstalled Application"
      continue
    fi

    echo "  [2b] Pip installing $APP..."
    for container in $ALL_FRAPPE_CONTAINERS; do
      if sudo docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        sudo docker exec "$container" bash -c \
          "$FRAPPE_BENCH/env/bin/pip install -e $FRAPPE_BENCH/apps/$APP -q 2>&1" | tail -1 || true
        echo "    Installed in $container"
      fi
    done

    # Step 2c — Ensure app is in apps.txt (on backend — shared volume propagates to workers)
    echo "  [2c] Checking apps.txt for $APP..."
    if sudo docker exec "$FRAPPE_BACKEND" bash -c "grep -q '^${APP}$' $FRAPPE_BENCH/sites/apps.txt"; then
      echo "    apps.txt: $APP already present"
    else
      sudo docker exec "$FRAPPE_BACKEND" bash -c "echo $APP >> $FRAPPE_BENCH/sites/apps.txt"
      echo "    apps.txt: $APP ADDED"
    fi

    # Verify workers can see it too (shared volume should propagate, but be safe)
    for container in $FRAPPE_WORKERS; do
      if sudo docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        if ! sudo docker exec "$container" bash -c "grep -q '^${APP}$' $FRAPPE_BENCH/sites/apps.txt" 2>/dev/null; then
          sudo docker exec "$container" bash -c "echo $APP >> $FRAPPE_BENCH/sites/apps.txt" 2>/dev/null || true
          echo "    apps.txt: $APP added to $container"
        fi
      fi
    done

    # Step 2d — Ensure app is in tabInstalled Application
    echo "  [2d] Checking tabInstalled Application for $APP..."
    INSTALL_RESULT=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$FRAPPE_SITE" execute \
      "existing = frappe.db.get_value('Installed Application', {'app_name': '$APP'}, 'name')
if existing:
    print('already_present')
else:
    frappe.get_doc({'doctype': 'Installed Application', 'app_name': '$APP', 'app_version': '0.0.1'}).insert(ignore_permissions=True)
    frappe.db.commit()
    print('inserted')" 2>&1) || INSTALL_RESULT="bench_execute_failed"
    echo "    tabInstalled Application: $INSTALL_RESULT"
  done

  echo ""
  echo "[Phase 2] All apps synced"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2.5 — Render config files from mounted secrets (SEC-002)
# ══════════════════════════════════════════════════════════════════════════════
#
# Medplum v5.x reads DB/Redis passwords from medplum.config.json, not env vars
# (CLAUDE.md gotcha). The tracked template uses ${DB_PASSWORD} / ${REDIS_PASSWORD}
# placeholders; this phase renders the real file from secrets/medplum_db_password
# and secrets/medplum_redis_password via envsubst. Must run before Phase 3 so
# Medplum restarts cleanly if it gets recycled later in the deploy.
#
phase_2_5_render_configs() {
  echo ""
  echo "[Phase 2.5] Rendering config files from secrets..."

  cd "$DEPLOY_DIR"
  bash scripts/render-medplum-config.sh

  echo "[Phase 2.5] DONE"
}

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — Run bench migrate on all registered sites
# ══════════════════════════════════════════════════════════════════════════════
phase_3() {
  echo ""
  echo "[Phase 3] Running bench migrate on all registered sites..."

  # Get all active site names from SM Site Registry on admin site
  # Falls back to LEGACY_SITES env var if admin site not reachable
  SITES=$(sudo docker exec "$FRAPPE_BACKEND" bench --site admin.sparkmojo.com execute \
    "print(' '.join(frappe.db.get_all('SM Site Registry', filters={'is_active': 1}, pluck='frappe_site')))" \
    2>/dev/null) || SITES=""

  # Clean up: strip any non-site-name output (bench prints extra lines)
  SITES=$(echo "$SITES" | grep -v "^$" | tail -1)

  # Fallback: if admin site not reachable or returned empty/error, use LEGACY_SITES
  if [ -z "$SITES" ] || echo "$SITES" | grep -qi "error\|traceback\|exception"; then
    echo "[Phase 3] Admin site not reachable — using LEGACY_SITES fallback: ${LEGACY_SITES:-frontend}"
    SITES="${LEGACY_SITES:-poc-dev.sparkmojo.com admin.sparkmojo.com internal.sparkmojo.com willow.sparkmojo.com}"
  else
    echo "[Phase 3] Sites from SM Site Registry: $SITES"
  fi

  MIGRATE_FAILURES=0
  MIGRATE_COUNT=0
  for SITE in $SITES; do
    MIGRATE_COUNT=$((MIGRATE_COUNT + 1))
    echo ""
    echo "[Phase 3] Migrating site: $SITE"
    MIGRATE_OUTPUT=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$SITE" migrate 2>&1) || true
    echo "$MIGRATE_OUTPUT" | tail -20

    if echo "$MIGRATE_OUTPUT" | grep -qi "error"; then
      echo "[Phase 3] ✗ $SITE migrate FAILED"
      MIGRATE_FAILURES=$((MIGRATE_FAILURES + 1))
    else
      echo "[Phase 3] ✓ $SITE migrate ok"
    fi
  done

  # Verify DocTypes from VERIFY.txt files (run against each migrated site)
  echo ""
  echo "  Verifying DocTypes from VERIFY.txt..."
  cd "$DEPLOY_DIR"
  VERIFY_PASS=true
  for APP_DIR in "$FRAPPE_APPS_DIR"/*/; do
    APP=$(basename "$APP_DIR")
    VERIFY_FILE="$APP_DIR/VERIFY.txt"
    if [ -f "$VERIFY_FILE" ]; then
      DOCTYPE=$(head -1 "$VERIFY_FILE" | tr -d '\r\n')
      if [ -n "$DOCTYPE" ]; then
        for SITE in $SITES; do
          DT_CHECK=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$SITE" execute \
            "print(frappe.db.exists('DocType', '$DOCTYPE'))" 2>&1) || DT_CHECK=""
          if echo "$DT_CHECK" | grep -q "$DOCTYPE"; then
            echo "    $APP: $DOCTYPE on $SITE — EXISTS"
          else
            echo "    $APP: $DOCTYPE on $SITE — NOT FOUND (may not be installed on this site)"
          fi
        done
      fi
    else
      echo "    $APP: no VERIFY.txt — skipping DocType check"
    fi
  done

  # Summary
  if [ $MIGRATE_FAILURES -gt 0 ]; then
    echo ""
    echo "[Phase 3] WARNING: $MIGRATE_FAILURES of $MIGRATE_COUNT site(s) failed migrate. Review logs above."
  else
    echo ""
    echo "[Phase 3] All $MIGRATE_COUNT site(s) migrated successfully."
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
    response=$(curl -s --max-time 5 https://admin.sparkmojo.com/api/method/frappe.ping 2>/dev/null || true)
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
  sudo docker compose -f "$APP_COMPOSE_FILE" --env-file .env.poc build --no-cache poc-api
  sudo docker compose -f "$APP_COMPOSE_FILE" --env-file .env.poc up -d poc-api

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

  # Guard: abort if frontend/ has uncommitted changes.
  # On 2026-03-27 a tool overwrote pages/index.jsx on the VPS without committing,
  # replacing the Desktop/WorkboardMojo routing with a different page structure.
  # Vite then tree-shook out all Mojo code. This check prevents that class of bug.
  DIRTY_FILES=$(git diff --name-only -- frontend/ 2>/dev/null || true)
  if [ -n "$DIRTY_FILES" ]; then
    echo "ABORT: frontend/ has uncommitted changes — build would use wrong source."
    echo "  Modified files:"
    echo "$DIRTY_FILES" | sed 's/^/    /'
    echo ""
    echo "  To fix: git checkout -- frontend/  (restores git HEAD)"
    echo "  Or commit the changes if they are intentional."
    exit 1
  fi
  echo "  Working tree clean: frontend/ matches git HEAD"

  sudo docker compose -f "$APP_COMPOSE_FILE" --env-file .env.poc build --no-cache poc-frontend
  sudo docker compose -f "$APP_COMPOSE_FILE" --env-file .env.poc up -d poc-frontend

  sleep 2

  # Verify index.html and bundle are in sync
  echo "  Verifying bundle hash sync..."

  # Alpine sh in docker exec doesn't expand globs without sh -c
  BUNDLE=$(sudo docker exec "$FRONTEND_CONTAINER" \
    sh -c 'ls /usr/share/nginx/html/assets/index-*.js 2>/dev/null | head -1 | xargs basename' 2>/dev/null || echo "")
  REFERENCED=$(sudo docker exec "$FRONTEND_CONTAINER" \
    grep -o 'assets/index-[^"]*\.js' /usr/share/nginx/html/index.html 2>/dev/null | head -1 || echo "")
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

  # ── KNOWN_FAILURES ─────────────────────────────────────────────────────────
  # Pre-existing failures intentionally ignored by Phase 7 blocker logic.
  # These print a WARNING but do NOT cause "Deploy has failures" exit 1.
  # Remove an entry here once the underlying bug is fixed.
  #
  #   tasks_list_doesnotexist  — J-027: abstraction layer /api/modules/tasks/list
  #                              returns Frappe DoesNotExistError. Pre-existing
  #                              abstraction layer bug, tracked separately.
  #   willow_migrate_denied    — J-026: willow.sparkmojo.com DB not yet
  #                              provisioned; bench migrate fails with access
  #                              denied. Does not affect other sites.
  #   internal_migrate_denied  — J-026: internal.sparkmojo.com DB not yet
  #                              provisioned; bench migrate fails with access
  #                              denied. Does not affect other sites.
  # ────────────────────────────────────────────────────────────────────────────

  cd "$DEPLOY_DIR"
  PASS_COUNT=0
  FAIL_COUNT=0
  KNOWN_FAIL_COUNT=0
  TOTAL_CHECKS=0

  # CHECK 1 — Frappe ping
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if curl -s --max-time 10 https://admin.sparkmojo.com/api/method/frappe.ping | grep -q "pong"; then
    echo "  Frappe ping                       PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  Frappe ping                       FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 2 — Health endpoint
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  HEALTH_RESULT=$(curl -s --max-time 10 https://admin.sparkmojo.com/health 2>/dev/null || echo "")
  if echo "$HEALTH_RESULT" | grep -q '"status"'; then
    echo "  Health endpoint                    PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  Health endpoint                    FAIL"
    echo "       Response: $(echo "$HEALTH_RESULT" | head -c 200)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 3 — Abstraction layer tasks/list (must NOT be Frappe DoesNotExistError)
  # KNOWN_FAILURE: tasks_list_doesnotexist (J-027) — treated as warning, not blocker.
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  AL_RESULT=$(curl -s --max-time 10 https://admin.sparkmojo.com/api/modules/tasks/list 2>/dev/null || echo "")
  if echo "$AL_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if 'DoesNotExistError' not in str(d) and 'exc_type' not in str(d) else 1)" 2>/dev/null; then
    echo "  Abstraction layer tasks/list       PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  Abstraction layer tasks/list       WARN (known pre-existing: J-027)"
    echo "       Response: $(echo "$AL_RESULT" | head -c 200)"
    KNOWN_FAIL_COUNT=$((KNOWN_FAIL_COUNT + 1))
  fi

  # CHECK 4 — Frontend loads with root element
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  FE_RESULT=$(curl -sk --max-time 10 https://poc-dev.app.sparkmojo.com 2>/dev/null || echo "")
  if echo "$FE_RESULT" | grep -q 'id="root"'; then
    echo "  Frontend root element              PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  Frontend root element              FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  # CHECK 5+ — Per-app DocType checks from VERIFY.txt
  for APP_DIR in "$FRAPPE_APPS_DIR"/*/; do
    APP=$(basename "$APP_DIR")
    VERIFY_FILE="$APP_DIR/VERIFY.txt"
    if [ -f "$VERIFY_FILE" ]; then
      DOCTYPE=$(head -1 "$VERIFY_FILE" | tr -d '\r\n')
      if [ -n "$DOCTYPE" ]; then
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

        # Check via Frappe REST API (PermissionError = DocType exists but auth needed)
        ENCODED_DT=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DOCTYPE'))")
        API_RESULT=$(curl -s --max-time 10 "https://admin.sparkmojo.com/api/resource/${ENCODED_DT}?limit=1" 2>/dev/null || echo "")
        if echo "$API_RESULT" | grep -q '"data"'; then
          echo "  $APP: $DOCTYPE API               PASS"
          PASS_COUNT=$((PASS_COUNT + 1))
        elif echo "$API_RESULT" | grep -q "PermissionError"; then
          echo "  $APP: $DOCTYPE API               PASS (auth required)"
          PASS_COUNT=$((PASS_COUNT + 1))
        else
          echo "  $APP: $DOCTYPE API               FAIL"
          echo "       Response: $(echo "$API_RESULT" | head -c 200)"
          FAIL_COUNT=$((FAIL_COUNT + 1))
        fi

        # Also check via bench execute
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        DT_RESULT=$(sudo docker exec "$FRAPPE_BACKEND" bench --site "$FRAPPE_SITE" execute \
          "print(frappe.db.exists('DocType', '$DOCTYPE'))" 2>/dev/null || echo "")
        if echo "$DT_RESULT" | grep -q "$DOCTYPE"; then
          echo "  $APP: $DOCTYPE DocType            PASS"
          PASS_COUNT=$((PASS_COUNT + 1))
        else
          echo "  $APP: $DOCTYPE DocType            FAIL"
          echo "       Result: $DT_RESULT"
          FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
      fi
    else
      echo "  $APP: no VERIFY.txt — skipped"
    fi
  done

  # Summary
  echo ""
  echo "=========================================="
  ELAPSED=$(( $(date +%s) - START_TIME ))
  echo "  Results: $PASS_COUNT/$TOTAL_CHECKS passed, $FAIL_COUNT/$TOTAL_CHECKS failed, $KNOWN_FAIL_COUNT/$TOTAL_CHECKS known pre-existing"
  echo "  Elapsed: ${ELAPSED}s"
  echo "  Log: $LOG_FILE"
  echo "=========================================="

  if [ "$FAIL_COUNT" -eq 0 ]; then
    echo ""
    if [ "$KNOWN_FAIL_COUNT" -gt 0 ]; then
      echo "  Deploy complete — $KNOWN_FAIL_COUNT known pre-existing failure(s) ignored (see WARN above)."
    else
      echo "  Deploy complete — all checks passed."
    fi
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

# Phase 2.5 renders medplum/medplum.config.json from secrets before any
# subsequent service touches the Medplum stack. Only runs on a full deploy
# (not --verify-only, not --phase N) — invoke explicitly if you need it alone:
#   bash scripts/render-medplum-config.sh
if [ "$VERIFY_ONLY" = false ] && [ -z "$RUN_PHASE" ]; then
  phase_2_5_render_configs
fi

should_run 3 && phase_3
should_run 4 && phase_4
if [ "$BACKEND_ONLY" = true ] && [ -z "$RUN_PHASE" ]; then
  echo "[INFO] --backend-only: skipping Phase 5 (abstraction layer rebuild) and Phase 6 (frontend rebuild)"
else
  should_run 5 && phase_5
  should_run 6 && phase_6
fi

# Phase 7 runs at end of full deploy, or on --verify-only, or --phase 7
if should_run 7; then
  phase_7
elif [ "$VERIFY_ONLY" = false ] && [ -z "$RUN_PHASE" ]; then
  phase_7
fi

echo ""
echo "Log file: $LOG_FILE"
