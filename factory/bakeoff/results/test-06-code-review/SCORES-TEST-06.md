# SCORES — Test 06: Adversarial Code Review

Scoring: Binary per violation (1=caught, 0=missed). 5 violations per run.

---

## RUN A — Vocabulary Settings

```
MODEL: model-alpha | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1
  Evidence: Identified window.frappe.call() as "Violation 2: React Calling Frappe Directly" with full code snippet and fix
[TYPESCRIPT]: 1
  Evidence: Identified import type as "Violation 1: TypeScript Import" — "import type syntax is TypeScript-specific"
[HEX-COLOR]: 1
  Evidence: Identified all three hex values (#F9FAFB, #111827, #6B7280) as Violations 3, 4, 5
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 6: DocType Not Prefixed with SM" — class VocabularyConfig lacks SM prefix
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 7: Frappe Controller Making External HTTP Call" — requests.post in on_submit
TOTAL: 5/5
```

```
MODEL: model-beta | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 2 — React Calling Frappe Directly" — window.frappe.call bypasses MAL
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1 — TypeScript in Frontend File" — import type is TypeScript syntax
[HEX-COLOR]: 1
  Evidence: Identified all three hex values as Violations 3, 4, 5
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 6 — DocType Not Prefixed SM" — must be SM Vocabulary Config
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 7 — Frappe Controller Making External HTTP Call" — requests.post to logging service
TOTAL: 5/5
```

```
MODEL: model-gamma | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1
  Evidence: Identified as "Issue 2: Direct Frappe Call from React" — window.frappe.call bypasses MAL
[TYPESCRIPT]: 1
  Evidence: Identified as "Issue 1: TypeScript Syntax in Frontend" — import type is TypeScript-only
[HEX-COLOR]: 1
  Evidence: Identified all three hex values (#F9FAFB, #111827, #6B7280) as "Issue 3: Hardcoded Hex Colors"
[SM-PREFIX]: 1
  Evidence: Identified as "Issue 5: Missing SM Prefix on Custom DocType" — VocabularyConfig missing SM prefix
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Issue 4: External HTTP Call in Frappe Controller" — requests.post violates n8n boundary
TOTAL: 5/5
```

```
MODEL: model-delta | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1
  Evidence: Identified as "VIOLATION 2 — Direct Frappe Call from React" with detailed rule citation
[TYPESCRIPT]: 1
  Evidence: Identified as "VIOLATION 1 — TypeScript Import in a JSX File" — import type is TypeScript syntax
[HEX-COLOR]: 1
  Evidence: Identified all three hex values as Violations 3, 4, 5 individually
[SM-PREFIX]: 1
  Evidence: Identified as "VIOLATION 7 — DocType Class Name Is Not Prefixed SM"
[N8N-BOUNDARY]: 1
  Evidence: Identified as "VIOLATION 6 — Frappe Controller Making a Direct External HTTP Call" — most serious violation, requests.post
TOTAL: 5/5
```

```
MODEL: model-epsilon | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 2 — React Calls Frappe Directly" — window.frappe.call bypasses MAL
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1 — TypeScript in Frontend File" — import type is TypeScript syntax
[HEX-COLOR]: 1
  Evidence: Identified all three hex values as "Violation 4 — Hardcoded Hex Colors (Multiple Instances)"
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5 — DocType Class Name Missing SM Prefix" — VocabularyConfig not prefixed
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 6 — Frappe Controller Makes External HTTP Call" — requests.post in on_submit
TOTAL: 5/5
```

```
MODEL: model-zeta | TEST: 06 | RUN: A
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 2: React Calls Frappe Directly" — window.frappe.call bypasses abstraction layer
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1: TypeScript in JSX File" — import type is TypeScript-specific
[HEX-COLOR]: 1
  Evidence: Identified all three hex values as Violations 3, 4, 5
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 6: DocType Missing SM Prefix" — VocabularyConfig should be SM Vocabulary Config
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 7: Frappe Controller Makes External HTTP Call" — requests.post to logging service
TOTAL: 5/5
```

---

## RUN B — Scheduling Module

```
MODEL: model-alpha | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 2: Direct Frappe API Call" — fetch to localhost:8000/api/method/sm_scheduling
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1: TypeScript Interface Declaration" — interface TimeSlot is TypeScript
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 3: Hardcoded Hex Color" — color: '#6B7280' on label
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5: DocType Missing SM Prefix" — "Appointment Type" should be "SM Appointment Type"
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 4: Direct External API Call (Email Sending)" — smtplib.SMTP to SendGrid in after_insert
TOTAL: 5/5
```

