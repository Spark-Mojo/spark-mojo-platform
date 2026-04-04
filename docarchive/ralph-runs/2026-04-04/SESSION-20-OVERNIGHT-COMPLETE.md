# Session 20 Overnight Run — Complete

**Date:** 2026-04-04

## BILL-001 — sm_billing Frappe app scaffold
- **Status:** COMPLETE
- **Branch:** `story/bill-001-sm-billing-scaffold`
- **Commit:** `6a984de` — feat: sm_billing Frappe app scaffold - fourth SM custom app for billing module

## STORY-014 — Medplum Docker services
- **Status:** NOT COMPLETED
- **Branch:** `story/story-014-medplum-docker` (exists but no story-specific commits)
- **Note:** STORY-014 was not picked up during the overnight run. The branch exists at the same base as main with no Medplum work applied.

## Warnings
- STORY-014 needs to be built in a future session — no work was done on it overnight.

## Next Steps
1. **Merge BILL-001:** `story/bill-001-sm-billing-scaffold` → `main` (ready for PR/merge)
2. **Build STORY-014:** Medplum Docker services still need implementation in a future session
3. **After STORY-014 is built:** Add Medplum env vars to `.env.poc`, verify with STORY-014 test steps
4. **Deploy:** Run `deploy.sh` after merging BILL-001 to get sm_billing onto the VPS
