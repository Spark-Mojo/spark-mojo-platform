# Secrets Management Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Spark Mojo Platform secret handling from plaintext `.env.poc` + tracked-at-risk `medplum.config.json` to a Infisical-backed, Docker Compose `secrets:`-mounted, split-compose architecture that is acceptable for PHI workloads (Willow).

**Architecture:** Four sequential phases, each ending in a deployed working state:

1. **Structural cleanup** — split `docker-compose.poc.yml` into three stack files + umbrella. No behavior change.
2. **Runtime isolation** — move secrets from `environment:` / `.env` substitution to Docker Compose `secrets:` blocks that mount as files in `/run/secrets/*`. Apps refactored to read from files.
3. **Source of truth** — Infisical becomes canonical. `deploy.sh` fetches secrets from Infisical at deploy time. Monthly sync cron (rotation cadence is owned by DECISION-031, not this plan).
4. **PHI hardening** — per-site Frappe `encryption_key` in Infisical, auditd on secret files, access logging, documented rotation runbook.

**Tech Stack:**
- Infisical (cloud free tier; self-host on DO fallback if cost ever bites or PHI compliance requires owned infra)
- `infisical` CLI (Go binary; install via apt, brew, or official installer)
- Docker Compose v2 `secrets:` blocks (file-mount semantics, not Swarm secrets)
- Existing stack: Frappe / FastAPI abstraction layer / Medplum v5.x / Traefik
- `auditd` + `ausearch` on Ubuntu 24.04
- `cron` for monthly Infisical→VPS sync (not rotation — see DECISION-031)
- `gitleaks` for CI secret-scanning

