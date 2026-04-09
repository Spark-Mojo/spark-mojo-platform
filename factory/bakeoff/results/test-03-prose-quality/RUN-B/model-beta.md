model: model-beta
test: 03-prose-quality
run: B
date: 2026-04-09

```markdown
# Healthcare Billing Mojo — Internal Playbook

**Document type:** INTERNAL-PLAYBOOK
**Capability:** Healthcare Billing Mojo
**Audience:** Spark Mojo platform admins, practice billing managers, billing coordinators
**Last updated:** April 9, 2026
**Source of truth:** `platform/knowledge-base/billing/BILLING.md` (feature specification)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Who Uses This and How](#2-who-uses-this-and-how)
3. [Key Concepts Before You Start](#3-key-concepts-before-you-start)
4. [Detailed Function Reference](#4-detailed-function-reference)
   - [Feature 1: Claim State Machine Core](#feature-1-claim-state-machine-core)
   - [Feature 2: Automated EDI Transitions](#feature-2-automated-edi-transitions)
   - [Feature 3: Denial Management](#feature-3-denial-management)
   - [Feature 4: Appeal Lifecycle](#feature-4-appeal-lifecycle)
   - [Feature 5: AR Dashboard Data Layer](#feature-5-ar-dashboard-data-layer)
5. [Operational Scenarios](#5-operational-scenarios)
6. [Troubleshooting](#6-troubleshooting)
7. [FAQ](#7-faq)

---

## 1. Overview

The Healthcare Billing Mojo manages the full insurance billing lifecycle — from claim creation through final payment posting, denial resolution, appeal management, and account closure. It replaces the manual clearinghouse-portal workflow that most practices operate today.

**What this system does automatically (no human action required):**

- Moves claims from `submitted` → `adjudicating` when a 277CA acknowledgment arrives from Stedi
- Moves claims from `submitted` → `rejected` when a 277CA rejection arrives from Stedi
- Moves claims from `adjudicating` → `paid`, `partial_paid`, or `denied` when an 835 ERA posts
- Creates an SM Denial record whenever a claim transitions to `denied`
- Classifies every denial using AI (AWS Bedrock) into correctable, appealable, or terminal
- Flags overdue claims via scheduler
- Detects secondary payer responsibility and transitions to `pending_secondary`

**What this system requires human action for:**

- Moving any claim into `in_appeal` (biller must review clinical documentation and consciously decide to appeal)
- Approving any write-off to `written_off` (supervisor authorization and reason code required)
- Voiding a claim to `voided` (billing coordinator, irreversible)
- Correcting and resubmitting a denied claim (`denied` → `draft`)
- Reopening a paid claim (supervisor, compliance implications, reason code mandatory)
- Placing or releasing a hold (`held` state)

**The clearinghouse is Stedi.** All practices using Healthcare Billing Mojo enroll with Stedi during onboarding. There is no multi-clearinghouse support. Practices with contractual obligations to another clearinghouse cannot use this capability.

**Naming discipline:** This capability is always called the **Healthcare Billing Mojo**. The platform has three separate billing-related capabilities:

| Name | What it is |
|------|-----------|
| **Healthcare Billing Mojo** | Insurance claims, clearinghouse, ERA, denials, appeals — this playbook |
| **Billing and Payments** (CORE) | Invoicing clients, collecting payment, Stripe |
| **Platform Billing Mojo** (ADMIN) | What practices pay Spark Mojo — MRR, subscriptions |

Never refer to this capability as just "billing." Use the full name in all communications.

---

## 2. Who Uses This and How

### Roles

| Role | What they do in this system | Key states they interact with |
|------|---------------------------|------------------------------|
| **Biller** | Creates claims, reviews scrubber results, corrects claim data, decides whether to appeal denials, generates appeal letters, manages daily worklist | `draft`, `pending_info`, `pending_auth`, `validated`, `held`, `denied`, `in_appeal` |
| **Billing Coordinator** | Oversees all billing operations, monitors AR aging, voids claims when necessary, manages payer relationships | All 19 states. Only role that can transition to `voided`. |
| **Supervisor** | Approves write-offs, authorizes reopening of paid claims, reviews denial analytics and AR summaries | `written_off`, `paid` (reopen), AR dashboard data |
| **Spark Mojo Admin** | Platform configuration, vertical template management, troubleshooting state transition failures, monitoring webhook health | System-level: indexes, state log queries, webhook logs |

### Daily workflow pattern

A typical day for a billing coordinator using Healthcare Billing Mojo:

1. **Morning:** Open the denial worklist (`/api/modules/billing/denials/worklist`). Work correctable denials first (highest recovery, lowest effort). Review appealable denials by appeal deadline — soonest deadlines first.
2. **Mid-morning:** Review claims in `pending_info` and `pending_auth`. Resolve missing data. Clear holds on any `held` claims ready for release.
3. **Afternoon:** Check AR aging report (`/api/modules/billing/ar/aging`). Investigate claims in `adjudicating` that are 30+ days old. Review `partial_paid` claims for secondary payer follow-up.
4. **End of day:** Review AR summary (`/api/modules/billing/ar/summary`). Check denial analytics for emerging payer patterns.

---

## 3. Key Concepts Before You Start

### The 19-State Model

Every SM Claim has exactly one `canonical_state` at any point in time. The system enforces a strict set of valid transitions — attempting an invalid transition produces a validation error. There is no way to skip states or force a claim into an arbitrary state.

**Pre-submission states** (claim is being prepared):

| State | Display Label | How it gets here |
|-------|--------------|-----------------|
| `draft` | Draft | Created from encounter or by biller. Also the re-entry point for claim correction after denial. |
| `pending_info` | Pending Info | Scrubber detected missing patient demographics or eligibility data. |
| `pending_auth` | Pending Auth | Scrubber detected no valid authorization on file. **Behavioral health only** when `session_count_auth_enabled` is true in the vertical template. |
| `validated` | Ready | Scrubber passed all checks. Claim is ready for submission. |
| `held` | On Hold | Biller manually placed the claim on hold. `hold_reason` field is required. |

**Submission states** (claim is with the clearinghouse or payer):

| State | Display Label | How it gets here |
|-------|--------------|-----------------|
| `submitted` | Submitted | 837P accepted by Stedi. System-triggered. |
| `rejected` | Rejected | 277CA webhook returned category R3 or A3. System-triggered. |
| `adjudicating` | In Process | 277CA webhook returned category A1 or A2. System-triggered. |

**Post-adjudication states** (payer has made a decision):

| State | Display Label | How it gets here |
|-------|--------------|-----------------|
| `paid` | Paid | 835 ERA posted full payment. System-triggered. |
| `partial_paid` | Partial Pay | 835 ERA posted partial payment. System-triggered. |
| `denied` | Denied | 835 ERA posted zero payment with denial CARC codes. System-triggered. |

**Appeal states:**

| State | Display Label | How it gets here |
|-------|--------------|-----------------|
| `in_appeal` | In Appeal | Biller manually initiates. Requires clinical doc review. |
| `appeal_won` | Appeal Won | Biller marks result or system detects via ERA reversal. |
| `appeal_lost` | Appeal Lost | Biller marks result or system detects. |

**Multi-payer and patient states:**

| State | Display Label | How it gets here |
|-------|--------------|-----------------|
| `pending_secondary` | Secondary | Primary ERA shows PR balance and secondary payer is on file. System-triggered. |
| `patient_balance` | Patient Owes | All payer adjudication complete, balance remains. System-triggered. |

**Terminal states** (claim lifecycle is complete):

| State | Display Label | How it gets here |
|-------|--------------|-----------------|
| `written_off` | Written Off | Supervisor approves write-off with mandatory reason code. |
| `closed` | Closed | All balances reach zero. System-triggered. |
| `voided` | Voided | Billing coordinator manually voids. Irreversible. |

### Manual vs. Automated Transitions — Quick Reference

| Transition | Type | Who/What triggers it |
|-----------|------|---------------------|
| `draft` → `pending_info` | **Automated** | Scrubber |
| `draft` → `pending_auth` | **Automated** | Scrubber (BH only) |
| `draft` → `validated` | **Automated** | Scrubber |
| Any pre-submission → `held` | **Manual** | Biller. `hold_reason` required. |
| `validated` → `submitted` | **Automated** | System (837P accepted by Stedi) |
| `submitted` → `adjudicating` | **Automated** | 277CA webhook (A1/A2) |
| `submitted` → `rejected` | **Automated** | 277CA webhook (R3/A3) |
| `adjudicating` → `paid` | **Automated** | 835 ERA (full payment) |
| `adjudicating` → `partial_paid` | **Automated** | 835 ERA (partial payment) |
| `adjudicating` → `denied` | **Automated** | 835 ERA (zero payment + denial CARCs) |
| `denied` → `in_appeal` | **Manual** | Biller. Requires conscious decision after clinical doc review. |
| `denied` → `draft` | **Manual** | Biller. Claim correction and resubmission path. |
| `in_appeal` → `appeal_won` | **Manual or Automated** | Biller marks result, or system detects via ERA reversal. |
| `in_appeal` → `appeal_lost` | **Manual or Automated** | Biller marks result, or system detects. |
| `appeal_lost` → `in_appeal` | **Manual** | Biller. Creates new SM Appeal at level 2. |
| `appeal_lost` → `written_off` | **Manual** | Supervisor approval gate + mandatory reason code. |
| Any → `written_off` | **Manual** | Supervisor only. |
| Any → `voided` | **Manual** | Billing Coordinator only. Irreversible. |
| `paid` → reopened | **Manual** | Supervisor. Compliance implications, reason code mandatory. |
| Balance reaching zero → `closed` | **Automated** | System detects all balances zero. |
| Primary ERA + secondary payer on file → `pending_secondary` | **Automated** | System. |
| All payer adjudication complete → `patient_balance` | **Automated** | System. |
| `is_overdue` flag set | **Automated** | Scheduler. |

### The SM Claim State Log

Every state transition — automated or manual — is recorded in the SM Claim State Log. This is a standalone DocType, not a child table on SM Claim. It is the complete audit trail for every claim.

Each log entry captures:

| Field | What it records |
|-------|----------------|
| `claim` | Link to the SM Claim |
| `from_state` | State before the transition |
| `to_state` | State after the transition |
| `changed_at` | Exact timestamp |
| `changed_by` | User ID or system process identifier |
| `trigger_type` | One of: `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler` |
| `trigger_reference` | ERA name, webhook transaction ID, or other reference |
| `reason` | Human-readable reason — **mandatory for all manual transitions** |
| `paid_amount_at_change` | Financial snapshot at moment of transition |
| `adjustment_amount_at_change` | Financial snapshot |
| `patient_responsibility_at_change` | Financial snapshot |

The state log is your source of truth for answering "what happened to this claim and when." It is indexed for fast querying by claim, by time, and by target state.

---

## 4. Detailed Function Reference

### Feature 1: Claim State Machine Core

Feature 1 is the foundation. It provides the 19-state `canonical_state` field on SM Claim, the transition enforcement logic, the SM Claim State Log, and all supporting fields.

#### SM Claim — Supporting Fields

These fields are added to every SM Claim record to support the state machine:

| Field | Type | When it is set | Required? |
|-------|------|---------------|-----------|
| `canonical_state` | Select | Always present. Set on creation, updated on every transition. | Yes — always has a value. |
| `state_changed_at` | Datetime | Automatically set on every state transition. | Yes — system-managed. |
| `state_changed_by` | Data | Automatically set to the user ID or system process that triggered the transition. | Yes — system-managed. |
| `previous_state` | Data | Automatically set to the state before the last transition. Quick reference — full history is in the State Log. | Yes — system-managed after first transition. |
| `state_change_reason` | Small Text | Required for manual transitions. Optional for automated transitions (system populates with trigger details). | Conditional — mandatory for manual transitions. |
| `is_overdue` | Check | Set by the scheduler when a claim exceeds the expected payer timeline for its current state. | No — defaults unchecked. |
| `hold_reason` | Small Text | Must be filled when `canonical_state` = `held`. Explains why the claim is on hold. | Conditional — mandatory when held. |
| `secondary_payer` | Link (SM Payer) | Set when the patient has a secondary insurance payer on file. | No — only applicable for dual-coverage patients. |
| `patient_balance_amount` | Currency | Set when payer adjudication is complete and a patient responsibility balance remains. | No — zero by default. |
| `write_off_amount` | Currency | Set when a supervisor approves a write-off. | No — zero by default. |
| `write_off_approved_by` | Data | Set to the supervisor's user ID when they approve the write-off. | Conditional — mandatory when `canonical_state` = `written_off`. |

#### Transition Enforcement — `VALID_TRANSITIONS`

The `VALID_TRANSITIONS` dictionary in `sm_claim.py` defines every legal state transition. The `transition_state()` controller method checks this dictionary before executing any transition. If the requested transition is not in the dictionary, the system raises a validation error and the claim does not move.

**You cannot manually edit `canonical_state` to bypass this enforcement.** The field is only updated through the `transition_state()` method.

#### SM Claim State Log — Full Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `claim` | Link (SM Claim) | The claim this log entry belongs to. Indexed. |
| `from_state` | Data | The claim's state before this transition. |
| `to_state` | Data | The claim's state after this transition. |
| `changed_at` | Datetime | When the transition occurred. Indexed with `claim` for time-ordered queries. |
| `changed_by` | Data | User ID (e.g., `biller@willowcenter.com`) or system identifier (e.g., `webhook_835_processor`). |
| `trigger_type` | Select | One of five values: `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler`. |
| `trigger_reference` | Data | The specific transaction that caused this transition. For `webhook_835`, this is the ERA name. For `webhook_277ca`, this is the 277CA transaction ID. For `manual`, this may be blank. |
| `reason` | Small Text | Human-readable explanation. **Mandatory for all manual transitions.** Automated transitions populate this with system-generated detail (e.g., "835 ERA posted: paid $85.00, adjustment $15.00, patient responsibility $0.00"). |
| `paid_amount_at_change` | Currency | Total paid amount on the claim at the moment of this transition. |
| `adjustment_amount_at_change` | Currency | Total adjustment amount at the moment of this transition. |
| `patient_responsibility_at_change` | Currency | Patient responsibility balance at the moment of this transition. |

#### Database Indexes

These indexes are created automatically during deployment. They exist to ensure billing worklists, aging reports, and state log queries perform well at scale.

**On SM Claim:**

| Index name | Columns | Purpose |
|-----------|---------|---------|
| `idx_sm_claim_canonical_state` | `canonical_state` | Fast filtering by state (e.g., "show me all `denied` claims"). |
| `idx_sm_claim_state_payer` | `canonical_state`, `payer` | State + payer combination queries (e.g., "all `denied` claims from Aetna"). |
| `idx_sm_claim_state_date` | `canonical_state`, `date_of_service` | State + date range queries (e.g., "all `adjudicating` claims for services in March"). |

**On SM Claim State Log:**

| Index name | Columns | Purpose |
|-----------|---------|---------|
| `idx_state_log_claim` | `claim` | Retrieve all log entries for a specific claim. |
| `idx_state_log_claim_time` | `claim`, `changed_at` | Retrieve log entries for a claim in chronological order. |
| `idx_state_log_state` | `to_state`, `changed_at` | Find all transitions into a specific state within a date range (e.g., "all claims that entered `denied` this week"). |

---

### Feature 2: Automated EDI Transitions

Feature 2 delivers the webhook handlers that process incoming EDI transactions from Stedi and move claims automatically. Once a claim is `submitted`, the system handles all status updates without human intervention until a decision point is reached (payment, denial, or rejection).

#### 277CA Webhook Handler (BILL-011)

The 277CA is a claim status notification from the clearinghouse or payer. Stedi sends 277CA transactions to the Healthcare Billing Mojo via webhook. The handler parses the transaction and executes the appropriate state transition.

| 277CA Category Code | Meaning | State Transition | trigger_type |
|--------------------|---------|--------------------|--------------|
| A1 | Acknowledged/accepted by payer | `submitted` → `adjudicating` | `webhook_277ca` |
| A2 | Accepted for processing | `submitted` → `adjudicating` | `webhook_277ca` |
| R3 | Rejected by payer | `submitted` → `rejected` | `webhook_277ca` |
| A3 | Rejected by payer (alternate code) | `submitted` → `rejected` | `webhook_277ca` |

**Edge case category codes:**

| Code | Meaning | System behavior |
|------|---------|----------------|
| A0 | Forwarded to another entity | Logged to SM Claim State Log. No state transition. Claim remains in `submitted`. |
| E0 | Payer-level error (not claim-specific) | Logged to SM Claim State Log. No state transition. Flagged for admin review. |
| A4 | Claim not found by payer | Logged to SM Claim State Log. No state transition. Flagged for billing coordinator review. |

Every 277CA webhook interaction creates an SM Claim State Log entry with `trigger_type` = `webhook_277ca` and the 277CA transaction ID in `trigger_reference`.

#### 835 ERA State Machine Integration (BILL-012)

The 835 ERA (Electronic Remittance Advice) is the payer's payment and explanation. The existing ERA processing engine (BILL-004) is wired into the state machine so that payment posting and state transition happen atomically.

| ERA content | State Transition | trigger_type |
|------------|-----------------|--------------|
| Full payment (paid amount = billed amount minus contractual adjustments, no denial CARCs) | `adjudicating` → `paid` | `webhook_835` |
| Partial payment (paid amount > $0 but less than expected, with adjustment CARCs) | `adjudicating` → `partial_paid` | `webhook_835` |
| Zero payment with denial CARC codes | `adjudicating` → `denied` | `webhook_835` |
| Primary ERA with PR (patient responsibility) balance + secondary payer on file in `secondary_payer` field | `adjudicating` → `pending_secondary` (or `paid`/`partial_paid` → `pending_secondary`) | `webhook_835` |

**Concurrency control:** ERA processing uses `for_update=True` on the SM Claim document via a whitelisted Frappe method. This prevents concurrent ERA arrivals for the same claim from creating race conditions. If two ERAs arrive simultaneously for the same claim, one will complete and the second will wait for the lock, then re-evaluate.

**Financial snapshot:** At the moment of transition, the following values are captured in the SM Claim State Log entry:

- `paid_amount_at_change` — total amount paid by the payer
- `adjustment_amount_at_change` — total contractual and other adjustments
- `patient_responsibility_at_change` — remaining patient balance

---

### Feature 3: Denial Management

Feature 3 provides structured handling for denied claims. Every denial creates a record, gets AI classification, and appears in a prioritized worklist.

#### SM Denial DocType (BILL-013)

An SM Denial record is created automatically whenever a claim transitions to `denied`. A single claim can have multiple SM Denial records across its lifecycle (e.g., denied, corrected, resubmitted, denied again).

| Field | Type | Description |
|-------|------|-------------|
| `claim` | Link (SM Claim) | The denied claim. |
| `denial_date` | Date | The date the denial was received (from the 835 ERA). |
| `carc_codes` | Table | CARC (Claim Adjustment Reason Code) codes from the ERA. Each row is one CARC code. These are the payer's stated reasons for denial. |
| `rarc_codes` | Table | RARC (Remittance Advice Remark Code) codes from the ERA. Supplemental information from the payer. |
| `denial_reason_summary` | Small Text | System-generated plain-language summary of the denial reason, synthesized from CARC/RARC codes. |
| `appeal_deadline` | Date | Computed from the payer's appeal window. This is the date by which an appeal must be filed. **This field drives the priority sort in the denial worklist.** |
| `ai_category` | Select | AI classification: `correctable`, `appealable`, or `terminal`. Set by Bedrock. |
| `ai_appealable` | Check | Whether the AI assessment is that this denial is worth appealing. Set by Bedrock. |
| `ai_action` | Small Text | AI-recommended next action. Example: "Resubmit with corrected modifier. Original claim used modifier 25 which is not supported for this CPT/payer combination." |
| `ai_confidence` | Float | AI confidence score for the classification (0.0 to 1.0). |

#### AI Denial Classification (BILL-014)

Triggered automatically on SM Denial creation. Uses AWS Bedrock (HIPAA BAA covered, pay-per-token) to classify the denial based on:

- CARC codes on the denial
- Payer identity
- CPT code(s) on the claim

The AI populates four fields:

| Field | What the AI sets | Example |
|-------|-----------------|---------|
| `ai_category` | `correctable` — the claim can be fixed and resubmitted. `appealable` — the claim requires a formal appeal with supporting documentation. `terminal` — the denial is valid and unlikely to be overturned. | `correctable` |
| `ai_appealable` | Boolean indicating whether the denial merits appeal effort. | `true` |
| `ai_action` | Specific recommended action for the biller. | "Resubmit with updated authorization number. CARC 15 indicates the authorization was expired at time of service. Verify current auth and attach to corrected claim." |
| `ai_confidence` | Confidence level of the classification. | `0.87` |

**The AI does not change claim state.** Classification is advisory. The biller reviews the AI recommendation and decides the next action — correct and resubmit, appeal, or write off.

#### Denial Worklist Endpoint (BILL-015)

**Endpoint:** `/api/modules/billing/denials/worklist`

Returns all open (unresolved) SM Denial records, organized for efficient daily processing:

**Grouping:** Denials are grouped by `ai_category`:
1. **Correctable** — shown first (fastest to resolve, highest ROI on biller time)
2. **Appealable** — shown second
3. **Terminal** — shown last

**Sorting within each group:** By `appeal_deadline` ascending — soonest deadlines first.

**Filters available:**
- Payer
- Date range (denial date)

**What the worklist shows for each denial:**
- Claim reference and patient name
- Payer name
- CARC codes
- Denial reason summary
- AI category and recommended action
- Appeal deadline
- Days until deadline (computed)
- AI confidence score

---

### Feature 4: Appeal Lifecycle

Feature 4 provides the complete appeal workflow — from the decision to appeal through result tracking, second-level appeals, and write-off approval for unrecoverable amounts.

#### SM Appeal DocType (BILL-016)

SM Appeal records are created manually by a biller. Creating an SM Appeal triggers the `denied` → `in_appeal` state transition on the linked claim.

| Field | Type | Description |
|-------|------|-------------|
| `claim` | Link (SM Claim) | The claim being appealed. |
| `denial` | Link (SM Denial) | The specific denial event being appealed. |
| `appeal_level` | Select (1 or 2) | First-level or second-level appeal. A second-level appeal is created from `appeal_lost` → `in_appeal` transition. |
| `submitted_date` | Date | Date the appeal was submitted to the payer. |
| `payer_deadline` | Date | Deadline for payer response. |
| `days_until_deadline` | Int (computed) | Days remaining until the payer deadline. Computed field, always current. |
| `appeal_letter` | Long Text | The appeal letter content. Initially populated by AI (Bedrock), then reviewed and edited by the biller before submission. |
| `supporting_docs` | Attach Multiple | Clinical documentation, authorization records, or other supporting materials attached by the biller. |
| `result` | Select | `won`, `lost`, or `pending`. |
| `result_date` | Date | Date the appeal result was received. |
| `result_notes` | Small Text | Notes about the appeal outcome. |

#### Appeal Letter Generation (BILL-017)

Triggered automatically when an SM Appeal is created. Uses AWS Bedrock to generate a draft appeal letter based on:

- CARC and RARC codes from the linked SM Denial
- Payer name
- CPT code(s) from the claim
- Date of service

The generated letter is populated into the `appeal_letter` field. **The letter is never auto-submitted.** The biller must:

1. Review the generated letter
2. Edit as needed (add clinical detail, correct any inaccuracies)
3. Approve the final version
4. Submit to the payer portal manually (appeal portal automation is on the extension roadmap but not in scope)

#### Appeal State Transitions (BILL-018)

| Transition | Trigger | Requirements | What happens |
|-----------|---------|-------------|--------------|
| `denied` → `in_appeal` | Biller creates SM Appeal | Clinical doc review complete. Conscious decision. | SM Appeal created at level 1. Claim state updates. Logged to SM Claim State Log. |
| `in_appeal` → `appeal_won` | Biller marks result or system detects via ERA reversal | `result` set to `won` on SM Appeal. `result_date` set. | Claim may then transition to `adjudicating` to await payment ERA. Logged. |
| `in_appeal` → `appeal_lost` | Biller marks result or system detects | `result` set to `lost` on SM Appeal. `result_date` set. | Claim awaits next action: second-level appeal or write-off. Logged. |
| `appeal_lost` → `in_appeal` | Biller creates new SM Appeal at level 2 | New SM Appeal created with `appeal_level` = 2, linked to same claim and same SM Denial. | Second-level appeal initiated. Logged. |
| `appeal_won` → `adjudicating` | System or biller | Appeal won, awaiting payer to reprocess and issue payment. | Claim returns to adjudication to await ERA. Logged. |
| `appeal_lost` → `written_off` | Supervisor | Supervisor approval gate. `write_off_amount`, `write_off_approved_by`, and `state_change_reason` all mandatory. | Claim terminally written off. Logged. |

---

### Feature 5: AR Dashboard Data Layer

Feature 5 provides the API endpoints that power accounts receivable reporting. These are data-layer endpoints only — no UI. They return structured data consumed by the React frontend (designed separately).

#### AR Summary Endpoint (BILL-019)

**Endpoint:** `/api/modules/billing/ar/summary`

**Returns:**
- Total claims by `canonical_state` (count per state)
- Total billed amount
- Total paid amount
- Total denied amount
- Total in appeal (count and amount)
- Total patient balance
- Total written off

**Filters:** Per-client, date-range filterable.

**Use case:** Daily check on overall AR health. "How much money is out there, and where is it?"

#### Aging Report Endpoint (BILL-020)

**Endpoint:** `/api/modules/billing/ar/aging`

**Returns:** Claims bucketed by days in current state:

| Bucket | Description |
|--------|------------|
| 0–30 days | Current — within normal processing window |
| 31–60 days | Aging — may need attention depending on payer |
| 61–90 days | Overdue — likely needs intervention |
| 90+ days | Critical — significant revenue at risk |

Each bucket is broken down by payer. Claims with `is_overdue` = true are flagged.

**Filters:** By `canonical_state`, by payer.

**Use case:** "Which payers are sitting on our claims the longest? Which claims need follow-up right now?"

#### Denial Analytics Endpoint (BILL-021)

**Endpoint:** `/api/modules/billing/ar/denials`

**Returns:**
- Denial rate by payer (this month vs. last month — trend analysis)
- Denial rate by CPT code
- Top 10 CARC codes this period
- Average days from denial to resolution, broken down by `ai_category`

**Use case:** "Where is our money getting stuck? Are we seeing a pattern with a specific payer or code? Are our correctable denials being resolved fast enough?"

---

## 5. Operational Scenarios

### Scenario 1: How to handle a CO-45 denial using the denial worklist

**Context:** CO-45 (Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement) is one of the most common denial CARC codes. It typically means the billed amount exceeds the payer's contracted rate.

**Steps:**

1. Open the denial worklist at `/api/modules/billing/denials/worklist`.
2. Locate the denial. CO-45 denials are typically classified by the AI as `correctable` (if the fee schedule is wrong) or `terminal` (if the contractual adjustment is correct and this is actually a partial payment issue misread as a denial).
3. Read the `ai_action` recommendation. Example: "CARC 45 indicates the billed amount exceeds the contracted rate. Verify the fee schedule for this payer and CPT code. If the fee schedule is correct, this may be a contractual adjustment rather than a true denial — check whether a payment was also posted."
4. Open the linked SM Claim. Review the billed amount against your contracted rate with this payer.
5. **If the fee schedule was wrong on the claim:** Transition the claim from `denied` → `draft` (manual, biller role). In the `state_change_reason`, note "Correcting billed amount to match contracted fee schedule." Correct the billed amount. The claim will go through the scrubber again and, if it passes, transition to `validated` for resubmission.
6. **If the contractual adjustment is correct and there was actually a payment:** This is likely a partial payment categorized as a denial because the paid amount was less than billed. Check the 835 ERA details in the SM Claim State Log financial snapshot. The `paid_amount_at_change` should show the amount paid. If payment was posted, the claim may need to be reclassified — contact your Spark Mojo admin.
7. **If the payer truly denied the full amount based on fee schedule and your fee schedule is correct:** This may be appealable. Create an SM Appeal (see Scenario 5). Attach your payer contract showing the agreed rate.

---

### Scenario 2: How to process a partial payment ERA

**Context:** An 835 ERA arrives with a payment amount less than the billed amount. The claim transitions automatically from `adjudicating` → `partial_paid`.

**Steps:**

1. The system automatically transitions the claim to `partial_paid` when the 835 posts. No action needed so far.
2. Open the SM Claim. Review the financial snapshot captured in the SM Claim State Log: `paid_amount_at_change`, `adjustment_amount_at_change`, `patient_responsibility_at_change`.
3. Review the adjustment reason codes (CARCs) on the ERA:
   - **CO (Contractual Obligation) adjustments:** These are expected. The difference between billed and paid is your contractual write-off with this payer. If CO adjustments account for the full difference between billed and paid, the claim is correctly adjudicated.
   - **PR (Patient Responsibility) adjustments:** These indicate the patient owes the remaining balance (deductible, copay, coinsurance).
   - **OA (Other Adjustment) codes:** Review individually. May indicate coordination of benefits issues.
4. **If the patient has a secondary payer** and the `secondary_payer` field is populated on the SM Claim: The system will automatically transition the claim to `pending_secondary`. For pilot, secondary payer submission is manual — submit the claim to the secondary payer through their portal with the primary ERA attached.
5. **If there is no secondary payer and the remaining balance is patient responsibility:** The system will transition the claim to `patient_balance`. The `patient_balance_amount` field will reflect the amount owed. Patient statement generation and collection is handled through Billing and Payments (separate capability).
6. **If the payment amount seems incorrect** (not matching your contracted rate and not explained by patient responsibility): Flag for review. Consider appealing — create an SM Denial record manually if one was not auto-created, then proceed to appeal workflow.

---

### Scenario 3: How to resubmit a rejected claim after 277CA rejection

**Context:** A 277CA webhook returned category R3 or A3, and the claim moved to `rejected`. This means the claim was rejected at the clearinghouse or payer gateway level — it never reached adjudication.

**Steps:**

1. Open the SM Claim. The `canonical_state` will be `rejected`.
2. Check the SM Claim State Log for the rejection entry. The `trigger_reference` field contains the 277CA transaction ID. The `reason` field will contain the rejection reason text from the 277CA.
3. Common rejection reasons and their fixes:
   - **Invalid subscriber ID:** Correct the patient's insurance member ID on the claim.
   - **Invalid NPI:** Verify the rendering provider NPI is correct and enrolled with Stedi for this payer.
   - **Duplicate claim:** A claim for the same patient, date of service, and CPT code was already submitted. Investigate whether the original claim is still in process.
   - **Invalid CPT/diagnosis code combination:** Review the diagnosis codes linked to the CPT code on the claim.
4. Transition the claim from `rejected` → `draft` (manual, biller role). Provide the correction being made in `state_change_reason`.
5. Make the necessary corrections on the claim in `draft` state.
6. The claim will run through the scrubber again. If it passes all checks, it transitions to `validated`.
7. From `validated`, the system submits the corrected 837P to Stedi. The claim transitions to `submitted` and the lifecycle begins again.
8. Monitor for the next 277CA to confirm the resubmitted claim is accepted (`submitted` → `adjudicating`).

---

### Scenario 4: How to place and release a claim hold

**Context:** A biller needs to hold a claim from submission while investigating an issue — perhaps waiting for updated insurance information from the patient, or questioning the CPT code selected by the clinician.

**Placing a hold:**

1. Open the SM Claim. It must be in a pre-submission state (`draft`, `pending_info`, `pending_auth`, or `validated`).
2. Transition the claim to `held`. This is a manual transition requiring biller role.
3. The `hold_reason` field is **mandatory**. Enter a clear description: "Waiting for updated insurance card from patient — called 4/9, expects to bring card to next appointment 4/15." or "Questioning CPT 90837 vs 90834 — session was 48 minutes, need clinician confirmation."
4. The claim will not be submitted while in `held` state.

**Releasing a hold:**

1. When the issue is resolved, open the SM Claim.
2. Transition from `held` back to the appropriate pre-submission state (typically `draft` to re-run the scrubber).
3. Provide the resolution in `state_change_reason`: "Insurance card updated. Corrected member ID."
4. The claim re-enters the normal flow — scrubber runs, and if all checks pass, it transitions to `validated` → `submitted`.

---

### Scenario 5: How to initiate a first-level appeal after denial

**Context:** A claim has been denied and the AI classified it as `appealable`. The biller has reviewed the clinical documentation and determined an appeal is warranted.

**Steps:**

1. Open the SM Denial record from the denial worklist. Review the CARC codes, RARC codes, and `ai_action` recommendation.
2. Confirm the `appeal_deadline` has not passed. If it has, consult your supervisor — late appeals are rarely accepted.
3. Create a new SM Appeal record:
   - `claim`: Link to the SM Claim
   - `denial`: Link to this SM Denial
   - `appeal_level`: 1
   - `payer_deadline`: Set based on payer's appeal response window
4. **On creation, the system automatically:**
   - Transitions the claim from `denied` → `in_appeal`
   - Triggers AI appeal letter generation via Bedrock
   - Logs the transition to SM Claim State Log with `trigger_type` = `manual`
5. Wait for the `appeal_letter` field to populate (typically seconds).
6. **Review and edit the AI-generated letter.** The letter is a draft — verify clinical accuracy, add specific details from the patient's record, and ensure it addresses the specific CARC/RARC codes.
7. Attach supporting documentation in the `supporting_docs` field: clinical notes, authorization letters, medical necessity documentation.
8. Submit the appeal to the payer portal manually. (Appeal portal automation is a future extension.)
9. Set the `submitted_date` on the SM Appeal.
10. Monitor the appeal by tracking `days_until_deadline` on the SM Appeal record.

---

### Scenario 6: How to initiate a second-level appeal after `appeal_lost`

**Context:** A first-level appeal was denied. The claim is in `appeal_lost`. The biller and supervisor believe there are additional grounds for appeal.

**Steps:**

1. Open the SM Claim. Verify `canonical_state` = `appeal_lost`.
2. Review the first SM Appeal record (level 1). Read the `result_notes` to understand why the payer denied the first appeal.
3. Determine whether a second-level appeal is warranted:
   - Does the payer accept second-level appeals? (Check payer-specific rules.)
   - Is there additional clinical documentation that was not included in the first appeal?
   - Is there a regulatory or contractual basis for the appeal?
4. Create a new SM Appeal record:
   - `claim`: Same SM Claim
   - `denial`: Same SM Denial
   - `appeal_level`: **2**
   - `payer_deadline`: Set per payer's second-level appeal window (often shorter than first level)
5. **On creation, the system automatically:**
   - Transitions the claim from `appeal_lost` → `in_appeal`
   - Triggers AI appeal letter generation (will reference level 2 context)
   - Logs the transition to SM Claim State Log
6. The AI will generate a new appeal letter. Review and edit it — a second-level appeal typically requires stronger clinical justification than the first.
7. Attach any new supporting documentation.
8. Submit to the payer manually and set `submitted_date`.
9. If this second-level appeal is also lost (`in_appeal` → `appeal_lost`), the typical next step is write-off (see Scenario 7). Most payers do not accept a third-level appeal.

---

### Scenario 7: How to authorize a write-off as a supervisor

**Context:** A claim has exhausted its appeal options (or was classified as `terminal` by the AI and the biller concurs). The amount needs to be written off. Only a supervisor can authorize this.

**Steps:**

1. The biller or billing coordinator requests write-off approval, providing the claim reference and justification.
2. As supervisor, open the SM Claim. Verify the claim history in the SM Claim State Log — confirm that appropriate efforts were made to collect (appeal attempts, corrections, etc.).
3. Transition the claim to `written_off`. This transition requires:
   - **Supervisor role** — the system will reject this transition from a biller account
   - **`state_change_reason`** — mandatory. Provide a clear reason: "Appeal exhausted at level 2. CARC 50 — non-covered service per payer policy. No further appeal avenue available."
   - **`write_off_amount`** — the dollar amount being written off
4. On transition:
   - `write_off_approved_by` is automatically set to your user ID
   - The transition is logged to SM Claim State Log with `trigger_type` = `manual`
   - `canonical_state` becomes `written_off` (terminal state)
5. The claim is now closed for billing purposes. This is reflected in the AR summary endpoint and denial analytics.

**Important:** Write-offs are a terminal state. A written-off claim cannot be reopened. Verify the amount and justification before approving.

---

### Scenario 8: How to handle a claim stuck in `adjudicating` beyond expected payer timeline

**Context:** A claim has been in `adjudicating` for 45+ days. The scheduler has set `is_overdue` = true. No 835 ERA has arrived.

**Steps:**

1. Open the aging report at `/api/modules/billing/ar/aging`. Filter by `canonical_state` = `adjudicating` and the 31–60 day bucket.
2. Identify the overdue claim. Check the SM Claim State Log for the last activity — when did the 277CA move it to `adjudicating`?
3. Check whether the payer is known for slow processing. Review the denial analytics endpoint for this payer's average days to resolution.
4. Verify with Stedi that the claim was successfully delivered. The `trigger_reference` on the `submitted` → `adjudicating` log entry contains the 277CA transaction reference.
5. Contact the payer directly to inquire about claim status. Note the reference number and any information received.
6. If the payer confirms the claim was processed and payment was sent, check whether the ERA was received by Stedi. A missing ERA may indicate a Stedi enrollment or routing issue — escalate to your Spark Mojo admin.
7. If the payer has no record of the claim despite the 277CA acknowledgment, this is a rare clearinghouse issue. Work with the Spark Mojo admin and Stedi support.
8. **Do not manually transition the claim out of `adjudicating` to force progress.** The system expects an 835 ERA to drive the next transition. Manual state changes here will break the financial posting workflow.
9. If the claim ultimately needs to be voided and resubmitted (e.g., payer lost the claim), the billing coordinator transitions `adjudicating` → `voided` (if valid transition), and a new claim is created and submitted.

---

### Scenario 9: How to handle a `pending_auth` claim when authorization is obtained

**Context:** The scrubber flagged a claim because no valid authorization was on file. This is behavioral health–specific — it only occurs when `session_count_auth_enabled` is `true` in the vertical template.

**Steps:**

1. Open the SM Claim. `canonical_state` = `pending_auth`.
2. Check the reason the authorization was flagged:
   - **No authorization record exists** for this patient/payer/service type.
   - **Authorization exists but authorized sessions are exhausted** — all authorized sessions have been used.
   - **Authorization expired** before the date of service on this claim.
3. Obtain the authorization:
   - If new authorization is needed, contact the payer to request authorization. This is done outside the Healthcare Billing Mojo (typically via the payer's provider portal or phone).
   - If authorization exists in another system, enter it into the platform.
4. Once the authorization is on file and covers the date of service, transition the claim from `pending_auth` → `draft` to re-run the scrubber.
5. The scrubber will re-validate. If the authorization now passes and no other issues exist, the claim transitions `draft` → `validated`.
6. From `validated`, the claim is submitted to Stedi as normal.

**Note:** If you cannot obtain authorization retroactively (some payers do not allow retroactive auth), you may need to discuss write-off with a supervisor or attempt to bill the patient directly via the patient balance workflow.

---

### Scenario 10: How to investigate and resolve a `pending_info` claim

**Context:** The scrubber flagged a claim for missing patient demographics or eligibility data. The claim cannot proceed until the information is provided.

**Steps:**

1. Open the SM Claim. `canonical_state` = `pending_info`.
2. Check the SM Claim State Log for the `draft` → `pending_info` transition entry. The `reason` field will specify what data is missing. Common examples:
   - Missing patient date of birth
   - Missing or invalid subscriber ID / member ID
   - No eligibility verification on file for date of service
   - Missing rendering provider NPI
   - Missing diagnosis code
3. For **missing patient data**, update the patient record with the correct information. Contact the patient or front-desk staff if needed.
4. For **missing eligibility verification**, run an eligibility check through BILL-005 (on-demand eligibility verification). This queries the payer in real time and returns current coverage status.
5. For **missing provider data**, verify the rendering provider's NPI is correctly linked to the claim and enrolled with Stedi for this payer.
6. Once all missing data is resolved, transition the claim from `pending_info` → `draft` to re-run the scrubber.
7. The scrubber re-validates. If all checks pass: `draft` → `validated` → `submitted`.

---

### Scenario 11: How to void a claim

**Context:** A claim was submitted in error — wrong patient, duplicate submission, or created from a cancelled appointment. The claim must be permanently removed from the active AR.

**Steps:**

1. Confirm voiding is appropriate. Voiding is **irreversible**. A voided claim cannot be unvoided, appealed, or resubmitted. If the claim just needs correction, use the `denied` → `draft` correction workflow instead.
2. Only a **Billing Coordinator** can void a claim.
3. Open the SM Claim. Transition to `voided`.
4. `state_change_reason` is mandatory. Provide specific justification: "Duplicate claim — same date of service and CPT code already submitted and paid under CLM-2024-003847." or "Claim created from cancelled appointment. Service was not rendered."
5. The transition is logged to SM Claim State Log. The claim enters the terminal `voided` state permanently.

---

### Scenario 12: How to reopen a paid claim (supervisor only)

**Context:** A paid claim needs to be reopened due to a discovered error — perhaps the payment was posted to the wrong claim, or the claim was paid incorrectly and needs to be refunded and resubmitted.

**Steps:**

1. Only a **Supervisor** can reopen a paid claim. This has compliance implications.
2. Open the SM Claim. `canonical_state` = `paid`.
3. Transition the claim from `paid` to the appropriate state (the valid target depends on the specific `VALID_TRANSITIONS` configuration — typically back to `draft` or `adjudicating`).
4. `state_change_reason` is **mandatory** and should be detailed: "Payment posted incorrectly. ERA applied to wrong claim. Refund requested from payer. Reopening to correct provider NPI and resubmit."
5. The transition is logged with full financial snapshot — the `paid_amount_at_change` at the time of reopening is captured for audit purposes.
6. After reopening, handle the claim through the normal correction and resubmission workflow.

**Warning:** Reopening paid claims is a compliance-sensitive action. The SM Claim State Log provides a complete audit trail. Ensure the reason is well documented.

---

## 6. Troubleshooting

### Common Error States and How to Resolve Them

#### "Transition not allowed" validation error

**Symptom:** Attempting to change a claim's state results in a validation error: "Transition from [current_state] to [target_state] is not allowed."

**Cause:** The `VALID_TRANSITIONS` dictionary in `sm_claim.py` does not include this state combination. The system is enforcing a legitimate business rule.

**Resolution:**
1. Check the current `canonical_state` on the claim.
2. Refer to the 19-state model in [Section 3](#3-key-concepts-before-you-start) to determine what transitions are valid from the current state.
3. If you believe the transition should be valid, escalate to your Spark Mojo admin — this may indicate a product gap.
4. **Never attempt to edit `canonical_state` directly in the database.** This will break the audit trail and potentially corrupt the claim's financial data.

---

#### Claim stuck in `submitted` — no 277CA received

**Symptom:** A claim has been in `submitted` state for more than 48 hours with no 277CA acknowledgment or rejection.

**Possible causes:**
- Stedi webhook delivery failure
- Payer not enrolled or enrollment not yet active in Stedi
- Stedi connectivity issue (rare)
- Claim format issue that Stedi accepted but the payer cannot parse

**Resolution:**
1. Check Stedi's dashboard for the 837P submission status. Verify the transaction ID captured in the SM Claim State Log entry for the `validated` → `submitted` transition.
2. If Stedi shows the claim was delivered and a 277CA was returned, the webhook may have failed. Escalate to Spark Mojo admin to check webhook logs and manually replay the transaction.
3. If Stedi shows no 277CA was returned by the payer, contact the payer to confirm they received the claim.
4. If the payer enrollment in Stedi is not active, the claim cannot be processed. Resolve the enrollment issue, then void the claim and resubmit after enrollment is confirmed.

---

#### 835 ERA arrived but claim did not transition

**Symptom:** An 835 ERA was received and is visible in the system, but the corresponding SM Claim is still in `adjudicating`.

**Possible causes:**
- The claim reference on the ERA does not match the SM Claim (claim number or subscriber ID mismatch)
- Concurrency lock timeout (rare — the `for_update=True` lock could not be acquired)
- The ERA was processed but the transition failed validation (e.g., claim was manually moved out of `adjudicating` before the ERA posted)

**Resolution:**
1. Check the SM Claim State Log for any recent entries. If the ERA attempted to post and failed, there may be an error log entry.
2. Verify the claim reference number on the ERA matches the SM Claim.
3. Check whether the ERA was posted to a different SM Claim (possible if claim numbers are similar or if the ERA references an original claim number that was changed during correction).
4. Escalate to Spark Mojo admin. They can review the ERA processing logs and, if needed, manually trigger the ERA-to-claim matching and state transition.

---

#### SM Denial created but AI fields are empty

**Symptom:** An SM Denial record exists but `ai_category`, `ai_appealable`, `ai_action`, and `ai_confidence` are all blank.

**Possible causes:**
- AWS Bedrock API failure (timeout, service disruption)
- CARC codes on the denial are not recognized by the AI model
- Bedrock configuration issue (wrong model ID, expired credentials)

**Resolution:**
1. Check the system error logs for Bedrock API errors around the time the SM Denial was created.
2. If it was a transient Bedrock failure, the admin can manually retrigger the AI classification for this denial.
3. If CARC codes are unusual or very new, the AI may not have training data for them. In this case, the biller should classify the denial manually based on their experience and payer knowledge.
4. Confirm Bedrock is configured correctly per DECISION-027. Check that the vault reference `vault:[client]/bedrock` is valid.

---

#### Claim in `pending_info` but all data appears complete

**Symptom:** The scrubber moved a claim to `pending_info`, but when you review the claim, all fields appear to be filled in.

**Possible causes:**
- Data format issue — a field is populated but in the wrong format (e.g., member ID has leading spaces, date of birth is in wrong format)
- Eligibility verification is on file but expired (eligibility was checked months ago and is no longer current)
- A linked record (patient, provider, payer) has missing required fields that the claim inherits

**Resolution:**
1. Check the SM Claim State Log for the `draft` → `pending_info` transition. The `reason` field should specify the exact validation that failed.
2. If the reason references eligibility, run a fresh eligibility check via BILL-005.
3. If the reason references a linked record, open the patient, provider, or payer record and check for missing fields.
4. If the reason is unclear, escalate to Spark Mojo admin to review the scrubber validation logs.

---

#### Multiple SM Denial records for the same claim

**Symptom:** A claim has two or more SM Denial records.

**This is expected behavior, not an error.** A claim can be denied, corrected, resubmitted, and denied again. Each denial event creates a new SM Denial record. The denial worklist will show the most recent unresolved denial.

**How to interpret:**
1. Review each SM Denial record in order of `denial_date`.
2. If the CARC codes are different between denials, each denial has a different root cause — the correction for the first denial may have introduced a new issue.
3. If the CARC codes are the same, the correction may not have been effective. Review the AI recommendation on the latest denial for updated guidance.

---

#### Write-off transition rejected — "Supervisor role required"

**Symptom:** Attempting to transition a claim to `written_off` results in a permission error.

**Cause:** The `written_off` transition requires the Supervisor role. Billers and billing coordinators cannot approve write-offs.

**Resolution:**
1. A supervisor must execute this transition. The biller should request write-off approval from their supervisor, providing the claim reference, amount, and justification.
2. If you are a supervisor and still receiving this error, verify your user account has the Supervisor role assigned in the platform. Contact your Spark Mojo admin if the role is not assigned.

---

#### `is_overdue` flag set on a claim that is processing normally

**Symptom:** A claim has `is_overdue` = true, but you know the payer typically takes this long to process.

**Cause:** The scheduler sets `is_overdue` based on a default expected payer timeline. Some payers (especially Medicaid and certain government payers) have longer processing windows.

**Resolution:**
1. This flag is informational — it does not block any transition.
2. If you know the payer's timeline is longer than the default, note it in your workflow but no system action is needed.
3. If this is consistently wrong for a specific payer, report to your Spark Mojo admin. Payer-specific timeline configuration may be a future enhancement (see EXTENSION-ROADMAP: predictive aging alerts).

---

## 7. FAQ

### General Platform Questions

**Q1: What is the relationship between `canonical_state` and the Display Label shown in the UI?**

Every `canonical_state` value has a corresponding Display Label. For example, `partial_paid` displays as "Partial Pay" and `in_appeal` displays as "In Appeal." The underlying state name (e.g., `partial_paid`) is what appears in API responses, logs, and filters. The Display Label is what you see in the React interface. They always map one-to-one — see the full mapping in [Section 3](#3-key-concepts-before-you-start).

---

**Q2: Can I edit the `canonical_state` field directly on an SM Claim?**

No. The `canonical_state` field can only be changed through the `transition_state()` controller method, which validates the transition against the `VALID_TRANSITIONS` dictionary. Direct edits (even by admins) are rejected. This is by design — it protects the audit trail and financial integrity.

---

**Q3: Why is SM Claim State Log a standalone DocType and not a child table on SM Claim?**

Performance. As a claim accumulates transitions (especially long-lived claims with denials and appeals), the state history grows. If it were a child table, every read of the SM Claim document would load the full history. As a standalone DocType, it is loaded separately only when needed. This keeps claim reads fast regardless of history depth.

---

**Q4: What happens to existing claims when the system is upgraded from 12 states to 19 states?**

A migration script runs automatically on deploy. The only rename is `appealed` → `in_appeal`. All other existing state values map directly to the new 19-state model. No data is lost. All existing SM Claim State Log entries are preserved.

---

**Q5: What clearinghouse does this use? Can I keep my current clearinghouse?**

The Healthcare Billing Mojo uses **Stedi** exclusively. There is no multi-clearinghouse support. Practices re-enroll payers through Stedi as part of Spark Mojo onboarding. If your practice has a contractual obligation to a specific clearinghouse that prevents switching, the Healthcare Billing Mojo cannot be used. This is a conscious scope boundary.

---

### State Machine and Transitions

**Q6: What does `trigger_type` on the SM Claim State Log mean? What are the possible values?**

`trigger_type` tells you what caused the state transition:

| Value | Meaning |
|-------|---------|
| `manual` | A human user initiated this transition (biller, coordinator, supervisor) |
| `webhook_277ca` | A 277CA transaction from Stedi triggered this transition |
| `webhook_835` | An 835 ERA from Stedi triggered this transition |
| `api` | An API call triggered this transition |
| `scheduler` | A scheduled system job triggered this transition (e.g., setting `is_overdue`) |

---

**Q7: Can a claim go from `denied` directly to `written_off`, or does it have to go through appeal first?**

A claim can go from `denied` → `written_off` directly, but it requires supervisor approval and a mandatory reason code. Not every denial warrants an appeal — for example, if the AI classifies a denial as `terminal` and the supervisor agrees, writing it off without appeal is appropriate. However, most practices will want to document why they chose not to appeal.

---

**Q8: What states are terminal? Can a claim ever leave a terminal state?**

Three states are terminal: `written_off`, `closed`, and `voided`. Claims in `written_off` and `voided` cannot be reopened. Claims in `closed` can only be reopened under exceptional circumstances (e.g., a recoupment notice from a payer). The `paid` state is *not* terminal — paid claims can be reopened by a supervisor with a mandatory reason code.

---

**Q9: What happens if a 277CA does not arrive for a submitted claim?**

The claim stays in `submitted`. The scheduler will eventually flag it as `is_overdue`. This is the prompt for a billing coordinator to investigate — see [Scenario 8](#scenario-8-how-to-handle-a-claim-stuck-in-adjudicating-beyond-expected-payer-timeline) (adapted for `submitted` state). The system does not auto-escalate or auto-void. Human investigation is required.

---

**Q10: Is the `pending_auth` state used for all specialties?**

No. `pending_auth` is behavioral health–specific. It is only active when `session_count_auth_enabled` is `true` in the vertical template (`behavioral_health.yaml`). For other healthcare verticals (physical therapy, family medicine, etc.), this flag is `false` and the `pending_auth` state is never entered. The scrubber skips the authorization check entirely.

---

### Denial and Appeal Questions

**Q11: How does the AI decide whether a denial is correctable, appealable, or terminal?**

The AI (AWS Bedrock) analyzes the combination of CARC codes, the payer, and the CPT codes on the claim. The three categories mean:

- **Correctable:** The claim has an error that can be fixed and the claim resubmitted (e.g., wrong modifier, missing authorization number, incorrect subscriber ID). Highest recovery probability.
- **Appealable:** The claim is clinically correct but the payer needs additional justification or documentation. Requires a formal appeal.
- **Terminal:** The denial is valid per payer policy and is unlikely to be overturned (e.g., non-covered service, timely filing limit exceeded). Lowest recovery probability.

The `ai_confidence` field (0.0 to 1.0) indicates how confident the AI is in its classification. Low confidence (below 0.7) should prompt the biller to apply their own judgment.

---

**Q12: Can I override the AI's denial classification?**

The AI classification is advisory — it populates fields on the SM Denial record but does not control claim state. You can take any valid action regardless of the AI's recommendation. If the AI says `terminal` but you believe the denial is appealable, create an SM Appeal. If the AI says `correctable` but you believe it is not worth the effort, request a write-off from your supervisor.

---

**Q13: How many levels of appeal are supported?**

Two. The `appeal_level` field on SM Appeal accepts values 1 or 2. After a second-level appeal loss (`appeal_lost` after level 2), the standard path is write-off. Most payers do not accept a third-level appeal through standard channels.

---

**Q14: Is the appeal letter submitted automatically to the payer?**

No. The AI generates a draft letter into the `appeal_letter` field on SM Appeal. The biller must review the letter, edit it, attach supporting documentation in `supporting_docs`, and then manually submit to the payer's portal. Appeal portal submission automation is on the extension roadmap but is not in the current scope.

---

**Q15: What happens when an appeal is won? Does the money post automatically?**

When a claim transitions from `in_appeal` → `appeal_won`, it then transitions to `adjudicating` to await the payer's reprocessed payment. When the payer issues payment, an 835 ERA arrives and the system posts the payment and transitions the claim to `paid` or `partial_paid` — the same automated flow as any other ERA. The appeal win itself does not post money; it puts the claim back in line to receive payment.

---

### Secondary Payer and Patient Balance

**Q16: How does the system know to transition a claim to `pending_secondary`?**

Two conditions must both be true: (1) the 835 ERA from the primary payer includes PR (Patient Responsibility) adjustment codes indicating a remaining balance, and (2) the `secondary_payer` field on the SM Claim is populated with a valid SM Payer link. If both conditions are met, the system automatically transitions the claim to `pending_secondary`.

---

**Q17: Is secondary payer submission automated?**

No, not in the current version. The `pending_secondary` state exists and the system correctly routes claims there, but the actual 837P submission to the secondary payer is manual for pilot. The biller submits through the secondary payer's portal with the primary ERA attached. Automated secondary payer submission is on the extension roadmap.

---

**Q18: When does a claim reach `patient_balance`?**

A claim reaches `patient_balance` when all payer adjudication is complete and a balance remains that is the patient's responsibility. This typically happens after primary (and secondary, if applicable) payer processing is done and the remaining balance is for deductible, copay, or coinsurance. The `patient_balance_amount` field shows the amount owed. Patient collection is handled through the Billing and Payments capability — a separate system.

---

### AR Dashboard and Reporting

**Q19: What does the `is_overdue` flag mean and who sets it?**

`is_overdue` is a Check (boolean) field on SM Claim. It is set by the system scheduler — not by a human. The scheduler evaluates all active claims and flags any claim that has been in its current state longer than the expected payer timeline. This flag is used by the aging report endpoint to highlight claims needing attention. It does not trigger any state transition or block any workflow.

---

**Q20: How is denial rate calculated in the denial analytics endpoint?**

The denial analytics endpoint (`/api/modules/billing/ar/denials`) calculates denial rate as: **(number of claims that entered `denied` state in the period) ÷ (total claims adjudicated in the period)**. "Adjudicated" means claims that reached `paid`, `partial_paid`, or `denied`. This is calculated per payer and per CPT code. The endpoint also provides month-over-month comparison (this month vs. last month) to identify trends.

---

**Q21: Can I filter the AR aging report by a specific payer?**

Yes. The aging report endpoint (`/api/modules/billing/ar/aging`) accepts both `canonical_state` and `payer` as filter parameters. For example, you can request "all claims in `adjudicating` state from BlueCross in the 31–60 day bucket" to investigate a specific payer's processing delays.

---

### Configuration and Onboarding

**Q22: What is the vertical template and can I edit it?**

The vertical template (e.g., `behavioral_health.yaml`) sets default configuration for a healthcare specialty: CPT code defaults, the `session_count_auth_enabled` flag, behavioral health payer list, and default authorization requirements. It is set once per vertical by Spark Mojo and applied during practice provisioning. **Practices cannot edit the vertical template.** Practice-specific configuration (enrolled payers, NPI, fee schedule, human-review-before-submission flag) is set during onboarding and is editable by the practice admin.

---

**Q23: What is the `human-review-before-submission` flag?**

This is a client configuration option set during onboarding. When enabled, claims that reach `validated` state are held for human review before being submitted to Stedi. When disabled, claims transition from `validated` → `submitted` automatically. Practices that are new to Spark Mojo or have high error rates may want this enabled initially and can disable it once they are confident in data quality.

---

**Q24: Where are API credentials for Stedi stored?**

Admin API credentials are never stored or displayed in any Mojo. The system uses vault reference strings (e.g., `vault:willow/stedi`) to access credentials securely. If you see a vault reference in a configuration screen, this is normal — it means the credentials are stored in the secure vault and accessed by the system at runtime; the actual secrets are never exposed.

---

### Edge Cases and System Behavior

**Q25: What happens if two 835 ERAs arrive simultaneously for the same claim?**

The system uses `for_update=True` (database row-level locking) on the SM Claim document during ERA processing. If two ERAs arrive at the same time, one will acquire the lock and process first. The second will wait for the lock to release, then re-evaluate the claim's current state. If the claim has already transitioned (e.g., to `paid`), the second ERA will be logged but may not trigger a new transition — the system prevents invalid transitions from the claim's new state.

---

**Q26: What are the 277CA edge case category codes (A0, E0, A4) and do I need to worry about them?**

- **A0 (Forwarded):** The claim was forwarded to another entity for processing. No state change — claim remains `submitted`. Action: wait for the forwarded entity's response.
- **E0 (Payer error):** A payer-level error, not specific to your claim. No state change. Flagged for admin review. Action: check if this is a widespread payer issue.
- **A4 (Not found):** The payer says they cannot find the claim. No state change. Flagged for billing coordinator review. Action: investigate whether the claim was correctly submitted and the payer enrollment is active.

These edge cases do not trigger state transitions, but they are logged to the SM Claim State Log for visibility.

---

**Q27: Can I create a claim manually, or does it only come from clinical encounters?**

For the current pilot, claim creation is manual. There is no auto-generation from clinical encounters (that depends on the EHR connector or Spark Mojo EHR, which are separate capabilities). You create an SM Claim, populate the required fields, and it enters the workflow starting at `draft`.

---

**Q28: What happens when all balances on a claim reach zero?**

The system automatically transitions the claim to `closed` (terminal state). This happens when the sum of payer payments, adjustments, and any patient payments equals the billed amount. The `closed` state means the claim lifecycle is complete — no money is outstanding. The transition is logged with `trigger_type` = `api` or `scheduler` depending on how the balance resolution was detected.

---

**Q29: How is the `appeal_deadline` calculated on SM Denial?**

The `appeal_deadline` is computed from the payer's appeal window. Each payer has a configured appeal filing deadline (e.g., 60 days, 90 days, 180 days from the denial date). The system calculates `appeal_deadline` = `denial_date` + payer's appeal window. This field drives the priority sort in the denial worklist — soonest deadlines appear first.

---

**Q30: Does voiding a claim trigger any downstream actions (refunds, payer notifications)?**

No. Voiding sets the claim to the terminal `voided` state and logs the transition. It does not send any transaction to Stedi or the payer. If a paid claim needs to be voided and a refund is involved, the refund process is handled separately (payer recoupment or manual refund). Voiding is an internal administrative action.

---

*This playbook is maintained by the Spark Mojo knowledge base team. Source of truth for all feature behavior is `platform/knowledge-base/billing/BILLING.md`. For extension roadmap items, see `platform/knowledge-base/billing/EXTENSION-ROADMAP.md`. For known limitations, see `platform/knowledge-base/billing/DEFICIENCIES.md`.*
```