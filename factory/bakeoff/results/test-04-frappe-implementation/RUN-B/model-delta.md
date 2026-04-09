model: model-delta
test: 04-frappe-implementation
run: B
date: 2026-04-09


I'll implement the endpoint and tests exactly as specified. No new files. No improvisation.

---

## `abstraction-layer/routes/billing.py` (append to existing file)

Add the following block to the end of the existing `billing.py` file, after the last existing endpoint.

```python
# ---------------------------------------------------------------------------
# BILL-TRANSITION-001: Claim state transition endpoint
# ---------------------------------------------------------------------------
# Depends on BILL-010: sm_billing.state_machine.controller must exist.
# Import raises ImportError at startup if sm_billing is not installed —
# this is intentional; the dependency is hard.
# ---------------------------------------------------------------------------

from sm_billing.state_machine.controller import transition_state, VALID_TRANSITIONS
from fastapi import Header


class ClaimTransitionRequest(BaseModel):
    new_state: Optional[str] = None


class ClaimTransitionResponse(BaseModel):
    claim_id: str
    previous_state: str
    current_state: str
    valid_next_states: list[str]


@router.post(
    "/claim/{claim_id}/transition",
    response_model=ClaimTransitionResponse,
)
async def transition_claim_state(
    claim_id: str,
    req: ClaimTransitionRequest,
    x_frappe_site_name: Optional[str] = Header(default=None, alias="X-Frappe-Site-Name"),
):
    """
    Transition a claim to a new state via the sm_billing state machine.

    POST /api/modules/billing/claim/{claim_id}/transition
    Header: X-Frappe-Site-Name: {site_name}
    Body:   { "new_state": "submitted" }
    """
    # --- 422: site header missing ---
    if not x_frappe_site_name:
        raise HTTPException(status_code=422, detail="site_name header missing")

    # --- 400: new_state body field missing ---
    if not req.new_state:
        raise HTTPException(status_code=400, detail="new_state is required")

    # --- 404: claim not found ---
    # _read_frappe_doc raises HTTPException(404) if Frappe returns 404.
    # We catch it and re-raise with the spec-required shape.
    try:
        claim = await _read_frappe_doc("SM Claim", claim_id)
    except HTTPException as exc:
        if exc.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail={"error": "claim not found", "claim_id": claim_id},
            )
        raise

    previous_state: str = claim.get("canonical_state", "")

    # --- 409: invalid transition (controller raises ValueError) ---
    try:
        transition_state(claim_id, req.new_state)
    except ValueError as exc:
        # VALID_TRANSITIONS is a dict keyed by state: { "draft": ["ready_to_submit", ...], ... }
        # Fall back to empty list if current state is not in the map.
        valid_from_here: list[str] = VALID_TRANSITIONS.get(previous_state, [])
        raise HTTPException(
            status_code=409,
            detail={
                "error": "invalid transition",
                "from_state": previous_state,
                "to_state": req.new_state,
                "valid_transitions": valid_from_here,
            },
        )

    # --- 200: transition succeeded ---
    # Read the claim back to get current_state as persisted by the controller.
    # NOTE: transition_state() is assumed to persist state to Frappe directly.
    # If the controller does not persist and only returns the new state, replace
    # _read_frappe_doc below with whatever the controller returns.
    updated_claim = await _read_frappe_doc("SM Claim", claim_id)
    current_state: str = updated_claim.get("canonical_state", req.new_state)

    valid_next_states: list[str] = VALID_TRANSITIONS.get(current_state, [])

    # --- CRM / state log: write SM Claim State Log entry (Leg 2 contract) ---
    # Spec test test_transition_logs_state_change() verifies this entry exists.
    try:
        await _create_frappe_doc("SM Claim State Log", {
            "doctype": "SM Claim State Log",
            "claim": claim_id,
            "from_state": previous_state,
            "to_state": current_state,
            "site_name": x_frappe_site_name,
            "transitioned_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception as log_exc:
        # Log failure must never break the 200 response.
        # The transition already succeeded; logging is best-effort here.
        logger.error(
            "Failed to create SM Claim State Log for claim %s: %s",
            claim_id,
            log_exc,
        )

    return ClaimTransitionResponse(
        claim_id=claim_id,
        previous_state=previous_state,
        current_state=current_state,
        valid_next_states=valid_next_states,
    )
```

---

