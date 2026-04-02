#!/usr/bin/env bash
# docker-cleanup.sh — Scheduled Docker disk maintenance
# Run weekly via cron or manually after heavy build sessions.
# Safe to run while containers are running — only removes unused resources.
#
# DECISION-021 context: Docker image builds (Dockerfile.frappe) and
# deploy.sh --no-cache rebuilds accumulate layers and cache. This script
# prevents disk exhaustion on the VPS.
#
# Usage:
#   ./docker-cleanup.sh              # Standard cleanup (safe)
#   ./docker-cleanup.sh --aggressive # Also removes all unused images (reclaims more)
set -eo pipefail
echo "=== Docker Disk Cleanup — $(date) ==="
echo ""
# Show current usage
echo "--- Before ---"
sudo docker system df
echo ""
# Standard cleanup: remove stopped containers, dangling images, unused networks, build cache
sudo docker container prune -f
sudo docker image prune -f
sudo docker network prune -f
sudo docker builder prune -f --filter 'until=48h'
if [ "${1}" = "--aggressive" ]; then
  echo ""
  echo "--- Aggressive mode: removing ALL unused images ---"
  sudo docker image prune -a -f --filter 'until=72h'
fi
echo ""
echo "--- After ---"
sudo docker system df
echo ""
echo "Cleanup complete."
