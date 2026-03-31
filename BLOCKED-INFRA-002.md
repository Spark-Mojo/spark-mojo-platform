# BLOCKED: INFRA-002 — SM Site Registry DocType

**Date:** 2026-03-30
**Blocker:** Dependency INFRA-001-COMPLETE not present

## Details

INFRA-002 depends on INFRA-001 (Provision admin.sparkmojo.com). INFRA-001 is blocked on DNS A records not being configured for admin.sparkmojo.com.

Until INFRA-001 completes, INFRA-002 cannot proceed because:
- The seed data requires `admin.sparkmojo.com` to exist as a Frappe site
- `bench migrate` and DocType verification run against the admin site
- All Definition of Done checks reference the admin site

## Action Required

Resolve INFRA-001 first (James must add DNS A records — see BLOCKED-INFRA-001.md).

## Cascade

All remaining stories (INFRA-003 through INFRA-007) are also blocked via this dependency chain.
