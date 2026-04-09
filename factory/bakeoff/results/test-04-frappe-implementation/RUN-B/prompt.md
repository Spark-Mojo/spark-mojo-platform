PROMPT
model: model-zeta
test: 04-frappe-implementation
run: B
date: 2026-04-09

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
