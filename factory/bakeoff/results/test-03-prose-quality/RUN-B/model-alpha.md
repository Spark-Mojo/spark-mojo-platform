model: model-alpha
test: 03-prose-quality
run: B
date: 2026-04-09

# Healthcare Billing Mojo — Internal Playbook

**Document type:** Internal Operations Playbook
**Audience:** Spark Mojo admins, practice billing managers
**Last updated:** April 9, 2026
**Source specification:** BILLING.md (Session 27)

---

## Overview

Healthcare Billing Mojo is the revenue cycle management capability for the Spark Mojo platform. It handles the full insurance billing lifecycle — from eligibility verification before a patient's first visit to cash posted in the bank account.

This playbook documents every workflow, every field, and every state transition in the system. Use it when you need to understand how a claim moves from `draft` to `closed`, how to handle a denial flagged by AI, or how to authorize a financial write-off.

**Core principle:** Staff do not touch a clearinghouse portal. Staff do not manually check claim status. Staff do not chase denial codes in a PDF manual. The Mojo submits claims, receives acknowledgments, posts payments, flags denials, and routes every claim to the correct next action automatically.

---

## Who Uses This and How

### User Roles

| Role | Who they are | Primary responsibilities |
|------|-------------|--------------------------|
| **Biller** | Practice billing coordinator | Daily claim queue management, denial review, appeal initiation, claim correction |
| **Supervisor** | Practice billing manager | Write-off approval, reopened claim authorization, financial oversight |
| **Billing Coordinator** | Spark Mojo operations staff | Voided claim execution, system configuration, escalation handling |
| **Spark Mojo Admin** | Platform support staff | Troubleshooting, configuration changes, data corrections |

### Daily Workflow Overview

1. **Biller opens denial worklist** — prioritized by AI category (correctable → appealable → terminal) and appeal deadline
2. **Biller reviews AI-suggested actions** — corrects claims, initiates appeals, or escalates
3. **System processes ERA files** — auto-posts payments, flags denials, creates SM Denial records
4. **Biller handles manual transitions** — appeals, resubmissions, hold placements
5. **Supervisor approves write-offs** — reviews appeal_lost claims, authorizes write-off with reason code
6. **System moves claims through automated states** — submission, adjudication, payment posting

---

## Detailed Function Reference

### Feature Tier 1: Claim State Machine Core

#### SM Claim DocType

The central document for all insurance billing operations.

**Core Fields:**

| Field | Type | Purpose | Editable by |
|-------|------|---------|-------------|
| `canonical_state` | Select (19 options) | Current state in claim lifecycle | System (automated transitions) or Biller (manual transitions) |
| `state_changed_at` | Datetime | Timestamp of last state transition | System-set |
| `state_changed_by` | Data | User ID or system process that triggered transition | System-set |
| `previous_state` | Data | State before last transition (quick reference) | System-set |
| `state_change_reason` | Small Text | Reason code for manual transitions | Required for manual transitions |
| `is_overdue` | Check | Set by scheduler when claim exceeds expected payer timeline | System-set |
| `hold_reason` | Small Text | Why the claim is on hold (required when `canonical_state = held`) | Biller (required field) |
| `secondary_payer` | Link (SM Payer) | Secondary payer if applicable | Biller |
| `patient_balance_amount` | Currency | Outstanding patient balance | System-set |
| `write_off_amount` | Currency | Amount written off | Supervisor (during write-off approval) |
| `write_off_approved_by` | Data | Supervisor who approved write-off | System-set |

**The 19 States — Complete Reference:**

