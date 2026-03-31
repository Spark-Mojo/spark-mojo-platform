# HOTFIX: poc.sparkmojo.com returning 502

**Priority:** High — live site down  
**Assigned to:** Claude Code (interactive session)  
**Do not run via Ralph** — this is an interactive debug session, run directly.

---

## What Is Known

1. `poc.sparkmojo.com` was returning 404 — fixed by adding Traefik labels + `root_web` network to the `frontend` service in `/home/ops/frappe-poc/pwd.yml` and restarting.
2. Now returning 502 — Traefik reaches the Frappe frontend container but the backend is crashing.
3. Backend logs show: `ModuleNotFoundError: No module named 'sm_widgets'`
4. `apps.txt` contains only `frappe` and `erpnext` — sm_widgets is NOT in apps.txt.
5. Therefore sm_widgets must be registered in `tabInstalled Application` in the MariaDB database, which Frappe tries to import on startup and fails.
6. A `bench execute` attempt to delete the record may not have worked because the backend was already crashing at that point.

---

## Diagnosis Steps (run these first, fix second)

```bash
# 1. Confirm backend is still crashing
docker logs frappe-poc-backend-1 --tail 10

# 2. Find the correct Frappe database name
docker exec frappe-poc-db-1 mariadb -u root -p"${SM_MARIADB_ROOT_PASSWORD}" \
  -e "SHOW DATABASES;" 2>/dev/null | grep -v information_schema | grep -v performance_schema | grep -v mysql | grep -v sys

# 3. Check what's in tabInstalled Application for the frontend site
# Replace DATABASE_NAME with result from step 2
docker exec frappe-poc-db-1 mariadb -u root -p"${SM_MARIADB_ROOT_PASSWORD}" \
  DATABASE_NAME \
  -e "SELECT app_name FROM \`tabInstalled Application\`;"
```

---

## Fix

Remove sm_widgets (and any other SM custom apps) from `tabInstalled Application`:

```bash
# Replace DATABASE_NAME with correct database name from diagnosis
docker exec frappe-poc-db-1 mariadb -u root -p"${SM_MARIADB_ROOT_PASSWORD}" \
  DATABASE_NAME \
  -e "DELETE FROM \`tabInstalled Application\` WHERE app_name NOT IN ('frappe', 'erpnext'); SELECT app_name FROM \`tabInstalled Application\`;"
```

Then restart the backend and verify:

```bash
cd /home/ops/frappe-poc
docker compose -f pwd.yml restart backend
sleep 15
curl -sI https://poc.sparkmojo.com
# PASS: HTTP/2 200 or 302
```

---

## If Fix Works

1. Verify the React frontend also loads:
```bash
curl -sI https://app.poc.sparkmojo.com
# PASS: HTTP/2 200
```

2. Verify the abstraction layer is still healthy:
```bash
curl -s https://poc.sparkmojo.com/health
# PASS: {"status":"ok","frappe_connected":true}
```

3. Write `HOTFIX-POC-502-COMPLETE` at repo root with results summary.

---

## If Fix Does Not Work

Check for additional failing imports:

```bash
docker logs frappe-poc-backend-1 --tail 30 | grep "ModuleNotFoundError\|ImportError"
```

Remove each failing module from `tabInstalled Application` using the same DELETE pattern above. Repeat until backend starts cleanly.

If backend still fails after removing all SM apps from tabInstalled Application, check:

```bash
docker logs frappe-poc-backend-1 --tail 50
```

Write `BLOCKED-HOTFIX-POC-502.md` with full log output and stop.

---

## Credential Note

`SM_MARIADB_ROOT_PASSWORD` must be set as an environment variable before running this session.
Never hardcode the password. If the env var is not set, stop and surface to James.

---

## Do NOT

- Do not modify `apps.txt`
- Do not run `bench get-app` or `bench install-app` for any SM app
- Do not modify `pwd.yml` further — the Traefik routing fix is already in place
- Do not touch `docker-compose.poc.yml` or `deploy.sh`
- Do not modify any frontend code
