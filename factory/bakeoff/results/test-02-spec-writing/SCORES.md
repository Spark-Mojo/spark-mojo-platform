# Test 02: Spec Writing — Scores

Scored: 2026-04-09
Scorer: Claude Opus 4.6 (1M context)

---

## MODEL: model-alpha | TEST: 02 | RUN: A

**Completeness of Sections**: 3/5
Evidence: Has Objective, Acceptance Criteria, Technical Implementation, Guardrails Compliance, and Open Questions. Missing explicit Files To Create/Modify section, no dedicated Tests section with unit/integration/edge case structure. Acceptance criteria are in Gherkin but lack error state scenarios beyond vocabulary fallback.
Failure classification: CORRECTABLE

**Test Specificity**: 2/5
Evidence: No dedicated test section at all. No unit test function names, no integration test specifications, no edge case enumeration. The Gherkin acceptance criteria describe behavior but are not implementable tests.
Failure classification: FUNDAMENTAL

**API Specification Quality**: 4/5
Evidence: Request fields listed with types, response JSON example provided with field descriptions. Status code is 200 (not 201 for creation). Missing explicit error response schemas (no 400/422/500 response bodies defined). Field types explicit in code.
Failure classification: CORRECTABLE

**Guardrail Compliance**: 4/5
Evidence: MAL-only rule stated explicitly. SM prefix awareness shown (uses native Contact, not SM Contact). CRM timeline event specified with Communication fields. Missing explicit statement that React never calls Frappe in a constraints section — it's implied by architecture but not in a formal guardrails block.
Failure classification: CORRECTABLE

**Acceptance Criteria Quality**: 3/5
Evidence: Gherkin scenarios cover happy path, vocabulary resolution, timeline event, and vocabulary fallback. However, no error state criteria (missing first_name, Frappe failure, timeline failure). Criteria are somewhat verifiable but lack specific status codes and response field assertions.
Failure classification: CORRECTABLE

TOTAL: 16/25
Notable strength: Good vocabulary resolution detail with fallback behavior clearly specified.
Notable failure: Complete absence of a test section — an implementing agent would have no test guidance.

---

## MODEL: model-alpha | TEST: 02 | RUN: B

**Completeness of Sections**: 5/5
Evidence: Has Summary, Acceptance Criteria, API Contract (request/response/errors), Technical Design, Edge Cases, Test Cases, Out of Scope, Implementation Notes, Files to Modify, Definition of Done. All required sections present and substantive.
Failure classification: N/A

**Test Specificity**: 5/5
Evidence: Seven test cases (TC-1 through TC-7) each specify exact input, expected status code, and expected response body as JSON. Covers happy path, terminal state, empty canonical_state, not found, empty claim_id, unknown state, and site header forwarding.
Failure classification: N/A

**API Specification Quality**: 5/5
Evidence: Request path, path parameters, headers all specified with types. Success response (200) with full JSON example and field table. Error responses (400, 404) with exact JSON bodies. Response model fields documented with types and descriptions.
Failure classification: N/A

**Guardrail Compliance**: 4/5
Evidence: MAL-only rule implicit (endpoint is on MAL). SM prefix used correctly (SM Claim). Correctly imports VALID_TRANSITIONS from existing controller rather than reimplementing. CRM timeline not addressed — this is a read endpoint, but the rubric says "addressed as N/A with explanation" for full marks.
Failure classification: CORRECTABLE

**Acceptance Criteria Quality**: 5/5
Evidence: AC-1 through AC-8 are independently verifiable with specific HTTP methods, expected status codes, and response fields. Covers claim found, not found (404), empty claim_id (400), terminal state with empty valid_transitions, and read-only guarantee.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Exceptional test case specificity with exact JSON responses for every scenario.
Notable failure: Minor — no explicit CRM timeline N/A justification in the spec body (addressed in Out of Scope section implicitly).

---

## MODEL: model-alpha | TEST: 02 | RUN: C

**Completeness of Sections**: 3/5
Evidence: Output is pure Python code, not a spec document. Contains PLATFORM_DEFAULTS, Pydantic models, endpoint handlers, helpers, and a DocType definition dict. No formal "What To Build", "Architecture Constraints", "Acceptance Criteria", or "Tests" sections. The code IS the spec, but it's not a spec document.
Failure classification: FUNDAMENTAL

**Test Specificity**: 1/5
Evidence: No tests whatsoever. No test section, no test file, no test scenarios described anywhere in the output. An implementing agent would have zero test guidance.
Failure classification: FUNDAMENTAL

**API Specification Quality**: 4/5
Evidence: Both GET and PUT endpoints fully implemented with Pydantic models, response models, and error handling. Request/response schemas are implicit in code (ResolvedPreferencesResponse, UserPreferencesPayload). Error states handled (400 for invalid keys, 404 for missing user). However, no documented API contract separate from code.
Failure classification: CORRECTABLE

**Guardrail Compliance**: 4/5
Evidence: MAL routing pattern followed (APIRouter with correct prefix). SM prefix used for DocType (SM User Notification Preferences). Three-tier cascade correctly implemented. CRM timeline not addressed (neither written nor justified as N/A).
Failure classification: CORRECTABLE

**Acceptance Criteria Quality**: 1/5
Evidence: No acceptance criteria section exists. The code implies behavior but there are no verifiable criteria listed. An implementing agent would need to reverse-engineer acceptance criteria from the code.
Failure classification: FUNDAMENTAL

