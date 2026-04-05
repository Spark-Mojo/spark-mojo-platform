# PLAN-BILL-003: Stedi Claim Submission Endpoint

## Files to Create

### 1. `abstraction-layer/routes/billing.py`
New FastAPI router following `routes/onboarding.py` pattern. Two routers:
- `router` — billing capability endpoints (prefix `/api/modules/billing`)
- `webhook_router` — Stedi webhook receiver (prefix `/api/webhooks/stedi`)

### 2. `abstraction-layer/tests/test_billing.py`
Full test suite covering all 3 endpoints + edge cases.

## Files to Modify

### 3. `abstraction-layer/main.py`
Add two router registrations:
```python
from routes.billing import router as billing_router, webhook_router as billing_webhook_router
app.include_router(billing_router)
app.include_router(billing_webhook_router)
```

### 4. `abstraction-layer/.env.example` (if exists, otherwise create)
Add:
```
STEDI_API_KEY=
STEDI_SANDBOX=true
```

---

## Endpoints

### Endpoint 1: `POST /api/modules/billing/claims/submit`

**Request:**
```python
class ClaimSubmitRequest(BaseModel):
    claim_name: str              # e.g. "CLM-202604-0001"
    validation_mode: str = "snip"
```

**Response:**
```python
class ClaimSubmitResponse(BaseModel):
    success: bool
    claim_name: str
    stedi_claim_id: str | None
    edit_status: str             # "accepted", "rejected", "error"
    warnings: list[str]
    errors: list[str]
    submitted_at: str | None     # ISO 8601
```

**Implementation steps:**
1. Read SM Claim from Frappe (via httpx to FRAPPE_URL) — include child table `claim_lines`
2. Validate `canonical_state` is "draft" or "validated" — reject if already submitted
3. Read SM Payer record — get `stedi_trading_partner_id`
4. Read SM Provider record — get `npi`, `tax_id`, `taxonomy_code`, `provider_name`
5. If `billing_provider` differs from `provider`, read billing provider too
6. Construct Stedi 837P JSON:
   - `tradingPartnerServiceId` from SM Payer.stedi_trading_partner_id
   - `submitter` from billing/provider
   - `subscriber` from SM Claim patient fields
   - `claimInformation` from SM Claim + claim_lines
   - Map `place_of_service`: 11=office, 02=telehealth, 10=telehealth-home
   - Map `icd_codes` (comma-separated → array)
   - Map `modifiers` (comma-separated → array)
7. POST to Stedi `/healthcare/claims`:
   - Headers: `Authorization: Key {STEDI_API_KEY}`
   - Idempotency key = `claim_name`
8. On success: update SM Claim (`stedi_claim_id`, `canonical_state=submitted`, `submission_date=today`)
9. On rejection: reset `canonical_state=draft`, return errors
10. On network error: do NOT update claim state, return error

### Endpoint 2: `POST /api/webhooks/stedi/277`

**Webhook receiver for 277CA claim acknowledgments.**

1. Parse Stedi webhook event JSON
2. Extract `transactionId` and `transactionSetIdentifier`
3. Verify identifier is "277"
4. GET Stedi `/healthcare/claim-acknowledgment/{transactionId}`
5. Match to SM Claim via `patient_control_number`
6. Update SM Claim:
   - A1 (accepted): `canonical_state=adjudicating`, `acknowledgment_date=today`
   - A2 (accepted with errors): same + warnings
   - R3 (rejected): `canonical_state=draft`, add rejection to notes
7. No match → log warning, return 200

### Endpoint 3: `GET /api/modules/billing/claims/{claim_name}/status`

**Response:**
```python
class ClaimStatusResponse(BaseModel):
    claim_name: str
    canonical_state: str
    stedi_claim_id: str | None
    submission_date: str | None
    paid_amount: float | None
    patient_responsibility: float | None
    denial: dict | None
    timeline: list[dict]
```

Read SM Claim from Frappe. Build timeline from date fields. If denied, include SM Denial summary. Return 404 for unknown claim names.

---

## Environment Variables

| Var | Purpose |
|-----|---------|
| `STEDI_API_KEY` | Stedi API key (required for real calls) |
| `STEDI_SANDBOX` | "true" → use mock responses, never call real Stedi |
| `FRAPPE_URL` | Frappe backend URL (already in env) |
| `FRAPPE_API_KEY` / `FRAPPE_API_SECRET` | Frappe auth (already in env) |

---

## Stedi Mock Response Shape (for tests)

When `STEDI_SANDBOX=true`, the submit endpoint returns a mock response instead of calling Stedi:

```json
{
  "transactionId": "TEST-TXN-001",
  "status": "accepted",
  "editStatus": "accepted",
  "errors": [],
  "warnings": []
}
```

---

## Test Strategy

All tests use `unittest.mock.patch` or `pytest-httpx` to mock:
1. **Frappe HTTP calls** — mock `httpx.AsyncClient` responses for SM Claim, SM Payer, SM Provider reads/writes
2. **Stedi HTTP calls** — mock at httpx level. NEVER call real Stedi API.
3. Set `STEDI_SANDBOX=true` in test env

### Test Cases

| # | Test | Endpoint |
|---|------|----------|
| 1 | Submit valid claim → success, stedi_claim_id populated | POST /claims/submit |
| 2 | Submit already-submitted claim → error (state validation) | POST /claims/submit |
| 3 | Submit with Stedi rejection → success=false, errors populated | POST /claims/submit |
| 4 | Submit with network error → success=false, claim state unchanged | POST /claims/submit |
| 5 | 277 webhook A1 accepted → claim state=adjudicating | POST /webhooks/stedi/277 |
| 6 | 277 webhook R3 rejected → claim state=draft | POST /webhooks/stedi/277 |
| 7 | 277 webhook no matching claim → 200 OK (no error) | POST /webhooks/stedi/277 |
| 8 | Status of existing claim → timeline populated | GET /claims/{name}/status |
| 9 | Status of unknown claim → 404 | GET /claims/{name}/status |

### Gate

```bash
pytest tests/ --cov=. --cov-report=term-missing --omit=connectors/frappe_native.py --cov-fail-under=70
```

---

## DocType Field Reference

### SM Claim (autoname: CLM-.YYYY.MM.-.####)
Key fields: `patient_name`, `patient_member_id`, `patient_dob`, `payer` (Link→SM Payer), `provider` (Link→SM Provider), `billing_provider` (Link→SM Provider), `date_of_service`, `place_of_service` (11/02/10), `claim_charge_amount`, `canonical_state`, `stedi_claim_id`, `patient_control_number` (unique), `submission_date`, `acknowledgment_date`, `adjudication_date`, `paid_amount`, `patient_responsibility`, `prior_auth_number`, `notes`, `claim_lines` (Table→SM Claim Line)

### SM Claim Line (child table, istable=1)
Fields: `line_number`, `cpt_code`, `modifiers` (comma-separated), `icd_codes` (comma-separated), `charge_amount`, `units`, `paid_amount`, `adjustment_amount`, `denial_reason_code`

### SM Payer (autoname: payer_short_name)
Key fields: `payer_name`, `payer_short_name`, `stedi_trading_partner_id`, `payer_type`

### SM Provider (autoname: npi)
Key fields: `provider_name`, `npi`, `tax_id`, `taxonomy_code`, `license_type`