| # | State | Category | Trigger Type | Description |
|---|-------|----------|-------------|-------------|
| 1 | `draft` | Pre-submission | System or Biller | Initial state. Claim created from encounter or manual entry. |
| 2 | `pending_info` | Pre-submission | System (scrubber) | Missing patient or eligibility data. Requires biller action. |
| 3 | `pending_auth` | Pre-submission | System (scrubber) | No valid authorization on file. BH-specific when `session_count_auth_enabled = true`. |
| 4 | `validated` | Pre-submission | System (scrubber) | All checks passed. Ready for submission. |
| 5 | `held` | Pre-submission | Biller (manual) | Claim intentionally held. `hold_reason` field required. |
| 6 | `submitted` | Submission | System (837P) | Claim accepted by Stedi clearinghouse. |
| 7 | `rejected` | Submission | System (277CA) | Claim rejected at clearinghouse level. Requires correction. |
| 8 | `adjudicating` | Adjudication | System (277CA) | Claim received by payer, under review. |
| 9 | `paid` | Post-adjudication | System (835 ERA) | Full payment received. |
| 10 | `partial_paid` | Post-adjudication | System (835 ERA) | Partial payment received. Balance may go to secondary or patient. |
| 11 | `denied` | Post-adjudication | System (835 ERA) | Claim denied. SM Denial record created. |
| 12 | `in_appeal` | Appeal | Biller (manual) | Appeal initiated. Requires conscious decision. |
| 13 | `appeal_won` | Appeal | Biller or System | Appeal successful. Awaiting payment ERA. |
| 14 | `appeal_lost` | Appeal | Biller or System | Appeal unsuccessful. Options: second-level appeal or write-off. |
| 15 | `pending_secondary` | Multi-payer | System (835 ERA) | Primary paid with PR balance. Secondary payer on file. |
| 16 | `patient_balance` | Patient | System | All payer adjudication complete. Patient owes remaining balance. |
| 17 | `written_off` | Terminal | Supervisor (manual) | Amount written off with approval and reason code. |
| 18 | `closed` | Terminal | System | All balances zero. Claim lifecycle complete. |
| 19 | `voided` | Terminal | Billing Coordinator (manual) | Irreversible administrative void. |

**Valid Transitions (VALID_TRANSITIONS dict in `sm_claim.py`):**

The Python controller enforces every state move. Any transition not in the dict is rejected with a validation error.

<details>
<summary>Complete Transition Map (expand for reference)</summary>

| From State | Valid To States |
|-----------|----------------|
| `draft` | `pending_info`, `pending_auth`, `validated`, `held`, `voided` |
| `pending_info` | `draft`, `held` |
| `pending_auth` | `draft`, `held` |
| `validated` | `submitted`, `held` |
| `held` | `draft`, `validated`, `submitted` |
| `submitted` | `adjudicating`, `rejected` |
| `rejected` | `draft` |
| `adjudicating` | `paid`, `partial_paid`, `denied` |
| `paid` | `pending_secondary` |
| `partial_paid` | `pending_secondary`, `patient_balance` |
| `denied` | `in_appeal`, `draft`, `written_off` |
| `in_appeal` | `appeal_won`, `appeal_lost` |
| `appeal_won` | `adjudicating`, `closed` |
| `appeal_lost` | `in_appeal`, `written_off` |
| `pending_secondary` | `adjudicating`, `patient_balance` |
| `patient_balance` | `closed`, `written_off` |
| `written_off` | Terminal (no exits) |
| `closed` | Terminal (no exits) |
| `voided` | Terminal (no exits) |

</details>

#### SM Claim State Log DocType

Standalone DocType in `sm_billing`. One record per state transition. Not a child table — loaded separately to avoid performance penalty on claim reads as history accumulates.

| Field | Type | Purpose |
|-------|------|---------|
| `claim` | Link (SM Claim) | Parent claim |
| `from_state` | Data | State before transition |
| `to_state` | Data | State after transition |
| `changed_at` | Datetime | When the transition occurred |
| `changed_by` | Data | User ID or system process identifier |
| `trigger_type` | Select | `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler` |
| `trigger_reference` | Data | ERA name, webhook transaction ID, etc. |
| `reason` | Small Text | Human-readable reason (mandatory for manual transitions) |
| `paid_amount_at_change` | Currency | Financial snapshot at moment of transition |
| `adjustment_amount_at_change` | Currency | Financial snapshot at moment of transition |
| `patient_responsibility_at_change` | Currency | Financial snapshot at moment of transition |

**Trigger Types Explained:**

| Trigger Type | When it occurs | Example reference |
|-------------|---------------|-------------------|
| `manual` | Biller, Supervisor, or Billing Coordinator initiates transition | User ID |
| `webhook_277ca` | Stedi 277CA webhook received | 277CA transaction ID |
| `webhook_835` | Stedi 835 ERA webhook received | ERA name |
| `api` | Mojo Abstraction Layer endpoint called | API endpoint path |
| `scheduler` | Scheduled job (e.g., overdue flag setting) | Job name |

---

### Feature Tier 2: Automated EDI Transitions

#### 277CA Webhook Handler

**Function:** Parse incoming 277CA from Stedi and execute state transitions automatically.

**Automated transitions:**

| 277CA Category Code | State Transition | Description |
|--------------------|-----------------|-------------|
| A1, A2 | `submitted` → `adjudicating` | Claim received and accepted by payer |
| R3, A3 | `submitted` → `rejected` | Claim rejected at clearinghouse or front-end payer edit |
| A0 | Forward to another payer | No state change (informational) |
| E0 | Payer error | No state change (informational, may require manual follow-up) |
| A4 | Claim not found | No state change (potential data issue) |

