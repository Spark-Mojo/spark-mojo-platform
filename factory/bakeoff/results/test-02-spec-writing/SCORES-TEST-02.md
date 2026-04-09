# Test 02: Spec Writing — Scores

---

## RUN A — CRM Contact Create Endpoint

---

MODEL: model-alpha | TEST: 02 | RUN: A
Completeness of Sections: 3/5
Evidence: Has Objective, Acceptance Criteria, Technical Implementation, Code Snippets, Guardrails Compliance, and Open Questions. Missing explicit Files To Create/Modify section, test section is absent (no unit or integration test specifications), and edge cases section is absent.
Failure classification: CORRECTABLE

Test Specificity: 2/5
Evidence: No test section exists at all. The Gherkin acceptance criteria describe behaviors but do not specify function names, test inputs, expected outputs, or edge cases. No unit tests, no integration tests, no edge case enumeration.
Failure classification: FUNDAMENTAL

API Specification Quality: 4/5
Evidence: Request fields listed with types, response JSON example provided with field mapping. Status codes are limited (only 200 mentioned, no 400/422/502 error response schemas). Missing explicit error state schemas.
Failure classification: CORRECTABLE

Guardrail Compliance: 5/5
Evidence: Explicit Guardrails Compliance section addresses MAL-only rule, native DocType usage, no TypeScript, timeline event via Communication, n8n boundary. SM prefix awareness shown. CRM timeline event fully specified.
Failure classification: N/A

Acceptance Criteria Quality: 3/5
Evidence: Gherkin scenarios cover happy path, vocabulary resolution, timeline event, and vocabulary fallback. However, criteria are not independently verifiable by command — no curl commands, no specific assertions on status codes for error states, and missing error-path criteria (missing first_name, Frappe failure).
Failure classification: CORRECTABLE

TOTAL: 17/25
Notable strength: Clean, well-structured vocabulary resolution and Frappe Communication field specification.
Notable failure: Complete absence of any test section — an implementing agent has zero test guidance.

---

MODEL: model-beta | TEST: 02 | RUN: A
Completeness of Sections: 5/5
Evidence: Contains Purpose, Platform Guardrails Compliance, Architecture, Endpoint Specification (4.1-4.5), Implementation Guide (5.1-5.4), Vocabulary Resolution Detail, CRM Timeline Event Detail, Error Handling Summary, Acceptance Criteria (AC-1 through AC-10), Testing (manual + automated), Out of Scope, Definition of Done. Every required section is present and substantive.
Failure classification: N/A

Test Specificity: 5/5
Evidence: Manual testing section provides exact curl commands with expected verification steps for 4 scenarios (AC-1, AC-2, AC-3, AC-8). Automated tests specify function names (test_create_contact_success, test_create_contact_missing_first_name, test_create_contact_blank_first_name), exact mock return values, request bodies, and assertion lines. Edge cases explicitly covered (blank first_name, unknown fields, timeline failure).
Failure classification: N/A

API Specification Quality: 5/5
Evidence: Request schema has explicit field table with types, required flags, validation rules, and max lengths. Response schemas for success (201), validation error (400), and Frappe error (502) all fully specified with example JSON. Field notes table explains each response field's source. Status codes are correct (201 for creation).
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Dedicated "Platform Guardrails Compliance" table checks all rules. Spec Gate answers (Workflow, CRM Timeline, Right Level) all addressed. MAL-only rule explicitly stated. CRM timeline event specified via Communication DocType with all fields. SM prefix awareness shown. Allowlist pattern prevents internal field injection.
Failure classification: N/A

Acceptance Criteria Quality: 5/5
Evidence: 10 independently verifiable ACs with Given/When/Then format. Each includes specific request body, expected HTTP status, and exact response field assertions. Covers happy path (AC-1, AC-2), validation errors (AC-3, AC-4), timeline event verification (AC-5), vocabulary (AC-6, AC-7), unknown fields (AC-8), Frappe errors (AC-9), and timeline failure resilience (AC-10).
Failure classification: N/A

TOTAL: 25/25
Notable strength: Exceptional depth — the Frappe Contact child table note (Section 5.4) and multiple Frappe client patterns (Section 5.3) show deep domain awareness that would prevent real implementation pitfalls.
Notable failure: None.

---

MODEL: model-gamma | TEST: 02 | RUN: A
Completeness of Sections: 4/5
Evidence: Has Metadata, Spec Gates, Architecture & Constraints, API Contract (request/response/errors), Implementation Guide with code, Acceptance Criteria, Testing Strategy, Deployment. Missing dedicated edge cases section; testing strategy is a table but lacks specificity.
Failure classification: CORRECTABLE

Test Specificity: 3/5
Evidence: Testing Strategy table lists 5 test types (Unit create_contact, Unit get_person_label, Integration, Validation, Security) with brief assertion descriptions. However, tests lack specific function names, input payloads, expected response bodies, or mock configurations. "Verify return structure" is too vague to implement directly.
Failure classification: CORRECTABLE

API Specification Quality: 4/5
Evidence: Request body has JSON example with field validation rules in a collapsed section. Response examples for 201, 400, 409, 429, 500 are all provided with JSON bodies. However, 429 rate limiting is not requested in the prompt and the metadata field in the request introduces unrequested complexity. Field types are clear.
Failure classification: CORRECTABLE

Guardrail Compliance: 5/5
Evidence: Explicit Spec Gates section answers all three gates. Routing Contract stated. SM prefix awareness shown. No TypeScript or hardcoded colors noted. CRM Timeline via Communication DocType fully specified. Evaluation order correctly identified as Level 1 native.
Failure classification: N/A

Acceptance Criteria Quality: 3/5
Evidence: 9 checkbox criteria provided. Most are verifiable ("returns 201", "returns 400"), but some are subjective or vague ("Code passes flake8/ruff linting", "All string labels use vocabulary_label dynamic resolution"). Missing error-state criteria for timeline failure and Frappe connection failure.
Failure classification: CORRECTABLE

TOTAL: 19/25
Notable strength: Spec Gates section is exemplary — crisp, direct answers to all three mandatory gates with correct architectural reasoning.
Notable failure: Testing strategy is too high-level for direct implementation without further interpretation.

---

MODEL: model-delta | TEST: 02 | RUN: A
Completeness of Sections: 5/5
Evidence: Contains Platform Gates (all 3), Background and Context, What to Build, Request/Response Contracts, Processing Logic (5 steps), CRM Timeline Event field spec, Files to Create/Modify, Acceptance Criteria (AC-1 through AC-12), Test Instructions (6 tests), Out of Scope, Notes for Implementing Agent (10 notes). Exceptionally comprehensive.
Failure classification: N/A

Test Specificity: 5/5
Evidence: 6 manual tests with exact curl commands, specific request bodies, and explicit "Verify" checks for each. Test 6 includes a Frappe console query to verify Communication records. Tests cover happy path minimal, happy path full, missing first_name, blank last_name, unauthenticated request, and Communication record verification. Each test specifies expected HTTP status and response field checks.
Failure classification: N/A

API Specification Quality: 5/5
Evidence: Request contract has explicit field table with types, required flags, validation rules. Processing logic is step-by-step with exact Frappe API calls. Response contracts for success (200), validation error (422), and server error (500) all specified with JSON examples. CRM Timeline Event has its own dedicated field-value table. Child table handling for email_ids/phone_nos is explicitly addressed.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: All three Platform Gates answered with clear reasoning. MAL-only rule stated ("React never calls Frappe"). SM prefix awareness shown. CRM timeline event specified with Communication DocType fields. communication_type="Other" to avoid Frappe email-send path is a sophisticated platform-aware choice. Notes for Implementing Agent section contains 10 contextual guardrails.
Failure classification: N/A

Acceptance Criteria Quality: 5/5
Evidence: 12 independently verifiable ACs. Each specifies exact HTTP method, request body, expected status code, and response field checks. Covers endpoint reachable (AC-1), Contact in Frappe (AC-2), document ID returned (AC-3), blank first_name (AC-4), missing first_name (AC-5), blank last_name (AC-6), timeline written (AC-7), vocabulary in timeline (AC-8), missing vocabulary default (AC-9), timeline failure non-fatal (AC-10), auth enforced (AC-11), route in OpenAPI docs (AC-12).
Failure classification: N/A

TOTAL: 25/25
Notable strength: The "Notes for Implementing Agent" section (10 numbered items) is uniquely valuable — it anticipates real implementation pitfalls (Frappe child tables, FrappeClient pattern, SM Site Registry not seeded, Communication minimum fields) and provides actionable resolution guidance.
Notable failure: None.

---

MODEL: model-epsilon | TEST: 02 | RUN: A
Completeness of Sections: 5/5
Evidence: Contains Overview (with does/does not), Workflow Gate, Functional Requirements (endpoint, request, response, vocabulary, timeline, consent status, duplicate detection), Data Model, Architecture (call flow, responsibility matrix), Acceptance Criteria (15 ACs), Error Handling, File Changes, Open Questions, Definition of Done. Exhaustive coverage.
Failure classification: N/A

Test Specificity: 3/5
Evidence: Acceptance criteria are well-specified (15 ACs with verification methods like "Integration test" or "Frappe DB verification"), but there are no actual test implementations, no function names, no mock configurations, and no curl commands. The spec tells you what to test but not how to write the tests.
Failure classification: CORRECTABLE

API Specification Quality: 5/5
Evidence: Request schema fully specified with field types, validation rules (email format, date validation), and custom_fields wrapper pattern. Response schemas for 201, 409, 422, and 401 all provided with JSON examples. Frappe REST API calls table (Section 5.5) maps every action to method and endpoint. Field validation rules are explicit (date must be in past, email format).
Failure classification: N/A

Guardrail Compliance: 4/5
Evidence: MAL-only rule stated. SM prefix awareness shown. CRM timeline via Communication DocType specified. However, the spec introduces duplicate detection (Section 3.7) and consent status computation (Section 3.6) which are explicitly out of scope per the prompt ("No duplicate detection"). This over-scopes beyond the story definition, though guardrails themselves are respected.
Failure classification: DOMAIN

Acceptance Criteria Quality: 4/5
Evidence: 15 ACs with verification methods. Most are independently verifiable ("returns HTTP 201", "returns HTTP 409", "returns HTTP 422"). However, some test methods are vague ("Integration test", "Frappe DB verification") and AC-13 (consent status) and AC-6/7/8 (duplicate detection) test features not requested in the prompt. The over-scoping dilutes the acceptance criteria's precision.
Failure classification: CORRECTABLE

TOTAL: 21/25
Notable strength: The architecture section with call flow diagram and responsibility matrix is the most detailed of all models — it precisely maps every concern to its owning layer.
Notable failure: Significant scope creep — duplicate detection and consent status computation are explicitly out of scope per the prompt but are specified as if required.

---

MODEL: model-zeta | TEST: 02 | RUN: A
Completeness of Sections: 3/5
Evidence: Has Context & Workflow, Acceptance Criteria, Technical Specification (with code), Data Contract, Testing Requirements, Security, Dependencies, and Implementation Notes. Missing dedicated Files to Create/Modify section (only mentioned inline). CRM Timeline event section is within the code but not a standalone specification section. Missing edge cases section.
Failure classification: CORRECTABLE

