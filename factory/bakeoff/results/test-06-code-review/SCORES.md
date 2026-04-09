# Test 06: Adversarial Code Review — Scores

---

## MODEL: model-alpha | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1=caught
Evidence: Explicitly identifies "window.frappe.call()" on lines 14-17 as bypassing the abstraction layer.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "import type { VocabularyEntry }" on line 2 as TypeScript syntax forbidden in JSX.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies all three hex colors (#F9FAFB, #111827, #6B7280) on lines 41, 42, 46.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies class name "VocabularyConfig" lacks SM prefix, should be "SM Vocabulary Config".
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies requests.post in on_submit as violating n8n cross-system boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Perfect detection; clean structured output with correct fix suggestions.
Notable failure: None

---

## MODEL: model-alpha | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1=caught
Evidence: Identifies fetch to "http://localhost:8000/api/method/sm_scheduling.api.get_providers" on line 25 as bypassing MAL.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "interface TimeSlot" on lines 8-13 as TypeScript in JSX file.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "color: '#6B7280'" on line 64 as hardcoded hex color.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.db.exists("Appointment Type") on line 17 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies smtplib SMTP usage in _send_confirmation_email as violating n8n boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Perfect detection across all categories with correct remediation suggestions.
Notable failure: None

---

## MODEL: model-alpha | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1=caught
Evidence: Identifies axios.get to "http://internal.frappe:8000/api/method/sm_billing.api.list_payers" on lines 20-24.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "function formatPayerId(id: string)" on line 14 as TypeScript type annotation.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "background: '#F3F4F6'" on line 10 in PAYER_TABLE_STYLES.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.get_doc("Payer", self.payer_id) on line 39 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies subprocess.run(["stedi-cli",...]) in _sync_to_clearinghouse as violating n8n boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Perfect detection with detailed explanations and corrected code.
Notable failure: None

---

## MODEL: model-alpha | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High

Consistency narrative: model-alpha achieved perfect scores across all three runs with no variation. Every violation category was caught in every run regardless of how the bug was manifested.
Dominant strength: Comprehensive detection across all violation categories with zero misses.
Dominant weakness: None observed.
Prompt engineering note: No compensation needed; model performs flawlessly on this test.

---

## MODEL: model-beta | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1=caught
Evidence: Identifies "window.frappe.call()" on lines 17-21 as direct Frappe call bypassing MAL.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "import type { VocabularyEntry }" on line 2 as TypeScript syntax. Notes it is also unused.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies all three hex colors (#F9FAFB on line 34, #111827 on line 35, #6B7280 on line 38).
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies DocType named "Vocabulary Config" missing SM prefix; specifies renaming to "SM Vocabulary Config".
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies requests.post in on_submit on lines 14-23 as violating both Rule 6 and Rule 7.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Excellent depth of analysis; notes that handleSave already uses MAL pattern correctly.
Notable failure: None

---

## MODEL: model-beta | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1=caught
Evidence: Identifies fetch to "http://localhost:8000/api/method/sm_scheduling.api.get_providers" on line 23.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "interface TimeSlot" on lines 4-9 as TypeScript construct.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "color: '#6B7280'" on line 62 as hardcoded hex. Notes other labels in file use correct tokens.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.db.exists("Appointment Type") on line 17 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies smtplib.SMTP usage in _send_confirmation_email on lines 23-40 as most locked rule violation.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Exceptionally thorough; provides complete corrected file outputs.
Notable failure: None

---

## MODEL: model-beta | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1=caught
Evidence: Identifies axios.get to "http://internal.frappe:8000/api/method/sm_billing.api.list_payers" on line 24.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "function formatPayerId(id: string)" on line 12 as TypeScript type annotation.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "background: '#F3F4F6'" on line 8 as hardcoded hex color.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.get_doc("Payer", self.payer_id) on line 39 as missing SM prefix. Notes same file correctly uses "SM Payer" elsewhere.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies subprocess.run(["stedi-cli",...]) on lines 23-37 as violating n8n boundary rules 6 and 7.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Excellent contextual awareness; notes inconsistency between correct and incorrect patterns in same file.
Notable failure: None

---

## MODEL: model-beta | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High

Consistency narrative: model-beta achieved perfect scores across all three runs. The analysis quality was consistently high with strong contextual observations about inconsistencies within the code itself.
Dominant strength: Deep analysis with contextual awareness; consistently notes when correct patterns exist alongside violations.
Dominant weakness: None observed.
Prompt engineering note: No compensation needed; model performs flawlessly on this test.

---

## MODEL: model-gamma | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1=caught
Evidence: Identifies "window.frappe.call()" on lines 17-20 as bypassing MAL.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "import type { VocabularyEntry }" on line 2 as TypeScript syntax.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies all three hex colors (#F9FAFB, #111827, #6B7280) on lines 33, 34, 37.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies class "VocabularyConfig" and directory "vocabulary_config" as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies requests.post in on_submit on lines 13-19 as violating n8n cross-system boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Clean, well-organized review with appropriate severity ratings.
Notable failure: None

---

## MODEL: model-gamma | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1=caught
Evidence: Identifies fetch to Frappe native REST endpoint on line 17 as bypassing MAL.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "interface TimeSlot" on lines 4-9 as TypeScript in JSX.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "color: '#6B7280'" on line 55 as hardcoded hex.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.db.exists("Appointment Type") on line 19 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies smtplib usage in _send_confirmation_email on lines 2-3, 24, 23-40 as violating n8n boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Concise but complete; includes all necessary detail without excessive verbosity.
Notable failure: None

---

## MODEL: model-gamma | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1=caught
Evidence: Identifies axios.get to "http://internal.frappe:8000/api/method/sm_billing.api.list_payers" on line 24.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "function formatPayerId(id: string)" on line 11 as TypeScript type annotation.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "background: '#F3F4F6'" on line 7 as hardcoded hex.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.get_doc("Payer",...) on line 44 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies subprocess.run(["stedi-cli",...]) on line 33 as violating n8n cross-system boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Actionable priority table in summary; good remediation suggestions.
Notable failure: None

---

## MODEL: model-gamma | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High

Consistency narrative: model-gamma achieved perfect scores across all three runs. Output is consistently well-structured and concise, catching every violation without fail.
Dominant strength: Efficient, well-organized output that catches all violations without excessive verbosity.
Dominant weakness: None observed.
Prompt engineering note: No compensation needed; model performs flawlessly on this test.

---

## MODEL: model-delta | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1=caught
Evidence: Identifies "window.frappe.call()" on lines 17-22 as violating Rule 1.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "import type { VocabularyEntry }" on line 2. Notes the imported type is never used.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies all three hex colors (#F9FAFB on line 37, #111827 on line 38, #6B7280 on line 41).
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies class "VocabularyConfig" on line 5 as missing SM prefix. Notes the guardrails example explicitly shows "SM Vocabulary Config".
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies requests.post in on_submit on lines 13-27 as the most serious violation, citing it as "the most locked rule."
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Exceptionally detailed analysis with advisory notes on additional issues (replace bug, unused parameter).
Notable failure: None

---

## MODEL: model-delta | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1=caught
Evidence: Identifies fetch to "http://localhost:8000/api/method/sm_scheduling.api.get_providers" on lines 25-28. Notes two counts of violation (hardcoded localhost + direct Frappe call).
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "interface TimeSlot" on lines 4-7 as TypeScript in JSX. Notes it is dead code at runtime.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "color: '#6B7280'" on line 66.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.db.exists("Appointment Type") on line 16 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies smtplib.SMTP usage on lines 2-4 and 23-40 as violating the most locked rule. Provides complete corrected file. Separates the mechanical violation (V-04) from the architectural violation (V-06) of the method's existence.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Most thorough analysis of all models; separates mechanical and architectural dimensions of the n8n violation.
Notable failure: None

---

## MODEL: model-delta | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1=caught
Evidence: Identifies axios.get to "http://internal.frappe:8000/api/method/sm_billing.api.list_payers" as violating Rule 1.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "function formatPayerId(id: string)" as TypeScript type annotation violating Rule 4.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "background: '#F3F4F6'" in PAYER_TABLE_STYLES as violating Rule 5.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.get_doc("Payer", self.payer_id) as violating Rule 3. Discusses both possible interpretations.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies subprocess.run(["stedi-cli",...]) as the single most critical violation, citing Rules 6 and 7.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Advisory note about mixed axios/fetch usage shows strong attention to code quality beyond planted bugs.
Notable failure: None

---

## MODEL: model-delta | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High

Consistency narrative: model-delta achieved perfect scores across all three runs with the deepest analysis of any model. Consistently provides advisory-level observations beyond the planted violations.
Dominant strength: Deepest analytical rigor; identifies secondary implications (dead code, unused parameters, mixed HTTP clients) alongside planted bugs.
Dominant weakness: None observed.
Prompt engineering note: No compensation needed; model performs flawlessly on this test.

---

## MODEL: model-epsilon | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1=caught
Evidence: Identifies "window.frappe.call()" on line 17 as bypassing MAL. Also flags the inconsistency between load and save patterns.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "import type { VocabularyEntry }" on line 3 as TypeScript in frontend.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies all three hex colors (#F9FAFB, #111827, #6B7280) on lines 34, 36, 39.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies class "VocabularyConfig" on line 4 as missing SM prefix. Initially flagged as observation, then confirmed as violation in File 2 analysis.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies requests.post in on_submit on lines 13-24 as violating Rules 6 and 7.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Catches all violations; identifies the inconsistency between load/save API patterns.
Notable failure: None

---

## MODEL: model-epsilon | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1=caught
Evidence: Identifies fetch to "http://localhost:8000/api/method/..." on line 26 as direct Frappe call.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "interface TimeSlot" on lines 4-8 as TypeScript in JSX.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "color: '#6B7280'" on line 57 as hardcoded hex.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.db.exists("Appointment Type") on line 10 as missing SM prefix. Adds caveat about whether it could be a standard ERPNext DocType.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies smtplib.SMTP usage on lines 1-3, 17-38 as violating n8n boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Catches all violations; identifies bare except clauses as additional quality issue.
Notable failure: None

---

## MODEL: model-epsilon | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1=caught
Evidence: Identifies axios.get to "http://internal.frappe:8000/api/method/sm_billing.api.list_payers" on lines 21-25.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "function formatPayerId(id: string)" on line 13 as TypeScript annotation.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "background: '#F3F4F6'" on line 8 as hardcoded hex.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.get_doc("Payer", self.payer_id) on line 37 as missing SM prefix. Listed as "Bonus Finding" but explicitly identified with correct reasoning.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies subprocess.run(["stedi-cli",...]) on lines 23-31 as violating n8n boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Catches all violations; provides corrected code snippets.
Notable failure: None

---

## MODEL: model-epsilon | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High

Consistency narrative: model-epsilon achieved perfect scores across all three runs. Occasionally hedges on SM-PREFIX (noting it could be a standard DocType) but always identifies the violation correctly.
Dominant strength: Reliable detection of all violation categories with practical corrected code.
Dominant weakness: Slight hedging on SM-PREFIX in Runs B and C (adds caveats about whether DocType might be standard), though still correctly identifies the violation.
Prompt engineering note: No compensation needed; model performs flawlessly on this test.

---

## MODEL: model-zeta | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1=caught
Evidence: Identifies "window.frappe.call()" on lines 13-18 as bypassing abstraction layer.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "import type { VocabularyEntry }" on line 2 as TypeScript syntax.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies all three hex colors (#F9FAFB on line 34, #111827 on line 35, #6B7280 on line 38).
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies class "VocabularyConfig" on line 5 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies requests.post on lines 17-25 as violating n8n boundary (Rules 6 and 7).
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Concise, well-structured output with clear remediation actions.
Notable failure: None

---

## MODEL: model-zeta | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1=caught
Evidence: Identifies fetch to "http://localhost:8000/api/method/sm_scheduling.api.get_providers" on line 20.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "interface TimeSlot" on line 5 as TypeScript in JSX.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "color: '#6B7280'" on line 64 as hardcoded hex.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.db.exists("Appointment Type") on line 18 as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies smtplib.SMTP usage in _send_confirmation_email on lines 23-39 as violating n8n boundary.
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Clean, concise output; correctly notes smtplib imports should also be removed.
Notable failure: None

---

## MODEL: model-zeta | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1=caught
Evidence: Identifies axios.get to "http://internal.frappe:8000/api/method/sm_billing.api.list_payers" as bypassing MAL.
Failure classification if missed: N/A

[TYPESCRIPT]: 1=caught
Evidence: Identifies "function formatPayerId(id: string)" as TypeScript type annotation.
Failure classification if missed: N/A

[HEX-COLOR]: 1=caught
Evidence: Identifies "background: '#F3F4F6'" in PAYER_TABLE_STYLES as hardcoded hex.
Failure classification if missed: N/A

[SM-PREFIX]: 1=caught
Evidence: Identifies frappe.get_doc("Payer", self.payer_id) as missing SM prefix.
Failure classification if missed: N/A

[N8N-BOUNDARY]: 1=caught
Evidence: Identifies subprocess.run(["stedi-cli",...]) as violating n8n boundary (Rules 6 and 7).
Failure classification if missed: N/A

TOTAL: 5/5
Notable strength: Also flags X-Frappe-Site-Name header leakage as an additional architecture concern.
Notable failure: None

---

## MODEL: model-zeta | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High

Consistency narrative: model-zeta achieved perfect scores across all three runs. Output is concise and consistently well-structured.
Dominant strength: Concise detection with additional architecture observations (e.g., header leakage in Run C).
Dominant weakness: None observed.
Prompt engineering note: No compensation needed; model performs flawlessly on this test.

---

# Cross-Model Violation Detection Table

| Violation | alpha | beta | gamma | delta | epsilon | zeta |
|-----------|-------|------|-------|-------|---------|------|
| REACT-FRAPPE | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| TYPESCRIPT | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| HEX-COLOR | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| SM-PREFIX | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| N8N-BOUNDARY | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| **TOTAL** | **15/15** | **15/15** | **15/15** | **15/15** | **15/15** | **15/15** |

---

# Overall Test 06 Assessment

**Every model achieved a perfect 5/5 on every run.** Test 06 produced zero differentiation across models. All six models caught all five planted violations in all three runs (18/18 perfect scores).

This test does not discriminate between models at the current capability level. The violations may be too explicit given that the prompt provides a clear rules summary. Consider for future iterations:
- Removing or reducing the rules summary in the prompt
- Adding more subtle violations (e.g., indirect Frappe calls, borderline hex values like rgb() or hsl())
- Increasing the number of violations beyond 5
- Planting red herrings (things that look like violations but are not)

**Qualitative differentiation (not scored):**
- **model-delta** consistently provides the deepest analysis with advisory notes beyond planted bugs
- **model-beta** consistently provides the strongest contextual awareness (noting correct patterns alongside violations)
- **model-gamma** provides the most concise, efficient output
- **model-zeta** occasionally identifies additional architecture concerns beyond the planted violations
