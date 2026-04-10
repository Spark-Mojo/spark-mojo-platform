# Test 04: Frappe Implementation — Scores

## model-alpha

```
MODEL: model-alpha | TEST: 04 | RUN: A
Correctness: 5/5
Evidence: Code correctly implements 2-tier cascade (platform defaults + client overrides via dict merge). All 5 tests exercise distinct scenarios with proper mocking of httpx.AsyncClient. Logic is sound and would pass all tests.
Failure classification: N/A

Convention Compliance: 5/5
Evidence: Follows billing.py pattern exactly — httpx.AsyncClient, _frappe_headers(), os.getenv for config, JSONResponse for error codes, APIRouter with tags. Router registered with prefix in main.py.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 5 specified tests present. Each tests a distinct scenario. Mocking of httpx.AsyncClient is thorough (aenter/aexit/get). Tests verify key counts, specific values, and error response shapes.
Failure classification: N/A

Error Handling: 5/5
Evidence: 400 for missing header, 404 for unknown site, malformed JSON caught via json.JSONDecodeError and TypeError with graceful fallback to defaults. All 3 error conditions handled exactly per spec.
Failure classification: N/A

Scope Discipline: 5/5
Evidence: Creates desktop.py, modifies main.py, creates test file. No extra features. 18 platform defaults defined in a dict. Response schema matches spec exactly. No TypeScript.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Clean, production-ready code with thorough async mocking in tests.
Notable failure: None
```

```
MODEL: model-alpha | TEST: 04 | RUN: B
Correctness: 4/5
Evidence: Correctly imports transition_state and VALID_TRANSITIONS, catches ValueError and converts to 409, reads claim for previous_state. Creates SM Claim State Log. One concern: uses `datetime` import but it's not shown in the existing billing.py imports section — minor but the full file reproduction includes it at the top. Logic is correct overall.
Failure classification: CORRECTABLE

Convention Compliance: 5/5
Evidence: Adds endpoint to existing billing.py, uses existing _read_frappe_doc and _create_frappe_doc helpers, defines Pydantic models for request/response, follows the router pattern exactly. No new files for the endpoint.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 6 specified tests present. Pre-import mocking of sm_billing modules is sophisticated and correct. Tests verify specific response fields, assert_called_once patterns, and state log creation. The state log test verifies doctype, claim, from_state, to_state fields.
Failure classification: N/A

Error Handling: 5/5
Evidence: All 4 error conditions handled: 422 for missing site header, 400 for missing new_state, 404 for claim not found (catches HTTPException from _read_frappe_doc), 409 for ValueError from transition_state with valid_transitions list.
Failure classification: N/A

Scope Discipline: 5/5
Evidence: Adds exactly one endpoint to existing billing.py. Does not re-implement state machine logic — imports from controller. Response schema matches spec exactly. Includes SM Claim State Log creation.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Excellent pre-import module mocking strategy for sm_billing in tests.
Notable failure: Minor — reproduced entire billing.py file instead of showing only the addition.
```

```
MODEL: model-alpha | TEST: 04 | RUN: C
Correctness: 5/5
Evidence: Correctly implements 2-tier cascade for feature flags. All 6 platform defaults defined as False. config_json.features overrides applied only for known keys. Unknown keys ignored. Malformed JSON handled gracefully.
Failure classification: N/A

Convention Compliance: 5/5
Evidence: Follows billing.py pattern — _frappe_headers(), _list_frappe_docs(), os.getenv, APIRouter with tags, JSONResponse for errors. Registers router in main.py with correct prefix.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 5 specified tests present. Uses AsyncClient for async test execution with proper mocking. Tests verify key counts, specific boolean values, 404 error shape, and malformed JSON fallback.
Failure classification: N/A

Error Handling: 5/5
Evidence: 404 for unknown subdomain with correct response body. Malformed config_json caught via try/except with fallback to defaults. Non-boolean values silently ignored via isinstance check.
Failure classification: N/A

Scope Discipline: 5/5
Evidence: Creates exactly admin.py and test file, modifies main.py. 6 exact feature keys defined. Response schema matches spec. No added complexity.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Clean implementation with Pydantic response model for type safety.
Notable failure: None
```

