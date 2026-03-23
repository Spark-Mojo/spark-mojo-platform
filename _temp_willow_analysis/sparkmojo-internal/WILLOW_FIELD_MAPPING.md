# Willow Center — Field Mapping Document

**Source files analyzed:**
- `AnonymizedSM24_.xlsx` — Willow Center onboarding tracking Google Sheet (anonymized)
- `ANONYMIZEDSMUnpaid_Claims22626.xls` — SimplePractice AR export (anonymized)

**Analysis date:** March 23, 2026  
**Analyst:** Claude (Session 3c)

---

## Design Principle: Model the Existing Workflow First

The Willow Center Google Sheet IS the workflow. It represents years of
accumulated operational knowledge about how a therapy practice actually
onboards clients. Our job is to model that faithfully and make it better —
not to impose a new data structure that requires the practice to change
how they work.

**Rules for this engagement:**

1. If a column exists in Erin's sheet, it exists in the DocType.
   We do not remove fields because they seem redundant or unclear.
   We ask Erin what it means and model it accurately.
2. If a status value, dropdown option, or terminology comes from
   SimplePractice or from the practice's existing vocabulary, we use
   that exact term. We do not rename things to match our preferences.
   Staff think in SP terms. The UI should speak their language.
3. If the sheet has a column we don't understand, that is a question
   for Erin — not a field to omit.
4. The goal of Phase 3 is to make the Google Sheet experience
   dramatically better — not to teach the practice a new workflow.
   Cutover should feel like an upgrade, not a migration.
5. This principle applies to all future clients. Every new client
   engagement starts with mapping their existing tools before
   touching the DocType.

---

## Part 1: Onboarding Tracker → SM Client DocType

### Sheet Structure

The Google Sheet has evolved over 4 years. The current active structure (2025-2026) is:

| Sheet | Purpose | Row count |
|-------|---------|----------|
| Need to Check | **Active queue** — clients currently in onboarding | ~24 active |
| Completed 2026 | Completed onboarding this year | ~383 |
| Completed 2025 | Completed onboarding 2025 | ~1,964 |
| Cancellation 2026 | Cancelled clients this year | ~107 |
| Cancellation 2025 | Cancelled clients 2025 | ~165 |
| PPW Update | Paperwork update tracking | small |
| Updated Insurance Completed | Insurance update completions | small |
| VM | Voicemail log | small |

**Historical sheets** (2022-2024) have fewer columns and don't need to be imported for the POC.

### Column → SM Client Field Mapping

| Google Sheet Column | Type | SM Client Field | Fieldtype | Notes |
|---------------------|------|----------------|-----------|-------|
| Date | Date | `date_added` | Date | Date client was added to queue |
| Initials | Text | `assigned_staff` | Link → User | Map initials to user via Staff sheet |
| Full Client Name | Text | `client_name` | Data | Primary key via autoname |
| Clinician | Text | `assigned_clinician` | Link → User | First name only in sheet |
| First Appt (DATE & TIME) | Datetime | `first_appointment_date` | Datetime | Critical for urgency calculation |
| Custody Agreement | Check | `custody_agreement_required` | Check | ✓ Already in DocType |
| GFE Sent (Self pay only) | Check | `gfe_sent` | Check | ✓ Already in DocType |
| Paperwork Completed | Check | checklist item | SM Onboarding Item | Map to checklist row |
| Insurance card uploaded | Check | `insurance_card_uploaded` | Check | ⚠️ **MISSING from DocType — ADD** |
| Primary Insurance | Text | `insurance_primary` | Data | ✓ Already in DocType |
| Secondary Insurance | Text | `insurance_secondary` | Data | ✓ Already in DocType |
| Updated Insurance | Text | `updated_insurance_text` | Data | ⚠️ **MISSING — this is freetext notes on insurance update, different from `insurance_updated_in_sp`** |
| Date of Birth | Date | `date_of_birth` | Date | ✓ Already in DocType |
| Member ID(s) | Text | `member_id` | Data | ✓ Already in DocType |
| Employer | Text | `employer` | Data | ✓ Already in DocType |
| Verified | Mixed | `insurance_verified` | Check | ⚠️ Values in sheet: `True` (bool) or `'Verified'` (string) — normalize to Check |
| Notes | Text | `notes` | Text Editor | ✓ Already in DocType |
| SP Note Added | Check | `sp_note_added` | Check | ✓ Already in DocType |
| Insurance Updated | Check | `insurance_updated_in_sp` | Check | ✓ Already in DocType |

### DocType Gaps — Required Additions

These fields exist in Erin's sheet but are missing from the SM Client DocType spec:

**1. `insurance_card_uploaded` (Check)**
- Sheet column: "Insurance card uploaded"
- Appears in all 2025+ sheets
- Required for the onboarding checklist to be accurate

**2. `updated_insurance_text` (Small Text)**  
- Sheet column: "Updated Insurance"
- Freetext field, e.g. "BCBS/Anthem" — notes on which insurance was updated to
- Different from `insurance_updated_in_sp` (which is just a done/not-done checkbox)