**Out of scope:**
- HashiCorp Vault / AWS Secrets Manager (reassess when PHI moves to segmented host).
- Docker Swarm secrets (we're running single-host Compose; file-mount secrets give us the same runtime model without adopting Swarm).
- Changing Frappe's native `site_config.json` storage model — Frappe manages those on disk; we only cover the encryption_key provisioning flow.

---

## Locked decisions (see DECISION-031)

The following are resolved and not open for change during implementation. If a task appears to contradict them, stop and write `BLOCKED-*.md`.

- **Topology:** two Infisical projects — `sm-platform-shared` (infrastructure + non-PHI-tenant secrets) and `sm-willow` (Willow-specific, PHI-adjacent material). Each has `dev` and `prod` environments.
- **Access tokens:** two Machine Identity service tokens, read-only, one per host:
  - Mac: `~/.infisical-token-dev` — reads `dev` environment on both projects
  - VPS: `/home/ops/.infisical-token-prod` — reads `prod` environment on both projects
- **Service token rotation:** 90 days (Infisical-native).
- **Secret rotation cadence:** per matrix in DECISION-031. Monthly cron in Task 3.4 is a **sync**, not a rotation — it pulls current Infisical values and redeploys changed services.
- **Fallback (SOPS + age):** activates only on the three triggers listed in DECISION-031. Do not invoke proactively.

---

## Prerequisites

Before starting Phase 1:

- [ ] Immediate secret-hygiene fixes from 2026-04-20 audit are landed on `main` (commit `5af875c`). Verify: `git log --oneline main | grep 5af875c`.
- [ ] Infisical organization provisioned by James. Two projects created: `sm-platform-shared` and `sm-willow`. Each with `dev` and `prod` environments. (Topology per DECISION-031.)
- [ ] `INFISICAL_TOKEN` generated (machine token, project-scoped, read-only to start). Stored in Bitwarden password vault under a dedicated "Infisical tokens" folder.
- [ ] Baseline backup of current `.env.poc` taken and stored encrypted offline. Source of truth for Phase 3's import.
- [ ] `platform/decisions/DECISION-XXX-secrets-management.md` drafted in `sparkmojo-internal` governance repo (architecture lock).

---

## File Structure Changes

**New files in this repo:**
- `docker-compose.frappe.yml` — Frappe backend, frontend, db, scheduler, websocket, redis-cache, redis-queue
- `docker-compose.medplum.yml` — medplum-server, medplum-postgres, medplum-redis
- `docker-compose.app.yml` — poc-api (FastAPI), poc-frontend (nginx)
- `docker-compose.yml` — umbrella (`include:` the three above)
- `secrets/` — gitignored local dev secret files (one file per secret, 0600)
- `scripts/infisical-fetch.sh` — `infisical export` wrapper used by deploy.sh
- `scripts/rotate-secrets.sh` — monthly rotation entry point
- `scripts/audit-secret-access.sh` — ausearch-based secret-file-access report
- `.github/workflows/secret-scan.yml` — gitleaks CI

**Modified:**
- `deploy.sh` — new `phase_2_5_fetch_secrets()`, swap `--env-file` for secrets-dir mount
- `docker-compose.poc.yml` — eventually deleted after umbrella replaces it
- `abstraction-layer/auth.py`, `abstraction-layer/google_auth.py` — `os.getenv` → `read_secret("google_client_secret")` helper
- `medplum/medplum.config.json.example` — documented generator flow, never hand-written passwords
- `.gitignore` — add `secrets/`, `*.env.runtime`, `.infisical-token`
- `CLAUDE.md` — secret-handling gotchas rewritten

**Untracked on VPS after Phase 3 ships:**
- `/home/ops/spark-mojo-platform/.env.poc` — replaced by ephemeral `/home/ops/spark-mojo-platform/secrets/*` files materialized by deploy.sh, shredded after compose up if possible.

---

## Phase 1: Split the compose file

**Risk:** Low. Structural refactor, no behavior change.
**Ships when:** `deploy.sh` succeeds end-to-end using the new compose files; all 6/6 Phase 7 checks pass on the VPS.

### Task 1.1: Extract Frappe services

**Files:**
- Create: `docker-compose.frappe.yml`
- Read: `docker-compose.poc.yml`

- [ ] **Step 1: Enumerate Frappe-stack services**

Run: `grep -nE '^  [a-z][a-z0-9-]+:' docker-compose.poc.yml`

Expected: list of every top-level service. Identify the Frappe cluster (backend, frontend, db, scheduler, websocket, redis-cache, redis-queue, configurator, create-site).

- [ ] **Step 2: Write docker-compose.frappe.yml**

Copy the Frappe-cluster services verbatim, plus the `networks:` and `volumes:` they reference. Use the same network name (`frappe_network` or whatever is current) so the umbrella can attach the other stacks to it.

- [ ] **Step 3: Validate compose config**

Run: `docker compose -f docker-compose.frappe.yml --env-file .env.poc config > /dev/null`
Expected: no output, exit 0. Any errors = fix missing refs before continuing.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.frappe.yml
git commit -m "chore(compose): extract Frappe stack into its own file"
```

### Task 1.2: Extract Medplum services

**Files:**
- Create: `docker-compose.medplum.yml`

- [ ] **Step 1: Copy Medplum services**

Include `medplum`, `medplum-postgres`, `medplum-redis`, their `healthcheck:`, `volumes:`, and `networks:` stanzas.

- [ ] **Step 2: Validate + commit**

```bash
docker compose -f docker-compose.medplum.yml --env-file .env.poc config > /dev/null
git add docker-compose.medplum.yml
git commit -m "chore(compose): extract Medplum stack into its own file"
```

### Task 1.3: Extract app services

**Files:**
- Create: `docker-compose.app.yml`

- [ ] **Step 1: Copy poc-api and poc-frontend**

Include all Traefik labels verbatim — these are load-bearing for routing.

- [ ] **Step 2: Validate + commit**

```bash
docker compose -f docker-compose.app.yml --env-file .env.poc config > /dev/null
git add docker-compose.app.yml
git commit -m "chore(compose): extract poc-api + poc-frontend into app file"
```

### Task 1.4: Write the umbrella file

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Author umbrella**

```yaml
include:
  - path: docker-compose.frappe.yml
  - path: docker-compose.medplum.yml
  - path: docker-compose.app.yml
```

- [ ] **Step 2: Validate full-stack config**

Run: `docker compose --env-file .env.poc config > /dev/null`
Expected: exit 0, single consolidated config with all services.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore(compose): add umbrella docker-compose.yml including three stacks"
```

### Task 1.5: Update deploy.sh to target split compose

**Files:**
- Modify: `deploy.sh:13` (COMPOSE_FILE), `deploy.sh:386-389`, `deploy.sh:427-430`

- [ ] **Step 1: Change COMPOSE_FILE to app-only when only app is being touched**

Current: `COMPOSE_FILE="docker-compose.poc.yml"`. New: keep this variable for full-stack operations, add `APP_COMPOSE_FILE="docker-compose.app.yml"`, and swap the Phase 5 and Phase 6 calls to the app file (which is all they currently touch).

```bash
COMPOSE_FILE="docker-compose.yml"
APP_COMPOSE_FILE="docker-compose.app.yml"
```

Phase 5/6 calls:
```bash
sudo docker compose -f "$APP_COMPOSE_FILE" --env-file .env.poc build --no-cache poc-api
sudo docker compose -f "$APP_COMPOSE_FILE" --env-file .env.poc up -d poc-api
# ...and same pattern for poc-frontend
```

This fixes the *root* cause of the MEDPLUM_*_PASSWORD warnings: compose never parses Medplum services when we only want to touch the app stack.

- [ ] **Step 2: Run `./deploy.sh --verify-only` locally against docs**

Expected: all 6 checks pass (acknowledging the known-pre-existing J-027 warning).

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "feat(deploy): use app-only compose file for Phase 5/6 rebuilds"
```

### Task 1.6: Ship Phase 1 to VPS

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Deploy**

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
```

Expected: no MEDPLUM_*_PASSWORD warnings anywhere. 5/6 or 6/6 Phase 7 checks pass.

- [ ] **Step 3: Verify end-to-end in browser**

Hit: `https://poc-dev.app.sparkmojo.com`, `https://admin.sparkmojo.com`, `https://willow.app.sparkmojo.com`, and the Medplum endpoint.
Expected: all three Frappe sites load; Medplum healthcheck green.

- [ ] **Step 4: Delete `docker-compose.poc.yml` after 7-day soak**

After one week with no regressions, run locally and commit:
```bash
git rm docker-compose.poc.yml
git commit -m "chore(compose): remove deprecated docker-compose.poc.yml after 7-day soak"
git push origin main
```

---

## Phase 2: Runtime isolation with Docker Compose `secrets:` blocks

**Risk:** Medium. App code changes. Requires one coordinated deploy.
**Ships when:** No secret appears in the output of `docker inspect` for any container; apps read secrets from files; all services healthy.

### Task 2.1: Define the secret helper in Python

**Files:**
- Create: `abstraction-layer/secrets_loader.py`
- Test: `abstraction-layer/tests/test_secrets_loader.py`

- [ ] **Step 1: Write the failing test**

```python
# abstraction-layer/tests/test_secrets_loader.py
import os
import pytest
from pathlib import Path
from secrets_loader import read_secret, SecretNotFoundError


def test_read_secret_from_run_secrets(tmp_path, monkeypatch):
    secrets_dir = tmp_path / "secrets"
    secrets_dir.mkdir()
    (secrets_dir / "google_client_secret").write_text("test-value\n")
    monkeypatch.setenv("SECRETS_DIR", str(secrets_dir))

    assert read_secret("google_client_secret") == "test-value"


def test_read_secret_strips_trailing_newline(tmp_path, monkeypatch):
    secrets_dir = tmp_path / "secrets"
    secrets_dir.mkdir()
    (secrets_dir / "x").write_text("abc\n\n")
    monkeypatch.setenv("SECRETS_DIR", str(secrets_dir))

    assert read_secret("x") == "abc"


def test_read_secret_missing_raises(tmp_path, monkeypatch):
    monkeypatch.setenv("SECRETS_DIR", str(tmp_path))
    with pytest.raises(SecretNotFoundError):
        read_secret("does_not_exist")


def test_read_secret_falls_back_to_env_var_in_dev(tmp_path, monkeypatch):
    # In dev, if SECRETS_DIR is unset, fall back to uppercase env var
    monkeypatch.delenv("SECRETS_DIR", raising=False)
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "dev-value")

    assert read_secret("google_client_secret") == "dev-value"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd abstraction-layer && pytest tests/test_secrets_loader.py -v`
Expected: `ModuleNotFoundError: No module named 'secrets_loader'`.

- [ ] **Step 3: Implement secrets_loader.py**

```python
# abstraction-layer/secrets_loader.py
import os
from pathlib import Path


class SecretNotFoundError(RuntimeError):
    pass


def read_secret(name: str) -> str:
    """Read a secret by name.

    Production: reads from $SECRETS_DIR/<name> (mounted by Docker Compose).
    Dev: falls back to the uppercase env var of the same name.
    """
    secrets_dir = os.environ.get("SECRETS_DIR")
    if secrets_dir:
        path = Path(secrets_dir) / name
        if path.exists():
            return path.read_text().rstrip("\n")
        raise SecretNotFoundError(f"{name} not found in {secrets_dir}")

    env_val = os.environ.get(name.upper())
    if env_val is not None:
        return env_val

    raise SecretNotFoundError(f"{name} not found: SECRETS_DIR unset and ${name.upper()} unset")
```

- [ ] **Step 4: Run tests, all pass**

Run: `cd abstraction-layer && pytest tests/test_secrets_loader.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add abstraction-layer/secrets_loader.py abstraction-layer/tests/test_secrets_loader.py
git commit -m "feat(mal): add secrets_loader for file-backed secret reads"
```

### Task 2.2: Migrate google_auth.py to secrets_loader

**Files:**
- Modify: `abstraction-layer/google_auth.py`

- [ ] **Step 1: Find all GOOGLE_CLIENT_* reads**

Run: `grep -nE "os\.(getenv|environ)\[?.?GOOGLE_CLIENT" abstraction-layer/`
Expected: 2-4 hits (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).

- [ ] **Step 2: Replace**

For GOOGLE_CLIENT_SECRET: `os.getenv("GOOGLE_CLIENT_SECRET", "")` → `read_secret("google_client_secret")`
For GOOGLE_CLIENT_ID: leave as env (it's not actually a secret; it's public in OAuth redirects).

- [ ] **Step 3: Run auth tests**

Run: `cd abstraction-layer && pytest tests/ -v -k auth`
Expected: no regressions.

- [ ] **Step 4: Commit**

```bash
git add abstraction-layer/google_auth.py
git commit -m "refactor(mal): read GOOGLE_CLIENT_SECRET via secrets_loader"
```

### Task 2.3: Migrate all other MAL secrets

**Files:**
- Modify: any file in `abstraction-layer/` that reads a password, API key, or token from env

- [ ] **Step 1: Inventory**

Run: `grep -rnE 'os\.(getenv|environ)\[?.?[A-Z_]*(SECRET|PASSWORD|TOKEN|KEY|DSN)' abstraction-layer/`
Expected: list of all secret env-var reads.

- [ ] **Step 2: Triage**

For each hit, classify:
- Actual secret (password, API key, token) → migrate to secrets_loader
- Public config (URL, client ID, feature flag) → leave as env

- [ ] **Step 3: Migrate each actual secret**

Same pattern as 2.2.

- [ ] **Step 4: Run full MAL test suite**

Run: `cd abstraction-layer && pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=70`
Expected: all pass, coverage ≥70%.

- [ ] **Step 5: Commit**

```bash
git add abstraction-layer/
git commit -m "refactor(mal): migrate remaining secrets to secrets_loader"
```

### Task 2.4: Define compose `secrets:` blocks

**Files:**
- Modify: `docker-compose.app.yml`
- Modify: `docker-compose.medplum.yml`

- [ ] **Step 1: Add top-level secrets declaration to app stack**

```yaml
secrets:
  google_client_secret:
    file: ./secrets/google_client_secret
  # Add more as needed
```

- [ ] **Step 2: Attach secrets to poc-api service**

```yaml
services:
  poc-api:
    secrets:
      - google_client_secret
    environment:
      - SECRETS_DIR=/run/secrets
    # remove GOOGLE_CLIENT_SECRET from `environment:` here
```

- [ ] **Step 3: Same pattern for Medplum**

For Medplum, passwords feed into `medplum.config.json` generation rather than runtime env. See Task 2.5.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.app.yml docker-compose.medplum.yml
git commit -m "feat(compose): declare secrets blocks for app and medplum stacks"
```

### Task 2.5: Generate medplum.config.json at deploy time

**Files:**
- Create: `scripts/render-medplum-config.sh`
- Modify: `deploy.sh` (add Phase 2.5, before Phase 5)

- [ ] **Step 1: Write the renderer**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Reads template from medplum/medplum.config.json.example
# Substitutes ${DB_PASSWORD}, ${REDIS_PASSWORD} from files in $SECRETS_DIR
# Writes to medplum/medplum.config.json with 0600

SECRETS_DIR="${SECRETS_DIR:-/home/ops/spark-mojo-platform/secrets}"
TEMPLATE="medplum/medplum.config.json.example"
OUTPUT="medplum/medplum.config.json"

DB_PASSWORD="$(<"$SECRETS_DIR/medplum_db_password")"
REDIS_PASSWORD="$(<"$SECRETS_DIR/medplum_redis_password")"
export DB_PASSWORD REDIS_PASSWORD

envsubst < "$TEMPLATE" > "$OUTPUT"
chmod 600 "$OUTPUT"
```

- [ ] **Step 2: Ensure the example uses envsubst syntax**

`medplum/medplum.config.json.example` should reference `"password": "${DB_PASSWORD}"` and `"password": "${REDIS_PASSWORD}"`. Template is safe to commit; real values never are.

- [ ] **Step 3: Hook into deploy.sh**

```bash
phase_2_5_render_configs() {
  echo "[Phase 2.5] Rendering config files from secrets..."
  bash scripts/render-medplum-config.sh
  echo "[Phase 2.5] DONE"
}
```

Call from `main()` between phase_2 and phase_3.

- [ ] **Step 4: Commit**

```bash
git add scripts/render-medplum-config.sh deploy.sh medplum/medplum.config.json.example
git commit -m "feat(deploy): render medplum.config.json from secrets at deploy time"
```

### Task 2.6: Ship Phase 2 to VPS

- [ ] **Step 1: Populate temporary secret files on VPS**

Manually, one-time, until Phase 3:
```bash
ssh sparkmojo 'mkdir -p /home/ops/spark-mojo-platform/secrets && chmod 700 /home/ops/spark-mojo-platform/secrets'
# Then for each secret: scp or here-doc into place, chmod 600
```

- [ ] **Step 2: Deploy**

```bash
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
```

- [ ] **Step 3: Verify no secrets in docker inspect**

```bash
ssh sparkmojo 'sudo docker inspect spark-mojo-platform-poc-api-1 | grep -iE "(secret|password|token)" | grep -v "/run/secrets"'
```
Expected: no matches (all secret paths point to `/run/secrets`, no raw values).

- [ ] **Step 4: Verify OAuth still works end-to-end**

Hit `https://api.poc.sparkmojo.com/auth/google` → 307 to Google → callback → session cookie set.

---

## Phase 3: Infisical as source of truth + rotation automation

**Risk:** High. External dependency, deploy-time failure modes.
**Ships when:** `deploy.sh` pulls secrets from Infisical; `rotate-secrets.sh` runs monthly; manual editing of `.env.poc` is no longer required (and `.env.poc` is removed from VPS).

### Task 3.1: Install the Infisical CLI on VPS

- [ ] **Step 1: Install**

```bash
ssh sparkmojo 'curl -1sLf https://artifacts-cli.infisical.com/setup.deb.sh | sudo -E bash && sudo apt-get install -y infisical && infisical --version'
```
Expected: version string printed (e.g. `0.x.y`). If the apt repo is unreachable from DO later, fall back to the static binary from `https://github.com/Infisical/infisical/releases/latest`.

- [ ] **Step 2: Create a Machine Identity in the Infisical UI**

Web UI: Organization → Access Control → Machine Identities → Create. Scope it to **one project only** (`spark-mojo-platform-poc`), **one environment** (`prod`), read-only. Generate a service token.

- [ ] **Step 3: Provision token file on VPS**

```bash
ssh sparkmojo 'umask 077; touch /home/ops/.infisical-token; chmod 600 /home/ops/.infisical-token'
# Then paste the service token into that file via: ssh sparkmojo 'cat > /home/ops/.infisical-token'
```

- [ ] **Step 4: Record the project slug and environment**

In `scripts/infisical-fetch.sh` (Task 3.3) you will reference `INFISICAL_PROJECT_ID` (the project UUID, visible in the URL of the project dashboard) and `INFISICAL_ENV=prod`. Note them in CREDENTIALS.md (governance repo).

### Task 3.2: Seed the Infisical project with current secret values

Infisical stores secrets by **name** per **environment** inside a **project**. No UUID manifest is needed — the fetch script pulls everything in the project/environment.

- [ ] **Step 1: Enumerate secrets in .env.poc**

```bash
ssh sparkmojo 'grep -vE "^#|^$" /home/ops/spark-mojo-platform/.env.poc | cut -d= -f1 | sort'
```
Expected: a short list of KEY names (15–25 entries).

- [ ] **Step 2: Classify each key**

For each name, mark it in CREDENTIALS.md as one of:
- **secret** → goes into Infisical `prod` environment
- **non-secret config** (URLs, client IDs, feature flags) → stays in `.env.poc` or moves to a committed `config.prod.env` file

- [ ] **Step 3: Import classified secrets into Infisical**

Simplest path — import the whole `.env.poc` via the web UI (Project → Secrets → Import → Upload .env), then delete the non-secret keys from the project. Alternative CLI path:

```bash
# Run locally after copying .env.poc down temporarily
infisical login  # interactive, one-time
infisical secrets set --projectId <id> --env prod --from-env-file .env.poc.filtered
```

Delete the local copy when done.

- [ ] **Step 4: Verify**

```bash
ssh sparkmojo 'export INFISICAL_TOKEN=$(</home/ops/.infisical-token); infisical secrets --projectId <id> --env prod | head'
```
Expected: the KEY names you seeded, no values in terminal (Infisical CLI masks values by default in list view).

### Task 3.3: Write the Infisical fetch script

**Files:**
- Create: `scripts/infisical-fetch.sh`

- [ ] **Step 1: Implement**

```bash
#!/usr/bin/env bash
# Materialises every secret in the configured Infisical project/environment
# as one file per secret in ./secrets/<lowercase_name>, 0600.
# Called by deploy.sh Phase 0.5 and scripts/rotate-secrets.sh.
set -euo pipefail

INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:?set in /etc/default/spark-mojo or shell}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"
OUTPUT_DIR="${1:-secrets}"

export INFISICAL_TOKEN="$(<"$HOME/.infisical-token")"

mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"

# Export all secrets as dotenv, then fan out to one-file-per-secret.
TMPFILE="$(mktemp)"
trap 'shred -u "$TMPFILE" 2>/dev/null || rm -f "$TMPFILE"' EXIT
umask 077

infisical export \
  --projectId "$INFISICAL_PROJECT_ID" \
  --env "$INFISICAL_ENV" \
  --format=dotenv \
  > "$TMPFILE"

# Parse dotenv line by line: KEY="value" or KEY=value
while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  # Strip surrounding quotes if present
  value="${value%\"}"; value="${value#\"}"
  printf '%s\n' "$value" > "$OUTPUT_DIR/$(echo "$key" | tr '[:upper:]' '[:lower:]')"
done < "$TMPFILE"

echo "Fetched $(ls "$OUTPUT_DIR" | wc -l) secrets from Infisical ($INFISICAL_ENV)"
```

- [ ] **Step 2: Hook into deploy.sh**

New `phase_0_5_fetch_secrets()` called before `phase_1_pull()`:
```bash
phase_0_5_fetch_secrets() {
  echo "[Phase 0.5] Fetching secrets from Infisical..."
  bash scripts/infisical-fetch.sh
  echo "[Phase 0.5] DONE"
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/infisical-fetch.sh deploy.sh
git commit -m "feat(deploy): fetch secrets from Infisical at deploy time"
```

### Task 3.4: Monthly Infisical→VPS sync cron

**Files:**
- Create: `scripts/rotate-secrets.sh`
- Create: `/etc/cron.d/spark-mojo-secrets` (on VPS, via Ansible snippet or manual)

- [ ] **Step 1: Write rotation script**

```bash
#!/usr/bin/env bash
# Monthly: refetch all secrets from Infisical and rebuild containers.
# Infisical is the source of truth; anyone rotating a secret updates Infisical.
set -euo pipefail
cd /home/ops/spark-mojo-platform
bash scripts/infisical-fetch.sh
sudo docker compose -f docker-compose.app.yml up -d --force-recreate
```

- [ ] **Step 2: Install cron**

```
# /etc/cron.d/spark-mojo-secrets
0 4 1 * * ops /home/ops/spark-mojo-platform/scripts/rotate-secrets.sh >> /home/ops/deploy-logs/rotate.log 2>&1
```

- [ ] **Step 3: Commit scripts (cron file is VPS-only ops config)**

```bash
git add scripts/rotate-secrets.sh
git commit -m "feat(ops): monthly Infisical-backed secret rotation script"
```

### Task 3.5: Retire .env.poc

- [ ] **Step 1: Verify all secrets are in Infisical**

Dump `.env.poc` keys and the Infisical `prod` keys. Diff should be empty (modulo non-secret config keys intentionally kept outside Infisical).

```bash
diff \
  <(grep -vE "^#|^$" /home/ops/spark-mojo-platform/.env.poc | cut -d= -f1 | sort) \
  <(INFISICAL_TOKEN=$(</home/ops/.infisical-token) infisical secrets --projectId <id> --env prod --plain | awk '{print $1}' | sort)
```

- [ ] **Step 2: Deploy once more from Infisical, confirm all services healthy**

- [ ] **Step 3: Move .env.poc to encrypted offline backup**

```bash
ssh sparkmojo 'gpg --symmetric --cipher-algo AES256 /home/ops/spark-mojo-platform/.env.poc && rm /home/ops/spark-mojo-platform/.env.poc'
```
Store the .gpg file in offline backup.

- [ ] **Step 4: Update CLAUDE.md**

Rewrite the "Medplum docker compose MUST use `--env-file .env.poc`" gotcha. New narrative: "Secrets are fetched from Infisical by `deploy.sh` Phase 0.5. Materialized to `/home/ops/spark-mojo-platform/secrets/*` (0600). Compose mounts them via `secrets:` blocks."

- [ ] **Step 5: Commit doc update**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md gotchas for Infisical secrets model"
```

---

## Phase 4: PHI hardening

**Risk:** Low-medium. Policy + audit infra.
**Ships when:** auditd rules are active; per-site Frappe encryption keys are in Infisical; rotation runbook is published.

### Task 4.1: auditd rules for secret files

**Files:**
- Create: `/etc/audit/rules.d/spark-mojo-secrets.rules` on VPS (documented in `docs/ops/auditd-rules.md` in this repo)

- [ ] **Step 1: Rules**

```
-w /home/ops/spark-mojo-platform/secrets/ -p rwxa -k sm_secrets
-w /home/frappe/frappe-bench/sites/ -p wa -k frappe_site_config
```

- [ ] **Step 2: Activate**

```bash
ssh sparkmojo 'sudo cp /home/ops/spark-mojo-platform/docs/ops/auditd-rules/spark-mojo-secrets.rules /etc/audit/rules.d/ && sudo augenrules --load && sudo systemctl restart auditd'
```

- [ ] **Step 3: Write audit-report script**

```bash
# scripts/audit-secret-access.sh
sudo ausearch -k sm_secrets --start today -i | head -100
```

### Task 4.2: Per-site Frappe encryption_key in Infisical

- [ ] **Step 1: Generate new encryption_key for each site**

```bash
for SITE in poc_dev internal willow admin; do
  KEY=$(python3 -c "import secrets, base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())")
  echo "$SITE: $KEY"
done
```
Write the output to a scratch file locally; paste each into Infisical in the next step; then shred the scratch file.

- [ ] **Step 2: Store each in Infisical**

Create secrets in the `prod` environment of the Infisical project with names `frappe_encryption_key_poc_dev`, `frappe_encryption_key_internal`, `frappe_encryption_key_willow`, `frappe_encryption_key_admin`. Next `./deploy.sh` materialises them into `secrets/frappe_encryption_key_*` automatically.

- [ ] **Step 3: Update site configs**

For each site, rotate the encryption key. This re-encrypts all encrypted field values — test on internal.sparkmojo.com before willow.

```bash
ssh sparkmojo 'docker exec frappe-poc-backend-1 bench --site <site> set-config encryption_key "<new-key>"'
```

Note: this will invalidate existing encrypted passwords (e.g. email account passwords) stored via Frappe's `password` field type — plan re-entry for those.

### Task 4.3: Rotation runbook

**Files:**
- Create: `docs/ops/secret-rotation-runbook.md`

- [ ] **Step 1: Write runbook**

Cover: emergency rotation (suspected compromise), monthly planned rotation, new-secret onboarding, Frappe encryption key rotation, Infisical access token rotation.

- [ ] **Step 2: Commit**

```bash
git add docs/ops/secret-rotation-runbook.md
git commit -m "docs(ops): publish secret rotation runbook"
```

### Task 4.4: CI secret scan

**Files:**
- Create: `.github/workflows/secret-scan.yml`

- [ ] **Step 1: Add gitleaks action**

```yaml
name: secret-scan
on: [pull_request, push]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Test against known-good commit, then merge**

---

## Self-review

Checked against the 2026-04-20 audit punch list:

- CRITICAL `medplum.config.json` tracked — addressed by Phase 2.5 (renderer, template is the only tracked file) + already-landed immediate fix (untracked).
- HIGH `.env.poc.bak-*` — addressed by immediate fix + Phase 3 retires `.env.poc` entirely, so no future `.bak` artifacts.
- MEDIUM `.env.poc` at 0664 — addressed by immediate fix (chmod 600) + retired in Phase 3.
- MEDIUM no automated rotation — addressed by Phase 3 Task 3.4 cron.
- MEDIUM Frappe `encryption_key` — addressed by Phase 4 Task 4.2.
- LOW `acme.json` backups — addressed by immediate fix; ongoing: `scripts/docker-cleanup.sh` cron should include a chmod line.

Gaps knowingly deferred:
- Rotating FastAPI config hot-reload (no app restart on rotation) — defer to a separate plan; requires app-level watcher, not in scope.
- Moving PHI workloads onto a segmented host — defer; document in DECISION-031 as a known next step before external PHI go-live.
- BAA with Infisical — defer to legal/compliance; flag as gating dependency for external PHI go-live. (Infisical offers BAA on Enterprise; not required for internal dev.)

Type/name consistency: `read_secret(name)` used consistently; `SECRETS_DIR` env var name used consistently; Infisical project/environment names (`spark-mojo-platform-poc` / `prod`) referenced consistently.

---

## Appendix A: SOPS + age fallback path

Use this appendix if:
- Infisical Cloud's free tier ever becomes insufficient **and** self-hosting Infisical is undesirable.
- A compliance auditor demands zero third-party SaaS in the secrets path.
- You want an escape hatch that keeps secrets versioned in git.

**Model:** Secrets live encrypted in the repo at `secrets/prod.env.enc`. An `age` private key on the VPS decrypts at deploy time. Rotating a secret = `sops secrets/prod.env.enc` → edit → commit → deploy.

**Migration from Infisical → SOPS:**
1. `infisical export --env=prod --format=dotenv > /tmp/prod.env`
2. `age-keygen -o ~/.sops-age-key.txt` on VPS; copy public key.
3. Create `.sops.yaml` in repo root with the age recipient.
4. `sops --encrypt /tmp/prod.env > secrets/prod.env.enc`; commit the `.enc` file.
5. Replace `scripts/infisical-fetch.sh` with `scripts/sops-fetch.sh`:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   export SOPS_AGE_KEY_FILE="$HOME/.sops-age-key.txt"
   sops --decrypt secrets/prod.env.enc > /tmp/sm.env
   trap 'shred -u /tmp/sm.env' EXIT
   mkdir -p secrets && chmod 700 secrets
   umask 077
   while IFS= read -r line; do
     [[ -z "$line" || "$line" =~ ^# ]] && continue
     key="${line%%=*}"; value="${line#*=}"
     value="${value%\"}"; value="${value#\"}"
     printf '%s\n' "$value" > "secrets/$(echo "$key" | tr '[:upper:]' '[:lower:]')"
   done < /tmp/sm.env
   ```
6. `shred /tmp/prod.env` locally. Never commit the plaintext.

**Rotation workflow:** `sops secrets/prod.env.enc` opens the encrypted file in your editor with decryption; save re-encrypts. Commit the change, run `./deploy.sh`.

**Key management is the risk:** lose the age key and every encrypted secret is unrecoverable. Mitigate with a second recipient (e.g. a key held in a hardware token or escrowed offline).

---

## Appendix B: Digital Ocean migration impact

This plan is VPS-agnostic. The migration from the current Hostinger-style VPS to Digital Ocean does not change the secrets architecture — only the host substrate. Sequence the two migrations deliberately.

**Recommended order:** **Secrets migration first, then DO migration.** Reasons:
- After Phase 3 lands, `.env.poc` is gone. The new DO droplet never needs a plaintext secrets file copied to it — it fetches from Infisical on first deploy.
- The only state that has to move to DO is the Infisical service token (`/home/ops/.infisical-token`, one file), Traefik certs/volumes, Docker volumes (Postgres data, Medplum binary storage), and git-tracked code.
- If DO migration happens first, every copied `.env.poc` has to be scrubbed on the old host, and the cutover has a window where secrets live on two boxes.

**Steps unique to DO migration (orthogonal to this plan):**
1. Provision DO droplet (Ubuntu 24.04, same size or +1 vCPU). Note the new public IPv4.
2. Install Docker, Compose, `infisical`, `ssh` keys, `ops` user.
3. `scp -r /home/ops/.infisical-token` from old host to new. Chmod 600.
4. Update DNS in Cloudflare (or current DNS provider) for all `*.sparkmojo.com` records → new IP. Low TTL 24h in advance.
5. On new droplet: `git clone https://github.com/Spark-Mojo/spark-mojo-platform.git /home/ops/spark-mojo-platform && cd $_ && ./deploy.sh`. Phase 0.5 pulls secrets from Infisical automatically.
6. Restore Docker volumes (Postgres, Medplum) from backup — this is the only stateful migration concern. Follow an existing VPS backup/restore runbook.
7. Verify end-to-end against smoke_test.sh.
8. Decommission old VPS: shred secrets, snapshot, destroy after 7-day soak.

**What does NOT need to change in the repo during DO migration:**
- `docker-compose.*.yml` (host-agnostic)
- `deploy.sh` (the `ssh sparkmojo` alias in CLAUDE.md just points at the new host)
- `CLAUDE.md` (update only the IP/hostname references; everything else is identical)

**What to update in governance repo:**
- `CREDENTIALS.md` — new VPS provider, new DO project ID, new IPv4
- `DECISION-016-environment-topology-and-build-sequence.md` — note DO as the new substrate if it isn't already there
- Any runbook that references the old host's specifics (paths are identical — just the provider name)