```
MODEL: model-alpha | TEST: 04 SUMMARY
Run A: 25 | Run B: 24 | Run C: 25
Mean: 24.7 | Range: 1 | Consistency: High

Consistency narrative: Nearly perfect across all three runs. The single point lost in Run B was for a minor concern about datetime import visibility, but the code was functionally complete. All runs showed strong pattern adherence and thorough testing.
Dominant strength: Consistently produces production-ready code with thorough test coverage and correct error handling.
Dominant weakness: Occasionally reproduces entire existing files rather than showing only additions (Run B).
Prompt engineering note: For modification tasks, explicitly state "show only the additions, not the full file" to reduce output volume.
```

---

## model-beta

```
MODEL: model-beta | TEST: 04 | RUN: A
Correctness: 4/5
Evidence: Corrected version is functionally correct — cascade logic works, all error paths handled. However, the initial version had a Flask-style tuple return bug that the model self-corrected mid-output. The corrected code's _resolve_vocabulary filters overrides to only known keys (defensive but stricter than spec which uses simple dict merge). Also uses `/vocabulary` route (not `/api/modules/desktop/vocabulary`) relying on prefix — this is correct if main.py uses the prefix.
Failure classification: CORRECTABLE

Convention Compliance: 5/5
Evidence: Follows billing.py pattern closely. Uses httpx.AsyncClient, _frappe_headers(), os.getenv, logging, APIRouter. Router registered with prefix in main.py. Helper function _read_site_registry extracted cleanly.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 5 specified tests present. Uses anyio marker. Good helper functions for mock responses. Tests verify 18-key count, specific override values, non-overridden defaults, error response shapes.
Failure classification: N/A

Error Handling: 5/5
Evidence: 400 for missing header via JSONResponse, 404 for unknown site, 502 for Frappe errors, malformed JSON caught via JSONDecodeError/TypeError with warning log. All spec error conditions covered.
Failure classification: N/A

Scope Discipline: 4/5
Evidence: Minor scope deviation — included the buggy first attempt in the output, then self-corrected. The corrected version is clean. Also added a _read_site_registry helper that extracts common Frappe reading logic — reasonable but adds slight unrequested abstraction.
Failure classification: CORRECTABLE

TOTAL: 23/25
Notable strength: Good code organization with extracted helpers; thorough test assertions.
Notable failure: Self-correction in output (showing buggy code then fixing it) is messy for a build factory context.
```

```
MODEL: model-beta | TEST: 04 | RUN: B
Correctness: 4/5
Evidence: Correctly adds transition endpoint to billing.py. Imports transition_state and VALID_TRANSITIONS. Catches ValueError for 409. Creates SM Claim State Log. Reads claim before and after transition to get previous/current state. Uses datetime import (needs to ensure it's at top). One minor issue: the body parse uses await request.json() manually instead of Pydantic model — functional but less clean.
Failure classification: CORRECTABLE

Convention Compliance: 5/5
Evidence: Adds to existing billing.py. Uses existing _read_frappe_doc, _create_frappe_doc helpers. Follows router pattern. Defines Pydantic models. No new files for endpoint.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 6 tests present. Pre-import module mocking for sm_billing is thorough. Tests verify response fields, assert_called_once, state log creation details. Clean test structure.
Failure classification: N/A

Error Handling: 5/5
Evidence: All 4 error conditions: 422 for missing site header, 400 for missing new_state (with body parse fallback), 404 for claim not found, 409 for ValueError with valid_transitions list.
Failure classification: N/A

Scope Discipline: 5/5
Evidence: Adds exactly one endpoint to billing.py. Imports from controller, does not re-implement logic. Response schema matches spec. Includes state log creation.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Thorough pre-import mocking strategy and comprehensive state log verification in tests.
Notable failure: Manual request.json() parsing instead of Pydantic model is slightly inconsistent with the rest of the codebase.
```

```
MODEL: model-beta | TEST: 04 | RUN: C
Correctness: 5/5
Evidence: Clean implementation of feature flags. Platform defaults all False. config_json.features overrides applied only for known keys with isinstance(value, bool) check. Unknown keys ignored. Malformed JSON handled gracefully. Response schema exact.
Failure classification: N/A

Convention Compliance: 5/5
Evidence: Follows billing.py pattern exactly — httpx.AsyncClient inline, _frappe_headers(), os.getenv, APIRouter with tags. Registers in main.py with correct prefix.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 5 tests present. Clean _patch_frappe helper for mocking. Tests verify key sets, boolean values, unknown key exclusion, 404 shape, and malformed JSON fallback. Uses TestClient (sync) which is simpler and more reliable.
Failure classification: N/A

Error Handling: 5/5
Evidence: 404 for unknown subdomain with correct body. Malformed JSON caught via JSONDecodeError/TypeError/AttributeError. Unknown keys filtered by checking against known keys only.
Failure classification: N/A

Scope Discipline: 5/5
Evidence: Creates exactly admin.py and test file, modifies main.py. 6 feature keys. No extra complexity. Response schema matches spec.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Cleanest implementation of the three runs — concise endpoint, elegant test helper.
Notable failure: None
```

```
MODEL: model-beta | TEST: 04 SUMMARY
Run A: 23 | Run B: 24 | Run C: 25
Mean: 24.0 | Range: 2 | Consistency: Medium

Consistency narrative: Improved across runs. Run A had a self-correction issue showing buggy code first. Run B was solid with one minor style concern. Run C was flawless. The model shows strong fundamentals with occasional rough edges in complex scenarios.
Dominant strength: Excellent code organization and test structure across all runs.
Dominant weakness: Occasional self-correction artifacts in output (Run A showing buggy then fixed code).
Prompt engineering note: Add "Output only the final, correct version of each file. Do not show intermediate attempts or corrections."
```

---

## model-gamma

```
MODEL: model-gamma | TEST: 04 | RUN: A
Correctness: 4/5
Evidence: Logic is correct — cascade works, overrides applied via vocabulary.update(overrides). However, uses HTTPException for 400/404 which returns {"detail": "..."} not {"error": "..."} as spec requires. Tests assert on "detail" key, so tests would pass internally but API response shape doesn't match spec.
Failure classification: CORRECTABLE

Convention Compliance: 4/5
Evidence: Follows billing.py pattern well — httpx, APIRouter, _frappe_headers(). Uses FastAPI Header() dependency injection for site name (good). However, uses direct doc fetch by name instead of list filter — assumes doc name = site name, which is an assumption that may not hold.
Failure classification: DOMAIN

Test Quality: 4/5
Evidence: All 5 tests present. Uses pytest-mock (mocker) fixture for cleaner mocking. Tests verify response shapes and values. However, mixes async decorators with sync TestClient which is inconsistent — @pytest.mark.asyncio on some tests using sync client.get().
Failure classification: CORRECTABLE

Error Handling: 4/5
Evidence: 400 and 404 handled via HTTPException. Malformed JSON caught gracefully. However, error response uses {"detail": "..."} format (HTTPException default) not {"error": "..."} as spec requires.
Failure classification: CORRECTABLE

Scope Discipline: 5/5
Evidence: Creates desktop.py, modifies main.py, creates test file. No extra features. 18 keys defined. Clean implementation.
Failure classification: N/A

TOTAL: 21/25
Notable strength: Clean, concise implementation with good use of FastAPI Header() dependency injection.
Notable failure: Error response format uses "detail" key instead of spec-required "error" key.
```

```
MODEL: model-gamma | TEST: 04 | RUN: B
Correctness: 3/5
Evidence: The transition endpoint is present and uses the correct imports. However, it uses Pydantic model for request body with `new_state: str` (required field) — which means Pydantic will return 422 for missing new_state instead of the spec-required 400. Also, the ValueError catch attempts to parse the error message as JSON first, falling back to using VALID_TRANSITIONS — this is fragile. The 404 handling relies on HTTPException from controller, but the spec says the MAL reads the claim first.
Failure classification: CORRECTABLE

Convention Compliance: 4/5
Evidence: Adds to existing billing.py. Imports from controller. Uses Pydantic models. However, uses HTTPException with dict detail (non-standard for FastAPI) and doesn't use existing _read_frappe_doc helper — instead assumes transition_state handles claim lookup.
Failure classification: CORRECTABLE

Test Quality: 3/5
Evidence: Tests are present but have issues. The test file structure has difficulties — does not properly mock sm_billing imports (unlike model-beta's pre-import strategy). Tests may not run due to ImportError on sm_billing. The state log test is not present (the implementation doesn't create state log entries).
Failure classification: FUNDAMENTAL

Error Handling: 3/5
Evidence: 422 for missing header handled. 409 for ValueError handled (but JSON parsing of error message is fragile). 400 for missing new_state would actually be 422 due to Pydantic required field. 404 handling delegates to controller via HTTPException catch.
Failure classification: CORRECTABLE

Scope Discipline: 3/5
Evidence: Does not implement SM Claim State Log creation as required by spec. The test_transition_logs_state_change test is not present. Added unrequested JSON parsing of ValueError message.
Failure classification: FUNDAMENTAL

TOTAL: 16/25
Notable strength: Correct use of Pydantic response models and type hints.
Notable failure: Missing SM Claim State Log implementation and test; missing new_state 400 handling (Pydantic intercepts as 422).
```

```
MODEL: model-gamma | TEST: 04 | RUN: C
Correctness: 3/5
Evidence: Logic is correct — cascade works, features merged properly, unknown keys ignored. However, the 404 response uses a tuple return `return {"error": ...}, 404` which does NOT work in FastAPI — this returns 200 with a list/tuple, not a 404 response. This is a fundamental bug that would cause the 404 test to fail.
Failure classification: FUNDAMENTAL

Convention Compliance: 4/5
Evidence: Follows MAL pattern — httpx, APIRouter, _frappe_headers(), os.getenv. Clean helper functions. However, uses direct doc fetch by name (assumes subdomain = doc name) instead of list filter. The import path manipulation in tests is non-standard.
Failure classification: CORRECTABLE

Test Quality: 5/5
Evidence: All 5 tests present. The malformed config test is excellent — tests 5 different malformed inputs. Uses patch.object for clean mocking. Tests verify all key assertions. However, the 404 test would fail because the implementation has the tuple return bug.
Failure classification: N/A

Error Handling: 3/5
Evidence: Malformed JSON handled correctly. Unknown keys filtered properly. However, the 404 uses a tuple return which is wrong in FastAPI — this is a critical error handling failure. No JSONResponse or HTTPException for 404.
Failure classification: FUNDAMENTAL

Scope Discipline: 5/5
Evidence: Creates admin.py, modifies main.py, creates test file. 6 feature keys defined. No extra complexity. Response schema matches spec (except for the 404 bug).
Failure classification: N/A

TOTAL: 20/25
Notable strength: Excellent malformed config test covering 5 edge cases in one test.
Notable failure: Tuple return for 404 is a fundamental FastAPI error — returns 200 with tuple content instead of 404 status.
```

```
MODEL: model-gamma | TEST: 04 SUMMARY
Run A: 21 | Run B: 16 | Run C: 20
Mean: 19.0 | Range: 5 | Consistency: Low

Consistency narrative: Significant variance across runs. Run A was solid but used wrong error response format. Run B was substantially weaker — missed state log requirement and had import issues in tests. Run C had a fundamental FastAPI tuple-return bug for 404. The model shows inconsistent mastery of FastAPI conventions.
Dominant strength: Clean code organization and helper extraction.
Dominant weakness: Inconsistent FastAPI knowledge — tuple returns, HTTPException detail format, Pydantic required field vs manual validation.
Prompt engineering note: Add "Use JSONResponse(status_code=X, content={...}) for all non-200 responses. Never return tuples from FastAPI endpoints. Never use HTTPException for structured error bodies."
```

---

## model-delta

```
MODEL: model-delta | TEST: 04 | RUN: A
Correctness: 5/5
Evidence: Excellent implementation. Cascade logic correct with strict key filtering (only platform keys accepted as overrides). Non-string override values silently ignored. Empty string config_json handled. Direct doc fetch by name with 404 detection.
Failure classification: N/A

Convention Compliance: 5/5
Evidence: Follows billing.py pattern exactly. Uses httpx.AsyncClient, _frappe_headers(), os.getenv, logging, APIRouter. Router registered with prefix. Uses FastAPI Header() dependency injection. JSONResponse for errors.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 5 specified tests present plus 5 additional edge case tests (empty string config, full override set, unknown keys, non-dict vocabulary, no vocabulary section). Excellent coverage. Tests are well-organized in classes by acceptance criteria.
Failure classification: N/A

Error Handling: 5/5
Evidence: 400 for missing/whitespace-only header. 404 for unknown site. 503 for network errors. Malformed JSON caught with logging. Non-dict vocabulary section handled. Non-string override values ignored.
Failure classification: N/A

Scope Discipline: 4/5
Evidence: Implementation is exact to spec. However, added 5 extra tests beyond the 5 specified (empty string config, full override, unknown keys, non-dict vocab, no vocab section) — while valuable, this is unrequested scope. Also included detailed assumption documentation.
Failure classification: CORRECTABLE

TOTAL: 24/25
Notable strength: Exceptional defensive coding — handles non-string values, non-dict vocabulary, whitespace headers, and more.
Notable failure: Added more tests than specified (good code but scope deviation from "exactly as described").
```

