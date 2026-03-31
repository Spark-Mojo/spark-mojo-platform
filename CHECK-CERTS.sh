#!/usr/bin/env bash
# Run this on the VPS to diagnose cert failures
# ssh sparkmojo 'bash -s' < CHECK-CERTS.sh

echo "=== Traefik logs — cert/acme errors ==="
docker logs root-traefik-1 2>&1 | grep -i "acme\|cert\|tls\|error\|poc-dev\|willow\|internal\|admin" | tail -30

echo ""
echo "=== acme.json — which certs exist ==="
docker exec root-traefik-1 cat /letsencrypt/acme.json 2>/dev/null | \
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    for resolver, data in d.items():
        certs = data.get('Certificates', [])
        print(f'Resolver: {resolver} — {len(certs)} certs')
        for c in certs:
            domain = c.get('domain', {})
            print(f'  {domain.get(\"main\", \"?\")}')
except Exception as e:
    print(f'Error parsing: {e}')
    sys.exit(1)
" 2>/dev/null || echo "acme.json not readable or empty"

echo ""
echo "=== Port 80 reachability test ==="
curl -sI http://poc-dev.sparkmojo.com/.well-known/acme-challenge/test 2>&1 | head -5
