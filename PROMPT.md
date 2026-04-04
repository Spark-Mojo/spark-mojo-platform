# Session 21 Overnight Task Queue

## Stories

**BILL-002** — Core billing DocTypes (11 DocTypes)
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-002-core-billing-doctypes.md
Branch: story/bill-002-core-billing-doctypes

**STORY-015** — Medplum abstraction layer connector
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-015-medplum-abstraction-layer-connector.md
Branch: story/story-015-medplum-connector

## Rules
- Both stories run in parallel via dispatcher hat
- BILL-002 deploys to VPS as part of verification — this is always done
- STORY-015 unit tests only — no VPS deployment needed for Python connector
- BILL-002 verifier creates a test SM Payer record to confirm DocTypes work end-to-end
- Write BLOCKED-[STORY].md if any architectural ambiguity arises
- Always deploy to VPS after merging — never skip this step
