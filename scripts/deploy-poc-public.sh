#!/bin/bash
# Deploy Willow Center POC to public URLs
# Run from the VPS as the deploy user
#
# Endpoints after deployment:
#   https://poc.sparkmojo.com        → Frappe Desk
#   https://app.poc.sparkmojo.com    → React frontend
#   https://api.poc.sparkmojo.com    → Mojo Abstraction Layer
#
# Prerequisites:
#   - Traefik running as reverse proxy
#   - DNS A records for poc, app.poc, api.poc → VPS IP
#   - Frappe POC containers running
#   - spark-mojo-platform repo cloned on VPS

set -euo pipefail

echo "=== Step 1: Examine existing Traefik config ==="
echo "Check running containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20
echo ""
echo "Check for Traefik config..."
ls -la /etc/traefik/ 2>/dev/null || ls -la ~/traefik/ 2>/dev/null || echo "No traefik config dir found — check docker-compose files"

echo ""
echo "=== Step 2: Add Traefik labels to Frappe POC ==="
echo "NOTE: If using docker-compose labels, add to frappe-poc docker-compose.yml:"
cat <<'LABELS'

  # Add to frappe-poc-frontend-1 service:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.frappe-poc.rule=Host(\`poc.sparkmojo.com\`)"
    - "traefik.http.routers.frappe-poc.entrypoints=websecure"
    - "traefik.http.routers.frappe-poc.tls.certresolver=letsencrypt"
    - "traefik.http.services.frappe-poc.loadbalancer.server.port=8080"

LABELS

echo ""
echo "=== Step 3: Build React frontend ==="
FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"
echo "Building from: $FRONTEND_DIR"
cd "$FRONTEND_DIR"

# Use production env
cp .env.production .env.local
pnpm install --frozen-lockfile 2>/dev/null || npm install
pnpm run build 2>/dev/null || npm run build

echo "Build output in $FRONTEND_DIR/dist/"

echo ""
echo "=== Step 4: Serve React frontend ==="
echo "Option A — Nginx vhost (recommended if nginx is installed):"
cat <<'NGINX'

# /etc/nginx/sites-available/app-poc-sparkmojo
server {
    listen 80;
    server_name app.poc.sparkmojo.com;

    root /path/to/spark-mojo-platform/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Traefik handles TLS if in front, otherwise add certbot
}

NGINX

echo "Option B — Docker container with Nginx:"
cat <<'DOCKER'

# Create a simple Dockerfile in frontend/
# FROM nginx:alpine
# COPY dist/ /usr/share/nginx/html/
# COPY nginx.conf /etc/nginx/conf.d/default.conf
#
# Then add Traefik labels:
# labels:
#   - "traefik.enable=true"
#   - "traefik.http.routers.app-poc.rule=Host(\`app.poc.sparkmojo.com\`)"
#   - "traefik.http.routers.app-poc.entrypoints=websecure"
#   - "traefik.http.routers.app-poc.tls.certresolver=letsencrypt"
#   - "traefik.http.services.app-poc.loadbalancer.server.port=80"

DOCKER

echo ""
echo "=== Step 5: Deploy Abstraction Layer ==="
ABSTRACTION_DIR="$(cd "$(dirname "$0")/../abstraction-layer" && pwd)"
echo "Abstraction layer at: $ABSTRACTION_DIR"

echo "Option A — systemd service:"
cat <<'SYSTEMD'

# /etc/systemd/system/mojo-abstraction.service
[Unit]
Description=Mojo Abstraction Layer
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/path/to/spark-mojo-platform/abstraction-layer
Environment=FRAPPE_URL=http://frappe-poc-backend-1:8000
Environment=FRAPPE_API_KEY=your_api_key
Environment=FRAPPE_API_SECRET=your_api_secret
Environment=FRONTEND_URL=https://app.poc.sparkmojo.com
Environment=DEV_MODE=false
ExecStart=/usr/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target

# Then: systemctl enable mojo-abstraction && systemctl start mojo-abstraction

SYSTEMD

echo ""
echo "Traefik route for API:"
cat <<'API_ROUTE'

# Add labels if running in Docker, or Traefik file provider config:
# labels:
#   - "traefik.enable=true"
#   - "traefik.http.routers.api-poc.rule=Host(\`api.poc.sparkmojo.com\`)"
#   - "traefik.http.routers.api-poc.entrypoints=websecure"
#   - "traefik.http.routers.api-poc.tls.certresolver=letsencrypt"
#   - "traefik.http.services.api-poc.loadbalancer.server.port=8001"

API_ROUTE

echo ""
echo "=== Step 6: Update Frappe site config ==="
echo "Run on VPS:"
echo '  docker exec frappe-poc-backend-1 bench --site frontend set-config host_name "https://poc.sparkmojo.com"'

echo ""
echo "=== Step 7: Update CORS in abstraction layer ==="
echo "Already handled — main.py reads FRONTEND_URL env var for CORS origins."
echo "Set FRONTEND_URL=https://app.poc.sparkmojo.com in the service config."

echo ""
echo "=== Step 8: Verification checklist ==="
echo "After deployment, verify:"
echo "  curl -s https://poc.sparkmojo.com | head -5            # Frappe Desk"
echo "  curl -s https://app.poc.sparkmojo.com | head -5        # React app"
echo "  curl -s https://api.poc.sparkmojo.com/health           # Abstraction layer"

echo ""
echo "=== Done! ==="