TOTAL: 13/25
Notable strength: Cascade resolution logic is correctly implemented with per-channel source tracking.
Notable failure: Output is code, not a spec document — missing acceptance criteria, tests, and formal documentation sections entirely.

---

## MODEL: model-alpha | TEST: 02 SUMMARY
Run A: 16 | Run B: 24 | Run C: 13
Mean: 17.7 | Range: 11 | Consistency: Low

Consistency narrative: Extreme variance. Run B is near-perfect, Run A is passable but test-less, Run C is pure code with no spec structure. The model's output format changes dramatically between prompts — sometimes producing a proper spec doc, sometimes producing raw implementation code.
Dominant strength: When it produces a spec (Run B), the test cases and API contracts are excellent.
Dominant weakness: Inconsistent output format — may produce code instead of a spec document.
Prompt engineering note: Add explicit instruction: "Output a markdown specification document with named sections. Do NOT output implementation code as the primary artifact."

---

## MODEL: model-beta | TEST: 02 | RUN: A

**Completeness of Sections**: 5/5
Evidence: Has Purpose, Platform Guardrails Compliance, Architecture, Endpoint Specification (4.1-4.5), Implementation Guide, Vocabulary Resolution detail, CRM Timeline detail, Error Handling Summary, Acceptance Criteria (10 ACs), Testing (manual + automated), Out of Scope, Definition of Done. Exhaustively complete.
Failure classification: N/A

**Test Specificity**: 5/5
Evidence: Manual tests specify exact curl commands with expected responses. Automated tests specify function names (test_create_contact_success, test_create_contact_missing_first_name, test_create_contact_blank_first_name), mock setup, request bodies, and specific assertions (resp.status_code == 201, data["data"]["name"] == "CONT-00001").
Failure classification: N/A

**API Specification Quality**: 5/5
Evidence: Request schema with field rules table (type, required, validation, max length). Success response (201) with full JSON example and field notes table. Validation error (400) with JSON body and field reference. Frappe error (502) with rationale for status code choice. Field types explicit throughout.
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Section 2 explicitly lists every guardrail in a compliance table. Spec Gate Answers for all three gates. MAL-only rule stated. SM prefix awareness shown. CRM timeline specified as Communication record. No TypeScript, no hardcoded colors acknowledged as backend-only.
Failure classification: N/A

**Acceptance Criteria Quality**: 5/5
Evidence: AC-1 through AC-10 are each independently verifiable with specific Given/When/Then, exact status codes, exact response field assertions. Covers happy path (AC-1, AC-2), validation (AC-3, AC-4), timeline (AC-5), vocabulary (AC-6, AC-7), unknown fields (AC-8), Frappe errors (AC-9), timeline failure (AC-10).
Failure classification: N/A

TOTAL: 25/25
Notable strength: The most thorough spec in the entire bakeoff — covers security (unknown fields), error degradation (timeline failure), and vocabulary with plural forms.
Notable failure: None.

---

## MODEL: model-beta | TEST: 02 | RUN: B

**Completeness of Sections**: 5/5
Evidence: Has Purpose, Spec Gates (all 3), API Contract, Pydantic Response Model, VALID_TRANSITIONS Constant section, Endpoint Implementation, Files Changed, Acceptance Criteria (12 ACs), Test Plan (unit + integration), Out of Scope, Risks & Mitigations, Architectural Compliance. Exceptionally complete.
Failure classification: N/A

**Test Specificity**: 5/5
Evidence: Unit tests specify exact function names (test_valid_transitions_dict_has_all_states, test_valid_transitions_values_are_lists_of_strings, test_valid_transitions_targets_are_known_states, test_response_model_fields, test_response_model_defaults_empty_transitions) with assertions. Integration test table specifies 7 scenarios with method, expected outcome.
Failure classification: N/A

**API Specification Quality**: 5/5
Evidence: Request with path parameters and headers fully specified. Success response (200) with full JSON example and field table. Error responses (400, 404, 500) with exact JSON bodies. Response model shown as Pydantic class. Field types explicit.
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Section 12 has explicit Architectural Compliance table covering 6 rules. Gate 2 explicitly addresses CRM timeline as N/A for read endpoint with justification. Correctly instructs copying VALID_TRANSITIONS rather than direct import (acknowledging MAL/Frappe process boundary), with BLOCKED instruction if source cannot be found.
Failure classification: N/A

**Acceptance Criteria Quality**: 5/5
Evidence: AC-1 through AC-12 are independently verifiable with specific verification methods. Covers found claim (AC-1), state match (AC-2), transitions match (AC-3), terminal state (AC-4), not found (AC-5), empty claim_id (AC-6), site header forwarded (AC-7), absent header (AC-8), no mutation (AC-9), no transition_state import (AC-10), VALID_TRANSITIONS exact match (AC-11), response model types (AC-12).
Failure classification: N/A

TOTAL: 25/25
Notable strength: Recognizes the MAL/Frappe process boundary issue with VALID_TRANSITIONS import and provides a principled solution (copy with BLOCKED guard).
Notable failure: None.

---

## MODEL: model-beta | TEST: 02 | RUN: C

