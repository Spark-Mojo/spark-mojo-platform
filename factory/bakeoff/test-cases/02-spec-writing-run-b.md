# Test 02: Spec Writing — Run B (Claim State Query Endpoint)

**Task type:** Specification writing
**Evaluates:** Can the model produce a self-contained spec for an endpoint that integrates with an existing controller?

**Quality bar reference:** BILL-010 in platform/feature-library/stories/ sets the minimum quality standard.
**This is Run B. Run A covers a CRM contact create endpoint. Run C covers notification preferences.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- `abstraction-layer/routes/billing.py` (pattern reference for billing MAL endpoints)

Do NOT provide BILL-010 or any existing story spec to the model.

---

## Prompt (give this to the model, nothing else)
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

---

## Scoring Rubric

### Category A: Completeness of Sections (0-5)
- 5: Has all required sections: What To Build, Architecture Constraints, Files To Create/Modify, Detailed Specification (request/response schemas + error states), Tests (unit + integration + edge cases), CRM Timeline Event, Acceptance Criteria
- 4: Missing one minor section
- 3: Missing 2 sections or key sections are thin
- 2: Major sections absent
- 1: Not usable as a build spec

### Category B: Test Specificity (0-5)
- 5: Unit tests specify function name, input, expected output; integration tests specify endpoint, request, expected response; edge cases explicit (empty claim_id, claim not found, terminal state with empty valid_next_states list)
- 4: Tests mostly specific with 1-2 vague entries
- 3: Too high-level to implement directly
- 2: Generic tests
- 1: No meaningful tests

### Category C: API Specification Quality (0-5)
- 5: Request format, response schema (both fields: current_state and valid_next_states), and all error states fully specified; status codes correct; example response included
- 4: Mostly complete; 1-2 fields underspecified
- 3: Schema present but incomplete
- 2: Vague description only
- 1: No API specification

### Category D: Guardrail Compliance (0-5)
- 5: MAL-only rule stated; spec correctly imports from existing controller (does not re-implement VALID_TRANSITIONS); SM prefix awareness shown; CRM timeline addressed as N/A for a read endpoint with explanation
- 4: Guardrails mostly present; one missing
- 3: Partially addressed
- 2: Key guardrails absent
- 1: Spec violates guardrails

### Category E: Acceptance Criteria Quality (0-5)
- 5: Every criterion independently verifiable; covers claim found + valid state, claim not found (404), empty claim_id (400), terminal state with empty valid_next_states list
- 4: Mostly verifiable; 1-2 slightly subjective
- 3: Mix of verifiable and vague
- 2: Too vague to verify
- 1: Absent or meaningless

**Maximum score: 25**
**Pass threshold: 18/25**
