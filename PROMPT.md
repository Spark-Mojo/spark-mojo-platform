# Session 22 Overnight Task Queue

## Stories

**BILL-003** — Stedi claim submission endpoint
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-003-stedi-claim-submission.md
Branch: story/bill-003-stedi-claim-submission

**STORY-016** — Replace Medplum stub with real Project creation in provisioning API
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-016-medplum-project-provisioning.md
Branch: story/story-016-medplum-project-provisioning

## Rules
- Both stories are independent Python API work — run in parallel
- BILL-003: Mock Stedi HTTP calls at the httpx/requests level in tests. Do NOT call real Stedi API. Set STEDI_SANDBOX=true and mock the HTTP response.
- BILL-003: Stedi mock response shape for 837P submission: {"transactionId": "TEST-TXN-001", "status": "accepted", "editStatus": "accepted", "errors": [], "warnings": []}
- BILL-003: The 277CA webhook receiver test uses a synthetic webhook payload — do not require real Stedi webhook delivery
- STORY-016: Medplum connector is already built at abstraction-layer/connectors/medplum_connector.py — import it, do not rebuild it
- Coverage command: pytest tests/ --cov=. --cov-report=term-missing --omit=connectors/frappe_native.py --cov-fail-under=70
- Write BLOCKED-[STORY].md if any architectural ambiguity arises
- Always deploy to VPS after merging — never skip this step