**Completeness of Sections**: 5/5
Evidence: Has Objective, Spec Gates, Domain Model (events, channels, preference shape, platform defaults, site overrides, user overrides), Three-Tier Merge Logic, API Contract (GET and PUT), Pydantic Models, Endpoint Implementation Logic, Deep Merge Helper, Frappe DocType Definition, Error Handling, Acceptance Criteria (12 ACs), Test Plan (11 tests), Implementation Notes, File Inventory.
Failure classification: N/A

**Test Specificity**: 5/5
Evidence: 11 tests (T-1 through T-11) specify test name, type (unit/integration), and notes. Unit tests cover resolve_preferences with various tier combinations, deep_merge, and validation for unknown event/channel/non-bool. Integration tests cover 404 for nonexistent user, platform-only resolution, sequential PUTs, and invalid body rejection.
Failure classification: N/A

**API Specification Quality**: 5/5
Evidence: Both GET and PUT fully specified with headers, path params, request body examples, and response examples. Response schema shows per-channel {enabled, source} structure. All error states covered (400 for invalid keys, 404 for missing user, 502 for backend). PUT merge behavior explicitly documented including incremental update semantics.
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Spec Gates section addresses all three gates. MAL-only rule stated. SM prefix correctly applied to new DocType. CRM timeline addressed as N/A with justification ("settings action, not customer interaction event"). Three-tier cascade correctly specified as the prompt requires.
Failure classification: N/A

**Acceptance Criteria Quality**: 5/5
Evidence: AC-1 through AC-12 are independently verifiable. Covers GET resolved preferences (AC-1), platform-only (AC-2), site overrides platform (AC-3), user overrides site (AC-4), no user doc returns 200 not 404 (AC-5), nonexistent user 404 (AC-6), PUT creates doc (AC-7), PUT merges (AC-8), PUT rejects invalid event (AC-9), PUT rejects invalid channel (AC-10), PUT rejects non-boolean (AC-11), PUT returns resolved (AC-12).
Failure classification: N/A

TOTAL: 25/25
Notable strength: Explicit handling of the "no user override doc exists" edge case (AC-5) — returns 200, not 404 — demonstrates deep understanding of the three-tier model.
Notable failure: None.

---

## MODEL: model-beta | TEST: 02 SUMMARY
Run A: 25 | Run B: 25 | Run C: 25
Mean: 25.0 | Range: 0 | Consistency: High

Consistency narrative: Perfect scores across all three runs with three different prompts. The model consistently produces exhaustively complete specs with verifiable acceptance criteria, specific tests, and thorough API contracts regardless of the domain.
Dominant strength: Exhaustive completeness — every section is present, substantive, and specific.
Dominant weakness: None observed across three runs.
Prompt engineering note: No compensation needed — this model reliably produces high-quality specs.

---

## MODEL: model-gamma | TEST: 02 | RUN: A

**Completeness of Sections**: 1/5
Evidence: Output is a story decomposition table (31 CRM stories) and a dependency graph, not a spec for CRM-003. There is no What To Build, no API schema, no tests, no acceptance criteria for CRM-003 specifically. The model misunderstood the task entirely — it produced a feature library, not a story spec.
Failure classification: FUNDAMENTAL

**Test Specificity**: 0/5
Evidence: No tests of any kind. The output contains no test section, no test cases, no test scenarios.
Failure classification: FUNDAMENTAL

**API Specification Quality**: 1/5
Evidence: CRM-003 row in the table mentions "POST /api/modules/crm/contacts/create" but provides no request schema, response schema, error states, or field definitions.
Failure classification: FUNDAMENTAL

**Guardrail Compliance**: 1/5
Evidence: The table structure implies awareness of CRM timeline (column exists) and workflow alignment, but no actual guardrail compliance is demonstrated for the specific story. No architecture constraints section.
Failure classification: FUNDAMENTAL

**Acceptance Criteria Quality**: 0/5
Evidence: No acceptance criteria exist for CRM-003 or any other story. The decomposition table has no verifiable criteria.
Failure classification: FUNDAMENTAL

TOTAL: 3/25
Notable strength: The dependency graph shows strong architectural thinking about build order.
Notable failure: Completely wrong output type — produced a feature decomposition instead of a single story spec.

---

## MODEL: model-gamma | TEST: 02 | RUN: B

**Completeness of Sections**: 4/5
Evidence: Has Metadata, Context & Scope, Architecture, Endpoint Specification, Data Contracts, Implementation Details, Testing Requirements, Acceptance Criteria, and Out of Scope. Missing explicit "CRM Timeline" section (addressed as N/A implicitly in the scope section). Sections are present but some are thin.
Failure classification: CORRECTABLE

**Test Specificity**: 3/5
Evidence: Testing Requirements table has 6 test cases with Input and Expected Result columns. However, tests are described at a table level without function names, specific assertion code, or detailed setup. "Missing Path Param" test expected result says "Frappe returns 401/400 or FastAPI validation fails (verify platform nginx/site config behavior)" which is vague.
Failure classification: CORRECTABLE

**API Specification Quality**: 5/5
Evidence: Route and method specified. Parameters table with type, location, required flag, and description. Response codes table (200, 400, 404, 422). Pydantic response model with fields. JSON request and response examples. All error states covered.
Failure classification: N/A

**Guardrail Compliance**: 4/5
Evidence: Platform Guardrails noted in metadata row. Architecture section shows MAL routing, SM prefix (SM Claim), read-only enforcement. Imports VALID_TRANSITIONS from existing controller. CRM timeline implicitly addressed as out of scope (read-only). No explicit "CRM Timeline: N/A" statement.
Failure classification: CORRECTABLE

