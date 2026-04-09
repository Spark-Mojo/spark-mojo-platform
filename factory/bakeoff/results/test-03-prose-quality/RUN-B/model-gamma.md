model: model-gamma
test: 03-prose-quality
run: B
date: 2026-04-09

```markdown
# Healthcare Billing Mojo — Internal Playbook

**Audience:** Spark Mojo Admins, Practice Billing Managers, Billing Coordinators
**Version:** 1.0
**Last Updated:** April 9, 2026
**Platform Capability:** Healthcare Billing Mojo (insurance claims, clearinghouse, ERA, denials, appeals)
**Clearinghouse:** Stedi (exclusive — all clients use Stedi upon onboarding)
**Vertical Scope:** Healthcare-wide; configured per vertical template. Behavioral health is the first vertical.

---

## 1. Overview

The Healthcare Billing Mojo manages the end-to-end insurance billing lifecycle — from eligibility verification before a patient's first visit through final payment posting. It is a workflow-driven system built on a 19-state machine that enforces every claim transition through a controlled Python controller. Staff do not log into clearinghouse portals, manually check claim status, or look up denial codes in PDF manuals. The Healthcare Billing Mojo submits claims to Stedi, receives and processes EDI acknowledgments and remittances, flags denials, and routes every claim to the correct next action automatically.

This playbook documents every workflow, state, field, and endpoint that powers the system. It assumes familiarity with professional claims billing (837P) and standard healthcare revenue cycle operations. Platform-specific terminology, actual state names, and real data model fields are used throughout.

**Important naming discipline:** This capability is always referred to as **Healthcare Billing Mojo**. It is distinct from:
- **Billing and Payments (CORE)** — client invoicing and Stripe payment collection
- **Platform Billing Mojo (ADMIN)** — practice subscriptions and MRR for Spark Mojo

---

## 2. Who Uses This and How

| Role | Responsibilities | Primary Actions in the Healthcare Billing Mojo |
|------|-----------------|------------------------------------------------|
| **Biller** | Daily claim management, denial resolution, appeal initiation | Reviews denial worklist, corrects and resubmits denied claims, creates appeals, reviews AI-generated appeal letters, places claims on hold |
| **Billing Supervisor** | Financial approvals, compliance oversight, escalated cases | Approves write-offs, authorizes claim reopens from `paid` status, reviews denial analytics |
| **Billing Coordinator** | Administrative corrections, claim routing oversight | Voids claims (irreversible), reviews aging reports, monitors appeal deadlines, oversees AR dashboard |
| **Spark Mojo Admin** | System configuration, troubleshooting, onboarding support | Configures payer enrollment, reviews SM Claim State Log, validates EDI webhook health, manages client configurations (NPI, fee schedule, human-review flag) |

---

## 3. Detailed Function Reference (by Feature Tier)

### 3.1 Feature 1 — Claim State Machine Core

The 19-state model is the foundation. Every SM Claim carries a `canonical_state` field. All transitions are enforced by the `VALID_TRANSITIONS` dictionary in the `sm_claim.py` controller. Any transition outside the allowed paths is rejected with a validation error.

#### The 19 States

| State | Display Label | Category | Typical Trigger |
|-------|--------------|----------|-----------------|
| `draft` | Draft | Pre-submission | System (from encounter) or manual entry by Biller |
| `pending_info` | Pending Info | Pre-submission | Scrubber detects missing patient or eligibility data |
| `pending_auth` | Pending Auth | Pre-submission | Scrubber detects no valid authorization on file (behavioral health only when `session_count_auth_enabled: true`) |
| `validated` | Ready | Pre-submission | Scrubber passes all checks |
| `held` | On Hold | Pre-submission | Biller manually places hold |
| `submitted` | Submitted | Submission | Stedi accepts the 837P file |
| `rejected` | Rejected | Submission | Stedi 277CA R3/A3 webhook response |
| `adjudicating` | In Process | Adjudication | Stedi 277CA A1/A2 webhook response |
| `paid` | Paid | Post-adjudication | 835 ERA auto-post, full payment |
| `partial_paid` | Partial Pay | Post-adjudication | 835 ERA auto-post, partial payment |
| `denied` | Denied | Post-adjudication | 835 ERA, zero payment with denial CARCs |
| `in_appeal` | In Appeal | Appeal | Biller manually creates appeal |
| `appeal_won` | Appeal Won | Appeal | Biller or system records win after reversal |
| `appeal_lost` | Appeal Lost | Appeal | Biller or system records loss |
| `pending_secondary` | Secondary | Multi-payer | Primary ERA with PR balance + secondary payer on file |
| `patient_balance` | Patient Owes | Patient | All payer adjudication complete, balance remains |
| `written_off` | Written Off | Terminal | Supervisor approves with mandatory reason code |
| `closed` | Closed | Terminal | All balances zero |
| `voided` | Voided | Terminal | Billing Coordinator intentional action (irreversible) |

#### Transitions Requiring Human Action

| Transition | Required Role | Notes |
|-----------|--------------|-------|
| Any → `in_appeal` | Biller | Requires clinical documentation review and conscious decision to appeal |
| Any → `written_off` | Supervisor | Financial write-off requires authorization and mandatory reason code |
| Any → `voided` | Billing Coordinator | Irreversible administrative action |
| `denied` → `draft` (resubmit) | Biller | Must verify corrections before resubmission |
| `paid` → `draft`/`validated` (reopen) | Supervisor | Compliance implications; reason code mandatory |

#### SM Claim — Key Fields

| Field | Type | Purpose |
|-------|------|---------|
| `canonical_state` | Select (19 options) | Current state of the claim |
| `state_changed_at` | Datetime | Timestamp of the last state transition |
| `state_changed_by` | Data | User ID or system process identifier |
| `previous_state` | Data | State immediately before the last transition |
| `state_change_reason` | Small Text | Reason code for manual transitions; mandatory when a human triggers the transition |
| `is_overdue` | Check | Set by scheduler when the claim exceeds the expected payer timeline |
| `hold_reason` | Small Text | Required when `canonical_state` = `held` |
| `secondary_payer` | Link (SM Payer) | Secondary payer if applicable |
| `patient_balance_amount` | Currency | Outstanding patient balance after all adjudication |
| `write_off_amount` | Currency | Amount written off in terminal adjustment |
| `write_off_approved_by` | Data | Supervisor user ID who approved the write-off |

#### SM Claim State Log — New DocType

One record per state transition. Loaded separately (not a child table) to preserve query performance.

| Field | Type | Purpose |
|-------|------|---------|
| `claim` | Link (SM Claim) | Parent claim |
| `from_state` | Data | State before transition |
| `to_state` | Data | State after transition |
| `changed_at` | Datetime | Timestamp of the transition |
| `changed_by` | Data | User ID or system process identifier |
| `trigger_type` | Select | `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler` |
| `trigger_reference` | Data | ERA name, webhook transaction ID, or other external reference |
| `reason` | Small Text | Human-readable reason; mandatory for manual transitions |
| `paid_amount_at_change` | Currency | Financial snapshot at the moment of transition |
| `adjustment_amount_at_change` | Currency | Financial snapshot at the moment of transition |
| `patient_responsibility_at_change` | Currency | Financial snapshot at the moment of transition |

---

### 3.2 Feature 2 — Automated EDI Transitions

Claims move automatically based on incoming EDI transactions from Stedi. No human involvement. Speed is determined by the clearinghouse, not by a billing coordinator checking a portal.

#### 277CA Claim Acknowledgment Webhook

| Event | Stedi Category | State Transition | SM Claim State Log |
|-------|---------------|-----------------|-------------------|
| Claim accepted for processing | A1/A2 | `submitted` → `adjudicating` | `trigger_type: webhook_277ca`, `trigger_reference` contains 277CA transaction ID |
| Claim rejected (errors) | R3/A3 | `submitted` → `rejected` | `trigger_type: webhook_277ca`, `trigger_reference` contains 277CA transaction ID |

The webhook handler (BILL-011) parses the incoming 277CA from the Stedi API and updates state atomically. Edge cases (A0 forward, E0 payer error, A4 not found) are handled and logged.

**Automated.** No manual action required.

#### 835 ERA Processing Webhook

Existing ERA processing (BILL-004) is wired into the state machine. The whitelisted Frappe method uses `for_update=True` for concurrency control.

| Event | Payment Condition | State Transition | SM Claim State Log |
|-------|------------------|-----------------|-------------------|
| Full payment posted | Paid amount = billed amount | `adjudicating` → `paid` | `trigger_type: webhook_835`, financial snapshot recorded |
| Partial payment posted | Paid amount < billed amount, COB/PR balance exists | `adjudicating` → `partial_paid` | `trigger_type: webhook_835`, financial snapshot recorded |
| Zero payment with denials | Denied amount with CARC codes | `adjudicating` → `denied` | `trigger_type: webhook_835`, triggers SM Denial creation (Feature 3) |

If the primary ERA shows a patient responsibility balance and a secondary payer is on file, the system transitions to `pending_secondary`. When all payer adjudication is complete and a balance remains, the claim moves to `patient_balance`.

**Automated.** No manual action required for state transitions. Human review is required for partial paid exceptions and denied claims.

---

### 3.3 Feature 3 — Denial Management

Every denial gets a structured record. Every record gets AI classification. Billing coordinators work from a prioritized queue sorted by appeal deadline.

#### SM Denial DocType

Created automatically on the `adjudicating` → `denied` transition. A single claim can accumulate multiple SM Denial records across its lifecycle.

| Field | Type | Purpose |
|-------|------|---------|
| `claim` | Link (SM Claim) | Parent claim |
| `denial_date` | Date | Date the denial was received via ERA (webhook_835) |
| CARC codes | Table | Contract Adjustment Reason Codes from the 835 REM segment |
| RARC codes | Table | Remittance Advice Remark Codes |
| `denial_reason_summary` | Text | Human-readable summary of the denial |
| `appeal_deadline` | Date | Computed from the payer appeal window |
| `ai_category` | Select | `correctable`, `appealable`, `terminal` — populated by AWS Bedrock classification |
| `ai_appealable` | Check | `true` if AI determines the denial can be appealed |
| `ai_action` | Small Text | AI-recommended next step (e.g., "Add modifier 95", "Resubmit with corrected POS") |
| `ai_confidence` | Float | AI confidence score (0.0–1.0) |

#### AI Denial Classification (BILL-014)

Triggered automatically on SM Denial creation. Sends the denial's CARC codes, RARC codes, payer information, and CPT code combination to AWS Bedrock for classification. The response populates `ai_category`, `ai_appealable`, `ai_action`, and `ai_confidence`.

**Automated classification only.** No automatic state change. The Biller reviews the AI output and decides the next action.

#### Denial Worklist

Endpoint: `/api/modules/billing/denials/worklist`

Returns open denials grouped by `ai_category` in priority order:
1. **Correctable** first (data-entry errors, missing modifiers)
2. **Appealable** second (medical necessity disputes, clinical documentation requests)
3. **Terminal** last (non-covered services, timely filing expired)

Within each group, denials are sorted `appeal_deadline` ascending (most urgent first).

**Filters:** `payer`, `date_range`, `ai_category`

**Manual.** The Biller uses the worklist to select denials for correction or appeal.

---

### 3.4 Feature 4 — Appeal Lifecycle

A structured, deadline-tracked workflow for appealing denied claims. AI-generated appeal letters. Full state transitions from denial through appeal result.

#### SM Appeal DocType

Created manually by the Biller after reviewing the SM Denial. Creating an appeal triggers `denied` → `in_appeal`.

| Field | Type | Purpose |
|-------|------|---------|
| `claim` | Link (SM Claim) | Parent claim |
| `denial` | Link (SM Denial) | Parent denial record |
| `appeal_level` | Select | `1` (first-level) or `2` (second-level) |
| `submitted_date` | Date | Date the appeal was submitted to the payer |
| `payer_deadline` | Date | Payer's deadline for adjudicating the appeal |
| `days_until_deadline` | Int | Computed field; drives escalation alerts |
| `appeal_letter` | Long Text | AI-generated letter text; Biller reviews and edits before submission |
| `supporting_docs` | Attach Multiple | Clinician notes, authorization letters, medical records |
| `result` | Select | `won`, `lost`, `pending` |
| `result_date` | Date | Date the appeal result was received |
| `result_notes` | Small Text | Notes on the appeal outcome |

#### Appeal Letter Generation (BILL-017)

Triggered on SM Appeal creation. AWS Bedrock generates the appeal letter from:
- SM Denial CARC/RARC codes
- Payer name
- CPT codes
- Date of service

The letter populates the `appeal_letter` field. **The letter is never auto-submitted.** The Biller reviews, edits, approves, and manually submits to the payer portal.

**Automated generation, manual review and submission.**

#### Appeal State Transitions

| Transition | Trigger | Result |
|-----------|---------|--------|
| `denied` → `in_appeal` | Biller creates SM Appeal | Claim moves to appeal workflow |
| `in_appeal` → `appeal_won` | Biller or system (reversal ERA received) | Claim transitions back to `adjudicating` to await payment ERA |
| `in_appeal` → `appeal_lost` | Biller records loss or system detects payer denial | Biller decides: second-level appeal or write-off |
| `appeal_lost` → `in_appeal` | Biller creates second-level SM Appeal (`appeal_level: 2`) | New SM Appeal DocType created, linked to same claim |
| `appeal_lost` → `written_off` | Supervisor approves with reason code | Claim moves to terminal state; write-off amount recorded |

---

### 3.5 Feature 5 — AR Dashboard Data Layer

Abstraction layer endpoints that power the billing coordinator's daily accounts receivable view.

| Endpoint | Purpose | Key Outputs |
|----------|---------|-------------|
| `/api/modules/billing/ar/summary` | AR overview | Total claims by state, total billed, total paid, total denied, total in appeal, total patient balance, total written off |
| `/api/modules/billing/ar/aging` | Aging analysis | Claims bucketed by days in current state: 0–30, 31–60, 61–90, 90+. Broken down by payer. Flags `is_overdue` claims. |
| `/api/modules/billing/ar/denials` | Denial analytics | Denial rate by payer (mo/mo), denial rate by CPT code, top 10 CARC codes, average days from denial to resolution by `ai_category` |

**Manual.** Endpoints are consumed by React UI and administrative reports. Spark Mojo Admins can call endpoints directly for troubleshooting.

---

## 4. Operational Scenarios

Below are step-by-step procedures for common operational workflows. Each procedure identifies the role, the states involved, and the fields that are populated during execution.

### Scenario 1: How to Handle a CO-45 Denial Using the Denial Worklist

**Role:** Biller  
**States:** `denied` → `draft` → `validated` → `submitted` → `adjudicating` → `paid`/`partial_paid`/`denied`  
**Manual/Automated:** Manual review and correction; automated state transitions

1. Open the denial worklist: navigate to `/api/modules/billing/denials/worklist`.
2. Locate the denial with `ai_category: correctable`. CO-45 (charges exceed fee schedule/compelling arrangements) typically appears here.
3. Open the SM Denial record. Review the CARC codes table for CO-45. Note the `ai_action` and `ai_confidence` fields for AI-recommended guidance.
4. From the SM Denial, navigate to the parent SM Claim. Verify `canonical_state` is `denied`.
5. Click **Correct and Resubmit**. The Biller must change `canonical_state` from `denied` → `draft`. The `state_change_reason` field is mandatory — enter something like "CO-45 correction: updated fee schedule rate, removed non-covered modifier."
6. In `draft` state, edit the claim line items as needed (adjust billed amount, correct modifiers, update POS).
7. Save the claim. The scrubber re-runs. If all checks pass, `canonical_state` transitions to `validated`.
8. The system automatically submits the corrected 837P to Stedi. State moves to `submitted`.
9. Await 277CA (A1/A2 → `adjudicating`) and then 835 ERA (`paid` or `partial_paid`).

### Scenario 2: How to Process a Partial Payment ERA

**Role:** System (fully automated)  
**States:** `adjudicating` → `partial_paid` → `pending_secondary` or `patient_balance`  
**Manual/Automated:** Fully automated

1. An 835 ERA arrives at the Stedi webhook.
2. BILL-012 processes the ERA. The `for_update=True` lock ensures concurrency safety if multiple ERAs arrive simultaneously.
3. The system detects that the paid amount < billed amount and a contractual adjustment + patient responsibility balance exists.
4. State transitions from `adjudicating` to `partial_paid`.
5. SM Claim State Log records the transition:
   - `trigger_type: webhook_835`
   - `paid_amount_at_change` = ERA payment amount
   - `adjustment_amount_at_change` = contractual adjustment
   - `patient_responsibility_at_change` = COB/PR balance
6. If the claim has a `secondary_payer` on file, state moves to `pending_secondary`. The secondary claim is queued for manual submission for the pilot.
7. If no secondary payer exists, state moves to `patient_balance`. The `patient_balance_amount` field is populated with the remaining COB amount.

### Scenario 3: How to Initiate a Second-Level Appeal After appeal_lost

**Role:** Biller  
**States:** `appeal_lost` → `in_appeal` (with `appeal_level: 2`)  
**Manual/Automated:** Manual creation; automated letter generation and logging

1. From an SM Claim in `appeal_lost` state, review the first-level SM Appeal record (`result: lost`).
2. Click **Create Second-Level Appeal**.
3. The system creates a new SM Appeal DocType:
   - `appeal_level: 2`
   - `claim` = same claim ID
   - `denial` = same SM Denial ID
   - `result: pending`
4. The system triggers AWS Bedrock to generate the second-level appeal letter, populating `appeal_letter`.
5. The Biller reviews and edits the letter. Attaches supporting documentation (clinical reviews, peer-to-peer notes) to `supporting_docs`.
6. The Biller records `submitted_date` and the claim state transitions from `appeal_lost` → `in_appeal`.
7. `days_until_deadline` computed from the payer's second-level appeal window. This is typically shorter than the first-level window. The supervisor may need to escalate.
8. Track the `payer_deadline`. Follow up manually if no response is received by the deadline.

### Scenario 4: How to Authorize a Write-Off as a Supervisor

**Role:** Supervisor  
**States:** `adjudicating`/`partial_paid`/`denied`/`appeal_lost`/`patient_balance` → `written_off`  
**Manual/Automated:** Manual approval; mandatory reason code

1. Locate the SM Claim requiring disposition. This may come from an `appeal_lost` claim, a `patient_balance` claim past collections threshold, or a `denied` claim where the appeal deadline has expired.
2. Click **Approve Write-Off**.
3. The system requires:
   - `write_off_amount` (currency): The dollar amount to write off
   - `state_change_reason` (mandatory): Select a reason code (e.g., "Timely filing expired", "Patient bankruptcy", "Clinical appeal denied, cost exceeds collection")
4. The Supervisor's user ID populates `write_off_approved_by`.
5. `canonical_state` transitions to `written_off`.
6. SM Claim State Log records:
   - `trigger_type: manual`
   - `write_off_amount_at_change` = approved amount
7. This state is terminal. No further claim actions are permitted.

### Scenario 5: How to Handle a Stedi 277CA Rejection (R3/A3)

**Role:** System for state transition; Biller for correction  
**States:** `submitted` → `rejected` → `draft` → `validated` → `submitted`  
**Manual/Automated:** Automated rejection; manual correction

1. Stedi returns a 277CA with R3 (rejected) or A3 (rejected, front-end edits failed) category code.
2. BILL-011 parses the 277CA. State transitions `submitted` → `rejected`.
3. SM Claim State Log records `trigger_type: webhook_277ca`, `trigger_reference` contains the 277CA transaction ID, and `reason` contains the rejection reason codes from Stedi.
4. The Biller receives an alert or reviews the rejection queue.
5. Open the SM Claim in `rejected` state. Review the rejection reason.
6. Click **Correct and Resubmit**. The Biller changes `canonical_state` to `draft` and provides a `state_change_reason` (e.g., "R3 rejection: corrected NPI typo").
7. Correct the errors in the claim fields (NPI, patient DOB, eligibility data, etc.).
8. Save. The scrubber re-runs. On success, state moves to `validated` → `submitted` automatically.

### Scenario 6: How to Place a Claim on Hold and Resume Submission

**Role:** Biller  
**States:** `validated` → `held` → `validated`  
**Manual/Automated:** Fully manual

1. Open an SM Claim in `validated` state.
2. Click **Place on Hold**.
3. The system requires `hold_reason` (mandatory). Enter the reason (e.g., "Pending additional documentation from primary care", "Patient insurance change in progress").
4. `canonical_state` transitions to `held`. `state_changed_by` = Biller's user ID. `state_change_reason` records the hold reason.
5. The claim is excluded from the submission batch and does not appear in the daily submission queue.
6. To resume: open the SM Claim, review the `hold_reason`, update claim fields if needed, and click **Remove Hold**.
7. The system transitions from `held` → `validated` and the claim is queued for the next submission cycle to Stedi.

### Scenario 7: How to Handle a COB Situation with Primary and Secondary Payers

**Role:** System (automated transitions); Biller (manual secondary submission for pilot)  
**States:** `adjudicating` → `partial_paid` → `pending_secondary` → `patient_balance`  
**Manual/Automated:** Automated for primary; manual for secondary (pilot)

1. Primary payer ERA arrives. The system detects `paid_amount < billed_amount` with a COB balance remaining.
2. State transitions `adjudicating` → `partial_paid`.
3. The system detects `secondary_payer` is populated on the claim. State moves to `pending_secondary`.
4. The Biller prepares the secondary 837P manually (auto-submission is EXTENSION-ROADMAP).
   - Pre-populate COB data from the primary ERA (paid amount, adjustment amount, patient responsibility).
5. Submit the secondary claim to Stedi. State transitions `pending_secondary` → `submitted` → `adjudicating` (277CA A1/A2).
6. Secondary ERA arrives. State moves to `paid` (secondary paid remaining COB) or `partial_paid` (additional balance) or `patient_balance` (final balance remains).

### Scenario 8: How to Reopen a Paid Claim for Compliance Correction

**Role:** Supervisor  
**States:** `paid` → reopened (`draft`/`validated`/`submitted` depending on correction)  
**Manual/Automated:** Manual with supervisor approval; mandatory reason code

1. Open an SM Claim in `paid` state. Identify the compliance or billing correction needed (e.g., wrong CPT code billed, duplicate charge discovered).
2. Click **Reopen Claim**.
3. The system requires `state_change_reason` (mandatory). Enter a compliance-compliant reason (e.g., "CPT 90837 billed, should be 90834 per documentation review").
4. The Supervisor's authorization is recorded in SM Claim State Log.
5. State transitions from `paid` to `draft` (or directly to `validated` if only a financial adjustment).
6. The original payment is reversed or adjusted per the practice's accounting workflow (outside the current spec scope).
7. Correct the claim, re-submit, and follow the standard submission workflow through `adjudicating` → new ERA.

### Scenario 9: How to Void a Claim Permanently

**Role:** Billing Coordinator  
**States:** Any → `voided`  
**Manual/Automated:** Manual; irreversible

1. Open any SM Claim (regardless of current state).
2. Select **Void Claim**.
3. The system displays a warning: "This action is irreversible. The claim will be removed from all active workflows and AR reports."
4. The Billing Coordinator confirms the action and enters a `state_change_reason` (mandatory, e.g., "Duplicate claim created in error; original claim was correct and paid").
5. `canonical_state` transitions to `voided`.
6. SM Claim State Log records `trigger_type: manual`, `changed_by` = Billing Coordinator user ID.
7. The claim is excluded from all AR dashboards, aging reports, and submission batches. **This action cannot be undone.**

### Scenario 10: How to Monitor and Escalate Overdue Claims

**Role:** Billing Supervisor, Billing Coordinator  
**States:** Any active state → `is_overdue: true` (flagged by scheduler)  
**Manual/Automated:** Automated flagging; manual escalation

1. The scheduler runs periodically and evaluates each claim against its expected payer timeline.
2. If a claim has exceeded its expected timeline, `is_overdue` = `true` is set on the SM Claim.
3. The Aging report endpoint `/api/modules/billing/ar/aging` flags `is_overdue` claims in red.
4. The Supervisor reviews overdue claims. For claims in `adjudicating` (beyond expected remit date), the supervisor may:
   - Initiate a 276 claim status inquiry (EXTENSION-ROADMAP; manual for pilot)
   - Contact the payer directly
   - Move the claim to `held` with `hold_reason: "Payer follow-up initiated"`
5. Claims in `in_appeal` that exceed the `payer_deadline` should be flagged for immediate escalation. The supervisor contacts the payer's provider relations department.
6. Update `is_overdue` = `false` when the payer remits or responds.

---

## 5. Troubleshooting

This section covers common error states, unexpected transitions, and how to diagnose them using SM Claim State Log and backend logs.

### 5.1 State Transition Rejected: "Invalid transition from X to Y"

| Symptom | Cause | Resolution |
|---------|-------|------------|
| UI error: "Invalid transition" when attempting to move a claim | The transition is not in `VALID_TRANSITIONS` in `sm_claim.py`. The system enforces state machine rules at the controller level. | Review the target state. Ensure the claim is in the correct source state. Refer to the transition table in Section 3.1. If a new business rule requires a transition not in `VALID_TRANSITIONS`, submit a platform enhancement request — do not bypass the controller. |

### 5.2 Stuck in pending_info

| Symptom | Cause | Resolution |
|---------|-------|------------|
| A claim remains in `pending_info` for multiple days | The scrubber detected missing patient data (DOB, address, insurance ID) or missing eligibility data. | Open the SM Claim. Review the patient demographic section. Upload or update the missing insurance card data. Re-run eligibility (BILL-005). If data is correct, the scrubber will re-evaluate and transition to `validated`. Check SM Claim State Log to confirm the `pending_info` trigger reason. |

### 5.3 Stuck in pending_auth (Behavioral Health Only)

| Symptom | Cause | Resolution |
|---------|-------|------------|
| A behavioral health claim remains in `pending_auth` | The scrubber detected no valid authorization on file for the CPT code and service date. `session_count_auth_enabled: true` is active for this vertical. | Verify authorization records in the clinical data layer (Medplum). Ensure the authorization has remaining sessions and covers the date of service. If authorization exists but is not linked, update the SM Claim's authorization field. If no authorization exists, contact the payer to obtain one before proceeding. |

### 5.4 Webhook Failure: 277CA or 835 Not Processing

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Claims remain in `submitted` or `adjudicating` despite expected EDI response from Stedi | Webhook delivery failure, webhook handler error, or Stedi API outage | 1. Check server logs for BILL-011 (277CA) or BILL-012 (835) webhook errors. 2. Verify the Stedi API is delivering responses (Stedi portal or API health check). 3. If the webhook payload is malformed, the system logs the error and retries. 4. If the webhook is not received at all, escalate to Spark Mojo Admins to verify the webhook endpoint registration. 5. As a last resort, manually retrigger EDI processing from Stedi. |

### 5.5 Duplicate SM Denial Records on a Single Claim

| Symptom | Cause | Resolution |
|---------|-------|------------|
| Multiple SM Denial DocTypes exist for a single claim | Multiple denial events across the claim's lifecycle (e.g., primary denial, correction denial, secondary denial). | This is expected behavior by design. Each denial event creates its own SM Denial. Review each record's `denial_date` and `ai_category` to determine which denial to act on first. The most recent denial typically supersedes prior ones. |

### 5.6 AI Classification with Low Confidence

| Symptom | Cause | Resolution |
|---------|-------|------------|
| `ai_confidence` < 0.5 on an SM Denial record | AWS Bedrock returned low confidence on the denial classification, possibly due to insufficient CARC/RARC data or an atypical payer-CPT combination. | Review the denial manually. Use the `ai_action` as a suggestion only. Apply your own clinical/revenue cycle judgment. Override `ai_category` if necessary (the field is editable). Low-confidence denials should be escalated to the Billing Supervisor for review. |

### 5.7 Appeal Letter Generation Failure

| Symptom | Cause | Resolution |
|---------|-------|------------|
| SM Appeal `appeal_letter` field is empty or contains an error text | AWS Bedrock timeout, API rate limit, or missing required input fields | 1. Verify AWS Bedrock is operational (AWS Console, DECISION-027 BAA coverage). 2. Check that the SM Denial input data (CARC/RARC, payer name, CPT codes, service date) is complete. 3. Manually regenerate the letter by clicking "Regenerate Appeal Letter". 4. If Bedrock is down, draft the letter manually and submit to the payer portal per the EXTENSION-ROADMAP manual submission process. |

---

## 6. FAQ

### General Platform Questions

**Q1: What is the difference between Healthcare Billing Mojo and Billing and Payments (CORE)?**  
A1: Healthcare Billing Mojo handles insurance claims, clearinghouse EDI (837P/835/277CA), denials, and appeals. Billing and Payments (CORE) handles client invoicing, out-of-pocket payment collection, and Stripe processing. They are entirely separate capabilities.

**Q2: What is the clearinghouse used by Healthcare Billing Mojo?**  
A2: Stedi. All practices switch to Stedi during Spark Mojo onboarding. There is no multi-clearinghouse support.

**Q3: Can I use Healthcare Billing Mojo if my practice has a contractual obligation to a different clearinghouse?**  
A3: No. This is a conscious scope boundary. Practices with contractual clearinghouse obligations cannot use this capability. See DEFICIENCIES.md.

**Q4: Is this Mojo only for behavioral health?**  
A4: No. Healthcare Billing Mojo is healthcare-wide. The 19-state machine, EDI pipeline, and denial engine are standard for 837P fee-for-service billing. Behavioral health is the first vertical; the `pending_auth` logic with `session_count_auth_enabled` is the only behavioral-health-specific code path.

**Q5: Can practices self-configure the Healthcare Billing Mojo settings?**  
A5: Spark Mojo staff configure instances during onboarding via the Configuration Mojo. Practices can edit their client config (payer enrollment, NPI, fee schedule, human-review flag) after onboarding, but the vertical template is managed by Spark Mojo.

---

### State Machine and Workflow Questions

**Q6: What are the 19 valid states for SM Claim?**  
A6: `draft`, `pending_info`, `pending_auth`, `validated`, `held`, `submitted`, `rejected`, `adjudicating`, `paid`, `partial_paid`, `denied`, `in_appeal`, `appeal_won`, `appeal_lost`, `pending_secondary`, `patient_balance`, `written_off`, `closed`, `voided`.

**Q7: Can I manually move a claim from `adjudicating` to `denied`?**  
A7: No. That transition is automated only (triggered by 835 ERA with zero payment and CARC codes). Manual transitions are restricted by `VALID_TRANSITIONS`.

**Q8: What trigger types are recorded in SM Claim State Log?**  
A8: `manual` (human action), `webhook_277ca` (Stedi 277CA response), `webhook_835` (ERA remittance), `api` (external system), `scheduler` (automated background jobs like overdue flagging).

**Q9: Why did a claim go from draft to pending_info automatically?**  
A9: The scrubber detected missing patient demographic or eligibility data. The system prevents submission until required data is provided. Fix the data and the scrubber will re-evaluate.

**Q10: What does the `held` state mean and when should I use it?**  
A10: `held` is a manual hold placed by the Biller when a claim should not be submitted (e.g., awaiting clinical documentation, payer communication in progress, or practice policy requires manual review). `hold_reason` is mandatory.

**Q11: Is `voided` reversible?**  
A11: No. Voiding is a terminal state requiring a Billing Coordinator role. Once a claim is `voided`, it is excluded from all active workflows and AR reports.

**Q12: Who can approve a write-off?**  
A12: A supervisor. Write-off requires mandatory `state_change_reason` and `write_off_approved_by`. The amount is recorded in `write_off_amount`.

---

### Denial and Appeal Questions

**Q13: How are SM Denial records created?**  
A13: Automatically. Every `adjudicating` → `denied` transition via the 835 webhook creates an SM Denial DocType with CARC/RARC codes. A single claim may have multiple SM Denial records across its lifecycle.

**Q14: Does the AI automatically change the claim state based on denial classification?**  
A14: No. AI classification (`ai_category`, `ai_appealable`, `ai_action`, `ai_confidence`) is advisory only. The Biller reviews the output and manually decides the next action (correction, appeal, or write-off).

**Q15: How are denials prioritized in the worklist?**  
A15: Grouped by `ai_category` (correctable first, appealable second, terminal third), then sorted within each group by `appeal_deadline` ascending.

**Q16: Can I create a second-level appeal after an appeal is lost?**  
A16: Yes. From `appeal_lost`, create a new SM Appeal DocType with `appeal_level: 2`. This creates a linked appeal and transitions the claim to `in_appeal`.

**Q17: Is the appeal letter submitted to the payer automatically?**  
A17: No. The AI generates the letter and populates the `appeal_letter` field. The Biller must review, edit, approve, and manually submit it to the payer portal.

---

### Operational and Admin Questions

**Q18: How do I check why a claim was rejected by Stedi?**  
A18: Open the SM Claim State Log for that claim. Find the record where `to_state = rejected`. The `trigger_type` will be `webhook_277ca` and the `reason` field contains the Stedi rejection codes. Cross-reference with the 277CA specification for details.

**Q19: What endpoint do I use to pull denial analytics for reporting?**  
A19: `/api/modules/billing/ar/denials` (BILL-021). Returns denial rate by payer, denial rate by CPT code, top 10 CARC codes, and average days to resolution by `ai_category`.

**Q20: How are claims that exceed the expected payer timeline flagged?**  
A20: The scheduler evaluates each active claim against payer-specific expected timelines. When a claim exceeds its expected timeline, `is_overdue` is set to `true`. This is recorded in the SM Claim State Log with `trigger_type: scheduler`.

**Q21: What happens to a claim after it's fully paid with zero balance?**  
A21: State transitions to `closed`. The claim is terminal and excluded from active AR reports. Financial snapshots at the time of closure are preserved in the final SM Claim State Log entry.

**Q22: How do I configure session-count authorization for a behavioral health practice?**  
A22: This is configured in the vertical template (`behavioral_health.yaml`) with `session_count_auth_enabled: true`. It is set during provisioning. Practice admins cannot toggle this themselves. Contact Spark Mojo Admins to verify the vertical template.

**Q23: What should I do if the Human Review Before Submission flag is enabled for my practice?**  
A23: Claims will land in `validated` and remain there until the Biller manually reviews and approves submission. This is configured during onboarding. The Biller reviews each claim, confirms scrubber accuracy, and triggers submission. State moves from `validated` → `submitted` upon approval.

**Q24: Can I export SM Claim State Log data for audit purposes?**  
A24: Yes. The SM Claim State Log is a standalone DocType with indexes on `(claim)`, `(claim, changed_at)`, and `(to_state, changed_at)`. This supports standard Frappe export and API query patterns for compliance audits.

**Q25: What happens if two ERAs arrive for the same claim simultaneously?**  
A25: The whitelist Frappe method uses `for_update=True` (row-level lock). The first ERA processes atomically. The second ERA is processed after the lock releases. This prevents duplicate payment posting or state corruption.

---

## Appendix A — Quick Reference: State Transition Map

```
draft ──────────────────────→ pending_info ──────────────────────→ validated
                              │                                      │
                              └──── pending_auth ────────────────────┘
                                                                       │
                                                                       ↓
