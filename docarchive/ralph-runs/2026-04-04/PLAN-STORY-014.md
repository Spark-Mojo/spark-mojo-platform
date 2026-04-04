# PLAN-STORY-014: Medplum Docker Services

## Branch
`story/story-014-medplum-docker`

## Steps

### 1. Switch to story/story-014-medplum-docker branch
```bash
git checkout story/story-014-medplum-docker
```

### 2. Add three Medplum services to docker-compose.poc.yml

Add after the `poc-api` service block. All three services on `frappe_network` only — NO `root_web`, NO Traefik labels, NO external ports.

**Services (from MEDPLUM-INFRA-DESIGN.md § 1):**

```yaml
  # ── Medplum FHIR Server ─────────────────────────────────────
  medplum:
    image: medplum/medplum-server:latest
    networks:
      - frappe_network
    environment:
      - MEDPLUM_PORT=8103
      - MEDPLUM_BASE_URL=http://medplum:8103
      - MEDPLUM_DATABASE_HOST=medplum-postgres
      - MEDPLUM_DATABASE_PORT=5432
      - MEDPLUM_DATABASE_DBNAME=medplum
      - MEDPLUM_DATABASE_USERNAME=medplum
      - MEDPLUM_DATABASE_PASSWORD=${MEDPLUM_DB_PASSWORD}
      - MEDPLUM_REDIS_HOST=medplum-redis
      - MEDPLUM_REDIS_PORT=6379
      - MEDPLUM_REDIS_PASSWORD=${MEDPLUM_REDIS_PASSWORD}
      - MEDPLUM_MAX_JSON_SIZE=16mb
      - MEDPLUM_AUDIT_EVENT_LOG_ENABLED=true
      - MEDPLUM_AUDIT_EVENT_IN_DATABASE=true
    volumes:
      - ./medplum/medplum.config.json:/usr/src/medplum/medplum.config.json:ro
    depends_on:
      medplum-postgres:
        condition: service_healthy
      medplum-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8103/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    restart: unless-stopped

  # ── Medplum PostgreSQL ───────────────────────────────────────
  medplum-postgres:
    image: postgres:16-alpine
    networks:
      - frappe_network
    environment:
      - POSTGRES_DB=medplum
      - POSTGRES_USER=medplum
      - POSTGRES_PASSWORD=${MEDPLUM_DB_PASSWORD}
    volumes:
      - medplum-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medplum -d medplum"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # ── Medplum Redis ────────────────────────────────────────────
  medplum-redis:
    image: redis:7-alpine
    networks:
      - frappe_network
    command: redis-server --requirepass ${MEDPLUM_REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - medplum-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${MEDPLUM_REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

**IMPORTANT per story spec §5:** Use `file:./binary/` for binaryStorage (NOT s3) — DO Spaces S3 fork fix is a separate future story. Remove the S3-related env vars from the medplum service definition in the infra design. The env vars for DO_SPACES_* still go in .env.example for future use.

### 3. Add volumes to docker-compose.poc.yml

Add to the `volumes:` section (create it if it doesn't exist):
```yaml
volumes:
  medplum-postgres-data:
  medplum-redis-data:
```

### 4. Create medplum/medplum.config.json

Create `medplum/medplum.config.json` with config from MEDPLUM-INFRA-DESIGN.md § 2.

**KEY CHANGE:** Set `"binaryStorage": "file:./binary/"` per story spec §5 (DO Spaces S3 fork not ready yet).

Remove `storageBaseUrl` field since we're using file storage, not S3.

Database password and redis password fields in the JSON config use `${MEDPLUM_DB_PASSWORD}` and `${MEDPLUM_REDIS_PASSWORD}` — but note the Medplum server resolves these via environment variables set in docker-compose, not from the JSON file itself. The JSON config file should NOT contain env var references that Medplum can't resolve. Instead, the actual DB/Redis connection details are passed via MEDPLUM_* env vars in docker-compose.

### 5. Add Medplum env vars to .env.example

Add to root `.env.example`:
```
# Medplum
MEDPLUM_DB_PASSWORD=
MEDPLUM_REDIS_PASSWORD=
MEDPLUM_BASE_URL=http://medplum:8103
MEDPLUM_CLIENT_ID=
MEDPLUM_CLIENT_SECRET=
DO_SPACES_BUCKET=sparkmojo-medplum
DO_SPACES_REGION=nyc3
DO_SPACES_KEY=
DO_SPACES_SECRET=
```

### 6. Verification

- `docker compose -f docker-compose.poc.yml config` — validates YAML syntax
- No Traefik labels on any Medplum service
- No external ports exposed
- All three services on frappe_network only
- Health checks defined on all three services
- Volume definitions present
- medplum.config.json exists with correct fields

### Constraints
- Do NOT deploy to VPS
- Do NOT modify existing services (poc-frontend, poc-api)
- Do NOT expose Medplum ports externally
- Do NOT add Traefik labels to Medplum services

### Commit Message
`feat: Medplum Docker services — medplum-server, medplum-postgres, medplum-redis (internal only)`
