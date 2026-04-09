PROMPT
test: 04-frappe-implementation
run: C
date: 2026-04-09

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
