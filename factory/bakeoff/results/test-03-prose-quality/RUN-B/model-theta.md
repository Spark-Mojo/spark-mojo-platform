model: model-theta
test: 03-prose-quality
run: B
date: 2026-04-09

# Healthcare Billing Mojo Internal Playbook

**Last updated:** April 9, 2026  
**For:** Spark Mojo Admins and Practice Billing Managers  
**Status:** Active — Refer to this document for all operational guidance

---

## 1. Overview

The Healthcare Billing Mojo manages the complete insurance claim lifecycle—from eligibility verification before a patient's visit to cash posted in your bank account. It's built on the Spark Mojo platform and connects directly to the Stedi clearinghouse.

The core of the system is a 19-state workflow. Every claim moves through these states automatically based on clearinghouse responses, ERA payments, and billing staff actions. Staff don't check clearinghouse portals or manually track claim status. The system submits claims, receives acknowledgments, posts payments, flags denials, and routes every claim to the correct next action.

### Key principles:
- **Everything is a workflow:** The 19-state claim lifecycle defines the work
- **Automated where possible:** EDI transactions (277CA, 835) trigger automatic state changes
- **Human judgment where needed:** Appeals, write-offs, and corrections require staff review
- **Complete audit trail:** Every state change is logged in SM Claim State Log with financial snapshots
- **AI-assisted decision making:** Denials are classified automatically, appeal letters are drafted by AI

This playbook explains how the system works, state by state and field by field, so you can manage your billing operations effectively.

---

## 2. Who Uses This and How

Three primary roles interact with the Healthcare Billing Mojo:

### **Billing Coordinator** (Daily Operations)
- Reviews and submits claims from `draft` state
- Monitors the denial worklist and processes correctable denials
- Initiates appeals for `denied` claims
- Posts patient balances after ERA processing
- Places claims `on hold` when needed
- Voids claims when necessary

### **Billing Manager/Supervisor** (Oversight & Authorization)
- Authorizes write-offs (`written_off` state)
- Approves second-level appeals after `appeal_lost`
- Reviews aging reports and overdue claims
- Manages hold reasons and release from `held` state
- Oversees denial resolution rates and appeal outcomes

### **Spark Mojo Admin** (System Configuration)
- Configures payer enrollment in Stedi
- Sets up practice NPI, tax IDs, and fee schedules
- Manages user roles and permissions
- Monitors system health and EDI transaction volumes
- Troubleshoots failed webhooks or stuck claims

---

## 3. Detailed Function Reference

### Feature 1: Claim State Machine Core

**Purpose:** The foundation—every claim follows the 19-state model with enforced transitions.

#### Key Fields on SM Claim:
- `canonical_state` (19 possible values—see table below)
- `state_changed_at` — timestamp of last state change
- `state_changed_by` — user or system process that triggered it
- `previous_state` — state before last transition (quick reference)
- `state_change_reason` — reason code for manual transitions
- `is_overdue` — checked when claim exceeds expected payer timeline
- `hold_reason` — required when state = `held`
- `secondary_payer` — Link to SM Payer if applicable
- `patient_balance_amount` — outstanding patient balance
- `write_off_amount` — amount written off
- `write_off_approved_by` — supervisor who approved write-off

#### The 19 States:

| State | Display Label | Category | Trigger | Manual/Auto |
|-------|--------------|----------|---------|-------------|
| `draft` | Draft | Pre-submission | System (from encounter) or biller | Manual entry |
| `pending_info` | Pending Info | Pre-submission | System (scrubber: missing data) | Auto |
| `pending_auth` | Pending Auth | Pre-submission | System (no valid auth on file) | Auto (BH only) |
| `validated` | Ready | Pre-submission | System (scrubber passes) | Auto |
| `held` | On Hold | Pre-submission | Biller | Manual |
| `submitted` | Submitted | Submission | System (837P accepted by Stedi) | Auto |
| `rejected` | Rejected | Submission | System (277CA R3/A3 webhook) | Auto |
| `adjudicating` | In Process | Adjudication | System (277CA A1/A2 webhook) | Auto |
| `paid` | Paid | Post-adjudication | System (835 ERA auto-post, full payment) | Auto |
| `partial_paid` | Partial Pay | Post-adjudication | System (835 ERA auto-post, partial payment) | Auto |
| `denied` | Denied | Post-adjudication | System (835 ERA, zero payment with denial CARCs) | Auto |
| `in_appeal` | In Appeal | Appeal | Biller | Manual |
| `appeal_won` | Appeal Won | Appeal | Biller or System | Manual/Auto |
| `appeal_lost` | Appeal Lost | Appeal | Biller or System | Manual/Auto |
| `pending_secondary` | Secondary | Multi-payer | System (primary ERA with PR balance + secondary payer) | Auto |
| `patient_balance` | Patient Owes | Patient | System (all payer adjudication complete) | Auto |
| `written_off` | Written Off | Terminal | Supervisor | Manual |
| `closed` | Closed | Terminal | System (all balances zero) | Auto |
| `voided` | Voided | Terminal | Billing Coordinator | Manual |

#### SM Claim State Log (Audit Trail)
Every state transition creates a record here. Key fields:
- `claim` — Link to SM Claim
- `from_state` / `to_state` — the transition
- `changed_at` — when it happened
- `changed_by` — user or system process
- `trigger_type` — `manual`, `webhook_277ca`, `webhook_835`, `api`, `scheduler`
- `trigger_reference` — ERA name, webhook transaction ID
- `reason` — human-readable reason (required for manual)
- `paid_amount_at_change`, `adjustment_amount_at_change`, `patient_responsibility_at_change` — financial snapshot

**Important:** The Python `VALID_TRANSITIONS` dict in `sm_claim.py` enforces every move. Any transition not in the dict fails with a validation error.

---

### Feature 2: Automated EDI Transitions

**Purpose:** Webhook handlers move claims automatically based on incoming EDI from Stedi.

#### 277CA Webhook (Claim Status)
- **A1/A2 acknowledgments:** `submitted` → `adjudicating`
- **R3/A3 rejections:** `submitted` → `rejected`
- **Other codes (A0, E0, A4):** logged but no state change

#### 835 ERA Webhook (Payment/Denial)
- **Full payment:** `adjudicating` → `paid`
- **Partial payment:** `adjudicating` → `partial_paid`
- **Zero payment with denial CARCs:** `adjudicating` → `denied`

**Concurrency control:** Uses `for_update=True` on SM Claim during ERA processing to prevent race conditions.

**Financial snapshot:** When an ERA triggers a state change, the system captures paid amount, adjustment amount, and patient responsibility in SM Claim State Log.

---

### Feature 3: Denial Management

**Purpose:** Structured handling of denied claims with AI classification and prioritized worklist.

