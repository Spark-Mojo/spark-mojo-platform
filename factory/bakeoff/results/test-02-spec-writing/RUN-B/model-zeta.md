model: model-zeta
test: 02-spec-writing
run: B
date: 2026-04-09

 ```markdown
# Story Spec: BILL-QUERY-001

## Header

| Field | Value |
|-------|-------|
| **Story ID** | BILL-QUERY-001 |
| **Title** | Claim state and valid transitions query endpoint |
| **Category** | BACKEND |
| **Size** | S |
| **Status** | Ready for Implementation |
| **Dependencies** | BILL-010 (state machine controller — VALID_TRANSITIONS export available in `sm_billing.state_machine.controller`) |
| **MAL Path** | `GET /api/modules/billing/claim/{claim_id}/state` |
| **DocType** | `SM Claim` |

---

## Context & Constraints

**Platform Context**
- All React calls route through the Mojo Abstraction Layer (MAL). React NEVER calls Frappe directly (Platform Guardrail #1).
- Frappe is configured for multi-tenancy via multi-site (one site per client).
- Custom DocTypes are prefixed `SM ` (e.g., `SM Claim`).
- The state machine controller (`sm_billing.state_machine.controller`) exports:
  - `VALID_TRANSITIONS: dict[str, list[str]]` — maps current state → list of valid next states.
  - `transition_state(claim_name: str, new_state: str) -> dict` — **DO NOT USE IN THIS ENDPOINT**; this is a READ-only operation.

**Story Context**
The billing workflow requires the frontend to display the current canonical state of a claim and the available actions (valid next states) to the user. This endpoint provides that metadata without performing any state mutation.

---

## Acceptance Criteria

1. **Endpoint Existence**: A GET endpoint exists at `/api/modules/billing/claim/{claim_id}/state`.
2. **Site Resolution**: The endpoint uses the `X-Frappe-Site-Name` header to route requests to the correct tenant site.
3. **Validation**: Returns HTTP 400 if `claim_id` is empty or missing.
4. **Document Lookup**: Queries Frappe for `SM Claim` where `name = claim_id`.
5. **Not Found Handling**: Returns HTTP 404 if the `SM Claim` document does not exist.
6. **State Retrieval**: Returns the value of the `canonical_state` field from the claim document.
7. **Transition Lookup**: Returns the list of valid next states by looking up `VALID_TRANSITIONS[canonical_state]`.
8. **Read-Only Guarantee**: The endpoint does not call `transition_state()` or modify the claim document in any way.
9. **Response Contract**: Returns a JSON payload matching the `ClaimStateResponse` schema defined below.

---

## API Specification

### Endpoint
```
GET /api/modules/billing/claim/{claim_id}/state
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `X-Frappe-Site-Name` | Yes | Frappe site identifier for multi-tenancy resolution (e.g., `willow.sparkmojo.com`). Passed through to Frappe API calls. |

### Path Parameters
| Parameter | Type | Validation | Description |
|-----------|------|------------|-------------|
| `claim_id` | string | Non-empty | The Frappe document `name` (primary key) of the SM Claim. |

### Response Model (200 OK)
```python
class ClaimStateResponse(BaseModel):
    claim_id: str                    # The requested claim identifier
    canonical_state: str             # Current state from SM Claim.canonical_state
    valid_next_states: list[str]     # Derived from VALID_TRANSITIONS[canonical_state]
```

### Error Responses
| Status | Condition | Response Body |
|--------|-----------|---------------|
| 400 | `claim_id` is empty string or path param missing | `{"detail": "claim_id is required"}` |
| 404 | `SM Claim` document with `name=claim_id` not found | `{"detail": "SM Claim '{claim_id}' not found"}` |
| 422 | Header `X-Frappe-Site-Name` missing (handled by FastAPI) | FastAPI auto-generated validation error |

---

## Implementation Details

### File Location
Add the endpoint to the existing billing routes file:
`modules/billing/routes/billing_routes.py`

### Imports Required
Add to existing imports in the file:
```python
from sm_billing.state_machine.controller import VALID_TRANSITIONS
from fastapi import Header
```

### Implementation Pattern
Follow the existing `_read_frappe_doc` pattern, but extend to support the site header:

```python
async def _read_frappe_doc_with_site(doctype: str, name: str, site_name: str) -> dict:
    """Read a single doc from Frappe with site header for multi-tenancy."""
    headers = {
        **_frappe_headers(),
        "X-Frappe-Site-Name": site_name,
    }
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=headers) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"{doctype} '{name}' not found")
        resp.raise_for_status()
        return resp.json().get("data", {})
```

### Route Implementation
```python
@router.get(
    "/claim/{claim_id}/state",
    response_model=ClaimStateResponse,
    tags=["billing"]
)
async def get_claim_state(
    claim_id: str,
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name")
):
    """
    Query the current canonical state and valid transitions for a claim.
    
    This is a READ endpoint. It does not perform transitions.
    """
    # Validation
    if not claim_id or not claim_id.strip():
        raise HTTPException(status_code=400, detail="claim_id is required")
    
    # Fetch claim with site resolution
    claim = await _read_frappe_doc_with_site(
        "SM Claim", 
        claim_id, 
        x_frappe_site_name
    )
    
    current_state = claim.get("canonical_state", "")
    
    # Lookup valid transitions from shipped state machine controller
    valid_next = VALID_TRANSITIONS.get(current_state, [])
    
    return ClaimStateResponse(
        claim_id=claim_id,
        canonical_state=current_state,
        valid_next_states=valid_next,
    )
```

### Pydantic Model
Add to the models section of the file:
```python
class ClaimStateResponse(BaseModel):
    claim_id: str
    canonical_state: str
    valid_next_states: list[str]
```

### Key Implementation Notes
1. **Site Header Forwarding**: The `X-Frappe-Site-Name` header must be passed to Frappe in every request. The existing `_frappe_headers()` helper does not include this; create `_read_frappe_doc_with_site` as shown above or modify the pattern appropriately.
2. **VALID_TRANSITIONS Import**: Import at module level. This is a constant dict exported by the already-shipped BILL-010.
3. **No Transition Call**: Explicitly do NOT import or call `transition_state()`.
4. **DocType Name**: Use exact string `"SM Claim"` (with space).
5. **Field Name**: Use exact field name `canonical_state`.

---

## Test Strategy

### Unit Test Scenarios (for implementing agent)
1. **Happy Path**: Valid claim_id with valid state → Returns 200 with correct state and transitions list.
2. **Empty claim_id**: `claim_id=""` → Returns 400.
3. **Missing Document**: Valid claim_id format but no document in Frappe → Returns 404.
4. **Unknown State**: Claim has state not in VALID_TRANSITIONS keys → Returns empty list for `valid_next_states`.
5. **Site Header**: Verify `X-Frappe-Site-Name` header is forwarded to Frappe backend in the HTTP call.

### Integration Test
- End-to-end via MAL: `GET /api/modules/billing/claim/CLM-2024-001/state` with header `X-Frappe-Site-Name: test-site` returns current state and valid moves.

---

## Out of Scope

1. **State Mutation**: This endpoint does not perform transitions. Do not call `transition_state()`.
2. **History/Timeline**: Returning historical state changes is not part of this story (see existing `/claims/{claim_name}/status` for timeline).
3. **Authorization**: Business logic for "can this user perform this transition" is handled at the transition execution layer (BILL-010), not this query layer.
4. **Caching**: No Redis or in-memory caching of VALID_TRANSITIONS or claim state required for this size:S story.
5. **Bulk Queries**: Single claim lookup only; no batch endpoint.

---

## Dependencies Checklist

- [x] **BILL-010**: State machine controller shipped with `VALID_TRANSITIONS` exported.
- [x] **SM Claim DocType**: Exists with `canonical_state` select field (19 values).
- [x] **Multi-site Frappe**: Infrastructure supports `X-Frappe-Site-Name` header resolution.

---

## References

- **Platform Guardrails**: Rule #1 (MAL routing), Rule #3 (SM prefix), Rule #6 (Frappe multi-site).
- **Existing Code Pattern**: `billing_routes.py` (provided in context) for `_frappe_headers()`, `APIRouter` usage, and `SM Claim` doc reading patterns.
- **State Machine Contract**: `sm_billing.state_machine.controller` module (BILL-010).
```

```text
SPARK_MOJO_SPEC_FORMAT: v2.1
SPEC_WRITER: Spec Writer
REVIEW_REQUIRED: True
TARGET_HANDOFF: Backend Implementer
```