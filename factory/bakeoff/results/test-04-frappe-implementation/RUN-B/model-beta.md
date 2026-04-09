model: model-beta
test: 04-frappe-implementation
run: B
date: 2026-04-09

## Implementation

### `abstraction-layer/routes/billing.py` — Additions

Add to the existing import line and add new imports near the top of the file:

```python
# MODIFY existing import — add Request
from fastapi import APIRouter, HTTPException, Query, Request

# ADD new imports
from fastapi.responses import JSONResponse
from sm_billing.state_machine.controller import transition_state, VALID_TRANSITIONS
```

Add this endpoint **after** the `get_denial` endpoint and **before** the `webhook_router` endpoints:

```python
# ---------------------------------------------------------------------------
# BILL-TRANSITION-001 — Claim state transition
# ---------------------------------------------------------------------------


@router.post("/claim/{claim_id}/transition")
async def claim_state_transition(claim_id: str, request: Request):
    """
    Transition an SM Claim to a new state via the state machine controller.

    Assumes:
    - Site context (multi-site routing) is handled by infrastructure / middleware
      using the X-Frappe-Site-Name header. The controller's transition_state()
      is called directly; it does not accept site_name as a parameter.
    - transition_state() is synchronous (Frappe ORM). Blocking call is acceptable
      at current scale; wrap in run_in_executor if profiling shows contention.
    - VALID_TRANSITIONS is dict[str, list[str]] mapping each state to its valid
      target states.
    """
    # 1. Validate X-Frappe-Site-Name header
    site_name = request.headers.get("X-Frappe-Site-Name")
    if not site_name:
        return JSONResponse(
            status_code=422,
            content={"error": "site_name header missing"},
        )

    # 2. Validate request body
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "new_state is required"},
        )

    new_state = body.get("new_state")
    if not new_state:
        return JSONResponse(
            status_code=400,
            content={"error": "new_state is required"},
        )

    # 3. Verify claim exists and capture current state
    try:
        claim = await _read_frappe_doc("SM Claim", claim_id)
    except HTTPException as exc:
        if exc.status_code == 404:
            return JSONResponse(
                status_code=404,
                content={"error": "claim not found", "claim_id": claim_id},
            )
        raise

    previous_state = claim.get("canonical_state", "")

    # 4. Attempt state transition via controller (BILL-010)
    try:
        transition_state(claim_id, new_state)
    except ValueError:
        valid = VALID_TRANSITIONS.get(previous_state, [])
        return JSONResponse(
            status_code=409,
            content={
                "error": "invalid transition",
                "from_state": previous_state,
                "to_state": new_state,
                "valid_transitions": valid,
            },
        )

    # 5. Log state change to SM Claim State Log
    await _create_frappe_doc("SM Claim State Log", {
        "doctype": "SM Claim State Log",
        "claim": claim_id,
        "from_state": previous_state,
        "to_state": new_state,
        "transitioned_at": datetime.now(timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
    })

    # 6. Return success with state details
    valid_next_states = VALID_TRANSITIONS.get(new_state, [])

    return {
        "claim_id": claim_id,
        "previous_state": previous_state,
        "current_state": new_state,
        "valid_next_states": valid_next_states,
    }
```

---

### `tests/test_claim_transition.py` — New File

