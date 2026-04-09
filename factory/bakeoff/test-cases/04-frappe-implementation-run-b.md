# Test 04: Frappe Code Implementation — Run B (Claim State Transition Endpoint)

**Task type:** Backend code implementation
**Evaluates:** Can the model write correct Python that integrates with an existing state machine controller, handles complex error states including ValueError-to-HTTP conversion, and follows abstraction layer patterns?

**This is Run B. Run A tests a standalone new file. Run B tests integration with an existing controller.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- `abstraction-layer/routes/billing.py` (pattern reference — existing billing MAL endpoints)

Do NOT provide the state machine controller code. The model must import it as described in the spec.

---

## Prompt (give this to the model, nothing else)
```
You are the Story Builder for the Spark Mojo build factory. Implement the following story spec exactly as described. No improvisation. If anything is unclear, write a comment explaining what you assumed.
STORY: BILL-TRANSITION-001 TITLE: Claim state transition endpoint CATEGORY: BACKEND SIZE: S DEPENDENCIES: BILL-010 (state machine controller already exists at sm_billing.state_machine.controller)
WHAT TO BUILD: Add a single POST endpoint to the existing billing abstraction layer file.
ARCHITECTURE CONSTRAINTS:
* This endpoint is in the MAL. React calls /api/modules/billing/claim/{claim_id}/transition. React never calls Frappe or sm_billing directly.
* Import from the existing controller: from sm_billing.state_machine.controller import transition_state, VALID_TRANSITIONS
* The controller's transition_state(claim_name, new_state) raises ValueError with a message if the transition is invalid.
* The site name comes from the request header: X-Frappe-Site-Name
FILES TO CREATE OR MODIFY:
* MODIFY: abstraction-layer/routes/billing.py (add the new endpoint, do not modify existing endpoints)
DETAILED SPECIFICATION: Request: POST /api/modules/billing/claim/{claim_id}/transition Header: X-Frappe-Site-Name: {site_name} Body: { "new_state": "submitted" }
Response (200): { "claim_id": "{claim_id}", "previous_state": "ready_to_submit", "current_state": "submitted", "valid_next_states": ["acknowledged", "rejected"] }
Response (400): { "error": "new_state is required" } Response (404): { "error": "claim not found", "claim_id": "{claim_id}" } Response (409): { "error": "invalid transition", "from_state": "{current}", "to_state": "{requested}", "valid_transitions": ["{list}"] } Response (422): { "error": "site_name header missing" }
TESTS:
* test_valid_transition_returns_200_with_state_details() -> transition draft to ready_to_submit, verify all response fields present
* test_invalid_transition_returns_409_with_valid_options() -> transition draft to paid, verify 409 and valid_transitions list in response body
* test_claim_not_found_returns_404()
* test_missing_new_state_returns_400()
* test_missing_site_header_returns_422()
* test_transition_logs_state_change() -> verify SM Claim State Log entry created after valid transition
ACCEPTANCE CRITERIA:
1. POST /api/modules/billing/claim/{claim_id}/transition returns 200 on valid transition
2. Response includes previous_state, current_state, and valid_next_states
3. Invalid transition returns 409 with the list of valid transitions
4. Missing claim returns 404
5. Missing body field returns 400
6. Missing site header returns 422
7. All 6 tests pass
8. Endpoint added to existing billing.py — no new files created
Write the implementation and tests. Nothing else.
```

---

## Scoring Rubric

### Category A: Correctness (0-5)
- 5: Code runs without errors; correctly imports from state machine controller; catches ValueError from transition_state() and converts to 409 with valid transitions in response; all 6 tests would pass
- 4: Mostly correct; 1 minor bug
- 3: Logic correct but 1-2 implementation errors
- 2: Fundamental logic error (e.g., re-implements VALID_TRANSITIONS instead of importing)
- 1: Code does not run or is completely wrong

### Category B: Convention Compliance (0-5)
- 5: Endpoint added to existing billing.py matching existing patterns; imports correct; no new files created; SM prefix used correctly
- 4: Mostly compliant; 1 minor deviation
- 3: Generally follows conventions but noticeable deviations
- 2: Ignores existing patterns
- 1: Fundamentally incompatible

### Category C: Test Quality (0-5)
- 5: All 6 specified tests present; 409 test verifies valid_transitions in response body; state log test verifies Frappe record creation; transition_state properly mocked or used
- 4: 5/6 present; all good
- 3: 4/6 present or tests are shallow
- 2: Tests would not catch the bugs they are meant to catch
- 1: No tests or trivially wrong tests

### Category D: Error Handling (0-5)
- 5: All 4 error conditions handled exactly as specified (400, 404, 409 with valid options, 422); ValueError caught and converted to 409 correctly; no unhandled exceptions
- 4: 3/4 error conditions handled
- 3: 2/4 handled
- 2: Error handling present but wrong status codes
- 1: No error handling

### Category E: Scope Discipline (0-5)
- 5: Adds exactly one endpoint to exactly one existing file; does not re-implement state machine logic; response schema matches spec exactly
- 4: One minor scope deviation
- 3: Added unrequested complexity or skipped a requirement
- 2: Significant scope deviation
- 1: Built something different

**Maximum score: 25**
**Pass threshold: 18/25**
