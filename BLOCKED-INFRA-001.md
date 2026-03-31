# BLOCKED: INFRA-001 — Provision admin.sparkmojo.com

**Date:** 2026-03-30
**Blocker:** DNS A record for `admin.sparkmojo.com` does not exist

## Details

Pre-flight check: `dig +short admin.sparkmojo.com` returns no result.

The VPS public IP is `72.60.125.140` (confirmed via `dig +short poc.sparkmojo.com`).
The domain `sparkmojo.com` resolves to Cloudflare IPs (104.21.74.138 / 172.67.158.248).

## Action Required (James)

Add a DNS A record:
- **Host:** `admin`
- **Type:** A
- **Value:** `72.60.125.140`
- **TTL:** 300 (or auto)

If using Cloudflare proxy: set to DNS-only (grey cloud) so Traefik can handle TLS directly, OR configure Cloudflare full-strict SSL mode.

Also needed for INFRA-007:
- `internal.sparkmojo.com` → `72.60.125.140`
- `willow.sparkmojo.com` → `72.60.125.140`

## Additional Notes

- VPS is reachable via SSH ✅
- Docker containers are running ✅
- Only one Frappe site exists currently: `frontend`
- Frappe backend container name is `frappe-poc-backend-1` (NOT `spark-mojo-platform-poc-frappe-1` as in the spec)
- Once DNS is configured, re-run this story — all other pre-flight checks pass

## Stories Blocked by This

- INFRA-002 (SM Site Registry) — can proceed without DNS but needs admin site for seed record
- INFRA-003 through INFRA-007 — depend on INFRA-001 or INFRA-002
