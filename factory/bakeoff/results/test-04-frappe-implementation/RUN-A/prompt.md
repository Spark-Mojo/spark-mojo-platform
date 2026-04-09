PROMPT
model: model-epsilon
test: 04-frappe-implementation
run: A
date: 2026-04-09

```
You are the Story Builder for the Spark Mojo build factory.
Implement the following story spec exactly as described. No improvisation. If anything is unclear, write a comment explaining what you assumed.
STORY: CRM-VOCAB-001
TITLE: Vocabulary resolution endpoint
CATEGORY: BACKEND
SIZE: XS
WHAT TO BUILD: Add a single GET endpoint to the abstraction layer at:
GET /api/modules/desktop/vocabulary
This endpoint reads the current site's vocabulary configuration and returns the resolved vocabulary dictionary. The vocabulary maps 18 platform concept keys (e.g., "person", "service_record", "invoice") to their display labels for this site.
ARCHITECTURE CONSTRAINTS:
* This endpoint lives in: abstraction-layer/routes/desktop.py (new file)
* Register it in: abstraction-layer/main.py (modify)
* The endpoint is called by the React frontend on app load via useSiteConfig hook
* The SM Site Registry DocType (sm_site_registry in sm_widgets app) has a config_json field (Long Text, valid JSON) that may contain a "vocabulary" section with overrides
* Platform defaults are a Python dict in the same file
* The 4-tier cascade: platform defaults -> vertical template YAML (skip for now, not yet implemented) -> client overrides in config_json -> skip user tier (not applicable for vocabulary)
* The site name comes from the request header: X-Frappe-Site-Name
* No custom DocType needed for this story
FILES TO CREATE OR MODIFY:
* CREATE: abstraction-layer/routes/desktop.py
* MODIFY: abstraction-layer/main.py
DETAILED SPECIFICATION:
Request: GET /api/modules/desktop/vocabulary
Header: X-Frappe-Site-Name: {site_name}
Response (200):
{
  "vocabulary": {
    "person": "Client",
    "service_record": "Session",
    "service_provider": "Clinician",
    "lead_inquiry": "Referral",
    "intake_process": "Intake",
    "schedule_entry": "Appointment",
    "invoice": "Patient Statement",
    "task": "Task",
    "task_board": "Workboard",
    "task_template": "Protocol",
    "workflow_state": "Status",
    "workflow_transition": "Action",
    "workflow": "Process",
    "approval_chain": "Manager Approval",
    "time_period": "Session",
    "compliance_item": "License",
    "primary_identifier": "NPI",
    "billing_trigger": "Session Completion"
  }
}
(above is an example for behavioral health; actual values depend on site config)
Response (400): {"error": "site_name header missing"}
Response (404): {"error": "site not found", "site": "{site_name}"}
TESTS:
* test_vocabulary_returns_platform_defaults_when_no_overrides() -> site with empty config_json returns platform defaults for all 18 keys
* test_vocabulary_applies_client_overrides() -> site with vocabulary overrides in config_json returns merged result
* test_vocabulary_missing_site_header_returns_400()
* test_vocabulary_unknown_site_returns_404()
* test_vocabulary_malformed_config_json_returns_defaults() -> site with invalid JSON in config_json does not crash; returns defaults
ACCEPTANCE CRITERIA:
1. GET /api/modules/desktop/vocabulary returns 200 with all 18 keys for a valid site
2. Client overrides in config_json.vocabulary supersede platform defaults
3. Missing site header returns 400
4. Unknown site name returns 404
5. Malformed config_json does not cause a 500; returns platform defaults
6. All 5 tests pass
7. New file uses the same import and routing pattern as billing.py
Write the implementation. Write the tests. Do not write anything else.
```
