model: model-beta
test: 02-spec-writing
run: B
date: 2026-04-09

```markdown
# BILL-QUERY-001 — Claim State and Valid Transitions Query Endpoint

| Field          | Value                                                        |
|----------------|--------------------------------------------------------------|
| **Story ID**   | BILL-QUERY-001                                               |
| **Title**      | Claim state and valid transitions query endpoint             |
| **Category**   | BACKEND                                                      |
| **Size**       | S                                                            |
| **Depends on** | BILL-010 (state machine controller — already shipped)        |
| **Blocks**     | Any frontend component that renders state badges or "next action" buttons |

---

## 1. Purpose

Add a **read-only** GET endpoint that returns the current `canonical_state` of an SM Claim
document and the list of valid next states the claim may transition to. This endpoint
performs **no writes and no state transitions**. It exists so the React frontend can render
the current claim state and know which transition buttons to show.

---

## 2. Spec Gates

### Gate 1 — Workflow
This endpoint is a **read lens** into the 19-state claim lifecycle workflow defined by
BILL-010. It does not define a new workflow. It exposes the current position and
valid forward edges of the existing state machine to the frontend.

### Gate 2 — CRM Timeline
This endpoint performs no mutation, so it writes nothing to the CRM timeline.
A GET request that returns current state has no event to log.

### Gate 3 — Right Level
This is a universal billing capability. It reads a platform-defined state machine.
No vertical-specific or client-specific logic is involved.

---

## 3. API Contract

### Request

```
GET /api/modules/billing/claim/{claim_id}/state
```

| Component       | Detail                                                                 |
|-----------------|------------------------------------------------------------------------|
| Method          | `GET`                                                                  |
| Path parameter  | `claim_id` — the Frappe `name` of the SM Claim document (e.g. `SM-CLM-00042`) |
| Required header | `X-Frappe-Site-Name` — the Frappe site to query (multi-tenant routing) |
| Auth            | Standard MAL auth (inherited from router middleware)                   |

### Success Response — `200 OK`

```json
{
  "claim_id": "SM-CLM-00042",
  "canonical_state": "submitted",
  "valid_transitions": ["adjudicating", "rejected", "void"]
}
```

| Field               | Type         | Description                                                       |
|---------------------|--------------|-------------------------------------------------------------------|
| `claim_id`          | `str`        | Echo of the requested claim identifier                            |
| `canonical_state`   | `str`        | Current value of the `canonical_state` field on the SM Claim doc  |
| `valid_transitions` | `list[str]`  | States the claim may legally move to next, sourced from `VALID_TRANSITIONS[canonical_state]`. Empty list `[]` if the current state is terminal (no outgoing edges). |

### Error Responses

| Status | Condition                                       | Body                                                                          |
|--------|-------------------------------------------------|-------------------------------------------------------------------------------|
| `400`  | `claim_id` is empty or whitespace-only          | `{"detail": "claim_id is required and must be non-empty"}`                    |
| `404`  | No SM Claim document exists with that name      | `{"detail": "SM Claim 'XYZ' not found"}`                                     |
| `500`  | Unexpected Frappe or server error               | Standard FastAPI error body                                                   |

---

## 4. Pydantic Response Model

Add to the models section of `billing.py`:

```python
class ClaimStateResponse(BaseModel):
    claim_id: str
    canonical_state: str
    valid_transitions: list[str] = []
```

---

## 5. VALID_TRANSITIONS Constant

The state machine controller (`sm_billing.state_machine.controller`) is a Frappe custom app
module. The MAL (FastAPI) runs in a separate process and **cannot** import from `sm_billing`
directly.

**Implementation instruction:** Copy the `VALID_TRANSITIONS` dict from
`sm_billing/state_machine/controller.py` into the MAL billing routes file as a module-level
constant. Place it after the existing constants block (after `PLACE_OF_SERVICE_MAP`),
with a comment citing its source.

The implementing agent **must** open `sm_billing/state_machine/controller.py`, read the
current `VALID_TRANSITIONS` dict, and reproduce it exactly. Do not invent or guess the
transitions. The dict maps every one of the 19 canonical states to a `list[str]` of
valid next states. Terminal states map to `[]`.

```python
# ---------------------------------------------------------------------------
# State machine transitions — authoritative source is
# sm_billing/state_machine/controller.py (BILL-010).
# This is a read-only copy for the MAL query layer.
# If the Frappe-side dict changes, this must be updated to match.
# ---------------------------------------------------------------------------
VALID_TRANSITIONS: dict[str, list[str]] = {
    # ... paste exact contents from sm_billing.state_machine.controller ...
}
```

> **If the implementing agent cannot locate `sm_billing/state_machine/controller.py` or
> the `VALID_TRANSITIONS` export within it, STOP and write a BLOCKED note.
> Do not fabricate the dict.**

---

## 6. Endpoint Implementation

Add the following route to `billing.py`, in the "Endpoints" section, after the existing
`claim_status` endpoint:

```python
from fastapi import Request  # add to existing imports if not present