#### SM Denial DocType (created automatically on `denied` transition)
- `claim` — Link to SM Claim
- `denial_date` — date of denial
- `CARC_codes` — table of Claim Adjustment Reason Codes
- `RARC_codes` — table of Remittance Advice Remark Codes
- `denial_reason_summary` — text summary
- `appeal_deadline` — computed from payer appeal window
- `ai_category` — `correctable`, `appealable`, or `terminal` (from AWS Bedrock)
- `ai_appealable` — Check (yes/no based on AI analysis)
- `ai_action` — suggested action (e.g., "Correct date of birth and resubmit")
- `ai_confidence` — Float 0-1 (AI's confidence in classification)

#### Denial Worklist
Endpoint: `/api/modules/billing/denials/worklist`
- Groups denials by `ai_category` (correctable first, then appealable, then terminal)
- Sorts within group by `appeal_deadline` ascending
- Filterable by payer and date range

**AI Classification:** Triggered on SM Denial creation. Uses CARC codes, payer, and CPT code combination. Classification only—no automatic state change. Biller reviews and acts.

---

### Feature 4: Appeal Lifecycle

**Purpose:** Structured, deadline-tracked workflow for appealing denied claims.

#### SM Appeal DocType (created manually by biller)
- `claim` — Link to SM Claim
- `denial` — Link to SM Denial
- `appeal_level` — 1 or 2
- `submitted_date` — date appeal was submitted to payer
- `payer_deadline` — deadline from payer
- `days_until_deadline` — computed field
- `appeal_letter` — Long Text (AI-generated, biller edits)
- `supporting_docs` — Attach Multiple
- `result` — `won`, `lost`, or `pending`
- `result_date` — date outcome received
- `result_notes` — notes on outcome

#### State Transitions for Appeals:
- **Appeal initiated:** `denied` → `in_appeal` (on SM Appeal creation)
- **Appeal won:** `in_appeal` → `appeal_won` (biller or system after ERA reversal)
- **Appeal lost:** `in_appeal` → `appeal_lost` (biller or system)
- **Second-level appeal:** `appeal_lost` → `in_appeal` (new SM Appeal at level 2)
- **Write-off after lost appeal:** `appeal_lost` → `written_off` (supervisor approval required)

#### Appeal Letter Generation
- Triggered on SM Appeal creation
- Uses AWS Bedrock with CARC/RARC codes, payer name, CPT codes, service date
- Populates `appeal_letter` field
- **Biller must review, edit, and approve before submission**—never auto-submitted

---

### Feature 5: AR Dashboard Data Layer

**Purpose:** Abstraction layer endpoints that power billing coordinator dashboards (React UI comes later).

#### Endpoints:
1. **AR summary** (`/api/modules/billing/ar/summary`)
   - Total claims by state
   - Total billed, paid, denied, in appeal, patient balance, written off
   - Per-client, date-range filterable

2. **Aging report** (`/api/modules/billing/ar/aging`)
   - Claims bucketed by days in current state: 0-30, 31-60, 61-90, 90+
   - Broken down by payer within each bucket
   - Flags `is_overdue` claims
   - Filterable by state and payer

3. **Denial analytics** (`/api/modules/billing/ar/denials`)
   - Denial rate by payer (this month vs last month)
   - Denial rate by CPT code
   - Top 10 CARC codes this period
   - Average days from denial to resolution by `ai_category`

---

## 4. Operational Scenarios

### Scenario 1: How to handle a CO-45 denial using the denial worklist
**Situation:** Claim shows denial CARC CO-45 (Charge exceeds fee schedule).

1. **Identify:** Open denial worklist (`/api/modules/billing/denials/worklist`). Look for claims with `ai_category = "correctable"` and CARC CO-45.
2. **Review:** Click into SM Denial record. Check `ai_action` field—likely says "Verify fee schedule matches payer contract and resubmit with corrected amount."
3. **Correct:** Open linked SM Claim. Compare billed amount to payer's fee schedule for that CPT code.
4. **Adjust:** If amount is wrong, edit charge amount on claim.
5. **Resubmit:** Change claim state from `denied` to `draft` (requires `state_change_reason` like "Corrected fee schedule amount").
6. **Submit:** Once in `draft`, submit normally—claim moves to `submitted` automatically via Stedi.
7. **Track:** SM Denial remains for historical tracking. New denial record created if denied again.

### Scenario 2: How to process a partial payment ERA
**Situation:** ERA arrives with payment less than billed amount.

1. **System auto-processes:** 835 webhook handler:
   - Parses ERA, identifies partial payment
   - Updates SM Claim: `adjudicating` → `partial_paid`
   - Logs transition to SM Claim State Log with `trigger_type = "webhook_835"`
   - Captures financial snapshot: paid amount, adjustment amount, patient responsibility
2. **Check adjustments:** Review ERA details for CARC codes explaining reductions (CO-45, PR-2, etc.).
3. **Patient balance:** If patient responsibility exists, system auto-transitions to `patient_balance` state.
4. **Secondary payer:** If secondary payer on file and primary paid with PR balance, system moves to `pending_secondary`.
5. **Manual review:** Billing coordinator reviews adjustments for accuracy. If adjustment seems wrong, may need to appeal.

### Scenario 3: How to initiate a second-level appeal after appeal_lost
**Situation:** First appeal lost, decision received from payer.

1. **Record outcome:** Open SM Appeal record. Set `result = "lost"`, `result_date = today`, add `result_notes` explaining payer's rationale.
2. **System transition:** Changing appeal result to "lost" triggers `in_appeal` → `appeal_lost` on SM Claim (if not already done).
3. **Evaluate:** Review if second-level appeal is warranted. Check payer's appeal policy for deadlines.
4. **Create new appeal:** Click "New SM Appeal" from claim. System pre-populates:
   - `claim` = current claim
   - `denial` = original SM Denial (same)
   - `appeal_level` = 2
   - `payer_deadline` = computed based on payer's second-level window
5. **Generate letter:** AI creates new appeal letter addressing payer's rationale from first appeal.
6. **Edit & submit:** Review letter, attach additional supporting docs, submit to payer.
7. **State change:** Creating SM Appeal triggers `appeal_lost` → `in_appeal` automatically.

### Scenario 4: How to authorize a write-off as a supervisor
**Situation:** Claim balance is uncollectible (patient deceased, small balance not worth pursuing).

1. **Verify claim state:** Claim must be in `denied`, `appeal_lost`, or `patient_balance`. Cannot write off from `adjudicating` or `in_appeal`.
2. **Initiate write-off:** Billing coordinator requests write-off via claim action menu.
3. **Supervisor review:** System notifies supervisor via task. Supervisor opens claim, reviews history.
4. **Select reason code:** Required options:
   - `patient_deceased`
   - `balance_too_small` $5)
   - `bankruptcy`
   - `statute_limitations`
   - `payer_policy` (payer refuses payment despite appeal)
   - `other` (requires explanation)