```
MODEL: model-beta | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 2 — React Calling Frappe Directly" — fetch to Frappe API directly with hardcoded localhost
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1 — TypeScript in .jsx File" — interface TimeSlot is TypeScript construct
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 3 — Hardcoded Hex Color" — color: '#6B7280'
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5 — Unprefixed DocType Reference" — "Appointment Type" missing SM prefix
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 4 — Frappe Controller Making External Calls Directly" — direct SMTP to smtp.sendgrid.net
TOTAL: 5/5
```

```
MODEL: model-gamma | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1
  Evidence: Identified as "Issue 2: Direct Frappe API Call" — React bypassing MAL
[TYPESCRIPT]: 1
  Evidence: Identified as "Issue 1: TypeScript Interface Declaration" — interface in JSX file
[HEX-COLOR]: 1
  Evidence: Identified as "Issue 3: Hardcoded Hex Color" — '#6B7280'
[SM-PREFIX]: 1
  Evidence: Identified as "Issue 4: Missing SM Prefix on Custom DocType" — "Appointment Type" lacks SM prefix
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Issue 5: Direct External Email Dispatch from Frappe Controller" — smtplib usage
TOTAL: 5/5
```

```
MODEL: model-delta | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1
  Evidence: Identified as "V-02 — React calls Frappe directly, bypassing the Mojo Abstraction Layer"
[TYPESCRIPT]: 1
  Evidence: Identified as "V-01 — TypeScript interface declaration in a .jsx file"
[HEX-COLOR]: 1
  Evidence: Identified as "V-03 — Hardcoded hex color" — '#6B7280'
[SM-PREFIX]: 1
  Evidence: Identified as "V-05 — DocType reference is not prefixed SM" — "Appointment Type" without SM
[N8N-BOUNDARY]: 1
  Evidence: Identified as "V-04 — Frappe controller imports and uses smtplib" plus "V-06 — _send_confirmation_email method existence violates n8n boundary"
TOTAL: 5/5
```

```
MODEL: model-epsilon | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 2: Direct Frappe API Call" — fetch to localhost:8000/api/method
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1: TypeScript Interface Declaration" — interface TimeSlot in JSX
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 3: Hardcoded Hex Color" — color: '#6B7280'
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 2: Non-SM-Prefixed DocType Reference" — "Appointment Type" should be SM prefixed
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 1: External Call from Frappe Controller (CRITICAL)" — smtplib.SMTP to SendGrid
TOTAL: 5/5
```

```
MODEL: model-zeta | TEST: 06 | RUN: B
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 2: React Calling Frappe Directly" — fetch to localhost:8000/api/method
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1: TypeScript Interface in JSX File" — interface TimeSlot
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 3: Hardcoded Hex Color" — color: '#6B7280'
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5: DocType Missing SM Prefix" — "Appointment Type" without SM
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 4: Frappe Controller Making External Email Calls" — smtplib to SendGrid
TOTAL: 5/5
```

---

## RUN C — Billing/Payer

```
MODEL: model-alpha | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 1: React Calling Frappe Directly" — axios.get to internal.frappe:8000/api/method
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 3: TypeScript Type Annotation" — function formatPayerId(id: string)
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 2: Hardcoded Hex Color" — background: '#F3F4F6'
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5: DocType Reference Without SM Prefix" — frappe.get_doc("Payer", ...)
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 4: Frappe Controller Making External Call via CLI Tool" — subprocess.run stedi-cli
TOTAL: 5/5
```

```
MODEL: model-beta | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 1 — Direct Frappe API Call from React" — axios.get to internal.frappe:8000
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 3 — TypeScript Type Annotation in .jsx File" — id: string annotation
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 2 — Hardcoded Hex Color" — background: '#F3F4F6'
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5 — Unprefixed DocType Reference" — frappe.get_doc("Payer", ...)
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 4 — Frappe Controller Making External System Call Directly" — subprocess.run stedi-cli
TOTAL: 5/5
```

```
MODEL: model-gamma | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 1: Direct Frappe API Call" — axios.get to internal.frappe:8000/api/method
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 2: TypeScript Type Annotation" — (id: string) in JSX
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 3: Hardcoded Hex Color" — '#F3F4F6'
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5: Unprefixed DocType Reference" — frappe.get_doc("Payer", ...)
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 4: Frappe Controller Making External System Calls" — subprocess.run stedi-cli
TOTAL: 5/5
```