**Acceptance Criteria Quality**: 4/5
Evidence: 10 acceptance criteria items covering endpoint deployment, schema, 400/404 errors, site header forwarding, VALID_TRANSITIONS usage, zero writes, unit tests, and linting. Most are independently verifiable. "PR includes link to BILL-010 dependency confirmation" is process, not functionality.
Failure classification: CORRECTABLE

TOTAL: 20/25
Notable strength: Clean API specification with Pydantic model and proper response code table.
Notable failure: Test cases lack the specificity needed for direct implementation — no function names or assertion details.

---

## MODEL: model-gamma | TEST: 02 | RUN: C

**Completeness of Sections**: 5/5
Evidence: Has Summary, Domain Model (events, channels, three-tier cascade), New DocType definition, API Specification (GET and PUT), Site Registry Integration, Implementation Details (file location, Pydantic models, helper functions, CRM timeline activity), Test Specifications (GET: 8 tests, PUT: 10 tests), Security Considerations, Deployment Notes, Acceptance Criteria Checklist (17 items).
Failure classification: N/A

**Test Specificity**: 5/5
Evidence: GET tests (G-01 through G-08) and PUT tests (P-01 through P-10) each specify test name, setup conditions, input, and expected output. Examples: "G-04: Three-tier cascade — Platform: email=true, Site: email=false, User: (not set) → email = {value: false, source: 'site'}". P-03 covers null semantics for removing overrides.
Failure classification: N/A

**API Specification Quality**: 5/5
Evidence: Both endpoints fully specified with headers, path params, request body examples, and response examples showing per-channel {value, source} structure. PUT request validation described. All error states covered (400, 404, 500). Response format explicitly documented.
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Gate 1 (Workflow), Gate 2 (CRM Timeline — writes activity log on PUT), Gate 3 (Right Level — universal) all addressed. MAL routing stated. SM prefix correctly applied to new DocType. CRM timeline write on PUT is a design choice that goes beyond the minimum (prompt says "N/A" for read, but this model adds a timeline write for the PUT mutation, which is thoughtful).
Failure classification: N/A

**Acceptance Criteria Quality**: 5/5
Evidence: 17 acceptance criteria covering both endpoints, cascade behavior, partial PUT, null semantics, invalid keys/channels, 404 for nonexistent user, site header usage, MAL pattern adherence, SM prefix, CRM activity log, error message safety, and all tests passing. Every criterion is independently verifiable.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Null semantics for removing user overrides (P-03) shows deep understanding of partial update patterns.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 02 SUMMARY
Run A: 3 | Run B: 20 | Run C: 25
Mean: 16.0 | Range: 22 | Consistency: Low

Consistency narrative: Run A was a catastrophic misunderstanding — the model produced a feature decomposition instead of a story spec. Run B recovered to a solid spec. Run C is excellent. The model's comprehension of the task varies wildly between prompts.
Dominant strength: When it understands the task (Run C), produces thorough specs with excellent test coverage and nuanced edge cases.
Dominant weakness: May fundamentally misunderstand the task and produce the wrong artifact entirely.
Prompt engineering note: Add explicit guard: "Output exactly ONE story spec for the story ID given. Do NOT decompose into multiple stories or produce a feature library."

---

## MODEL: model-delta | TEST: 02 | RUN: A

**Completeness of Sections**: 5/5
Evidence: Has Platform Gates (all 3), Background and Context, What to Build (endpoint, request, processing logic, timeline event, response), Files to Create/Modify (with exact diff instructions), Acceptance Criteria (12 ACs), Test Instructions (6 tests with curl commands), Out of Scope, Notes for Implementing Agent (10 detailed notes).
Failure classification: N/A

**Test Specificity**: 5/5
Evidence: Six tests with exact curl commands, expected HTTP status codes, and verification steps. Test 6 includes a Frappe console query to verify Communication records. Each test maps to specific acceptance criteria. Tests cover happy path (minimal and full fields), validation (missing first_name, blank last_name), unauthenticated request, and Communication record verification.
Failure classification: N/A

**API Specification Quality**: 5/5
Evidence: Request contract table with field, type, required, and validation columns. Processing logic in 5 numbered steps. Response contract with full JSON example (200, 422, 500). CRM Timeline Event field specification table with exact values. Status codes are well-chosen (422 for validation, 500 for server error).
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Platform Gates section explicitly addresses all three mandatory gates. Architecture Compliance Notes section. "React calls MAL only" stated. SM prefix awareness shown. CRM timeline event specified with exact Communication field values. Vocabulary resolution detailed with fallback behavior.
Failure classification: N/A

**Acceptance Criteria Quality**: 5/5
Evidence: AC-1 through AC-12 are independently verifiable. Each specifies the exact condition, HTTP status code, and what to verify. Covers endpoint reachable (AC-1), Contact exists in Frappe (AC-2), document ID returned (AC-3), blank/missing first_name (AC-4, AC-5), blank last_name (AC-6), timeline event (AC-7), vocabulary in timeline (AC-8), default vocabulary (AC-9), timeline failure non-fatal (AC-10), auth enforced (AC-11), route in API docs (AC-12).
Failure classification: N/A