5. **Enter amount:** Specify `write_off_amount` (partial or full).
6. **Approve:** Supervisor clicks "Approve Write-off". System:
   - Transitions claim to `written_off` state
   - Records `write_off_approved_by` = supervisor name
   - Logs transition with `trigger_type = "manual"`, `reason = "write-off approved: [reason code]"`
   - Updates financials: `write_off_amount` set, remaining balance zeroed
7. **Audit trail:** SM Claim State Log shows approval for compliance.

### Scenario 5: How to correct and resubmit a rejected claim
**Situation:** 277CA webhook reports rejection (R3/A3) for invalid subscriber ID.

1. **System auto-transition:** `submitted` → `rejected` via 277CA handler.
2. **Identify error:** Check SM Claim State Log `trigger_reference` for 277CA details. Error code indicates invalid subscriber ID.
3. **Correct data:** Open SM Claim, edit patient insurance section. Verify subscriber ID matches insurance card.
4. **Resubmit:** Change state from `rejected` to `draft` (`state_change_reason` = "Corrected subscriber ID").
5. **Validate:** System runs scrubber checks. If passes, moves to `validated`.
6. **Submit:** Claim submits to Stedi, moves to `submitted` on acceptance.
7. **Monitor:** Watch for 277CA A1/A2 to move to `adjudicating`.

### Scenario 6: How to process a claim with secondary insurance
**Situation:** Primary ERA shows patient responsibility, secondary payer exists.

1. **Primary ERA processes:** System auto-transitions `adjudicating` → `partial_paid` or `patient_balance`.
2. **Auto-detection:** System checks if `secondary_payer` field populated AND primary ERA shows patient responsibility.
3. **State change:** If both true, claim moves to `pending_secondary`.
4. **Manual submission:** Billing coordinator:
   - Creates new 837P with COB information from primary ERA
   - Submits to secondary payer via Stedi
   - **Note:** Pilot requires manual submission; future automation planned
5. **Track separately:** Secondary claim tracked as separate SM Claim record linked to primary.
6. **Post secondary payment:** When secondary ERA arrives, processes normally.