Test Specificity: 3/5
Evidence: Testing Requirements section has 4 unit test scenarios with descriptions and one integration test with curl command. Tests describe what to assert ("Assert 200", "Assert response includes name") but lack specific mock configurations, exact expected values, or function-level detail. Integration test curl command is provided but verification steps are brief.
Failure classification: CORRECTABLE

API Specification Quality: 3/5
Evidence: Request and response schemas are provided but have gaps. Request schema uses "string (optional)" type annotations rather than explicit Pydantic types. Response schema is present but uses string type annotations like "string|null" rather than formal JSON. Error responses are listed briefly (400, 401, 500) without JSON bodies for each. No explicit validation rules beyond "required" noted.
Failure classification: CORRECTABLE

Guardrail Compliance: 4/5
Evidence: Platform Guardrails section explicitly lists MAL routing rule, native DocType usage, SM prefix awareness, and evaluation order. CRM Timeline event is specified via Communication DocType with correct fields. However, communication_type="System" is non-standard for Frappe (not a valid enum value in most versions), which could cause implementation issues.
Failure classification: DOMAIN

Acceptance Criteria Quality: 3/5
Evidence: 7 functional requirement items serve as acceptance criteria but are high-level ("Returns 400 Bad Request if both first_name and last_name are missing"). They mix requirements with criteria. Missing specific Given/When/Then format or independently verifiable test commands. Missing error-state criteria for timeline failure and vocabulary fallback.
Failure classification: CORRECTABLE

TOTAL: 16/25
Notable strength: Clean code implementation with good inline documentation and proper FastAPI patterns.
Notable failure: Acceptance criteria and tests lack the specificity needed for an implementing agent to verify without interpretation.

---

## RUN B — Claim State Query Endpoint

---

MODEL: model-alpha | TEST: 02 | RUN: B
Completeness of Sections: 5/5
Evidence: Contains Summary, Acceptance Criteria table (8 ACs), API Contract (request/response/errors), Technical Design with code, Edge Cases table, Test Cases (7 detailed), Out of Scope, Implementation Notes, Files to Modify, Definition of Done. All required sections present and substantive.
Failure classification: N/A

Test Specificity: 5/5
Evidence: 7 test cases with Given/And/When/Then format, each specifying exact claim_id, expected HTTP status, and expected JSON response body. TC-2 covers terminal state (empty valid_transitions), TC-3 covers empty canonical_state (null), TC-5 covers empty claim_id, TC-6 covers unknown state. TC-7 verifies header forwarding. Each test is directly implementable.
Failure classification: N/A

API Specification Quality: 5/5
Evidence: Request format, path parameters, headers all specified in tables. Response schema for 200, 400, 404 each with example JSON. Field types table (string, string|null, list[string]). Pydantic response model defined. Status codes correct. Example responses included for all states.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Explicitly states "Does not call transition_state()" multiple times. Imports only VALID_TRANSITIONS. MAL routing at /api/modules/billing/. SM prefix awareness (SM Claim). CRM timeline addressed as N/A for read endpoint with "CRM timeline event logging future consideration — this is a read operation." X-Frappe-Site-Name forwarding specified.
Failure classification: N/A

Acceptance Criteria Quality: 5/5
Evidence: 8 ACs plus 10-item Definition of Done checklist. Each AC specifies exact HTTP status, response body content, and verification method. Covers happy path, terminal state, empty claim_id (400), missing claim (404), unknown state (empty list), site header forwarding, and read-only guarantee (no transition_state calls). All independently verifiable.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Edge Cases table is exceptionally thorough — covers 8 specific scenarios with expected behavior for each, including whitespace claim_id, null canonical_state, and unknown state values.
Notable failure: None.

---

MODEL: model-beta | TEST: 02 | RUN: B
Completeness of Sections: 5/5
Evidence: Contains Purpose, Spec Gates (all 3), API Contract, Pydantic Response Model, VALID_TRANSITIONS handling (Section 5), Endpoint Implementation with code, Implementation Notes, Files Changed, Acceptance Criteria (12 ACs), Test Plan (unit + integration), Out of Scope, Risks & Mitigations, Architectural Compliance. Comprehensive.
Failure classification: N/A

Test Specificity: 5/5
Evidence: 5 unit tests with exact function names, input values, and assertions (test_valid_transitions_dict_has_all_states, test_valid_transitions_values_are_lists_of_strings, test_valid_transitions_targets_are_known_states, test_response_model_fields, test_response_model_defaults_empty_transitions). Integration test table specifies 7 scenarios with method, expected status. Highly implementable.
Failure classification: N/A

API Specification Quality: 5/5
Evidence: Request/response fully specified with tables. All three error states (400, 404, 500) with JSON bodies. Pydantic model defined. Field descriptions table. Example JSON for success response. Status codes correct. VALID_TRANSITIONS handling addressed with instruction to copy from source.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Spec Gates section addresses all 3 gates — Gate 2 explicitly states "no CRM timeline write" with justification. MAL routing confirmed. SM prefix awareness. Architectural Compliance table maps 6 rules to compliance status. Explicit instruction to NOT import transition_state. VALID_TRANSITIONS correctly handled as copy with source citation.
Failure classification: N/A

Acceptance Criteria Quality: 5/5
Evidence: 12 ACs with verification methods. Covers claim found (AC-1), state matches Frappe (AC-2), transitions match VALID_TRANSITIONS (AC-3), terminal state (AC-4), 404 (AC-5), 400 whitespace (AC-6), header forwarded (AC-7), header absent still works (AC-8), no mutation (AC-9), no transition_state import (AC-10), dict matches source (AC-11), response model correct (AC-12). All independently verifiable.
Failure classification: N/A

