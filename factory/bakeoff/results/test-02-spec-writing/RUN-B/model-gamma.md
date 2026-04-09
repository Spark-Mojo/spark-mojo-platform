model: model-gamma
test: 02-spec-writing
run: B
date: 2026-04-09

```markdown
# BILL-QUERY-001: Claim State & Valid Transitions Query Endpoint

## 📋 Metadata
| Field | Value |
|-------|-------|
| **Story ID** | `BILL-QUERY-001` |
| **Title** | Claim state and valid transitions query endpoint |
| **Category** | BACKEND |
| **Size** | S |
| **Dependencies** | `BILL-010` (state machine controller — already shipped) |
| **Platform Guardrails** | React → MAL only; `SM` prefix for DocTypes; Multi-site Frappe; Read-only boundary enforced |

---

## 🎯 Context & Scope
This story introduces a **READ-only** endpoint in the Billing Mojo Abstraction Layer (MAL). Frontend React components require a single source of truth to display a claim's current lifecycle position and the exact set of UI-valid next states without risking unintended mutations.

**In Scope:**
- Expose `GET` endpoint to query `SM Claim` state
- Return current `canonical_state` string
- Return `valid_next_states` array resolved from `VALID_TRANSITIONS` map
- Handle multi-tenant site resolution via `X-Frappe-Site-Name` header
- Strict error handling for missing/empty IDs and 404 scenarios

**Out of Scope:**
- State mutation or transitions (`transition_state()` must NOT be called)
- Frappe Workflow engine configuration
- Frontend UI/JSX implementation
- Validation of business logic beyond state existence

---

## 🏗 Architecture & Stack Alignment
| Layer | Implementation Detail |
|-------|----------------------|
| **Routing** | FastAPI (`/api/modules/billing/...`) |
| **Data Source** | Frappe REST API (`/api/resource/SM Claim/{claim_id}`) |
| **Multi-Tenancy** | `X-Frappe-Site-Name` header forwarded to Frappe request |
| **State Logic** | Direct import of `VALID_TRANSITIONS` from `sm_billing.state_machine.controller` |
| **Mutations** | ❌ STRICTLY READ-ONLY. Zero write operations to Frappe or state machine. |

---

## 🔌 Endpoint Specification

### Route & Method
```
GET /api/modules/billing/claim/{claim_id}/state
```

### Parameters
| Param | Location | Type | Required | Description |
|-------|----------|------|----------|-------------|
| `claim_id` | Path | `str` | ✅ Yes | Frappe document name of the `SM Claim` |
| `X-Frappe-Site-Name` | Header | `str` | ✅ Yes | Tenant site identifier for multi-site resolution |

### Response Codes
| Code | Condition | Detail Format |
|------|-----------|---------------|
| `200` | Success | `ClaimStateResponse` payload |
| `400` | `claim_id` is missing, empty, or whitespace-only | `{"detail": "claim_id is required"}` |
| `404` | Frappe returns 404 or no matching `SM Claim` | `{"detail": "SM Claim '{claim_id}' not found"}` |
| `422` | FastAPI validation failure | Standard FastAPI validation errors |

---

## 📦 Data Contracts

### Request Example
```http
GET /api/modules/billing/claim/CLR-2024-00123/state
X-Frappe-Site-Name: willow.sparkmojo.com
```

### Pydantic Response Model
```python
class ClaimStateResponse(BaseModel):
    claim_id: str
    canonical_state: str
    valid_next_states: list[str]
```

### JSON Response Example (200 OK)
```json
{
  "claim_id": "CLR-2024-00123",
  "canonical_state": "draft",
  "valid_next_states": ["validated", "cancelled", "held_review"]
}
```

---

## 🛠 Implementation Details

### 1. Import & Dependency Setup
```python
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, field_validator
import httpx
import os

# Import from shipped BILL-010 controller
from sm_billing.state_machine.controller import VALID_TRANSITIONS
```
> ⚠️ **Note:** Ensure the FastAPI virtual environment has visibility to `sm_billing`. If path resolution fails due to Frappé's app loading mechanism, fallback to fetching `VALID_TRANSITIONS` via a dedicated Frappe RPC endpoint or replicate the constant in the MAL with a TODO comment referencing `BILL-010`.

### 2. Multi-Tenancy Header Propagation
The existing `_frappe_headers()` helper does not dynamically accept site headers. For this endpoint, construct headers explicitly inside the handler to guarantee tenant isolation:
```python
def _frappe_headers_with_site(site_name: str) -> dict:
    return {
        "Authorization": f"token {os.getenv('FRAPPE_API_KEY')}:{os.getenv('FRAPPE_API_SECRET')}",
        "Content-Type": "application/json",
        "X-Frappe-Site-Name": site_name,
    }
```

### 3. Handler Logic Flow
1. **Validate Input:** If `claim_id` is not provided as a path param, FastAPI returns 422 automatically. If routed as a query/loose param, explicitly return `HTTPException(status_code=400)` for empty/whitespace strings.
2. **Fetch Document:** `GET /api/resource/SM Claim/{claim_id}` using site-aware headers.
3. **Handle 404:** Catch `httpx.HTTPStatusError` (404) or empty response → raise `HTTPException(404)`.
4. **Extract State:** Read `doc.get("canonical_state")`.
5. **Resolve Transitions:** 
   ```python
   next_states = VALID_TRANSITIONS.get(current_state, [])
   ```
   Fallback to `[]` if state is unlisted (defensive coding for stale data).
6. **Return Payload:** Return `{"claim_id": claim_id, "canonical_state": current_state, "valid_next_states": next_states}`

---

## 🧪 Testing Requirements

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| **Valid State Query** | `claim_id="DRAFT-CLAIM-01"`, valid site header | `200` with `canonical_state="draft"` and `valid_next_states=["validated", ...]` |
| **Missing Path Param** | `claim_id=""` or omitted | `400` with appropriate detail |
| **Non-Existent Claim** | `claim_id="NONEXISTENT-ID"` | `404` |
| **Unknown State** | Claim has `canonical_state="legacy_invalid"` | `200` with `valid_next_states=[]` |
| **Missing Site Header** | `X-Frappe-Site-Name` omitted | Frappe returns `401`/`400` or FastAPI validation fails (verify platform nginx/site config behavior) |
| **Mutation Prevention** | Intercept Frappe client during test | ASSERT: `transition_state()` or `PUT/POST` to Frappe is NEVER called |

---

## ✅ Acceptance Criteria (Definition of Done)
- [ ] Endpoint deployed at `/api/modules/billing/claim/{claim_id}/state` (GET)
- [ ] Returns exact `ClaimStateResponse` schema on success
- [ ] Returns `400` for empty/missing `claim_id`
- [ ] Returns `404` when Frappe cannot locate `SM Claim`
- [ ] `X-Frappe-Site-Name` header is correctly forwarded to Frappe REST calls
- [ ] `VALID_TRANSITIONS` dict is used to compute `valid_next_states`
- [ ] **ZERO** calls to `transition_state()`, Frappe `PUT/POST`, or n8n webhooks
- [ ] Unit tests cover 200, 400, 404, and edge-case unknown state scenarios
- [ ] Code lints successfully against project standards (`ruff`/`black`)
- [ ] PR includes link to `BILL-010` dependency confirmation

---
*Spec authored for Spark Mojo Factory. Implements Platform Guardrails Section 4, Rule #1 (MAL routing) and Rule #7 (state boundary enforcement). Ready for assignment.*
```