### Scenario 7: How to handle a claim stuck in adjudicating
**Situation:** Claim in `adjudicating` for 45+ days, no ERA received.

1. **Check overdue flag:** System scheduler sets `is_overdue = 1` after exceeding payer-specific timeline (configurable).
2. **Review payer norms:** Check average days-to-payment for this payer in denial analytics.
3. **Manual inquiry:** If significantly overdue:
   - Use Stedi portal for 276 status inquiry (manual step in pilot)
   - Or contact payer directly
4. **Document:** Add note to claim with inquiry details.
5. **Possible actions:**
   - If payer confirms processing: leave in `adjudicating`, note expected date
   - If payer lost claim: resubmit (move to `draft` with reason)
   - If payer needs info: provide via portal, note in claim
6. **Future automation:** EXTENSION-ROADMAP includes auto-276 generation for overdue claims.

### Scenario 8: How to manage a claim pending auth (behavioral health only)
**Situation:** BH practice with `session_count_auth_enabled`, claim needs authorization.

1. **System check:** Scrubber verifies auth on file for patient, CPT, dates.
2. **No auth found:** Claim moves to `pending_auth`.
3. **Obtain auth:** Billing coordinator:
   - Contacts payer for authorization
   - Gets auth number, session count, dates
   - Updates patient record with auth details
4. **Release hold:** Edit claim, change state from `pending_auth` to `draft` (`state_change_reason` = "Auth obtained").
5. **Resume workflow:** Claim proceeds through scrubber to `validated`, then `submitted`.

### Scenario 9: How to void a claim
**Situation:** Claim submitted in error (wrong patient, duplicate, wrong date).

1. **Verify void eligibility:** Claim cannot be `paid`, `partial_paid`, or `written_off`. Best in `draft`, `submitted`, or `rejected`.
2. **Initiate void:** Billing coordinator selects "Void Claim" action.
3. **Required reason:** Must enter `state_change_reason` (e.g., "Duplicate submission", "Wrong patient").
4. **System action:** `[current_state]` → `voided`
5. **Irreversible:** Voided claims cannot be reopened. Status shows "Voided" in all reports.
6. **Audit trail:** SM Claim State Log records void with reason and user.
7. **Financial impact:** Any posted payments reversed (if paid in error, requires separate process).

### Scenario 10: How to use the AR aging report to prioritize work
**Situation:** End of month, need to focus on oldest outstanding claims.

1. **Run aging report:** `/api/modules/billing/ar/aging`
2. **Filter by state:** View `adjudicating` claims first (oldest payments due).
3. **Bucket view:** See counts in 0-30, 31-60, 61-90, 90+ days.
4. **Drill down:** Click into 90+ bucket, sort by payer.
5. **Action plan:**
   - **90+ days:** Immediate payer calls/276 inquiries
   - **61-90 days:** Second follow-up, check for missing info
   - **31-60 days:** First follow-up if payer norm is 30 days
   - **0-30 days:** Monitor, not action needed yet
6. **Export list:** Use report data to create calling list for billing staff.
7. **Track progress:** Re-run weekly to see bucket movement.

---

## 5. Troubleshooting

### Common Error States and Resolutions

#### 1. Claim stuck in `submitted` (no 277CA received)
- **Cause:** Stedi webhook not firing, network issue, or payer not processing.
- **Check:** SM Claim State Log for last transition. If >2 business days since `submitted`.
- **Resolution:**
  - Verify Stedi connection via admin panel
  - Check webhook logs for 277CA attempts
  - Manually check claim status in Stedi portal
  - If Stedi shows accepted, wait for payer processing
  - If Stedi shows error, correct and resubmit

#### 2. ERA processed but claim state didn't change
- **Cause:** Concurrency lock conflict or validation error.
- **Check:** SM Claim State Log for `webhook_835` attempts with error.
- **Resolution:**
  - Look for "Transition not allowed" errors in logs
  - Verify claim was in `adjudicating` when ERA arrived
  - If claim already moved (e.g., to `in_appeal`), ERA applied to wrong state
  - Manual override may be needed: adjust state based on ERA details

