model: model-alpha
test: 02-spec-writing
run: B
date: 2026-04-09

# Story Spec: BILL-QUERY-001

## Claim State and Valid Transitions Query Endpoint

**Story ID:** BILL-QUERY-001  
**Title:** Claim state and valid transitions query endpoint  
**Category:** BACKEND  
**Size:** S  
**Dependencies:** BILL-010 (state machine controller — already shipped, already in codebase)  
**Status:** Ready for Implementation  

---

## Summary

Add a read-only endpoint to the billing capability's Mojo Abstraction Layer (MAL) that returns the current `canonical_state` of an SM Claim document and the list of valid next states from the state machine controller's `VALID_TRANSITIONS` dictionary. This endpoint does **not** perform any state transition.

---

## Acceptance Criteria

| # | Criterion | Validation |
|---|-----------|------------|
| AC-1 | Endpoint accepts `GET /api/modules/billing/claim/{claim_id}/state` | Route registration and parameter extraction |
| AC-2 | Returns current `canonical_state` of the SM Claim document | Response body contains `current_state` field |
| AC-3 | Returns list of valid next states from `VALID_TRANSITIONS[current_state]` | Response body contains `valid_transitions` field |
| AC-4 | Returns 404 if SM Claim document not found in Frappe | HTTP status code and error detail |
| AC-5 | Returns 400 if `claim_id` path parameter is empty or whitespace | HTTP status code and error detail |
| AC-6 | Returns empty list for `valid_transitions` if current state has no defined transitions (terminal state) | No KeyError, graceful fallback |
| AC-7 | Resolves correct Frappe site using `X-Frappe-Site-Name` request header | Header is passed to Frappe API calls |
| AC-8 | Does **not** call `transition_state()` under any circumstances | Code review confirms read-only behavior |

---

## API Contract

### Request