```python
"""
Tests for BILL-TRANSITION-001: Claim state transition endpoint.

Run: pytest tests/test_claim_transition.py -v
"""
import sys
from unittest.mock import MagicMock

# ---------------------------------------------------------------------------
# Pre-import mocks: sm_billing lives in the Frappe bench and connectors.stedi
# is a MAL-internal connector — neither is available in the isolated test env.
# Stub them at sys.modules level before routes.billing is imported.
# ---------------------------------------------------------------------------
VALID_TRANSITIONS_FIXTURE = {
    "draft": ["ready_to_submit"],
    "ready_to_submit": ["submitted"],
    "submitted": ["acknowledged", "rejected"],
    "acknowledged": ["adjudicating"],
    "paid": [],
}

_sm_controller = MagicMock()
_sm_controller.transition_state = MagicMock()
_sm_controller.VALID_TRANSITIONS = VALID_TRANSITIONS_FIXTURE

for _mod in (
    "sm_billing",
    "sm_billing.state_machine",
    "sm_billing.state_machine.controller",
    "connectors",
    "connectors.stedi",
):
    sys.modules.setdefault(_mod, MagicMock())

# Override the controller mock explicitly (setdefault may not replace an
# existing MagicMock that was auto-created by the parent package mock).
sys.modules["sm_billing.state_machine.controller"] = _sm_controller

# ---------------------------------------------------------------------------
# Safe to import application code now
# ---------------------------------------------------------------------------
import pytest  # noqa: E402
from unittest.mock import patch, AsyncMock  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from routes.billing import router  # noqa: E402

# ---------------------------------------------------------------------------
# Test app & client
# ---------------------------------------------------------------------------
_app = FastAPI()
_app.include_router(router, prefix="/api/modules/billing")
client = TestClient(_app)

SITE_HEADER = {"X-Frappe-Site-Name": "test-site"}
ENDPOINT = "/api/modules/billing/claim/{claim_id}/transition"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@patch("routes.billing._create_frappe_doc", new_callable=AsyncMock)
@patch("routes.billing.transition_state")
@patch("routes.billing._read_frappe_doc", new_callable=AsyncMock)
def test_valid_transition_returns_200_with_state_details(
    mock_read,
    mock_transition,
    mock_create,
):
    """AC-1, AC-2: Valid transition returns 200 with all state fields."""
    mock_read.return_value = {"canonical_state": "draft"}
    mock_transition.return_value = None
    mock_create.return_value = {"name": "LOG-001"}

    resp = client.post(
        ENDPOINT.format(claim_id="CLM-001"),
        json={"new_state": "ready_to_submit"},
        headers=SITE_HEADER,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["claim_id"] == "CLM-001"
    assert data["previous_state"] == "draft"
    assert data["current_state"] == "ready_to_submit"
    assert data["valid_next_states"] == ["submitted"]
    mock_transition.assert_called_once_with("CLM-001", "ready_to_submit")


@patch("routes.billing._create_frappe_doc", new_callable=AsyncMock)
@patch("routes.billing.transition_state")
@patch("routes.billing._read_frappe_doc", new_callable=AsyncMock)
def test_invalid_transition_returns_409_with_valid_options(
    mock_read,
    mock_transition,
    mock_create,
):
    """AC-3: Invalid transition returns 409 with valid_transitions list."""
    mock_read.return_value = {"canonical_state": "draft"}
    mock_transition.side_effect = ValueError(
        "Cannot transition from draft to paid"
    )

    resp = client.post(
        ENDPOINT.format(claim_id="CLM-001"),
        json={"new_state": "paid"},
        headers=SITE_HEADER,
    )

    assert resp.status_code == 409
    data = resp.json()
    assert data["error"] == "invalid transition"
    assert data["from_state"] == "draft"
    assert data["to_state"] == "paid"
    assert isinstance(data["valid_transitions"], list)
    assert data["valid_transitions"] == ["ready_to_submit"]
    mock_create.assert_not_called()


@patch("routes.billing._create_frappe_doc", new_callable=AsyncMock)
@patch("routes.billing.transition_state")
@patch("routes.billing._read_frappe_doc", new_callable=AsyncMock)
def test_claim_not_found_returns_404(
    mock_read,
    mock_transition,
    mock_create,
):
    """AC-4: Missing claim returns 404 with claim_id."""
    mock_read.side_effect = HTTPException(
        status_code=404, detail="SM Claim 'CLM-999' not found"
    )

    resp = client.post(
        ENDPOINT.format(claim_id="CLM-999"),
        json={"new_state": "ready_to_submit"},
        headers=SITE_HEADER,
    )

    assert resp.status_code == 404
    data = resp.json()
    assert data["error"] == "claim not found"
    assert data["claim_id"] == "CLM-999"
    mock_transition.assert_not_called()
    mock_create.assert_not_called()


@patch("routes.billing._create_frappe_doc", new_callable=AsyncMock)
@patch("routes.billing.transition_state")
@patch("routes.billing._read_frappe_doc", new_callable=AsyncMock)
def test_missing_new_state_returns_400(
    mock_read,
    mock_transition,
    mock_create,
):
    """AC-5: Missing new_state field returns 400."""
    resp = client.post(
        ENDPOINT.format(claim_id="CLM-001"),
        json={},
        headers=SITE_HEADER,
    )

    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "new_state is required"
    mock_read.assert_not_called()
    mock_transition.assert_not_called()
    mock_create.assert_not_called()


def test_missing_site_header_returns_422():
    """AC-6: Missing X-Frappe-Site-Name header returns 422."""
    resp = client.post(
        ENDPOINT.format(claim_id="CLM-001"),
        json={"new_state": "submitted"},
        # No X-Frappe-Site-Name header
    )

    assert resp.status_code == 422
    data = resp.json()
    assert data["error"] == "site_name header missing"


@patch("routes.billing._create_frappe_doc", new_callable=AsyncMock)
@patch("routes.billing.transition_state")
@patch("routes.billing._read_frappe_doc", new_callable=AsyncMock)
def test_transition_logs_state_change(
    mock_read,
    mock_transition,
    mock_create,
):
    """Verify SM Claim State Log entry created after valid transition."""
    mock_read.return_value = {"canonical_state": "ready_to_submit"}
    mock_transition.return_value = None
    mock_create.return_value = {"name": "LOG-002"}

    resp = client.post(
        ENDPOINT.format(claim_id="CLM-001"),
        json={"new_state": "submitted"},
        headers=SITE_HEADER,
    )

    assert resp.status_code == 200

    # Verify _create_frappe_doc was called exactly once for the state log
    mock_create.assert_called_once()
    call_args = mock_create.call_args
    doctype_arg = call_args[0][0]
    doc_data = call_args[0][1]

    assert doctype_arg == "SM Claim State Log"
    assert doc_data["doctype"] == "SM Claim State Log"
    assert doc_data["claim"] == "CLM-001"
    assert doc_data["from_state"] == "ready_to_submit"
    assert doc_data["to_state"] == "submitted"
    assert "transitioned_at" in doc_data
```