#### 3. Denial not classified by AI (`ai_category` empty)
- **Cause:** AWS Bedrock timeout, CARC codes not recognized.
- **Check:** SM Denial `ai_confidence` = 0 or null.
- **Resolution:**
  - Manually classify denial using CARC manual
  - Set `ai_category` based on your judgment
  - For recurring CARCs, notify Spark Mojo admin to update training

#### 4. Cannot transition to `written_off`
- **Cause:** Missing required fields or permissions.
- **Check:**
  - User role must have "Supervisor" permission
  - `state_change_reason` must contain valid write-off reason code
  - Claim cannot have `patient_balance_amount` > 0 unless writing off full amount
- **Resolution:**
  - Verify supervisor permissions
  - Select from predefined reason codes
  - If writing off partial balance, ensure patient balance updated first

#### 5. Appeal letter generation failed
- **Cause:** AWS Bedrock unavailable or input data missing.
- **Check:** SM Appeal `appeal_letter` field empty after creation.
- **Resolution:**
  - Manual draft: Use denial details and CARC codes to write letter
  - Template: Use previous successful appeal letters as template
  - Retry: Delete and recreate SM Appeal (triggers generation again)

#### 6. `is_overdue` flag not setting
- **Cause:** Scheduler not running or payer timelines not configured.
- **Check:** Claim in `adjudicating` >45 days but `is_overdue` still 0.
- **Resolution:**
  - Verify scheduler job "check_overdue_claims" is active
  - Check payer-specific timeline configuration
  - Manually set `is_overdue = 1` if appropriate

#### 7. Secondary payer not auto-detected
- **Cause:** `secondary_payer` field empty or patient responsibility zero.
- **Check:** Primary ERA shows PR balance but claim didn't move to `pending_secondary`.
- **Resolution:**
  - Manually set `secondary_payer` on claim
  - Manually transition to `pending_secondary` if appropriate
  - Verify patient's secondary insurance on file

### Transition Validation Errors
The `VALID_TRANSITIONS` dict controls all moves. Common rejected transitions:

| Attempted Transition | Why Rejected | Correct Path |
|---------------------|--------------|--------------|
| `paid` → `draft` | Paid claims cannot be edited | Use `voided` if paid in error, then new claim |
| `denied` → `submitted` | Must correct first | `denied` → `draft` (correct), then `submitted` |
| `held` → `adjudicating` | Must release hold first | `held` → `draft` or `validated` |
| `written_off` → any | Terminal state | Create new claim if needed |
| `voided` → any | Terminal state | Create new claim if needed |

---

## 6. FAQ

### System Operations

**Q1: What triggers the automatic scrubber that moves claims to `pending_info` or `validated`?**  
A: The scrubber runs when a claim is saved in `draft` state. It checks for required patient data, insurance info, CPT codes, and (for BH) authorization. Missing data → `pending_info`. All checks pass → `validated`.

**Q2: How often does the system check for overdue claims (`is_overdue` flag)?**  
A: A scheduled job runs nightly. It evaluates claims in `adjudicating` state against payer-specific timelines (default 45 days). Claims exceeding timeline get `is_overdue = 1`.

**Q3: Can we customize the 19 states for our practice?**  
A: No. The 19-state model is core platform architecture. Workflow configuration happens at the task level within states, not by modifying states themselves.

**Q4: What happens if Stedi goes down? Do claims queue locally?**  
A: Yes. The submission process stores claims locally until Stedi accepts them. If Stedi is unavailable, claims remain in `validated` state. System retries periodically.

**Q5: How are ERA files matched to claims?**  
A: By patient account number, date of service, and billed amounts. The system uses Stedi's ERA-to-claim matching plus internal cross-reference.

### State Management