held ←───────────────────── validated ←──────── denied ←──── adjudicating
  │                           ↑                 ↑            │
  └──── validated ────── approved correction    │            ├─ 277CA A1/A2 → adjudicating
                                               │            ├─ 277CA R3/A3 → rejected
                                               ↓            │
                                        appeal_lost ← in_appeal ──→ appeal_won
                                               │                  │        │
                                               └─── written_off ←─┘        └───→ adjudicating (await ERA)
                                                              ↓
                                                           closed/voided
```

## Appendix B — Endpoint Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/modules/billing/denials/worklist` | GET | Authenticated | Returns denial worklist grouped by `ai_category`, sorted by `appeal_deadline` |
| `/api/modules/billing/ar/summary` | GET | Authenticated | Returns total claims by state, total billed/paid/denied, AR summary |
| `/api/modules/billing/ar/aging` | GET | Authenticated | Returns claims bucketed by aging (0–30, 31–60, 61–90, 90+), flags `is_overdue` |
| `/api/modules/billing/ar/denials` | GET | Authenticated | Returns denial analytics by payer, CPT, CARC, and resolution time |

---

*This playbook is the operational source of truth for Healthcare Billing Mojo. For unresolved edge cases, platform architecture questions, or spec-level changes, consult the master BILLING.md specification. For technical support and webhook health verification, contact the Spark Mojo Admin team.*
```