model: model-gamma
test: 03-prose-quality
run: B
date: 2026-04-09

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