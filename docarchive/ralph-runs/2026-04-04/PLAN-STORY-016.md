# PLAN-STORY-016: Replace Medplum Stub with Real Project Creation

## Single File to Modify

`abstraction-layer/routes/provisioning.py`

---

## Import to Add

At top of file, add:
```python
from connectors.medplum_connector import MedplumClient
```

And initialize at module level:
```python
medplum_client = MedplumClient()
```

---

## Code Block to Replace

### Current stub (lines 326-347 in provisioning.py):

```python
async def step_08_create_medplum_project(site_subdomain: str, warnings: list[str]) -> str:
    """Create Medplum project or return stub. Every call must include projectId (DECISION-028)."""
    if not MEDPLUM_BASE_URL:
        stub_id = f"stub-{uuid4().hex[:8]}"
        warnings.append(
            "medplum_project_stub: MEDPLUM_BASE_URL not set. "
            f"Using stub project ID: {stub_id}. "
            "Real project creation requires STORY-015 (Medplum connector). "
            "Merge and verify STORY-015 before provisioning live clients."
        )
        return stub_id

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{MEDPLUM_BASE_URL}/admin/projects",
            json={"name": site_subdomain, "strictMode": True},
            timeout=30,
        )
        resp.raise_for_status()
        project = resp.json().get("project", resp.json())
        return project.get("id", f"stub-{uuid4().hex[:8]}")
```

### Replacement code:

```python
async def step_08_create_medplum_project(
    site_subdomain: str,
    warnings: list[str],
    steps_completed: list[str],
    steps_failed: list[str],
) -> str:
    """Create Medplum project via MedplumClient or return stub (DECISION-028)."""
    if medplum_client.is_configured:
        try:
            project = await medplum_client.create_project(site_subdomain)
            medplum_project_id = project["id"]
            steps_completed.append("create_medplum_project")
            # TODO (STORY-017): After creating the Project, create a ClientApplication
            # within the Project for the abstraction layer to use for tenant-scoped
            # FHIR API calls. Store client_id and client_secret in SM Site Registry.
            return medplum_project_id
        except Exception as e:
            medplum_project_id = f"stub-{uuid4().hex[:8]}"
            steps_failed.append(f"create_medplum_project: {str(e)}")
            warnings.append(f"medplum_project_creation_failed: {str(e)}. Using stub ID.")
            return medplum_project_id
    else:
        medplum_project_id = f"stub-{uuid4().hex[:8]}"
        warnings.append("medplum_project_stub")
        return medplum_project_id
```

### Caller update in `create_site()` (lines 656-662):

Change:
```python
    # Step 8 — Create Medplum project (STUB)
    try:
        medplum_project_id = await step_08_create_medplum_project(req.site_subdomain, warnings)
        steps_completed.append("create_medplum_project")
    except Exception as exc:
        steps_failed.append(f"create_medplum_project: {exc}")
        medplum_project_id = f"stub-{uuid4().hex[:8]}"
```

To:
```python
    # Step 8 — Create Medplum project
    medplum_project_id = await step_08_create_medplum_project(
        req.site_subdomain, warnings, steps_completed, steps_failed
    )
    if not medplum_project_id:
        medplum_project_id = f"stub-{uuid4().hex[:8]}"
```

Note: The step now manages its own steps_completed/steps_failed internally instead of the caller doing it.

---

## Tests to Update

File: `abstraction-layer/tests/test_provisioning.py` (or wherever provisioning tests live)

Update any tests that:
1. Assert `steps_completed` contains `"create_medplum_project"` — this now only appears when `medplum_client.is_configured` is True and the call succeeds
2. Assert stub ID format — stub IDs still start with `stub-` when not configured or on failure
3. Add new test cases:
   - **Test: real Medplum configured** — mock `MedplumClient.create_project` to return `{"id": "real-uuid"}`, verify `medplum_project_id` is `"real-uuid"` (no `stub-` prefix), verify `steps_completed` includes `"create_medplum_project"`
   - **Test: Medplum configured but fails** — mock `create_project` to raise Exception, verify fallback to `stub-*` ID, verify `steps_failed` includes the error, verify provisioning continues
   - **Test: Medplum not configured** — verify stub behavior unchanged, `warnings` includes `"medplum_project_stub"`

---

## Gate

```bash
pytest tests/ --cov=. --cov-report=term-missing --omit=connectors/frappe_native.py --cov-fail-under=70
```

---

## Key Behaviors

| Scenario | medplum_project_id | steps_completed | steps_failed | warnings |
|----------|-------------------|-----------------|--------------|----------|
| MEDPLUM_BASE_URL set + success | Real UUID from Medplum | includes `create_medplum_project` | — | — |
| MEDPLUM_BASE_URL set + failure | `stub-{hex}` | — | includes error | includes failure message |
| MEDPLUM_BASE_URL not set | `stub-{hex}` | — | — | includes `medplum_project_stub` |
