#!/usr/bin/env bash
# Run this from spark-mojo-platform directory:
# bash FIX-CERTS.sh

set -e

cd /Users/jamesilsley/GitHub/spark-mojo-platform

# Commit the fixed docker-compose.poc.yml (already written by Claude Chat)
git add docker-compose.poc.yml
git commit -m "fix: explicit Host() rules for all subdomains — ACME cert issuance requires explicit Host not HostRegexp"
git push origin main

# Deploy to VPS
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && docker compose -f docker-compose.poc.yml up -d --force-recreate'

echo ""
echo "Waiting 30s for Traefik to pick up new labels and request certs..."
sleep 30

echo ""
echo "=== Cert check ==="
ssh sparkmojo 'docker exec root-traefik-1 cat /letsencrypt/acme.json 2>/dev/null' | \
  python3 -c "
import sys,json
d=json.load(sys.stdin)
for r,v in d.items():
    for c in v.get('Certificates',[]):
        print(c.get('domain',{}).get('main','?'))
" 2>/dev/null

echo ""
echo "=== Site checks ==="
for URL in \
  https://poc-dev.app.sparkmojo.com \
  https://internal.app.sparkmojo.com \
  https://willow.app.sparkmojo.com \
  https://poc.sparkmojo.com \
  https://app.poc.sparkmojo.com; do
  STATUS=$(curl -sI --max-time 10 "$URL" 2>/dev/null | head -1 | awk '{print $2}')
  echo "$URL → $STATUS"
done