FRAPPE_SITE_NAME_HEADER = "X-Frappe-Site-Name"


@router.get("/claim/{claim_id}/state", response_model=ClaimStateResponse)
async def get_claim_state(claim_id: str, request: Request):
    """
    Return the current canonical_state of an SM Claim and its valid
    next transitions. Read-only — performs no state change.

    Story: BILL-QUERY-001
    """
    # 1. Validate claim_id
    if not claim_id or not claim_id.strip():
        raise HTTPException(status_code=400, detail="claim_id is required and must be non-empty")

    # 2. Read the SM Claim document from Frappe
    #    Forward X-Frappe-Site-Name header for multi-tenant site resolution.
    site_name = request.headers.get(FRAPPE_SITE_NAME_HEADER)
    headers = _frappe_headers()
    if site_name:
        headers[FRAPPE_SITE_NAME_HEADER] = site_name

    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=headers) as client:
        resp = await client.get(
            f"/api/resource/SM Claim/{claim_id}",
            params={"fields": '["name","canonical_state"]'},
            timeout=15,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"SM Claim '{claim_id}' not found")
        resp.raise_for_status()
        claim = resp.json().get("data", {})

    # 3. Look up current state and valid transitions
    current_state = claim.get("canonical_state", "")
    next_states = VALID_TRANSITIONS.get(current_state, [])

    return ClaimStateResponse(
        claim_id=claim_id,
        canonical_state=current_state,
        valid_transitions=next_states,
    )
```

### Implementation Notes

1. **Do NOT use `_read_frappe_doc` directly.** The existing helper does not forward the
   `X-Frappe-Site-Name` header. This endpoint must construct its own headers dict that
   includes the site name header when present. If a future refactor adds site-name support
   to `_read_frappe_doc`, this endpoint may be simplified — but that refactor is out of
   scope for this story.

2. **Do NOT import or call `transition_state`.** This is a read endpoint. The only import
   from the state machine is the `VALID_TRANSITIONS` dict (copied as a constant, per §5).

3. **Request the minimum fields.** Pass `fields=["name","canonical_state"]` to the Frappe
   API to avoid fetching the full claim document. This is a lightweight query endpoint.

4. **The `Request` import** is needed to access the incoming headers. FastAPI's `Request`
   object is the standard way to read arbitrary headers.

---

## 7. Files Changed

| File | Action | What |
|------|--------|------|
| `modules/billing/billing.py` | MODIFY | Add `ClaimStateResponse` model, `VALID_TRANSITIONS` constant, `FRAPPE_SITE_NAME_HEADER` constant, `get_claim_state` route, `Request` import |

No new files. No database migrations. No Frappe-side changes. No frontend changes.

---

## 8. Acceptance Criteria

All criteria must pass for the story to be marked complete.

| #  | Criterion | Verification |
|----|-----------|-------------|
| AC-1 | `GET /api/modules/billing/claim/{claim_id}/state` returns `200` with `claim_id`, `canonical_state`, and `valid_transitions` for an existing SM Claim | Integration test with a known claim |
| AC-2 | `canonical_state` in the response matches the value stored on the SM Claim document in Frappe | Compare against Frappe API direct read |
| AC-3 | `valid_transitions` is a list of strings matching `VALID_TRANSITIONS[current_state]` | Assert against the known dict |
| AC-4 | If `canonical_state` is a terminal state (no outgoing edges), `valid_transitions` is `[]` | Test with a claim in terminal state (e.g., `written_off`, `void`) |
| AC-5 | Returns `404` with message `"SM Claim '{claim_id}' not found"` when the claim does not exist | Call with a nonexistent name |
| AC-6 | Returns `400` with message `"claim_id is required and must be non-empty"` when `claim_id` is whitespace-only | Call with `%20%20` as claim_id |
| AC-7 | The `X-Frappe-Site-Name` header from the incoming request is forwarded to Frappe | Inspect outgoing Frappe call in test or logs |
| AC-8 | When `X-Frappe-Site-Name` is absent from the incoming request, the endpoint still works (no crash) | Call without the header |
| AC-9 | No mutation occurs — the SM Claim document is unchanged after the call | Read the claim doc before and after; assert identical |
| AC-10 | `transition_state` is never imported or called | Code review / grep |
| AC-11 | `VALID_TRANSITIONS` in `billing.py` exactly matches the dict in `sm_billing/state_machine/controller.py` | Diff the two dicts |
| AC-12 | Response model is `ClaimStateResponse` with correct field types (`str`, `str`, `list[str]`) | Pydantic schema check |

---

## 9. Test Plan

### Unit Tests

```python
# test_claim_state.py

