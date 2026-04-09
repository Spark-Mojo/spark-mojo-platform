PROMPT
test: 02-spec-writing
run: B
date: 2026-04-09

```
You are the Spec Writer for the Spark Mojo build factory. Write a complete, self-contained story spec for the following story:
STORY ID: BILL-QUERY-001 TITLE: Claim state and valid transitions query endpoint CATEGORY: BACKEND SIZE: S DEPENDENCIES: BILL-010 (state machine controller — already shipped, already in codebase)
CONTEXT: Healthcare Billing Mojo is built on the Spark Mojo platform. Stack: Frappe/ERPNext backend, FastAPI abstraction layer (MAL) at /api/modules/[capability]/[action], React JSX frontend. React never calls Frappe directly. All custom DocTypes are prefixed "SM ".
The SM Claim DocType has a field called canonical_state (select field, 19 possible values). The state machine controller lives in sm_billing.state_machine.controller and exports:
* VALID_TRANSITIONS: dict[str, list[str]] — maps each state to its valid next states
* transition_state(claim_name: str, new_state: str) -> dict — performs a transition (do not call this in a read endpoint)
This story adds a READ endpoint only. It does NOT perform any transition.
The claim state endpoint should:
* Accept GET /api/modules/billing/claim/{claim_id}/state
* Look up the SM Claim Frappe document by claim_id
* Return the current canonical_state value
* Return the list of valid next states from VALID_TRANSITIONS[current_state]
* Use the FRAPPE_SITE_NAME_HEADER (X-Frappe-Site-Name) to resolve the correct site
* Return 404 if the claim document is not found
* Return 400 if claim_id is empty or missing
Write the full story spec file. It must be self-contained: the implementing agent reads ONLY this file and the existing codebase.
```
