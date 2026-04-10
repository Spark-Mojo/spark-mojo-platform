model: model-theta
test: 02-spec-writing
run: B
date: 2026-04-09

# Story Spec: BILL-QUERY-001 - Claim State and Valid Transitions Query Endpoint

## Story Overview
| Field | Value |
|-------|-------|
| **Story ID** | BILL-QUERY-001 |
| **Title** | Claim state and valid transitions query endpoint |
| **Category** | BACKEND |
| **Size** | S |
| **Dependencies** | BILL-010 (state machine controller — already shipped, already in codebase) |
| **Priority** | Medium |
| **Platform Guardrails** | Compliant |

## Context
Healthcare Billing Mojo is built on the Spark Mojo platform. The stack consists of:
- **Frappe/ERPNext backend** - Source of truth for all document data
- **FastAPI abstraction layer (MAL)** at `/api/modules/[capability]/[action]` - All React calls route through this layer
- **React JSX frontend** - Never calls Frappe directly

All custom DocTypes are prefixed "SM ". The `SM Claim` DocType has a field called `canonical_state` (select field with 19 possible values). The state machine controller lives in `sm_billing.state_machine.controller` and exports:
- `VALID_TRANSITIONS: dict[str, list[str]]` — maps each state to its valid next states
- `transition_state(claim_name: str, new_state: str) -> dict` — performs a transition (do NOT call this in a read endpoint)

**This story adds a READ endpoint only.** It does NOT perform any state transitions.

## Acceptance Criteria

### Must Have
1. ✅ **Endpoint**: `GET /api/modules/billing/claim/{claim_id}/state`
2. ✅ **Authentication**: Uses existing Frappe token authentication (via `_frappe_headers()` helper)
3. ✅ **Site Resolution**: Uses `X-Frappe-Site-Name` header (available as `FRAPPE_SITE_NAME_HEADER`) to resolve the correct multi-tenant site
4. ✅ **Document Lookup**: Looks up the SM Claim Frappe document by `claim_id`
5. ✅ **Response Data**: Returns JSON with:
   - `claim_id`: The claim identifier
   - `canonical_state`: Current state value from the document
   - `valid_transitions`: List of valid next states from `VALID_TRANSITIONS[current_state]`
6. ✅ **Error Handling**:
   - Returns `400 Bad Request` if `claim_id` is empty or missing
   - Returns `404 Not Found` if the SM Claim document doesn't exist
   - Returns `500 Internal Server Error` for unexpected failures
7. ✅ **Integration**: Uses existing `_read_frappe_doc()` helper for Frappe API calls
8. ✅ **State Machine**: Imports `VALID_TRANSITIONS` from `sm_billing.state_machine.controller`

### Should Have
1. 🔄 **Performance**: Endpoint should respond within 500ms for typical loads
2. 🔄 **Logging**: Appropriate logging at INFO level for successes, WARN for client errors, ERROR for server failures

### Won't Have
1. ❌ **State Transitions**: This endpoint does NOT change claim state
2. ❌ **Authentication Changes**: Uses existing authentication mechanism
3. ❌ **New Dependencies**: No new Python packages required

## Technical Implementation

### File Location
```
backend/mojo_abstraction_layer/modules/billing/routes.py
```

### Endpoint Signature
```python
@router.get("/claim/{claim_id}/state", response_model=ClaimStateResponse)
async def get_claim_state(
    claim_id: str,
    x_frappe_site_name: Optional[str] = Header(None, alias="X-Frappe-Site-Name")
) -> ClaimStateResponse:
    """
    Get current state and valid transitions for a claim.
    
    Parameters:
    - claim_id: SM Claim document name (required)
    - X-Frappe-Site-Name: Header for multi-tenant site resolution
    
    Returns:
    - JSON with claim_id, canonical_state, and valid_transitions
    
    Raises:
    - HTTPException 400: claim_id is empty or missing
    - HTTPException 404: SM Claim document not found
    """
```

### Pydantic Model
```python
class ClaimStateResponse(BaseModel):
    claim_id: str
    canonical_state: str
    valid_transitions: list[str]
```

### Implementation Details
1. **Import Validation**:
   ```python
   from sm_billing.state_machine.controller import VALID_TRANSITIONS
   ```

2. **Header Processing**:
   - The `X-Frappe-Site-Name` header must be passed through to Frappe API calls
   - Use existing `_frappe_headers()` helper and add site header if present

3. **State Resolution**:
   - Get `canonical_state` from SM Claim document
   - Look up `VALID_TRANSITIONS.get(current_state, [])` for valid next states
   - Handle case where state might not exist in VALID_TRANSITIONS (return empty list)

