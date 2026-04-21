#!/usr/bin/env bash
# Daily/on-demand report of secret-file access events.
set -euo pipefail
START="${1:-today}"
echo "=== sm_secrets access events since $START ==="
sudo ausearch -k sm_secrets --start "$START" -i 2>/dev/null | head -200 || echo "(no events)"
echo ""
echo "=== frappe_site_config modifications since $START ==="
sudo ausearch -k frappe_site_config --start "$START" -i 2>/dev/null | head -200 || echo "(no events)"