**3. `insurance_verified` field clarification**
- The sheet has a "Verified" column with mixed values: boolean `True` or string `'Verified'`
- Our current DocType uses `onboarding_status` to track this
- Recommendation: add a separate `insurance_verified` Check field for explicit insurance verification tracking

### Outreach Attempt Mapping

The sheet tracks up to 5 outreach attempts with date + method pairs.
Each pair maps to one SM Outreach Attempt child table row.

| Sheet Columns | SM Outreach Attempt Field | Notes |
|--------------|--------------------------|-------|
| Date (attempts col 20, 22, 24, 26, 28) | `attempt_date` | Datetime |
| Attempt 1-5 (cols 21, 23, 25, 27, 29) | `method` + `notes` | Freetext — see methods below |
| Notes (last column) | `notes` on last attempt | General outreach notes |

**Outreach methods seen in data (raw values from sheet):**
```
'SP Reminders'
'Google Text'
'GW, Google Text'         ← staff initials + method
'GW, Final Reminder'
'EMW, Notes'
'Notes, EMW'
'TB, SP Reminders'
'SP Reminders, Google Text, By 9am Mon, EMW'
```

**Interpretation:** Methods are often combined with staff initials and free notes.  
**Recommendation:** The SM Outreach Attempt `method` Select field should cover the core types:
`SP Reminder / Google Text / LVM / EMW / Final Reminder / Other`
And a separate `notes` Small Text field captures the free annotations.

The current spec has: `SP Reminder / Google Text / LVM / EMW / Final Reminder`  
**This is correct — no changes needed to the select values.**

### Onboarding Status Mapping

Status is derived from which sheet a client row lives in:

| Sheet | Derived Status | Notes |
|-------|---------------|-------|
| Need to Check | New / Paperwork / Insurance / Verified | Determined by checkbox state |
| PPW Update | Paperwork | Needs paperwork update |
| Completed 20XX | Ready | Onboarding complete |
| Cancellation 20XX | Cancelled | Client cancelled |
| Updated Insurance Completed | Verified or Ready | Insurance was updated |

**Status auto-derivation logic for import:**
- If in Completed sheet: `onboarding_status = 'Ready'`
- If in Cancellation sheet: `onboarding_status = 'Cancelled'`
- If in Need to Check: derive from checkboxes:
  - Paperwork not done: `'New'`
  - Paperwork done, insurance not verified: `'Paperwork Pending'`
  - Insurance pending: `'Insurance Pending'`  
  - Verified = True: `'Verified'`

### Self-Pay Detection

Self-pay clients are identified by:
- Primary Insurance = "Self Pay" (string)
- GFE Sent checkbox = True (GFE = Good Faith Estimate, required for self-pay)

The `self_pay` Check field should be set to True when Primary Insurance contains "Self Pay" or "self pay" (case-insensitive).

### Staff Sheet → User Mapping

The Staff sheet contains:
- Name, Initials, Email, Role, Status

The sheet uses staff initials in the Initials column (e.g., 'SW', 'GW', 'emw', 'md').  
These map to full user accounts via the Staff sheet.

For the POC import, map initials → email using the Staff sheet as a lookup table.

---

## Part 2: SP Billing Export → ERPNext Sales Invoice

### Export Format

SimplePractice exports billing data as Excel with multiple sheets representing
different AR views (different time snapshots). All sheets share the same
core column structure.

**Core columns (all sheets):**

| SP Export Column | ERPNext/SM Field | Type | Notes |
|-----------------|-----------------|------|-------|
| Date of Service | `session_date` | Datetime | Custom field on Sales Invoice |
| Client | Customer | Link | Maps to SM Client via client_name |
| Clinician | `clinician` | Link → User | Custom field on Sales Invoice |
| Billing Code | `billing_code` | Data | CPT code — can be multi-line (see below) |
| Primary Insurance | (payer field) | Data | Insurance company name + ID |
| Secondary Insurance | secondary payer | Data | Optional |
| Rate per Unit | `rate` | Currency | Rate per session |
| Units | `qty` | Int | Number of units billed |
| Total Fee | `amount` | Currency | rate × qty |
| Client Payment Status | `client_payment_status` | Select | See values below |
| Charge (client) | client charge amount | Currency | |
| Uninvoiced | uninvoiced amount | Currency | Client portion not yet invoiced |
| Paid (client) | client paid amount | Currency | |
| Unpaid (client) | client unpaid amount | Currency | |
| Insurance Payment Status | `insurance_payment_status` | Select | See values below |
| Charge (insurance) | insurance charge | Currency | |
| Paid (insurance) | insurance paid | Currency | |
| Write Off | write_off_amount | Currency | |
| Total Unpaid | `outstanding_amount` | Currency | Key AR field |

**KDT Notes column** (in 'unpaid 11am' sheet only): Free-text notes added by billing staff. Maps to notes field on Sales Invoice.