**Process flow:**
1. Stedi sends 277CA webhook to `/api/modules/billing/webhooks/277ca`
2. System identifies SM Claim by claim ID in 277CA
3. System validates transition is valid per `VALID_TRANSITIONS`
4. System executes `transition_state()` on SM Claim
5. System creates SM Claim State Log entry with `trigger_type = "webhook_277ca"`
6. System stores 277CA transaction reference in `trigger_reference` field

**Error handling:**
- Invalid transition: Log error, create alert, do not change state
- Claim not found: Log error, create alert for manual review
- Concurrent webhook arrival: `for_update=True` on SM Claim doc prevents race conditions

#### 835 ERA State Machine Integration

**Function:** Wire existing 835 ERA processing (BILL-004) into the state machine for automatic payment posting and denial flagging.

**Automated transitions:**

| ERA Payment Scenario | State Transition | Financial Update |
|---------------------|-----------------|------------------|
| Full payment (paid amount = billed amount) | `adjudicating` → `paid` | `patient_balance_amount` updated if patient responsibility exists |
| Partial payment (paid amount < billed amount, no denial CARCs) | `adjudicating` → `partial_paid` | `patient_balance_amount` updated |
| Zero payment with denial CARCs | `adjudicating` → `denied` | SM Denial record created automatically |
| Primary paid with PR balance + secondary payer on file | `adjudicating` → `pending_secondary` | `secondary_payer` field referenced |

**Process flow:**
1. Stedi sends 835 ERA webhook to `/api/modules/billing/webhooks/835`
2. System identifies SM Claim by claim ID in ERA
3. System locks SM Claim doc with `for_update=True` (prevents concurrent modification)
4. System calculates payment scenario based on ERA amounts and CARC codes
5. System executes `transition_state()` atomically
6. System creates SM Claim State Log entry with financial snapshot:
   - `paid_amount_at_change`
   - `adjustment_amount_at_change`
   - `patient_responsibility_at_change`
7. System sets `trigger_type = "webhook_835"` and ERA name in `trigger_reference`

**Concurrency control:** `for_update=True` on SM Claim doc during ERA processing via whitelisted Frappe method ensures atomic updates when multiple ERAs arrive for the same claim simultaneously.

---

### Feature Tier 3: Denial Management

#### SM Denial DocType

Created automatically on `adjudicating` → `denied` transition. One SM Denial per denial event — a claim can have multiple denial events across its lifecycle.

| Field | Type | Purpose | Source |
|-------|------|---------|--------|
| `claim` | Link (SM Claim) | Parent claim | Auto-populated |
| `denial_date` | Date | Date of denial | ERA date |
| `carc_codes` | Table | Claim Adjustment Reason Codes | ERA CARC segments |
| `rarc_codes` | Table | Remittance Advice Remark Codes | ERA RARC segments |
| `denial_reason_summary` | Small Text | Human-readable denial reason | System-generated from CARC/RARC |
| `appeal_deadline` | Date | Computed from payer appeal window | `denial_date` + payer appeal days |
| `ai_category` | Select | `correctable`, `appealable`, `terminal` | AWS Bedrock classification |
| `ai_appealable` | Check | Whether claim is eligible for appeal | AWS Bedrock classification |
| `ai_action` | Small Text | Suggested next action | AWS Bedrock classification |
| `ai_confidence` | Float | Confidence score of AI classification | AWS Bedrock classification |

#### AI Denial Classification

**Function:** Classify denials automatically using AWS Bedrock (HIPAA BAA covered).

**Trigger:** SM Denial creation (automatic).

**Process:**
1. SM Denial record created
2. System sends CARC codes, payer name, and CPT code combination to AWS Bedrock
3. Bedrock returns classification:
   - `ai_category`: `correctable` (fix and resubmit), `appealable` (clinical appeal warranted), `terminal` (no recovery path)
   - `ai_appealable`: Boolean indicating appeal eligibility
   - `ai_action`: Suggested next step (e.g., "Correct modifier and resubmit", "Gather clinical notes and appeal", "Write off per payer policy")
   - `ai_confidence`: 0.0-1.0 confidence score
4. System populates SM Denial fields
5. **Classification only — no automatic state change.** Biller reviews and acts.

**Important:** AI classification is advisory. Billers make all decisions about denial handling. The system prioritizes the worklist but does not execute actions.

#### Denial Worklist Endpoint

**Endpoint:** `/api/modules/billing/denials/worklist`

**Returns:** Open denials grouped by `ai_category`, sorted by appeal deadline ascending within each group.