TOTAL: 25/25
Notable strength: "Notes for Implementing Agent" section (10 items) anticipates real-world implementation pitfalls like Frappe child tables, FrappeClient patterns, and `getattr` safety.
Notable failure: None.

---

## MODEL: model-delta | TEST: 02 | RUN: B

**Completeness of Sections**: 5/5
Evidence: Has What This Story Delivers, Platform Gates (all 3), One File instruction, Endpoint Specification, Code Changes (exact instructions for imports, constants, model, route), Multi-site Header Behaviour, Error Response Table, Explicit Non-behaviours, Acceptance Criteria (16 ACs), Smoke Test with curl commands.
Failure classification: N/A

**Test Specificity**: 4/5
Evidence: Smoke test section has 4 curl commands with expected responses. However, no unit test specifications with function names or mock setup. The spec is extremely detailed on what to build but relies on curl-based smoke tests rather than pytest-style unit tests. The 16 acceptance criteria are highly specific but are criteria, not test implementations.
Failure classification: CORRECTABLE

**API Specification Quality**: 5/5
Evidence: Endpoint specification table with method, URL, path parameter, router, response model, request body, side effects, and auth. Full code implementation shown with inline httpx call. Error response table with 5 conditions, HTTP status codes, and exact detail strings. Pydantic response model with field descriptions.
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Gate 2 explicitly addresses CRM timeline as N/A with strong justification: "reading claim state is not a business event." Correctly imports VALID_TRANSITIONS from sm_billing.state_machine.controller. Explicitly prohibits importing or calling transition_state. SM prefix awareness shown. Section 8 "Explicit Non-behaviours" is an excellent guardrail enforcement mechanism.
Failure classification: N/A

**Acceptance Criteria Quality**: 5/5
Evidence: 16 acceptance criteria, each independently verifiable. Covers GET returns 200 (AC-1), canonical_state matches Frappe (AC-2), valid_transitions matches exactly (AC-3), 404 for missing claim (AC-4), 400 for blank claim_id (AC-5), site header forwarded (AC-6), absent header works (AC-7), terminal state returns empty list (AC-8), empty canonical_state returns empty list (AC-9), transition_state not imported (AC-10), VALID_TRANSITIONS imported correctly (AC-11), Pydantic model defined (AC-12), Request added to imports (AC-13), constant defined (AC-14), no existing endpoints modified (AC-15), all code in one file (AC-16).
Failure classification: N/A

TOTAL: 24/25
Notable strength: "Explicit Non-behaviours" section (9 items) with "Why not in scope" column prevents scope creep decisively.
Notable failure: No unit test specifications — only curl-based smoke tests.

---

## MODEL: model-delta | TEST: 02 | RUN: C

**Completeness of Sections**: 4/5
Evidence: Output is primarily Python code with extensive docstring-style spec content (Mandatory Spec Gates, Evaluation Order Check, Architecture Compliance Notes, Business Logic, DocType definition, Acceptance Criteria, Manual Testing Guide, Out of Scope, Developer Checklist). However, the spec is embedded in Python comments/docstrings rather than proper markdown sections. Missing a formal Tests section with unit test specifications.
Failure classification: CORRECTABLE

**Test Specificity**: 3/5
Evidence: Manual Testing Guide has 7 curl commands with expected results. However, no unit test specifications, no function names, no mock setup, no pytest code. The testing guide is practical but high-level compared to the rubric's expectation of "function name, input, expected output."
Failure classification: CORRECTABLE

**API Specification Quality**: 5/5
Evidence: Both endpoints fully implemented with Pydantic models (NotificationPrefsUpdateRequest, NotificationPrefsResponse, ResolvedChannelEntry, ResolvedEventPrefs). Request validation via _validate_prefs_body. Error handling for 400 (invalid keys), 404 (user not found), 502 (Frappe failure). Response schema shows value + source per channel. Deep-merge semantics documented.
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Mandatory Spec Gates section addresses all three gates with detailed justification. Evaluation Order Check (4-level analysis). Architecture Compliance Notes (5 items including RC-024/ADMIN-001 dependency). MAL routing, SM prefix, no external systems all verified. CRM timeline justified as N/A ("settings action, not customer-interaction event").
Failure classification: N/A

**Acceptance Criteria Quality**: 4/5
Evidence: AC-1 through AC-12 embedded in Python comments. Cover GET 404, GET 200 with all 18 booleans, platform-only defaults, site overrides, user overrides, PUT partial body, PUT full body with idempotency, PUT 400 for bad event key, PUT 400 for bad channel key, PUT 404, header requirement. Most are independently verifiable but the format (Python comments) is unconventional.
Failure classification: CORRECTABLE

TOTAL: 21/25
Notable strength: Evaluation Order Check (native -> community -> third-party -> custom) demonstrates deep platform awareness. Design decision appendices (why deep-merge, why JSON not child table, why naming by email) are excellent.
Notable failure: Output format is code-first rather than spec-first — acceptance criteria and tests are embedded in comments rather than structured markdown sections.

---

## MODEL: model-delta | TEST: 02 SUMMARY
Run A: 25 | Run B: 24 | Run C: 21
Mean: 23.3 | Range: 4 | Consistency: Medium

