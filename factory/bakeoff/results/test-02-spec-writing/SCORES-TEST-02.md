# Test 02: Spec Writing — Scores

Scored: 2026-04-09
Scorer: Claude Opus 4.6 (1M context)

---

## MODEL: model-alpha | TEST: 02 | RUN: A
Completeness of Sections: 3/5
  Evidence: Has Objective, Acceptance Criteria (Gherkin), Technical Implementation with code, Guardrails Compliance, Open Questions. Missing a dedicated Files section and a structured Tests section with unit/integration/edge cases.
Test Specificity: 2/5
  Evidence: No test section at all. Gherkin scenarios describe behavior but provide no pytest function names, no mock patterns, no edge case listing. An implementing agent has zero test guidance.
API Specification Quality: 3/5
  Evidence: Request fields listed with types in Pydantic model. Response JSON example provided. However, only 200 status shown (not 201 for creation). No explicit 400/422/500 response body schemas. Missing field validation rules (max length, format).
Guardrail Compliance: 4/5
  Evidence: Explicitly states MAL-only rule, uses native Contact DocType, mentions CRM timeline via Communication, notes n8n boundary. Does not mention SM prefix awareness (though not directly applicable here).
Acceptance Criteria Quality: 3/5
  Evidence: Four Gherkin scenarios cover happy path, vocabulary, timeline, and fallback. Missing error state scenarios (missing first_name, Frappe error, timeline failure). Not independently verifiable by command.
TOTAL: 15/25
Notable strength: Clear vocabulary resolution logic with fallback behavior well-specified.
Notable failure: Complete absence of a test section makes this unimplementable without spec amendments.

---

## MODEL: model-beta | TEST: 02 | RUN: A
Completeness of Sections: 5/5
  Evidence: Has Purpose, Platform Guardrails, Architecture, Endpoint Specification (request/response/errors), Implementation Guide with pseudocode, Vocabulary detail, CRM Timeline detail, Error Handling summary, 10 Acceptance Criteria, Testing (manual + automated), Out of Scope, Definition of Done. Exceptionally complete.
Test Specificity: 5/5
  Evidence: Manual test section with 4 curl commands and verify steps. Automated test section with 3 pytest functions showing mock patterns, assertions, and status code checks. Edge cases explicitly listed (AC-4 blank first_name, AC-8 unknown fields, AC-10 timeline failure).
API Specification Quality: 5/5
  Evidence: Request schema with field table (type, required, validation, max chars). Response schemas for 201, 400, and 502 with full JSON bodies. Field notes table explaining each response field's source. 201 status code correct for creation. Allowlist pattern documented.
Guardrail Compliance: 5/5
  Evidence: Explicit guardrail compliance table with 6 entries. Spec Gate answers for all 3 gates. MAL-only stated. Native DocType confirmed. SM prefix awareness noted. CRM timeline via Communication specified with detailed fields.
Acceptance Criteria Quality: 5/5
  Evidence: 10 numbered ACs, each with Given/When/Then format and specific assertions. Covers happy path (AC-1, AC-2), validation errors (AC-3, AC-4), timeline (AC-5), vocabulary (AC-6, AC-7), security (AC-8), upstream errors (AC-9), and graceful degradation (AC-10). Each independently verifiable.
TOTAL: 25/25
Notable strength: The Frappe Contact child tables note (Section 5.4) shows deep platform knowledge and saves implementer hours of debugging.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 02 | RUN: A
Completeness of Sections: 1/5
  Evidence: Output is a full story decomposition table (31 stories) and dependency graph, not a spec for CRM-003. No endpoint definition, no API schema, no tests, no acceptance criteria for the specific story. Wrong deliverable entirely.
Test Specificity: 0/5
  Evidence: No tests of any kind. The output is a story decomposition, not a story spec.
API Specification Quality: 0/5
  Evidence: No API specification present. The table row for CRM-003 mentions "POST /api/modules/crm/contacts/create" but provides no schema, no error states, no response format.
Guardrail Compliance: 1/5
  Evidence: The story table mentions "Writes Contact creation activity" for CRM-003 and lists spec gate answers in table columns. But there is no actual guardrail compliance analysis or detailed spec content.
Acceptance Criteria Quality: 0/5
  Evidence: No acceptance criteria for CRM-003. The output is an index, not a spec.
TOTAL: 2/25
Notable strength: The dependency graph and parallel execution groups show strong systems thinking.
Notable failure: Produced the wrong deliverable entirely -- a story decomposition instead of a story spec for CRM-003.

---

## MODEL: model-delta | TEST: 02 | RUN: A
Completeness of Sections: 5/5
  Evidence: Has Platform Gates (all 3 answered), Background/Context, What to Build (endpoint, request, processing logic, timeline, response), full code with helpers, Files to Create/Modify, 12 Acceptance Criteria, 6 Test Instructions with curl commands, Out of Scope, Notes for Implementing Agent. Comprehensive.
Test Specificity: 4/5
  Evidence: Six numbered test instructions with curl commands, expected results, and verification steps including Frappe console query (Test 6). However, no pytest unit test code -- only manual/integration tests. Edge cases covered (blank last_name, missing first_name, unauthenticated).
API Specification Quality: 5/5
  Evidence: Request contract table with field types, required flags, and validation rules. Response contracts for 200, 422, and 500 with JSON examples. Child table handling (email_ids, phone_nos) explicitly addressed. Field mapping documented precisely.
Guardrail Compliance: 5/5
  Evidence: All three Platform Gates answered thoroughly with explanations. MAL-only rule stated explicitly. Native Contact DocType confirmed. SM prefix noted. Communication DocType fields specified exactly (communication_type="Other", communication_medium="Other" to avoid email-send path -- very precise).
Acceptance Criteria Quality: 5/5
  Evidence: 12 numbered ACs covering endpoint reachability (AC-1), Frappe verification (AC-2), document ID format (AC-3), validation errors (AC-4,5,6), timeline (AC-7,8), vocabulary (AC-9), timeline failure (AC-10), auth (AC-11), OpenAPI docs (AC-12). Each independently verifiable.
TOTAL: 24/25
Notable strength: The "Notes for Implementing Agent" section (10 numbered notes) is exceptional -- anticipates real implementation pitfalls like frappe.local.site being illustrative, child table patterns, and REST vs Python API differences.
Notable failure: No pytest unit test code (manual tests only).

---

## MODEL: model-epsilon | TEST: 02 | RUN: A
Completeness of Sections: 4/5
  Evidence: Has Overview, Workflow Gate, Functional Requirements (endpoint, request, response, vocabulary, timeline, consent status, duplicate detection), Data Model, Architecture, Acceptance Criteria (15 ACs), Error Handling, File Changes, Open Questions, Definition of Done. Very thorough but includes scope creep (duplicate detection, consent status computation) not in the story brief.
Test Specificity: 2/5
  Evidence: No dedicated test section with pytest functions. The 15 acceptance criteria say "Integration test" or "Frappe DB verification" as test method but provide no test code, no mock patterns, no function signatures.
API Specification Quality: 4/5
  Evidence: Request body with JSON example and field table. Response schemas for 201, 409, 422, 401 with JSON examples. Field types specified. However, the custom_fields wrapper adds complexity not in the original brief and the 409 Conflict response is scope creep.
Guardrail Compliance: 4/5
  Evidence: Spec Gate answers provided. MAL-only stated. SM prefix used. CRM timeline via Communication specified. However, the spec adds duplicate detection (out of scope per brief) and a Frappe server script hook for consent computation, which goes beyond what was asked.
Acceptance Criteria Quality: 4/5
  Evidence: 15 ACs covering many scenarios including custom fields, consent status, and duplicates. Each has a test method column. However, the ACs include items from scope-crept features (AC-6/7/8 for duplicates, AC-13 for consent status) which were not in the story brief.
TOTAL: 18/25
Notable strength: Deep domain knowledge -- the consent status computation hook and custom_fields wrapper show understanding of the healthcare vertical.
Notable failure: Significant scope creep -- adds duplicate detection (CRM-011), consent status computation, and custom fields handling that the brief explicitly scoped to separate stories.

---

## MODEL: model-zeta | TEST: 02 | RUN: A
Completeness of Sections: 4/5
  Evidence: Has Context & Workflow, Acceptance Criteria, Technical Specification (code), Data Contract (request/response schemas), Testing Requirements, Security, Dependencies, Implementation Notes. Missing a dedicated Files section and Platform Gates are implicit rather than explicit.
Test Specificity: 3/5
  Evidence: Testing section has 4 unit test descriptions (Success Path, Default Vocabulary, Validation Failure, Custom Fields) with mock patterns described. Integration test with curl command. But no pytest function signatures, no edge case for timeline failure or Frappe error.
API Specification Quality: 3/5
  Evidence: Request and response schemas documented with JSON type annotations. Error responses listed (400, 401, 500). But only 200 status for creation (not 201). Response schema puts person_label inside data object rather than as a separate vocabulary/meta field. Missing detailed field validation rules.
Guardrail Compliance: 4/5
  Evidence: Platform Guardrails section with compliance table. MAL-only stated. Native Contact DocType confirmed. SM prefix noted. CRM timeline via Communication with communication_type="System" and JSON content. Custom fields passthrough via extra="allow" is permissive.
Acceptance Criteria Quality: 2/5
  Evidence: 7 acceptance criteria in section 2 are high-level functional requirements, not independently verifiable test criteria. "Returns 200 OK with body" is not specific enough. Missing error state ACs, timeline failure AC, vocabulary fallback AC.
TOTAL: 16/25
Notable strength: Clean code organization with proper separation of concerns in the implementation.
Notable failure: Acceptance criteria are requirements statements, not verifiable test criteria. Missing error state coverage.

---

## MODEL: model-alpha | TEST: 02 | RUN: B
Completeness of Sections: 5/5
  Evidence: Has Summary, Acceptance Criteria table, full API Contract (request/response/errors), Technical Design with code, Edge Cases table, 7 Test Cases, Out of Scope, Implementation Notes, Files to Modify, Definition of Done. All required sections present.
Test Specificity: 4/5
  Evidence: 7 test cases with Given/When/Then format, specific response JSON, and edge cases (terminal state, empty canonical_state, unknown state, site header). Missing pytest function signatures but test scenarios are precise and implementable.
API Specification Quality: 5/5
  Evidence: Request with path params and headers table. Success response 200 with field types table. Error responses for 400 and 404 with JSON bodies. Response model defined as Pydantic. Optional null for current_state documented.
Guardrail Compliance: 5/5
  Evidence: Imports VALID_TRANSITIONS from controller (not re-implements). Explicitly states "Do not import transition_state." Read-only behavior documented as AC-8. MAL routing correct.
Acceptance Criteria Quality: 4/5
  Evidence: 8 ACs covering endpoint, state match, transitions match, terminal state, 404, 400, site header forwarding, and no-mutation guarantee. Each independently verifiable. Missing AC for unknown state gracefully returning empty list.
TOTAL: 23/25
Notable strength: Edge cases table is thorough -- covers whitespace claim_id, empty canonical_state, unknown state value, and Frappe 5xx propagation.
Notable failure: Missing explicit mention that VALID_TRANSITIONS should be imported (not copied) -- the Implementation Notes say to follow the import pattern but the code shows inline helper.

---

## MODEL: model-beta | TEST: 02 | RUN: B
Completeness of Sections: 5/5
  Evidence: Purpose, Spec Gates (all 3), API Contract, Pydantic model, VALID_TRANSITIONS handling (Section 5 with explicit copy instruction), Implementation with code, Files Changed, Acceptance Criteria (12 ACs), Test Plan (unit + integration), Out of Scope, Risks & Mitigations, Architectural Compliance.
Test Specificity: 5/5
  Evidence: 5 unit tests with pytest function signatures, assertions, and specific test data. 7 integration test scenarios in table format. Unit tests verify dict structure, target validity, response model defaults. Integration tests cover happy path, 404, whitespace, site header, terminal state, idempotency.
API Specification Quality: 5/5
  Evidence: Full request/response tables with types. Success 200 with JSON example. Error 400 and 404 with JSON bodies and 500 with standard error. Response field descriptions clear. Pydantic model with field types.
Guardrail Compliance: 5/5
  Evidence: Key insight: correctly identifies that MAL cannot import from sm_billing directly (separate process) and instructs to copy VALID_TRANSITIONS with source citation. This is a critical architectural awareness. Explicit "do NOT import transition_state." Architectural compliance table with 6 rules checked.
Acceptance Criteria Quality: 5/5
  Evidence: 12 ACs covering functional behavior, state matching, terminal states, errors, site header with/without, no-mutation, no-transition-state import, dict match verification, response model types. Each has explicit verification method.
TOTAL: 25/25
Notable strength: Section 5 correctly identifies that FastAPI MAL runs in a separate process from Frappe and cannot import sm_billing directly -- proposes copying the dict with source citation. This level of architectural awareness is exceptional.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 02 | RUN: B
Completeness of Sections: 4/5
  Evidence: Has Metadata, Context & Scope, Architecture, Endpoint Specification, Data Contracts, Implementation Details, Testing Requirements, Acceptance Criteria, Smoke Test, Out of Scope. Missing explicit Platform Gates section (though compliance is implied). Uses emoji headers.
Test Specificity: 3/5
  Evidence: 6 test cases in a table with Input/Expected columns. Covers valid query, missing param, non-existent claim, unknown state, missing site header, mutation prevention. No pytest function signatures, no mock patterns, no assertions code.