**Group order:**
1. `correctable` — highest priority, fastest resolution path
2. `appealable` — requires clinical documentation and appeal process
3. `terminal` — lowest priority, likely write-off candidates

**Filters available:**
- `payer` — filter by specific payer
- `date_from` / `date_to` — date range filter
- `ai_category` — filter by specific category

**Example response structure:**
```json
{
  "correctable": [
    {
      "denial_id": "SM-DEN-001",
      "claim_id": "SM-CLM-123",
      "patient_name": "Jane Smith",
      "denial_date": "2026-03-15",
      "appeal_deadline": "2026-04-14",
      "carc_codes": ["CO-45"],
      "ai_action": "Correct modifier and resubmit",
      "ai_confidence": 0.92
    }
  ],
  "appealable": [
    {
      "denial_id": "SM-DEN-002",
      "claim_id": "SM-CLM-124",
      "patient_name": "John Doe",
      "denial_date": "2026-03-10",
      "appeal_deadline": "2026-04-09",
      "carc_codes": ["CO-50"],
      "ai_action": "Gather clinical notes and appeal medical necessity",
      "ai_confidence": 0.85
    }
  ],
  "terminal": []
}
```

---

### Feature Tier 4: Appeal Lifecycle

#### SM Appeal DocType

Created manually by biller when initiating an appeal. Triggers `denied` → `in_appeal` state transition on creation.

| Field | Type | Purpose | Source |
|-------|------|---------|--------|
| `claim` | Link (SM Claim) | Parent claim | Biller selection |
| `denial` | Link (SM Denial) | Related denial event | Biller selection |
| `appeal_level` | Select (1/2) | Appeal level (first or second) | Biller sets |
| `submitted_date` | Date | Date appeal submitted to payer | Biller enters |
| `payer_deadline` | Date | Payer appeal deadline | From SM Denial `appeal_deadline` |
| `days_until_deadline` | Int | Computed days remaining | Calculated field |
| `appeal_letter` | Long Text | AI-generated appeal letter | AWS Bedrock (biller reviews and edits) |
| `supporting_docs` | Attach Multiple | Clinical notes, auth letters, etc. | Biller uploads |
| `result` | Select | `won`, `lost`, `pending` | Biller or System |
| `result_date` | Date | Date appeal result received | Biller or System |
| `result_notes` | Small Text | Details of appeal outcome | Biller enters |

#### Appeal Letter Generation

**Function:** Generate appeal letters using AWS Bedrock AI.

**Trigger:** SM Appeal creation (automatic).

**Process:**
1. SM Appeal record created by biller
2. System sends denial CARC/RARC codes, payer name, CPT codes, and service date to AWS Bedrock
3. Bedrock generates appeal letter text
4. System populates `appeal_letter` field
5. **Biller reviews, edits, and approves letter before submission**
6. Letter is never auto-submitted to payer

**Biller workflow:**
1. Create SM Appeal record
2. Review AI-generated appeal letter
3. Edit letter as needed (add specific clinical details, modify tone)
4. Upload supporting documentation
5. Submit appeal manually to payer portal (outside system)
6. Update `submitted_date` field

#### Appeal State Transitions

**Manual transitions (require biller action):**

| Transition | Who initiates | How |
|-----------|--------------|-----|
| `denied` → `in_appeal` | Biller | Create SM Appeal record (automatic trigger) |
| `in_appeal` → `appeal_won` | Biller | Update SM Appeal `result = "won"` |
| `in_appeal` → `appeal_lost` | Biller | Update SM Appeal `result = "lost"` |
| `appeal_lost` → `in_appeal` | Biller | Create new SM Appeal at `appeal_level = 2` |

**System transitions:**

| Transition | Trigger | What happens |
|-----------|---------|--------------|
| `appeal_won` → `adjudicating` | Biller sets `result = "won"` | Claim awaits payment ERA |
| `appeal_lost` → `written_off` | Supervisor approves write-off | Requires reason code and supervisor authorization |

**Second-level appeal workflow:**
1. First appeal results in `appeal_lost`
2. Biller reviews denial and determines second-level appeal is warranted
3. Biller creates new SM Appeal record with `appeal_level = 2`
4. System executes `appeal_lost` → `in_appeal` transition
5. New appeal letter generated for second-level arguments
6. Process repeats

**Write-off gate after appeal_lost:**
1. Claim in `appeal_lost` state
2. Biller determines no further appeal is viable
3. Biller initiates write-off request
4. **Supervisor must approve** — requires login and reason code
5. System executes `appeal_lost` → `written_off` transition
6. `write_off_approved_by` field populated