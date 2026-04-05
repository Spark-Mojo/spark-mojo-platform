# PLAN-STORY-017: Medplum Per-Project ClientApplication Creation

**Story:** STORY-017
**Type:** Python API
**Branch:** `story/story-017-medplum-client-application`
**Decision:** DECISION-028 (Medplum multi-tenancy, HIPAA tenant isolation)

---

## Overview

STORY-016 created real Medplum Projects during provisioning. The remaining gap is that each Project needs its own ClientApplication -- a set of credentials (client_id + client_secret) scoped to that Project. Without per-project ClientApplications, the abstraction layer cannot make tenant-scoped FHIR API calls (it currently uses the global admin credentials for everything).

This story adds a `create_client_application()` method to `MedplumClient` and calls it as Step 8b in the provisioning flow, immediately after the existing Step 8 (Project creation). The ClientApplication gives each tenant its own OAuth2 credentials for FHIR access.

**HIPAA constraint (DECISION-028):** The `medplum_client_secret` is a bearer credential that grants access to patient data. It must NEVER be stored in Frappe, committed to git, or persisted anywhere in the platform. It is logged once to stdout during provisioning so the operator can copy it, then discarded.

---

## Files to Change

| File | Action |
|------|--------|
| `abstraction-layer/connectors/medplum_connector.py` | **Extend** -- add `create_client_application()` method |
| `abstraction-layer/routes/provisioning.py` | **Modify** -- add Step 8b after existing Step 8, update SM Site Registry payload |
| `abstraction-layer/tests/test_medplum_connector.py` | **Extend** -- add tests for `create_client_application()` |
| `abstraction-layer/tests/test_provisioning.py` | **Extend** -- add tests for Step 8b success + failure paths |

---

## Connector Changes

### New method: `MedplumClient.create_client_application()`

Add to `abstraction-layer/connectors/medplum_connector.py`, after the existing `create_project()` method (line 109):

```python
async def create_client_application(self, project_id: str, app_name: str) -> dict:
    """Create a ClientApplication within a Medplum Project.

    Returns dict with keys: id, secret, clientId.
    The caller is responsible for handling the secret securely.
    """
    return await self._request(
        "POST",
        f"/admin/projects/{project_id}/client",
        json_body={"name": app_name},
    )
```

**Design notes:**
- Follows the same pattern as `create_project()` -- a thin wrapper around `_request()`
- Does NOT pass `project_id` as a header (this is an admin endpoint, not a FHIR data endpoint, so `_validate_project_id` does not apply)
- The Medplum admin API `POST /admin/projects/{project_id}/client` creates a ClientApplication scoped to that Project and returns the credentials in the response body
- Returns the raw response dict -- the caller (provisioning route) decides what to do with each field
- Raises `httpx.HTTPStatusError` on failure (via `resp.raise_for_status()` in `_request()`)

---

## Provisioning Changes

### New function: `step_08b_create_client_application()`

Add as a new async function in `abstraction-layer/routes/provisioning.py`, immediately after `step_08_create_medplum_project()`:

```python
async def step_08b_create_client_application(
    medplum_project_id: str,
    site_subdomain: str,
    warnings: list[str],
    steps_completed: list[str],
    steps_failed: list[str],
) -> Optional[str]:
    """Create a Medplum ClientApplication for tenant-scoped FHIR access.

    Returns the client_id (safe to store) or None on failure.
    The client_secret is logged to stdout and then discarded (HIPAA).
    """
```

**Behavior:**

1. Skip if `medplum_project_id` starts with `"stub-"` (no real Project exists). Add warning: `"medplum_client_app_skipped: no real project"`. Return `None`.
2. Skip if `medplum_client.is_configured` is `False`. Return `None`.
3. Call `await medplum_client.create_client_application(medplum_project_id, f"{site_subdomain}-abstraction-layer")`.
4. On success:
   - Extract `client_id` from response (key: `"id"` or `"clientId"` -- check Medplum response shape).
   - Extract `client_secret` from response (key: `"secret"`).
   - Log the secret: `logger.warning("WARNING MEDPLUM_CLIENT_SECRET for %s: %s — COPY THIS NOW, it will not be stored", site_subdomain, client_secret)`
   - Append `"create_client_application"` to `steps_completed`.
   - Return `client_id`.