Consistency narrative: Consistently strong across all runs. Run A is perfect. Run B loses 1 point for no unit tests. Run C loses 4 points for code-as-spec format and weaker test structure, but the content quality remains high. The model's spec quality degrades slightly when reasoning is turned off (per the James note on Run C).
Dominant strength: Implementation-ready detail — exact file paths, exact import changes, exact field values, anticipation of real-world pitfalls.
Dominant weakness: May output code rather than spec document when under constraints.
Prompt engineering note: Add: "Output format MUST be a markdown document. Python code may be included as examples but the primary artifact is a specification, not an implementation."

---

## MODEL: model-epsilon | TEST: 02 | RUN: A

**Completeness of Sections**: 5/5
Evidence: Has Overview, Workflow Gate, Functional Requirements (endpoint, request, response, vocabulary, timeline event, consent status, duplicate detection), Data Model, Architecture (call flow, responsibility matrix, server script hook, MAL route, Frappe API calls), Acceptance Criteria (15 ACs), Error Handling, File Changes, Open Questions, Definition of Done.
Failure classification: N/A

**Test Specificity**: 2/5
Evidence: No dedicated test section. The 15 acceptance criteria describe what to verify but not how. No test function names, no curl commands, no mock setup, no edge case test specifications. AC table has a "Test Method" column but entries are generic ("Integration test", "Code review", "Frappe DB verification").
Failure classification: CORRECTABLE

**API Specification Quality**: 5/5
Evidence: Request body with field types, optional/required flags, validation rules. Response schemas for success (201), duplicate (409), validation error (422), and auth error (401). Full JSON examples for each. Custom_fields wrapper pattern documented. Email validation specified.
Failure classification: N/A

**Guardrail Compliance**: 4/5
Evidence: Overview states MAL-only rule. SM prefix awareness shown (SM User Notification Preferences, SM Site Registry). Architecture section shows React -> MAL -> Frappe flow. CRM timeline specified. However, the spec includes duplicate detection (409) and consent status computation which are explicitly out of scope per the prompt ("No duplicate detection" is a separate story). This is scope creep, not guardrail violation.
Failure classification: DOMAIN

**Acceptance Criteria Quality**: 4/5
Evidence: 15 acceptance criteria with Criterion and Test Method columns. Cover create success, Frappe verification, timeline event, vocabulary, validation errors, duplicate detection, consent status, timeline failure, and custom fields. Most are verifiable. However, "Integration test" as a test method is vague — doesn't specify how to verify.
Failure classification: CORRECTABLE

TOTAL: 20/25
Notable strength: Architecture section with call flow diagram and responsibility matrix is excellent for implementation clarity.
Notable failure: Significant scope creep — adds duplicate detection (409), consent status computation, and server script hooks that are explicitly out of scope for this S-sized story.

---

## MODEL: model-epsilon | TEST: 02 | RUN: B

**Completeness of Sections**: 5/5
Evidence: Has Metadata, Context & Background, Functional Requirements (endpoint, path params, headers, response schemas for 200/400/404/422), Technical Approach, Implementation Notes (Pydantic model, route handler, site header), Acceptance Criteria (8 functional + 4 non-functional), Test Scenarios (unit + integration), File Changes, Out of Scope, Open Questions.
Failure classification: N/A

**Test Specificity**: 4/5
Evidence: Unit tests specify function names (test_get_claim_state_success, test_get_claim_state_not_found, test_get_claim_state_missing_claim_id, test_get_claim_state_unknown_state) with mock setup, patch decorators, and assertions. Integration test for site header. However, test_get_claim_state_missing_claim_id asserts "response.status_code in [400, 404]" which is imprecise.
Failure classification: CORRECTABLE

**API Specification Quality**: 4/5
Evidence: Endpoint, path parameters, headers, and response schemas all specified. Success response (200) with JSON example and field table. Error responses for 400, 404, 422. However, the spec returns 422 for unknown canonical_state which is incorrect — the rubric says terminal states should return empty valid_next_states, not an error. This is a design flaw.
Failure classification: DOMAIN

**Guardrail Compliance**: 4/5
Evidence: MAL routing stated. SM prefix used (SM Claim). Correctly imports VALID_TRANSITIONS from existing controller. Read-only guarantee stated. CRM timeline addressed as N/A with explanation. However, the 422 for unknown state conflicts with the rubric requirement to return empty valid_next_states gracefully.
Failure classification: DOMAIN

**Acceptance Criteria Quality**: 4/5
Evidence: 8 functional ACs (AC-01 through AC-08) with verification methods. 4 non-functional ACs. Cover 200 response, valid_transitions, 400 for empty, 404 for not found, 422 for unknown state, timestamp, header forwarding, no transition_state call. However, AC-05 (422 for unknown state) contradicts rubric expectations.
Failure classification: DOMAIN

TOTAL: 21/25
Notable strength: Non-functional acceptance criteria (NF-01 response time, NF-02 helper reuse) add practical value.
Notable failure: Returns 422 for unknown canonical_state instead of gracefully returning empty valid_transitions — a design error that would confuse the frontend.

---

## MODEL: model-epsilon | TEST: 02 | RUN: C

**Completeness of Sections**: 5/5
Evidence: Has Overview (summary, motivation, workflow, CRM timeline, right level), Technical Design (architecture diagram, storage, events, channels, three-tier cascade, API endpoints for GET and PUT, new DocType definition), Frappe Integration Details, Acceptance Criteria (15 ACs), Out of Scope, File Plan, Open Questions. Both endpoints fully specified.
Failure classification: N/A

