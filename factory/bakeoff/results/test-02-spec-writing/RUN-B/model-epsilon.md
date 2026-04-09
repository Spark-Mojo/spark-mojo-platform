model: model-epsilon
test: 02-spec-writing
run: B
date: 2026-04-09

# Story Spec: BILL-QUERY-001

```markdown
# STORY SPEC — BILL-QUERY-001

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | BILL-QUERY-001 |
| **Title** | Claim state and valid transitions query endpoint |
| **Category** | BACKEND |
| **Size** | S |
| **Status** | READY FOR IMPLEMENTATION |
| **Dependencies** | BILL-010 (state machine controller — already shipped) |
| **Ship Date** | Sprint 7 |
| **Author** | Spec Writer |
| **Reviewer** | James Ilsley |

---

## 1. Context & Background

### 1.1 Problem Statement

The React frontend and external integrators need a way to query the current state of an SM Claim and determine which states are valid next transitions. Currently, this information is not accessible through the MAL (Mojo Abstraction Layer), forcing consumers to either:
- Call Frappe directly (violates architecture rule #1)
- Hardcode valid state lists (duplicates logic from the state machine controller)

### 1.2 Relationship to BILL-010

BILL-010 shipped the state machine controller at `sm_billing.state_machine.controller`, which exports:
- `VALID_TRANSITIONS: dict[str, list[str]]` — maps each of the 19 canonical states to its valid next states
- `transition_state(claim_name: str, new_state: str) -> dict` — performs a state transition

This story exposes `VALID_TRANSITIONS` as a read endpoint. It does **not** call `transition_state()`.

### 1.3 Workflow Alignment

This is a **read-only query endpoint** aligned with Leg 1 of the Spark Mojo platform (Everything is a workflow). The claim lifecycle is a 19-state workflow. Staff and automated processes need visibility into the current state and available next actions to determine what work can be done on a claim.

### 1.4 CRM Timeline

This endpoint does **not** write to the CRM activity timeline. It is a read-only query that does not change system state.

---

## 2. Functional Requirements

### 2.1 Endpoint Definition

```
GET /api/modules/billing/claim/{claim_id}/state
```

### 2.2 Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `claim_id` | string | Yes | The `name` field of the SM Claim document |

### 2.3 Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Frappe-Site-Name` | Yes | Frappe site identifier for multi-tenant resolution |

### 2.4 Response — Success (200 OK)

```json
{
  "claim_id": "CLM-2026-00042",
  "canonical_state": "submitted",
  "valid_transitions": [
    "adjudicating",
    "denied",
    "partial_paid"
  ],
  "queried_at": "2026-04-09T14:23:01Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `claim_id` | string | The claim identifier that was queried |
| `canonical_state` | string | Current state of the claim from `sm_claim.canonical_state` |
| `valid_transitions` | list[string] | List of valid next states from `VALID_TRANSITIONS[current_state]` |
| `queried_at` | string | ISO 8601 timestamp of when the query was processed |

### 2.5 Error Responses

#### 400 Bad Request — Missing or Empty claim_id

Returned when `claim_id` is not provided or is an empty string.

```json
{
  "error": "bad_request",
  "message": "claim_id is required and cannot be empty"
}
```

#### 404 Not Found — Claim Not Found

Returned when no SM Claim exists with the given `claim_id`.

```json
{
  "error": "not_found",
  "message": "SM Claim '{claim_id}' not found"
}
```

#### 422 Unprocessable Entity — State Not in VALID_TRANSITIONS

Returned when the claim's `canonical_state` exists but is not a key in `VALID_TRANSITIONS`. This indicates a data integrity issue where a state exists on a document but is not defined in the state machine.

```json
{
  "error": "unprocessable_entity",
  "message": "Claim state 'unknown_state' is not defined in VALID_TRANSITIONS"
}
```

---

## 3. Technical Approach

### 3.1 Implementation Location

Add the endpoint to the existing billing routes module. Based on the codebase structure observed, this should be added to the file containing the billing `router` (likely `abstraction_layer/routes/billing.py` or `mal/billing/routes.py`).

### 3.2 Dependencies to Import

```python
from sm_billing.state_machine.controller import VALID_TRANSITIONS
from fastapi import HTTPException, Header
```

### 3.3 Frappe Document Lookup

Use the existing `_read_frappe_doc()` helper function already present in the billing routes module:

```python
async def _read_frappe_doc(doctype: str, name: str) -> dict:
    """Read a single doc from Frappe. Returns dict or raises HTTPException."""
    # ... already implemented in codebase
