# INFRA-TRAEFIK: Multi-Site Traefik Routing + Frappe Multi-Site Mode

**Priority:** Required before Ralph INFRA run can succeed  
**Assigned to:** Claude Code (interactive session)  
**Do not run via Ralph** — this is a targeted infrastructure change, run directly.

---

## Context

The three-site topology requires routing for four Frappe sites:
- `admin.sparkmojo.com` → Frappe Desk for Admin Console site
- `poc-dev.app.sparkmojo.com` → React frontend + abstraction layer for POC/Dev
- `internal.app.sparkmojo.com` → React frontend + abstraction layer for SM Internal
- `willow.app.sparkmojo.com` → React frontend + abstraction layer for Willow

Currently `docker-compose.poc.yml` only routes `app.poc.sparkmojo.com` (React) and
`poc.sparkmojo.com` (Frappe Desk for the single existing site). Everything is hardcoded
to a single site.

The `pwd.yml` Frappe stack uses `FRAPPE_SITE_NAME_HEADER: frontend` — hardcoded to one
site. For multi-site routing, this must change to `$$host` so Frappe uses the HTTP Host
header to determine which site's database to use.

---

## What Needs to Change

### Change 1: pwd.yml — Enable Frappe Multi-Site Mode

File: `/home/ops/frappe-poc/pwd.yml`

In the `frontend:` service, change:
```yaml
      FRAPPE_SITE_NAME_HEADER: frontend
```
to:
```yaml
      FRAPPE_SITE_NAME_HEADER: $$host
```

This tells Frappe's nginx to use the incoming Host header to select the site. This is
Frappe's standard multi-site pattern. It works because each Frappe site is named after
its hostname (e.g., `admin.sparkmojo.com`, `willow.sparkmojo.com`).

### Change 2: docker-compose.poc.yml — Add Routing for All Sites

File: `/home/ops/spark-mojo-platform/docker-compose.poc.yml`
Also update local copy: `/Users/jamesilsley/GitHub/spark-mojo-platform/docker-compose.poc.yml`

**Replace the current `poc-frontend` service labels** with a wildcard rule that covers
all `*.app.sparkmojo.com` subdomains (React frontend — same build serves all sites):

```yaml
  poc-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    networks:
      - root_web
    labels:
      - "traefik.enable=true"
      # Wildcard: all *.app.sparkmojo.com subdomains → React frontend
      - "traefik.http.routers.app-all.rule=HostRegexp(`{subdomain:[a-z0-9-]+}.app.sparkmojo.com`)"
      - "traefik.http.routers.app-all.entrypoints=websecure"
      - "traefik.http.routers.app-all.tls.certresolver=mytlschallenge"
      - "traefik.http.services.app-all.loadbalancer.server.port=80"
      - "traefik.docker.network=root_web"
    restart: unless-stopped
```

**Replace the `poc-api` service labels** with wildcard rules covering all subdomains:

```yaml
  poc-api:
    build:
      context: ./abstraction-layer
      dockerfile: Dockerfile
    networks:
      - root_web
      - frappe_network
    env_file:
      - .env.poc
    labels:
      - "traefik.enable=true"
      # Wildcard health: *.app.sparkmojo.com/health and *.sparkmojo.com/health
      - "traefik.http.routers.api-health.rule=PathPrefix(`/health`)"
      - "traefik.http.routers.api-health.entrypoints=websecure"
      - "traefik.http.routers.api-health.tls.certresolver=mytlschallenge"
      - "traefik.http.routers.api-health.priority=100"
      # Wildcard modules: all *.app.sparkmojo.com/api/modules/*
      - "traefik.http.routers.api-modules.rule=HostRegexp(`{subdomain:[a-z0-9-]+}.app.sparkmojo.com`) && PathPrefix(`/api/modules/`)"
      - "traefik.http.routers.api-modules.entrypoints=websecure"
      - "traefik.http.routers.api-modules.tls.certresolver=mytlschallenge"
      - "traefik.http.routers.api-modules.priority=100"
      # Specific legacy routes (preserve existing poc.sparkmojo.com routing)
      - "traefik.http.routers.api-poc.rule=Host(`api.poc.sparkmojo.com`)"
      - "traefik.http.routers.api-poc.entrypoints=websecure"
      - "traefik.http.routers.api-poc.tls.certresolver=mytlschallenge"
      - "traefik.http.services.api-poc.loadbalancer.server.port=8001"
      - "traefik.docker.network=root_web"
    restart: unless-stopped
```

### Change 3: pwd.yml — Add Traefik Labels for All Frappe Desk Subdomains

The `frontend` service in `pwd.yml` needs to handle all four Frappe Desk subdomains.
The existing `poc.sparkmojo.com` rule was added in the 502 hotfix. Expand it to cover
all sites with a wildcard:

In `pwd.yml` `frontend:` service labels, replace the current single-site labels with:

```yaml
    labels:
      - "traefik.enable=true"
      # poc.sparkmojo.com → Frappe Desk (existing POC entry point)
      - "traefik.http.routers.frappe-poc.rule=Host(`poc.sparkmojo.com`)"
      - "traefik.http.routers.frappe-poc.entrypoints=websecure"
      - "traefik.http.routers.frappe-poc.tls.certresolver=mytlschallenge"
      - "traefik.http.services.frappe-poc.loadbalancer.server.port=8080"
      - "traefik.docker.network=root_web"
      # admin.sparkmojo.com → Frappe Desk for Admin Console
      - "traefik.http.routers.frappe-admin.rule=Host(`admin.sparkmojo.com`)"
      - "traefik.http.routers.frappe-admin.entrypoints=websecure"
      - "traefik.http.routers.frappe-admin.tls.certresolver=mytlschallenge"
      - "traefik.http.services.frappe-admin.loadbalancer.server.port=8080"
      # internal.sparkmojo.com → Frappe Desk for SM Internal
      - "traefik.http.routers.frappe-internal.rule=Host(`internal.sparkmojo.com`)"
      - "traefik.http.routers.frappe-internal.entrypoints=websecure"
      - "traefik.http.routers.frappe-internal.tls.certresolver=mytlschallenge"
      - "traefik.http.services.frappe-internal.loadbalancer.server.port=8080"
      # willow.sparkmojo.com → Frappe Desk for Willow
      - "traefik.http.routers.frappe-willow.rule=Host(`willow.sparkmojo.com`)"
      - "traefik.http.routers.frappe-willow.entrypoints=websecure"
      - "traefik.http.routers.frappe-willow.tls.certresolver=mytlschallenge"
      - "traefik.http.services.frappe-willow.loadbalancer.server.port=8080"
```

---

## Implementation Steps

### Step 1: Make changes locally and commit

```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform

# Edit docker-compose.poc.yml with the changes in Change 2 above
# (edit the file, then verify before committing)

# Verify the file looks correct
cat docker-compose.poc.yml

# Commit
git add docker-compose.poc.yml
git commit -m "infra: multi-site Traefik routing for three-site topology (INFRA-TRAEFIK)"
git push origin main
```

### Step 2: Apply changes on VPS

```bash
ssh sparkmojo

# Update local repo
cd /home/ops/spark-mojo-platform
git pull origin main

# Edit pwd.yml — apply Change 1 (FRAPPE_SITE_NAME_HEADER) and Change 3 (labels)
nano /home/ops/frappe-poc/pwd.yml

# Restart Frappe frontend to apply multi-site header change
cd /home/ops/frappe-poc
docker compose -f pwd.yml up -d --force-recreate frontend

# Restart spark-mojo-platform containers to apply new Traefik labels
cd /home/ops/spark-mojo-platform
docker compose -f docker-compose.poc.yml up -d --force-recreate

# Wait 15 seconds for Traefik to pick up new labels
sleep 15
```

### Step 3: Verify existing site still works

```bash
# Existing POC site must still work after the change
curl -sI https://poc.sparkmojo.com
# PASS: HTTP/2 200 or 302

curl -s https://poc.sparkmojo.com/health
# PASS: {"status":"ok","frappe_connected":true}

curl -sI https://app.poc.sparkmojo.com
# PASS: HTTP/2 200
```

### Step 4: Verify new subdomains route correctly (DNS must be propagated first)

```bash
# These will only work once DNS propagates (dig +short admin.sparkmojo.com returns IP)
# Run these checks — if DNS not yet propagated, document and skip

curl -sI https://admin.sparkmojo.com
# PASS: HTTP/2 200 or redirect (will show Frappe login initially — no site created yet)
# ACCEPTABLE: 404 or 502 if site not yet provisioned — routing is what matters

curl -sI https://willow.app.sparkmojo.com
# PASS: HTTP/2 200 or redirect
# ACCEPTABLE: 404 if site not yet provisioned
```

### Step 5: Write completion marker

```bash
# If all Step 3 checks pass (Step 4 DNS dependent — acceptable if pending):
touch /Users/jamesilsley/GitHub/spark-mojo-platform/INFRA-TRAEFIK-COMPLETE
git add INFRA-TRAEFIK-COMPLETE
git commit -m "infra: Traefik multi-site routing verified complete"
git push origin main
```

---

## Do NOT

- Do not modify `deploy.sh`
- Do not modify any frontend code
- Do not change anything in `abstraction-layer/`
- Do not run `bench` commands — this is Traefik/Docker config only
- Do not modify `FRAPPE_SITE_NAME_HEADER` to anything other than `$$host`
  (the `$$` double-dollar is required by Docker Compose to escape the `$` character)

---

## If Existing Site Breaks After Change

If `poc.sparkmojo.com` stops working after restarting:

```bash
# Check Traefik is routing correctly
docker logs root-traefik-1 --tail 20 | grep -i "poc\|error"

# Check Frappe frontend container is healthy
docker logs frappe-poc-frontend-1 --tail 10

# Most likely cause: FRAPPE_SITE_NAME_HEADER change
# The existing site must be renamed from 'frontend' to 'poc.sparkmojo.com' in bench
# for $$host routing to work:
docker exec spark-mojo-platform-poc-frappe-1 bench list-sites
# If still named 'frontend': the rename to poc-dev.sparkmojo.com hasn't happened yet
# In that case: revert FRAPPE_SITE_NAME_HEADER back to 'frontend' temporarily
# and document in BLOCKED-INFRA-TRAEFIK.md
```

**Important:** The `FRAPPE_SITE_NAME_HEADER: $$host` change only works correctly AFTER
the existing `frontend` site has been renamed to `poc-dev.sparkmojo.com` in INFRA-007
Step 1. If the rename hasn't happened yet, keep `FRAPPE_SITE_NAME_HEADER: frontend` for
now and note this in the completion marker. The `$$host` change will be applied as part
of INFRA-007 Step 1.
