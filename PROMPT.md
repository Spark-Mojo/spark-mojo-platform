# Session 23 Overnight Task Queue

## Stories

**BILL-004** — 835 ERA processing
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-004-era-835-processing.md
Branch: story/bill-004-era-835-processing

**STORY-017** — Medplum per-project ClientApplication creation
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-017-medplum-client-application.md
Branch: story/story-017-medplum-client-application

## Rules
- Both stories are independent Python API work — run in parallel
- BILL-004: Extend abstraction-layer/routes/billing.py — do NOT create a new file
- BILL-004: The 835 webhook goes in billing_webhook_router (same router as the 277 webhook in BILL-003)
- BILL-004: Mock all Stedi HTTP calls at the httpx level — do NOT call real Stedi API
- BILL-004: Mock all Frappe calls — do NOT require a live Frappe instance for tests
- BILL-004: SM ERA, SM ERA Line, SM Denial, SM Task DocTypes all already exist — read their JSON schemas before building
- BILL-004: All VPS test URLs use poc-dev.app.sparkmojo.com — NOT poc.sparkmojo.com (legacy)
- STORY-017: Read DECISION-028 before starting — tenant isolation is a HIPAA requirement
- STORY-017: medplum_connector.py already exists — extend it, do not recreate it
- STORY-017: NEVER store medplum_client_secret in Frappe or commit it to git — log to stdout with WARNING prefix only
- Coverage command: pytest tests/ --cov=. --cov-report=term-missing --omit=connectors/frappe_native.py --cov-fail-under=70
- Write BLOCKED-[STORY].md if any architectural ambiguity arises — never improvise on architecture
- Always deploy to VPS after merging — ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git pull origin main && ./deploy.sh'