```

### 3.4 Site Resolution

The `X-Frappe-Site-Name` header must be passed to the Frappe API. The existing codebase appears to use environment variables for `FRAPPE_URL` and credentials. For multi-site support, the `X-Frappe-Site-Name` header should be included in `_frappe_headers()` or used to construct the correct site URL.

**Note**: If `_frappe_headers()` does not currently include site resolution, this endpoint must add it. The header value should be passed through to the Frappe API call.

### 3.5 Valid Transitions Lookup

```python
valid_transitions = VALID_TRANSITIONS.get(claim["canonical_state"], [])
```

If the state is not in `VALID_TRANSITIONS`, return 422.

### 3.6 No State Transitions

This endpoint is **read-only**. It must never call `transition_state()` from the state machine controller.

---

## 4. Implementation Notes

### 4.1 Pydantic Model

Add a response model for type safety:

```python
class ClaimStateResponse(BaseModel):
    claim_id: str
    canonical_state: str
    valid_transitions: list[str]
    queried_at: str
```

### 4.2 Route Handler Signature

```python
@router.get("/claim/{claim_id}/state", response_model=ClaimStateResponse)
async def get_claim_state(
    claim_id: str,
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name")
):
```

### 4.3 Site Header Handling

The `X-Frappe-Site-Name` header must be forwarded to Frappe. The existing `_frappe_headers()` helper may need to be updated to accept a site parameter, or a new helper created:

```python
def _frappe_headers(site_name: str = None):
    headers = {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }
    if site_name:
        headers["X-Frappe-Site-Name"] = site_name
    return headers
```

### 4.4 Multi-Tenant Considerations

The site header is critical for multi-tenant deployments. Each client has an isolated Frappe site. Without this header, the wrong client's claims could be queried.

---

## 5. Acceptance Criteria

### 5.1 Functional Acceptance

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| AC-01 | GET `/api/modules/billing/claim/{claim_id}/state` returns 200 with correct `canonical_state` | Unit test with mocked Frappe response |
| AC-02 | Response includes `valid_transitions` derived from `VALID_TRANSITIONS[current_state]` | Unit test verifying transition lookup |
| AC-03 | Returns 400 when `claim_id` is empty string | Unit test with empty path parameter |
| AC-04 | Returns 404 when SM Claim does not exist | Unit test with non-existent claim_id |
| AC-05 | Returns 422 when claim's `canonical_state` is not in `VALID_TRANSITIONS` | Unit test with malformed state |
| AC-06 | Response includes `queried_at` timestamp in ISO 8601 format | Unit test asserting timestamp format |
| AC-07 | `X-Frappe-Site-Name` header is included in Frappe API call | Integration test or code review |
| AC-08 | Endpoint does NOT call `transition_state()` | Code review |

### 5.2 Non-Functional Acceptance

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| NF-01 | Response time < 200ms for typical Frappe lookup | Performance test |
| NF-02 | Uses existing `_read_frappe_doc()` helper | Code review |
| NF-03 | No changes to Frappe/ERPNext core | Code review |
| NF-04 | Follows existing route naming conventions | Code review |

---

## 6. Test Scenarios

### 6.1 Unit Tests

```python
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

# Mock data
MOCK_CLAIM = {
    "name": "CLM-2026-00042",
    "canonical_state": "submitted",
    "doctype": "SM Claim"
}

MOCK_VALID_TRANSITIONS = {
    "draft": ["validated", "cancelled"],
    "validated": ["draft", "submitted", "cancelled"],
    "submitted": ["adjudicating", "denied", "partial_paid"],
    "adjudicating": ["paid", "partial_paid", "denied"],
    "paid": [],
    "partial_paid": ["paid", "denied"],
    "denied": ["appeal_submitted", "written_off"],
    # ... other states
}