API Specification Quality: 4/5
  Evidence: Route, parameters, response codes, Pydantic model, JSON example all present. Field named valid_next_states (different from other models' valid_transitions). Missing explicit field type annotations in response table.
Guardrail Compliance: 4/5
  Evidence: States VALID_TRANSITIONS import from controller with fallback note. "STRICTLY READ-ONLY" with zero write operations emphasized. MAL routing correct. Missing explicit spec gate answers (implied but not structured).
Acceptance Criteria Quality: 3/5
  Evidence: 10 checkbox items covering deployment, schema, error codes, header forwarding, zero mutations, unit tests, linting. Some are process criteria (linting, PR link) rather than functional verification. Missing specific claim state value assertions.
TOTAL: 18/25
Notable strength: Import fallback strategy -- notes that if sm_billing is not importable from the FastAPI venv, a constant copy with TODO is acceptable.
Notable failure: Acceptance criteria mix process items (linting, PR links) with functional criteria, reducing verifiability.

---

## MODEL: model-delta | TEST: 02 | RUN: B
Completeness of Sections: 5/5
  Evidence: Has What This Story Delivers, Platform Gates (all 3 answered thoroughly), One File instruction, Endpoint Specification, exact Code Changes (5 subsections with import modifications, constant, model, route), Multi-site Header Behaviour, Error Response Table, Explicit Non-behaviours, 16 Acceptance Criteria, Smoke Test section. Extremely thorough.
Test Specificity: 4/5
  Evidence: 4 smoke test curl commands with expected output. No pytest function signatures but the 16 acceptance criteria are precise enough to generate tests from. Edge cases covered in Error Response Table (5 scenarios). Missing formal unit test code.
API Specification Quality: 5/5
  Evidence: Endpoint table with method, URL, path param, router, response model, auth. Response model with 3 fields precisely typed. Error table with 5 conditions/statuses/messages. Pydantic ClaimStateResponse defined with field descriptions.
Guardrail Compliance: 5/5
  Evidence: Imports VALID_TRANSITIONS from controller. Explicit "Do not import transition_state." Section 8 "Explicit Non-behaviours" lists 10 things NOT to do -- exceptional guardrail enforcement. Platform Gates all answered with justification.
Acceptance Criteria Quality: 5/5
  Evidence: 16 ACs covering every aspect: endpoint returns 200, canonical_state matches Frappe, valid_transitions matches exactly, 404, 400, site header present/absent, terminal state, empty string state, transition_state not imported, VALID_TRANSITIONS imported (not redefined), ClaimStateResponse defined, Request imported, constant present, no existing endpoints modified, all code in one file. Extraordinarily specific and verifiable.
TOTAL: 24/25
Notable strength: Section 8 "Explicit Non-behaviours" (10 items) is a masterclass in scope containment -- tells the implementing agent exactly what NOT to build.
Notable failure: No pytest unit test code (smoke tests only).

---

## MODEL: model-epsilon | TEST: 02 | RUN: B
Completeness of Sections: 4/5
  Evidence: Has Context, Functional Requirements, Technical Approach, Implementation Notes, Acceptance Criteria (8 functional + 4 non-functional), Test Scenarios (unit + integration), File Changes, Out of Scope, Open Questions, Sign-Off. Solid structure. Missing explicit Platform Gates.
Test Specificity: 4/5
  Evidence: 4 unit tests with pytest code showing mock patterns, AsyncMock, patch, specific assertions. Integration test with mock. Edge case for unknown state returning 422 (debatable design choice). Function names and assertions explicit.
API Specification Quality: 4/5
  Evidence: Endpoint, path params, headers, response schemas for 200/400/404/422 with JSON examples. Pydantic model with queried_at timestamp (extra field not in brief). However, the 422 for unknown state is a design choice that conflicts with graceful degradation (other models return empty list).
Guardrail Compliance: 4/5
  Evidence: Imports VALID_TRANSITIONS from controller. Explicitly states "does NOT call transition_state()." MAL routing correct. However, returns 422 for unknown state instead of graceful empty list, which could cause frontend breakage on stale data.
Acceptance Criteria Quality: 3/5
  Evidence: 8 functional ACs and 4 non-functional ACs. AC-05 (422 for unknown state) is a debatable design choice. NF-01 (response time < 200ms) is not verifiable in the spec context. Missing AC for empty canonical_state. ACs use "Unit test" or "Code review" as verification but not all are independently verifiable.
TOTAL: 19/25
Notable strength: Unit test code with proper async mock patterns (AsyncMock, patch) is copy-paste ready.
Notable failure: Returning 422 for an unknown state is a questionable design choice -- all other models correctly return empty transitions as graceful degradation.

---

## MODEL: model-zeta | TEST: 02 | RUN: B
Completeness of Sections: 4/5
  Evidence: Has Header metadata, Context & Constraints, Acceptance Criteria, API Specification, Implementation Details with code, Test Strategy, Out of Scope, Dependencies Checklist, References. Missing explicit Platform Gates (though constraints cover the ground).
Test Specificity: 3/5
  Evidence: 5 unit test scenarios described (happy path, empty claim_id, missing doc, unknown state, site header). Integration test mentioned. But no pytest function signatures, no mock code, no assertion patterns. Test descriptions are behavioral, not implementable.
API Specification Quality: 4/5
  Evidence: Endpoint, headers, path params, response model (Pydantic), error responses table (400, 404, 422). Field named valid_next_states. JSON example absent from response. 422 for missing header is appropriate.
Guardrail Compliance: 5/5
  Evidence: Imports VALID_TRANSITIONS from controller (explicit instruction). "DO NOT USE IN THIS ENDPOINT" for transition_state in bold. MAL routing, SM prefix, multi-tenancy all addressed. Clean separation of concerns.
Acceptance Criteria Quality: 3/5
  Evidence: 9 ACs covering existence, site resolution, validation, lookup, 404, state retrieval, transition lookup, read-only guarantee, response contract. Good coverage but stated as functional requirements rather than specific verifiable assertions. Missing terminal state AC and empty state AC.
TOTAL: 19/25
Notable strength: The Dependencies Checklist with checkboxes confirming BILL-010, SM Claim DocType, and multi-site infrastructure is a practical touch.
Notable failure: Test strategy lacks implementation-ready detail -- no function signatures, no mock patterns.

---

## MODEL: model-alpha | TEST: 02 | RUN: C
Completeness of Sections: 3/5
  Evidence: Output is primarily Python code with inline docstring spec comments. Has constants, Pydantic models, helper functions, both endpoints, and DocType definition. Missing formal sections: no structured Acceptance Criteria, no Test section, no Platform Gates, no Out of Scope section.
Test Specificity: 0/5
  Evidence: No test section, no test code, no test descriptions of any kind. Pure implementation code.
API Specification Quality: 4/5
  Evidence: Both GET and PUT endpoints defined with path params, headers, Pydantic models, response models. Error handling for 400, 404. Three-tier cascade correctly implemented with per-channel source tracking. DocType definition included. But spec is embedded in code, not formal documentation.
Guardrail Compliance: 4/5
  Evidence: SM prefix on DocType (SM User Notification Preferences). MAL routing at /api/modules/admin/. Three-tier cascade (platform, site, user) correctly implemented. CRM timeline not mentioned (correctly -- this is a settings endpoint). However, delivering code instead of a spec document is itself a format compliance failure.
Acceptance Criteria Quality: 0/5
  Evidence: No acceptance criteria section. The code is the implicit spec, but no independently verifiable criteria are listed.
TOTAL: 11/25
Notable strength: The three-tier cascade resolution logic with per-channel source tracking (email_source, sms_source, in_app_source) is correctly implemented.
Notable failure: Delivered implementation code instead of a specification document. No tests, no acceptance criteria, no formal structure.

---

## MODEL: model-beta | TEST: 02 | RUN: C
Completeness of Sections: 5/5
  Evidence: Has Objective, Spec Gates (all 3), Domain Model (events, channels, preference shape, platform defaults, site overrides, user overrides), Three-Tier Merge Logic with algorithm, full API Contract (GET and PUT), Pydantic Models, Endpoint Implementation Logic (GET flow, PUT flow, deep merge helper), Frappe DocType Definition, Error Handling table, 12 Acceptance Criteria, 11 Test Plan entries, Implementation Notes (router registration, Frappe patterns, site override loading, non-goals), File Inventory. Exceptionally comprehensive.
Test Specificity: 5/5
  Evidence: 11 tests in table format: 7 unit tests (merge function, deep merge, validation for events/channels/non-bool) and 4 integration tests (404 user, 200 platform-only, sequential PUT merge, 400 no-write). Each has test name, type, and notes. Pure function tests for merge logic enable unit testing without mocks.
API Specification Quality: 5/5
  Evidence: GET and PUT fully specified with headers, path params, response 200 with JSON examples showing per-channel enabled+source structure. Error responses for 400 (invalid event key, invalid channel key), 404, 502 with JSON examples. Partial PUT merge behavior explicitly documented. "No delete-key semantic in v1" noted.
Guardrail Compliance: 5/5
  Evidence: Spec Gates all answered. SM prefix on DocType. MAL routing under /api/modules/admin/. CRM timeline correctly noted as N/A (settings action). Three-tier cascade correctly described with user > site > platform priority. No direct Frappe calls from React.
Acceptance Criteria Quality: 5/5
  Evidence: 12 ACs in Given/When/Then format. AC-1 through AC-5 cover GET (full resolution, platform-only, site overrides, user overrides, no-doc-200). AC-6 through AC-12 cover PUT (create, merge, invalid event, invalid channel, non-bool, resolved response). Each independently verifiable. AC-8 specifically tests merge behavior (existing + new).
TOTAL: 25/25
Notable strength: The merge algorithm section with pure-function signature and pseudocode is perfectly testable. The deep merge helper for PUT is precisely specified.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 02 | RUN: C
Completeness of Sections: 5/5
  Evidence: Has Summary with Platform Guardrail Checklist, Domain Model (events, channels, cascade), New DocType (SM User Notification Preferences with fields), API Specification (GET and PUT with full details), Site Registry Integration, Implementation Details (file location, Pydantic models, helper functions, CRM timeline), Test Specifications (8 GET tests, 10 PUT tests), Security, Deployment Notes, Acceptance Criteria checklist (17 items). Extremely thorough.
Test Specificity: 5/5
  Evidence: 8 GET tests (G-01 through G-08) and 10 PUT tests (P-01 through P-10) in table format with Setup, Input, and Expected columns. Covers platform-only, site overrides, user overrides, three-tier cascade, null semantics, invalid keys, empty body, full preference object, CRM activity log. Highly specific.
API Specification Quality: 5/5
  Evidence: GET and PUT fully specified with headers, path params, response 200 with JSON examples showing per-channel value+source structure. Error responses for 400 (invalid event, invalid channel, empty body, non-bool), 404, 500. PUT null semantics documented (4.4.1). Validation rules explicit.
Guardrail Compliance: 5/5
  Evidence: Platform Guardrail Checklist with all 3 gates answered. SM prefix on DocType. MAL routing. CRM timeline write on PUT (debatable but documented). Three-tier cascade with null semantics for override removal. Security considerations noted.
Acceptance Criteria Quality: 5/5
  Evidence: 17 checkbox ACs covering GET resolution, 404, three-tier merge, PUT create/update/merge/null, validation, error messages, header respect, Frappe patterns, SM prefix, CRM activity, no stack traces, all tests pass. Comprehensive and independently verifiable.
TOTAL: 25/25
Notable strength: PUT null semantics (Section 4.4.1) for removing user overrides is a sophisticated design choice that other models miss entirely.
Notable failure: None.

---

## MODEL: model-delta | TEST: 02 | RUN: C
Completeness of Sections: 4/5
  Evidence: Output is primarily Python code with an extensive docstring spec (Platform Gates, Evaluation Order, Architecture Compliance, Business Logic, DocType definition). Has both endpoints, Pydantic models, helper functions, acceptance criteria in comments, manual testing guide in comments, out of scope in comments. The spec content is present but embedded in code comments rather than structured markdown.
Test Specificity: 3/5
  Evidence: Manual testing guide with 7 curl commands and expected results (in comments). No pytest unit tests. Acceptance criteria (12 ACs in comments) describe testable behavior but provide no test code. The manual tests are specific and cover key scenarios.
API Specification Quality: 4/5
  Evidence: Both GET and PUT endpoints defined with Pydantic models for request/response. Response model includes value+source per channel. Error handling for 404 (user not found), 400 (invalid keys), 502 (Frappe error). Three-tier cascade with isinstance checks for type safety. But formal API documentation is in code, not structured tables.
Guardrail Compliance: 5/5
  Evidence: All 3 Platform Gates answered in docstring. Evaluation Order check (4 levels analyzed). Architecture compliance notes. SM prefix on DocType. MAL routing. ADMIN-001 dependency flagged as blocker. CRM timeline correctly noted as N/A. Exceptionally thorough compliance analysis.
Acceptance Criteria Quality: 4/5
  Evidence: 12 ACs in comments covering GET 404, GET 200 with 18 values, platform-only defaults, site override with source, user override with source, partial PUT, full PUT idempotent, bad event key 400, bad channel key 400, PUT 404, header requirement, self-contained file. Specific and verifiable but embedded in code comments.
TOTAL: 20/25
Notable strength: The Evaluation Order Check (Section in docstring) analyzing 4 levels of the evaluation hierarchy is unique among all models and shows deep platform awareness. The ADMIN-001 blocker flag is also excellent.
Notable failure: Delivered as Python code with spec-in-comments rather than a structured specification document. Note from James says model failed with reasoning enabled and required multiple re-prompts.

---

## MODEL: model-epsilon | TEST: 02 | RUN: C
Completeness of Sections: 5/5
  Evidence: Has Overview (summary, motivation, workflow, CRM timeline, right level), Technical Design (architecture diagram, storage, events, channels, three-tier cascade with code, API endpoints for GET and PUT), New DocType (with child table design), Frappe Integration (user check, site lookup, CRUD, merge algorithm), Acceptance Criteria (15 ACs), Out of Scope, File Plan. Very thorough formal spec.
Test Specificity: 3/5
  Evidence: 15 ACs with test method column (curl/MAL test suite, schema assertion, integration test, unit test). But no pytest function signatures, no mock patterns, no test code. Test methods are descriptive not implementable.
API Specification Quality: 5/5
  Evidence: GET and PUT fully specified with path params, headers, response 200 with JSON showing value+tier per channel. Error responses for 400 (missing header, invalid events, invalid channels) and 404 with JSON. Validation rules listed. Partial PUT documented.
Guardrail Compliance: 4/5
  Evidence: Workflow, CRM Timeline, Right Level all addressed. SM prefix on DocType. MAL routing. However, uses a child table (SM Notification Preference Item) for user preferences instead of JSON field -- this is a valid design choice but adds bench migrate complexity that other models avoid, and the spec notes this will be harder to extend.
Acceptance Criteria Quality: 4/5
  Evidence: 15 ACs covering GET resolution, tier sources, site override, user override, 404, 400, PUT create/update, invalid keys, partial PUT, header usage. AC-14 (DocType in README) is process not functional. Each has a test method. Missing null/removal semantics for user overrides.
TOTAL: 21/25
Notable strength: The child table design (SM Notification Preference Item) is a legitimate alternative architecture with per-row event/channel storage, showing the model considered structured data options.
Notable failure: Child table approach adds bench migrate complexity for new events/channels, contradicting the size-S story constraint.

---

## MODEL: model-zeta | TEST: 02 | RUN: C
Completeness of Sections: 3/5
  Evidence: Output is primarily Python code with docstring spec comments. Has constants, Pydantic models, helper functions, both endpoints, DocType definition in comments. Missing formal sections: no structured Acceptance Criteria, no Test section, no Platform Gates, no Out of Scope as standalone sections. Code is truncated at the end.
Test Specificity: 0/5
  Evidence: No test section, no test code, no test descriptions. Pure implementation code, and the code is truncated before completion.
API Specification Quality: 4/5
  Evidence: Both GET and PUT endpoints defined with Pydantic models. Response includes resolved_preferences and preference_sources as separate objects. Error handling for 404 and 400. Three-tier cascade implemented. But output is truncated and formal API docs are in code, not structured documentation.
Guardrail Compliance: 3/5
  Evidence: SM prefix on DocType. MAL routing implied. VALID_EVENTS and VALID_CHANNELS defined. But no Platform Gates, no explicit MAL-only statement, no CRM timeline discussion. DocType field is named "user" (Link to User) rather than "user_email" (Data) -- inconsistent with other models.
Acceptance Criteria Quality: 0/5
  Evidence: No acceptance criteria of any kind. Code is truncated before any could appear.
TOTAL: 10/25
Notable strength: The _resolve_preferences function with separate resolved/sources tuple return is clean architecture.
Notable failure: Output is truncated code with no spec structure. No acceptance criteria, no tests, no formal documentation.

---

## MODEL: model-alpha | TEST: 02 SUMMARY
Run A: 15 | Run B: 23 | Run C: 11
Mean: 16.3 | Range: 12 | Consistency: Low

Consistency narrative: Dramatic variance across runs. Run B (claim state query -- simpler scope) produced a strong spec. Run A and Run C degraded significantly, with Run C delivering code instead of a spec document. The model appears to struggle with scope management on feature-rich stories.
Dominant strength: When the scope is constrained (Run B), produces thorough edge case analysis and well-structured API contracts.
Dominant weakness: Delivers implementation code instead of specification documents on complex prompts, and omits test sections entirely.
Prompt engineering note: Add: "Your output MUST be a markdown specification document, NOT Python code. You must include sections titled 'Acceptance Criteria' and 'Test Plan' with numbered, independently verifiable items."

---

## MODEL: model-beta | TEST: 02 SUMMARY
Run A: 25 | Run B: 25 | Run C: 25
Mean: 25.0 | Range: 0 | Consistency: High

Consistency narrative: Perfect scores across all three runs with zero variance. Consistently produces exceptionally complete specs with all required sections, detailed test plans, precise API contracts, thorough guardrail compliance, and independently verifiable acceptance criteria regardless of story complexity.
Dominant strength: Comprehensive spec structure with every section present and substantive. Test plans combine unit and integration tests. Deep platform awareness (Frappe child tables, MAL process separation, merge semantics).
Dominant weakness: None observed.
Prompt engineering note: None needed. This model consistently produces production-quality specs.

---

## MODEL: model-gamma | TEST: 02 SUMMARY
Run A: 2 | Run B: 18 | Run C: 25
Mean: 15.0 | Range: 23 | Consistency: Low

Consistency narrative: Extreme variance. Run A produced the wrong deliverable entirely (story decomposition instead of story spec). Run B was adequate. Run C was exceptional. The model's quality appears inversely correlated with story simplicity -- it performed best on the most complex prompt (Run C) and worst on the simplest (Run A).
Dominant strength: On complex multi-system stories, produces exhaustive specifications with detailed test matrices and sophisticated design choices (null semantics, CRM activity logging).
Dominant weakness: May misinterpret the task entirely on simpler prompts, producing the wrong deliverable type.
Prompt engineering note: Add: "Your output MUST be a single story spec for story ID [X]. Do NOT produce a story decomposition, dependency graph, or story list. Produce exactly one spec document for exactly one story."

---

## MODEL: model-delta | TEST: 02 SUMMARY
Run A: 24 | Run B: 24 | Run C: 20
Mean: 22.7 | Range: 4 | Consistency: Medium

Consistency narrative: Consistently strong across all runs with moderate variance. Run C scored lower because the model delivered code-with-spec-comments instead of a structured spec document (noted: model had reasoning loop issues and required re-prompting). Runs A and B demonstrate excellent spec quality with detailed implementation guidance.
Dominant strength: Exceptional scope containment -- "Notes for Implementing Agent" (Run A) and "Explicit Non-behaviours" (Run B) are unique differentiators that prevent implementing agents from going off-track. Platform Gates are always thoroughly answered.
Dominant weakness: Tends toward code output rather than pure spec documents, especially under duress. Manual tests only -- no pytest unit test code.
Prompt engineering note: Add: "Output format MUST be structured markdown with headers, not Python code with embedded comments. Include a 'Unit Tests' subsection with pytest function signatures."

---

## MODEL: model-epsilon | TEST: 02 SUMMARY
Run A: 18 | Run B: 19 | Run C: 21
Mean: 19.3 | Range: 3 | Consistency: Medium

Consistency narrative: Consistent mid-range performance with low variance. All runs pass the threshold. The model reliably produces complete specs but has recurring weaknesses: scope creep (Run A adds duplicate detection), questionable design choices (Run B returns 422 for unknown state), and no pytest code in test sections.
Dominant strength: Structured document output with all required sections. Reasonable API specification quality across all runs.
Dominant weakness: Test sections describe what to test but never provide implementable test code. Scope creep on feature-rich stories.
Prompt engineering note: Add: "Do NOT add features, error codes, or behaviors not described in the story brief. If you believe something is missing, flag it in an 'Open Questions' section rather than implementing it. Include pytest code in the test section."

---

## MODEL: model-zeta | TEST: 02 SUMMARY
Run A: 16 | Run B: 19 | Run C: 10
Mean: 15.0 | Range: 9 | Consistency: Low

Consistency narrative: Declining quality as story complexity increases. Run B (constrained scope) was adequate. Run A was borderline. Run C delivered truncated code with no spec structure. The model tends toward implementation output rather than specification documents.
Dominant strength: Clean API specification quality on mid-complexity stories. Dependencies checklists are a practical touch.
Dominant weakness: Delivers code instead of specs on complex prompts. Output truncation on the longest story. No test sections in any run.
Prompt engineering note: Add: "Output a MARKDOWN SPECIFICATION DOCUMENT, not Python code. Include a mandatory 'Tests' section with pytest function signatures and a mandatory 'Acceptance Criteria' section with numbered criteria. Do not truncate your output."

---

# FINAL LEADERBOARD

| Model | Run A | Run B | Run C | Mean | Range | Consistency |
|-------|-------|-------|-------|------|-------|-------------|
| model-beta | 25 | 25 | 25 | **25.0** | 0 | High |
| model-delta | 24 | 24 | 20 | **22.7** | 4 | Medium |
| model-epsilon | 18 | 19 | 21 | **19.3** | 3 | Medium |
| model-alpha | 15 | 23 | 11 | **16.3** | 12 | Low |
| model-gamma | 2 | 18 | 25 | **15.0** | 23 | Low |
| model-zeta | 16 | 19 | 10 | **15.0** | 9 | Low |

**Pass threshold (18/25):**
- model-beta: PASS all 3 runs
- model-delta: PASS all 3 runs
- model-epsilon: PASS all 3 runs
- model-alpha: PASS 1 of 3 runs (Run B only)
- model-gamma: PASS 2 of 3 runs (Run B, Run C)
- model-zeta: PASS 1 of 3 runs (Run B only)