## `abstraction-layer/tests/test_billing_transition.py` (new test file)

```python
"""
Tests for BILL-TRANSITION-001: POST /api/modules/billing/claim/{claim_id}/transition

All 6 required tests. Mocks:
  - _read_frappe_doc  (SM Claim reads)
  - _create_frappe_doc (SM Claim State Log writes)
  - transition_state  (sm_billing state machine controller)
  - VALID_TRANSITIONS (sm_billing state machine controller)
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# App bootstrap — adjust import path to match your actual entrypoint.
# ---------------------------------------------------------------------------
from main import app  # noqa: E402  — assumes app = FastAPI() lives in main.py

client = TestClient(app)

TRANSITION_URL = "/api/modules/billing/claim/{claim_id}/transition"

SITE_HEADER = {"X-Frappe-Site-Name": "willow.sparkmojo.com"}

# ---------------------------------------------------------------------------
# Shared claim fixtures
# ---------------------------------------------------------------------------

DRAFT_CLAIM = {
    "name": "CLM-DRAFT-001",
    "canonical_state": "draft",
    "patient_control_number": "PCN001",
}

READY_CLAIM = {
    "name": "CLM-READY-001",
    "canonical_state": "ready_to_submit",
    "patient_control_number": "PCN002",
}

# VALID_TRANSITIONS fixture — mirrors what sm_billing.state_machine.controller exposes.
# Defined here so tests can assert on the exact values returned in 409 bodies.
MOCK_VALID_TRANSITIONS = {
    "draft": ["ready_to_submit", "cancelled"],
    "ready_to_submit": ["submitted", "draft", "cancelled"],
    "submitted": ["acknowledged", "rejected"],
    "acknowledged": ["adjudicating", "rejected"],
    "adjudicating": ["paid", "partial_paid", "denied"],
    "paid": ["written_off"],
    "partial_paid": ["paid", "denied", "written_off"],
    "denied": ["appealing", "written_off"],
    "appealing": ["paid", "denied", "written_off"],
    "rejected": ["draft", "cancelled"],
    "cancelled": [],
    "written_off": [],
}


# ---------------------------------------------------------------------------
# Helper: build patched environment for every test
# ---------------------------------------------------------------------------

def _patch_controller(valid_transitions=None, raises_value_error=False):
    """Return a dict of patches to apply with @patch or patch()."""
    vt = valid_transitions if valid_transitions is not None else MOCK_VALID_TRANSITIONS
    return vt, raises_value_error


# ---------------------------------------------------------------------------
# Test 1: valid transition returns 200 with all state detail fields
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_valid_transition_returns_200_with_state_details():
    """
    Transition draft -> ready_to_submit.
    Verify: 200, claim_id, previous_state, current_state, valid_next_states all present.
    """
    claim_id = "CLM-DRAFT-001"

    # _read_frappe_doc is called twice: once before transition, once after.
    claim_before = {**DRAFT_CLAIM}
    claim_after = {**DRAFT_CLAIM, "canonical_state": "ready_to_submit"}

    with (
        patch(
            "routes.billing.VALID_TRANSITIONS",
            MOCK_VALID_TRANSITIONS,
        ),
        patch(
            "routes.billing.transition_state",
            return_value=None,  # controller persists state; return value unused
        ),
        patch(
            "routes.billing._read_frappe_doc",
            new=AsyncMock(side_effect=[claim_before, claim_after]),
        ),
        patch(
            "routes.billing._create_frappe_doc",
            new=AsyncMock(return_value={"name": "SMCSL-001"}),
        ),
    ):
        response = client.post(
            TRANSITION_URL.format(claim_id=claim_id),
            json={"new_state": "ready_to_submit"},
            headers=SITE_HEADER,
        )

    assert response.status_code == 200
    body = response.json()

    # All four required fields must be present
    assert "claim_id" in body
    assert "previous_state" in body
    assert "current_state" in body
    assert "valid_next_states" in body

    # Values
    assert body["claim_id"] == claim_id
    assert body["previous_state"] == "draft"
    assert body["current_state"] == "ready_to_submit"
    assert set(body["valid_next_states"]) == set(MOCK_VALID_TRANSITIONS["ready_to_submit"])


# ---------------------------------------------------------------------------
# Test 2: invalid transition returns 409 with valid_transitions list
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invalid_transition_returns_409_with_valid_options():
    """
    Attempt draft -> paid (illegal).
    Verify: 409, error key, from_state, to_state, valid_transitions list.
    """
    claim_id = "CLM-DRAFT-001"

    with (
        patch(
            "routes.billing.VALID_TRANSITIONS",
            MOCK_VALID_TRANSITIONS,
        ),
        patch(
            "routes.billing.transition_state",
            side_effect=ValueError("Transition from draft to paid is not permitted"),
        ),
        patch(
            "routes.billing._read_frappe_doc",
            new=AsyncMock(return_value={**DRAFT_CLAIM}),
        ),
        patch(
            "routes.billing._create_frappe_doc",
            new=AsyncMock(return_value={}),
        ),
    ):
        response = client.post(
            TRANSITION_URL.format(claim_id=claim_id),
            json={"new_state": "paid"},
            headers=SITE_HEADER,
        )

    assert response.status_code == 409
    body = response.json()

    # FastAPI wraps HTTPException detail in a "detail" key
    detail = body.get("detail", body)

    assert detail["error"] == "invalid transition"
    assert detail["from_state"] == "draft"
    assert detail["to_state"] == "paid"
    assert isinstance(detail["valid_transitions"], list)
    # Must contain exactly the valid transitions from draft
    assert set(detail["valid_transitions"]) == set(MOCK_VALID_TRANSITIONS["draft"])


# ---------------------------------------------------------------------------
# Test 3: claim not found returns 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_claim_not_found_returns_404():
    """
    Supply a claim_id that does not exist in Frappe.
    Verify: 404, error key, claim_id echoed back.
    """
    claim_id = "CLM-DOES-NOT-EXIST"

    with (
        patch(
            "routes.billing.VALID_TRANSITIONS",
            MOCK_VALID_TRANSITIONS,
        ),
        patch(
            "routes.billing.transition_state",
            return_value=None,
        ),
        patch(
            "routes.billing._read_frappe_doc",
            new=AsyncMock(
                side_effect=Exception("Simulated Frappe 404")
            ),
        ),
    ):
        # Patch _read_frappe_doc to raise HTTPException(404) as the real
        # implementation does when Frappe returns 404.
        from fastapi import HTTPException as _HTTPException

        with patch(
            "routes.billing._read_frappe_doc",
            new=AsyncMock(
                side_effect=_HTTPException(status_code=404, detail="SM Claim not found")
            ),
        ):
            response = client.post(
                TRANSITION_URL.format(claim_id=claim_id),
                json={"new_state": "ready_to_submit"},
                headers=SITE_HEADER,
            )

    assert response.status_code == 404
    body = response.json()
    detail = body.get("detail", body)

    assert detail["error"] == "claim not found"
    assert detail["claim_id"] == claim_id


# ---------------------------------------------------------------------------
# Test 4: missing new_state body field returns 400
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_new_state_returns_400():
    """
    Send a body with no new_state key.
    Verify: 400, error message.
    """
    claim_id = "CLM-DRAFT-001"

    with (
        patch(
            "routes.billing.VALID_TRANSITIONS",
            MOCK_VALID_TRANSITIONS,
        ),
        patch(
            "routes.billing._read_frappe_doc",
            new=AsyncMock(return_value={**DRAFT_CLAIM}),
        ),
        patch(
            "routes.billing._create_frappe_doc",
            new=AsyncMock(return_value={}),
        ),
    ):
        response = client.post(
            TRANSITION_URL.format(claim_id=claim_id),
            json={},  # no new_state
            headers=SITE_HEADER,
        )

    assert response.status_code == 400
    body = response.json()
    detail = body.get("detail", body)
    assert detail == "new_state is required"


# ---------------------------------------------------------------------------
# Test 5: missing site header returns 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_site_header_returns_422():
    """
    Send request without X-Frappe-Site-Name header.
    Verify: 422, error message.
    """
    claim_id = "CLM-DRAFT-001"

    response = client.post(
        TRANSITION_URL.format(claim_id=claim_id),
        json={"new_state": "ready_to_submit"},
        # No headers — X-Frappe-Site-Name deliberately omitted
    )

    assert response.status_code == 422
    body = response.json()
    detail = body.get("detail", body)
    assert detail == "site_name header missing"


# ---------------------------------------------------------------------------
# Test 6: valid transition logs SM Claim State Log entry
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_transition_logs_state_change():
    """
    After a valid transition, verify _create_frappe_doc was called with
    doctype == 'SM Claim State Log' and correct from_state / to_state values.
    """
    claim_id = "CLM-DRAFT-001"

    claim_before = {**DRAFT_CLAIM}
    claim_after = {**DRAFT_CLAIM, "canonical_state": "ready_to_submit"}

    mock_create = AsyncMock(return_value={"name": "SMCSL-002"})

    with (
        patch(
            "routes.billing.VALID_TRANSITIONS",
            MOCK_VALID_TRANSITIONS,
        ),
        patch(
            "routes.billing.transition_state",
            return_value=None,
        ),
        patch(
            "routes.billing._read_frappe_doc",
            new=AsyncMock(side_effect=[claim_before, claim_after]),
        ),
        patch(
            "routes.billing._create_frappe_doc",
            new=mock_create,
        ),
    ):
        response = client.post(
            TRANSITION_URL.format(claim_id=claim_id),
            json={"new_state": "ready_to_submit"},
            headers=SITE_HEADER,
        )

    assert response.status_code == 200

    # _create_frappe_doc must have been called at least once with SM Claim State Log
    create_calls = mock_create.call_args_list
    log_calls = [
        call for call in create_calls
        if call.args and call.args[0] == "SM Claim State Log"
        or (call.kwargs.get("doctype") == "SM Claim State Log")
        # Handle positional: _create_frappe_doc("SM Claim State Log", {...})
        or (len(call.args) >= 2 and call.args[1].get("doctype") == "SM Claim State Log")
    ]

    assert len(log_calls) >= 1, (
        "Expected _create_frappe_doc to be called with 'SM Claim State Log'. "
        f"Actual calls: {create_calls}"
    )

    # Pull the data dict from however _create_frappe_doc was called
    log_call = log_calls[0]
    log_data = log_call.args[1] if len(log_call.args) >= 2 else log_call.kwargs.get("data", {})

    assert log_data.get("claim") == claim_id
    assert log_data.get("from_state") == "draft"
    assert log_data.get("to_state") == "ready_to_submit"
    assert log_data.get("site_name") == SITE_HEADER["X-Frappe-Site-Name"]
```

