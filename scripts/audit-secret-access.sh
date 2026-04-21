#!/usr/bin/env bash
# Daily/on-demand report of secret-file access events.
# Uses -if to work around Ubuntu 24.04 log enrichment breaking default ausearch.
set -euo pipefail
START="${1:-today}"
AUDIT_LOG="${AUDIT_LOG:-/var/log/audit/audit.log}"
echo "=== sm_secrets access events since $START ==="
sudo ausearch -if "$AUDIT_LOG" -k sm_secrets --start "$START" -i 2>/dev/null | head -200 || echo "(no events)"
echo ""
echo "=== frappe_site_config modifications since $START ==="
sudo ausearch -if "$AUDIT_LOG" -k frappe_site_config --start "$START" -i 2>/dev/null | head -200 || echo "(no events)"