@pytest.mark.asyncio
async def test_get_claim_state_success():
    """Verify 200 response with correct state and transitions."""
    with patch("billing.routes.VALID_TRANSITIONS", MOCK_VALID_TRANSITIONS):
        with patch("billing.routes._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = MOCK_CLAIM
            
            response = await client.get("/claim/CLM-2026-00042/state")
            
            assert response.status_code == 200
            data = response.json()
            assert data["claim_id"] == "CLM-2026-00042"
            assert data["canonical_state"] == "submitted"
            assert "adjudicating" in data["valid_transitions"]
            assert "denied" in data["valid_transitions"]
            assert "partial_paid" in data["valid_transitions"]


@pytest.mark.asyncio
async def test_get_claim_state_not_found():
    """Verify 404 when claim does not exist."""
    with patch("billing.routes._read_frappe_doc", new_callable=AsyncMock) as mock_read:
        from fastapi import HTTPException
        mock_read.side_effect = HTTPException(status_code=404, detail="SM Claim 'INVALID' not found")
        
        response = await client.get("/claim/INVALID/state")
        
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_claim_state_missing_claim_id():
    """Verify 400 when claim_id is empty."""
    response = await client.get("/claim//state")
    
    # FastAPI returns 404 for empty path segments before the route handler
    assert response.status_code in [400, 404]


@pytest.mark.asyncio
async def test_get_claim_state_unknown_state():
    """Verify 422 when canonical_state not in VALID_TRANSITIONS."""
    malformed_claim = {
        "name": "CLM-00001",
        "canonical_state": "unknown_state",
        "doctype": "SM Claim"
    }
    
    with patch("billing.routes.VALID_TRANSITIONS", MOCK_VALID_TRANSITIONS):
        with patch("billing.routes._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = malformed_claim
            
            response = await client.get("/claim/CLM-00001/state")
            
            assert response.status_code == 422
```

### 6.2 Integration Test

```python
@pytest.mark.asyncio
async def test_site_header_forwarded():
    """Verify X-Frappe-Site-Name is forwarded to Frappe API."""
    with patch("billing.routes.VALID_TRANSITIONS", MOCK_VALID_TRANSITIONS):
        with patch("billing.routes._read_frappe_doc", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = MOCK_CLAIM
            
            response = await client.get(
                "/claim/CLM-2026-00042/state",
                headers={"X-Frappe-Site-Name": "willow"}
            )
            
            # Verify header was passed to Frappe call
            mock_read.assert_called_once()
            # The implementation should forward the site header
```

---

## 7. File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `mal/billing/routes.py` (or equivalent) | Modify | Add `ClaimStateResponse` Pydantic model, update `_frappe_headers()` helper, add `get_claim_state()` route handler |

---

## 8. Out of Scope

- **State transitions**: This endpoint is read-only. `transition_state()` is NOT called.
- **Bulk state queries**: Only single claim lookup is supported in this story.
- **Admin endpoints**: No admin-specific behavior required.
- **Caching**: Response caching not required for initial implementation.
- **Webhook handling**: No webhooks involved in this endpoint.

---

## 9. Open Questions

| # | Question | Resolution Owner |
|---|----------|------------------|
| OQ-009 | Should `X-Frappe-Site-Name` header handling be extracted into middleware? | Platform Team |
| OQ-010 | Should `VALID_TRANSITIONS` be fetched from Frappe DocType property instead of Python module? | BILL-010 Team |

---

## 10. Sign-Off

| Role | Name | Date |
|------|------|------|
| Spec Writer | [Author] | 2026-04-09 |
| Technical Review | [Reviewer] | Pending |
| Product Owner | [James Ilsley] | Pending |

---

**END OF STORY SPEC — BILL-QUERY-001**
```

---

## Summary

This story spec provides a complete, self-contained specification for implementing the claim state query endpoint. Key elements:

| Aspect | Details |
|--------|---------|
| **Endpoint** | `GET /api/modules/billing/claim/{claim_id}/state` |
| **Returns** | Current `canonical_state` + valid transitions from `VALID_TRANSITIONS` |
| **Site Resolution** | Via `X-Frappe-Site-Name` header |
| **Errors** | 400 (missing ID), 404 (not found), 422 (invalid state) |
| **Constraints** | Read-only — no state transitions |