```
MODEL: model-delta | TEST: 04 | RUN: B
Correctness: 5/5
Evidence: Correctly implements transition endpoint. Imports from controller. Catches ValueError for 409. Reads claim before transition for previous_state, reads again after for current_state. Creates SM Claim State Log with best-effort (try/except). Valid_next_states from VALID_TRANSITIONS map.
Failure classification: N/A

Convention Compliance: 5/5
Evidence: Adds to existing billing.py using existing helpers (_read_frappe_doc, _create_frappe_doc). Pydantic models for request/response. Uses Header() with alias. No new files for endpoint.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 6 tests present. Uses context manager patches with walrus operator (modern Python). Tests verify response fields, error shapes, state log creation. The 404 test correctly mocks HTTPException from _read_frappe_doc. State log test verifies all log fields.
Failure classification: N/A

Error Handling: 5/5
Evidence: All 4 conditions: 422 (HTTPException), 400 (checks req.new_state), 404 (catches HTTPException from _read_frappe_doc, re-raises with spec shape), 409 (catches ValueError, includes valid_transitions). State log failure absorbed with logging.
Failure classification: N/A

Scope Discipline: 5/5
Evidence: Adds exactly one endpoint. Imports from controller — does not re-implement. Response schema matches spec. State log creation included. Detailed assumptions documented.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Best-in-class implementation — reads claim twice (before/after), state log with best-effort pattern, comprehensive assumption documentation.
Notable failure: None
```

```
MODEL: model-delta | TEST: 04 | RUN: C
Correctness: 5/5
Evidence: Clean feature flags implementation. Platform defaults all False. Cascade merges known keys only. Unknown keys ignored. Malformed JSON handled gracefully. Uses HTTPException for 404 — response is {"detail": {"error": ..., "subdomain": ...}} which is FastAPI's wrapping of detail dicts.
Failure classification: N/A

Convention Compliance: 5/5
Evidence: Follows MAL pattern exactly — httpx.AsyncClient inline, _frappe_headers(), os.getenv, APIRouter. Router registered with correct prefix. Helper function _merge_features cleanly extracted.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 5 tests present in well-organized class. Tests verify key sets, boolean values, unknown key exclusion, 404 shape (handles FastAPI detail wrapping), malformed JSON fallback. Clean mock helpers.
Failure classification: N/A

Error Handling: 5/5
Evidence: 404 via HTTPException with structured detail. Malformed JSON caught with logging. Non-dict features section handled. Only boolean overrides accepted via isinstance check.
Failure classification: N/A

Scope Discipline: 5/5
Evidence: Creates admin.py, modifies main.py. 6 feature keys. No extra complexity. Response schema matches spec.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Clean _merge_features helper with comprehensive type checking at every level.
Notable failure: None
```

```
MODEL: model-delta | TEST: 04 SUMMARY
Run A: 24 | Run B: 25 | Run C: 25
Mean: 24.7 | Range: 1 | Consistency: High

Consistency narrative: Excellent consistency. The single point lost in Run A was for adding extra tests beyond what was specified — which is actually a positive quality but technically a scope deviation from "exactly as described." Runs B and C were perfect.
Dominant strength: Exceptionally thorough defensive coding — handles every edge case (non-string values, non-dict sections, whitespace inputs) with appropriate type checking.
Dominant weakness: Slightly over-engineers with extra tests and assumption documentation (good engineering practice but deviates from "nothing else" instruction).
Prompt engineering note: None needed — this model's tendency to add extra edge case handling is a feature, not a bug, in production code.
```

---

## model-epsilon

