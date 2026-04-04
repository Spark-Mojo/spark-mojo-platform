# PLAN-BILL-002: Core Billing DocTypes

## Overview

Create 11 DocTypes in `frappe-apps/sm_billing/sm_billing/sm_billing/doctype/`. Each directory contains `__init__.py`, `sm_{name}.json`, and `sm_{name}.py`. All JSON files use `"module": "SM Billing"` matching `modules.txt`.

## Reference Pattern

Follow `frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/doctype/sm_site_registry/` for JSON structure, permissions, and naming conventions.

---

## DocType List

### 1. SM Payer

- **Path:** `sm_payer/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "By fieldname"`, `"autoname": "field:payer_short_name"`
- **Key fields:** payer_name (Data 256, reqd), payer_short_name (Data 64, reqd, unique), stedi_trading_partner_id (Data 64, reqd), payer_type (Select: commercial/medicare/medicaid/managed_medicaid/tricare, reqd), is_behavioral_health_carveout (Check), carveout_parent_payer (Link: SM Payer), era_delivery_method (Select: webhook/sftp/portal, reqd), supports_realtime_eligibility (Check, default 1), typical_payment_days (Int), appeal_window_days (Int), timely_filing_days (Int, reqd), notes (Text), is_active (Check, reqd, default 1)

### 2. SM Provider

- **Path:** `sm_provider/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "By fieldname"`, `"autoname": "field:npi"`
- **Key fields:** provider_name (Data 256, reqd), npi (Data 10, reqd, unique), tax_id (Data 11, reqd), taxonomy_code (Data 20, reqd), license_type (Select: LCSW/LPC/LMFT/PsyD/PhD/MD/DO/PMHNP/other, reqd), license_number (Data 64, reqd), license_state (Data 2, reqd), license_expiration (Date, reqd), medplum_practitioner_id (Data 128), erpnext_employee_id (Data 128), credentialing_status (Select: not_started/in_progress/active/expired/suspended), caqh_provider_id (Data 20), is_active (Check, reqd, default 1)

### 3. SM Claim

- **Path:** `sm_claim/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "Expression"`, `"autoname": "CLM-.YYYY.MM.-.####"`
- **is_submittable:** 0
- **Key fields:** patient_name (Data 256, reqd), patient_member_id (Data 64, reqd), patient_dob (Date, reqd), payer (Link: SM Payer, reqd), provider (Link: SM Provider, reqd), billing_provider (Link: SM Provider), date_of_service (Date, reqd), place_of_service (Select: 11/02/10, reqd), claim_charge_amount (Currency, reqd), canonical_state (Select: draft/validated/submitted/accepted/adjudicating/paid/partial_paid/denied/appealed/appeal_won/appeal_lost/voided, reqd, default draft), stedi_claim_id (Data 128), patient_control_number (Data 64, reqd, unique), submission_date (Date), acknowledgment_date (Date), adjudication_date (Date), paid_amount (Currency), patient_responsibility (Currency), adjustment_amount (Currency), prior_auth_number (Data 64), medplum_encounter_id (Data 128), crm_contact_id (Data 128), ai_completeness_score (Float), ai_risk_level (Select: low/medium/high), notes (Text)
- **Child table field:** claim_lines (Table, options: SM Claim Line)

### 4. SM Claim Line

- **Path:** `sm_claim_line/`
- **is_child_table:** Yes (`"istable": 1`)
- **Parent:** SM Claim, parentfield: claim_lines
- **Naming rule:** default (hash)
- **Key fields:** line_number (Int, reqd), cpt_code (Data 10, reqd), modifiers (Data 20), icd_codes (Data 100, reqd), charge_amount (Currency, reqd), units (Int, reqd, default 1), paid_amount (Currency), adjustment_amount (Currency), denial_reason_code (Data 10)

### 5. SM ERA

- **Path:** `sm_era/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "Expression"`, `"autoname": "ERA-.YYYY.MM.-.####"`
- **Key fields:** stedi_transaction_id (Data 128, reqd), payer (Link: SM Payer, reqd), era_date (Date, reqd), check_eft_number (Data 64), total_paid_amount (Currency, reqd), total_claims (Int), matched_claims (Int), unmatched_claims (Int), processing_status (Select: received/processing/posted/partial_posted/error, reqd, default received), received_at (Datetime, reqd), processed_at (Datetime), raw_json (JSON)
- **Child table field:** era_lines (Table, options: SM ERA Line)

### 6. SM ERA Line

