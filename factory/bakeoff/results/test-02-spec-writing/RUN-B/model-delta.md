model: model-delta
test: 02-spec-writing
run: B
date: 2026-04-09

```markdown
# Story Spec: BILL-QUERY-001
## Claim State and Valid Transitions Query Endpoint

**Story ID:** BILL-QUERY-001
**Title:** Claim state and valid transitions query endpoint
**Category:** BACKEND
**Size:** S
**Status:** Ready for build
**Spec authored:** 2026-04-09
**Depends on:** BILL-010 — state machine controller (`sm_billing.state_machine.controller`), shipped, in codebase

---

## 1. What This Story Delivers

A single, **read-only** `GET` endpoint on the MAL billing router that:

1. Accepts a claim identifier as a URL path parameter
2. Fetches the `canonical_state` of the corresponding `SM Claim` document from Frappe
3. Returns that state
4. Returns the list of valid next states for that claim, derived from `VALID_TRANSITIONS` in
   the existing state machine controller

**This endpoint performs zero writes to any system.** It does not call `transition_state()`.
It does not modify Frappe documents. It does not log anything.

The consumer of this endpoint is React: it calls this endpoint when rendering the claim detail
view to know which action buttons (e.g., "Submit", "Write Off", "Appeal") are valid to show
for the current claim state. All transition logic lives server-side; React is never given the
full `VALID_TRANSITIONS` map.

---

## 2. Platform Gates (Mandatory — Answer All Three)

### Gate 1 — Workflow

This endpoint is the **observation layer** of the 19-state claim lifecycle defined in BILL-010.
It answers the question "where is this claim and where can it go next?" without moving it
anywhere. It does not introduce a new workflow. It serves an existing workflow by making the
current position and available transitions queryable over HTTP. Gate 1 passes.

### Gate 2 — CRM Timeline

This endpoint is a read operation. **It writes nothing to any system, including the CRM
timeline.** Justification: reading claim state is not a business event. CRM timeline writes
occur on state transitions (a `transition_state()` call that changes a claim's lifecycle
position is a business event). That write belongs in the transition story, not here. Gate 2
passes with justification.

### Gate 3 — Right Level

`SM Claim` and `VALID_TRANSITIONS` already exist. This story adds a thin HTTP wrapper
over two already-built things: a Frappe document field and a Python dict. No new capability,
no new vertical-specific logic, no new DocType, no new module. Correct level. Gate 3 passes.

---

## 3. One File, No More

**Modify exactly one file:**

```
abstraction-layer/routers/billing.py
```

This is the file provided in full as context for this spec. All changes described below go
into this file. Do not create a new file. Do not create a new router. Do not create a new
module. Add all new code to the existing file in the locations specified below.

---

## 4. Endpoint Specification

| Property | Value |
|---|---|
| Method | `GET` |
| Full URL | `GET /api/modules/billing/claim/{claim_id}/state` |
| Path parameter | `claim_id` — the Frappe `name` (document ID) of the SM Claim, e.g. `CLM-0001` |
| Router | The existing `router` object in `billing.py` |
| Response model | `ClaimStateResponse` (defined in Section 6 below) |
| Request body | None |
| Side effects | None |
| Auth | Inherits MAL-layer authentication — no change required in this story |

> **Note on URL path prefix:** The existing billing router uses the plural `/claims/` prefix
> for collection-level and resource-level endpoints (e.g., `/claims/submit`,
> `/claims/{claim_name}/status`). This story's brief specifies the **singular** `/claim/`
> prefix. Both forms are valid on the same `APIRouter` — FastAPI resolves routes
> independently. The singular form is implemented as specified.

---

## 5. Code Changes — Exact Instructions

### 5.1 Modify the `fastapi` Import Line

The existing import is:

```python
from fastapi import APIRouter, HTTPException, Query
```

Change it to:

```python
from fastapi import APIRouter, HTTPException, Query, Request
```

`Request` is needed to read incoming HTTP headers in the route handler.

---

### 5.2 Add the State Machine Import

Add the following import alongside the existing `import` block at the top of `billing.py`:

```python
from sm_billing.state_machine.controller import VALID_TRANSITIONS
```

`VALID_TRANSITIONS` is a `dict[str, list[str]]` defined in BILL-010 that maps each
`canonical_state` string to the list of valid next state strings.

> **Do not import `transition_state`.** This endpoint does not perform transitions.
> If `transition_state` appears anywhere in the code written for this story, that is a bug.

---

### 5.3 Add Header Constant

Add this constant near the other environment variable declarations at the top of `billing.py`
(alongside `FRAPPE_URL`, `FRAPPE_API_KEY`, etc.):

```python
FRAPPE_SITE_NAME_HEADER = "X-Frappe-Site-Name"
```

---

### 5.4 Add the Pydantic Response Model

Add the following model in the `# Pydantic models` section of `billing.py`, after the
existing models:

