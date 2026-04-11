# BLOCKED: FIX-41-004 — Dual Frontend Container Cleanup

**Date:** 2026-04-11
**Reason:** frappe-poc-frontend-1 has active Traefik labels pointing to live domains.

## Traefik Labels Found

The container has Traefik routing labels for ALL live domains:
- `admin.sparkmojo.com`
- `internal.sparkmojo.com`
- `poc-dev.sparkmojo.com`
- `poc.sparkmojo.com`
- `willow.sparkmojo.com`

Service: `frappe-poc` on port 8080.

## Why Blocked

Per story spec: "Traefik labels found pointing to live domain → write BLOCKED, do not stop the container."

This container is the Frappe Desk nginx frontend — it routes all Frappe Desk traffic. Stopping it would break Frappe Desk access on all sites. This is NOT a stale duplicate; it serves Frappe while spark-mojo-platform-poc-frontend-1 serves the React app.

## Resolution

The "dual frontend" is by design — two different frontends (Frappe Desk vs React app). No cleanup needed. This story's premise was incorrect.