**Test Specificity**: 3/5
Evidence: No dedicated test section in the spec portion. Implementation code includes helper functions but no test functions. The acceptance criteria have a "Test Method" column but entries are generic ("curl / MAL test suite", "Response schema assertion", "Integration test"). No function names, no mock setup.
Failure classification: CORRECTABLE

**API Specification Quality**: 5/5
Evidence: Both GET and PUT fully specified with headers, path params, request/response JSON examples. Response shows per-channel {value, tier} structure. Error responses (400 for invalid keys, 400 for missing header, 404 for nonexistent user). PUT validation rules clearly listed. DocType definition with child table approach.
Failure classification: N/A

**Guardrail Compliance**: 5/5
Evidence: Workflow section states N/A with justification. CRM Timeline Contract states N/A with justification. Right Level section confirms universal. MAL routing shown in architecture diagram. SM prefix on new DocType. Three-tier cascade correctly specified.
Failure classification: N/A

**Acceptance Criteria Quality**: 4/5
Evidence: 15 ACs covering GET resolution (AC-01), tier annotations (AC-02), site tier (AC-03), user tier (AC-04), cascade priority (AC-05), GET 404 (AC-06), missing header 400 (AC-07), PUT creates (AC-08), PUT updates (AC-09), invalid event 400 (AC-10), invalid channel 400 (AC-11), PUT response matches GET (AC-12), partial PUT preserves others (AC-13). AC-14 "listed in platform/README.md" is process, not functional. AC-15 "uses X-Frappe-Site-Name exclusively" requires code inspection.
Failure classification: CORRECTABLE

TOTAL: 22/25
Notable strength: Child table approach for DocType (SM Notification Preference Item) is a legitimate alternative design with structured storage.
Notable failure: No test section with implementable test specifications — test guidance is limited to generic AC verification methods.

---

## MODEL: model-epsilon | TEST: 02 SUMMARY
Run A: 20 | Run B: 21 | Run C: 22
Mean: 21.0 | Range: 2 | Consistency: Medium

Consistency narrative: Consistently solid but never exceptional. Scores cluster tightly (20-22) across all three runs. The model reliably produces complete specs with good API contracts but consistently underperforms on test specificity and occasionally introduces scope creep (Run A) or design errors (Run B 422 for unknown state).
Dominant strength: Complete section coverage and solid API specification quality.
Dominant weakness: Test specificity — consistently produces high-level test descriptions rather than implementable test specifications with function names and assertions.
Prompt engineering note: Add: "The Tests section MUST include pytest-style test function names, mock/fixture setup, specific input data, and exact assertion statements. Each test case must be copy-pasteable into a test file."

---

## MODEL: model-zeta | TEST: 02 | RUN: A

**Completeness of Sections**: 4/5
Evidence: Has Context & Workflow Alignment, Acceptance Criteria (functional + technical), Technical Specification (file, code, dependencies), Data Contract (request/response schemas), Testing Requirements (unit + integration), Security & Permissions, Dependencies & Out of Scope, Implementation Notes. Missing a dedicated CRM Timeline section — it's embedded in the acceptance criteria.
Failure classification: CORRECTABLE

**Test Specificity**: 3/5
Evidence: Unit tests section has 4 test scenarios with descriptions (Success Path, Default Vocabulary, Validation Failure, Custom Fields Passthrough) and brief expected outcomes. Integration test has a curl command. However, no test function names, no mock setup code, no specific assertion statements. Tests are described narratively.
Failure classification: CORRECTABLE

**API Specification Quality**: 4/5
Evidence: Request schema with field types and optional flags. Response schema (200) with JSON example and type annotations. Error responses (400, 401, 500) listed. However, the request schema makes both first_name and last_name optional ("optional but required if first_name missing") which is confusing — the validation rule is either/or, not both-required.
Failure classification: CORRECTABLE

**Guardrail Compliance**: 4/5
Evidence: Platform Guardrails Applied section lists MAL routing, Native First, CRM Timeline Contract. Uses native Contact DocType. SM prefix awareness shown (SM Site Registry). However, `communication_type = "System"` is used for timeline events — Frappe Communication doesn't have a "System" type, which could cause implementation issues.
Failure classification: DOMAIN

**Acceptance Criteria Quality**: 3/5
Evidence: Acceptance Criteria are split into Functional Requirements (7 items) and Technical Standards (4 items). Functional items describe behavior but are not independently verifiable — e.g., "Returns 400 Bad Request if both first_name and last_name are missing" is verifiable, but "Includes the resolved label in the response (person_label)" doesn't specify the exact response path. No Given/When/Then structure.
Failure classification: CORRECTABLE

TOTAL: 18/25
Notable strength: Implementation Notes section explaining why Communication DocType is used for timeline and how vocabulary storage works.
Notable failure: Acceptance criteria are too loosely specified — mix of verifiable and vague criteria.

---

## MODEL: model-zeta | TEST: 02 | RUN: B

**Completeness of Sections**: 4/5
Evidence: Has Header, Context & Constraints, Acceptance Criteria (9 items), API Specification (endpoint, headers, path params, response model, errors), Implementation Details (file location, imports, pattern, route, Pydantic model, key notes), Test Strategy (5 unit scenarios + 1 integration), Out of Scope, Dependencies Checklist, References. Missing explicit CRM Timeline N/A justification and files-to-modify section.
Failure classification: CORRECTABLE

