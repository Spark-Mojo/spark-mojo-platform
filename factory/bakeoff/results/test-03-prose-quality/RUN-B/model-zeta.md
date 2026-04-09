model: model-zeta
test: 03-prose-quality
run: B
date: 2026-04-09

```markdown
# Healthcare Billing Mojo — Internal Playbook

**Version:** 1.0  
**Last Updated:** April 9, 2026  
**Audience:** Spark Mojo Platform Admins, Practice Billing Managers, Billing Coordinators  
**Prerequisite Knowledge:** Healthcare revenue cycle operations, CPT/ICD-10 coding, EDI 837P/835/277CA standards  

---

## Overview

Healthcare Billing Mojo is the Spark Mojo platform's native revenue cycle management capability. It replaces external clearinghouse portals and manual claim tracking with a unified 19-state workflow engine backed by direct Stedi API integration.

At the core of every claim is the `canonical_state` field in the **SM Claim** DocType. This field enforces a rigid state machine with 19 possible values, from `draft` through `closed` or `voided`. Every state transition is logged immutably in **SM Claim State Log**, creating a complete audit trail for compliance and dispute resolution.

The platform distinguishes between **automated transitions** (triggered by EDI webhooks, scrubbers, or schedulers) and **manual transitions** (requiring human authorization). Automated transitions execute via the `transition_state()` controller with `VALID_TRANSITIONS` validation. Manual transitions require specific platform roles and mandatory reason codes.

**Key architectural principle:** Stedi is the exclusive clearinghouse. All clients enroll payers through Stedi during onboarding. There is no multi-clearinghouse support.

---

## Who Uses This and How

### Role: Billing Coordinator
- **Permissions:** Execute manual transitions: `held` ↔ `draft`, `denied` → `draft` (resubmit), `denied` → `in_appeal`, create SM Appeal records
- **Primary Worklist:** Denial worklist (`/api/modules/billing/denials/worklist`), AR aging reports
- **Daily Tasks:** Review AI-classified denials, edit AI-generated appeal letters, move corrected claims from `draft` to `submitted`

### Role: Billing Manager / Supervisor
- **Permissions:** Execute financial transitions: `appeal_lost` → `written_off`, override holds, approve write-offs
- **Required Fields:** `write_off_approved_by`, `state_change_reason` (mandatory for all supervisor transitions)
- **Primary Views:** AR summary endpoints, write-off approval queues, audit logs (SM Claim State Log)

### Role: Platform Admin (Spark Mojo Staff)
- **Permissions:** Direct database access (read-only for support), SM Claim State Log investigation, webhook replay (BILL-011/012 handlers)
- **Scope:** Multi-tenant support, migration oversight, Stedi enrollment status verification

---

## Detailed Function Reference (By Feature Tier)

### Feature 1: Claim State Machine Core

#### SM Claim — Critical Fields

| Field | Type | Business Logic |
|-------|------|----------------|
| `canonical_state` | Select (19 options) | The single source of truth for claim status. Validated against `VALID_TRANSITIONS` dict in controller. |
| `state_changed_at` | Datetime | Auto-populated on every transition. Used for aging calculations (BILL-020). |
| `state_changed_by` | Data | User ID (e.g., `admin@practice.com`) or system process (`webhook_277ca`, `scheduler`). |
| `previous_state` | Data | Snapshot of state before last transition. Enables "return to previous" logic analysis. |
| `state_change_reason` | Small Text | **Mandatory for all manual transitions.** Must be populated when `trigger_type` = `manual`. |
| `is_overdue` | Check | Set by scheduler when claim exceeds payer-specific timeline in `adjudicating` state. |
| `hold_reason` | Small Text | **Required when `canonical_state` = `held`.** Explains why claim is removed from submission queue. |
| `secondary_payer` | Link (SM Payer) | Populated when primary ERA indicates PR (Patient Responsibility) balance and secondary coverage exists. |
| `patient_balance_amount` | Currency | Calculated from 835 ERA patient responsibility segments. Updated on `adjudicating` → (`paid` \| `partial_paid` \| `denied`). |
| `write_off_amount` | Currency | Financial impact of `written_off` state. Required for accounting reconciliation. |
| `write_off_approved_by` | Data | Supervisor ID authorizing the write-off. Compliance requirement for audit trails. |

#### SM Claim State Log — Audit Structure

Standalone DocType (not child table) for performance. One record per transition.

| Field | Purpose |
|-------|---------|
| `claim` | Link to parent SM Claim |
| `from_state` | Previous `canonical_state` value |
| `to_state` | New `canonical_state` value |
| `changed_at` | Timestamp (datetime) |
| `changed_by` | User or system identifier |
| `trigger_type` | `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler` |
| `trigger_reference` | ERA filename, Stedi transaction ID, or batch reference |
| `reason` | Human-readable explanation (mandatory for `manual`) |
| `paid_amount_at_change` | Financial snapshot at transition moment |
| `adjustment_amount_at_change` | Contractual adjustments per ERA |
| `patient_responsibility_at_change` | Patient owes per ERA at transition |

**Index Strategy:**  
- `idx_sm_claim_canonical_state` — for worklist filtering  
- `idx_sm_claim_state_payer` — for payer performance analysis  
- `idx_sm_claim_state_date` — for aging reports  
- `idx_state_log_claim` — for claim history retrieval  
- `idx_state_log_claim_time` — for chronological audit trails  

---

### Feature 2: Automated EDI Transitions

#### Automated Transition Matrix

| From State | To State | Trigger | Type |
|------------|----------|---------|------|
| `draft` | `pending_info` | Scrubber: missing patient/eligibility data | System |
| `draft` | `pending_auth` | Scrubber: