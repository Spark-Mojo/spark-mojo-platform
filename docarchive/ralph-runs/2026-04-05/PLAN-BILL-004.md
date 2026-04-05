# PLAN-BILL-004: 835 ERA Processing

**Story:** BILL-004-era-835-processing
**File to extend:** `abstraction-layer/routes/billing.py`
**Gate:** pytest + coverage >= 70%

---

## Overview

Extend the existing billing routes with an 835 ERA webhook receiver and three read endpoints. The webhook receives Stedi 835 ERA events, creates SM ERA + SM ERA Line records, matches lines to SM Claims by `patient_control_number`, auto-posts payments to matched claims, detects denials, creates SM Denial records, and creates SM Tasks for unmatched lines.

All new webhook logic goes in `webhook_router` (the existing `billing_webhook_router` that already handles the 277 webhook). All new read endpoints go in `router` (the existing `billing_router`).

---

## Endpoints

### 1. `POST /webhooks/stedi/835` (on `webhook_router`)

Receives Stedi 835 ERA webhook event. Steps:

1. Parse webhook JSON, extract `transactionId`, verify `x12.transactionSetIdentifier == "835"`
2. GET Stedi `/healthcare/era/{transactionId}` for full 835 JSON
3. Resolve payer: look up SM Payer by `stedi_trading_partner_id` from ERA data
4. Create SM ERA record in Frappe (POST `/api/resource/SM ERA`)
5. For each claim payment (CLP segment) in the 835:
   a. Create SM ERA Line (as child row in `era_lines` table)
   b. Match to SM Claim by `patient_control_number`
   c. Detect denial (CAS group code + `paid_amount == 0`)
6. Auto-post payments to matched, non-denied claims
7. Create SM Denial for denied + matched lines
8. Create SM Task for unmatched lines
9. Update SM ERA totals and `processing_status`
10. Return HTTP 200

### 2. `GET /era/{era_name}` (on `router`)

Read SM ERA + child `era_lines` from Frappe. Return `ERADetailResponse`.

### 3. `GET /denials` (on `router`)

Query SM Denial list from Frappe with filters: `status`, `payer`, `date_from`, `date_to`, `limit`, `offset`.

### 4. `GET /denials/{denial_name}` (on `router`)

Read single SM Denial from Frappe. Include linked SM Claim summary and SM Appeal records if any.

---

## ERA Processing Logic

### Stedi 835 JSON structure (expected from GET `/healthcare/era/{transactionId}`)

```
{
  "transactionId": "...",
  "payerIdentifier": "...",        --> match to SM Payer.stedi_trading_partner_id
  "paymentDate": "2026-04-05",     --> SM ERA.era_date
  "checkOrEftNumber": "...",       --> SM ERA.check_eft_number
  "claimPayments": [
    {
      "patientControlNumber": "...",   --> SM ERA Line.patient_control_number
      "chargedAmount": 150.00,         --> SM ERA Line.charged_amount
      "paidAmount": 120.00,            --> SM ERA Line.paid_amount
      "patientResponsibility": 30.00,  --> SM ERA Line.patient_responsibility
      "serviceLines": [
        {
          "procedureCode": "90837",    --> SM ERA Line.cpt_code
          ...
        }
      ],
      "adjustments": [
        {
          "groupCode": "CO",           --> used for denial detection
          "reasonCode": "4",           --> SM ERA Line.carc_codes (comma-separated)
          "amount": 30.00              --> SM ERA Line.adjustment_amount
        }
      ],
      "remarkCodes": ["N130"]          --> SM ERA Line.rarc_codes (comma-separated)
    }
  ]
}
```

### Claim matching

Query Frappe: `GET /api/resource/SM Claim?filters=[["patient_control_number","=","{pcn}"]]&fields=["name","canonical_state","claim_charge_amount","paid_amount","adjustment_amount","patient_responsibility","payer"]&limit_page_length=1`

- If found: set `SM ERA Line.claim` = claim name, `SM ERA Line.match_status` = `"matched"`
- If not found: set `SM ERA Line.match_status` = `"unmatched"`

### Payment auto-posting (matched, non-denied lines)

Update SM Claim via PUT `/api/resource/SM Claim/{name}`:

| SM Claim field | Update logic |
|---|---|
| `paid_amount` | `+= SM ERA Line.paid_amount` |
| `adjustment_amount` | `+= SM ERA Line.adjustment_amount` |
| `patient_responsibility` | `= SM ERA Line.patient_responsibility` (or `+=` for multi-line) |
| `adjudication_date` | `= SM ERA.era_date` |
| `canonical_state` | Determined by payment completeness (see below) |

### Claim state determination