4. **Error Cases**:
   - Empty claim_id: `raise HTTPException(status_code=400, detail="claim_id is required")`
   - Document not found: `raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found")`

## API Contract

### Request
```
GET /api/modules/billing/claim/{claim_id}/state
Headers:
  Authorization: token {api_key}:{api_secret}
  X-Frappe-Site-Name: {site_name}  # Optional, required for multi-tenant
```

### Successful Response (200 OK)
```json
{
  "claim_id": "CLAIM-2024-001",
  "canonical_state": "validated",
  "valid_transitions": ["submitted", "draft"]
}
```

### Error Responses
```json
// 400 Bad Request
{
  "detail": "claim_id is required"
}

// 404 Not Found  
{
  "detail": "Claim 'CLAIM-2024-999' not found"
}

// 500 Internal Server Error
{
  "detail": "Internal server error"
}
```

## Error Handling Matrix

| Scenario | HTTP Status | Response Detail |
|----------|------------|-----------------|
| Missing claim_id parameter | 400 | "claim_id is required" |
| Empty claim_id string | 400 | "claim_id cannot be empty" |
| SM Claim document not found | 404 | "Claim '{claim_id}' not found" |
| Frappe API timeout | 504 | "Frappe backend timeout" |
| Frappe authentication failure | 502 | "Frappe authentication failed" |
| Unexpected exception | 500 | "Internal server error" |

## Dependencies

### Code Dependencies
1. **BILL-010**: State machine controller (`sm_billing.state_machine.controller`)
   - Already shipped and in codebase
   - Provides `VALID_TRANSITIONS` dictionary

2. **Existing Helpers**:
   - `_frappe_headers()` - Authentication headers
   - `_read_frappe_doc()` - Frappe document lookup
   - Existing error handling patterns

### Platform Dependencies
1. **Multi-tenancy**: Relies on `X-Frappe-Site-Name` header for site resolution
2. **Authentication**: Uses existing Frappe token auth flow
3. **MAL Pattern**: Follows existing `/api/modules/billing/*` routing pattern

## Testing Requirements

### Unit Tests
```python
# test_billing_state_endpoint.py

async def test_get_claim_state_success():
    """Test successful retrieval of claim state and transitions."""
    # Mock Frappe response with canonical_state
    # Verify response contains claim_id, state, and valid_transitions
    
async def test_get_claim_state_not_found():
    """Test 404 when claim doesn't exist."""
    # Mock Frappe 404 response
    # Verify 404 with appropriate message
    
async def test_get_claim_state_empty_id():
    """Test 400 when claim_id is empty."""
    # Call with empty string
    # Verify 400 error
    
async def test_get_claim_state_no_transitions():
    """Test handling of state with no valid transitions."""
    # Mock state not in VALID_TRANSITIONS
    # Verify valid_transitions is empty list
```

### Integration Tests
1. **End-to-end**: Call endpoint → Frappe → Return state + transitions
2. **Multi-tenant**: Verify `X-Frappe-Site-Name` header propagation
3. **Error paths**: Test all error conditions

### Manual Test Cases
1. ✅ Existing claim with valid state
2. ✅ Existing claim with state not in VALID_TRANSITIONS
3. ✅ Non-existent claim ID
4. ✅ Empty claim ID
5. ✅ Missing authentication
6. ✅ With/without `X-Frappe-Site-Name` header

## Notes

### Platform Guardrails Compliance
1. **✅ React never calls Frappe directly**: This endpoint lives in MAL, proper abstraction layer
2. **✅ Custom DocTypes**: Uses `SM Claim` DocType (prefixed correctly)
3. **✅ No core modifications**: Only adds to custom billing module
4. **✅ Evaluation order**: Uses existing Frappe functionality, no new dependencies

### Performance Considerations
- Single Frappe API call per request
- In-memory dictionary lookup for transitions
- Expected response time: < 200ms under normal load

### Security Considerations
- Uses existing token authentication
- No new permissions required
- Read-only endpoint, no state modification

### Future Considerations
- This endpoint may be extended later to include state history
- Could be cached for frequently accessed claims
- May inform frontend UI state (enabled/disabled buttons)

### Implementation Checklist
- [ ] Add import for `VALID_TRANSITIONS`
- [ ] Create `ClaimStateResponse` Pydantic model
- [ ] Implement `get_claim_state` endpoint
- [ ] Add proper error handling
- [ ] Write unit tests
- [ ] Update API documentation
- [ ] Verify multi-tenant header support

---
*Spec Author: Spark Mojo Spec Factory*  
*Last Updated: {current_date}*  
*Platform: Spark Mojo Healthcare Billing*  
*Status: Ready for Implementation*