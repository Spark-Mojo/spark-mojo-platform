# Three-Site Topology Build — Queue Status

**Date:** 2026-03-30
**Result:** ALL STORIES BLOCKED

## Stories Blocked

| Story | Branch | Blocker |
|-------|--------|---------|
| INFRA-001 | `infra/INFRA-001-admin-site` | DNS: `admin.sparkmojo.com` has no A record → VPS IP `72.60.125.140` |
| INFRA-002 | `infra/INFRA-002-sm-site-registry` | Depends on INFRA-001 |
| INFRA-003 | `infra/INFRA-003-doctype-registry` | Depends on INFRA-002 → INFRA-001 |
| INFRA-004 | `infra/INFRA-004-admin-service-account` | Depends on INFRA-002 → INFRA-001 |
| INFRA-005 | `infra/INFRA-005-register-sm-apps` | Depends on INFRA-001 |
| INFRA-006 | `infra/INFRA-006-deploy-site-loop` | Depends on INFRA-003 → INFRA-002 → INFRA-001 |
| INFRA-007 | `infra/INFRA-007-three-site-topology` | Depends on all above |

## Stories Completed

None.

## Root Cause

DNS A records do not exist for the new subdomains:
- `admin.sparkmojo.com` — no record
- `internal.sparkmojo.com` — not checked (blocked upstream)
- `willow.sparkmojo.com` — not checked (blocked upstream)

The VPS public IP is `72.60.125.140` (confirmed via `dig +short poc.sparkmojo.com`).

## Pre-flight Checks That Passed

- All 4 credential env vars: SET ✅
- SSH to VPS: OK ✅
- Docker containers: all running ✅
- Existing Frappe sites: only `frontend` ✅

## Action Required (James)

1. **Add DNS A records** at your registrar/Cloudflare:
   - `admin.sparkmojo.com` → `72.60.125.140`
   - `internal.sparkmojo.com` → `72.60.125.140`
   - `willow.sparkmojo.com` → `72.60.125.140`

2. If using Cloudflare proxy: set to DNS-only (grey cloud) so Traefik handles TLS, OR ensure Cloudflare full-strict SSL mode is configured.

3. After DNS propagates (5-15 min), re-run this queue.

## Additional Notes

- **Frappe container name mismatch:** Story specs reference `spark-mojo-platform-poc-frappe-1` but actual container is `frappe-poc-backend-1`. All stories will need this adjusted during execution.
- **Smoke test:** N/A (no sites provisioned)
- **Bitwarden entries needed:** None yet (no sites created)

## Notes for James

The entire INFRA-001 through INFRA-007 pipeline is gated on DNS records. Once you add the three A records and they propagate, re-run the queue — all credentials are set and the VPS is healthy. The code work (INFRA-002 DocType files, INFRA-003 abstraction layer changes, etc.) will be created during the run.
