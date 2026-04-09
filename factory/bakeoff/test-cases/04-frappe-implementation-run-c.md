# Test 04: Frappe Code Implementation — Run C (Site Feature Flags Endpoint)

**Task type:** Backend code implementation
**Evaluates:** Can the model write a clean two-tier configuration cascade endpoint with proper error handling?

**This is Run C. Simpler than Runs A and B. Tests whether the model implements the cascade correctly and handles all edge cases cleanly.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- `abstraction-layer/routes/billing.py` (pattern reference)

---

## Prompt (give this to the model, nothing else)
```
You are the Story Builder for the Spark Mojo build factory. Implement the following story spec exactly as described. No improvisation. If anything is unclear, write a comment.
STORY: FEATURE-FLAG-001 TITLE: Site feature flags endpoint CATEGORY: BACKEND SIZE: XS DEPENDENCIES: None
WHAT TO BUILD: A GET endpoint that returns which platform features are enabled for a given site.
ARCHITECTURE CONSTRAINTS:
* Endpoint lives in: abstraction-layer/routes/admin.py (new file)
* Register in: abstraction-layer/main.py (modify)
* React calls /api/modules/admin/features/{subdomain}. React never calls Frappe directly.
* Site config is stored in SM Site Registry DocType (field: config_json, Long Text, valid JSON)
* The site name comes from the URL path parameter {subdomain}
FILES TO CREATE OR MODIFY:
* CREATE: abstraction-layer/routes/admin.py
* MODIFY: abstraction-layer/main.py
DETAILED SPECIFICATION: Request: GET /api/modules/admin/features/{subdomain}
Platform defaults (all False): billing_mojo, scheduling_mojo, workboard_mojo, wiki_mojo, crm_mojo, patient_portal
The SM Site Registry config_json may have a "features" key with boolean overrides. Site overrides supersede platform defaults. Unknown keys in config_json features are ignored.
Response (200): { "subdomain": "{subdomain}", "features": { "billing_mojo": true, "scheduling_mojo": false, "workboard_mojo": true, "wiki_mojo": false, "crm_mojo": false, "patient_portal": false } }
Response (404): { "error": "site not found", "subdomain": "{subdomain}" }
TESTS:
* test_returns_all_6_feature_keys_with_defaults_when_no_config()
* test_site_config_overrides_applied_correctly()
* test_unknown_feature_keys_in_config_json_are_ignored()
* test_subdomain_not_found_returns_404()
* test_malformed_features_config_json_returns_defaults()
ACCEPTANCE CRITERIA:
1. GET /api/modules/admin/features/{subdomain} returns 200 with all 6 feature keys
2. Site config_json.features overrides supersede platform defaults
3. Unknown feature keys in config_json are silently ignored
4. Unknown subdomain returns 404
5. Malformed config_json does not cause a 500; returns platform defaults
6. All 5 tests pass
7. New file uses same import and routing patterns as existing MAL endpoints
Write the implementation and tests. Nothing else.
```

---

## Scoring Rubric

### Category A: Correctness (0-5)
- 5: Code runs; all 5 tests pass; cascade correctly merges platform defaults with site overrides; unknown keys ignored; malformed JSON handled gracefully
- 4: Mostly correct; 1 minor bug
- 3: Logic correct but 1-2 implementation errors
- 2: Fundamental cascade logic error
- 1: Code does not run or is wrong

### Category B: Convention Compliance (0-5)
- 5: File structure, imports, routing match existing MAL patterns; main.py correctly modified to register the new router; no hardcoded values outside the defaults dict
- 4: Mostly compliant; 1 deviation
- 3: Generally follows conventions with deviations
- 2: Ignores existing patterns
- 1: Incompatible

### Category C: Test Quality (0-5)
- 5: All 5 tests present; each tests distinct behavior; malformed JSON test verifies fallback not 500; unknown-keys test verifies they are stripped from response
- 4: 4/5 present; all good
- 3: 3/5 present or tests are shallow
- 2: Tests would not catch bugs
- 1: No tests

### Category D: Error Handling (0-5)
- 5: 404 handled; malformed config_json fallback implemented (try/except around JSON parse); no unhandled exceptions for any of the 5 test scenarios
- 4: 2/3 error conditions handled
- 3: 1/3 handled
- 2: Error handling present but wrong
- 1: No error handling

### Category E: Scope Discipline (0-5)
- 5: Creates exactly 1 new file and modifies exactly 1 existing file; 6 exact feature keys defined; no added complexity; response schema matches spec exactly
- 4: One minor deviation
- 3: Added or removed features
- 2: Significant deviation
- 1: Built something different

**Maximum score: 25**
**Pass threshold: 18/25**
