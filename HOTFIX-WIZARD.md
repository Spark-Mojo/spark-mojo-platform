# HOTFIX: Suppress ERPNext Setup Wizard on All Four Sites

**Assigned to:** Claude Code (interactive session)
**One task. Should take under 5 minutes.**

## Context

Four Frappe sites exist. Every login redirects to the ERPNext setup wizard.
There is no skip button. Must set `setup_complete = 1` in each site's System Settings.

Frappe databases are hash-named. Must identify which hash = which site, then run SQL.

## Step 1: Map database hashes to site names

```bash
MARIADB_PASS=$(grep 'MYSQL_ROOT_PASSWORD' /home/ops/frappe-poc/pwd.yml | head -1 | awk '{print $2}')

# The four hashed databases are:
# _107239e22fcd6159
# _74ace272f89e742d
# _d65c768c8731cc8d
# _e18a16e70240d08d

# Each Frappe site has a site_config.json that contains db_name
# Check each site's config to find the mapping:
for SITE in admin.sparkmojo.com poc-dev.sparkmojo.com internal.sparkmojo.com willow.sparkmojo.com; do
  echo -n "$SITE -> "
  docker exec frappe-poc-backend-1 \
    cat /home/frappe/frappe-bench/sites/${SITE}/site_config.json 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('db_name','NOT FOUND'))"
done
```

## Step 2: Run SQL on each database

Once you have the mapping, run this for each site (replace DB_NAME with the hash):

```bash
MARIADB_PASS=$(grep 'MYSQL_ROOT_PASSWORD' /home/ops/frappe-poc/pwd.yml | head -1 | awk '{print $2}')

for DB in _107239e22fcd6159 _74ace272f89e742d _d65c768c8731cc8d _e18a16e70240d08d; do
  echo "=== $DB ==="
  docker exec frappe-poc-db-1 mariadb -u root -p"${MARIADB_PASS}" ${DB} \
    -e "INSERT INTO tabSingles (doctype, field, value)
        VALUES ('System Settings', 'setup_complete', '1')
        ON DUPLICATE KEY UPDATE value='1';
        SELECT value FROM tabSingles WHERE doctype='System Settings' AND field='setup_complete';" \
    2>/dev/null
done
```

## Step 3: Verify

Try navigating to each site's /app URL in a browser:
- https://admin.sparkmojo.com/app
- https://poc-dev.sparkmojo.com/app
- https://internal.sparkmojo.com/app
- https://willow.sparkmojo.com/app

PASS: Frappe desktop loads (no wizard redirect)
FAIL: Still redirects to wizard

If still failing after SQL, check the field name:
```bash
MARIADB_PASS=$(grep 'MYSQL_ROOT_PASSWORD' /home/ops/frappe-poc/pwd.yml | head -1 | awk '{print $2}')
docker exec frappe-poc-db-1 mariadb -u root -p"${MARIADB_PASS}" _107239e22fcd6159 \
  -e "SELECT * FROM tabSingles WHERE doctype='System Settings' AND field LIKE '%setup%';" 2>/dev/null
```
That will show the exact field name Frappe uses.

## Do NOT
- Do not modify any code files
- Do not restart any containers
- Do not touch docker-compose files
