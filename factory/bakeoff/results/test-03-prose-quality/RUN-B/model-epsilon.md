model: model-epsilon
test: 03-prose-quality
run: B
date: 2026-04-09

# Healthcare Billing Mojo — Internal Playbook

> **Intended audience:** Spark Mojo platform administrators and practice billing managers who understand healthcare billing operations but are new to the Healthcare Billing Mojo.
>
> **Source of truth:** `BILLING.md` (Session 27, April 6, 2026).
> This playbook is a companion operational guide. If a conflict exists between this document and `BILLING.md`, the spec wins. Flag the conflict immediately — do not resolve unilaterally.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Who Uses This and How](#2-who-uses-this-and-how)
3. [The 19-State Model at a Glance](#3-the-19-state-model-at-a-glance)
4. [Detailed Function Reference by Feature Tier](#4-detailed-function-reference-by-feature-tier)
5. [Operational Scenarios](#5-operational-scenarios)
6. [Troubleshooting](#6-troubleshooting)
7. [FAQ](#7-faq)

---

## 1. Overview

### What the Healthcare Billing Mojo Does

The Healthcare Billing Mojo automates the full insurance billing lifecycle — from eligibility verification before a patient's first visit through cash posted to the bank. It replaces manual clearinghouse portal work, manual claim status checks, and chasing denial codes in PDF manuals.

Staff do not log into a clearinghouse portal. Staff do not manually check claim status. The Mojo submits claims, receives acknowledgments, posts payments, flags denials, and routes every claim to the correct next action automatically.

**The clearinghouse is Stedi.** All clients switch to Stedi as part of Spark Mojo onboarding. There is no multi-clearinghouse support. Practices with contractual obligations to a different clearinghouse are outside the scope of this product.

### What This Playbook Covers

This playbook documents every workflow, field, state transition, and operational procedure defined in the Healthcare Billing Mojo specification. It is structured so a billing manager or platform admin can find the answer to a specific question quickly, and also read end-to-end to understand how the system works.

### Key Terms Used Throughout

| Term | Definition |
|------|------------|
| **SM Claim** | The primary document representing a single insurance claim. Every claim has exactly one `canonical_state` value at any time. |
| **SM Claim State Log** | The immutable audit trail — one record per state transition on a claim. |
| **SM Denial** | A record created automatically when a claim enters `denied` state. One record per denial event (a claim can have multiple SM Denial records over its lifecycle). |
| **SM Appeal** | A record created manually by a biller when deciding to appeal a denial. Triggers `denied → in_appeal`. |
| **canonical_state** | The single authoritative field on SM Claim that defines where a claim is in its lifecycle. Only 19 values are valid. |
| **VALID_TRANSITIONS** | The Python dictionary in `sm_claim.py` that enforces which state moves are allowed. Any transition not in this dict is rejected with a validation error. |
| **Biller** | A role that can initiate appeals, correct and resubmit claims, and manually transition claims. |
| **Billing Coordinator** | A role that can void claims (irreversible action). |
| **Supervisor** | A role that can approve write-offs and reopen paid claims. |

### Automation vs. Manual Actions — Summary Table

| Action | Type | Who/What Triggers It |
|--------|------|---------------------|
| Claim enters `draft` from encounter | Automated | System |
| Claim enters `pending_info` (scrubber: missing patient/eligibility) | Automated | System — BILL-005 scrubber |
| Claim enters `pending_auth` (scrubber: no valid auth on file) | Automated | System — BILL-005 scrubber, **BH only** when `session_count_auth_enabled` |
| Claim enters `validated` (scrubber passes all checks) | Automated | System — BILL-005 scrubber |
| Claim enters `held` | Manual | Biller |
| Claim enters `submitted` (837P accepted by Stedi) | Automated | System — Stedi webhook |
| Claim enters `rejected` (277CA R3/A3 webhook) | Automated | System — 277CA webhook handler (BILL-011) |
| Claim enters `adjudicating` (277CA A1/A2 webhook) | Automated | System — 277CA webhook handler (BILL-011) |
| Claim enters `paid`, `partial_paid`, or `denied` (835 ERA) | Automated | System — 835 ERA handler (BILL-012) |
| SM Denial record created | Automated | System — triggered on `adjudicating → denied` |
| AI denial classification run | Automated | System — AWS Bedrock (BILL-014) |
| SM Appeal created | **Manual** | Biller — conscious decision required |
| Claim enters `in_appeal` | **Manual** | Biller — triggered by SM Appeal creation |
| Appeal letter generated | Automated | System — Bedrock (BILL-017), **never auto-submitted** |
| `in_appeal → appeal_won` or `in_appeal → appeal_lost` | **Manual or Automated** | Biller or System (ERA after reversal) |
| `appeal_lost → in_appeal` (second-level appeal) | **Manual** | Biller |
| `appeal_lost → written_off` | **Manual** | Biller initiates, **Supervisor approves** |
| `paid →` reopened | **Manual** | Supervisor — compliance implications, reason code mandatory |
| Claim enters `written_off` | **Manual** | Supervisor approval required, reason code mandatory |
| Claim enters `voided` | **Manual** | Billing Coordinator — irreversible |

### Behavioral-Health-Specific Note

The `pending_auth` state logic — specifically the check for remaining authorized sessions before claim submission — is behavioral-health-specific. This is a **feature-flagged code path** controlled by the `behavioral_health.yaml` vertical template:

- `session_count_auth_enabled: true` in the BH template
- `session_count_auth_enabled: false` (default) for all other verticals

No other state, transition, or business rule in the core Mojo is specialty-specific. Adding a new healthcare vertical means creating a new vertical template YAML file. Zero new Mojo code.

---

## 2. Who Uses This and How

### User Roles and Permissions

| Role | Who They Are | Key Permissions |
|------|-------------|-----------------|
| **Billing Coordinator** | Practice staff responsible for day-to-day claim operations | Can void claims (`voided`), view all worklists and dashboards, correct and resubmit rejected claims |
| **Biller** | Senior billing staff or billing manager | All Billing Coordinator permissions + initiate appeals (`in_appeal`), correct and resubmit denied claims, manage denial worklist |
| **Supervisor** | Billing manager or practice owner | All Biller permissions + approve write-offs (`written_off`), reopen paid claims, authorize `appeal_lost → written_off` |
| **Platform Admin** | Spark Mojo staff | Configure client settings (NPI, fee schedule, payer enrollment, `human-review-before-submission` flag), manage DB indexes, view all clients |

### How Each Role Interacts with the Mojo

**Billing Coordinator** primarily lives in the **Denial Worklist** and the **AR Dashboard** views. Their daily workflow:

1. Open the denial worklist (`/api/modules/billing/denials/worklist`) — sorted by `ai_category` (correctable first, then appealable, then terminal), then by `appeal_deadline` ascending.
2. Work through correctable denials: identify the missing data, update the claim, resubmit.
3. Escalate appealable denials to the Biller for appeal review.
4. Flag terminal denials for supervisor write-off review.

**Biller** works across the denial worklist, the appeal workflow, and claim corrections. Their daily workflow:

1. Review denials escalated from the coordinator.
2. For each appealable denial: review the SM Denial record, trigger SM Appeal creation (creates `in_appeal` state), review and approve the AI-generated appeal letter, submit manually to payer portal.
3. Monitor `in_appeal` claims for outcomes — update `appeal_won` or `appeal_lost` based on payer response.
4. After `appeal_lost`: decide whether to pursue second-level appeal or route to supervisor for write-off.

**Supervisor** is the approval gate for financial decisions:

1. Review `appeal_lost` claims routed for write-off.
2. Approve write-off with mandatory reason code — the system will not execute `→ written_off` without supervisor approval.
3. Approve `paid →` reopen requests when compliance review is needed.
4. Review denial analytics to identify payer patterns requiring contract renegotiation.

**Platform Admin** configures and maintains the infrastructure:

1. Set up new client configurations: NPI, enrolled payers, fee schedule, `human-review-before-submission` flag.
2. Manage vertical templates (e.g., confirm `behavioral_health.yaml` has `session_count_auth_enabled: true` for BH clients).
3. Monitor webhook delivery health from Stedi.
4. Review SM Claim State Log for auditing purposes.

---

## 3. The 19-State Model at a Glance

Every SM Claim has a `canonical_state` field. These are the **only 19 valid values**. The `VALID_TRANSITIONS` dict in `sm_claim.py` enforces every move. Any transition not in the dict is rejected with a validation error.

| # | State | Display Label | Category | How It Is Entered | Human Action Required? |
|---|-------|--------------|----------|-------------------|----------------------|
| 1 | `draft` | Draft | Pre-submission | From encounter or biller | No (system from encounter) |
| 2 | `pending_info` | Pending Info | Pre-submission | Scrubber: missing patient or eligibility data | Yes — biller must supply missing data |
| 3 | `pending_auth` | Pending Auth | Pre-submission | Scrubber: no valid auth on file | Yes — biller must obtain auth |
| 4 | `validated` | Ready | Pre-submission | Scrubber passes all checks | No |
| 5 | `held` | On Hold | Pre-submission | Biller (manual) | Yes — biller sets hold reason |
| 6 | `submitted` | Submitted | Submission | 837P accepted by Stedi | No |
| 7 | `rejected` | Rejected | Submission | 277CA R3/A3 webhook | Yes — biller must correct and resubmit |
| 8 | `adjudicating` | In Process | Adjudication | 277CA A1/A2 webhook | No |
| 9 | `paid` | Paid | Post-adjudication | 835 ERA — full payment | No |
| 10 | `partial_paid` | Partial Pay | Post-adjudication | 835 ERA — partial payment | Yes — may need to balance billing follow-up |
| 11 | `denied` | Denied | Post-adjudication | 835 ERA — zero payment with denial CARCs | Yes — denial management workflow begins |
| 12 | `in_appeal` | In Appeal | Appeal | Biller creates SM Appeal | **Yes — conscious biller decision required** |
| 13 | `appeal_won` | Appeal Won | Appeal | Biller or System (ERA reversal) | Yes — verify payment forthcoming |
| 14 | `appeal_lost` | Appeal Lost | Appeal | Biller or System | Yes — decide next action |
| 15 | `pending_secondary` | Secondary | Multi-payer | Primary ERA with PR balance + secondary payer on file | Yes — submit secondary claim manually |
| 16 | `patient_balance` | Patient Owes | Patient | All payer adjudication complete, balance remains | Yes — route to patient billing |
| 17 | `written_off` | Written Off | Terminal | Supervisor approval + reason code | **Yes — supervisor approval required** |
| 18 | `closed` | Closed | Terminal | All balances zero | No — automatic |
| 19 | `voided` | Voided | Terminal | Billing Coordinator (manual) | **Yes — irreversible, intentional** |

### Transitions Requiring Human Action

| Transition | Role Required | Why Human Action Is Required |
|-----------|--------------|------------------------------|
| Any → `in_appeal` | Biller | Requires clinical doc review and conscious decision to appeal |
| Any → `written_off` | Supervisor | Financial write-off requires authorization and reason code |
| Any → `voided` | Billing Coordinator | Irreversible administrative action |
| `rejected` → `draft` (resubmit) | Biller | Must verify correction before resubmission |
| `denied` → `draft` (resubmit) | Biller | Must verify correction before resubmission |
| `paid` → reopened | Supervisor | Compliance implications, reason code mandatory |

### State Log Trigger Types

Every state transition is logged to SM Claim State Log with one of these `trigger_type` values:

| Trigger Type | Meaning |
|-------------|---------|
| `manual` | A human explicitly changed the state via the UI or API |
| `webhook_277ca` | Stedi sent a 277CA transaction (acknowledgment or status update) |
| `webhook_835` | Stedi sent an 835 ERA (payment or denial) |
| `api` | An API call triggered the transition (e.g., external system) |
| `scheduler` | A scheduled background job triggered the transition (e.g., aging checks) |

---

## 4. Detailed Function Reference by Feature Tier

The Healthcare Billing Mojo is built in five feature tiers, in strict dependency order. Each tier cannot be built until the tier it depends on is complete.

### Feature 1: Claim State Machine Core

**BILL-006, BILL-007, BILL-008, BILL-009, BILL-010**

This is the foundational layer. All other Healthcare Billing Mojo features depend on it.

#### SM Claim DocType — New Fields

These fields were added to SM Claim as part of Feature 1. They support the 19-state model.

| Field Name | Type | Purpose | Notes |
|-----------|------|---------|-------|
| `canonical_state` | Select | The single authoritative state of the claim | Only 19 valid values. Any other value is rejected by the controller. |
| `state_changed_at` | Datetime | Timestamp of the last state transition | Set automatically by the controller on every transition. |
| `state_changed_by` | Data | User ID or system process that triggered the last transition | e.g., `Administrator`, `webhook_277ca`, `BILL-011` |
| `previous_state` | Data | State before the last transition | Quick reference — does not replace the state log. |
| `state_change_reason` | Small Text | Reason code for manual transitions | Required for all manual transitions. |
| `is_overdue` | Check | Set by the scheduler when a claim exceeds the expected payer timeline | Checkbox — `1` if overdue, `0` if not. Set by a scheduler job, not manually. |
| `hold_reason` | Small Text | Why the claim is on hold | **Required** when `canonical_state = held`. The system will not allow `held` state without a `hold_reason`. |
| `secondary_payer` | Link (SM Payer) | Secondary payer on file, if applicable | Used for multi-payer routing. |
| `patient_balance_amount` | Currency | Outstanding balance owed by the patient | Populated from ERA data. Used for patient balance routing. |
| `write_off_amount` | Currency | Amount written off | Set when `written_off` state is approved. |
| `write_off_approved_by` | Data | Supervisor who approved the write-off | Captured at write-off approval time. |

#### SM Claim State Log DocType — All Fields

A standalone DocType (not a child table). One record per state transition. Loaded separately from SM Claim to avoid performance impact as history grows.

| Field Name | Type | Purpose |
|-----------|------|---------|
| `claim` | Link (SM Claim) | The parent claim this log entry belongs to |
| `from_state` | Data | State before this transition (blank for the first entry) |
| `to_state` | Data | State after this transition |
| `changed_at` | Datetime | When the transition occurred (millisecond precision) |
| `changed_by` | Data | User ID or system process identifier |
| `trigger_type` | Select | `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler` |
| `trigger_reference` | Data | ERA filename, 277CA transaction set ID, etc. |
| `reason` | Small Text | Human-readable reason (mandatory for manual transitions) |
| `paid_amount_at_change` | Currency | Financial snapshot: total paid at moment of transition |
| `adjustment_amount_at_change` | Currency | Financial snapshot: total adjustments (CARC 45, etc.) |
| `patient_responsibility_at_change` | Currency | Financial snapshot: patient owes amount |

#### `transition_state()` Controller Method

The central method for all state changes. It:

1. Validates the requested transition against `VALID_TRANSITIONS`.
2. If the transition is not in the dict → raises a validation error.
3. If the transition requires a reason → validates `state_change_reason` is present.
4. If the target state is `held` → validates `hold_reason` is present.
5. If the target state is `written_off` → validates the approver is a Supervisor.
6. Writes a SM Claim State Log record.
7. Updates `canonical_state`, `previous_state`, `state_changed_at`, `state_changed_by` on SM Claim.

#### DB Indexes (Performance)

| Index Name | Table | Columns | Purpose |
|-----------|-------|---------|---------|
| `idx_sm_claim_canonical_state` | tabSM Claim | `(canonical_state)` | Fast filter by single state |
| `idx_sm_claim_state_payer` | tabSM Claim | `(canonical_state, payer)` | Fast filter by state + payer combination |
| `idx_sm_claim_state_date` | tabSM Claim | `(canonical_state, date_of_service)` | Fast filter by state + DOS |
| `idx_state_log_claim` | tabSM Claim State Log | `(claim)` | Fast lookup of all transitions for a claim |
| `idx_state_log_claim_time` | tabSM Claim State Log | `(claim, changed_at)` | Fast chronological history |
| `idx_state_log_state` | tabSM Claim State Log | `(to_state, changed_at)` | Fast report queries by state over time |

---

### Feature 2: Automated EDI Transitions

**BILL-011, BILL-012**

This tier is fully automated. No human involvement in claim movement.

#### 277CA Webhook Handler (BILL-011)

Stedi sends a 277CA (Health Care Claim Acknowledgment) via webhook for every 837P submission. The handler parses the 277CA and executes the appropriate state transition.

| 277CA Category | Meaning | State Transition |
|---------------|---------|-----------------|
| **A1** — Accepted for processing | Claim received and accepted | `submitted → adjudicating` |
| **A2** — Accepted for processing (pending review) | Claim received, under review | `submitted → adjudicating` |
| **A0** — Pending — forward | Claim forwarded for further processing | `submitted → adjudicating` |
| **R3** — Rejected | Payer rejected the claim at submission | `submitted → rejected` |
| **A3** — Rejected (specific error) | Payer rejected with specific error codes | `submitted → rejected` |
| **E0** — Payer error | Payer returned a processing error | `submitted → rejected` |
| **A4** — Not found | Claim not found at payer | `submitted → rejected` |

On every transition, the handler:

- Logs the transition to SM Claim State Log with `trigger_type = webhook_277ca` and the 277CA transaction set ID in `trigger_reference`.
- Updates `canonical_state`, `previous_state`, `state_changed_at`, `state_changed_by` on SM Claim.

#### 835 ERA Webhook Handler (BILL-012)

Stedi sends an 835 ERA (Electronic Remittance Advice) via webhook. The handler processes the ERA and executes one of three transitions atomically:

| ERA Condition | State Transition | Notes |
|-------------|-----------------|-------|
| Full payment received | `adjudicating → paid` | All charges paid per fee schedule |
| Partial payment received | `adjudicating → partial_paid` | Some charges paid, balance remains |
| Zero payment with denial CARCs | `adjudicating → denied` | Triggers SM Denial record creation (see Feature 3) |

The handler uses a **whitelisted Frappe method with `for_update=True`** to prevent race conditions when multiple ERA transactions arrive for the same claim concurrently.

Financial snapshots are logged to SM Claim State Log on every transition:
- `paid_amount_at_change`
- `adjustment_amount_at_change`
- `patient_responsibility_at_change`

`trigger_type = webhook_835`. `trigger_reference` = ERA filename.

---

### Feature 3: Denial Management

**BILL-013, BILL-014, BILL-015**

Every denial gets a record. Every record gets AI classification. Coordinators get a prioritized worklist.

#### SM Denial DocType — All Fields

Created automatically when a claim transitions `adjudicating → denied` via 835 ERA. One record per denial event — a claim can have multiple SM Denial records across its lifecycle (e.g., initial denial + resubmission denial).

| Field Name | Type | Purpose |
|-----------|------|---------|
| `claim` | Link (SM Claim) | The claim this denial applies to |
| `denial_date` | Date | Date of the denial (from 835 ERA) |
| `denial_carc_codes` | Table (Child DocType) | One row per CARC (Claim Adjustment Reason Code) from the ERA |
| `denial_rarc_codes` | Table (Child DocType) | One row per RARC (Remittance Advice Remark Code) from the ERA |
| `denial_reason_summary` | Small Text | Human-readable summary of the denial reason |
| `appeal_deadline` | Date | Computed from payer-specific appeal window (e.g., 30/60/90/120 days from denial date) |
| `ai_category` | Select | Classification: `correctable`, `appealable`, `terminal` |
| `ai_appealable` | Check | `1` if the denial can be appealed, `0` if not |
| `ai_action` | Small Text | AI-recommended next action (e.g., "Submit corrected claim with modifier 25") |
| `ai_confidence` | Float | AI confidence score (0.0–1.0) for the classification |

**CARCs and their meanings:**

Common CARCs you will see on denial records:

| CARC | Meaning | Typical Action |
|------|---------|----------------|
| **CO-4** | The procedure code is inconsistent with the modifier used | Check CPT/HCPCS and modifier combination |
| **CO-16** | Claim lacks information for processing | Resubmit with additional documentation |
| **CO-18** | Duplicate claim or service | Verify claim has not already been processed |
| **CO-45** | Charges exceed your fee schedule or contracted rate | Check fee schedule alignment |
| **CO-97** | Benefit is included in the payment for another service | Verify bundling rules |
| **CO-119** | Benefit maximum has been reached | Verify benefit limit and auth status |
| **CO-197** | Precertification/authorization not received in a timely fashion | Note: often appealable if auth was obtained but timing was off |
| **CO-236** | This procedure or profession may not be the most appropriate | Clinical documentation review needed |
| **PR-1** | Patient has no coverage | Verify patient eligibility |
| **PR-3** | Patient is not the subscriber | Correct patient/subscriber relationship |

> **Note:** RARCs (Remark Codes) provide additional context for CARCs. Always review RARC codes alongside CARC codes — they often explain what information is needed to correct or appeal.

#### AI Denial Classification (BILL-014)

Triggered automatically on SM Denial creation. The system sends the CARC codes, payer name, and CPT code combination to AWS Bedrock and populates:

- `ai_category`: `correctable` (the denial can be fixed by correcting the claim data), `appealable` (the denial requires a formal appeal), or `terminal` (no recovery path — e.g., benefit maximum reached, patient not covered).
- `ai_appealable`: Boolean.
- `ai_action`: Free text recommendation.
- `ai_confidence`: Score from 0.0 to 1.0.

**Classification only — no automatic state change.** The biller reviews the classification and acts. AI assists; the human decides.

#### Denial Worklist Endpoint

**Endpoint:** `GET /api/modules/billing/denials/worklist`

Returns all open denials grouped by `ai_category` (correctable first, then appealable, then terminal), sorted within each group by `appeal_deadline` ascending.

**Filters:**

| Parameter | Description |
|-----------|-------------|
| `payer` | Filter by specific payer |
| `date_from` / `date_to` | Filter by denial date range |
| `ai_category` | Filter by AI category (correctable/appealable/terminal) |
| `include_resolved` | Set to `1` to include resolved denials (default: `0`) |

---

### Feature 4: Appeal Lifecycle

**BILL-016, BILL-017, BILL-018**

Appeals are a conscious human decision. The system tracks everything; the biller makes the call.

#### SM Appeal DocType — All Fields

Created manually by a biller when deciding to appeal a denial. Creation of an SM Appeal record **triggers `denied → in_appeal`** — this transition cannot happen without a human's conscious decision.

| Field Name | Type | Purpose |
|-----------|------|---------|
| `claim` | Link (SM Claim) | The claim being appealed |
| `denial` | Link (SM Denial) | The specific denial record being appealed |
| `appeal_level` | Int | Level of appeal: `1` (first-level) or `2` (second-level) |
| `submitted_date` | Date | Date the appeal was submitted to the payer |
| `payer_deadline` | Date | Payer's deadline for this appeal level |
| `days_until_deadline` | Int | Computed: `payer_deadline - today`. Used for urgency sorting. |
| `appeal_letter` | Long Text | The appeal letter content |
| `supporting_docs` | Attach Multiple | Upload supporting documents (EOBs, clinical notes, auth records) |
| `result` | Select | `won`, `lost`, `pending` |
| `result_date` | Date | Date the result was received |
| `result_notes` | Small Text | Notes on the result (e.g., reason for denial, payer response) |

#### Appeal Letter Generation (BILL-017)

Triggered automatically on SM Appeal creation. AWS Bedrock generates the appeal letter from:

- The SM Denial's CARC and RARC codes
- Payer name
- CPT codes on the claim
- Service date
- Appeal level

The letter is populated into the `appeal_letter` field. **The biller reviews, edits, and approves the letter before submission.** The letter is **never auto-submitted**.

#### Appeal State Transitions (BILL-018)

| Transition | Trigger | Who Acts |
|-----------|---------|---------|
| `denied → in_appeal` | SM Appeal created | Biller (automatic on SM Appeal creation) |
| `in_appeal → appeal_won` | Payer reverses the denial | Biller or System (ERA reversal) |
| `in_appeal → appeal_lost` | Payer upholds the denial | Biller or System |
| `appeal_lost → in_appeal` | Biller creates a second-level SM Appeal (level 2) | Biller |
| `appeal_lost → written_off` | Biller routes to supervisor; supervisor approves | **Biller initiates, Supervisor approves** |
| `appeal_won → adjudicating` | Awaiting payment ERA after reversal | Biller or System |

All transitions are logged to SM Claim State Log. Manual transitions require `state_change_reason`.

---

### Feature 5: AR Dashboard Data Layer

**BILL-019, BILL-020, BILL-021**

This tier provides the abstraction layer endpoints that power the billing coordinator's daily AR view. Data layer only — no React UI in this phase.

#### AR Summary Endpoint

**Endpoint:** `GET /api/modules/billing/ar/summary`

Returns:

- Total claims by `canonical_state` (count and billed amount per state)
- Total paid (sum of all `paid` and `partial_paid` claims)
- Total denied (open, unresolved)
- Total in appeal
- Total patient balance
- Total written off

Filterable by date range. Per-client response.

#### Aging Report Endpoint

**Endpoint:** `GET /api/modules/billing/ar/aging`

Claims bucketed by days in current `canonical_state`:

| Bucket | Definition |
|--------|-----------|
| 0–30 days | Current / normal aging |
| 31–60 days | First aging alert |
| 61–90 days | Second aging alert |
| 90+ days | Critical aging |

Each bucket is broken down by payer. `is_overdue` claims are flagged. Filterable by `canonical_state` and payer.

#### Denial Analytics Endpoint

**Endpoint:** `GET /api/modules/billing/ar/denials`

Returns:

- Denial rate by payer (this month vs. last month comparison)
- Denial rate by CPT code
- Top 10 CARC codes this period
- Average days from denial to resolution by `ai_category`

---

## 5. Operational Scenarios

The following scenarios represent the most common day-to-day operations. Each is written as a step-by-step procedure.

---

### Scenario 1: How to Handle a CO-45 Denial Using the Denial Worklist

**Who:** Billing Coordinator / Biller
**Trigger:** A claim has entered `denied` state. The SM Denial record shows CARC CO-45 (charges exceed fee schedule or contracted rate).
**Automated steps:** SM Denial created, AI classification run (typically `correctable` with `ai_action` = "Verify fee schedule alignment").

**Steps:**

1. Open the denial worklist at `GET /api/modules/billing/denials/worklist`.
2. The worklist is pre-sorted: correctable denials appear first, sorted by `appeal_deadline` ascending. Locate the CO-45 denial.
3. Open the SM Denial record. Review:
   - `denial_carc_codes` table: confirms CO-45 with any RARC codes.
   - `ai_category`: should be `correctable`.
   - `ai_action`: review the AI recommendation.
4. Open the related SM Claim record.
5. Verify the contracted rate for the CPT code with this payer:
   - Check the payer fee schedule in the practice configuration.
   - If the billed amount exceeds the contracted rate, this is a correctable error.
6. Correct the claim:
   - Adjust the charge amount to match the contracted rate.
   - Add any required modifiers if the discrepancy relates to modifier usage.
7. Transition the claim from `denied` back to `draft` using `transition_state()`.
   - Set `state_change_reason` to something like "CO-45 correction: adjusted charge to contracted rate".
8. Submit the corrected claim. The claim will re-enter `validated` (if scrubber passes) and then `submitted`.

> **Note:** If the charge amount is correct and matches the contracted rate, the CO-45 may indicate a credentialing or enrollment issue. Escalate to the Platform Admin to verify the provider's enrollment status with the payer.

---

### Scenario 2: How to Process a Partial Payment ERA (835)

**Who:** System (automated) / Billing Coordinator (follow-up)
**Trigger:** Stedi sends an 835 ERA containing a partial payment for a claim.
**Automated steps:** BILL-012 processes the ERA, executes `adjudicating → partial_paid`, logs financial snapshot to SM Claim State Log.

**Steps:**

1. The system automatically:
   - Parses the 835 ERA from Stedi.
   - Executes `adjudicating → partial_paid` on the SM Claim.
   - Logs `paid_amount_at_change`, `adjustment_amount_at_change`, and `patient_responsibility_at_change` to SM Claim State Log with `trigger_type = webhook_835`.
   - Updates `patient_balance_amount` on the SM Claim.
2. The Billing Coordinator reviews the partial payment:
   - Open the SM Claim. Check the ERA details in the State Log.
   - Identify the reason for the partial payment (CARCs in the ERA):
     - **CO-45** (contracted rate): expected — patient balance may be billable.
     - **CO-97** (bundling): check if the secondary procedure was bundled into the primary.
     - **PR-1/PR-3** (patient responsibility): correct — patient owes the PR amount.
3. If there is a remaining patient balance:
   - The system transitions the claim to `patient_balance` once all payer adjudication is complete.
   - Route to the patient billing workflow (Billing and Payments Mojo — separate capability).
4. If the partial payment appears incorrect:
   - Identify the discrepancy against the expected contracted rate.
   - Create a corrected claim or initiate a dispute. Do not simply write off the difference without investigating.

---

### Scenario 3: How to Handle a 277CA Rejection (R3/A3) on a Submitted Claim

**Who:** Billing Coordinator
**Trigger:** A claim in `submitted` state receives a 277CA R3 or A3 (rejection) from Stedi.
**Automated steps:** BILL-011 processes the 277CA, executes `submitted → rejected`, logs to SM Claim State Log.

**Steps:**

1. The system automatically:
   - Parses the 277CA R3 or A3 from Stedi.
   - Executes `submitted → rejected`.
   - Logs to SM Claim State Log with `trigger_type = webhook_277ca` and the 277CA transaction set ID in `trigger_reference`.
2. The Billing Coordinator:
   - Monitors the rejection queue (claims in `rejected` state).
   - Opens the SM Claim to review the rejection reason. The `trigger_reference` contains the 277CA transaction set ID — cross-reference with Stedi portal for full rejection detail.
3. Common rejection reasons and corrections:

| 277CA Rejection | Cause | Correction |
|----------------|-------|-----------|
| R3 — Invalid NPI | NPI missing or formatted incorrectly | Verify NPI in client configuration |
| R3 — Invalid payer ID | Payer ID not recognized | Verify payer ID against current payer list |
| R3 — Missing subscriber ID | Subscriber ID field empty | Pull from patient eligibility record |
| A3 — Service date in future | Date of service is future-dated | Correct the service date |
| A3 — Duplicate submission | Claim already submitted | Verify in Stedi portal; if duplicate, void and ignore |

4. After correcting the claim data:
   - Transition from `rejected` to `draft` using `transition_state()`.
   - Set `state_change_reason` to describe the correction.
5. Resubmit. The claim will flow through `validated` and `submitted` again.

> **Important:** A claim can be in `rejected` state from the 277CA even before the payer has processed it. This is a submission-level rejection (Stedi or payer EDI validation), not an adjudication. Correcting and resubmitting is the correct action — do not treat it as a denial.

---

### Scenario 4: How to Initiate a First-Level Appeal After Denial

**Who:** Biller
**Trigger:** A claim is in `denied` state with an appealable denial (`ai_appealable = 1`).
**Automated steps:** SM Denial record exists with AI classification. Appeal letter will be auto-generated on SM Appeal creation.

**Steps:**

1. Review the SM Denial record:
   - Confirm `ai_appealable = 1`.
   - Note the CARC and RARC codes.
   - Note the `appeal_deadline` — this is a hard deadline. Do not miss it.
   - Review the `ai_action` recommendation.
2. Review the related SM Claim:
   - Ensure all clinical documentation is attached.
   - Confirm the service was medically necessary and documented.
   - Verify prior authorization was on file (if relevant).
3. Create the SM Appeal record:
   - Set `claim` to the SM Claim.
   - Set `denial` to the SM Denial.
   - Set `appeal_level = 1`.
   - Leave `submitted_date` blank until actually submitted.
4. **The system automatically:**
   - Triggers `denied → in_appeal` on the SM Claim (creation of SM Appeal = conscious appeal decision).
   - Triggers AWS Bedrock to generate the appeal letter into `appeal_letter`.
5. **Biller reviews the generated appeal letter:**
   - Open the `appeal_letter` field.
   - Edit for accuracy, tone, and completeness.
   - Attach supporting documents to `supporting_docs` (EOB, authorization letter, clinical notes).
6. Submit the appeal to the payer manually (via payer portal, fax, or mail as required by the payer):
   - Update `submitted_date` on the SM Appeal.
7. Monitor the claim. When the payer responds:
   - If upheld (denied again): set `result = lost` and `result_date`. Transition `in_appeal → appeal_lost`. Proceed to Scenario 5 or 6.
   - If reversed: set `result = won` and `result_date`. Transition `in_appeal → appeal_won`. Monitor for payment ERA.
   - If still pending: no change. Leave `result = pending`.

---

### Scenario 5: How to Initiate a Second-Level Appeal After `appeal_lost`

**Who:** Biller
**Trigger:** A claim is in `appeal_lost` state. The first-level appeal was denied.
**Automated steps:** None. This is a fully manual decision.

**Steps:**

1. Review the first-level SM Appeal:
   - Read `result_notes` for the payer's reason for denial.
   - Assess whether a second-level appeal has a realistic chance of success.
2. If pursuing a second-level appeal:
   - Create a new SM Appeal record.
   - Set `claim` to the same SM Claim.
   - Set `denial` to the same SM Denial (the original denial is still the basis).
   - Set `appeal_level = 2`.
   - **Important:** Payer deadlines for second-level appeals may differ from first-level. Update `payer_deadline` accordingly.
3. **The system automatically:**
   - Triggers `appeal_lost → in_appeal` (second-level).
   - Generates a new appeal letter (Bedrock).
4. Biller reviews and edits the second-level appeal letter. Second-level appeals often require stronger clinical justification or escalation to a medical director review.
5. Attach additional supporting documentation (peer-to-peer review request, medical director letter).
6. Submit manually. Update `submitted_date`.

> **Note:** Second-level appeals have a lower success rate than first-level. Before pursuing, consider whether the amount justifies the effort. If the amount is small and the denial is terminal (e.g., benefit maximum), route directly to supervisor for write-off (Scenario 7) rather than spending time on a likely-futile second appeal.

---

### Scenario 6: How to Correct a Denied Claim and Resubmit

**Who:** Billing Coordinator / Biller
**Trigger:** A claim is in `denied` state with a correctable denial (`ai_category = correctable`).
**Automated steps:** SM Denial created, AI classified as correctable.

**Steps:**

1. Review the SM Denial record:
   - Identify the CARC code(s).
   - Read `ai_action` for the AI's recommendation.
2. Common correctable denial patterns and corrections:

| CARC | Cause | Correction |
|------|-------|-----------|
| CO-16 | Missing information | Add required fields (TOS, modifiers, diagnosis codes) |
| CO-4 | Inconsistent modifier | Correct the modifier on the line item |
| CO-18 | Duplicate | Void the duplicate; keep the original |
| CO-45 | Rate mismatch | Adjust charge to contracted rate |
| CO-197 | Auth timing | Attach auth documentation showing auth was obtained |

3. Correct the claim data on the SM Claim.
4. Transition `denied → draft`:
   - Use `transition_state()`.
   - Provide a meaningful `state_change_reason` (e.g., "CO-16 correction: added modifier 25 and updated diagnosis code").
5. Resubmit. The claim flows through the scrubber:
   - If scrubber passes → `validated` → `submitted`.
   - If scrubber fails → `pending_info` or `pending_auth` → correct and try again.

> **Note:** When correcting and resubmitting a denied claim, the system treats it as a new claim submission. Ensure the original denial is not duplicated — if the payer has already processed the original denial, resubmission with corrected data is appropriate. Do not resubmit without correcting the underlying issue.

---

### Scenario 7: How to Authorize a Write-Off as a Supervisor

**Who:** Supervisor
**Trigger:** A claim is in `appeal_lost` state (or another terminal state) and the Biller has requested a write-off.
**Automated steps:** None. Write-off requires explicit human authorization.

**Steps:**

1. The Biller routes the claim for write-off review, setting the appropriate `state_change_reason` on a draft transition request.
2. The Supervisor reviews:
   - Open the SM Claim. Review the full state history in SM Claim State Log.
   - Confirm all appeals have been exhausted (`appeal_lost` for all appeal levels).
   - Confirm the denial is `terminal` (AI classification = `terminal`, or amount is below the cost of further pursuit).
   - Review the original billing amount and remaining balance.
3. **Authorize the write-off:**
   - Do NOT simply change the state directly.
   - Use the approved write-off flow (platform-administered approval workflow):
     - Enter the write-off amount (may be the full remaining balance or a partial write-off).
     - **Select a reason code** (mandatory — the system will not approve without one).
     - Common reason codes:
       - `WC` — Write-off Contractual adjustment (e.g., contracted rate exceeded billed amount)
       - `BD` — Bad Debt (patient uncollectible after collection efforts)
       - `ADMIN` — Administrative adjustment (system error, timely filing, etc.)
       - `AUTH` — Authorized forgiveness (supervisor-approved compassion adjustment)
     - The `write_off_amount` and `write_off_approved_by` fields are populated on SM Claim.
4. The system transitions the claim to `written_off`.
5. If there is any remaining patient balance after the payer write-off, the system may route to `patient_balance` or `closed` depending on the financial snapshot.
6. If all balances are zero after write-off, the system transitions to `closed`.

> **Compliance note:** Write-offs require a documented reason code. Do not write off claims to circumvent payer billing rules. Contractual adjustments (WC) are appropriate when the billed amount exceeds the contracted rate. Administrative write-offs for timely filing or system errors require supporting documentation.

---

### Scenario 8: How to Process a 277CA Acknowledgment Advancing a Claim to `adjudicating`

**Who:** System (automated)
**Trigger:** Stedi sends a 277CA A1 or A2 for a claim in `submitted` state.
**Automated steps:** BILL-011 processes the 277CA, executes `submitted → adjudicating`.

**Steps:**

1. Stedi sends the 277CA A1 (accepted for processing) or A2 (accepted, pending review) via webhook.
2. BILL-011 automatically:
   - Parses the 277CA transaction set.
   - Identifies the category code (A1, A2, A0).
   - Validates the claim ID in the 277CA against SM Claim records.
   - Executes `submitted → adjudicating` for A1, A2, and A0 categories.
   - Writes to SM Claim State Log: `trigger_type = webhook_277ca`, `trigger_reference = [277CA transaction set ID]`.
3. No human action is required. The claim is now in `adjudicating`.
4. The system waits for either:
   - An 835 ERA (payment or denial) → BILL-012 handles the next transition.
   - A subsequent 277CA status update.

> **Note:** A0 (Pending — Forward) means the claim has been forwarded to the payer for adjudication. It does not indicate a problem — it is a normal acknowledgment step.

---

### Scenario 9: How to Handle a Claim in `pending_auth` (Behavioral Health)

**Who:** Billing Coordinator / Biller
**Trigger:** A claim is in `pending_auth` state. The scrubber detected no valid authorization on file.
**Automated steps:** BILL-005 scrubber placed the claim in `pending_auth`.
**Condition:** This state is only active for behavioral health clients where `session_count_auth_enabled: true` in the vertical template.

**Steps:**

1. Open the SM Claim. Check `pending_auth` — the scrubber's reason will indicate whether it is:
   - No authorization on file at all.
   - Auth on file but remaining session count is zero.
   - Auth expired.
2. Check the authorization record:
   - Verify the auth start date, end date, and remaining session count.
   - If the auth exists but session count is zero: the patient has used all authorized sessions. A new authorization request must be submitted.
   - If the auth exists but is expired: request a reauthorization.
   - If no auth exists: submit a new authorization request to the payer.
3. For new or renewed authorization:
   - Submit auth request to payer (manual via payer portal or automated via n8n if configured).
   - Document the authorization number and dates on the SM Claim or related SM Auth record.
4. Once a valid auth with remaining sessions is confirmed:
   - The claim is eligible to move forward.
   - Transition from `pending_auth` to `draft` or `validated` (depending on other scrubber checks).
   - Resubmit the claim.
5. If no authorization can be obtained:
   - Document the reason on the SM Claim.
   - Transition to `written_off` with supervisor approval and reason code `NOAUTH` (No Authorization).

> **Important:** For behavioral health, submitting a claim without a valid authorization on file — or after exhausting authorized sessions — is a common denial cause (CARCs CO-119, CO-197). The `pending_auth` state exists to prevent these denials before they happen. Always resolve the auth gap before submission.

---

### Scenario 10: How to Void a Claim as a Billing Coordinator

**Who:** Billing Coordinator
**Trigger:** A claim must be voided — it was created in error, is a duplicate, or is otherwise invalid.
**Automated steps:** None. Voiding is a fully manual, irreversible action.
**Important:** This action is irreversible. Voiding is different from writing off. A voided claim is a destroyed claim. A written-off claim is a valid claim that will not be pursued for payment.

**Steps:**

1. Confirm the claim should be voided, not written off:
   - **Void** = the claim should never have been submitted (duplicate, wrong patient, wrong CPT).
   - **Write-off** = the claim was validly submitted but will not be paid.
2. Review the SM Claim State Log to confirm no payment has been received (claim is not in `paid`, `partial_paid`, or `closed`).
3. Transition the claim to `voided`:
   - Use `transition_state()`.
   - Set `state_change_reason` to describe why (e.g., "Duplicate claim — original claim [ID] already submitted").
4. The system:
   - Sets `canonical_state = voided`.
   - Logs the transition to SM Claim State Log with `trigger_type = manual`.
   - The claim is now permanently closed and cannot be resubmitted.
5. If a valid claim needs to be submitted after voiding a duplicate:
   - Create a new SM Claim with corrected data.
   - Submit normally.

> **Warning:** Voiding a claim that has been paid will create a reconciliation discrepancy. If a paid claim must be voided, coordinate with the Supervisor and accounting team to issue a refund to the payer before voiding.

---

### Scenario 11: How to Process an ERA Payment Where No SM Claim Exists

**Who:** Platform Admin / Billing Coordinator
**Trigger:** An 835 ERA arrives from Stedi for a claim that cannot be matched to any SM Claim record.
**Automated steps:** BILL-012 attempts to match ERA to SM Claim by claim ID. If no match, the ERA is flagged as unmatched.

**Steps:**

1. The system attempts to match the ERA to an SM Claim by claim ID (CLP segment in the 835).
2. If no match is found:
   - The ERA is flagged as unmatched.
   - An alert is generated (visible in the billing dashboard or sent to the billing coordinator).
   - The ERA record is stored for investigation.
3. Investigate the mismatch:
   - Check the CLP-01 (Claim Status Code) in the ERA.
   - Cross-reference with Stedi portal to see if the claim was submitted from Spark Mojo or another source.
   - If the claim was submitted outside of Spark Mojo (e.g., manual submission): this is expected — log it manually in the practice's external records.
   - If the claim should have been in Spark Mojo: check whether the claim was deleted or voided, or whether a data migration error occurred.
4. If the ERA represents a payment for a valid claim that was not matched:
   - The Platform Admin may need to manually associate the ERA with the SM Claim.
   - Open the SM Claim and manually post the payment details.
   - Transition the claim appropriately (`paid` or `partial_paid`).
5. Document the resolution in the SM Claim State Log.

---

### Scenario 12: How to Reopen a Paid Claim (Supervisor Only)

**Who:** Supervisor
**Trigger:** A claim is in `paid` state but a discrepancy is discovered (overpayment, underpayment, or compliance issue).
**Automated steps:** None. Reopening a paid claim requires supervisor authorization and has compliance implications.
**Important:** This is a rare and significant action. Document the reason thoroughly.

**Steps:**

1. Document the reason for the reopen in detail.
2. Supervisor reviews:
   - Confirm the discrepancy (e.g., payer paid incorrectly, or a coding error was discovered).
   - Determine the corrective action needed (refund to payer, corrected claim submission, etc.).
3. Request the reopen:
   - The Supervisor initiates a paid-claim reopen request.
   - The request must include:
     - `state_change_reason` (mandatory — detailed justification).
     - Proposed corrective action.
4. On approval, the system transitions `paid →` (appropriate prior state, typically `adjudicating` or `draft`).
5. Take the corrective action:
   - If overpayment: issue a refund to the payer and resubmit corrected claim if needed.
   - If underpayment: submit a corrected claim or appeal for additional payment.
   - If compliance issue: correct the coding and resubmit.
6. Log all corrective actions to SM Claim State Log.

> **Compliance note:** Reopening paid claims may trigger payer audit requirements. Consult with a billing compliance officer if the reopen involves a pattern of corrections (not an isolated incident).

---

## 6. Troubleshooting

### T1: Claim Stuck in `pending_info`

**Symptoms:** A claim has been in `pending_info` for more than 24 hours. The scrubber placed it there but the issue was not resolved.

**Causes:**

- Missing patient data (date of birth, subscriber ID, subscriber relationship)
- Missing payer data (payer ID not found in the payer list)
- Eligibility could not be verified (no active coverage on file)

**Resolution:**

1. Open the SM Claim. Review which fields the scrubber flagged as missing.
2. Pull the patient's eligibility record from the system (BILL-005).
3. If eligibility data is missing or outdated: request an eligibility verification.
4. If the patient data is incomplete: contact the patient for updated insurance information.
5. Once all required data is present on the SM Claim:
   - The scrubber will automatically re-evaluate on the next pass, or the biller can manually trigger re-validation.
   - If the claim passes: it moves to `validated`.
6. If eligibility cannot be obtained: the claim may need to be written off (supervisor approval) or converted to self-pay (patient responsibility).

---

### T2: Claim Stuck in `pending_auth`

**Symptoms:** A claim has been in `pending_auth` for more than 48 hours.

**Causes (for behavioral health clients with `session_count_auth_enabled: true`):**

- No authorization on file for this patient/payer/CPT combination
- Authorization on file but all sessions exhausted
- Authorization expired

**Resolution:**

1. Check the authorization record for this patient.
2. If no auth: submit a new authorization request to the payer.
3. If auth exists but sessions are exhausted: request a new authorization.
4. If auth exists but expired: request reauthorization.
5. Once valid auth is on file: resubmit the claim.

> **Tip:** For behavioral health practices, proactively check authorization status at scheduling, not at billing. This prevents claims from reaching `pending_auth` at all.

---

### T3: 277CA Webhook Not Processing

**Symptoms:** Claims are in `submitted` state past the normal acknowledgment window (typically same day or next business day). No `adjudicating` or `rejected` transition observed.

**Causes:**

- Stedi webhook delivery failure (Stedi infrastructure issue)
- Webhook endpoint unreachable (Spark Mojo infrastructure)
- Webhook handler error (BILL-011 code failure)

**Resolution:**

1. Check Stedi's webhook delivery status in the Stedi portal.
2. Check Spark Mojo's webhook endpoint logs for incoming 277CA transactions.
3. If the webhook was not received: Stedi can replay the 277CA from their portal. Request a replay for the affected claims.
4. If the webhook was received but the handler failed: the Platform Admin should review the error logs and correct the handler code.
5. If claims were in `submitted` for an extended period with no 277CA: use the Stedi 276 status inquiry (manual or automated) to check claim status directly.

---

### T4: ERA Mismatch — Payment Amount Does Not Match Billed Amount

**Symptoms:** A claim in `paid` or `partial_paid` shows a payment amount that is significantly different from the expected amount.

**Resolution:**

1. Open the SM Claim State Log and locate the 835 ERA entry (`trigger_type = webhook_835`).
2. Note the ERA filename (`trigger_reference`).
3. Retrieve the ERA detail from Stedi portal (835 ERA is human-readable; the ST-835 transaction set contains the financial detail).
4. Compare CARCs in the ERA against the expected billing:
   - **CO-45 (contracted rate):** The payer paid at the contracted rate. Verify the fee schedule is correct. If the fee schedule is correct and payer paid below contracted rate, this is a credentialing or enrollment issue — escalate to Platform Admin.
   - **CO-97 (bundling):** The payer bundled a secondary procedure into the primary. Verify the bundling rule. If unbundling is warranted, appeal the specific line.
   - **PR-1/PR-3 (patient resp):** Correct — payer is correctly shifting liability to patient.
   - **CO-16 (missing info):** The payer processed the claim but withheld payment pending additional information. Contact payer with the required documentation.
5. Document the resolution on the SM Claim.

---

### T5: Multiple SM Denial Records on One Claim

**Symptoms:** One SM Claim has two or more SM Denial records.

**This is expected behavior.** A claim can be denied multiple times across its lifecycle. Common scenarios:

1. Initial claim denied → corrected and resubmitted → denied again with different CARCs.
2. Claim denied → appeal lost → resubmitted → denied again.
3. Claim paid → later audited and overpayment identified → system creates a new denial record for the recovery.

**Resolution:**

1. Each SM Denial record is independent. Review each one:
   - Check the `denial_date` — later denials supersede earlier ones.
   - Check the CARC codes — they may differ between denials.
2. For each active denial: assess `ai_category` and take appropriate action.
3. If the most recent denial reverses a prior payment (audit recovery): coordinate with the Supervisor and accounting team.
4. All denial records are retained in the SM Claim State Log for audit purposes.

---

### T6: Appeal Deadline Approaching and No Response from Payer

**Symptoms:** An SM Appeal has `days_until_deadline` ≤ 7 days and no result has been received.

**Resolution:**

1. Contact the payer immediately:
   - Call the appeals department.
   - Reference the appeal ID and the original denial.
   - Document the conversation (date, representative name, response).
2. If the payer has lost the appeal:
   - Request a status update and ask for the appeal to be located and reviewed.
   - Send a follow-up letter (use the generated appeal letter as a template) with proof of timely submission.
3. If the payer confirms the appeal is still under review:
   - Update `result = pending` and note the expected response date.
   - If the deadline passes without a response: escalate to a second-level appeal or supervisor write-off review.
4. Document all payer communications in the SM Appeal `result_notes`.

---

### T7: AI Denial Classification Is Wrong or Low Confidence

**Symptoms:** An SM Denial record shows `ai_category` that the biller disagrees with, or `ai_confidence` is below 0.6.

**Resolution:**

1. Review the CARC and RARC codes directly — do not rely solely on the AI classification.
2. If the AI classification is clearly incorrect:
   - The biller can override the `ai_category` manually (the field is editable).
   - Document the reason for override in the SM Denial record.
3. If the AI confidence is low: the CARC combination may be unusual or ambiguous. Treat it as a judgment call — review the specific CARC codes against the payer manual.
4. Report recurring AI misclassification to the Platform Admin for Bedrock model tuning review.

---

### T8: Claim Stuck in `adjudicating` — No ERA Received

**Symptoms:** A claim is in `adjudicating` beyond the expected payer turnaround time (varies by payer; typically 14–30 days for professional claims).

**Causes:**

- Payer is still processing (normal, just delayed).
- The 277CA A1/A2 was received but the payer has not yet issued an ERA.
- The ERA was received but webhook delivery failed.

**Resolution:**

1. Check Stedi portal for the latest claim status.
2. If Stedi shows "Pending" at the payer: the claim is still in process. Continue waiting.
3. If Stedi shows a final status but the claim is still `adjudicating` in Spark Mojo: an ERA may have been missed. Check for unmatched ERAs (Scenario 11).
4. If Stedi shows a final status and no ERA is found: the ERA webhook may have failed. The Platform Admin can manually post the payment or denial from the Stedi portal data.
5. Set `is_overdue = 1` on the SM Claim if the scheduler has not already done so. This flags the claim in the aging report.

---

### T9: Denial Worklist Is Empty but Denials Exist

**Symptoms:** You know a claim is in `denied` state but it does not appear in the denial worklist.

**Resolution:**

1. Check the worklist filters. The default excludes resolved denials (`include_resolved = 0`). If the denial was already worked and closed, it will not appear.
2. If the denial is open but not appearing: verify the denial was created (SM Denial record should exist). If no SM Denial record exists, this indicates a bug in the `adjudicating → denied` transition — escalate to Platform Admin.
3. If the denial was created but the claim has since moved out of `denied` state (e.g., corrected and resubmitted, or appealed): the denial is considered resolved and will not appear in the default worklist.
4. Use `include_resolved = 1` to see all denials for audit purposes.

---

### T10: `voided` Claim Cannot Be Found for Resubmission

**Symptoms:** A claim was voided and a new claim needs to be submitted. The original data is needed.

**Resolution:**

1