**Test Specificity**: 3/5
Evidence: Test Strategy has 5 unit test scenarios described by name and expected behavior: "Happy Path", "Empty claim_id", "Missing Document", "Unknown State", "Site Header". Integration test described as a single end-to-end call. No test function names, no mock setup, no assertion code.
Failure classification: CORRECTABLE

**API Specification Quality**: 5/5
Evidence: Endpoint, headers table, path parameters table with validation, response model as Pydantic class, JSON error response table with status codes and response bodies. All three error states (400, 404, 422) specified. Response model fields documented with types and descriptions.
Failure classification: N/A

**Guardrail Compliance**: 4/5
Evidence: Context section explicitly states MAL routing rule and SM prefix. "DO NOT USE IN THIS ENDPOINT" for transition_state. Imports VALID_TRANSITIONS from existing controller. CRM timeline not explicitly addressed as N/A. References section cites Platform Guardrails rules.
Failure classification: CORRECTABLE

**Acceptance Criteria Quality**: 4/5
Evidence: 9 acceptance criteria covering endpoint existence, site resolution, validation (400), document lookup, not found (404), state retrieval, transition lookup, read-only guarantee, and response contract. All are verifiable. However, terminal state with empty list is not explicitly covered in AC (it's in the test strategy but not the acceptance criteria).
Failure classification: CORRECTABLE

TOTAL: 20/25
Notable strength: Clean separation of concerns — Context/Constraints, API Spec, Implementation, and Test Strategy are well-organized.
Notable failure: Test strategy lacks implementable specificity — no function names or assertion code.

---

## MODEL: model-zeta | TEST: 02 | RUN: C

**Completeness of Sections**: 3/5
Evidence: Output is primarily Python code with embedded docstring-style spec content. Has domain constants, Pydantic models, helper functions, and endpoint implementations. DocType definition in comments. But no formal Acceptance Criteria section, no Tests section, no Architecture Constraints section as standalone markdown. The code IS complete but the spec structure is missing.
Failure classification: FUNDAMENTAL

**Test Specificity**: 1/5
Evidence: No test section, no test function names, no test scenarios, no curl commands. Zero test guidance for an implementing agent.
Failure classification: FUNDAMENTAL

**API Specification Quality**: 4/5
Evidence: Both endpoints implemented with Pydantic models (GetNotificationPreferencesResponse, PutNotificationPreferencesResponse, PutNotificationPreferencesRequest). Request validation via Pydantic validator. Error handling for 400, 404. Response includes resolved preferences and source attribution. However, the output is truncated (ends mid-function) and the response format separates resolved_preferences and preference_sources into parallel dicts rather than nested per-channel objects.
Failure classification: CORRECTABLE

**Guardrail Compliance**: 4/5
Evidence: MAL routing pattern followed. SM prefix used for DocType. Three-tier cascade correctly implemented. PLATFORM_DEFAULTS defined as Python dict. Site header forwarded. CRM timeline not addressed (neither written nor justified as N/A).
Failure classification: CORRECTABLE

**Acceptance Criteria Quality**: 1/5
Evidence: No acceptance criteria section exists. No verifiable criteria listed anywhere in the output. An implementing agent would have no definition of done.
Failure classification: FUNDAMENTAL

TOTAL: 13/25
Notable strength: Cascade resolution logic with proper type checking (isinstance checks for bool values in site/user overrides) shows defensive programming.
Notable failure: Output is truncated code with no spec structure — no acceptance criteria, no tests, no formal documentation.

---

## MODEL: model-zeta | TEST: 02 SUMMARY
Run A: 18 | Run B: 20 | Run C: 13
Mean: 17.0 | Range: 7 | Consistency: Low

Consistency narrative: Run A and B produce passable specs (18-20), but Run C degrades to code-only output with no spec structure. The model tends toward implementation rather than specification, especially on more complex prompts (Run C's three-tier cascade).
Dominant strength: Clean API specification quality — consistently produces well-organized endpoint documentation.
Dominant weakness: Test specificity is consistently weak, and may produce code instead of spec on complex prompts.
Prompt engineering note: Add: "Output a MARKDOWN SPECIFICATION DOCUMENT, not Python code. Include a mandatory 'Tests' section with pytest function signatures and a mandatory 'Acceptance Criteria' section with numbered, independently verifiable criteria."

---

# FINAL LEADERBOARD

| Model | Run A | Run B | Run C | Mean | Range | Consistency |
|-------|-------|-------|-------|------|-------|-------------|
| model-beta | 25 | 25 | 25 | **25.0** | 0 | High |
| model-delta | 25 | 24 | 21 | **23.3** | 4 | Medium |
| model-epsilon | 20 | 21 | 22 | **21.0** | 2 | Medium |
| model-alpha | 16 | 24 | 13 | **17.7** | 11 | Low |
| model-zeta | 18 | 20 | 13 | **17.0** | 7 | Low |
| model-gamma | 3 | 20 | 25 | **16.0** | 22 | Low |

**Pass threshold (18/25):**
- model-beta: PASS all 3 runs
- model-delta: PASS all 3 runs
- model-epsilon: PASS all 3 runs
- model-alpha: PASS 1 of 3 runs (Run B only)
- model-zeta: PASS 2 of 3 runs (Run A, Run B)
- model-gamma: PASS 2 of 3 runs (Run B, Run C)