import pytest
from modules.billing.billing import VALID_TRANSITIONS, ClaimStateResponse


def test_valid_transitions_dict_has_all_states():
    """VALID_TRANSITIONS must contain all 19 canonical states."""
    assert len(VALID_TRANSITIONS) == 19


def test_valid_transitions_values_are_lists_of_strings():
    for state, nexts in VALID_TRANSITIONS.items():
        assert isinstance(nexts, list), f"State '{state}' maps to {type(nexts)}, expected list"
        for n in nexts:
            assert isinstance(n, str), f"Transition target '{n}' from '{state}' is not a str"


def test_valid_transitions_targets_are_known_states():
    """Every target state must itself be a key in VALID_TRANSITIONS."""
    all_states = set(VALID_TRANSITIONS.keys())
    for state, nexts in VALID_TRANSITIONS.items():
        for n in nexts:
            assert n in all_states, f"State '{state}' transitions to unknown state '{n}'"


def test_response_model_fields():
    resp = ClaimStateResponse(
        claim_id="SM-CLM-00001",
        canonical_state="draft",
        valid_transitions=["validated", "void"],
    )
    assert resp.claim_id == "SM-CLM-00001"
    assert resp.canonical_state == "draft"
    assert resp.valid_transitions == ["validated", "void"]


def test_response_model_defaults_empty_transitions():
    resp = ClaimStateResponse(claim_id="X", canonical_state="void")
    assert resp.valid_transitions == []
```

### Integration Tests (against running MAL + Frappe)

| Test | Method | Expected |
|------|--------|----------|
| Happy path — existing claim | `GET /api/modules/billing/claim/SM-CLM-00001/state` | `200`, correct state and transitions |
| Not found | `GET /api/modules/billing/claim/DOES-NOT-EXIST/state` | `404` |
| Whitespace claim_id | `GET /api/modules/billing/claim/%20/state` | `400` |
| With site header | Include `X-Frappe-Site-Name: willow.sparkmojo.com` | `200`, same result, header forwarded |
| Without site header | Omit header | `200`, no crash |
| Terminal state claim | Claim with `canonical_state = "void"` | `200`, `valid_transitions: []` |
| Idempotency | Call twice, compare responses | Identical responses, no side effects |

---

## 10. Out of Scope

These items are explicitly **not** part of this story:

- **No state transitions.** This endpoint does not call `transition_state()`.
- **No write operations.** No Frappe documents are created, updated, or deleted.
- **No CRM timeline entry.** Read-only endpoints do not generate timeline events.
- **No frontend changes.** The React component that consumes this endpoint is a separate story.
- **No refactor of `_read_frappe_doc`.** Adding site-name header support to the shared helper is desirable but out of scope. This endpoint constructs its own headers.
- **No caching.** State can change at any time; caching is not appropriate for this endpoint.
- **No batch endpoint.** This returns state for a single claim. Batch queries are a separate story if needed.
- **No new Frappe whitelisted methods.** The endpoint uses the standard Frappe REST API (`/api/resource/SM Claim/{name}`).

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `VALID_TRANSITIONS` dict in MAL drifts from Frappe-side source | Frontend shows incorrect available transitions | AC-11 requires exact match at review time. Future: expose transitions via Frappe API or shared package (out of scope). |
| `canonical_state` on an SM Claim is empty string or null | `VALID_TRANSITIONS.get("")` returns `None` → would return `[]` via default | Acceptable behavior. Empty state = no valid transitions. |
| `canonical_state` contains a value not in `VALID_TRANSITIONS` keys | `VALID_TRANSITIONS.get(unknown)` returns `[]` via default | Acceptable degradation. Endpoint returns empty transitions rather than crashing. Log a warning if this occurs. |

---

## 12. Architectural Compliance

| Rule | Compliance |
|------|-----------|
| React never calls Frappe directly (§4.1) | ✅ Endpoint is on the MAL at `/api/modules/billing/...` |
| Never modify core Frappe/ERPNext (§4.2) | ✅ No Frappe changes |
| SM DocTypes prefixed "SM " (§4.3) | ✅ Reads `SM Claim` |
| No TypeScript (§4.4) | ✅ No frontend changes |
| Frappe Workflow manages internal state; n8n manages external (§4.7) | ✅ This endpoint reads state only; it does not manage it |
| Evaluation order: native Frappe → community app → third-party → custom (§4.12) | ✅ Uses native Frappe REST API to read the document. The transition map is custom but already built (BILL-010). No new custom logic beyond the query. |

---

*Spec written: April 9, 2026. Story is ready for implementation.*
```