**Q6: Can a claim be in `denied` and `in_appeal` at the same time?**  
A: No. `denied` → `in_appeal` is a transition. Once in appeal, the claim is no longer technically "denied" from a workflow perspective—it's "in appeal."

**Q7: What's the difference between `rejected` and `denied`?**  
A: `rejected` means the clearinghouse or payer rejected the claim before processing (format errors, invalid IDs). `denied` means the payer processed and adjudicated it, resulting in zero payment.

**Q8: Why does `partial_paid` exist as a separate state from `paid`?**  
A: Because the next steps differ. `paid` claims go straight to `closed` if no patient balance. `partial_paid` claims need patient balance posting or secondary submission.

**Q9: Can we move a claim from `held` back to its previous state?**  
A: Yes, but you must specify the target state. `held` → `draft` is typical for further editing. `held` → `validated` if ready to submit.

**Q10: What happens to a claim in `pending_secondary` if secondary pays nothing?**  
A: It moves to `patient_balance` for the remaining amount. If secondary denies, you'd get a denial ERA and move to `denied` for the secondary portion.

### Denials & Appeals

**Q11: How accurate is the AI denial classification?**  
A: AWS Bedrock achieves ~85% accuracy on common CARC codes. `ai_confidence` score indicates certainty. Always review before acting—the AI suggests, humans decide.

**Q12: Can we appeal a claim that AI classifies as "terminal"?**  
A: Yes. `ai_category` is advisory. You can still create an SM Appeal for "terminal" denials, though success rate is typically low.

**Q13: What if the appeal deadline passes while claim is being reviewed?**  
A: The system shows `days_until_deadline` as negative. You can still appeal, but payer may reject as untimely. Document the delay reason in `result_notes`.

**Q14: Can we have multiple denials for one claim?**  
A: Yes. Each denial ERA creates a new SM Denial record. A claim could be denied, corrected, resubmitted, and denied again with different CARCs.

**Q15: Does the system auto-submit appeals to payers?**  
A: No. Pilot requires manual submission via payer portal. The system generates the letter, you submit it.

### Financials

**Q16: How are write-offs reported for accounting?**  
A: The `write_off_amount` field tracks the amount. AR summary reports total written off by period. Export to accounting system via API (future feature).

**Q17: Can we write off part of a balance?**  
A: Yes. Specify `write_off_amount` less than total balance. Remaining balance stays as `patient_balance`.

**Q18: What happens to patient balances when claim is `written_off`?**  
A: If full balance written off, claim moves to `closed`. If partial, remains in `patient_balance` for the remainder.

**Q19: How are secondary payments recorded?**  
A: As separate SM Claim records. The primary claim shows `pending_secondary` until secondary processes, then each claim tracks its own payment.

**Q20: Can we edit a claim after it's `paid`?**  
A: No. Paid claims are locked. If correction needed (like wrong payment amount), you'd void and create new claim, then handle payment reconciliation separately.

---

## Appendix: Quick Reference

### Valid Transitions Requiring Human Action
- Any → `in_appeal` (Biller)
- Any → `written_off` (Supervisor)
- Any → `voided` (Billing Coordinator)
- `denied` → `draft` (Biller - resubmit)
- `held` → `draft` or `validated` (Biller - release hold)

### Automated Transitions
- `draft` → `pending_info`/`validated` (scrubber)
- `validated` → `submitted` (Stedi acceptance)
- `submitted` → `adjudicating` (277CA A1/A2)
- `submitted` → `rejected` (277CA R3/A3)
- `adjudicating` → `paid`/`partial_paid`/`denied` (835 ERA)
- `paid` → `closed` (if no patient balance)
- `partial_paid` → `patient_balance` or `pending_secondary`

### Required Fields for Manual Transitions
- `state_change_reason` required for all manual state changes
- `hold_reason` required when moving to `held`
- Write-off reason code required when moving to `written_off`
- Appeal letter required before submitting appeal (can be AI-generated)

---

**Need help?** Contact Spark Mojo support or refer to the platform knowledge base at `platform/knowledge-base/billing/`.