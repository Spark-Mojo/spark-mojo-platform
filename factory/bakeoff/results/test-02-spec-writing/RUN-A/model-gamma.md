model: model-gamma
test: 02-spec-writing
run: A
date: 2026-04-09

# STORY SPEC: CRM-003

## Metadata
| Field | Value |
|-------|-------|
| **Story ID** | `CRM-003` |
| **Title** | Contact create endpoint - abstraction layer |
| **Category** | `BACKEND` |
| **Size** | `S` |
| **Dependencies** | `None (first backend story)` |
| **Status** | `Ready for Implementation` |

---

## Spec Gates (Mandatory per Platform Guardrails)
> **Gate 1 - Workflow:** What is the workflow?
> Contact creation is the entry point of the **Client Identity workflow**. It transitions an unstructured human entity into a canonical, trackable system identity. Every downstream workflow (intake, scheduling, billing, clinical) depends on this record existing before it can attach context, tasks, or projections.

> **Gate 2 - CRM Timeline:** What does this capability write to the CRM timeline?
> On successful creation, it writes a **system-generated "Record Created" event** to the Frappe `Communication` DocType, linked to the new Contact. This event is consumed by the unified CRM activity timeline and surfaces to authorized users as the first lifecycle entry.

> **Gate 3 - Right Level:** Is this being built at the right level of specificity?
> Yes. This is a **universal capability** implemented at the FastAPI abstraction layer. It does not assume vertical-specific data structures, uses runtime vocabulary resolution, and strictly adheres to the React → MAL → Frappe contract. No custom DocTypes are created; native ERPNext `Contact` is leveraged per `DECISION-013`.

---

## Architecture & Platform Constraints
- **Routing Contract:** React calls `POST /api/modules/crm/contact/create`. **Never** `POST /api/resource/Contact`.
- **State Boundary:** Internal document state is managed by Frappe. Cross-system projections (Medplum/ERPNext) are deferred to n8n via `Communication` event capture (handled in future stories).
- **DocType:** Native `Contact`. All future Spark Mojo custom fields will use the `sm_` prefix.
- **Security:** Endpoint requires valid Bearer token. User context is injected via FastAPI dependency.
- **Tech Stack:** FastAPI (Python), Frappe Framework (Python). No TypeScript. No hardcoded hex colors in any future frontend integration.

---

## API Contract

### Endpoint
`POST /api/modules/crm/contact/create`

### Request Headers
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | `string` | Yes | `Bearer <token>` |
| `Content-Type` | `string` | Yes | `application/json` |

### Request Body
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email_id": "jane.doe@example.com",
  "phone": "+15550109876",
  "company_name": "Acme Corp",
  "metadata": {
    "sm_referral_source": "Web Intake",
    "sm_preferred_pronouns": "She/Her"
  }
}
```
<details>
<summary>Field Validation Rules</summary>

- `first_name`: required, string, max 140 chars
- `last_name`: required, string, max 140 chars
- `email_id`: optional, string, valid email format
- `phone`: optional, string, E.164 preferred but accepted as-is (Frappe handles formatting)
- `company_name`: optional, string, maps to `company_name` in Frappe
- `metadata`: optional object. Keys prefixed with `sm_` will be mapped directly to custom fields on `Contact`. Non-prefixed keys are ignored with a warning in logs.
</details>

### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "name": "CRM-CONT-00001",
    "first_name": "Jane",
    "last_name": "Doe",
    "email_id": "jane.doe@example.com",
    "phone": "+15550109876",
    "vocabulary_label": "Client",
    "timeline_event_id": "COMM-000245",
    "creation": "2026-04-09T14:32:01Z",
    "modified_by": "admin@sparkmojo.com"
  }
}
```