TOTAL: 25/25
Notable strength: The VALID_TRANSITIONS Section 5 instruction — copy the dict with source citation, block if source file not found — is a uniquely practical approach to the cross-process import problem.
Notable failure: None.

---

MODEL: model-gamma | TEST: 02 | RUN: B
Completeness of Sections: 4/5
Evidence: Contains Metadata, Context & Scope, Architecture, Endpoint Specification, Data Contracts with Pydantic model, Implementation Details, Testing Requirements table, Acceptance Criteria checklist. Missing a dedicated CRM Timeline section (though addressed inline as "ZERO calls" since read-only). Testing section is a brief table.
Failure classification: CORRECTABLE

Test Specificity: 3/5
Evidence: Testing Requirements table has 6 test cases with Input and Expected Result columns, but descriptions are brief ("Valid site header, claim_id='DRAFT-CLAIM-01'" → "200 with canonical_state='draft'"). No function names, no mock setups, no assertion code, no curl commands. "Mutation Prevention" test says "ASSERT: transition_state() or PUT/POST to Frappe is NEVER called" but doesn't specify how to verify.
Failure classification: CORRECTABLE

API Specification Quality: 5/5
Evidence: Route, parameters, response codes all in tables. Pydantic response model defined. JSON examples for request and response. Error detail formats specified for 400, 404, 422. Handler logic flow described step-by-step. Response codes table is comprehensive.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Platform Guardrails stated in metadata. Architecture table explicitly notes "STRICTLY READ-ONLY. Zero write operations." MAL routing confirmed. SM prefix awareness. Import from VALID_TRANSITIONS noted with fallback strategy. CRM timeline correctly addressed as N/A for read-only.
Failure classification: N/A

Acceptance Criteria Quality: 4/5
Evidence: 10 checkbox criteria covering endpoint deployment, response schema, 400, 404, site header forwarding, VALID_TRANSITIONS usage, zero calls to transition_state, unit test coverage, linting, and PR link. Most are verifiable. "PR includes link to BILL-010 dependency confirmation" is process-oriented rather than functionally verifiable. Missing terminal state (empty list) criterion.
Failure classification: CORRECTABLE

TOTAL: 21/25
Notable strength: Architecture alignment table precisely maps each layer to its implementation detail with clear stack boundaries.
Notable failure: Testing section lacks the specificity for direct implementation — it describes what to test but not how.

---

MODEL: model-delta | TEST: 02 | RUN: B
Completeness of Sections: 5/5
Evidence: Contains What This Story Delivers, Platform Gates (all 3), One File specification, Endpoint Specification, Code Changes (exact line-by-line: 5.1 import, 5.2 state machine import, 5.3 constant, 5.4 model, 5.5 route), Multi-site Header Behaviour, Error Response Table, Explicit Non-behaviours (10 items), Acceptance Criteria (16 items), Smoke Test. Exceptionally detailed.
Failure classification: N/A

Test Specificity: 4/5
Evidence: Smoke test section provides 4 curl commands with expected shapes and HTTP codes. Acceptance criteria serve as test specifications with exact values ("canonical_state field on the Frappe document for that claim — verified by direct Frappe fetch"). However, no unit test code is provided, and verification relies on manual curl + code review rather than automated test implementations.
Failure classification: CORRECTABLE

API Specification Quality: 5/5
Evidence: Endpoint specification in a clear table. Pydantic response model with field descriptions. Error response table covers 5 conditions with exact HTTP status, detail message, and condition. Response field descriptions are precise. Code implementation includes exact variable names, httpx calls, and header handling.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Gate 2 explicitly addresses CRM timeline with justification ("reading claim state is not a business event"). Gate 3 correctly identifies this as a thin HTTP wrapper. Explicit Non-behaviours section lists 10 things NOT to do, including "Calling transition_state()" and "Writing to the CRM timeline." VALID_TRANSITIONS imported from source, not redefined. MAL routing confirmed.
Failure classification: N/A

Acceptance Criteria Quality: 5/5
Evidence: 16 independently verifiable criteria. Each specifies exact condition and expected result. Covers claim found (AC matching Frappe doc), 404, 400 whitespace, site header present, site header absent, terminal state, empty canonical_state, transition_state not imported, VALID_TRANSITIONS imported from source, ClaimStateResponse defined, Request import added, constant defined, no existing endpoint modified, all code in one file. Extraordinarily thorough.
Failure classification: N/A

TOTAL: 24/25
Notable strength: The Explicit Non-behaviours section (10 items with "why not in scope") is a standout feature that prevents scope creep — uniquely valuable for an implementing agent.
Notable failure: Missing automated unit test code, though the 16 acceptance criteria partially compensate.

---

MODEL: model-epsilon | TEST: 02 | RUN: B
Completeness of Sections: 4/5
Evidence: Contains Context & Background, Functional Requirements, Technical Approach, Implementation Notes with Pydantic model, Acceptance Criteria (8 functional + 4 non-functional), Test Scenarios (unit + integration), File Changes, Out of Scope, Open Questions. CRM Timeline addressed in Section 1.4. Missing a dedicated edge cases section.
Failure classification: CORRECTABLE

Test Specificity: 4/5
Evidence: Unit tests provide actual pytest code with mock configurations, function names (test_get_claim_state_success, test_get_claim_state_not_found, test_get_claim_state_missing_claim_id, test_get_claim_state_unknown_state), and assertions. Integration test with site header forwarding also coded. However, the unknown state test asserts 422, which contradicts the prompt's expected behavior (should return 200 with empty list, not 422).
Failure classification: DOMAIN

