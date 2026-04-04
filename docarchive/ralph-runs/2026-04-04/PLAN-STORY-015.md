# PLAN-STORY-015: Medplum Abstraction Layer Connector

## Overview

Create `MedplumClient` connector with project_id enforcement (DECISION-028) and 13 unit tests. No VPS deployment needed — pytest gate only.

---

## Files to Create

### 1. `abstraction-layer/connectors/__init__.py`
- Empty init file for the connectors package.

### 2. `abstraction-layer/connectors/medplum_connector.py`
- `MedplumProjectScopeError` exception class
- `MedplumClient` class

### 3. `abstraction-layer/tests/test_medplum_connector.py`
- 13 test cases using pytest + respx (httpx mock)

### 4. Dependencies
- Add `httpx` and `respx` to `abstraction-layer/requirements.txt` (if not already present)

---

## MedplumClient Method List

| Method | Type | project_id Required | Description |
|--------|------|---------------------|-------------|
| `__init__()` | sync | N/A | Reads MEDPLUM_BASE_URL, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET from env; creates httpx.AsyncClient |
| `is_configured` | property | N/A | Returns `bool(self.base_url)` |
| `_ensure_token()` | async | N/A | OAuth2 client_credentials flow, auto-refresh within 5min of expiry |
| `_validate_project_id(method_name, project_id)` | sync | N/A | Raises `MedplumProjectScopeError` if project_id is None or empty string |
| `_request(method, path, project_id, json_body, params)` | async | Yes | Authenticated request with X-Medplum-Project header; retries once on 401 |
| `get_resource(resource_type, resource_id, project_id)` | async | **Yes** | GET /fhir/R4/{type}/{id} |
| `create_resource(resource_type, resource, project_id)` | async | **Yes** | POST /fhir/R4/{type} |
| `update_resource(resource_type, resource_id, resource, project_id)` | async | **Yes** | PUT /fhir/R4/{type}/{id} |
| `search_resources(resource_type, project_id, params)` | async | **Yes** | GET /fhir/R4/{type}?{params} |
| `create_project(project_name)` | async | No (admin) | POST /admin/projects |
| `close()` | async | N/A | Closes httpx client |

**project_id enforcement:** `_validate_project_id()` is the FIRST line of `get_resource`, `create_resource`, `update_resource`, and `search_resources`. Raises `MedplumProjectScopeError` if None or empty string. This is HIPAA enforcement per DECISION-028.

---

## 13 Test Cases

| # | Test Name | What It Verifies |
|---|-----------|------------------|
| 1 | `test_get_resource_requires_project_id` | `get_resource(project_id=None)` raises `MedplumProjectScopeError` |
| 2 | `test_get_resource_requires_project_id_empty_string` | `get_resource(project_id="")` raises `MedplumProjectScopeError` |
| 3 | `test_create_resource_requires_project_id` | `create_resource(project_id=None)` raises `MedplumProjectScopeError` |
| 4 | `test_update_resource_requires_project_id` | `update_resource(project_id=None)` raises `MedplumProjectScopeError` |
| 5 | `test_search_resources_requires_project_id` | `search_resources(project_id=None)` raises `MedplumProjectScopeError` |
| 6 | `test_get_resource_success` | Mock 200 response; verify correct URL `/fhir/R4/{type}/{id}` and `X-Medplum-Project` header |
| 7 | `test_create_resource_success` | Mock 201 response; verify POST body and `X-Medplum-Project` header |
| 8 | `test_update_resource_success` | Mock 200 response; verify PUT body and `X-Medplum-Project` header |
| 9 | `test_search_resources_success` | Mock 200 Bundle response; verify search params passed correctly |
| 10 | `test_token_refresh_on_401` | Mock 401 then 200; verify token refresh and retry |
| 11 | `test_is_configured_true` | With `MEDPLUM_BASE_URL` set, `is_configured` returns True |
| 12 | `test_is_configured_false` | Without `MEDPLUM_BASE_URL`, `is_configured` returns False |
| 13 | `test_create_project` | Mock admin endpoint POST /admin/projects response |

---

## Gate

- `pytest tests/test_medplum_connector.py -v` — 13/13 pass
- `pytest tests/ --cov=connectors --cov-report=term-missing --cov-fail-under=70` — coverage >= 70%
- `python3 -c "from connectors.medplum_connector import MedplumClient, MedplumProjectScopeError"` — import OK
