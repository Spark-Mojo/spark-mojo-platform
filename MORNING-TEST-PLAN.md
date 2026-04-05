# Session 22 Morning Verification Plan
## BILL-003 + STORY-016

**Check these in order after Ralph finishes.**

---

## Step 1 — git log (both repos)
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform && git log --oneline -5
ssh sparkmojo 'cd /home/ops/spark-mojo-platform && git log --oneline -3'
```
Pass: BILL-003 and STORY-016 merge commits appear on both local and VPS.

---

## Step 2 — billing.py exists and registers two routers
```bash
ls /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/billing.py
grep -c "billing_router\|billing_webhook_router" /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/main.py
```
Pass: file exists, count >= 2.

---

## Step 3 — billing tests pass locally
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer
pytest tests/test_billing.py -v 2>&1 | tail -20
```
Pass: 0 failures.

---

## Step 4 — full test suite passes with coverage
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer
pytest tests/ --cov=. --cov-report=term-missing --omit=connectors/frappe_native.py --cov-fail-under=70 2>&1 | tail -20
```
Pass: exits 0, coverage >= 70%.

---

## Step 5 — billing endpoints appear in OpenAPI docs on VPS
```bash
curl -s https://poc.sparkmojo.com/openapi.json | python3 -c "import sys,json; paths=json.load(sys.stdin)['paths']; print([p for p in paths if 'billing' in p or '277' in p])"
```
Pass: three billing paths in output.

---

## Step 6 — claim submission endpoint responds (sandbox mode)
```bash
# First create a test claim in Frappe Desk if not already present
curl -s -X POST https://poc.sparkmojo.com/api/modules/billing/claims/submit \
  -H 'Content-Type: application/json' \
  -d '{"claim_name": "CLM-202604-0001", "validation_mode": "snip"}'
```
Pass: HTTP 200 (success or structured error — no 500, no 404).

---

## Step 7 — provisioning.py Medplum stub replaced
```bash
grep -n "medplum_client.is_configured\|MedplumClient" /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer/routes/provisioning.py | head -10
```
Pass: MedplumClient imported and is_configured check present.

---

## Step 8 — stub mode still works without MEDPLUM_BASE_URL
```bash
ssh sparkmojo "docker exec poc-api sh -c 'MEDPLUM_BASE_URL= python3 -c \"from routes.provisioning import medplum_client; print(medplum_client.is_configured)\"'"
```
Pass: prints False.

---

## Step 9 — SESSION-22-OVERNIGHT-COMPLETE.md exists
```bash
ls /Users/jamesilsley/GitHub/spark-mojo-platform/docarchive/ralph-runs/2026-04-*/SESSION-22-OVERNIGHT-COMPLETE.md 2>/dev/null || ls /Users/jamesilsley/GitHub/spark-mojo-platform/SESSION-22-OVERNIGHT-COMPLETE.md 2>/dev/null
```
Pass: file found in either location.

---

## Step 10 — No BLOCKED files
```bash
ls /Users/jamesilsley/GitHub/spark-mojo-platform/BLOCKED-* 2>/dev/null && echo "REVIEW NEEDED" || echo "clean"
```
Pass: prints clean.

---

## If All Steps Pass
BILL-003 and STORY-016 are fully verified. Commission BILL-004 (ERA 835 processing) and STORY-017 (per-project ClientApplication) in the next session.

## If Steps Fail
Note the exact failure and step number. Bring back to Claude Chat with the error output.