API Specification Quality: 4/5
Evidence: Endpoint, path parameters, headers, and response schemas are well-specified with JSON examples. Error responses cover 400, 404, 422. However, the 422 for "State Not in VALID_TRANSITIONS" is a design error — the prompt says nothing about rejecting unknown states, and other models correctly return 200 with empty transitions. The queried_at field is an addition not requested.
Failure classification: DOMAIN

Guardrail Compliance: 4/5
Evidence: MAL-only rule stated. SM prefix awareness. Read-only constraint emphasized. CRM timeline correctly addressed as N/A. However, the spec proposes returning 422 for unknown states, which adds write-like validation semantics to a read endpoint and contradicts the prompt's "Return the list of valid next states from VALID_TRANSITIONS[current_state]" — which implies graceful fallback, not rejection.
Failure classification: DOMAIN

Acceptance Criteria Quality: 4/5
Evidence: 8 functional ACs with verification methods. Covers 200, 400, 404, 422, queried_at timestamp, site header, and no transition_state calls. Most are verifiable. AC-05 (422 for unknown state) is incorrect per the prompt requirements. Non-functional criteria (response time, existing helper usage) are nice additions.
Failure classification: DOMAIN

TOTAL: 20/25
Notable strength: Actual pytest code with mocks and assertions makes the test section immediately implementable.
Notable failure: The 422 error for unknown states is a design error — the prompt implies graceful degradation (empty list), not rejection.

---

MODEL: model-zeta | TEST: 02 | RUN: B
Completeness of Sections: 4/5
Evidence: Contains Header metadata, Context & Constraints, Acceptance Criteria (9 items), API Specification, Implementation Details with code, Test Strategy, Out of Scope, Dependencies Checklist, References. Missing dedicated CRM Timeline section (addressed implicitly by the read-only nature). Missing edge cases section.
Failure classification: CORRECTABLE

Test Specificity: 3/5
Evidence: Test Strategy section has 5 unit test scenarios with brief descriptions and one integration test. Scenarios describe what to verify but lack function names, mock setups, exact expected values, or assertion code. "Happy Path: Valid claim_id with valid state → Returns 200 with correct state and transitions list" is too high-level for direct implementation.
Failure classification: CORRECTABLE

API Specification Quality: 5/5
Evidence: Endpoint, headers, path parameters all in tables. Response model with Pydantic code. Error responses table with 3 status codes, conditions, and response bodies. JSON examples provided. Field types explicit. Implementation code shows exact httpx pattern with site header forwarding.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Context section explicitly states "DO NOT USE IN THIS ENDPOINT" for transition_state. MAL routing confirmed at /api/modules/billing/. SM prefix awareness (SM Claim). Read-only guarantee stated. Multi-tenancy via X-Frappe-Site-Name addressed. Platform Guardrails rules cited by number.
Failure classification: N/A

Acceptance Criteria Quality: 4/5
Evidence: 9 acceptance criteria cover endpoint existence, site resolution, validation (400), document lookup, not found (404), state retrieval, transition lookup, read-only guarantee, and response contract. Most are verifiable. Missing specific terminal state (empty list) criterion and empty canonical_state criterion. Criteria are statement-form rather than Given/When/Then.
Failure classification: CORRECTABLE

TOTAL: 21/25
Notable strength: Implementation code is clean and directly usable — the _read_frappe_doc_with_site helper with site header forwarding is a practical pattern.
Notable failure: Test strategy lacks the specificity to implement tests without further interpretation.

---

## RUN C — User Notification Preferences Endpoints

---

MODEL: model-alpha | TEST: 02 | RUN: C
Completeness of Sections: 3/5
Evidence: The output is raw Python code, not a story spec. It contains implementation code for both endpoints, Pydantic models, helper functions, platform defaults, validation, and a DocType definition dict at the bottom. However, it lacks traditional spec sections: no "What To Build" prose, no Acceptance Criteria section, no Test section, no Architecture Constraints section, no Files To Create/Modify section, no Out of Scope section. The code IS the spec.
Failure classification: FUNDAMENTAL

Test Specificity: 1/5
Evidence: No tests are specified anywhere in the output. No unit tests, no integration tests, no edge case enumeration. The code is implementation, not specification.
Failure classification: FUNDAMENTAL

API Specification Quality: 4/5
Evidence: Both endpoints are fully implemented with Pydantic models, correct path parameters, X-Frappe-Site-Name header handling, error responses (400, 404), and the three-tier merge logic with source tracking. Response models include tier source per channel. However, since this is code not spec, the API contract is implicit in the code rather than explicitly documented.
Failure classification: CORRECTABLE

Guardrail Compliance: 4/5
Evidence: MAL routing pattern followed. SM prefix used for DocType ("SM User Notification Preferences"). Three-tier cascade correctly specified (not two tiers). CRM timeline is not addressed at all — no mention of N/A or justification. Platform defaults defined as Python dict in endpoint file per prompt.
Failure classification: CORRECTABLE

Acceptance Criteria Quality: 1/5
Evidence: No acceptance criteria exist. The output is pure implementation code with no verification criteria, no checklist, no Given/When/Then scenarios.
Failure classification: FUNDAMENTAL

TOTAL: 13/25
Notable strength: The three-tier merge implementation with per-channel source tracking is correct and complete — the _resolve_preferences function properly handles all cascade scenarios.
Notable failure: Output is implementation code, not a story spec — missing all spec-format sections (acceptance criteria, tests, architecture constraints, out of scope).

---