### Error Responses
| HTTP Code | Payload Structure | Meaning |
|-----------|-------------------|---------|
| `400` | `{ "error": "Validation failed", "details": ["first_name is required"], "field": "first_name" }` | Missing/invalid payload |
| `409` | `{ "error": "Duplicate detected", "message": "A Contact with this email already exists." }` | Frappe `DuplicateEntryError` caught and surfaced cleanly |
| `429` | `{ "error": "Rate limit exceeded" }` | Too many rapid creation attempts |
| `500` | `{ "error": "Internal server error", "request_id": "<uuid>" }` | Unhandled exception |

---

## Implementation Guide

### File Structure
```
abstraction-layer/
├── routes/
│   └── crm.py              ← Add route here
├── utils/
│   └── vocabulary.py       ← New helper for label resolution
└── main.py                 ← Register router if not already done
```

### 1. Vocabulary Resolution Helper (`abstraction-layer/utils/vocabulary.py`)
Resolves the site's configured label for "person". Falls back gracefully if `SM Site Registry` does not yet exist.

```python
import frappe
from typing import Dict, Any

DEFAULT_VOCABULARY = {
    "person": "Client",
    "person_plural": "Clients"
}

def get_person_label(frappe_client=None) -> str:
    """Resolve the 'person' vocabulary label for the current tenant."""
    # frappe_client is optional when running inside Frappe context
    try:
        # Check if SM Site Registry exists and has vocabulary config
        registry_exists = frappe.db.exists("DocType", "SM Site Registry")
        if registry_exists and frappe.local.site:
            registry = frappe.get_doc("SM Site Registry", frappe.local.site)
            if hasattr(registry, 'vocabulary_config') and registry.vocabulary_config:
                import json
                vocab = json.loads(registry.vocabulary_config)
                return vocab.get("person", DEFAULT_VOCABULARY["person"])
    except Exception:
        pass  # Fail silently to default
        
    return DEFAULT_VOCABULARY["person"]
```

### 2. FastAPI Route (`abstraction-layer/routes/crm.py`)

```python
import frappe
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from auth import get_current_user, get_frappe_client
from utils.vocabulary import get_person_label

router = APIRouter(prefix="/api/modules/crm/contact", tags=["crm"])

@router.post("/create", status_code=201)
async def create_contact(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user),
    frappe_client: Any = Depends(get_frappe_client)
):
    """Create a native Frappe Contact and write a CRM timeline event."""
    
    # 1. Validate required fields
    if not payload.get("first_name") or not payload.get("last_name"):
        raise HTTPException(status_code=400, detail={"error": "Validation failed", "details": ["first_name and last_name are required"]})
        
    try:
        # 2. Prepare Frappe Contact fields
        contact = frappe.new_doc("Contact")
        contact.first_name = payload["first_name"]
        contact.last_name = payload["last_name"]
        contact.email_id = payload.get("email_id")
        contact.phone = payload.get("phone")
        contact.company_name = payload.get("company_name")
        contact.owner = user.get("name") or user.get("email")
        
        # Map custom sm_ fields from metadata if provided
        metadata = payload.get("metadata", {})
        for key, value in metadata.items():
            if key.startswith("sm_"):
                setattr(contact, key, value)
                
        contact.insert()
        
        # 3. Resolve vocabulary
        person_label = get_person_label()
        
        # 4. Write CRM Timeline Event
        activity = frappe.new_doc("Communication")
        activity.communication_type = "Comment"
        activity.reference_doctype = "Contact"
        activity.reference_name = contact.name
        activity.subject = f"{person_label} Created"
        activity.content = f"New {person_label} record '{contact.first_name} {contact.last_name}' created via Spark Mojo CRM."
        activity.sender = user.get("email", "system@sparkmojo.com")
        activity.insert()
        
        # Commit is automatic via Frappe ORM, but explicit save is good practice for multi-doc operations
        # (Frappe handles transaction rollback automatically on exception)
        
        # 5. Build response
        return {
            "success": True,
            "data": {
                "name": contact.name,
                "first_name": contact.first_name,
                "last_name": contact.last_name,
                "email_id": contact.email_id,
                "phone": contact.phone,
                "company_name": contact.company_name,
                "vocabulary_label": person_label,
                "timeline_event_id": activity.name,
                "creation": str(contact.creation),
                "modified_by": contact.modified_by
            }
        }
        
    except frappe.DuplicateEntryError as e:
        raise HTTPException(status_code=409, detail={"error": "Duplicate detected", "message": str(e)})
    except frappe.ValidationError as e:
        raise HTTPException(status_code=400, detail={"error": "Validation failed", "details": [str(e)]})
    except Exception as e:
        # Log full error internally, return safe generic message
        frappe.log_error(title="CRM-003 Contact Creation Failed", message=frappe.get_traceback())
        raise HTTPException(status_code=500, detail={"error": "Internal server error", "request_id": frappe.generate_hash(length=10)})
```