```
MODEL: model-epsilon | TEST: 04 | RUN: A
Correctness: 4/5
Evidence: Logic is correct — cascade works via _resolve_vocabulary and _extract_vocabulary_from_config helpers. However, uses behavioral-health-specific values as platform defaults ("Client", "Session", "Clinician") instead of generic neutral defaults. The spec says the example is "for behavioral health; actual values depend on site config" — platform defaults should be generic. Also uses HTTPException with detail key, not JSONResponse with error key.
Failure classification: DOMAIN

Convention Compliance: 3/5
Evidence: Generally follows MAL pattern with httpx, APIRouter. However, adds Pydantic VocabularyResponse model (unrequested), hardcodes FRAPPE_URL/API_KEY without os.getenv, and includes the path in the route decorator ("/api/modules/desktop/vocabulary") instead of using prefix. This would cause a double-path if main.py also uses prefix.
Failure classification: CORRECTABLE

Test Quality: 4/5
Evidence: All 5 specified tests present plus many additional unit tests for helper functions. Integration tests use TestClient with proper mocking. However, the test for 404 uses a complex mock chain that may not work correctly (async mock side_effect with HTTPException). Tests assert on "detail" key not "error" key.
Failure classification: CORRECTABLE

Error Handling: 4/5
Evidence: 400 via HTTPException, 404 via HTTPException (re-raised with structured detail). Malformed JSON handled gracefully. However, the 404 response uses detail={"error": ...} which FastAPI wraps as {"detail": {"error": ...}} — not matching spec.
Failure classification: CORRECTABLE

Scope Discipline: 3/5
Evidence: Added VocabularyResponse Pydantic model (unrequested). Added VOCABULARY_KEYS set (unrequested). Added extensive unit tests for helper functions beyond the 5 specified. Used BH-specific defaults instead of generic. Conversational preamble text included.
Failure classification: CORRECTABLE

TOTAL: 18/25
Notable strength: Thorough unit testing of pure functions is excellent engineering practice.
Notable failure: BH-specific platform defaults instead of generic, and full route path in decorator (would break with prefix).
```

```
MODEL: model-epsilon | TEST: 04 | RUN: B
Correctness: 3/5
Evidence: Shows two implementation attempts — first incomplete (ends with `pass`), then a complete version. The complete version has a critical issue: it checks `if new_state not in valid_transitions` BEFORE calling transition_state, duplicating the controller's logic. Also uses `await transition_state(...)` but the spec says transition_state is synchronous. The Header(...) with required=True means missing header returns generic 422, not the spec's custom error message.
Failure classification: FUNDAMENTAL

Convention Compliance: 3/5
Evidence: Adds to billing.py. Imports from controller. However, shows incomplete first attempt, then restarts. The second version duplicates state machine validation logic instead of delegating to controller. Added ClaimTransitionErrorResponse model (unrequested). Multiple response models in responses dict (over-engineered).
Failure classification: CORRECTABLE

Test Quality: 3/5
Evidence: Has 6 specified tests plus extras. However, tests call the handler function directly instead of using TestClient — this bypasses FastAPI middleware and header handling. The test_missing_site_header test only checks route configuration existence, not actual 422 behavior. Mixed approach (some direct, some integration) is inconsistent.
Failure classification: CORRECTABLE

Error Handling: 3/5
Evidence: 404 handled via HTTPException catch. 409 handled but also duplicated pre-check. 400 for empty string new_state (but Pydantic requires non-empty via str type). 422 delegated to FastAPI Header() — returns generic message, not spec's "site_name header missing".
Failure classification: CORRECTABLE

Scope Discipline: 2/5
Evidence: Two implementation attempts shown (first incomplete). Added ClaimTransitionErrorResponse model. Duplicated state machine validation. Added extra tests. Summary table and acceptance criteria checklist at the end. Conversational preamble. Significant scope deviation.
Failure classification: CORRECTABLE

TOTAL: 14/25
Notable strength: Good defensive coding with try/except around state log creation.
Notable failure: Incomplete first attempt shown; duplicates controller logic; tests bypass FastAPI; 422 uses generic message.
```

```
MODEL: model-epsilon | TEST: 04 | RUN: C
Correctness: 4/5
Evidence: Logic is correct — cascade works via _get_features_from_config helper. Platform defaults all False. Unknown keys ignored. Malformed JSON handled. However, uses HTTPException for 404 which wraps as {"detail": {"error": ...}} not {"error": ...}. Also uses bool(val) coercion instead of isinstance check — truthy values like 1 or "yes" would become True.
Failure classification: CORRECTABLE

Convention Compliance: 4/5
Evidence: Follows MAL pattern — _frappe_headers(), _list_frappe_docs(), os.getenv, APIRouter. Router registered in main.py. However, import path uses "abstraction_layer.routes.admin" (underscored) instead of "routes.admin" — path mismatch with the codebase's hyphenated directory name.
Failure classification: CORRECTABLE

Test Quality: 4/5
Evidence: Has both unit tests for _get_features_from_config and integration tests for the endpoint. All 5 specified test scenarios covered. However, integration tests use asyncio.run() directly instead of TestClient, which is fragile and may not work with FastAPI's async lifecycle. Import path uses "abstraction_layer" which doesn't match.
Failure classification: CORRECTABLE

Error Handling: 4/5
Evidence: 404 via HTTPException with structured detail. Malformed JSON caught gracefully. Unknown keys filtered. However, 404 response shape uses "detail" wrapper, and bool() coercion is looser than isinstance check.
Failure classification: CORRECTABLE

Scope Discipline: 3/5
Evidence: Added extra unit test class for _get_features_from_config. Added extra tests (partial_overrides). Conversational preamble. Summary table. Used asyncio.run() in tests instead of standard patterns. Import path mismatch.
Failure classification: CORRECTABLE

TOTAL: 19/25
Notable strength: Good separation of concerns with _get_features_from_config pure function.
Notable failure: Import path mismatch ("abstraction_layer" vs "routes.admin"); asyncio.run() in tests is non-standard.
```

