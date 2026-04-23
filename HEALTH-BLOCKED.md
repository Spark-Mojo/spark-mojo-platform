# HEALTH-BLOCKED — ACCT-BUILD-001

**Timestamp:** 2026-04-22T00:00:00Z
**Build queue:** ACCT-BUILD-001 (35 stories)

## Blocking Failure

### Check 6 — STRIPE_SECRET_KEY not provisioned

The `STRIPE_SECRET_KEY` secret is not present in the Infisical secrets directory on the VPS.

**What was checked:**
- `/home/ops/spark-mojo-platform/secrets/stripe_secret_key` — does not exist
- Note: `.env.poc` has been retired (per CLAUDE.md SEC-003/SEC-004). Secrets are now managed via Infisical.

**Existing secrets on VPS:**
`admin_api_key`, `admin_api_secret`, `admin_service_key`, `frappe_api_key`, `frappe_api_secret`, `frappe_encryption_key_*`, `google_client_secret`, `mariadb_root_password`, `medplum_client_secret`, `medplum_db_password`, `medplum_redis_password`, `placeholder`, `stedi_api_key`

**Action required:**
1. Add `STRIPE_SECRET_KEY` to the `sm-platform-shared` project in Infisical (env: `prod`)
2. Run `scripts/infisical-fetch.sh` on the VPS to pull the new secret
3. Verify: `test -f /home/ops/spark-mojo-platform/secrets/stripe_secret_key && echo OK`
4. Re-run this build queue

## Other Observations

### Check 2 — Pre-existing lint errors (non-blocking)

`flake8 abstraction-layer/ --max-line-length=120` reports 84 errors (59 in production code, 25 in test files). These are all pre-existing baseline issues (E501 line length, F401 unused imports, E402 import order, F841 unused variables). Not introduced by this build queue.

## Checks That Passed

| Check | Result |
|-------|--------|
| 1. Test suite | 223 passed (0 failed) |
| 3. Repos clean, on main | Both repos clean, both on `main` |
| 4. No stale artifacts | None found |
| 5. VPS reachable | OK |
