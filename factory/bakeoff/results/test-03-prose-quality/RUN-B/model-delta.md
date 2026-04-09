model: model-delta
test: 03-prose-quality
run: B
date: 2026-04-09

# Healthcare Billing Mojo — Internal Operations Playbook

**Document:** INTERNAL-PLAYBOOK.md
**Capability:** Healthcare Billing Mojo
**Audience:** Spark Mojo Admins · Practice Billing Managers
**Status:** Internal — Not for Client Distribution
**Platform Version:** Feature set through BILL-021
**Last Updated:** April 9, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Who Uses This and How](#2-who-uses-this-and-how)
3. [Detailed Function Reference](#3-detailed-function-reference)
   - [3.1 Claim State Machine (Feature 1)](#31-claim-state-machine-feature-1)
   - [3.2 Automated EDI Transitions (Feature 2)](#32-automated-edi-transitions-feature-2)
   - [3.3 Denial Management (Feature 3)](#33-denial-management-feature-3)
   - [3.4 Appeal Lifecycle (Feature 4)](#34-appeal-lifecycle-feature-4)
   - [3.5 AR Dashboard Data Layer (Feature 5)](#35-ar-dashboard-data-layer-feature-5)
4. [Operational Scenarios](#4-operational-scenarios)
5. [Troubleshooting](#5-troubleshooting)
6. [FAQ](#6-faq)

---

## 1. Overview

The Healthcare Billing Mojo is the insurance revenue cycle management (RCM) capability built on the Spark Mojo platform. It handles the complete claim lifecycle — from eligibility verification before a patient's first visit through ERA posting, denial management, appeal resolution, and final cash reconciliation.

**The core promise:** Billing staff do not log into a clearinghouse portal to check claim status. The platform receives EDI transactions from Stedi, interprets them, and moves every claim to the correct next state automatically. Human attention is reserved for decisions that require human judgment — corrections, appeals, and write-off approvals.

### What the platform does automatically

- Moves claims from `submitted` to `adjudicating` when the clearinghouse acknowledges receipt (277CA)
- Moves claims from `adjudicating` to `paid`, `partial_paid`, or `denied` when an ERA (835) arrives
- Creates an SM Denial record and triggers AI classification on every denial event
- Populates the denial worklist, sorted by appeal deadline
- Generates AI-drafted appeal letters for biller review
- Routes claims to `patient_balance` when all payer adjudication is complete and a balance remains
- Routes claims to `pending_secondary` when a secondary payer is on file

### What always requires a human

- Moving a claim to `in_appeal`
- Approving a `written_off` transition (supervisor role required)
- Voiding a claim (`voided` is irreversible)
- Correcting and resubmitting a `rejected` or `denied` claim
- Reviewing and submitting the AI-generated appeal letter to the payer portal

### Clearinghouse

All clients use **Stedi** as their clearinghouse. There is no multi-clearinghouse support. Practices re-enroll their payers through Stedi as part of Spark Mojo onboarding. This is a known one-time friction point. There is no automation for this enrollment step in the current version.

### Naming reminder

This capability is called the **Healthcare Billing Mojo**. The platform also has **Billing and Payments** (client invoicing via Stripe) and the **Platform Billing Mojo** (practice subscriptions). These are three distinct capabilities. Use the full name to avoid confusion.

---

## 2. Who Uses This and How

### Role Map

| Role | Primary Access | Typical Daily Actions |
|---|---|---|
| **Billing Coordinator** | Denial worklist, claim queue, appeal management | Work denial worklist, initiate appeals, correct and resubmit claims, submit appeal letters to payer portal |
| **Practice Billing Manager** | All billing coordinator access + AR dashboard, denial analytics, write-off approval | Oversee aging, review denial trends, approve write-offs, escalate second-level appeals |
| **Spark Mojo Admin** | Full platform access including state log, system config, transition audit | Diagnose stuck claims, review state log for compliance, assist with edge-case transitions, manage client configuration |

### What each role can and cannot do

| Action | Billing Coordinator | Billing Manager | Spark Mojo Admin |
|---|---|---|---|
| View claim state and state log | ✅ | ✅ | ✅ |
| Place a claim on `held` | ✅ | ✅ | ✅ |
| Move `denied` → `draft` (resubmit) | ✅ | ✅ | ✅ |
| Initiate `in_appeal` | ✅ | ✅ | ✅ |
| Approve `written_off` | ❌ | ✅ | ✅ |
| Execute `voided` | ❌ | ❌ | ✅ (Billing Coordinator role required per spec) |
| View AR summary and aging endpoints | ❌ | ✅ | ✅ |
| View denial analytics | ✅ | ✅ | ✅ |
| Reopen a `paid` claim | ❌ | ✅ (supervisor) | ✅ |

> **Note for admins:** The `voided` transition is designated for the Billing Coordinator role per the state machine spec, but given its irreversible nature, admins should treat voiding as a supervised action in practice. Always confirm with the billing manager before executing.

---

## 3. Detailed Function Reference

### 3.1 Claim State Machine (Feature 1)

**Stories:** BILL-006 through BILL-010
**Trigger:** System or human, depending on transition
**Status:** Foundational — all other features depend on this

#### The SM Claim DocType

Every insurance claim in the platform is an **SM Claim** document. The `canonical_state` field is the authoritative claim status. It is the only status that matters. Any status displayed elsewhere on the platform derives from `canonical_state`.

##### Supporting fields added in BILL-006 / BILL-007

| Field | Type | Description | Set by |
|---|---|---|---|
| `canonical_state` | Select | Current claim state. One of 19 valid values. | System or human via `transition_state()` |
| `state_changed_at` | Datetime | Timestamp of the most recent state transition | System (auto on every transition) |
| `state_changed_by` | Data | User ID or system process identifier that triggered the last transition | System (auto on every transition) |
| `previous_state` | Data | The state the claim was in before the last transition. Quick reference — full history is in SM Claim State Log | System (auto on every transition) |
| `state_change_reason` | Small Text | Reason code or human explanation for the last manual transition | Required for all manual transitions |
| `is_overdue` | Check | Flagged `true` by the scheduler when the claim has exceeded the expected payer adjudication timeline | System (scheduler) |
| `hold_reason` | Small Text | Why the claim is on hold. Mandatory when `canonical_state = held` | Biller (required at time of hold) |
| `secondary_payer` | Link (SM Payer) | Secondary payer, if applicable | Biller or system |
| `patient_balance_amount` | Currency | Outstanding balance owed by the patient after all payer adjudication | System (from 835 ERA) |
| `write_off_amount` | Currency | Amount written off | System (set on `written_off` transition) |
| `write_off_approved_by` | Data | User ID of the supervisor who approved the write-off | System (captured at approval) |

#### The 19 States

Every SM Claim exists in exactly one of these states at all times. States are grouped by phase.

##### Pre-Submission States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `draft` | Draft | System (from encounter) or biller | Claim exists but has not been validated or submitted |
| `pending_info` | Pending Info | System (scrubber) | Missing required patient data or eligibility information. Claim cannot proceed until resolved |
| `pending_auth` | Pending Auth | System (scrubber) | No valid authorization on file. **Behavioral health only** (`session_count_auth_enabled: true` in vertical template) |
| `validated` | Ready | System (scrubber passes all checks) | All data present and correct. Claim is queued for submission |
| `held` | On Hold | Biller (manual) | Claim intentionally paused. `hold_reason` is required |

##### Submission States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `submitted` | Submitted | System (837P accepted by Stedi) | 837P file accepted by the clearinghouse. Awaiting 277CA acknowledgment |
| `rejected` | Rejected | System (277CA R3/A3 webhook) | Clearinghouse or payer rejected the claim before adjudication. Requires correction |

##### Adjudication States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `adjudicating` | In Process | System (277CA A1/A2 webhook) | Payer has accepted the claim and is processing it. Awaiting ERA |

##### Post-Adjudication States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `paid` | Paid | System (835 ERA, full payment) | Claim fully adjudicated and paid. Check financial snapshot in state log |
| `partial_paid` | Partial Pay | System (835 ERA, partial payment) | Payer paid less than billed. Balance may be patient responsibility, CO-45, or appealable |
| `denied` | Denied | System (835 ERA, zero payment with CARC codes) | Claim fully denied. SM Denial record auto-created. AI classification in progress |

##### Appeal States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `in_appeal` | In Appeal | Biller (manual) | Appeal filed. SM Appeal record exists. Awaiting payer decision |
| `appeal_won` | Appeal Won | Biller or System | Appeal upheld. Claim moves to `adjudicating` to await payment ERA |
| `appeal_lost` | Appeal Lost | Biller or System | Appeal denied. Options: second-level appeal or write-off |

##### Multi-Payer States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `pending_secondary` | Secondary | System (primary ERA with PR balance + secondary payer on file) | Primary payer adjudicated. Secondary payer billing required. Manual submission for pilot |

##### Patient States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `patient_balance` | Patient Owes | System (all payer adjudication complete, balance remains) | All payer adjudication complete. Balance is patient responsibility |

##### Terminal States

| State | Display Label | Trigger | What it means |
|---|---|---|---|
| `written_off` | Written Off | Supervisor (manual, approval required, reason code mandatory) | Balance written off. Financial record closed. Requires supervisor approval |
| `closed` | Closed | System (all balances zero) | All balances resolved. No further action needed |
| `voided` | Voided | Billing Coordinator (manual, irreversible) | Claim administratively voided. Cannot be reversed |

#### Valid Transitions Reference

The `VALID_TRANSITIONS` dict in `sm_claim.py` enforces every move. Any transition not in this table is rejected with a validation error. This table is the complete allowed path map.

<details>
<summary>Click to expand full VALID_TRANSITIONS table</summary>

| From State | To State | Trigger Type | Human Action Required |
|---|---|---|---|
| `draft` | `pending_info` | System (scrubber) | No |
| `draft` | `pending_auth` | System (scrubber) | No |
| `draft` | `validated` | System (scrubber) | No |
| `draft` | `held` | Manual | Yes — biller, `hold_reason` required |
| `draft` | `voided` | Manual | Yes — Billing Coordinator |
| `pending_info` | `draft` | Manual | Yes — biller, after resolving missing data |
| `pending_info` | `validated` | System (after data resolved) | No |
| `pending_info` | `held` | Manual | Yes — biller |
| `pending_auth` | `draft` | Manual | Yes — biller, after auth obtained |
| `pending_auth` | `validated` | System (auth confirmed) | No |
| `pending_auth` | `held` | Manual | Yes — biller |
| `validated` | `submitted` | System (Stedi 837P accepted) | No |
| `validated` | `held` | Manual | Yes — biller |
| `validated` | `draft` | Manual | Yes — biller, correction required |
| `held` | `draft` | Manual | Yes — biller, `hold_reason` cleared |
| `held` | `validated` | Manual | Yes — biller, after resolution |
| `held` | `voided` | Manual | Yes — Billing Coordinator |
| `submitted` | `adjudicating` | System (277CA A1/A2) | No |
| `submitted` | `rejected` | System (277CA R3/A3) | No |
| `rejected` | `draft` | Manual | Yes — biller, correction required |
| `rejected` | `voided` | Manual | Yes — Billing Coordinator |
| `adjudicating` | `paid` | System (835 ERA) | No |
| `adjudicating` | `partial_paid` | System (835 ERA) | No |
| `adjudicating` | `denied` | System (835 ERA) | No |
| `adjudicating` | `pending_secondary` | System (835 ERA + secondary payer on file) | No |
| `partial_paid` | `pending_secondary` | System | No |
| `partial_paid` | `patient_balance` | System | No |
| `partial_paid` | `in_appeal` | Manual | Yes — biller |
| `denied` | `in_appeal` | Manual | Yes — biller, SM Appeal created |
| `denied` | `draft` | Manual | Yes — biller, correction and resubmission |
| `denied` | `written_off` | Manual | Yes — supervisor, reason code mandatory |
| `in_appeal` | `appeal_won` | Manual or System | Biller or system (ERA after reversal) |
| `in_appeal` | `appeal_lost` | Manual or System | Biller or system |
| `appeal_won` | `adjudicating` | System | No — awaits ERA |
| `appeal_lost` | `in_appeal` | Manual | Yes — biller (second-level appeal, new SM Appeal at level 2) |
| `appeal_lost` | `written_off` | Manual | Yes — supervisor, reason code mandatory |
| `appeal_lost` | `patient_balance` | Manual | Yes — biller, if balance is patient responsibility |
| `pending_secondary` | `adjudicating` | System (secondary 837P submitted) | No |
| `pending_secondary` | `patient_balance` | Manual | Yes — biller, if secondary declines |
| `patient_balance` | `closed` | System (balance resolved to zero) | No |
| `patient_balance` | `written_off` | Manual | Yes — supervisor |
| `paid` | `adjudicating` | Manual | Yes — supervisor, compliance reason required |
| `written_off` | *(no outbound transitions)* | — | Terminal |
| `closed` | *(no outbound transitions)* | — | Terminal |
| `voided` | *(no outbound transitions)* | — | Terminal |

</details>

#### SM Claim State Log

Every state transition — whether system or human — creates one SM Claim State Log record. This is the complete audit trail for the claim lifecycle. It is a standalone DocType (not a child table) to avoid performance penalties as history accumulates.

##### SM Claim State Log fields

| Field | Type | Description |
|---|---|---|
| `claim` | Link (SM Claim) | The parent SM Claim |
| `from_state` | Data | State before this transition |
| `to_state` | Data | State after this transition |
| `changed_at` | Datetime | Exact timestamp of the transition |
| `changed_by` | Data | User ID or system process identifier |
| `trigger_type` | Select | One of: `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler` |
| `trigger_reference` | Data | ERA document name, 277CA transaction ID, webhook payload reference, or scheduler job ID |
| `reason` | Small Text | Human-readable reason. Mandatory for all manual transitions |
| `paid_amount_at_change` | Currency | Financial snapshot: amount paid at this moment |
| `adjustment_amount_at_change` | Currency | Financial snapshot: adjustment amount at this moment |
| `patient_responsibility_at_change` | Currency | Financial snapshot: patient responsibility at this moment |

> **Admin note:** When investigating a claim issue, always start with the State Log. Filter by `claim` to see the full transition history in `changed_at` order. The `trigger_reference` field will show you exactly which 277CA or ERA file caused each automated transition.

---

### 3.2 Automated EDI Transitions (Feature 2)

**Stories:** BILL-011, BILL-012
**Trigger:** Automated (system only — no human involvement)
**Status:** Dependent on Feature 1 complete

#### 277CA Webhook Handler (BILL-011)

When Stedi receives and processes a submitted 837P, it returns a 277CA transaction to the platform via webhook. The handler parses the 277CA and executes the appropriate transition.

##### 277CA Category Code → State Transition Map

| 277CA Category | Meaning | Resulting Transition |
|---|---|---|
| A1 | Acknowledgment / Accepted | `submitted` → `adjudicating` |
| A2 | Acknowledgment / Accepted (with amendments) | `submitted` → `adjudicating` |
| R3 | Rejected — Not Accepted | `submitted` → `rejected` |
| A3 | Rejected — Not Accepted (payer-specific) | `submitted` → `rejected` |
| A0 | Received / No further processing | No state change — logged only |
| E0 | Payer error | No state change — logged, flagged for admin review |
| A4 | Claim not found | No state change — logged, flagged for admin review |

State Log entry written on every 277CA receipt, including the no-transition codes. `trigger_type` = `webhook_277ca`. `trigger_reference` = 277CA transaction ID.

#### 835 ERA Processing (BILL-012)

When a payer remittance (835 ERA) arrives from Stedi, the platform processes it atomically using a whitelisted Frappe method with `for_update=True` (concurrency lock on the SM Claim document). This prevents race conditions if two ERA files arrive for the same claim simultaneously.

##### ERA Payment Outcome → State Transition Map

| ERA Outcome | Resulting Transition | State Log `trigger_type` |
|---|---|---|
| Full payment (billed amount = paid amount) | `adjudicating` → `paid` | `webhook_835` |
| Partial payment (paid amount > $0, < billed) | `adjudicating` → `partial_paid` | `webhook_835` |
| Zero payment with CARC denial codes | `adjudicating` → `denied` | `webhook_835` |
| Primary ERA with PR balance + secondary payer on file | `adjudicating` → `pending_secondary` | `webhook_835` |

Financial snapshot fields are written to the State Log at every ERA transition:
- `paid_amount_at_change`
- `adjustment_amount_at_change`
- `patient_responsibility_at_change`

These snapshot values reflect the ERA data at the moment of transition and serve as the audit record if the claim is later corrected or reopened.

> **Important:** ERA processing executes the state transition atomically. If the transition fails for any reason (e.g., the claim is not currently in `adjudicating`), the entire ERA post for that claim is rolled back and logged as an error. The ERA file itself is preserved. No partial posts occur.

---

### 3.3 Denial Management (Feature 3)

**Stories:** BILL-013, BILL-014, BILL-015
**Trigger:** SM Denial auto-created by system on `adjudicating` → `denied`. AI classification automated. Worklist human-driven.
**Status:** Dependent on Feature 2 complete. Requires AWS Bedrock (DECISION-027)

#### SM Denial DocType (BILL-013)

One SM Denial record is created automatically every time a claim transitions to `denied`. A claim can accumulate multiple SM Denial records across its lifecycle (e.g., denied after initial submission, denied again after a corrected resubmission).

##### SM Denial fields

| Field | Type | Description | Set by |
|---|---|---|---|
| `claim` | Link (SM Claim) | The claim this denial belongs to | System (auto on `denied` transition) |
| `denial_date` | Date | Date of the ERA denial event | System |
| `carc_codes` | Table | CARC codes from the 835 ERA (Claim Adjustment Reason Codes). Multiple codes per denial | System (from ERA) |
| `rarc_codes` | Table | RARC codes from the 835 ERA (Remittance Advice Remark Codes). Supplemental context | System (from ERA) |
| `denial_reason_summary` | Small Text | Human-readable summary of the denial reason, compiled from CARC/RARC codes | System (generated) |
| `appeal_deadline` | Date | Computed from payer-specific appeal window. Counts down from `denial_date` | System (computed) |
| `ai_category` | Select | AI classification: `correctable`, `appealable`, or `terminal` | System (Bedrock, BILL-014) |
| `ai_appealable` | Check | Boolean: does the AI recommend filing an appeal? | System (Bedrock, BILL-014) |
| `ai_action` | Small Text | AI-recommended next action in plain language | System (Bedrock, BILL-014) |
| `ai_confidence` | Float | AI confidence score for its classification (0.0–1.0) | System (Bedrock, BILL-014) |

##### AI Classification Categories

| Category | Meaning | Typical CARC examples | Recommended action |
|---|---|---|---|
| `correctable` | Denial is due to a fixable billing error | CO-4 (incorrect procedure modifier), CO-16 (missing information), CO-22 (COB issue) | Correct the claim. Move `denied` → `draft`. Resubmit. |
| `appealable` | Denial is a coverage or medical necessity dispute that can be challenged | CO-50 (not medically necessary), CO-167 (diagnosis not covered) | Initiate appeal. Move `denied` → `in_appeal`. |
| `terminal` | Denial cannot be corrected or appealed under the current payer contract | CO-45 (contractual obligation), CO-253 (benefit maximum reached) | Consider write-off. Supervisor approval required. |

> **Note on CO-45:** CO-45 (charges exceed your contractual rate) is classified `terminal` because the adjustment is a contractual obligation — you cannot bill the patient for the difference (balance billing prohibition applies in most contracts), and you cannot appeal a contractual write-down. The AI will flag this as terminal. See [Scenario 1](#scenario-1-handling-a-co-45-denial-using-the-denial-worklist) for the full procedure.

#### Denial Worklist Endpoint (BILL-015)

**Endpoint:** `/api/modules/billing/denials/worklist`

Returns all open SM Denial records, grouped by `ai_category` in this order:
1. `correctable` (highest priority — most recoverable)
2. `appealable`
3. `terminal`

Within each group, sorted by `appeal_deadline` ascending (soonest deadline first).

**Filters available:**
- `payer` — filter by payer name
- `date_range` — filter by denial date range

This endpoint is the primary daily queue for billing coordinators. Open it first. Work it top to bottom.

---

### 3.4 Appeal Lifecycle (Feature 4)

**Stories:** BILL-016, BILL-017, BILL-018
**Trigger:** SM Appeal created manually by biller. Letter generation automated. Submission is always manual.
**Status:** Dependent on Feature 3 complete. Requires AWS Bedrock.

#### SM Appeal DocType (BILL-016)

SM Appeal records are created manually by the biller. Creating an SM Appeal triggers the `denied` → `in_appeal` state transition on the linked SM Claim. If the appeal is a second-level appeal (after `appeal_lost`), a new SM Appeal is created at `appeal_level = 2`, and the transition is `appeal_lost` → `in_appeal`.

##### SM Appeal fields

| Field | Type | Description | Set by |
|---|---|---|---|
| `claim` | Link (SM Claim) | The claim being appealed | Biller |
| `denial` | Link (SM Denial) | The specific SM Denial this appeal responds to | Biller |
| `appeal_level` | Select | `1` (first-level appeal) or `2` (second-level appeal) | Biller |
| `submitted_date` | Date | Date the appeal letter was submitted to the payer portal | Biller (manual, after submission) |
| `payer_deadline` | Date | Payer's deadline for appeal submission | Biller (from payer contract or SM Denial `appeal_deadline`) |
| `days_until_deadline` | Int | Computed: days remaining until `payer_deadline`. Updates daily | System (computed) |
| `appeal_letter` | Long Text | AI-generated appeal letter text. Biller reviews and edits before use | System (Bedrock, BILL-017), then biller edits |
| `supporting_docs` | Attach Multiple | Clinical documentation, auth records, or other supporting evidence to accompany the appeal | Biller (uploaded) |
| `result` | Select | `won`, `lost`, or `pending` | Biller or system (updated on resolution) |
| `result_date` | Date | Date the payer issued its appeal decision | Biller |
| `result_notes` | Small Text | Notes on the appeal outcome, payer response details | Biller |

#### Appeal Letter Generation (BILL-017)

On SM Appeal creation, the platform automatically triggers AWS Bedrock to generate a draft appeal letter. The letter is generated using:
- CARC and RARC codes from the linked SM Denial
- Payer name
- CPT codes from the SM Claim
- Date of service

The generated letter is populated into the `appeal_letter` field on the SM Appeal record.

**The letter is never auto-submitted.** The biller must:
1. Read the letter
2. Edit as needed for clinical accuracy and payer-specific language
3. Upload supporting documentation
4. Submit manually to the payer portal
5. Record the `submitted_date` on the SM Appeal

#### Appeal State Transitions (BILL-018)

| Transition | Trigger | Notes |
|---|---|---|
| `denied` → `in_appeal` | SM Appeal creation (biller, manual) | SM Appeal at `appeal_level = 1` |
| `in_appeal` → `appeal_won` | Biller (manual) or system (ERA after reversal) | Set `result = won`, `result_date` |
| `in_appeal` → `appeal_lost` | Biller (manual) or system | Set `result = lost`, `result_date` |
| `appeal_won` → `adjudicating` | System | Awaits payment ERA from payer |
| `appeal_lost` → `in_appeal` | Biller (manual) | Creates new SM Appeal at `appeal_level = 2` |
| `appeal_lost` → `written_off` | Supervisor (manual) | Supervisor approval gate, reason code mandatory |
| `appeal_lost` → `patient_balance` | Biller (manual) | When balance is patient responsibility |

All transitions logged to SM Claim State Log with `trigger_type = manual` or `webhook_835` as appropriate.

---

### 3.5 AR Dashboard Data Layer (Feature 5)

**Stories:** BILL-019, BILL-020, BILL-021
**Trigger:** All read-only API endpoints. No state changes. Data layer only — React UI is a separate future feature design session.
**Status:** Dependent on Features 1–4 complete with real claim volume

#### AR Summary Endpoint (BILL-019)

**Endpoint:** `/api/modules/billing/ar/summary`

Returns aggregate financial metrics per client for a date range:

| Metric | Description |
|---|---|
| Total claims by state | Count of SM Claims in each `canonical_state` |
| Total billed | Sum of billed amounts across all claims in scope |
| Total paid | Sum of all paid amounts from ERA posts |
| Total denied | Count and value of claims in `denied` state |
| Total in appeal | Count and value of claims in `in_appeal`, `appeal_won`, `appeal_lost` |
| Total patient balance | Sum of `patient_balance_amount` across `patient_balance` claims |
| Total written off | Sum of `write_off_amount` across `written_off` claims |

Filterable by client and date range.

#### Aging Report Endpoint (BILL-020)

**Endpoint:** `/api/modules/billing/ar/aging`

Returns SM Claims bucketed by days in current state:

| Bucket | Days in current state |
|---|---|
| Current | 0–30 |
| Aging | 31–60 |
| At Risk | 61–90 |
| Critical | 90+ |

Each bucket is broken down by payer. Claims with `is_overdue = true` are flagged in the response.

Filterable by `canonical_state` and payer.

#### Denial Analytics Endpoint (BILL-021)

**Endpoint:** `/api/modules/billing/ar/denials`

Returns denial trend and pattern data:

| Metric | Description |
|---|---|
| Denial rate by payer | This month vs. last month. Identifies payer-specific trends |
| Denial rate by CPT code | Identifies procedure codes with high denial rates |
| Top 10 CARC codes | Most frequent denial reason codes this period |
| Average days from denial to resolution | Broken down by `ai_category` (correctable, appealable, terminal) |

This endpoint powers the "where is our money getting stuck" view for billing managers.

---

## 4. Operational Scenarios

These procedures cover the most common and consequential billing situations a coordinator or manager will encounter. Each scenario references the exact SM DocType fields, state names, and role requirements from the platform.

---

### Scenario 1: Handling a CO-45 Denial Using the Denial Worklist

**Context:** A claim returns from the payer with CARC code CO-45 (charges exceed your contractual agreement). The AI classifies this as `terminal`. This is a contractual write-down, not an error.

**Trigger:** Automated. The system processes the 835 ERA, moves the claim to `denied`, creates an SM Denial record, and the AI sets `ai_category = terminal`.

**Step-by-step procedure:**

1. Open the denial worklist (`/api/modules/billing/denials/worklist`). CO-45 denials appear in the **terminal** group at the bottom.
2. Open the SM Denial record. Confirm `ai_category = terminal` and `ai_appealable = false`.
3. Review the `carc_codes` table. Confirm CO-45 is present and no other correctable codes accompany it.
4. Review the `ai_action` field. It should read something similar to: *"This is a contractual adjustment. The difference between billed and allowed amounts is a write-down per your payer contract. No appeal is appropriate. Recommend write-off."*
5. Check the linked SM Claim's `patient_balance_amount`. If a patient balance portion exists, that amount should move to `patient_balance` before write-off. Coordinate with the billing manager.
6. Inform the billing manager (supervisor role required for write-off approval).
7. The billing manager opens the SM Claim, verifies the CO-45 adjustment amounts in the State Log financial snapshot (`adjustment_amount_at_change`), and approves the `written_off` transition.
8. The transition requires a mandatory `state_change_reason`. Use a standardized reason code such as: `"CO-45 contractual write-down — payer contract rate differential"`.
9. The `write_off_approved_by` field is automatically populated with the supervisor's user ID.
10. Claim enters terminal state `written_off`. No further action.

> **Do not attempt to appeal CO-45.** It is a contractual obligation. Filing an appeal on a CO-45 wastes the payer's time and may affect your practice's relationship with that payer.

---

### Scenario 2: Processing a Partial Payment ERA

**Context:** An ERA arrives showing partial payment on a claim. The payer paid $85 of a $150 billed charge.

**Trigger:** Automated. The system processes the 835 ERA and moves the claim from `adjudicating` to `partial_paid`.

**Step-by-step procedure:**

1. The claim moves automatically to `partial_paid`. No action needed at this step.
2. Open the SM Claim State Log. Find the `webhook_835` entry. Review:
   - `paid_amount_at_change` — what the payer paid
   - `adjustment_amount_at_change` — contractual adjustments (CO-45 write-down)
   - `patient_responsibility_at_change` — PR codes indicating patient owes a portion
3. Determine the nature of the remaining balance:
   - **If patient responsibility (PR codes in ERA):** The system will move the claim to `patient_balance` automatically if no secondary payer is on file. Verify `patient_balance_amount` is set correctly on the SM Claim.
   - **If secondary payer is on file:** The system will move the claim to `pending_secondary`. Bill secondary payer manually (pilot — no automation). See [Scenario 5](#scenario-5-managing-a-pending_secondary-claim).
   - **If the partial payment looks incorrect (underpayment dispute):** The balance may be appealable. Open the SM Denial record if one was created. If no denial record exists (payer paid something but short-paid without denial codes), consult your billing manager.
4. If the partial payment is a clean split (payer paid allowed amount, patient owes copay/deductible), confirm the `patient_balance_amount` on the SM Claim matches the ERA's PR segment.
5. Document any discrepancies in the State Log by adding a manual note if your platform version supports it, or in your practice's external note system.

---

### Scenario 3: Initiating a First-Level Appeal After a CO-50 Denial

**Context:** A claim was denied with CARC CO-50 (not medically necessary). The AI classifies this as `appealable`. The service was clinically appropriate and you have documentation to support it.

**Trigger:** Manual. The biller initiates the appeal.

**Step-by-step procedure:**

1. Open the SM Denial record. Confirm `ai_category = appealable` and `ai_appealable = true`.
2. Review `ai_action` for the AI-recommended approach (e.g., *"Gather clinical notes demonstrating medical necessity. CO-50 denials by this payer are frequently overturned with supporting documentation."*).
3. Note the `appeal_deadline` on the SM Denial. This is the date by which your appeal must be submitted to the payer.
4. Create a new SM Appeal record:
   - `claim`: Link to the SM Claim
   - `denial`: Link to this SM Denial
   - `appeal_level`: `1`
   - `payer_deadline`: Copy from SM Denial `appeal_deadline`
5. On save, the system triggers `denied` → `in_appeal` on the SM Claim. The State Log records this with `trigger_type = manual`.
6. The system simultaneously triggers Bedrock to generate the appeal letter. Wait for `appeal_letter` to populate (typically within 30–60 seconds).
7. Open the `appeal_letter` field. Read it entirely. Edit for:
   - Accuracy of clinical language
   - Payer-specific terminology
   - Any clinical details the AI could not access (specific session content, diagnosis rationale)
8. Upload supporting clinical documentation to the `supporting_docs` field: session notes, treatment plan, diagnosis documentation, any auth correspondence.
9. Submit the letter and supporting docs manually to the payer's appeal portal (web portal, fax, or mail per payer requirements).
10. Record `submitted_date` on the SM Appeal.
11. Monitor `days_until_deadline` on the SM Appeal. The system updates this daily.
12. When the payer issues its decision, update `result` (won or lost), `result_date`, and `result_notes`.

---

### Scenario 4: Initiating a Second-Level Appeal After `appeal_lost`

**Context:** A first-level appeal was denied. You believe the claim is still recoverable through a second-level review or external review process.

**Trigger:** Manual. The biller initiates the second-level appeal.

**Step-by-step procedure:**

1. Open the SM Claim. Confirm `canonical_state = appeal_lost`.
2. Review the SM Appeal record for the first-level appeal. Read `result_notes` from the payer's denial of your appeal. Determine if new arguments or additional documentation are available for a second-level appeal.
3. Confirm the payer's second-level appeal filing window has not expired. Check payer contract or the original SM Denial's `appeal_deadline` for reference. Second-level deadlines are payer-specific — look up the payer's EOB or contract language.
4. Create a new SM Appeal record:
   - `claim`: Link to the same SM Claim
   - `denial`: Link to the original SM Denial (same denial event that started this appeal chain)
   - `appeal_level`: `2`
   - `payer_deadline`: Set to the second-level appeal deadline
5. On save, the system executes `appeal_lost` → `in_appeal` on the SM Claim.
6. A new Bedrock appeal letter is generated, now with `appeal_level = 2` context. Edit carefully — second-level letters must address why the first-level appeal was incorrect, not simply restate it.
7. Gather any additional supporting documentation not submitted in the first appeal.
8. Upload to `supporting_docs`, submit manually to payer, record `submitted_date`.
9. If the second-level appeal is also lost (`result = lost`), the options are: `written_off` (supervisor approval required) or `patient_balance` if the balance is patient responsibility.

---

### Scenario 5: Managing a `pending_secondary` Claim

**Context:** A claim was adjudicated by the primary payer. The ERA included a PR (patient responsibility) balance, and the SM Claim has a `secondary_payer` on file. The system moved the claim to `pending_secondary`.

**Trigger:** Automated (system moves claim to `pending_secondary`). Secondary submission is manual for pilot.

**Step-by-step procedure:**

1. The claim enters `pending_secondary` automatically. No immediate action required.
2. Open the SM Claim. Review the State Log entry for the `webhook_835` transition. Note:
   - `paid_amount_at_change` (primary paid)
   - `patient_responsibility_at_change` (balance to bill secondary)
3. Confirm the `secondary_payer` field is populated with the correct payer.
4. Prepare the secondary 837P manually using the primary ERA data as the COB (coordination of benefits) segment source. Reference the primary payer's ERA for:
   - Primary paid amount
   - Adjustment codes
   - Patient responsibility amount
5. Submit the secondary claim through Stedi (manual submission via Stedi's portal or by generating the secondary 837P in your billing tool and uploading to Stedi).
6. Once submitted, update the SM Claim `canonical_state` to `adjudicating` manually (biller action, requires `state_change_reason`: *"Secondary 837P submitted to [Payer Name] via Stedi manual upload"*).
7. Await the secondary ERA. The system will auto-post and transition to `paid`, `partial_paid`, or `denied` based on the secondary ERA result.

> **Pilot limitation:** Secondary payer auto-submission is not available. This is a known manual step. See DEFICIENCIES.md and the Extension Roadmap for future automation.

---

### Scenario 6: Correcting and Resubmitting a Rejected Claim

**Context:** A claim was rejected by the clearinghouse or payer (277CA with R3/A3 code). The claim is now in `rejected` state. A rejection is different from a denial — it means the claim was never adjudicated. It failed a technical or format check.

**Trigger:** Automated (system moves to `rejected` on 277CA R3/A3). Correction and resubmission are manual.

**Step-by-step procedure:**

1. The claim enters `rejected` automatically. Open the SM Claim State Log and find the `webhook_277ca` entry.
2. Check `trigger_reference` — this is the 277CA transaction ID. Use it to look up the full 277CA response in Stedi's portal for the specific rejection reason (e.g., invalid NPI, missing taxonomy code, invalid date format, subscriber ID mismatch).
3. Identify the correction needed. Common rejection reasons:
   - **Invalid NPI:** Verify the rendering provider's NPI in the SM Claim. Correct if wrong.
   - **Subscriber ID mismatch:** Verify patient insurance ID against their eligibility record.
   - **Missing or invalid taxonomy code:** Confirm the billing provider's taxonomy code is included in the 837P.
   - **Date of service format:** Verify date field formatting.
4. Make the required corrections on the SM Claim.
5. Move the claim from `rejected` → `draft` (manual, biller action). Enter a `state_change_reason` documenting what was corrected: *"Corrected subscriber ID from [wrong] to [correct] per 277CA rejection [transaction ID]"*.
6. The scrubber will re-validate. If all checks pass, the claim moves to `validated`. If data issues remain, it may move to `pending_info`.
7. Once in `validated`, the system queues the corrected 837P for submission to Stedi.
8. Monitor for the next 277CA to confirm the corrected claim is accepted (`submitted` → `adjudicating`).

---

### Scenario 7: Authorizing a Write-Off as a Supervisor

**Context:** A billing coordinator has reviewed a claim in `denied` or `appeal_lost` state and has determined it cannot be recovered. They have requested write-off approval.

**Role required:** Billing Manager or Spark Mojo Admin (supervisor role).

**Step-by-step procedure:**

1. Receive the write-off request from the billing coordinator (via your internal communication process — the platform does not currently have an in-platform write-off request notification).
2. Open the SM Claim. Review:
   - `canonical_state` — confirm it is `denied`, `appeal_lost`, or `patient_balance`
   - The full SM Claim State Log to understand the complete lifecycle of this claim
   - The SM Denial record(s) — confirm `ai_category` and `ai_action`
   - If appeal was filed, confirm the SM Appeal `result` and `result_notes`
3. Confirm the write-off is appropriate. Ask:
   - Has every correctable path been exhausted?
   - Is the denial category truly `terminal`, or was it misclassified by AI?
   - If `appeal_lost`, was a second-level appeal evaluated?
   - Does the write-off amount match the outstanding balance?
4. If approved, execute the transition:
   - Move the claim to `written_off`
   - Enter a mandatory `state_change_reason`. Be specific: *"CO-45 contractual write-down, $65.00, no appeal path per payer contract"* or *"Two-level appeal exhausted, CO-50 denied by [Payer], $150.00 write-off authorized"*
5. The system automatically populates `write_off_amount` and `write_off_approved_by` (your user ID) on the SM Claim.
6. The State Log records this transition with `trigger_type = manual` and your user ID as `changed_by`.
7. The claim enters terminal state `written_off`. It cannot be transitioned out.

> **Do not approve write-offs without reviewing the State Log.** The full transition history is the record that satisfies a payer audit or compliance review.

---

### Scenario 8: Handling a Claim Stuck in `pending_info`

**Context:** A claim has been in `pending_info` for several days. The scrubber identified missing data that has not been resolved.

**Trigger:** System moved claim to `pending_info` due to missing patient or eligibility data. Resolution is manual.

**Step-by-step procedure:**

1. Identify `pending_info` claims using the aging report endpoint (`/api/modules/billing/ar/aging`). Filter by `canonical_state = pending_info`. Claims in the 31–60 day or 61–90 day bucket are urgent.
2. Open the SM Claim. The scrubber's findings will be surfaced — check the `state_change_reason` field from the transition to `pending_info` or the associated system notes.
3. Common missing information scenarios and resolutions:

   | Missing Data | Resolution |
   |---|---|
   | Patient date of birth | Verify with front desk. Update patient record. |
   | Subscriber ID / Member ID | Verify with patient or run eligibility check via BILL-005. |
   | Insurance card on file | Request from patient. Upload to patient record. |
   | Rendering provider NPI | Confirm with billing manager. Add to claim. |
   | Place of service code | Clarify with clinician. Add correct POS code. |
   | Diagnosis codes | Confirm with clinical staff. Add ICD-10 codes to claim. |

4. Once missing data is resolved, move the claim from `pending_info` → `draft` manually with a `state_change_reason` documenting what was added.
5. The scrubber re-validates. If all checks pass, the claim moves to `validated` and queues for submission.

---

### Scenario 9: Resolving a Claim Stuck in `pending_auth` (Behavioral Health)

**Context:** A behavioral health claim is in `pending_auth`. The scrubber determined there is no valid authorization on file. This state is only active when `session_count_auth_enabled: true` (behavioral health vertical).

**Trigger:** System (scrubber). Resolution is manual.

**Step-by-step procedure:**

1. Open the SM Claim. Confirm `canonical_state = pending_auth`.
2. Determine the authorization status. Possibilities:
   - **Auth was never obtained:** Obtain authorization retroactively if the payer allows it. Contact the payer's provider services line.
   - **Auth exists but is not linked in the platform:** Add the authorization record to the patient's file and link to the SM Claim.
   - **Auth sessions exhausted:** Check remaining authorized sessions. If the patient has used all authorized sessions, a new auth request must be submitted to the payer before this and any future claims can be submitted.
   - **Auth expired:** If the authorization period has elapsed, a retroactive auth request may be possible. Payer-dependent.
3. Once a valid authorization is confirmed and linked:
   - Move `pending_auth` → `draft` with `state_change_reason`: *"Auth [auth number] confirmed, [X] sessions remaining, [start]–[end] date range"*
   - The scrubber re-validates. If auth check passes, claim moves to `validated`.
4. If retroactive authorization is denied by the payer and no valid auth can be obtained, the claim may ultimately need to be written off (`written_off` with supervisor approval and reason code: *"No valid auth — retroactive auth denied by [payer]"*).

---

### Scenario 10: Investigating a Claim That Did Not Auto-Post from an ERA

**Context:** You received an ERA from the payer for a specific date range, but a specific claim that should have been on that ERA is still showing `adjudicating`. The ERA did not move it.

**Trigger:** This is an investigation scenario. No automated resolution.

**Step-by-step procedure:**

1. Open the SM Claim. Confirm `canonical_state = adjudicating`.
2. Open the SM Claim State Log. Find the most recent `webhook_835` or `webhook_277ca` entry. Check `trigger_reference` to identify which ERA files have touched this claim.
3. If no `webhook_835` entry exists: the claim was not included in any ERA the platform has processed. Possible causes:
   - The payer has not yet processed the claim (still legitimately in process)
   - The claim was processed but the ERA was sent to a different address or clearinghouse profile
   - The payer processed the claim under a different claim number (resubmission scenario)
4. Check `is_overdue` on the SM Claim. If `true`, the scheduler has already flagged this claim as past the expected payer timeline.
5. Log into the Stedi portal and search for the specific claim by ICN (insurance claim number) or patient/date of service. Confirm whether Stedi received an ERA for this claim.
6. If the ERA is in Stedi but did not process in the platform: Escalate to Spark Mojo admin. Provide the Stedi ERA file reference and the SM Claim name. The admin will investigate whether the 835 webhook was received and why the transition did not execute.
7. If the claim genuinely has no ERA (payer has not remitted): Consider filing a 276 claim status inquiry (manual process — the platform does not currently auto-generate 276 inquiries; this is on the Extension Roadmap).

---

### Scenario 11: Running the End-of-Month AR Review

**Context:** The billing manager wants a complete picture of the practice's AR position at month end.

**Trigger:** Manual. Billing manager initiates.

**Step-by-step procedure:**

1. Call the AR summary endpoint (`/api/modules/billing/ar/summary`) for the month's date range. Review:
   - Total billed vs. total paid (collection rate)
   - Total denied (denial volume and value)
   - Total in appeal (recovery in progress)
   - Total patient balance (receivables to collect)
   - Total written off (loss for the month)
2. Call the aging report endpoint (`/api/modules/billing/ar/aging`) filtered by all active states. Review:
   - How many claims are in the 61–90 and 90+ buckets? These are urgent.
   - Which payers have the most aging claims? This is a payer performance signal.
   - How many claims have `is_overdue = true`?
3. Call the denial analytics endpoint (`/api/modules/billing/ar/denials`). Review:
   - Has the denial rate increased this month vs. last month for any payer?
   - Are any CPT codes showing elevated denial rates?
   - What are the top CARC codes this period? Are they `correctable` (process problem) or `appealable` (payer behavior problem)?
4. Cross-reference: claims in `denied` or `appeal_lost` with high `days_until_deadline` approaching — prioritize the worklist accordingly.
5. Identify any claims in `pending_secondary` that have been pending more than 30 days — manual secondary submission may have been missed.
6. Document findings. Present to practice owner as needed.

---

### Scenario 12: Placing a Claim on Hold and Releasing It

**Context:** A biller needs to pause a claim — for example, a payer is under a system outage, a provider credentialing issue is pending, or the clinical note is being amended.

**Trigger:** Manual. Biller action.

**Step-by-step procedure:**

**To hold:**
1. Open the SM Claim. Confirm it is in a state that allows a `held` transition (`draft`, `pending_info`, `pending_auth`, or `validated`).
2. Execute the transition to `held`.
3. Enter a mandatory `hold_reason`: *"Payer [name] system outage — hold pending clearance"* or *"Credentialing in progress for [Provider Name] with [Payer] — estimated resolution [date]"*.
4. The `hold_reason` field on the SM Claim is populated. The State Log records the transition with `trigger_type = manual`.

**To release:**
1. When the hold condition is resolved, open the SM Claim.
2. Execute the transition from `held` back to `draft` or `validated` as appropriate.
3. Enter `state_change_reason`: *"Hold released — payer outage resolved"* or *"Credentialing complete, provider active with [Payer] as of [date]"*.
4. If released to `validated`, the claim queues for submission normally.

---

## 5. Troubleshooting

This section covers the most common error states and problematic transitions that admins and billing managers encounter.

---

### Stuck Claims

<details>
<summary>Claim has been in <code>submitted</code> for more than 5 business days with no 277CA received</summary>

**Likely cause:** The 277CA webhook was not received by the platform, or Stedi did not receive the 837P acknowledgment from the payer.

**Steps:**
1. Log into the Stedi portal. Verify the 837P was transmitted and accepted by Stedi.
2. Check Stedi's transaction log for the 277CA response for this specific claim.
3. If a 277CA was sent by Stedi but the platform did not receive it, escalate to Spark Mojo admin to check webhook delivery logs.
4. If Stedi shows the payer has not yet returned a 277CA, the payer may be slow. Check `is_overdue` — if `true`, the scheduler has flagged it.
5. Consider contacting the payer's provider services line to verify receipt.

</details>

<details>
<summary>Claim has been in <code>adjudicating</code> for more than 30 days with no ERA