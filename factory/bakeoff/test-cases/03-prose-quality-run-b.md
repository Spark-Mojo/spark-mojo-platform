# Test 03: Prose Quality — Run B (Healthcare Billing Mojo Internal Playbook)

**Task type:** Prose generation
**Evaluates:** Can the model write comprehensive, well-structured operational documentation for a billing admin audience?

**This is Run B. Run A tests a USER-GUIDE for WorkboardMojo (end-user). Run C tests a USER-GUIDE for Scheduling Mojo. This run tests an INTERNAL-PLAYBOOK for a technical billing domain.**

---

## Input Files

No external files needed. Feature context is embedded in the prompt.

Do NOT tell the model what score it needs to achieve.

---

## Prompt (give this to the model, nothing else)
```
You are the KB Writer for the Spark Mojo build factory. Healthcare Billing Mojo is a revenue cycle management feature built on the Spark Mojo platform for behavioral health therapy practices. It is used to submit insurance claims, process payment remittances (ERAs), check patient eligibility, manage claim denials, and track the full billing lifecycle from session completion through payment.
Key concepts:
* Claims move through a 19-state lifecycle: draft → ready_to_submit → submitted → acknowledged → accepted → ... → paid or denied or written_off
* ERA (Electronic Remittance Advice): a file from the insurance company showing what was paid, adjusted, or denied
* Eligibility checks verify a patient's insurance coverage before a session
* Denials require a response: correct and resubmit, appeal, or write off
* Stedi is the clearinghouse that transmits claims to payers and returns ERAs
Write an INTERNAL-PLAYBOOK.md for Healthcare Billing Mojo.
The INTERNAL-PLAYBOOK is for Spark Mojo admins and practice billing managers — people who understand healthcare billing operations but may be new to this specific platform.
Requirements:
* Clear professional language appropriate for billing managers
* Explain every admin function screen by screen, field by field
* Cover every major workflow: eligibility check, claim submission, ERA processing, denial handling, claim correction and resubmission, write-off
* Include at minimum 10 real-world operational scenarios written as step-by-step procedures (e.g., "How to handle a CO-45 denial", "How to process an ERA with partial payments", "How to resubmit a corrected claim")
* Include at minimum 20 FAQ-style questions and answers covering common admin questions and support issues
* Include a troubleshooting section for common error states
* Structure: Overview, Who Uses This and How, Detailed Function Reference, Operational Scenarios, Troubleshooting, FAQ
```

---

## Scoring Rubric

### Category A: Clarity and Audience Fit (0-5)
- 5: Clear professional language appropriate for billing managers; technical terms explained on first use; active voice; procedures are unambiguous
- 4: Mostly clear; 3-5 confusing passages or undefined terms
- 3: Readable in places but lapses into overly casual or overly academic tone
- 2: Tone inappropriate for audience
- 1: Not appropriate for the target audience

### Category B: Operational Scenario Coverage (0-5)
- 5: 10+ complete step-by-step procedures; covers eligibility, submission, ERA processing, denial handling, correction/resubmission, write-off; "you will see..." language present
- 4: 8-9 scenarios; mostly complete
- 3: 5-7 scenarios; some are thin
- 2: Fewer than 5 or too abstract
- 1: No scenarios or single-sentence descriptions

### Category C: FAQ Completeness (0-5)
- 5: 20+ FAQ questions; answers are specific and actionable; covers both common operational questions and support/escalation questions
- 4: 15-19 questions; mostly good
- 3: 10-14 questions; some redundant
- 2: Fewer than 10 questions
- 1: No FAQ section

### Category D: Structure and Navigation (0-5)
- 5: Clear structure matching required sections; troubleshooting section present and useful; headings make it easy to locate any admin function
- 4: Good structure with one missing section
- 3: Structure present but hard to navigate
- 2: Poorly structured
- 1: No meaningful structure

### Category E: Accuracy and Specificity (0-5)
- 5: All procedures specific enough to follow; billing-domain concepts (ERA, CO-45, eligibility, claim lifecycle) used correctly; error states described; no invented features
- 4: Mostly specific; 2-3 vague instructions
- 3: Mix of specific and vague
- 2: Too vague to follow
- 1: Inaccurate or describes a different product

**Maximum score: 25**
**Pass threshold: 18/25**
