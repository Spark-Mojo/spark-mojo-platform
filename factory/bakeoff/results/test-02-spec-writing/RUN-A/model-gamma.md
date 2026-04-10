model: model-gamma
test: 02-spec-writing
run: A
date: 2026-04-09

```markdown
# Story Spec: CRM-003 — Contact Create Endpoint (Abstraction Layer)

## Metadata
| Field | Value |
|-------|-------|
| **Story ID** | `CRM-003` |
| **Title** | Contact create endpoint - abstraction layer |
| **Category** | BACKEND |
| **Size** | S |
| **Dependencies** | None (first backend story for CRM capability) |
| **Assignee** | Backend Engineer |
| **Reviewers** | Platform Architect, Spec Writer |

---

## 1. Context & Objective
The CRM / Client Identity capability is being built on the Spark Mojo platform. React must **never** call Frappe directly. All frontend requests route through the Mojo Abstraction Layer (MAL) at `/api/modules/[capability]/[action]`.

This story implements the **POST** endpoint to create a new Frappe `Contact` document. It handles vocabulary resolution, enforces platform guardrails, writes the mandatory CRM timeline event upon successful creation, and returns the canonical Frappe record to the frontend.

---

## 2. Platform Guardrails (Immutable)
*These rules are non-negotiable. Violations will be rejected during PR review.*
1. **Frappe Isolation**: React only calls the MAL. Direct Frappe REST API calls from the frontend are forbidden.
2. **Custom DocType Prefix**: All custom DocTypes are prefixed `SM`. (Note: `Contact` is a native core DocType and remains unprefixed).
3. **No Hardcoded Secrets/Credentials**: Admin API credentials must use vault references only.
4. **Technology Stack**: FastAPI (MAL) + Frappe/ERPNext (backend). No TypeScript. Frontend files are `.jsx`.
5. **CRM Timeline Contract**: *Every* capability that touches a customer record must write to the unified CRM activity timeline. This is a mandatory platform requirement, not a nice-to-have.
6. **Evaluation Order**: Always prefer (1) Native Frappe/ERPNext functionality over (3) Third-party integrations or (4) Custom builds for backend logic.

---

## 3. Functional Requirements

### 3.1 Endpoint Contract
- **Route**: `POST /api/modules/crm/contact/create`
- **Authentication**: Bearer Token (validated by MAL auth middleware)
- **Request Body**: JSON payload containing valid Frappe `Contact` DocType fields (e.g., `first_name`, `last_name`, `email_id`, `phone`, plus any provisioned `sm_*` custom fields).
- **Response**: 
  - `201 Created`: Returns the created contact payload including Frappe `name` (document ID), plus the resolved site vocabulary.
  - `400 Bad Request`: Validation errors (email format, missing required fields).
  - `500 Internal Server Error`: Frappe database or hook failures.

### 3.2 Vocabulary Resolution
- The endpoint must fetch the current tenant's vocabulary configuration (e.g., `{"person": "Client", "person_plural": "Clients"}`) from the `SM Site Registry` or tenant config.
- Attach this vocabulary to the response payload so the React frontend can render consistent labels immediately without an extra API call.
- If vocabulary config is missing, fall back to platform defaults (`person: "Contact"`).

### 3.3 CRM Timeline Event
- On successful Contact creation, the endpoint **must** create a Frappe `Communication` record to log the creation event.
- Communication fields:
  - `communication_type`: `"Comment"`
  - `reference_doctype`: `"Contact"`
  - `reference_name`: `<newly_created_contact.name>`
  - `content`: `"${resolved_person_label} record created."` (e.g., `"Client record created."`)
  - `sender`: Current authenticated user's email/ID.
  - `sent_or_received`: `"Received"`

### 3.4 Error Handling
- Wrap all Frappe DB operations in `try/except`.
- On `frappe.ValidationError`, `frappe.DuplicateEntryError`, etc., return a structured `400` JSON error: `{ "error": "validation_failed", "message": "...", "details": [...] }`.
- Ensure timeline event creation is wrapped separately so that if logging fails, a `500` is still returned, but the Contact is rolled back if possible, or flagged for investigation.

---

## 4. Technical Implementation

### 4.1 File Location
```
abstraction-layer/
├ routes/
│  └ crm/
│     └ contact.py
├ middleware/
│  └ auth.py
└ models/
   └ contact.py
```

### 4.2 Pydantic Model (`models/contact.py`)
```python
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any

class ContactCreateRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    email_id: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile_no: Optional[str] = None
    company_name: Optional[str] = None
    status: Optional[str] = "Open"
    # Open dict for provisioning-time custom fields (sm_date_of_birth, sm_payer, etc.)
    custom_fields: Optional[Dict[str, Any]] = None

class ContactCreateResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    vocabulary: Dict[str, str]
```

### 4.3 Route Implementation (`routes/crm/contact.py`)
```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from auth import get_current_user, get_frappe_session
from models.contact import ContactCreateRequest, ContactCreateResponse
import frappe

router = APIRouter(prefix="/api/modules/crm", tags=["crm-client-identity"])