---

<details>
<summary>Implementation decisions and assumptions</summary>

### Assumptions (where spec was silent)

| # | Assumption | Rationale |
|---|---|---|
| 1 | `transition_state(claim_id, new_state)` takes the claim name as its first argument, matching the controller signature described in the spec. | Spec says `transition_state(claim_name, new_state)`. |
| 2 | `VALID_TRANSITIONS` is a `dict[str, list[str]]` keyed by **from-state**, value is the list of reachable states. | The 409 response shape requires `valid_transitions` from the current state. This is the only dict shape that makes the spec internally consistent. |
| 3 | `transition_state()` persists the state change to Frappe directly (inside `sm_billing`). The MAL reads the claim back after the call to get `current_state` from Frappe, not from the controller's return value. | If the controller instead returns the new state without persisting, replace the second `_read_frappe_doc` call with `current_state = req.new_state`. A comment marks this spot in the code. |
| 4 | `SM Claim State Log` is an existing Frappe DocType (created under BILL-010 or the state machine work). The spec test name `test_transition_logs_state_change` and the phrase "SM Claim State Log entry created" imply it already exists. | If it doesn't exist yet, `_create_frappe_doc` will return a Frappe 404 — the `try/except` around the log write absorbs this so the 200 response still succeeds. |
| 5 | The `from sm_billing...` import is placed at the **module level** of `billing.py` (top of the appended block). This means a missing `sm_billing` package causes startup failure, not a runtime 500. | Hard dependency declared in spec via DEPENDENCIES field. |
| 6 | `Header(alias="X-Frappe-Site-Name")` is used because FastAPI normalises header names to lowercase with underscores. The alias preserves the exact header name the spec requires. | FastAPI docs — header parameter aliases are required for hyphenated names. |
| 7 | The test file import is `from main import app`. This must be adjusted if the FastAPI app entrypoint has a different module name in this project. | The spec does not name the entrypoint module. |
| 8 | `@pytest.mark.asyncio` decorators are included because the production functions are `async`. Tests use `TestClient` (sync) so the decorator is a no-op in practice but is present for correctness if the test runner is swapped to `httpx.AsyncClient`. | Defensive — no harm either way. |

</details>