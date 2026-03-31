# HOTFIX: Legacy URLs poc.sparkmojo.com and app.poc.sparkmojo.com Broken

**Priority:** High — legacy access broken after INFRA-007 site rename  
**Assigned to:** Claude Code (interactive session)  
**Root cause:** INFRA-007 renamed `frontend` site to `poc-dev.sparkmojo.com` and enabled
`FRAPPE_SITE_NAME_HEADER: $$host`. Frappe now uses the Host header to look up the site.
`poc.sparkmojo.com` has no matching Frappe site — that site is now `poc-dev.sparkmojo.com`.

---

## Fix: Add Traefik Host Header Rewrite Middleware

The cleanest fix is a Traefik middleware that rewrites the Host header from
`poc.sparkmojo.com` → `poc-dev.sparkmojo.com` before the request reaches Frappe.
This preserves the legacy URL without creating a duplicate Frappe site.

### Changes needed in `/home/ops/frappe-poc/pwd.yml`

In the `frontend:` service labels section, ADD these entries alongside the existing labels:

```yaml
      # Legacy redirect middleware: poc.sparkmojo.com → poc-dev.sparkmojo.com
      - "traefik.http.middlewares.poc-rewrite.headers.customrequestheaders.X-Forwarded-Host=poc-dev.sparkmojo.com"
      - "traefik.http.routers.frappe-poc-legacy.rule=Host(`poc.sparkmojo.com`)"
      - "traefik.http.routers.frappe-poc-legacy.entrypoints=websecure"
      - "traefik.http.routers.frappe-poc-legacy.tls.certresolver=mytlschallenge"
      - "traefik.http.routers.frappe-poc-legacy.service=frappe-poc"
      - "traefik.http.routers.frappe-poc-legacy.middlewares=poc-host-rewrite"
      - "traefik.http.middlewares.poc-host-rewrite.headers.customrequestheaders.Host=poc-dev.sparkmojo.com"
```

**Wait** — Traefik's headers middleware cannot rewrite the Host header directly in v3.
The correct approach is to use a different strategy:

### Correct Fix: Add Frappe Site Alias

Instead of Traefik header rewriting (which doesn't work for Host), add a bench site
alias so Frappe recognises `poc.sparkmojo.com` as an alias for `poc-dev.sparkmojo.com`.

```bash
ssh sparkmojo

# Add site alias in Frappe
docker exec spark-mojo-platform-poc-frappe-1 \
  bench --site poc-dev.sparkmojo.com add-to-hosts poc.sparkmojo.com

# Verify alias added
docker exec spark-mojo-platform-poc-frappe-1 \
  bench --site poc-dev.sparkmojo.com show-config | grep -i alias
```

If `add-to-hosts` is not available in this Frappe version, use the direct approach:

```bash
# Directly edit the site config to add the alias
docker exec spark-mojo-platform-poc-frappe-1 \
  bench --site poc-dev.sparkmojo.com set-config host_name \
  '["poc-dev.sparkmojo.com", "poc.sparkmojo.com"]'
```

### Also fix app.poc.sparkmojo.com (React frontend + abstraction layer)

The React frontend at `app.poc.sparkmojo.com` shows "no user found" because the
abstraction layer is routing it to the wrong Frappe site.

Check the abstraction layer's SM Site Registry — the `poc-dev` entry should have
`frappe_site: poc-dev.sparkmojo.com`. Also check that `.env.poc` `FRAPPE_URL` is
still correct.

```bash
ssh sparkmojo

# Check SM Site Registry for poc-dev entry
docker exec spark-mojo-platform-poc-frappe-1 \
  bench --site admin.sparkmojo.com execute \
  frappe.db.get_value \
  --args "['SM Site Registry', 'poc-dev', 'frappe_site']"
# Expected: poc-dev.sparkmojo.com

# Check abstraction layer is reading registry correctly
curl -s https://poc-dev.app.sparkmojo.com/health
# Expected: {"status":"ok","frappe_connected":true}

# Check legacy URL abstraction layer
curl -s https://poc.sparkmojo.com/health
# If this returns ok but React shows "no user" — the issue is the frontend
# is pointing to the wrong site in its config
```

### If the abstraction layer health returns ok but React shows "no user found"

The React frontend at `app.poc.sparkmojo.com` has a hardcoded site reference in
its environment that points to the old `frontend` site name. Check:

```bash
cat /Users/jamesilsley/GitHub/spark-mojo-platform/frontend/.env.production 2>/dev/null || \
cat /Users/jamesilsley/GitHub/spark-mojo-platform/frontend/.env 2>/dev/null
```

If it contains `FRAPPE_SITE_NAME=frontend` or similar — update to `poc-dev.sparkmojo.com`.

Also check the abstraction layer `.env.poc` on the VPS:

```bash
ssh sparkmojo 'cat /home/ops/spark-mojo-platform/.env.poc | grep -v SECRET | grep -v PASSWORD'
```

---

## Verification

```bash
# Legacy Frappe Desk URL works
curl -sI https://poc.sparkmojo.com
# PASS: HTTP/2 200 or redirect to /login (NOT "does not exist")

# Legacy React URL works  
curl -sI https://app.poc.sparkmojo.com
# PASS: HTTP/2 200

# New URLs still work
curl -sI https://poc-dev.app.sparkmojo.com
curl -sI https://admin.sparkmojo.com
curl -s https://poc.sparkmojo.com/health
# PASS: all HTTP/2 200

# Smoke test still passes
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && ./scripts/smoke_test.sh'
# PASS: 16/16
```

---

## Do NOT

- Do not create a new Frappe site named `poc.sparkmojo.com` — the site was deliberately renamed
- Do not revert `FRAPPE_SITE_NAME_HEADER` back to `frontend`
- Do not modify the three new site configurations (admin, internal, willow)
- Do not modify any Mojo frontend code