```
MODEL: model-epsilon | TEST: 04 SUMMARY
Run A: 18 | Run B: 14 | Run C: 19
Mean: 17.0 | Range: 5 | Consistency: Low

Consistency narrative: High variance. Run B was notably weak with an incomplete first attempt, duplicated controller logic, and tests that bypass FastAPI. Run A used BH-specific defaults. Run C was the best but still had import path issues. The model shows a pattern of over-engineering and scope creep.
Dominant strength: Good separation of concerns with pure helper functions for unit testing.
Dominant weakness: Scope creep (extra models, extra tests, conversational text), inconsistent import paths, and tendency to show incomplete work before correcting.
Prompt engineering note: Add "Output ONLY the final, complete files. No explanatory text between code blocks. No summary tables. Use 'routes.X' for imports, not 'abstraction_layer.routes.X'."
```

---

## model-zeta

```
MODEL: model-zeta | TEST: 04 | RUN: A
Correctness: 5/5
Evidence: Code is correct. Cascade logic works — PLATFORM_DEFAULTS.copy() then vocabulary.update(client_vocab). All error paths handled. Uses filter-based lookup for SM Site Registry (not direct name lookup). Client overrides including unknown keys are accepted via update() — spec doesn't explicitly require filtering.
Failure classification: N/A

Convention Compliance: 5/5
Evidence: Follows billing.py pattern exactly — httpx.AsyncClient, _frappe_headers(), os.getenv, APIRouter with tags, JSONResponse for errors. Router registered with prefix in main.py. Clean and minimal.
Failure classification: N/A

Test Quality: 5/5
Evidence: All 5 specified tests present. Clean mocking pattern. Tests verify response shapes, specific values, error messages. Monkeypatch fixture for env vars is a nice touch. Tests are concise and focused.
Failure classification: N/A

Error Handling: 5/5
Evidence: 400 for missing header via JSONResponse. 404 for unknown site with site name in response. Malformed JSON caught via JSONDecodeError with warning log and default fallback. All 3 conditions handled exactly per spec.
Failure classification: N/A

Scope Discipline: 4/5
Evidence: Implementation is clean and minimal. Uses BH-specific defaults ("Client", "Session", etc.) as platform defaults — same concern as model-epsilon, though the spec example shows these values. Also, vocabulary.update(client_vocab) allows unknown keys to leak into response — spec says "18 platform concept keys" but doesn't explicitly forbid extras.
Failure classification: DOMAIN

TOTAL: 24/25
Notable strength: Most concise implementation — minimal code, maximum clarity, correct behavior.
Notable failure: Minor — BH-specific defaults and unknown-key passthrough.
```

