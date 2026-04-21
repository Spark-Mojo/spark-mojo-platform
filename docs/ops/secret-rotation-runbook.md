# Secret Rotation Runbook

**Applies to:** All runtime secrets for the Spark Mojo POC VPS.
**Source of truth:** Infisical Cloud (projects `sm-platform-shared`, `sm-willow`; environments `dev`, `prod`).
**Locked by:** `DECISION-031` (sparkmojo-internal).
**Implemented by:** `SEC-001` → `SEC-002` → `SEC-003` → `SEC-004`.

This runbook is the operator's reference for rotating, onboarding, and responding to incidents involving runtime secrets. Every procedure here is safe to follow step-by-step without further context. If something in this doc contradicts DECISION-031, DECISION-031 wins and this runbook needs correction.

---

## 0. Mental model

- Runtime secrets live in **Infisical Cloud**, one environment per project.
- `deploy.sh` Phase 0.5 calls `scripts/infisical-fetch.sh`, which pulls every secret from the configured projects/environment into `/home/ops/spark-mojo-platform/secrets/<lowercase_name>` (0600, dir 0700) using Universal Auth credentials from `/home/ops/.infisical-ua-client-id` + `/home/ops/.infisical-ua-client-secret`.
- Containers read secrets via Docker Compose `secrets:` blocks that mount the files at `/run/secrets/<name>`. Python apps read via the `read_secret()` helper in `abstraction-layer/secrets_loader.py`; Medplum reads from a generated `medplum/medplum.config.json` rendered at deploy time by `scripts/render-medplum-config.sh`.
- Non-secret runtime config (URLs, public OAuth client IDs, feature flags) lives in `/home/ops/spark-mojo-platform/config.prod.env` on the VPS. This file is gitignored but is NOT secret.
- Bitwarden remains the system of record for **human** credentials: site admin passwords, SSH keys, vendor console logins, the Infisical root passphrase, and the GPG passphrase for the retired-`.env.poc` archive. It is not the runtime secrets store.

Any rotation follows the pattern: **update Infisical → run sync → verify**. You never edit files in `secrets/` directly, and you never commit secret values anywhere.

---

## 1. Emergency rotation (suspected compromise)

Use when you have any reason to believe a specific secret has leaked — a stale screenshot, a compromised laptop, a misaddressed email, a revoked employee, a security alert.

**Target time to production with new value: under 5 minutes.**

### Steps

1. **Revoke at the source (if applicable).**
   - For OAuth client secrets (Google): vendor console → delete the current client secret, issue a new one.
   - For AWS access keys: IAM → Security credentials → delete/disable the compromised key, create a new one.
   - For third-party API keys (Stedi, Medplum): vendor dashboard → regenerate.
   - For DB passwords (MariaDB root, Medplum DB/Redis): generate a new strong value (`openssl rand -base64 32`).
   - For Frappe `encryption_key`: see section 5 — do NOT treat as a hot emergency unless PHI is implicated; re-encryption is expensive.

2. **Update the value in Infisical.**
   - Log into Infisical web UI with your SSO account.
   - Pick the right project: infra-level secrets → `sm-platform-shared`; Willow-specific → `sm-willow`.
   - Pick `prod` environment.
   - Edit the existing secret (same key name) and paste the new value. Save.

3. **Force the sync on the VPS.**
   ```
   ssh sparkmojo
   sudo -u ops /home/ops/spark-mojo-platform/scripts/rotate-secrets.sh
   ```
   Expected: `Secret change detected — recreating affected containers` followed by compose output. No-op means Infisical did not actually change (re-check step 2).

4. **Verify the affected service restarted with the new value.**
   - For `poc-api` (FastAPI): `sudo docker exec spark-mojo-platform-poc-api-1 cat /run/secrets/<name>` should show the new value. Then hit the capability that uses the secret: `/auth/google` for OAuth, `/api/modules/billing/...` for Stedi, etc.
   - For Medplum DB/Redis: `sudo docker inspect spark-mojo-platform-medplum-1 | grep -i health` — status `healthy`.
   - For Frappe encryption key: see section 5.