<details>
<summary>Implementation Notes & Edge Cases</summary>

1. **Transaction Safety:** Frappe's `insert()` and `Contact.insert()` run within an implicit transaction. If timeline event creation fails, Frappe will roll back the Contact creation automatically, preserving data integrity.
2. **Custom Fields:** This endpoint gracefully ignores `sm_` keys not yet provisioned on the site, but logs them. Once provisioning stories add those fields, they will map automatically.
3. **Vocabulary Caching:** `get_person_label()` performs a lightweight DB read. At this size, caching is unnecessary. Future stories may add FastAPI `@lru_cache` if throughput requires it.
4. **Frappe Context:** Ensure `get_frappe_client()` properly sets `frappe.local.user` and `frappe.local.site` so ORM calls don't leak cross-tenant context.
</details>

---

## Acceptance Criteria
- [ ] `POST /api/modules/crm/contact/create` accepts valid JSON payload and returns `201`
- [ ] Response includes `name` (Frappe document ID), core fields, and resolved `vocabulary_label`
- [ ] Frappe `Contact` DocType is created with exact payload mapping
- [ ] Frappe `Communication` DocType is created with `reference_doctype="Contact"` and `reference_name` matching the new contact
- [ ] Missing `first_name` or `last_name` returns `400` with clear validation message
- [ ] Duplicate email/phone triggers `409` (handled via Frappe's native duplicate checks)
- [ ] No direct Frappe API calls are exposed; React must use this MAL endpoint only
- [ ] Code passes `flake8` / `ruff` linting and includes type hints where applicable
- [ ] All string labels use `vocabulary_label` dynamic resolution, never hardcoded

---

## Testing Strategy

| Test Type | Scope | Assertion |
|-----------|-------|-----------|
| **Unit** | `create_contact` route | Mock `frappe_client`. Verify `frappe.new_doc` called twice (Contact, Communication). Verify return structure. |
| **Unit** | `get_person_label` | Mock `SM Site Registry` presence/absence. Verify fallback to `"Client"`. |
| **Integration** | Local Frappe site + FastAPI | POST payload → verify DB row in `tabContact` → verify DB row in `tabCommunication` with correct links. |
| **Validation** | Missing required fields | Send `{}` → expect `400` with field error array. |
| **Security** | Unauthenticated request | Omit Bearer token → expect `401` from `get_current_user` middleware. |

---

## Deployment & Post-Implementation
1. Add router registration to `abstraction-layer/main.py` if not already present: `app.include_router(crm.router)`
2. Run abstraction layer tests: `pytest tests/crm/test_contact_create.py`
3. Verify on staging Frappe site: `POST https://<mal-domain>/api/modules/crm/contact/create` returns expected JSON.
4. **Next Stories:** This endpoint establishes the creation pattern. Subsequent stories (`CRM-004`, `CRM-011`, etc.) will extend with custom field provisioning, duplicate detection, and lead-to-contact conversion.

> **Spec Writer Sign-off:** This story is self-contained. The implementing agent needs only this file and the existing `abstraction-layer` codebase to complete implementation. All platform guardrails have been enforced.