# Test 02: Spec Writing — Run C (User Notification Preferences Endpoint)

**Task type:** Specification writing
**Evaluates:** Can the model write a complete spec for a three-tier configuration cascade with GET and PUT endpoints?

**This is Run C. Run A covers a CRM contact create. Run B covers a claim state read. Run C introduces a PUT and a 3-tier cascade.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- `abstraction-layer/routes/billing.py` (pattern reference)

Do NOT provide any existing notification-related code.

---

## Prompt (give this to the model, nothing else)
```
You are the Spec Writer for the Spark Mojo build factory. Write a complete, self-contained story spec for the following story:
STORY ID: NOTIF-PREF-001 TITLE: User notification preferences GET and PUT endpoints CATEGORY: BACKEND SIZE: S DEPENDENCIES: None
CONTEXT: Spark Mojo platform stack: Frappe/ERPNext backend, FastAPI MAL at /api/modules/[capability]/[action], React JSX frontend. React never calls Frappe directly. All custom DocTypes are prefixed "SM ".
The notification preferences system controls which channels are used for which events, per user.
Events: task_assigned, task_due_soon, appointment_reminder, claim_denied, claim_paid, intake_submitted
Channels: email, sms, in_app
Three-tier cascade (user overrides site, site overrides platform):
1. Platform defaults: defined as a Python dict in the endpoint file
2. Site overrides: stored in SM Site Registry config_json under key "notification_preferences"
3. User overrides: stored in a new DocType SM User Notification Preferences (linked to Frappe User by email)
GET /api/modules/admin/notification-preferences/{user_email} Returns fully resolved preferences for that user (all three tiers merged) Also returns which tier each setting came from: "platform", "site", or "user" Returns 404 if user does not exist on the current site
PUT /api/modules/admin/notification-preferences/{user_email} Body: partial or full preferences object Creates or updates the SM User Notification Preferences Frappe document Returns the updated resolved preferences Returns 400 if any event key or channel key is invalid
Both endpoints use X-Frappe-Site-Name header to resolve the site.
Write the full story spec file. It must be self-contained.
```

---

## Scoring Rubric

### Category A: Completeness of Sections (0-5)
- 5: Has all required sections including both endpoints fully specified, new DocType defined, all error states covered
- 4: Missing one minor section
- 3: Missing 2 sections or key sections are thin
- 2: Major sections absent
- 1: Not usable

### Category B: Test Specificity (0-5)
- 5: Tests cover: GET with no user record (platform defaults), GET with site override, GET with user override, tier-source field in response, PUT creates new record, PUT updates existing, PUT invalid event key (400), user not found (404)
- 4: Mostly specific with 1-2 vague entries
- 3: Too high-level
- 2: Generic tests
- 1: No meaningful tests

### Category C: API Specification Quality (0-5)
- 5: Both endpoints fully specified; response schema shows resolved preferences AND tier-source per setting; PUT body schema explicit; all error states covered
- 4: Mostly complete; minor gaps
- 3: Schema present but incomplete
- 2: Vague only
- 1: No API specification

### Category D: Guardrail Compliance (0-5)
- 5: MAL-only rule stated; new SM DocType correctly named with SM prefix; three-tier cascade correctly specified (not just two tiers); CRM timeline addressed as N/A
- 4: Guardrails mostly present; one missing
- 3: Partially addressed
- 2: Key guardrails absent
- 1: Spec violates guardrails

### Category E: Acceptance Criteria Quality (0-5)
- 5: Every criterion independently verifiable; covers both endpoints; covers cascade behavior; covers partial PUT; covers all error states
- 4: Mostly verifiable; 1-2 slightly subjective
- 3: Mix
- 2: Too vague
- 1: Absent or meaningless

**Maximum score: 25**
**Pass threshold: 18/25**
