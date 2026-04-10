model: model-gamma
test: 04-frappe-implementation
run: B
date: 2026-04-09

## Implementation for `abstraction-layer/routes/billing.py`

Add the following imports to the existing imports section at the top of the file:

```python
from fastapi import Header
from fastapi.responses import JSONResponse
from sm_billing.state_machine.controller import transition_state, VALID_TRANSITIONS
```

Add this Pydantic model alongside the existing models:

```python
class ClaimTransitionRequest(BaseModel):
    new_state: Optional[str] = None
```

Add this endpoint at the end of the file (after all existing `@router` endpoints, before the `@webhook_router` endpoints):

```python
# ---------------------------------------------------------------------------
# Claim state transition
# ---------------------------------------------------------------------------

@router.post("/claim/{claim_id}/transition")
async def claim_transition(
    claim_id: str,
    request_body: ClaimTransitionRequest,
    site_name: Optional[str] = Header(None, alias="X-Frappe-Site-Name"),
):
    """
    Transition a claim to a new state via the SM state machine controller.
    
    Assumes:
    - transition_state(claim_name, new_state) returns a dict with keys:
      previous_state, current_state, valid_next_states
    - transition_state raises ValueError(string) when transition is invalid
    - transition_state handles SM Claim State Log creation internally
    - VALID_TRANSITIONS is a dict: {state_name: [list_of_valid_next_states]}
    """
    if not site_name:
        return JSONResponse(status_code=422, content={"error": "site_name header missing"})
    
    if not request_body.new_state:
        return JSONResponse(status_code=400, content={"error": "new_state is required"})
    
    try:
        claim = await _read_frappe_doc("SM Claim", claim_id)
    except HTTPException:
        return JSONResponse(status_code=404, content={"error": "claim not found", "claim_id": claim_id})
    
    current_state = claim.get("canonical_state", "")
    new_state = request_body.new_state
    
    try:
        result = transition_state(claim_id, new_state)
        return JSONResponse(status_code=200, content={
            "claim_id": claim_id,
            "previous_state": result.get("previous_state", current_state),
            "current_state": result.get("current_state", new_state),
            "valid_next_states": result.get("valid_next_states", VALID_TRANSITIONS.get(new_state, []))
        })
    except ValueError:
        valid_next = VALID_TRANSITIONS.get(current_state, [])
        return JSONResponse(status_code=409, content={
            "error": "invalid transition",
            "from_state": current_state,
            "to_state": new_state,
            "valid_transitions": valid_next
        })
```

---

## Tests

```python
"""Tests for claim state transition endpoint (BILL-TRANSITION-001)"""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Adjust import path to match your project structure
from abstraction_layer.routes.billing import router

app = FastAPI()
app.include_router(router, prefix="/api/modules/billing")
client = TestClient(app)


def test_valid_transition_returns_200_with_state_details():
    """Transition draft to ready_to_submit, verify all response fields present."""
    with patch("abstraction_layer.routes.billing._read_frappe_doc", return_value={
        "name": "BILL-001",
        "canonical_state": "draft"
    }) as mock_read, \
    patch("abstraction_layer.routes.billing.transition_state", return_value={
        "previous_state": "draft",
        "current_state": "ready_to_submit",
        "valid_next_states": ["submitted", "rejected"]
    }) as mock_transition:
        response = client.post(
            "/api/modules/billing/claim/BILL-001/transition",
            json={"new_state": "ready_to_submit"},
            headers={"X-Frappe-Site-Name": "willow"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["claim_id"] == "BILL-001"
        assert data["previous_state"] == "draft"
        assert data["current_state"] == "ready_to_submit"
        assert data["valid_next_states"] == ["submitted", "rejected"]
        mock_transition.assert_called_once_with("BILL-001", "ready_to_submit")


def test_invalid_transition_returns_409_with_valid_options():
    """Transition draft to paid, verify 409 and valid_transitions list in response body."""
    valid_transitions_map = {"draft": ["ready_to_submit", "voided"], "ready_to_submit": ["submitted", "rejected"]}
    with patch("abstraction_layer.routes.billing._read_frappe_doc", return_value={
        "name": "BILL-002",
        "canonical_state": "draft"
    }), \
    patch("abstraction_layer.routes.billing.transition_state", side_effect=ValueError("Invalid transition")), \
    patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", valid_transitions_map):
        response = client.post(
            "/api/modules/billing/claim/BILL-002/transition",
            json={"new_state": "paid"},
            headers={"X-Frappe-Site-Name": "willow"}
        )
        assert response.status_code == 409
        data = response.json()
        assert data["error"] == "invalid transition"
        assert data["from_state"] == "draft"
        assert data["to_state"] == "paid"
        assert data["valid_transitions"] == ["ready_to_submit", "voided"]


def test_claim_not_found_returns_404():
    with patch("abstraction_layer.routes.billing._read_frappe_doc", side_effect=HTTPException(status_code=404)):
        response = client.post(
            "/api/modules/billing/claim/NONEXISTENT/transition",
            json={"new_state": "ready_to_submit"},
            headers={"X-Frappe-Site-Name": "willow"}
        )
        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "claim not found"
        assert data["claim_id"] == "NONEXISTENT"


def test_missing_new_state_returns_400():
    response = client.post(
        "/api/modules/billing/claim/BILL-003/transition",
        json={},
        headers={"X-Frappe-Site-Name": "willow"}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"] == "new_state is required"


def test_missing_site_header_returns_422():
    response = client.post(
        "/api/modules/billing/claim/BILL-004/transition",
        json={"new_state": "ready_to_submit"},
        headers={}
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "site_name header missing"


def test_transition_logs_state_change():
    """Verify SM Claim State Log entry created after valid transition.
    
    Assumes: transition_state handles SM Claim State Log creation internally.
    We verify the controller was invoked, which triggers the log entry.
    """
    with patch("abstraction_layer.routes.billing._read_frappe_doc", return_value={
        "name": "BILL-005",
        "canonical_state": "draft"
    }), \
    patch("abstraction_layer.routes.billing.transition_state", return_value={
        "previous_state": "draft",
        "current_state": "ready_to_submit",
        "valid_next_states": ["submitted"]
    }) as mock_transition:
        response = client.post(
            "/api/modules/billing/claim/BILL-005/transition",
            json={"new_state": "ready_to_submit"},
            headers={"X-Frappe-Site-Name": "willow"}
        )
        assert response.status_code == 200
        # Controller invocation implies state log creation per architecture constraint
        mock_transition.assert_called_once_with("BILL-005", "ready_to_submit")
```

### Assumptions Noted
1. `transition_state` returns a dict containing `previous_state`, `current_state`, and `valid_next_states`.
2. `VALID_TRANSITIONS` is a dictionary mapping state names to lists of valid next states.
3. `_read_frappe_doc` raises `HTTPException(status_code=404)` when a document is not found.
4. `transition_state` internally creates the `SM Claim State Log` entry upon successful state change.
5. The router is mounted with prefix `/api/modules/billing` to satisfy the `React calls /api/modules/billing/claim/{claim_id}/transition` contract.