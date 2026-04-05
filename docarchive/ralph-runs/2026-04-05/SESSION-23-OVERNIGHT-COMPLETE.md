# Session 23 Overnight Run — Complete

**Date:** 2026-04-05
**Stories:** BILL-004, STORY-017

---

## BILL-004 — 835 ERA Processing

| Field | Value |
|-------|-------|
| Branch | `story/bill-004-era-835-processing` |
| Commit | `2febd62` (feat), `5aa99d2` (merge) |
| Tests | 131 pass (11 new for ERA/denial paths) |
| Coverage | 81% |
| VPS Deploy | Deployed — 137/137 tests pass, 5/6 verify (expected: admin lacks SM Task) |

### Endpoints Built
- `POST /api/modules/billing/835` — Stedi ERA webhook: fetch ERA, resolve payer, match claims by PCN, auto-post payments, detect denials (CAS group + paid==0), create SM Task for unmatched lines
- `GET /api/modules/billing/era/{name}` — ERA detail read
- `GET /api/modules/billing/denials` — Denial list
- `GET /api/modules/billing/denials/{name}` — Denial detail read

### Helpers Added
- `_create_frappe_doc()`, `_list_frappe_docs()`
- Pydantic models: `ERADetailResponse`, `DenialListResponse`, `DenialDetailResponse`

---

## STORY-017 — Medplum Per-Project ClientApplication Creation

| Field | Value |
|-------|-------|
| Branch | `story/story-017-medplum-client-application` |
| Commit | `cc7c854` (feat), `b1076a0` (merge) |
| Tests | 126 pass (6 new: 2 connector + 4 provisioning) |
| Coverage | 80% |
| VPS Deploy | Deployed — 137/137 tests pass, 5/6 verify (expected) |

### Changes
- Extended `MedplumClient` with `create_client_application(project_id, app_name)`
- Added `step_08b_create_client_application()` in provisioning.py — non-blocking, secret logged via WARNING only (never stored in Frappe or git)
- Updated `step_10_register_site()` with `medplum_client_id` parameter

---

## BLOCKED Files

None.

## Warnings

None.

## VPS Deployment Status

Both stories merged to main and deployed successfully:
- 137/137 abstraction-layer tests pass on VPS
- `deploy.sh --verify-only` shows 5/6 on admin (expected — admin site lacks SM Task DocType)
- All other sites: 6/6

## Next Steps

1. Run morning verification against live endpoints
2. Commission BILL-005 (next billing story)
3. Commission STORY-018 (next platform story)
