# Three-Site Topology Build — Scratchpad

## 2026-03-30 — Iteration 1

### Orientation
- All 4 credential env vars confirmed SET
- QUEUE-COMPLETE.md at root is from prior design system sprint — not this run
- No INFRA-*-COMPLETE markers exist — fresh start
- Starting with INFRA-001: Provision admin.sparkmojo.com

### INFRA-001 Result: BLOCKED
- `dig +short admin.sparkmojo.com` returns nothing — no A record
- VPS IP is 72.60.125.140 (poc.sparkmojo.com resolves fine)
- All other stories depend on INFRA-001 (directly or transitively)
- Whole queue is blocked on DNS records
- Wrote BLOCKED-INFRA-001.md and QUEUE-COMPLETE.md
- Frappe container name is `frappe-poc-backend-1` (not `spark-mojo-platform-poc-frappe-1` as in specs)

### Action Required
James needs to add DNS A records for admin/internal/willow.sparkmojo.com → 72.60.125.140