```python
class ClaimStateResponse(BaseModel):
    claim_id: str
    canonical_state: str
    valid_transitions: list[str]
```

| Field | Type | Description |
|---|---|---|
| `claim_id` | `str` | The claim document name as received in the URL path parameter |
| `canonical_state` | `str` | The current value of the `canonical_state` field on the SM Claim doc |
| `valid_transitions` | `list[str]` | Valid next states per `VALID_TRANSITIONS[canonical_state]`. Empty list `[]` if the current state has no outbound transitions or is not present in the map — this is not an error condition. |

---

### 5.5 Add the Route

Add the following route to the existing `router` object. Place it immediately after the
existing `/claims/{claim_name}/status` route block.

```python
@router.get("/claim/{claim_id}/state", response_model=ClaimStateResponse)
async def get_claim_state(claim_id: str, request: Request):
    """
    Return the current canonical_state of an SM Claim and its valid next states.

    Read-only. Does not call transition_state(). Does not modify any document.
    Forwards X-Frappe-Site-Name header to Frappe to resolve the correct tenant site.

    Returns 400 if claim_id is blank.
    Returns 404 if no SM Claim document exists with the given name.
    """
    # 1. Validate — claim_id must not be blank.
    #    In practice FastAPI path routing prevents a genuinely empty segment from
    #    reaching this handler, but this guard satisfies the story requirement and
    #    defends against URL-encoded whitespace edge cases.
    if not claim_id or not claim_id.strip():
        raise HTTPException(status_code=400, detail="claim_id must not be empty")

    # 2. Build Frappe request headers.
    #    Forward X-Frappe-Site-Name if present so Frappe routes to the correct
    #    tenant site. Absent header = default FRAPPE_URL site routing applies.
    headers = _frappe_headers()
    site_name = request.headers.get(FRAPPE_SITE_NAME_HEADER)
    if site_name:
        headers[FRAPPE_SITE_NAME_HEADER] = site_name

    # 3. Fetch the SM Claim document from Frappe.
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=headers) as client:
        resp = await client.get(f"/api/resource/SM Claim/{claim_id}", timeout=15)
        if resp.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"SM Claim '{claim_id}' not found",
            )
        resp.raise_for_status()
        doc = resp.json().get("data", {})

    # 4. Read canonical_state — return as-is from Frappe, no normalisation.
    current_state: str = doc.get("canonical_state", "")

    # 5. Resolve valid transitions.
    #    .get() with default [] handles any unrecognised or empty state cleanly.
    valid_next: list[str] = VALID_TRANSITIONS.get(current_state, [])

    return ClaimStateResponse(
        claim_id=claim_id,
        canonical_state=current_state,
        valid_transitions=valid_next,
    )
```

#### Why Not Use `_read_frappe_doc()`?

`_read_frappe_doc(doctype, name)` builds headers internally via `_frappe_headers()` and
accepts no `headers` argument. This endpoint **must** forward `X-Frappe-Site-Name` to Frappe
to support multi-tenant routing. The inline `httpx` call mirrors the pattern that
`_read_frappe_doc()` uses internally. Do **not** modify `_read_frappe_doc()` as part of this
story — that refactor is out of scope.

---

## 6. Multi-site Header Behaviour

The Spark Mojo platform is Frappe multi-site: every tenant has an isolated Frappe site.
React includes `X-Frappe-Site-Name: {site_name}` on every MAL request so the MAL can
identify which site the call belongs to.

This endpoint must propagate that header to Frappe so incoming API calls are routed to
the correct tenant site. The precise mechanism by which Frappe's nginx config consumes
the header is a deployment concern outside this story's scope. Forward the header value
exactly as received.

If the header is absent from the incoming request: proceed without it. Do not raise an
error. Frappe resolves the site via its default routing for the configured `FRAPPE_URL`.

---

## 7. Error Response Table

| Condition | HTTP Status | `detail` |
|---|---|---|
| `claim_id` is blank or whitespace | `400` | `"claim_id must not be empty"` |
| `claim_id` path segment absent from URL | `422` | FastAPI automatic — path param is required by route definition |
| SM Claim document not found in Frappe | `404` | `"SM Claim '{claim_id}' not found"` |
| Frappe returns any other non-2xx | `500` | Propagated by `resp.raise_for_status()` |
| `canonical_state` is blank or unrecognised | `200` | `valid_transitions` is `[]` — **not an error** |

---

## 8. Explicit Non-behaviours

These are in-scope adjacent concerns that are **not** part of this story.
If an implementing agent finds themselves doing any of the following, stop — it is out of scope.