5. **Notify.** Write a brief incident note (date, secret category, what was rotated, who authorised, what triggered it). Keep these in `docs/ops/incidents/` in the repo.

6. **If the compromise included a human credential:** reset the relevant Bitwarden entry and rotate the Infisical root session.

---

## 2. Scheduled rotation (DECISION-031 cadence)

Rotations are calendar-driven. No automation invents new secret values; a human does that in Infisical, then the monthly cron propagates.

| Category | Cadence | How to rotate |
|---|---|---|
| OAuth client secrets (Google, future vendors) | Quarterly | Vendor console → new secret → update Infisical → `rotate-secrets.sh` |
| Third-party API keys (Stedi, Medplum server) | Quarterly | Vendor dashboard → regenerate → update Infisical → `rotate-secrets.sh` |
| Database passwords (MariaDB root, Medplum DB, Redis) | Biannual | Generate locally → update Infisical → coordinated container recreate (below) during low-traffic window |
| Infisical service tokens (Mac + VPS Universal Auth client secret) | 90 days | Infisical UI → new Client Secret → replace on host → revoke old (section 4) |
| Frappe `encryption_key` (per site) | Annual | Planned maintenance — see section 5 |
| Any secret | Immediately | Section 1 |

### Quarterly / Biannual common flow

1. Rotate at the vendor / generate a new value locally.
2. Update the secret in Infisical (UI, same KEY name, new value).
3. On the VPS: `sudo -u ops /home/ops/spark-mojo-platform/scripts/rotate-secrets.sh`.
4. Check Phase 7 smoke: `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh --verify-only'` (5/6 is the current passing baseline; any regression from baseline is a real failure).

### Database password specifics

The MariaDB/Medplum/Redis passwords are consumed by both the app side (Python `read_secret("mariadb_root_password")` etc.) and the DB server itself. Swapping the password in Infisical does NOT change what the DB server expects — you have to:

1. Update Infisical.
2. On the DB server container: `ALTER USER ... IDENTIFIED BY '<new>';` (MariaDB) or equivalent, matching the new Infisical value.
3. Then run `rotate-secrets.sh` to propagate the new value to clients.

Do database password rotation inside a maintenance window. Order matters: update the server first, then clients, so there's no moment where clients have the new password and the server hasn't accepted it yet.

### Monthly sync cron

`/etc/cron.d/spark-mojo-secrets` on the VPS runs `scripts/rotate-secrets.sh` at 04:00 UTC on the 1st of every month. Output goes to `/home/ops/deploy-logs/rotate.log`. The cron is a sync — if no Infisical values changed in the last month, it's a no-op. Check the log monthly; empty activity is expected most months.

---

## 3. New secret onboarding

Use when adding a new integration (vendor API, new OAuth app, new internal service) that needs a runtime secret.

1. **Name it.** Lowercase, underscore-separated, explicit about purpose. Examples: `stripe_webhook_signing_secret`, `openai_api_key`, `frappe_encryption_key_willow`. Put it in `sm-platform-shared` unless the value is specific to one tenant's data (then it belongs in that tenant's project — currently only `sm-willow`).

2. **Add it to Infisical** in the correct project + environment (`dev` for dev values, `prod` for the live one — seed both).

3. **Declare it in Docker Compose.** Edit `docker-compose.app.yml` (or whichever stack file applies):
   ```yaml
   secrets:
     my_new_secret:
       file: ./secrets/my_new_secret

   services:
     poc-api:
       secrets:
         - my_new_secret
   ```

4. **Read it in app code.** Python: `from secrets_loader import read_secret` then `read_secret("my_new_secret")`. Never `os.getenv` for runtime secrets.

5. **Deploy.** `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'`. Phase 0.5 will materialise the new file, and the service picks it up on recreate.

6. **Verify.** `sudo docker exec <container> test -f /run/secrets/my_new_secret && echo present`.

---

## 4. Infisical service token (Universal Auth client secret) — 90-day rotation

DECISION-031 specifies 90-day rotation for machine-identity credentials. Both hosts — James's Mac (`~/.infisical-token-dev` / UA client files on Mac) and the VPS (`/home/ops/.infisical-ua-client-*`) — need rotation on this cadence.