```python
net_expected = claim.claim_charge_amount - total_adjustment
if total_paid >= net_expected:
    canonical_state = "paid"
elif total_paid > 0:
    canonical_state = "partial_paid"
elif is_denied:
    canonical_state = "denied"
```

SM Claim `canonical_state` options used: `"paid"`, `"partial_paid"`, `"denied"`

---

## Denial Detection

A line is denied when:
- `paid_amount == 0` AND
- CAS group code indicates non-patient-responsibility adjustment (group codes like `"CO"`, `"OA"`, `"PI"` -- NOT `"PR"` which is patient responsibility)

Set `SM ERA Line.is_denied = 1` for denied lines.

---

## SM Denial Creation

For each SM ERA Line where `is_denied == 1` AND `match_status == "matched"`:

POST `/api/resource/SM Denial` with:

| SM Denial field | Source |
|---|---|
| `claim` | SM ERA Line.claim (Link to SM Claim) |
| `era` | SM ERA name (Link to SM ERA) |
| `denial_date` | SM ERA.era_date |
| `carc_codes` | SM ERA Line.carc_codes (Data, comma-separated) |
| `rarc_codes` | SM ERA Line.rarc_codes (Data, comma-separated) |
| `denied_amount` | SM ERA Line.charged_amount - SM ERA Line.paid_amount |
| `canonical_state` | `"new"` |
| `appeal_deadline` | SM ERA.era_date + SM Payer.appeal_window_days (if payer has it set) |

AI fields (`ai_category`, `ai_subcategory`, `ai_plain_english`, `ai_root_cause`, `ai_appealable`, `ai_appeal_priority`, `ai_confidence`) are left empty -- populated by future BILL-006.

---

## SM Task Creation (unmatched lines)

For each SM ERA Line where `match_status == "unmatched"`:

Create SM Task via Frappe POST `/api/resource/SM Task`:

| Field | Value |
|---|---|
| `title` | `"Unmatched ERA line: PCN {patient_control_number}"` |
| `description` | `"ERA {era_name} contains a payment for PCN {patient_control_number} that does not match any SM Claim. Manual review required."` |
| `canonical_state` | `"open"` |

---

## Field Mappings

### 835 Stedi response --> SM ERA

| Stedi 835 field | SM ERA field | SM ERA fieldtype |
|---|---|---|
| `transactionId` | `stedi_transaction_id` | Data (128) |
| Payer ID --> SM Payer lookup | `payer` | Link (SM Payer) |
| `paymentDate` | `era_date` | Date |
| `checkOrEftNumber` | `check_eft_number` | Data (64) |
| Sum of all claim paid amounts | `total_paid_amount` | Currency |
| Count of CLP segments | `total_claims` | Int |
| Count of matched lines | `matched_claims` | Int |
| Count of unmatched lines | `unmatched_claims` | Int |
| (set during processing) | `processing_status` | Select: received/processing/posted/partial_posted/error |
| `datetime.now(UTC)` | `received_at` | Datetime |
| `datetime.now(UTC)` after processing | `processed_at` | Datetime |
| Full Stedi JSON response | `raw_json` | JSON |
| (child table) | `era_lines` | Table (SM ERA Line) |

### 835 claim payment --> SM ERA Line (child of SM ERA)

| Stedi 835 field | SM ERA Line field | SM ERA Line fieldtype |
|---|---|---|
| Matched SM Claim name | `claim` | Link (SM Claim) |
| CLP `patientControlNumber` | `patient_control_number` | Data (64) |
| SVC `procedureCode` | `cpt_code` | Data (10) |
| CLP `chargedAmount` | `charged_amount` | Currency |
| CLP `paidAmount` | `paid_amount` | Currency |
| CAS `amount` (sum) | `adjustment_amount` | Currency |
| AMT `patientResponsibility` | `patient_responsibility` | Currency |
| CAS `reasonCode` (comma-joined) | `carc_codes` | Data (100) |
| Remark codes (comma-joined) | `rarc_codes` | Data (100) |
| Denial detection result | `is_denied` | Check (0/1) |
| Match result | `match_status` | Select: matched/unmatched/manual_review |

### SM ERA Line --> SM Claim (payment auto-post)

| SM ERA Line field | SM Claim field | Update mode |
|---|---|---|
| `paid_amount` | `paid_amount` | Accumulate (`+=`) |
| `adjustment_amount` | `adjustment_amount` | Accumulate (`+=`) |
| `patient_responsibility` | `patient_responsibility` | Accumulate (`+=`) |
| ERA date | `adjudication_date` | Set |
| (computed) | `canonical_state` | Set: paid/partial_paid/denied |

### SM ERA Line (denied) --> SM Denial