```
MODEL: model-delta | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 1 — Direct Frappe API Call" — axios.get to internal.frappe:8000
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 2 — TypeScript Type Annotation in .jsx File" — id: string
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 3 — Hardcoded Hex Color" — '#F3F4F6' in PAYER_TABLE_STYLES
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 5 — Reference to Unprefixed DocType Payer"
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 4 — Frappe Controller Making an External CLI/API Call" — subprocess.run stedi-cli, "single most critical violation"
TOTAL: 5/5
```

```
MODEL: model-epsilon | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 1: Direct Frappe API Call" — axios.get to internal.frappe:8000/api/method
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 2: TypeScript Annotation in JSX" — function formatPayerId(id: string)
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 3: Hardcoded Hex Color" — background: '#F3F4F6'
[SM-PREFIX]: 1
  Evidence: Identified as "Bonus Finding: DocType Reference Without SM Prefix" — frappe.get_doc("Payer", ...) flagged as violation with rule citation
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 1: External Call from Frappe Controller" — subprocess.run stedi-cli
TOTAL: 5/5
```

```
MODEL: model-zeta | TEST: 06 | RUN: C
[REACT-FRAPPE]: 1
  Evidence: Identified as "Violation 3: Direct Frappe API Call from React" — axios.get to internal.frappe:8000
[TYPESCRIPT]: 1
  Evidence: Identified as "Violation 1: TypeScript Type Annotation in JSX File" — id: string
[HEX-COLOR]: 1
  Evidence: Identified as "Violation 2: Hardcoded Hex Color" — background: '#F3F4F6'
[SM-PREFIX]: 1
  Evidence: Identified as "Violation 6: Missing SM Prefix in DocType Reference" — frappe.get_doc("Payer", ...)
[N8N-BOUNDARY]: 1
  Evidence: Identified as "Violation 5: Frappe Controller Making External System Calls" — subprocess.run stedi-cli
TOTAL: 5/5
```

---

## MODEL SUMMARIES

```
MODEL: model-alpha | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High
Consistency narrative: Caught all 5 violation categories across all 3 runs with no misses. Provided detailed explanations and correct implementations for every violation.
```

```
MODEL: model-beta | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High
Consistency narrative: Perfect detection across all 3 runs. Consistently identified the n8n boundary violation as the most severe. Provided clean before/after code for every fix.
```

```
MODEL: model-gamma | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High
Consistency narrative: Caught all 5 violation categories across all 3 runs. Slightly more concise format than other models but equally thorough in violation detection.
```

```
MODEL: model-delta | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High
Consistency narrative: Perfect detection across all 3 runs. Most verbose and detailed of all models — included advisory findings beyond the 5 target violations (e.g., replace('_',' ') bug in Run A, unused parameter). In Run B, split the n8n boundary violation into two separate entries (mechanical and architectural), demonstrating deep analysis.
```

```
MODEL: model-epsilon | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High
Consistency narrative: Caught all 5 violation categories across all 3 runs. In Run C, labeled the SM-PREFIX finding as "Bonus Finding" rather than a numbered violation but still explicitly flagged it as a rule violation with the correct rule citation, so it counts as caught.
```

```
MODEL: model-zeta | TEST: 06 SUMMARY
Run A: 5/5 | Run B: 5/5 | Run C: 5/5
Mean: 5.0 | Range: 0 | Consistency: High
Consistency narrative: Perfect detection across all 3 runs. Concise and well-structured reports. In Run C, also identified an additional advisory finding (Frappe-specific headers in frontend) beyond the 5 target violations.
```

---

## CROSS-MODEL COMPARISON

| Model | Run A | Run B | Run C | Mean | Range |
|-------|-------|-------|-------|------|-------|
| model-alpha | 5/5 | 5/5 | 5/5 | 5.0 | 0 |
| model-beta | 5/5 | 5/5 | 5/5 | 5.0 | 0 |
| model-gamma | 5/5 | 5/5 | 5/5 | 5.0 | 0 |
| model-delta | 5/5 | 5/5 | 5/5 | 5.0 | 0 |
| model-epsilon | 5/5 | 5/5 | 5/5 | 5.0 | 0 |
| model-zeta | 5/5 | 5/5 | 5/5 | 5.0 | 0 |

**Overall Assessment:** All 6 models achieved perfect scores across all 3 runs (90/90 total violations caught). This test did not differentiate between models. Every model reliably detected all 5 violation categories (REACT-FRAPPE, TYPESCRIPT, HEX-COLOR, SM-PREFIX, N8N-BOUNDARY) regardless of the specific code manifestation (Run A vocabulary, Run B scheduling, Run C billing). The violations may have been too clearly planted or the guardrails context too explicit for this test to provide meaningful separation.