### VPS rotation

1. **Infisical UI** → Organization → Access Control → Identities → `vps-prod-deploy` → Authentication → Universal Auth.
2. Click **+ Add Client Secret**. Description: `vps-prod-deploy-<YYYY-MM-DD>`. TTL: leave blank (rotation is calendar-driven). Copy the new Client Secret value — shown once only.
3. Save the new Client Secret to the Bitwarden entry `Infisical VPS prod UA — vps-prod-deploy`. Keep the old value in the same note for 24 hours as a rollback cushion.
4. On the VPS, replace the credential file:
   ```
   ssh sparkmojo
   umask 077
   printf '%s' '<NEW_CLIENT_SECRET>' > /home/ops/.infisical-ua-client-secret.new
   chmod 600 /home/ops/.infisical-ua-client-secret.new
   mv /home/ops/.infisical-ua-client-secret.new /home/ops/.infisical-ua-client-secret
   ```
5. Verify the new credential works:
   ```
   cd /home/ops/spark-mojo-platform
   bash scripts/infisical-fetch.sh /tmp/rot-test && ls /tmp/rot-test | wc -l && rm -rf /tmp/rot-test
   ```
   Expected: 12 (or the current secret count). Non-zero exit means the new credential is bad — restore the previous value from Bitwarden and retry step 2.
6. **In the Infisical UI, delete the old Client Secret** from the identity's Client Secrets table. Only delete AFTER step 5 succeeds.
7. Record the rotation date in the Bitwarden note.

### Mac rotation

