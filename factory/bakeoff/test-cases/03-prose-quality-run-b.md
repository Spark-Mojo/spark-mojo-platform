# Test 03: Prose Quality — Run B (Healthcare Billing Mojo Internal Playbook)

**Task type:** Prose generation
**Evaluates:** Can the model write comprehensive, well-structured operational 
documentation for a billing admin audience, grounded in a real data model and 
feature specification?

**This is Run B. Run A tests a USER-GUIDE for WorkboardMojo (end-user). 
Run C tests a USER-GUIDE for Scheduling Mojo. This run tests an 
INTERNAL-PLAYBOOK for a technical billing domain.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- `platform/feature-library/BILLING.md` (from sparkmojo-internal repo — 
  full feature spec including 19-state model, all DocType fields, all endpoints, 
  all features and workflows)

Do NOT tell the model what score it needs to achieve.

---

## Prompt (give this to the model, nothing else)
```

You are the KB Writer for the Spark Mojo build factory. Healthcare Billing Mojo is a revenue cycle management feature built on the Spark Mojo platform for behavioral health therapy practices. The full feature specification and data model have been provided as context in BILLING.md. Read it carefully before writing.
Write an INTERNAL-PLAYBOOK.md for Healthcare Billing Mojo.
The INTERNAL-PLAYBOOK is for Spark Mojo admins and practice billing managers — people who understand healthcare billing operations but may be new to this specific platform.
Requirements:
* Clear professional language appropriate for billing managers
* Document every workflow function by function and field by field using the actual fields defined in the data model (SM Claim, SM Claim State Log, SM Denial, SM Appeal DocTypes)
* Reference actual state names from the 19-state model (e.g., draft, pending_info, adjudicating, in_appeal) — not generic descriptions
* Cover every major workflow: eligibility check, claim submission, ERA processing (835), 277CA webhook handling, denial management, claim correction and resubmission, appeal lifecycle, write-off approval
* Include at minimum 10 real-world operational scenarios written as step-by-step procedures. Examples: "How to handle a CO-45 denial using the denial worklist", "How to process a partial payment ERA", "How to initiate a second-level appeal after appeal_lost", "How to authorize a write-off as a supervisor"
* Include at minimum 20 FAQ-style questions and answers covering common admin and support questions. Questions should reference actual platform concepts and states, not generic billing questions.
* Include a troubleshooting section covering common error states and transitions
* Note which workflows are manual (require human action) vs automated (system-triggered) — this distinction is documented in the spec
* Structure: Overview, Who Uses This and How, Detailed Function Reference (by feature tier), Operational Scenarios, Troubleshooting, FAQ

```

---

## Scoring Rubric

### Category A: Clarity and Audience Fit (0-5)
- 5: Clear professional language appropriate for billing managers; technical 
  terms explained on first use; active voice; procedures are unambiguous
- 4: Mostly clear; 3-5 confusing passages or undefined terms
- 3: Readable in places but lapses in tone
- 2: Tone inappropriate for audience
- 1: Not appropriate for the target audience

### Category B: Operational Scenario Coverage (0-5)
- 5: 10+ complete step-by-step procedures; references actual state names 
  (draft, denied, in_appeal, etc.) and actual field names (canonical_state, 
  hold_reason, write_off_approved_by, etc.); covers all major workflows 
  listed in prompt; manual vs automated distinction clear
- 4: 8-9 scenarios; mostly complete
- 3: 5-7 scenarios; some are thin or use generic descriptions instead of 
  actual platform states/fields
- 2: Fewer than 5 or too abstract
- 1: No scenarios or single-sentence descriptions

### Category C: FAQ Completeness (0-5)
- 5: 20+ FAQ questions; answers are specific and reference actual platform 
  concepts; covers both operational questions and support/escalation questions
- 4: 15-19 questions; mostly good
- 3: 10-14 questions; some generic
- 2: Fewer than 10 questions
- 1: No FAQ section

### Category D: Structure and Navigation (0-5)
- 5: Clear structure matching required sections; troubleshooting section 
  present and useful; headings make it easy to locate any admin function; 
  feature tier organization mirrors the spec (Features 1-5)
- 4: Good structure with one missing section
- 3: Structure present but hard to navigate
- 2: Poorly structured
- 1: No meaningful structure

### Category E: Grounding in Actual Data Model (0-5)
- 5: References actual field names from the spec (not invented ones); 
  correct state names throughout; SM Claim, SM Denial, SM Appeal DocTypes 
  correctly described; no invented features or states not in the spec
- 4: Mostly grounded; 1-2 invented or wrong field references
- 3: Mix of real and invented fields/states
- 2: Mostly generic; real fields rarely referenced
- 1: Entirely hallucinated; no grounding in provided spec

**Maximum score: 25**
**Pass threshold: 18/25**

---

## What Good Looks Like

A passing submission correctly names the 19 states by their canonical values 
(not made-up names), references actual DocType fields like `hold_reason`, 
`write_off_approved_by`, `ai_category`, `appeal_level`, and correctly 
distinguishes automated transitions (system-triggered by 277CA/835 webhooks) 
from manual ones (biller/supervisor required). The operational scenarios 
feel like real billing operations procedures, not generic RCM documentation 
that could apply to any system.