| Thing | Why not in scope |
|---|---|
| Calling `transition_state()` | This is a read endpoint. Transition is a separate story. |
| Returning any claim field other than `canonical_state` | Out of scope. Use `/claims/{claim_name}/status` for full claim detail. |
| Writing to the CRM timeline | No business event occurs on a read. |
| Validating that `canonical_state` is one of the 19 known enum values | Return whatever Frappe stores. Data integrity is Frappe's concern. |
| Normalising state case | Return `canonical_state` exactly as Frappe returns it. |
| Enforcing claim ownership or role-based access | Handled upstream in the MAL auth layer. |
| Logging reads to SM State Log | State log records transitions, not observations. |
| Modifying `_read_frappe_doc()` | Refactor is out of scope. |
| Modifying `sm_billing.state_machine.controller` | The module is shipped and correct. Import only. |
| Any frontend / React work | Backend story only. |

---

## 9. Acceptance Criteria

All of the following must be true before this story is accepted:

- [ ] `GET /api/modules/billing/claim/CLM-0001/state` returns HTTP `200` with a JSON body
  matching `ClaimStateResponse` when `CLM-0001` exists in Frappe
- [ ] The `canonical_state` in the response matches the `canonical_state` field on the
  Frappe document for that claim — verified by direct Frappe fetch
- [ ] The `valid_transitions` list in the response matches
  `VALID_TRANSITIONS[current_state]` exactly — order and values
- [ ] A request for a claim name that does not exist in Frappe returns HTTP `404`
- [ ] A blank or whitespace `claim_id` (if it reaches the handler) returns HTTP `400`
- [ ] When `X-Frappe-Site-Name` is present on the incoming request, it is included in the
  headers sent to Frappe
- [ ] When `X-Frappe-Site-Name` is absent, the endpoint still returns `200` without error
- [ ] A claim in a terminal state (no outbound transitions) returns `200` with
  `"valid_transitions": []`
- [ ] A claim whose `canonical_state` is an empty string returns `200` with
  `"valid_transitions": []`
- [ ] `transition_state` is not imported anywhere in the code added by this story
- [ ] `VALID_TRANSITIONS` is imported from `sm_billing.state_machine.controller`,
  not redefined inline
- [ ] `ClaimStateResponse` is defined as a Pydantic `BaseModel` in `billing.py`
- [ ] `Request` has been added to the `from fastapi import …` line
- [ ] `FRAPPE_SITE_NAME_HEADER = "X-Frappe-Site-Name"` constant is present in `billing.py`
- [ ] No existing endpoint is modified
- [ ] All new code is in `abstraction-layer/routers/billing.py` only

---

<details>
<summary>10. Smoke Test (expand)</summary>

After implementation, verify with the following `curl` commands. Substitute a real claim name
and site name from the running environment.

```bash
# ---- Happy path: claim exists ----
curl -s \
  -H "X-Frappe-Site-Name: willow.sparkmojo.com" \
  "http://localhost:8000/api/modules/billing/claim/CLM-0001/state" \
  | python3 -m json.tool

# Expected shape:
# {
#   "claim_id": "CLM-0001",
#   "canonical_state": "submitted",
#   "valid_transitions": ["adjudicating", "denied", "void"]
# }


# ---- 404: claim does not exist ----
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-Frappe-Site-Name: willow.sparkmojo.com" \
  "http://localhost:8000/api/modules/billing/claim/DOES-NOT-EXIST/state"

# Expected: 404


# ---- Terminal state: no valid transitions ----
# (use a claim you know is in written_off or another terminal state)
curl -s \
  -H "X-Frappe-Site-Name: willow.sparkmojo.com" \
  "http://localhost:8000/api/modules/billing/claim/CLM-TERMINAL/state" \
  | python3 -m json.tool

# Expected:
# {
#   "claim_id": "CLM-TERMINAL",
#   "canonical_state": "written_off",
#   "valid_transitions": []
# }


# ---- No site header: should still work ----
curl -s \
  "http://localhost:8000/api/modules/billing/claim/CLM-0001/state" \
  | python3 -m json.tool

# Expected: 200 with valid body
```

</details>

<details>
<summary>11. Out of Scope (expand)</summary>

The following are explicitly deferred to other stories:

- Any React / frontend component consuming this endpoint
- A POST or PATCH transition endpoint that calls `transition_state()`
- Caching `VALID_TRANSITIONS` at the HTTP layer — it is a module-level dict, already loaded
  into memory at process start; no caching needed
- Logging state reads to SM State Log
- Refactoring `_read_frappe_doc()` to accept custom headers
- Any change to the Frappe `SM Claim` DocType schema
- Any change to `sm_billing.state_machine.controller`
- Authentication or role-based access control middleware
- Pagination or bulk state query (this endpoint is single-claim only)

</details>

---

*Self-contained spec for BILL-QUERY-001.*
*Implementing agent reads this file and `abstraction-layer/routers/billing.py` only.*
*All other context is embedded above.*
```