MODEL: model-beta | TEST: 02 | RUN: C
Completeness of Sections: 5/5
Evidence: Contains Objective, Spec Gates (all 3), Domain Model (events, channels, preference shape, platform defaults, site overrides, user overrides), Three-Tier Merge Logic with algorithm, API Contract (GET and PUT fully specified), Pydantic Models, Endpoint Implementation Logic (GET flow, PUT flow, deep merge helper), Frappe DocType Definition, Error Handling table, Acceptance Criteria (12 ACs), Test Plan (11 tests), Implementation Notes, File Inventory. Every required section is present.
Failure classification: N/A

Test Specificity: 5/5
Evidence: 11 tests specified with unique IDs (T-1 through T-11). T-1 through T-7 are unit tests with specific inputs, setup conditions, and expected outcomes (e.g., "T-3: resolve_preferences with user overriding a site-overridden pair — User wins, source is 'user'"). T-8 through T-11 are integration tests with specific mock conditions. Validation rejection tests (T-5, T-6, T-7) specify the exact invalid input and expected behavior.
Failure classification: N/A

API Specification Quality: 5/5
Evidence: Both GET and PUT endpoints fully specified with headers, path parameters, request body schema, and response schemas. Response shows per-channel enabled + source structure. Error states for 400 (invalid event, invalid channel, non-bool value), 404 (user not found), and 502 (backend unavailable) all specified with example JSON. PUT merge behavior explicitly documented. Deep merge helper code provided.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Spec Gates section addresses all 3 — Gate 2 explicitly states "No CRM timeline write. Changing a preference is a settings action, not a customer interaction event." MAL-only routing confirmed. SM prefix used correctly ("SM User Notification Preferences"). Three-tier cascade correctly specified with all three tiers. Platform defaults defined as Python dict in endpoint file.
Failure classification: N/A

Acceptance Criteria Quality: 5/5
Evidence: 12 ACs in Given/When/Then format. AC-1 through AC-6 cover GET (resolved prefs, platform only, site overrides, user overrides, no user doc = 200 not 404, nonexistent user = 404). AC-7 through AC-12 cover PUT (creates doc, merges existing, rejects invalid event, rejects invalid channel, rejects non-bool, returns resolved prefs). Each is independently verifiable with specific assertions.
Failure classification: N/A

TOTAL: 25/25
Notable strength: The merge logic section (Section 4) with pseudocode algorithm and the deep merge helper (Section 7.3) provide unambiguous implementation guidance for the most complex part of the story.
Notable failure: None.

---

MODEL: model-gamma | TEST: 02 | RUN: C
Completeness of Sections: 5/5
Evidence: Contains Summary, Platform Guardrail Checklist (all 3 gates), Domain Model (events, channels, cascade), New DocType definition, API Specification (GET and PUT fully specified), Site Registry Integration, Implementation Details (file location, Pydantic models, helper functions), Test Specifications (GET: 8 tests, PUT: 10 tests), Security Considerations, Deployment Notes, Acceptance Criteria checklist (17 items). Comprehensive.
Failure classification: N/A

Test Specificity: 5/5
Evidence: GET tests (G-01 through G-08) and PUT tests (P-01 through P-10) each have Setup, Input, and Expected columns. G-01: "No site overrides, no user overrides → 200. All 6 events × 3 channels with source: platform." P-03: "Remove user override with null → email key removed from user doc, resolved value falls back." P-06: "Invalid value type → 400 with descriptive error." Tests are specific enough to implement directly.
Failure classification: N/A

API Specification Quality: 5/5
Evidence: Both endpoints fully specified. GET response shows per-channel {value, source} structure with full JSON example for all 6 events. PUT request body, validation rules, and null semantics (Section 4.4.1) all specified. Error responses for 400 (3 variants), 404, and 500 with JSON examples. PUT merge behavior explicitly documented with "partial update, not full replacement" noted.
Failure classification: N/A

Guardrail Compliance: 4/5
Evidence: Platform Guardrail Checklist addresses all 3 gates. Gate 2 mentions writing CRM activity timeline for PUT operations, which is an addition beyond what the prompt requires (prompt says nothing about CRM timeline for preference changes). MAL routing confirmed. SM prefix correctly used. Three-tier cascade correctly specified. However, the CRM timeline write for preference changes adds scope beyond the prompt.
Failure classification: CORRECTABLE

Acceptance Criteria Quality: 5/5
Evidence: 17 checkbox acceptance criteria covering GET resolution (3 ACs), PUT create/update (3 ACs), PUT validation (3 ACs), PUT null values, both endpoints site header, MAL pattern, SM prefix, CRM timeline, error responses, and all tests passing. Each is independently verifiable. Comprehensive coverage of both endpoints and all error states.
Failure classification: N/A