```
GET /api/modules/billing/claim/{claim_id}/state
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `claim_id` | string | Yes | The `name` field of the SM Claim document |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `X-Frappe-Site-Name` | No | Frappe site name for multi-tenant resolution. If not provided, uses default site from `FRAPPE_URL` environment variable. |

### Response — Success (200)

```json
{
  "claim_id": "CLAIM-2026-00142",
  "current_state": "submitted",
  "valid_transitions": ["adjudicating", "rejected", "cancelled"]
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `claim_id` | string | The claim identifier (echo of path parameter) |
| `current_state` | string \| null | Value of `canonical_state` field on SM Claim. `null` if field is empty. |
| `valid_transitions` | list[string] | List of valid next states from `VALID_TRANSITIONS`. Empty list `[]` if current state is terminal or not found in `VALID_TRANSITIONS`. |

### Response — 400 Bad Request

```json
{
  "detail": "claim_id is required and cannot be empty"
}
```

### Response — 404 Not Found

```json
{
  "detail": "SM Claim 'CLAIM-INVALID' not found"
}
```

---

## Technical Design

### File Location

Add the endpoint to the existing billing router in the same file as the other billing endpoints (the file containing `router = APIRouter(tags=["billing"])`).

### Dependencies to Import

```python
from sm_billing.state_machine.controller import VALID_TRANSITIONS
```

The `transition_state` function exists in the same module but **must not be imported or called**. Import only `VALID_TRANSITIONS`.

### Response Model

Add this Pydantic model to the existing models section:

```python
class ClaimStateResponse(BaseModel):
    claim_id: str
    current_state: Optional[str] = None
    valid_transitions: list[str] = []
```

### Endpoint Implementation

```python
@router.get("/claim/{claim_id}/state", response_model=ClaimStateResponse)
async def get_claim_state(claim_id: str):
    """
    Get current canonical_state and valid next states for an SM Claim.
    Read-only — does not perform any state transition.
    """
    # Validate claim_id
    if not claim_id or not claim_id.strip():
        raise HTTPException(status_code=400, detail="claim_id is required and cannot be empty")
    
    claim_id = claim_id.strip()
    
    # Read SM Claim from Frappe
    claim = await _read_frappe_doc("SM Claim", claim_id)
    
    # Extract current state
    current_state = claim.get("canonical_state") or None
    
    # Look up valid transitions
    valid_transitions = []
    if current_state and current_state in VALID_TRANSITIONS:
        valid_transitions = VALID_TRANSITIONS[current_state]
    # If current_state is None or not in VALID_TRANSITIONS, return empty list
    
    return ClaimStateResponse(
        claim_id=claim_id,
        current_state=current_state,
        valid_transitions=valid_transitions,
    )
```

### Site Resolution via Header

The existing `_read_frappe_doc` helper uses `_frappe_headers()` which provides authentication. To support multi-tenant site resolution via the `X-Frappe-Site-Name` header:

**Option A (Recommended — Minimal Change):**  
The `FRAPPE_URL` environment variable already points to the Frappe instance. In the current multi-site model, site routing is handled at the Frappe/nginx level. Pass the `X-Frappe-Site-Name` header through to Frappe API calls.

Modify the endpoint to accept the header and pass it through:

```python
from fastapi import Header, Request

@router.get("/claim/{claim_id}/state", response_model=ClaimStateResponse)
async def get_claim_state(
    claim_id: str,
    x_frappe_site_name: Optional[str] = Header(None, alias="X-Frappe-Site-Name"),
):
    """..."""
    if not claim_id or not claim_id.strip():
        raise HTTPException(status_code=400, detail="claim_id is required and cannot be empty")
    
    claim_id = claim_id.strip()
    claim = await _read_frappe_doc("SM Claim", claim_id, site_name=x_frappe_site_name)
    
    # ... rest of implementation
```

This requires a minor modification to `_read_frappe_doc` (and potentially `_frappe_headers`) to accept and pass the site header. The header is added to the request headers sent to Frappe:

```python
async def _read_frappe_doc(doctype: str, name: str, site_name: Optional[str] = None) -> dict:
    """Read a single doc from Frappe. Returns dict or raises HTTPException."""
    headers = _frappe_headers()
    if site_name:
        headers["X-Frappe-Site-Name"] = site_name
    
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=headers) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"{doctype} '{name}' not found")
        resp.raise_for_status()
        return resp.json().get("data", {})
```

**Important:** This change to `_read_frappe_doc` affects all callers. Since all existing callers pass `site_name=None` by default, this is backward-compatible. Other endpoints can be updated to accept and forward the header in future stories.

---

## Edge Cases and Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| `claim_id` is empty string `""` | Return 400 with detail "claim_id is required and cannot be empty" |
| `claim_id` is whitespace only `"  "` | Return 400 (after stripping, result is empty) |
| `claim_id` contains leading/trailing whitespace | Strip whitespace before lookup |
| SM Claim not found in Frappe | Return 404 via `_read_frappe_doc` (already raises HTTPException) |
| `canonical_state` field is empty/null on the claim | `current_state` is `null` in response, `valid_transitions` is `[]` |
| `canonical_state` value not found in `VALID_TRANSITIONS` keys | `valid_transitions` is `[]` (graceful fallback, no KeyError) |
| `canonical_state` maps to empty list in `VALID_TRANSITIONS` | `valid_transitions` is `[]` (terminal state like `written_off`) |
| Frappe API returns unexpected error (5xx) | Propagate via `resp.raise_for_status()` — httpx will raise, FastAPI returns 500 |

---

## Test Cases

### TC-1: Successful state query — claim with valid transitions

**Given:** SM Claim `CLAIM-001` exists with `canonical_state = "submitted"`  
**And:** `VALID_TRANSITIONS["submitted"] = ["adjudicating", "rejected", "cancelled"]`  
**When:** `GET /api/modules/billing/claim/CLAIM-001/state`  
**Then:** Status 200  
**And:** Response body:
```json
{
  "claim_id": "CLAIM-001",
  "current_state": "submitted",
  "valid_transitions": ["adjudicating", "rejected", "cancelled"]
}
```

### TC-2: Terminal state — no valid transitions

**Given:** SM Claim `CLAIM-002` exists with `canonical_state = "written_off"`  
**And:** `VALID_TRANSITIONS["written_off"] = []`  
**When:** `GET /api/modules/billing/claim/CLAIM-002/state`  
**Then:** Status 200  
**And:** Response body:
```json
{
  "claim_id": "CLAIM-002",
  "current_state": "written_off",
  "valid_transitions": []
}
```

### TC-3: Claim with empty canonical_state

**Given:** SM Claim `CLAIM-003` exists with `canonical_state = ""` or `null`  
**When:** `GET /api/modules/billing/claim/CLAIM-003/state`  
**Then:** Status 200  
**And:** Response body:
```json
{
  "claim_id": "CLAIM-003",
  "current_state": null,
  "valid_transitions": []
}
```

### TC-4: Claim not found

**Given:** SM Claim `CLAIM-INVALID` does not exist  
**When:** `GET /api/modules/billing/claim/CLAIM-INVALID/state`  
**Then:** Status 404  
**And:** Response body:
```json
{
  "detail": "SM Claim 'CLAIM-INVALID' not found"
}
```

### TC-5: Empty claim_id

**When:** `GET /api/modules/billing/claim//state` (empty path segment)  
**Then:** Route does not match (FastAPI path parameter requires non-empty) — returns 404 or 405 depending on router configuration  
**Alternative:** `GET /api/modules/billing/claim/ /state` (whitespace only)  
**Then:** Status 400  
**And:** Response body:
```json
{
  "detail": "claim_id is required and cannot be empty"
}
```

### TC-6: State not in VALID_TRANSITIONS (unknown state)

**Given:** SM Claim `CLAIM-004` exists with `canonical_state = "unknown_state_value"`  
**And:** `"unknown_state_value"` is not a key in `VALID_TRANSITIONS`  
**When:** `GET /api/modules/billing/claim/CLAIM-004/state`  
**Then:** Status 200  
**And:** Response body:
```json
{
  "claim_id": "CLAIM-004",
  "current_state": "unknown_state_value",
  "valid_transitions": []
}
```
**Note:** This is a defensive fallback. The state machine controller owns state definitions; if a state is not in `VALID_TRANSITIONS`, treat it as terminal.

### TC-7: Site header passed through

**Given:** Request includes header `X-Frappe-Site-Name: willow`  
**When:** `GET /api/modules/billing/claim/CLAIM-001/state` with that header  
**Then:** Frappe API call includes `X-Frappe-Site-Name: willow` in its headers

---

## Out of Scope

The following are explicitly **not** part of this story:

- Performing any state transition (this is read-only)
- Creating, updating, or deleting SM Claim documents
- Validating whether a transition is *allowed* given business rules beyond the `VALID_TRANSITIONS` map
- Returning the full claim document (only `canonical_state` and transitions)
- Authentication/authorization of the request (handled by MAL middleware, not this endpoint)
- Frontend UI for displaying claim states
- Logging state queries to CRM activity timeline (future consideration — this is a read operation on a single claim, not a customer-facing interaction event)

---

## Implementation Notes

1. **Route path:** Note the path is `/claim/{claim_id}/state` (singular `claim`), not `/claims/`. This matches the pattern of other detail endpoints in the billing module. However, the existing `claim_status` endpoint uses `/claims/{claim_name}/status`. For consistency, **use `/claims/{claim_id}/state`** (plural `claims`) to match the existing pattern. Update the acceptance criteria accordingly.

2. **`_read_frappe_doc` modification:** The helper function signature change (`site_name` parameter) is backward-compatible since it defaults to `None`. All existing callers continue to work unchanged.

3. **`VALID_TRANSITIONS` import:** This is a dictionary constant. Importing it at module level is fine — it's loaded once and shared. Do not import `transition_state`.

4. **No write operations:** This endpoint must never modify any data in Frappe or any other system. Code review should explicitly verify no calls to `_update_frappe_doc`, `_create_frappe_doc`, or `transition_state`.

5. **OpenAPI documentation:** FastAPI automatically generates OpenAPI docs. The response model `ClaimStateResponse` will appear in the auto-generated schema. Add a meaningful docstring to the endpoint function.

---

## Files to Modify

| File | Change |
|------|--------|
| Billing routes file (containing `router = APIRouter(tags=["billing"])`) | Add `ClaimStateResponse` model, add `get_claim_state` endpoint, add import of `VALID_TRANSITIONS` |
| Same file — `_read_frappe_doc` helper | Add optional `site_name` parameter, pass to Frappe headers if provided |
| Same file — `_frappe_headers` helper | No change required (headers dict is modified per-call in `_read_frappe_doc`) |

---

## Definition of Done

- [ ] Endpoint registered at `GET /api/modules/billing/claims/{claim_id}/state`
- [ ] `ClaimStateResponse` Pydantic model defined
- [ ] `VALID_TRANSITIONS` imported from `sm_billing.state_machine.controller`
- [ ] Empty/whitespace `claim_id` returns 400
- [ ] Missing claim returns 404
- [ ] Terminal states return empty `valid_transitions` list
- [ ] Unknown states (not in `VALID_TRANSITIONS`) return empty list without error
- [ ] `X-Frappe-Site-Name` header is forwarded to Frappe API
- [ ] No write operations performed (no calls to `transition_state`, `_update_frappe_doc`, etc.)
- [ ] Manual test against local Frappe instance confirms all test cases pass