### Client Payment Status Values (exact SP export values)

```
NO CHARGE    ← Insurance-only, client owes nothing
PAID         ← Client copay/deductible fully paid
UNPAID       ← Client has outstanding balance
UNINVOICED   ← Client portion exists but not yet invoiced
OVERPAID     ← Client paid more than charged
```

**Current DocType spec:** `Uninvoiced / Invoiced / Paid / Unpaid`  
⚠️ **MISMATCH — Update to:** `NO CHARGE / PAID / UNPAID / UNINVOICED / OVERPAID`

### Insurance Payment Status Values (exact SP export values)

```
UNBILLED     ← Not yet submitted to insurance
UNPAID       ← Submitted, no payment received
PAID         ← Insurance paid
OVERPAID     ← Insurance paid more than charged
```

**Current DocType spec:** `Unbilled / Submitted / Paid / Denied / Write-Off`  
⚠️ **MISMATCH — Update to match SP values:** `UNBILLED / UNPAID / PAID / OVERPAID`  
Note: Add `DENIED` as it will occur in practice even if not in this sample.

### Billing Code Complexity

Billing codes are sometimes compound — multiple CPT codes on one service line:
```
'90833\n99214'   ← Two codes on one line (add-on code pattern)
'99205\n90833'
'99214\n90833'
```

**Implication:** The `billing_code` field should be Data (not Link) to accommodate
multi-code strings. When displaying in the AR Mojo, split on `\n` and display
each code separately.

**CPT codes seen in data:**
- 90837 — Individual psychotherapy, 60 min
- 90834 — Individual psychotherapy, 45 min
- 90832 — Individual psychotherapy, 30 min
- 90791 — Psychiatric diagnostic evaluation
- 90847 — Family psychotherapy with patient
- 99214 — Office/outpatient E&M visit, moderate complexity
- 99205 — Office/outpatient E&M, high complexity (new patient)
- 90833 — Psychotherapy add-on for E&M visit (always combined with 99XXX)

### SP Export → SM Workflow

```
SimplePractice
    │
    ▼ Manual export (no API)
Excel file (multi-sheet)
    │
    ▼ n8n: WF-SP-BILLING-SYNC
Normalize rows → Sales Invoice records in ERPNext
    │
    ├─ Create Customer if SM Client not found
    ├─ Create Sales Invoice per service line
    ├─ Set custom fields: session_date, clinician, billing_code,
    │  client_payment_status, insurance_payment_status
    └─ Deduplicate: match on Client + Date of Service + Billing Code
```

**Deduplication key:** `client_name + session_date + billing_code`  
If this combination already exists in Frappe, update rather than create.

---

## Part 3: Required DocType Updates Before Build

> **NOTE:** These additions are not corrections to the original spec — they
> are fields that exist in Erin's actual workflow that were not in the
> original DocType design. All three must be included. The practice
> should never be asked to stop tracking something they currently track.

Based on this analysis, the Phase 3.2 SM Client build prompt needs these additions:

### SM Client — Add These Fields

```python
# Add to SM Client DocType field list:
{"fieldname": "insurance_card_uploaded", "fieldtype": "Check",
 "label": "Insurance Card Uploaded", "insert_after": "insurance_secondary"},

{"fieldname": "updated_insurance_text", "fieldtype": "Small Text",
 "label": "Updated Insurance Notes", "insert_after": "insurance_card_uploaded"},

{"fieldname": "insurance_verified", "fieldtype": "Check",
 "label": "Insurance Verified", "insert_after": "updated_insurance_text"},
```

### SM Outreach Attempt — Method Values

Current spec is correct. Keep as:
`SP Reminder / Google Text / LVM / EMW / Final Reminder / Other`

### SM Invoice (ERPNext Sales Invoice Custom Fields)

Update status field values to match SP export exactly:

```python
# client_payment_status
"options": "NO CHARGE\nPAID\nUNPAID\nUNINVOICED\nOVERPAID"

# insurance_payment_status  
"options": "UNBILLED\nUNPAID\nPAID\nDENIED\nOVERPAID\nWRITE OFF"
```

---

## Part 4: Seed Data for POC

The anonymized data is ready to use for seeding the Frappe POC instance:

**Onboarding seed data:**
- Use "Need to Check" sheet (24 rows) as the active queue
- Use a sample of 10-20 rows from "Completed 2026" as completed records
- Use 5-10 rows from "Cancellation 2026" as cancelled records

**Billing seed data:**
- Use "unpaid at 350pm" sheet (6,576 rows) as the AR dataset
- Use "ins unbilled" sheet (1,014 rows) as the unbilled claims dataset

The anonymized names and IDs are already in place. The data is safe for
use on the non-HIPAA VPS for POC/development purposes.

---

*Field mapping analysis — Session 3c — March 23, 2026*
*Source: AnonymizedSM24_.xlsx + ANONYMIZEDSMUnpaid_Claims22626.xls*