Same pattern, but:
- Identity: `mac-dev-ralph` (reads `dev` environment only).
- Files: `~/.infisical-ua-client-id` / `~/.infisical-ua-client-secret` on the Mac.
- Verify: `bash scripts/infisical-fetch.sh /tmp/rot-test` (you'll need `/etc/default/spark-mojo` on the Mac OR pass `INFISICAL_PROJECT_IDS` + `INFISICAL_ENV=dev` inline).

### If the service token is lost

A lost token means you cannot deploy until you replace it. Rotate immediately (skip the 24-hour rollback cushion). Ralph overnight runs will fail `scripts/infisical-fetch.sh` with a clear error until the new credential lands on the Mac.

---

## 5. Frappe `encryption_key` rotation

**This is a planned-maintenance procedure. Do not attempt it as an emergency response unless PHI has already been exposed.**

Frappe encrypts certain field types (integration tokens, Social Login Key secrets, API secrets stored via the `Password` field type) with `site_config.json:encryption_key`. The encryption_key is a Fernet key (32-byte URL-safe base64); Frappe uses it directly via `cryptography.fernet.Fernet(key.encode())`.

**Important:** User login passwords (stored in `__Auth` with `encrypted=0`) are bcrypt hashes and are NOT affected by encryption_key rotation. Only entries with `encrypted=1` in `__Auth` need re-encryption.

### Tested procedure (SEC-005, April 21 2026)

**Order:** internal (zero encrypted entries) → willow (zero) → admin (1 entry) → poc-dev (2 entries). Always start with the lowest-risk site.

1. **Inventory encrypted entries** on the target site:
   ```bash
   ssh sparkmojo 'docker exec frappe-poc-backend-1 bash -c "cd /home/frappe/frappe-bench && bench --site <site> mariadb --no-auto-rehash -e \"SELECT doctype, name, fieldname, encrypted FROM \`__Auth\` WHERE encrypted=1;\""'
   ```

2. **Backup.** `ssh sparkmojo 'docker exec frappe-poc-backend-1 bench --site <site> backup --with-files'`. Note the backup timestamp for rollback.

3. **Update Infisical.** New key in the appropriate project (`sm-platform-shared/prod` for non-PHI sites, `sm-willow/prod` for Willow). Key name: `frappe_encryption_key_<site_slug>` (e.g. `frappe_encryption_key_poc_dev`). Then fetch: `ssh sparkmojo 'cd /home/ops/spark-mojo-platform && bash scripts/infisical-fetch.sh'`.

4. **If the site has zero `encrypted=1` entries:** simply set the new key directly. Copy the key file into the container and use a Python script to write it to `site_config.json` (avoid shell quoting issues with base64 strings — use `docker cp` + `json.dump`, not `bench set-config`).

5. **If the site has `encrypted=1` entries — rekey procedure:**
   - Copy the new key file into the container: `docker cp secrets/frappe_encryption_key_<slug> frappe-poc-backend-1:/tmp/new_enc_key`
   - Run a Python rekey script (using the bench virtualenv `./env/bin/python3`) that:
     a. Reads the old key from `site_config.json`
     b. Connects to MariaDB directly (using `MySQLdb` + credentials from `site_config.json` and `common_site_config.json`)
     c. For each `__Auth` entry with `encrypted=1`: decrypt with old Fernet key, re-encrypt with new Fernet key, UPDATE the row
     d. Commits the transaction
     e. Writes the new key to `site_config.json`
     f. Verifies every `encrypted=1` entry decrypts with the new key
   - **If any decrypt/re-encrypt fails: the script rolls back the DB transaction and exits non-zero. Restore from backup.**
   - Clean up: `docker exec -u root frappe-poc-backend-1 rm -f /tmp/new_enc_key`

6. **Restart Frappe workers** so the new key takes effect:
   ```bash
   ssh sparkmojo 'cd /home/ops/frappe-poc && sudo docker compose restart backend scheduler'
   ssh sparkmojo 'sudo docker restart frappe-poc-frontend-1'
   ```

7. **Spot-check decryption** on a known encrypted field:
   ```bash
   ssh sparkmojo 'docker exec frappe-poc-backend-1 bash -c "cd /home/frappe/frappe-bench && bench --site <site> execute frappe.utils.password.get_decrypted_password --args \"[\\\"Social Login Key\\\", \\\"google\\\", \\\"client_secret\\\"]\""'
   ```

8. **Run `deploy.sh --verify-only`** — should return baseline 5/6 (admin site expected to show 5/6).

### Gotchas discovered during SEC-005 rotation

- **`bench set-config encryption_key` mangles base64 values** due to shell quoting. Use `docker cp` + Python `json.dump` instead.
- **`frappe.init()` + `frappe.connect()` from a standalone script fails** with log directory errors. Use direct `MySQLdb` connection instead of the Frappe ORM for the rekey script.
- **Sites created without an explicit `encryption_key`** get one auto-generated on first `get_encryption_key()` call. Run `bench execute frappe.utils.password.get_encryption_key` to materialize it before attempting rotation.
- **User passwords are unaffected** — they're bcrypt hashes (`encrypted=0`). The rekey only touches `encrypted=1` rows.
- **The Fernet key is used directly** — no key derivation. `Fernet(key.encode())` is all that's needed.

---

## Appendix A — command cheat sheet

```bash
# Pull current Infisical values (no container action)
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && bash scripts/infisical-fetch.sh'

# Pull + recreate changed containers
ssh sparkmojo 'sudo -u ops /home/ops/spark-mojo-platform/scripts/rotate-secrets.sh'

# Verify a specific secret inside a container
ssh sparkmojo 'sudo docker exec spark-mojo-platform-poc-api-1 ls -la /run/secrets/'

# Check Phase 7 smoke after a rotation
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./deploy.sh --verify-only'

# Read the monthly cron log
ssh sparkmojo 'tail -50 /home/ops/deploy-logs/rotate.log'
```

---

## Appendix B — what this runbook does NOT cover

- **New-tenant onboarding flow** (creating a new `sm-<tenant>` Infisical project and per-tenant Frappe encryption keys) — owned by the provisioning runbook, not this one.
- **BAA with Infisical** (required before Willow external PHI go-live) — legal/compliance, tracked in DECISION-031 "Future Scaling".
- **Fallback to SOPS + age** (if Infisical ever becomes untenable) — see `docs/superpowers/plans/2026-04-20-secrets-management-migration.md` Appendix A.
- **Docker volume encrypted backups** — separate ops backlog.
- **auditd log forwarding to SIEM** — deferred per DECISION-031 Future Scaling; internal auditd only for now.