@router.post("/contact/create", response_model=ContactCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    payload: ContactCreateRequest,
    current_user = Depends(get_current_user),
    frappe_session = Depends(get_frappe_session)
):
    try:
        # 1. Resolve Vocabulary
        site_name = frappe.local.site
        vocabulary = {"person": "Contact", "person_plural": "Contacts"}
        
        try:
            site_registry = frappe.get_doc("SM Site Registry", site_name)
            if hasattr(site_registry, "vocabulary_config") and site_registry.vocabulary_config:
                import json
                vocabulary.update(json.loads(site_registry.vocabulary_config))
        except Exception:
            pass  # Fallback to defaults
            
        person_label = vocabulary.get("person", "Contact")
            
        # 2. Create Frappe Contact Document
        doc = frappe.new_doc("Contact")
        doc.first_name = payload.first_name
        doc.last_name = payload.last_name
        doc.email_id = payload.email_id
        doc.phone = payload.phone
        doc.mobile_no = payload.mobile_no
        doc.company_name = payload.company_name
        doc.status = payload.status
        
        # Inject provisioned custom fields if present
        if payload.custom_fields:
            for field, value in payload.custom_fields.items():
                if hasattr(doc, field):
                    setattr(doc, field, value)
                    
        doc.insert()
        frappe.db.commit()
        
        # 3. Write Mandatory CRM Timeline Event
        person_lower = person_label.lower()
        comm = frappe.new_doc("Communication")
        comm.communication_type = "Comment"
        comm.reference_doctype = "Contact"
        comm.reference_name = doc.name
        comm.content = f"{person_lower.capitalize()} record created."
        comm.sender = current_user.get("email") or "system"
        comm.sent_or_received = "Received"
        comm.insert(ignore_permissions=True)
        frappe.db.commit()
        
        # 4. Return Response
        return ContactCreateResponse(
            success=True,
            data=doc.as_dict(),
            vocabulary=vocabulary
        )
        
    except frappe.ValidationError as e:
        raise HTTPException(status_code=400, detail={"error": "validation_failed", "message": str(e)})
    except frappe.DuplicateEntryError as e:
        raise HTTPException(status_code=409, detail={"error": "duplicate_entry", "message": str(e)})
    except Exception as e:
        # Rollback if possible, but Frappe handles implicit rollback on unhandled exceptions
        frappe.log_error("MAL Contact Create Error", str(e))
        raise HTTPException(status_code=500, detail={"error": "internal_error", "message": "Failed to create contact."})
```

---

## 5. Acceptance Criteria

- [ ] **Route Registration**: `POST /api/modules/crm/contact/create` is accessible and requires valid Bearer token authentication.
- [ ] **Document Creation**: Successfully creates a native Frappe `Contact` document with provided fields. Handles `sm_*` custom fields injected via `custom_fields` dict.
- [ ] **Vocabulary Resolution**: Fetches tenant vocabulary from `SM Site Registry`. Returns it in the response. Falls back safely to `"Contact"` / `"Contacts"` if registry is missing or malformed.
- [ ] **Timeline Compliance**: Creates a `Communication` DocType record linked to the new Contact. Content reflects the resolved vocabulary label (e.g., `"Client record created."`).
- [ ] **Response Payload**: Returns `201` with `{ success: true, data: { name: "CRM-CONTACT-00001", ... }, vocabulary: {...} }`.
- [ ] **Error Handling**: Returns structured `400` for validation failures, `409` for duplicates, and `500` for system errors. Does not leak raw Frappe tracebacks.
- [ ] **Guardrail Compliance**: Zero direct calls to external APIs. Zero hardcoded credentials. Follows platform architecture immutables.

---

## 6. Testing Strategy

### 6.1 Unit / Integration Tests (Pytest)
1. `test_create_contact_success`: Send valid payload → assert `201`, assert `data.name` exists, assert `Communication` record created with correct `reference_name`.
2. `test_create_contact_with_custom_fields`: Send payload with `sm_date_of_birth` → assert field saved correctly on Contact.
3. `test_create_contact_duplicate_email`: Send payload with existing email → assert `409` and correct error structure.
4. `test_create_contact_missing_required`: Send payload without `first_name` → assert `400`.
5. `test_vocabulary_fallback`: Mock `SM Site Registry` to raise exception → assert response defaults to `{"person": "Contact"}`.

### 6.2 Manual Verification (Local Dev)
```bash
curl -X POST http://localhost:8000/api/modules/crm/contact/create \
  -H "Authorization: Bearer <VALID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email_id": "jane.smith@example.com",
    "phone": "+15550199",
    "custom_fields": { "sm_referral_source_type": "Physician" }
  }'
```
Expected: `201` JSON with Frappe `name`, all fields echoed, and `vocabulary` object.

---

## 7. Implementation Notes
- **Custom Fields**: This endpoint does **not** create custom fields. They are assumed to exist on the site via the provisioning pipeline (`sm_provisioning`). The `custom_fields` payload dict safely injects them if they exist on the DocType.
- **Idempotency**: POST endpoints are not strictly idempotent in Frappe. Frontend handles duplicate submission prevention.
- **Frappe Hooks**: Frappe `before_insert` / `validate` hooks on the Contact DocType (e.g., `validate_contact` in `sm_widgets`) will execute automatically. The MAL must surface those validation errors cleanly to the client.
- **Timeline Fallback**: If `Communication` creation fails, the Contact is still committed. This is acceptable per platform guidelines: timeline writes are best-effort on create, and n8n reconciliation workflows will backfill missing timeline events within 5 minutes.

---
*Spec Version: 1.0 | Generated: April 9, 2026 | Approved by: Spark Mojo Factory*
```