| Source | SM Denial field | SM Denial fieldtype |
|---|---|---|
| SM ERA Line.claim | `claim` | Link (SM Claim) |
| SM ERA name | `era` | Link (SM ERA) |
| SM ERA.era_date | `denial_date` | Date |
| SM ERA Line.carc_codes | `carc_codes` | Data (100) |
| SM ERA Line.rarc_codes | `rarc_codes` | Data (100) |
| charged_amount - paid_amount | `denied_amount` | Currency |
| `"new"` | `canonical_state` | Select |
| era_date + payer.appeal_window_days | `appeal_deadline` | Date |

---

## Test Strategy

**Test file:** `abstraction-layer/tests/test_billing_era.py`

**Mock strategy:** Mock ALL Frappe HTTP calls and ALL Stedi HTTP calls at the `httpx` level using `pytest` + `respx` (or `httpx` mock transport). No real API calls.

### Synthetic 835 payload

Build a test 835 webhook payload with:
- 2-3 claim payments: one that matches an existing SM Claim PCN, one that does not match, one that is a denial
- Known CARC/RARC codes for the denial case
- Known amounts for payment math verification

### Test cases

1. **Happy path -- matched payment:** Webhook with PCN matching an SM Claim. Assert SM ERA created, SM ERA Line matched, SM Claim updated with `paid_amount` and `canonical_state = "paid"`.
2. **Partial payment:** `paid_amount < claim_charge_amount - adjustment_amount`. Assert `canonical_state = "partial_paid"`.
3. **Denial detection:** `paid_amount == 0` with CAS group code `"CO"`. Assert `SM ERA Line.is_denied = 1`, SM Denial created with correct `denied_amount`, `carc_codes`, `canonical_state = "new"`.
4. **Unmatched line:** PCN with no matching SM Claim. Assert `SM ERA Line.match_status = "unmatched"`, SM Task created with correct title.
5. **Non-835 webhook ignored:** Webhook with `transactionSetIdentifier != "835"`. Assert 200 returned, no processing.
6. **GET /era/{era_name}:** Mock Frappe read, assert `ERADetailResponse` structure.
7. **GET /denials:** Mock Frappe list query with filters, assert correct response.
8. **GET /denials/{denial_name}:** Mock Frappe read, assert full denial detail.
9. **SM ERA totals:** After processing, assert `total_claims`, `matched_claims`, `unmatched_claims`, `processing_status` are correct.
10. **Appeal deadline calculation:** Denial with payer that has `appeal_window_days` set. Assert `appeal_deadline = denial_date + appeal_window_days`.

### Mocking approach

```python
# Use respx to intercept httpx calls
import respx

# Mock Stedi ERA fetch
respx.get("https://healthcare.us.stedi.com/2024-04-01/healthcare/era/TEST-TXN-001").mock(
    return_value=httpx.Response(200, json=SYNTHETIC_835_RESPONSE)
)

# Mock Frappe SM Claim lookup
respx.get(f"{FRAPPE_URL}/api/resource/SM Claim", params=...).mock(...)

# Mock Frappe SM ERA create
respx.post(f"{FRAPPE_URL}/api/resource/SM ERA").mock(...)

# Mock Frappe SM Claim update
respx.put(f"{FRAPPE_URL}/api/resource/SM Claim/CLM-2026.04-0001").mock(...)

# Mock Frappe SM Denial create
respx.post(f"{FRAPPE_URL}/api/resource/SM Denial").mock(...)

# Mock Frappe SM Task create
respx.post(f"{FRAPPE_URL}/api/resource/SM Task").mock(...)
```

---

## Gates

```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer
pytest tests/ --cov=. --cov-report=term-missing --omit=connectors/frappe_native.py --cov-fail-under=70
```

All tests must pass. Coverage must be >= 70%. No real HTTP calls allowed in tests.

---

## Implementation Notes

- Add `# TODO: Move to background job for large ERAs (BILL-010)` comment in the webhook handler
- Reuse existing `_read_frappe_doc`, `_update_frappe_doc`, `_frappe_headers`, `_stedi_headers` helpers from billing.py
- Add a new helper `_create_frappe_doc(doctype, data)` for POST operations (SM ERA, SM Denial, SM Task)
- Add a new helper `_list_frappe_docs(doctype, filters, fields, limit)` for GET list operations
- Pydantic models needed: `ERADetailResponse`, `DenialListResponse`, `DenialDetailResponse`
- SM ERA Line is a child table (`istable: 1`) -- it is created as part of the SM ERA parent doc's `era_lines` field, not as a standalone POST
- SM Denial autoname is `DEN-.YYYY.MM.-.####` -- Frappe generates the name
- SM ERA autoname is `ERA-.YYYY.MM.-.####` -- Frappe generates the name