5. On failure (any exception):
   - Append `f"create_client_application: {str(e)}"` to `steps_failed`.
   - Append warning: `f"medplum_client_app_failed: {str(e)}. Tenant-scoped FHIR access unavailable."` to `warnings`.
   - Return `None`. **Provisioning continues -- this is non-blocking.**

### Integration into `create_site()` endpoint

In the `create_site()` function, add Step 8b immediately after the existing Step 8 block (after line 669):

```python
# Step 8b -- Create Medplum ClientApplication (STORY-017)
medplum_client_id = None
medplum_client_id = await step_08b_create_client_application(
    medplum_project_id, req.site_subdomain, warnings, steps_completed, steps_failed
)
```

### Update SM Site Registry payload in `step_10_register_site()`

Add `medplum_client_id` parameter to `step_10_register_site()` function signature.

In the `registry_data` dict (around line 409), add:

```python
"medplum_client_id": medplum_client_id or "",
```

**GAP:** The SM Site Registry DocType (`sm_site_registry.json`) does NOT currently have a `medplum_client_id` field. The field must be added to the DocType JSON before this value can be persisted. Options:

1. **(Preferred)** Add a `medplum_client_id` Data field to `sm_site_registry.json` as part of this story. This is a safe additive schema change -- `bench migrate` will add the column.
2. **(Acceptable fallback)** Include `medplum_client_id` in the `connectors_json` blob that already exists on the DocType. This avoids a schema change but is less queryable.

If option 1, add the field to `frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/doctype/sm_site_registry/sm_site_registry.json` in the `fields` array, near `medplum_project_id`.

---

## Secret Handling

This is the most critical security aspect of the story.

| Credential | Storage | Rationale |
|------------|---------|-----------|
| `medplum_client_id` | SM Site Registry (Frappe) | Safe to store -- it is a public identifier, not a secret |
| `medplum_client_secret` | **NEVER STORED** | Bearer credential granting access to patient data. Logged once to stdout during provisioning, then discarded. Operator must copy from logs. |

**Implementation rules:**
- The `client_secret` variable must NOT be assigned to any object attribute, dict, database field, file, or return value that persists beyond the function scope.
- The only operation on `client_secret` is `logger.warning(...)`.
- After the log call, the variable goes out of scope when the function returns.
- The `step_08b_create_client_application()` function returns ONLY `client_id` (or `None`).

**Operator workflow:**
1. Operator calls `POST /api/admin/sites/create`
2. During execution, stdout shows: `WARNING MEDPLUM_CLIENT_SECRET for willow: abc123secret -- COPY THIS NOW, it will not be stored`
3. Operator copies the secret to a secure credential store (e.g., Bitwarden)
4. The secret is never seen again in any Spark Mojo system

---

## Error Handling

| Scenario | Behavior | Provisioning continues? |
|----------|----------|------------------------|
| Medplum not configured | Step 8b skipped silently | Yes |
| Project is a stub (Step 8 failed) | Step 8b skipped with warning | Yes |
| `create_client_application()` API call fails | Warning added, `medplum_client_id` = `None` | Yes |
| `create_client_application()` returns unexpected shape | Treat as failure (KeyError caught by except) | Yes |

Step 8b is **always non-blocking**. A failed ClientApplication creation means the tenant cannot make FHIR API calls until the operator manually creates one, but all other provisioning steps proceed normally.

---

## Test Strategy

### Tests for `MedplumClient.create_client_application()` (in `test_medplum_connector.py`)

Add to the existing `# -- admin project creation --` section:

1. **`test_create_client_application_success`** -- Mock `POST /admin/projects/{project_id}/client` returning 201 with `{"id": "app-uuid", "secret": "secret-value", "clientId": "app-uuid"}`. Assert response dict matches. Assert correct URL path. Assert no `X-Medplum-Project` header (admin endpoint).

2. **`test_create_client_application_failure`** -- Mock `POST /admin/projects/{project_id}/client` returning 500. Assert `httpx.HTTPStatusError` is raised.

### Tests for `step_08b_create_client_application()` (in `test_provisioning.py`)

Add to the existing `TestMedplumAndN8n` class:

3. **`test_client_app_creation_success`** -- Mock `medplum_client.is_configured = True` and `create_client_application` returning `{"id": "app-uuid", "secret": "secret-value"}`. Assert:
   - Returns `"app-uuid"` (client_id)
   - `"create_client_application"` in `steps_completed`
   - No entries in `steps_failed`
   - Logger received a WARNING call containing the secret string

4. **`test_client_app_creation_failure`** -- Mock `medplum_client.is_configured = True` and `create_client_application` raising `Exception("API error")`. Assert:
   - Returns `None`
   - `"create_client_application"` NOT in `steps_completed`
   - `"create_client_application"` in `steps_failed` (substring match)
   - Warning added about failure

5. **`test_client_app_skipped_stub_project`** -- Call with `medplum_project_id="stub-abc12345"`. Assert:
   - Returns `None`
   - Warning about skipping (substring: `"medplum_client_app_skipped"`)
   - Nothing added to `steps_completed` or `steps_failed`

6. **`test_client_app_skipped_not_configured`** -- Mock `medplum_client.is_configured = False`. Assert:
   - Returns `None`

### Test patterns to follow

- Use `unittest.mock.patch("routes.provisioning.medplum_client", mock_client)` -- same pattern as existing Step 8 tests (lines 595-644 in test_provisioning.py)
- Use `@respx.mock` decorator for connector-level tests -- same pattern as existing connector tests
- Use `AsyncMock` for all async method mocks
- Use `@pytest.mark.anyio` for async provisioning step tests (matching existing convention)
- Use `@pytest.mark.asyncio` for connector tests (matching existing convention in test_medplum_connector.py)

---

## Gates

### Gate 1: Import check (fast gate)
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer
python3 -c "from connectors.medplum_connector import MedplumClient; c = MedplumClient(); print(hasattr(c, 'create_client_application'))"
```
**PASS:** prints `True`

### Gate 2: Full pytest suite
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer
pytest tests/ -v
```
**PASS:** 0 failures

### Gate 3: Coverage
```bash
cd /Users/jamesilsley/GitHub/spark-mojo-platform/abstraction-layer
pytest tests/ --cov=. --cov-report=term-missing --omit=connectors/frappe_native.py --cov-fail-under=70
```
**PASS:** coverage >= 70%

---

## Identified Gaps

1. **SM Site Registry `medplum_client_id` field does not exist.** The DocType JSON at `frappe-apps/sm_provisioning/sm_provisioning/sm_provisioning/doctype/sm_site_registry/sm_site_registry.json` has `medplum_project_id` but not `medplum_client_id`. This field must be added as part of this story (additive schema change, safe to migrate). If adding the field is out of scope, store the value in `connectors_json` as a fallback.

2. **Medplum admin API response shape for ClientApplication is assumed.** The plan assumes `POST /admin/projects/{project_id}/client` returns `{"id": "...", "secret": "..."}`. The builder should verify the actual response keys from Medplum v5.x documentation or a test call and adjust accordingly.

3. **STORY-017 spec file does not exist** at the expected path (`sparkmojo-internal/platform/feature-library/stories/STORY-017-medplum-client-application.md`). This plan was built from the TODO comment in provisioning.py (line 342-344), the PROMPT.md instructions, the hats.yml builder spec, and DECISION-028. The story spec should be written if formal acceptance criteria review is needed.

---

## Commit Message

```
feat: Medplum per-project ClientApplication creation in provisioning API (STORY-017)
```