TOTAL: 24/25
Notable strength: The null semantics in Section 4.4.1 for removing user overrides is a thoughtful UX detail that no other model addresses, and the 18-test plan is the most comprehensive.
Notable failure: Adding CRM timeline writes for preference changes introduces scope beyond the prompt (though it's a reasonable addition).

---

MODEL: model-delta | TEST: 02 | RUN: C
Completeness of Sections: 4/5
Evidence: Contains Mandatory Spec Gates, Evaluation Order Check, Architecture Compliance Notes, Business Logic (three-tier cascade), DocType definition, and full implementation code with acceptance criteria in comments. Manual testing guide with 7 curl commands. Out of scope noted. However, the spec is delivered as a Python file with inline comments rather than a structured markdown document, making sections harder to navigate.
Failure classification: CORRECTABLE

Test Specificity: 4/5
Evidence: Manual Testing Guide section provides 7 curl commands with exact expected results (e.g., "Expected: HTTP 200, all 18 source fields = 'platform'", "Expected: HTTP 404", "Expected: HTTP 400, errors list contains 'Unknown event key'"). However, no automated unit tests are specified, and tests rely entirely on manual verification via curl.
Failure classification: CORRECTABLE

API Specification Quality: 5/5
Evidence: Both endpoints fully implemented with Pydantic models showing per-channel {value, source} response structure. Request validation handles event keys and channel keys with descriptive errors. Both GET and PUT have explicit headers, path parameters, and error handling. PUT deep-merge behavior is implemented correctly. Site header forwarding via _site_header helper.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: All 3 Spec Gates answered with reasoning. Evaluation Order Check explicitly walks through 4 levels (native Frappe → community → third-party → custom build). Architecture Compliance Notes check 5 rules. MAL routing confirmed. SM prefix used correctly. CRM timeline addressed as N/A with justification ("settings action, not customer-interaction event"). Three-tier cascade correctly specified.
Failure classification: N/A

Acceptance Criteria Quality: 4/5
Evidence: 12 acceptance criteria in inline comments (AC-1 through AC-12). Cover GET 404, GET 200 with all 18 values, platform defaults, site override with source, user override with source, PUT partial, PUT full, PUT invalid event (400), PUT invalid channel (400), PUT 404, header requirement, and self-contained file. Most are verifiable. Format as inline code comments reduces discoverability.
Failure classification: CORRECTABLE

TOTAL: 22/25
Notable strength: The Evaluation Order Check (Section walking through native → community → third-party → custom with verdicts for each) is unique and demonstrates rigorous architectural reasoning.
Notable failure: Spec delivered as Python implementation file rather than structured story spec document — acceptance criteria and tests buried in code comments.

---

MODEL: model-epsilon | TEST: 02 | RUN: C
Completeness of Sections: 5/5
Evidence: Contains Overview (with workflow, CRM timeline, right level), Technical Design (architecture diagram, storage table, events, channels, cascade with algorithm), API Endpoints (GET and PUT fully specified), New DocType definition with child table, Frappe Integration Details (user check, site lookup, CRUD, merge algorithm), Acceptance Criteria (15 ACs), Out of Scope, File Plan. Comprehensive structured spec.
Failure classification: N/A

Test Specificity: 3/5
Evidence: Acceptance criteria table has 15 items with Test Method column, but methods are brief ("curl / MAL test suite", "Response schema assertion", "Integration test with seeded site override"). No actual test code, no function names, no mock configurations. The merge algorithm code in Section 3.4 is testable but no test implementations are provided. AC-14 ("listed in platform/README.md") is a manual documentation check.
Failure classification: CORRECTABLE

API Specification Quality: 5/5
Evidence: Both endpoints fully specified. GET response with full JSON example showing all 6 events × 3 channels with {value, tier} structure. PUT request body with validation rules. Error responses for 400 (invalid event, invalid channel), 404 with JSON examples. PUT response matches GET format. DocType defined with child table (SM Notification Preference Item). Site Registry integration pattern described.
Failure classification: N/A

Guardrail Compliance: 5/5
Evidence: Section 1.3-1.5 address all 3 gates (workflow N/A, CRM timeline N/A with justification, right level = universal). MAL routing confirmed. SM prefix used correctly ("SM User Notification Preferences", "SM Notification Preference Item"). Three-tier cascade correctly specified. Platform defaults as Python dict. X-Frappe-Site-Name header used for all site identification.
Failure classification: N/A

Acceptance Criteria Quality: 4/5
Evidence: 15 ACs with test methods. Covers GET resolution (AC-01 through AC-07), PUT operations (AC-08 through AC-13), and infrastructure (AC-14, AC-15). Most are verifiable. AC-14 ("listed in platform/README.md") is documentation-oriented rather than functional. Some test methods are vague ("Integration test with seeded site override"). Missing specific terminal/edge case criteria.
Failure classification: CORRECTABLE

TOTAL: 22/25
Notable strength: The child table approach for SM Notification Preference Item (Section 2.7) is a legitimate alternative design that leverages Frappe's native DocType patterns, though the prompt suggests JSON field storage.
Notable failure: Tests lack specificity — no function names, mock configurations, or automated test code provided.

---

MODEL: model-zeta | TEST: 02 | RUN: C
Completeness of Sections: 3/5
Evidence: Output is primarily Python implementation code with docstring-level documentation. Contains domain constants, Pydantic models, helper functions, and endpoint implementations. DocType spec is in a docstring comment. Missing traditional spec sections: no standalone Acceptance Criteria section, no Test section, no Architecture Constraints section as prose, no Out of Scope section, no CRM Timeline discussion. Missing import for os module.
Failure classification: FUNDAMENTAL

Test Specificity: 1/5
Evidence: No tests are specified anywhere in the output. No unit tests, no integration tests, no edge cases, no curl commands. The output is purely implementation code.
Failure classification: FUNDAMENTAL

API Specification Quality: 4/5
Evidence: Both endpoints implemented with Pydantic models, correct routing, site header forwarding, and validation. Response models include resolved preferences and source maps. PUT request validation catches invalid events and channels. However, the response is truncated (code cuts off mid-function), and the API contract is implicit in code rather than explicitly documented.
Failure classification: CORRECTABLE

Guardrail Compliance: 3/5
Evidence: MAL routing pattern followed. SM prefix used. Platform defaults defined as Python dict. Three-tier cascade implemented. However, no CRM timeline discussion (not even N/A justification), no explicit guardrails section, and no spec gates addressed. The missing os import would cause a runtime error.
Failure classification: CORRECTABLE

Acceptance Criteria Quality: 1/5
Evidence: No acceptance criteria exist in the output. The code implies functionality but provides no verification criteria, no checklist, and no testable assertions.
Failure classification: FUNDAMENTAL

TOTAL: 12/25
Notable strength: The _resolve_preferences function correctly implements the three-tier cascade with proper type checking (isinstance(site_val, bool)) that guards against malformed data.
Notable failure: Output is truncated implementation code with no spec-format sections — no acceptance criteria, no tests, no gates, no out of scope.

---

## MODEL SUMMARIES

---

MODEL: model-alpha | TEST: 02 SUMMARY
Run A: 17 | Run B: 25 | Run C: 13
Mean: 18.3 | Range: 12 | Consistency: Low
High = range 0-1 | Medium = range 2 | Low = range 3+

Consistency narrative: Massive variance driven by output format instability. Run B (claim state query) produced an exemplary structured spec, while Run C (notification preferences) produced raw implementation code with no spec sections at all. Run A fell in between with adequate structure but missing tests. The model appears to lose spec-writing discipline on more complex prompts.
Dominant strength: When structured (Run B), produces thorough edge case analysis and well-formatted API contracts.
Dominant weakness: Inconsistent output format — sometimes produces code instead of specs, and omits test sections entirely.
Prompt engineering note: Add explicit instruction "Output a markdown story spec document with named sections, NOT implementation code."

---

MODEL: model-beta | TEST: 02 SUMMARY
Run A: 25 | Run B: 25 | Run C: 25
Mean: 25.0 | Range: 0 | Consistency: High
High = range 0-1 | Medium = range 2 | Low = range 3+

Consistency narrative: Perfect consistency across all three runs. Every run produced a comprehensive, well-structured spec with all required sections, specific tests, complete API schemas, full guardrail compliance, and verifiable acceptance criteria. The model reliably produces the same quality regardless of prompt complexity (simple create, read-only query, or multi-endpoint cascade).
Dominant strength: Relentlessly comprehensive and structured — every section is present, every error state is covered, and every test is specific enough to implement directly.
Dominant weakness: None observed. Specs are occasionally very long, but length does not reduce quality.
Prompt engineering note: None needed — this model requires no compensating instructions for spec writing.

---

MODEL: model-gamma | TEST: 02 SUMMARY
Run A: 19 | Run B: 21 | Run C: 24
Mean: 21.3 | Range: 5 | Consistency: Low
High = range 0-1 | Medium = range 2 | Low = range 3+

Consistency narrative: Improved significantly across runs — Run A had weaker tests and acceptance criteria, Run B improved with better API specification, and Run C was near-excellent with 18 tests and 17 acceptance criteria. The model appears to perform better on more structured prompts (Run C had explicit cascade logic to spec). Emoji usage in section headers is a minor style concern.
Dominant strength: Spec Gates / guardrail compliance sections are consistently strong with correct architectural reasoning across all runs.
Dominant weakness: Test specificity varies — sometimes high-level tables, sometimes detailed scenarios. Inconsistent depth.
Prompt engineering note: Add "Include at least 5 unit tests with function names, mock configurations, and expected assertions."

---

MODEL: model-delta | TEST: 02 SUMMARY
Run A: 25 | Run B: 24 | Run C: 22
Mean: 23.7 | Range: 3 | Consistency: Low
High = range 0-1 | Medium = range 2 | Low = range 3+

Consistency narrative: Consistently strong but declined slightly on Run C, which was delivered as a Python implementation file with acceptance criteria in code comments rather than a structured markdown spec. Runs A and B were exemplary structured documents. The model may shift to implementation mode when the prompt describes complex logic (three-tier cascade).
Dominant strength: "Notes for Implementing Agent" and "Explicit Non-behaviours" sections are uniquely valuable across all runs — they prevent real implementation pitfalls and scope creep.
Dominant weakness: Tendency to drift toward implementation code on complex prompts (Run C), reducing spec discoverability.
Prompt engineering note: Add "Output format must be a markdown document, not a Python file. All acceptance criteria must be in a dedicated markdown section."

---

MODEL: model-epsilon | TEST: 02 SUMMARY
Run A: 21 | Run B: 20 | Run C: 22
Mean: 21.0 | Range: 2 | Consistency: Medium
High = range 0-1 | Medium = range 2 | Low = range 3+

Consistency narrative: Stable performance across all three runs with a narrow 2-point range. Consistently strong on API specification and architecture documentation but consistently weak on test specificity (always describes what to test but rarely provides implementable test code). Run A had scope creep (duplicate detection, consent status). Run B had a domain error (422 for unknown states).
Dominant strength: Architecture documentation — call flow diagrams, responsibility matrices, and Frappe REST API call tables are consistently the most detailed.
Dominant weakness: Test specificity — across all runs, tests describe scenarios at a table level but never provide function names, mock setups, or assertion code.
Prompt engineering note: Add "Include pytest code for at least 3 unit tests with mock configurations and explicit assertions."

---

MODEL: model-zeta | TEST: 02 SUMMARY
Run A: 16 | Run B: 21 | Run C: 12
Mean: 16.3 | Range: 9 | Consistency: Low
High = range 0-1 | Medium = range 2 | Low = range 3+

Consistency narrative: Extreme variance — Run B was solid (21/25) while Run C was the lowest score in the entire bakeoff (12/25). Run A was below-threshold (16/25). The model produces acceptable specs for simple read endpoints but degrades severely on complex multi-endpoint prompts, shifting to raw implementation code with no spec structure. Run C was also truncated.
Dominant strength: When structured (Run B), produces clean implementation code patterns that are directly usable.
Dominant weakness: Inconsistent output format — tends to produce code instead of specs, omits acceptance criteria and tests, and truncates on complex prompts.
Prompt engineering note: Add explicit instruction "You MUST output a markdown spec document with these required sections: What To Build, API Specification, Acceptance Criteria (numbered list), Test Plan (with function names), Out of Scope. Do NOT output implementation code."