- **Path:** `sm_era_line/`
- **is_child_table:** Yes (`"istable": 1`)
- **Parent:** SM ERA, parentfield: era_lines
- **Naming rule:** default (hash)
- **Key fields:** claim (Link: SM Claim), patient_control_number (Data 64, reqd), cpt_code (Data 10, reqd), charged_amount (Currency, reqd), paid_amount (Currency, reqd), adjustment_amount (Currency), patient_responsibility (Currency), carc_codes (Data 100), rarc_codes (Data 100), is_denied (Check), match_status (Select: matched/unmatched/manual_review, reqd, default unmatched)

### 7. SM Denial

- **Path:** `sm_denial/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "Expression"`, `"autoname": "DEN-.YYYY.MM.-.####"`
- **Key fields:** claim (Link: SM Claim, reqd), era (Link: SM ERA), denial_date (Date, reqd), carc_codes (Data 100, reqd), rarc_codes (Data 100), denied_amount (Currency, reqd), ai_category (Select: eligibility/authorization/medical_necessity/coding_error/modifier_error/timely_filing/duplicate/coordination_of_benefits/credentialing/other), ai_subcategory (Data 128), ai_plain_english (Text), ai_root_cause (Text), ai_appealable (Check), ai_appeal_priority (Select: high/medium/low/do_not_appeal), ai_confidence (Float), canonical_state (Select: new/reviewing/appeal_in_progress/appeal_submitted/appeal_won/appeal_lost/written_off, reqd, default new), appeal_deadline (Date), assigned_to (Data 256), notes (Text)

### 8. SM Appeal

- **Path:** `sm_appeal/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "Expression"`, `"autoname": "APL-.YYYY.MM.-.####"`
- **Key fields:** denial (Link: SM Denial, reqd), claim (Link: SM Claim, reqd), appeal_level (Select: first_level/second_level/external_review, reqd), appeal_date (Date, reqd), appeal_method (Select: fax/portal/mail/electronic, reqd), ai_generated_letter (Text Editor), final_letter (Text Editor), supporting_documents (Attach), canonical_state (Select: draft/submitted/under_review/won/lost/no_response, reqd, default draft), outcome_date (Date), recovered_amount (Currency), payer_response (Text)

### 9. SM Eligibility Check

- **Path:** `sm_eligibility_check/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "Expression"`, `"autoname": "ELIG-.YYYY.MM.DD.-.####"`
- **Key fields:** patient_name (Data 256, reqd), patient_member_id (Data 64, reqd), payer (Link: SM Payer, reqd), check_date (Date, reqd), check_type (Select: realtime/batch, reqd), coverage_active (Check), plan_name (Data 256), copay_amount (Currency), coinsurance_pct (Percent), deductible_total (Currency), deductible_remaining (Currency), oop_max_total (Currency), oop_max_remaining (Currency), in_network (Check), prior_auth_required (Check), visit_limit (Int), visits_used (Int), raw_response_json (JSON), crm_contact_id (Data 128)

### 10. SM Payment

- **Path:** `sm_payment/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "Expression"`, `"autoname": "PAY-.YYYY.MM.-.####"`
- **Key fields:** claim (Link: SM Claim), patient_name (Data 256, reqd), payment_date (Date, reqd), amount (Currency, reqd), payment_method (Select: ach/credit_card/check/cash, reqd), processor_transaction_id (Data 128), canonical_state (Select: pending/completed/failed/refunded, reqd, default pending), settlement_date (Date), crm_contact_id (Data 128), notes (Text)

### 11. SM Credential

- **Path:** `sm_credential/`
- **is_child_table:** No
- **Naming rule:** `"naming_rule": "Expression"`, `"autoname": "CRED-.YYYY.-.####"`
- **Key fields:** provider (Link: SM Provider, reqd), payer (Link: SM Payer, reqd), credential_type (Select: initial/recredentialing, reqd), canonical_state (Select: not_started/application_submitted/in_review/approved/denied/expired, reqd, default not_started), application_date (Date), approval_date (Date), expiration_date (Date), effective_date (Date), caqh_provider_id (Data 20), notes (Text)

---

## Confirmation

- All 11 DocType JSON files will have `"module": "SM Billing"` matching `modules.txt`
- All directories at `frappe-apps/sm_billing/sm_billing/sm_billing/doctype/{doctype}/`
- Each directory contains: `__init__.py`, `sm_{name}.json`, `sm_{name}.py`
- SM Claim Line and SM ERA Line have `"istable": 1`
- SM Claim has Table field for SM Claim Line; SM ERA has Table field for SM ERA Line
- All Link fields reference correct target DocTypes
- All permissions: System Manager with full CRUD

## Gate

- `bench --site poc-dev.sparkmojo.com migrate` exits 0
- All 11 DocTypes visible in Frappe Desk
- Test SM Payer record creation succeeds
- Test SM Claim record with child SM Claim Line row succeeds