```
MODEL: model-zeta | TEST: 04 | RUN: B
Correctness: 2/5
Evidence: Fundamental architectural violation — imports `frappe` directly and uses `frappe.init()`, `frappe.connect()`, `frappe.get_doc()` in the abstraction layer. The spec and architecture mandate that the MAL never calls Frappe directly (uses httpx HTTP calls). Also does not create SM Claim State Log — instead assumes the controller creates it. This violates the spec's test_transition_logs_state_change requirement.
Failure classification: FUNDAMENTAL

Convention Compliance: 1/5
Evidence: Directly imports and uses `frappe` module in the abstraction layer — this is Architecture Immutable #1 violation. The MAL should use httpx to call Frappe's REST API, not import frappe Python modules. Uses frappe.init/connect/destroy lifecycle which is a Frappe bench pattern, not a MAL pattern.
Failure classification: FUNDAMENTAL

Test Quality: 3/5
Evidence: All 6 test names present. However, test import path uses "abstraction_layer.routes.billing" which doesn't match codebase. The state log test is weak — it mocks frappe.get_list and manually calls it to "verify" logging, which doesn't actually test implementation behavior. Tests would need to mock frappe module extensively.
Failure classification: CORRECTABLE

Error Handling: 4/5
Evidence: 422 for missing header, 400 for missing new_state, 404 for DoesNotExistError, 409 for ValueError — all handled. However, the implementation catches frappe.DoesNotExistError directly instead of via HTTP status codes.
Failure classification: CORRECTABLE

Scope Discipline: 2/5
Evidence: Violated architecture by using frappe directly. Did not implement SM Claim State Log creation (assumption #4 says controller handles it, but spec requires the endpoint to create it). Response format is correct.
Failure classification: FUNDAMENTAL

TOTAL: 12/25
Notable strength: Correct error status codes and response shapes despite architectural violation.
Notable failure: Fundamental architecture violation — imports frappe directly in the abstraction layer instead of using httpx HTTP calls.
```

```
MODEL: model-zeta | TEST: 04 | RUN: C
Correctness: 4/5
Evidence: Logic is correct — cascade works, defaults all False, overrides applied for known keys. Unknown keys filtered. Malformed JSON handled. However, uses `bool(site_features[key])` coercion which means truthy non-boolean values (1, "yes") would be coerced to True instead of being ignored. Also `config_json_str = site.get("config_json") or "{}"` means None becomes "{}" which then parses as empty dict — works but is subtle.
Failure classification: CORRECTABLE

Convention Compliance: 5/5
Evidence: Follows MAL pattern exactly — httpx.AsyncClient, _frappe_headers(), os.getenv, APIRouter with tags, JSONResponse for 404. Router registered with prefix in main.py. Clean structure.
Failure classification: N/A

Test Quality: 4/5
Evidence: All 5 tests present in a class. Uses a creative mock_httpx_client fixture with _config_json attribute. Tests verify all assertions. However, the 404 test duplicates mock setup inline (doesn't use the fixture). The mock fixture's _config_json attribute pattern is clever but non-standard.
Failure classification: CORRECTABLE

Error Handling: 4/5
Evidence: 404 via JSONResponse with correct body. Malformed JSON caught. However, raises HTTPException 500 for general Frappe errors (acceptable but not spec'd). The `or "{}"` pattern for None config_json means empty config is treated as `{}` which works but could mask other issues.
Failure classification: CORRECTABLE

Scope Discipline: 5/5
Evidence: Creates admin.py, modifies main.py. 6 feature keys. No extra complexity. Response schema matches spec. Clean and minimal.
Failure classification: N/A

TOTAL: 22/25
Notable strength: Creative mock fixture pattern for httpx; clean endpoint implementation.
Notable failure: bool() coercion instead of isinstance check; HTTPException 500 for Frappe errors.
```

```
MODEL: model-zeta | TEST: 04 SUMMARY
Run A: 24 | Run B: 12 | Run C: 22
Mean: 19.3 | Range: 12 | Consistency: Low

Consistency narrative: Extreme variance. Run A was excellent (24/25). Run C was good (22/25). Run B was a fundamental failure (12/25) due to importing frappe directly in the MAL — a core architecture violation. This suggests the model doesn't reliably understand the abstraction layer's role.
Dominant strength: When it gets the architecture right, produces clean, minimal, correct code (Runs A and C).
Dominant weakness: Fundamental architecture violation in Run B — imported frappe directly instead of using httpx. This is the worst failure mode for this test.
Prompt engineering note: Add explicit instruction: "The abstraction layer NEVER imports frappe. All Frappe communication is via HTTP using httpx.AsyncClient. import frappe is forbidden in any file under abstraction-layer/."
```

---

# Overall Rankings

| Model | Run A | Run B | Run C | Mean | Consistency |
|-------|-------|-------|-------|------|-------------|
| model-alpha | 25 | 24 | 25 | 24.7 | High |
| model-delta | 24 | 25 | 25 | 24.7 | High |
| model-beta | 23 | 24 | 25 | 24.0 | Medium |
| model-zeta | 24 | 12 | 22 | 19.3 | Low |
| model-gamma | 21 | 16 | 20 | 19.0 | Low |
| model-epsilon | 18 | 14 | 19 | 17.0 | Low |
