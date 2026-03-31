#!/usr/bin/env bash
# smoke_test.sh — End-to-end verification for all registered Spark Mojo sites
# Authority: DECISION-017, INFRA-007
# Usage: ./scripts/smoke_test.sh

set -uo pipefail

FRAPPE_CONTAINER="frappe-poc-backend-1"
SITES=("admin" "poc-dev" "internal" "willow")
DOMAINS=("admin.sparkmojo.com" "poc-dev.app.sparkmojo.com" "internal.app.sparkmojo.com" "willow.app.sparkmojo.com")
FRAPPE_SITES=("admin.sparkmojo.com" "poc-dev.sparkmojo.com" "internal.sparkmojo.com" "willow.sparkmojo.com")

FAILURES=0

for i in "${!SITES[@]}"; do
  SUBDOMAIN="${SITES[$i]}"
  DOMAIN="${DOMAINS[$i]}"
  FRAPPE_SITE="${FRAPPE_SITES[$i]}"

  echo ""
  echo "=== Smoke test: $SUBDOMAIN ($DOMAIN) ==="

  # TEST 1: HTTPS responds
  HTTP_STATUS=$(curl -skI "https://${DOMAIN}" --max-time 10 2>/dev/null | head -1 | awk '{print $2}' || true)
  if [[ "$HTTP_STATUS" == "200" ]] || [[ "$HTTP_STATUS" == "302" ]] || [[ "$HTTP_STATUS" == "301" ]]; then
    echo "✓ HTTPS: $HTTP_STATUS"
  else
    echo "✗ HTTPS: got '$HTTP_STATUS' (DNS/TLS may not be configured yet)"
    FAILURES=$((FAILURES + 1))
  fi

  # TEST 2: Abstraction layer health
  HEALTH=$(curl -skf "https://${DOMAIN}/health" --max-time 10 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unreachable")
  if [[ "$HEALTH" == "ok" ]]; then
    echo "✓ Abstraction layer: $HEALTH"
  else
    echo "✗ Abstraction layer: $HEALTH"
    FAILURES=$((FAILURES + 1))
  fi

  # TEST 3: Frappe site in bench
  SITE_EXISTS=$(docker exec ${FRAPPE_CONTAINER} bench list-sites 2>/dev/null | \
    grep -c "${FRAPPE_SITE}" || true)
  if [[ "$SITE_EXISTS" -gt 0 ]]; then
    echo "✓ Frappe site: registered in bench"
  else
    echo "✗ Frappe site: NOT found in bench list-sites"
    FAILURES=$((FAILURES + 1))
  fi

  # TEST 4: SM Site Registry active
  REGISTRY=$(docker exec ${FRAPPE_CONTAINER} bench --site admin.sparkmojo.com execute \
    "frappe.db.get_value" --args "['SM Site Registry', '${SUBDOMAIN}', 'is_active']" 2>/dev/null || echo "error")
  if [[ "$REGISTRY" == *"1"* ]]; then
    echo "✓ SM Site Registry: active"
  else
    echo "✗ SM Site Registry: $REGISTRY"
    FAILURES=$((FAILURES + 1))
  fi

done

echo ""
if [[ $FAILURES -eq 0 ]]; then
  echo "All smoke tests passed across ${#SITES[@]} sites."
  exit 0
else
  echo "$FAILURES test(s) failed. Review output above."
  exit 1
fi
