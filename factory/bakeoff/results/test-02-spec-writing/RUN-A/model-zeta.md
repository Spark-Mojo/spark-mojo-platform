model: model-zeta
test: 02-spec-writing
run: A
date: 2026-04-09

```markdown
# Story Spec: CRM-003 — Contact Create Endpoint

## Story Metadata
- **Story ID**: CRM-003
- **Title**: Contact create endpoint - abstraction layer
- **Category**: BACKEND
- **Size**: S
- **Dependencies**: None (first backend story)

---

## 1. Context & Workflow Alignment

This story implements the **"Create Person"** task within the universal intake workflow. It is the first backend story for the CRM Client Identity capability and establishes the MAL (Mojo Abstraction Layer) pattern for CRM operations.

**Platform Guardrails Applied:**
- **React NEVER calls Frappe directly.** This endpoint is the sole surface for Contact creation.
- **MAL Routing:** All endpoints at `/api/modules/[capability]/[action]`.
- **Native First:** Uses Frappe's native `Contact` DocType (per DECISION-013 and evaluation order: native functionality before custom build).
- **CRM Timeline Contract:** Writes to the unified activity timeline on successful creation (Leg 2: Everything about a customer lives in the CRM).

**Vocabulary Resolution:**
The endpoint resolves the abstract "person" concept to the site's configured label (e.g., "Client" for behavioral health, "Patient" for medical, "Customer" for retail) stored in `SM Site Registry`.

---

## 2. Acceptance Criteria

### Functional Requirements
1. **Endpoint**: `POST /api/modules/crm/contact/create` exposed via FastAPI.
2. **Request**: Accepts JSON payload with Contact fields (`first_name`, `last_name`, `email_id`, `phone`, `mobile_no`) plus any custom `sm_*` fields configured for the vertical.
3. **Validation**: Returns `400 Bad Request` if both `first_name` and `last_name` are missing or empty.
4. **Creation**: Creates a Frappe `Contact` document using the Frappe API client.
5. **Vocabulary Resolution**: 
   - Reads `vocabulary_config` JSON from `SM Site Registry` DocType.
   - Extracts the `person` key (default: "Contact").
   - Includes the resolved label in the response (`person_label`).
6. **CRM Timeline Event**: Creates a `Communication` DocType entry:
   - `reference_doctype`: "Contact"
   - `reference_name`: [new contact ID]
   - `subject`: "[person_label] created: [First Name] [Last Name]"
   - `communication_type`: "System"
   - `content`: JSON with metadata `{event_type: "contact_created", created_by: ..., timestamp: ...}`
7. **Response**: Returns `200 OK` with body:
   ```json
   {
     "data": {
       "name": "CONTACT-00001",
       "first_name": "...",
       "last_name": "...",
       "person_label": "Client"
     }
   }
   ```

### Technical Standards
- No new SM DocTypes for core Contact storage (use native Frappe Contact).
- SM prefix applies only to the configuration DocType (`SM Site Registry`).
- Error handling via HTTPException with descriptive detail.
- All Frappe operations via `get_frappe_client` dependency.

---

## 3. Technical Specification

### 3.1 File: `abstraction-layer/routes/crm.py`

Create this file with the Contact create endpoint.

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json

from auth import get_current_user, get_frappe_client

router = APIRouter(prefix="/api/modules/crm", tags=["crm"])

class ContactCreateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email_id: Optional[str] = None
    phone: Optional[str] = None
    mobile_no: Optional[str] = None
    # Allow vertical-specific custom fields (sm_*) to be passed through
    class Config:
        extra = "allow"

@router.post("/contact/create")
async def create_contact(
    data: ContactCreateRequest,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """
    Create a new Contact in Frappe CRM.
    
    - Validates first_name or last_name presence
    - Resolves vocabulary for 'person' label from SM Site Registry
    - Creates Contact document
    - Writes timeline event to Communication
    - Returns contact data with resolved person_label
    """
    # Gate 1: Validation
    if not data.first_name and not data.last_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either first_name or last_name is required"
        )
    
    # Prepare base contact data
    contact_payload = {
        "doctype": "Contact",
        "first_name": data.first_name or "",
        "last_name": data.last_name or "",
        "email_id": data.email_id,
        "phone": data.phone,
        "mobile_no": data.mobile_no,
    }
    
    # Merge any extra fields (sm_* custom fields from vertical config)
    if data.model_extra:
        contact_payload.update(data.model_extra)
    
    try:
        # Gate 2: Create Contact
        contact = frappe.get_doc(contact_payload)
        contact.insert()
        
        # Gate 3: Vocabulary Resolution
        person_label = "Contact"  # universal default
        try:
            site_name = frappe.get_site_name()
            site_registry = frappe.get_doc("SM Site Registry", site_name)
            if hasattr(site_registry, "vocabulary_config") and site_registry.vocabulary_config:
                vocab = json.loads(site_registry.vocabulary_config)
                person_label = vocab.get("person", "Contact")
        except Exception:
            # SM Site Registry may not exist in some test environments; use default
            pass
        
        # Gate 4: CRM Timeline Event (Leg 2 Compliance)
        display_name = f"{data.first_name or ''} {data.last_name or ''}".strip()
        timeline_entry = frappe.get_doc({
            "doctype": "Communication",
            "reference_doctype": "Contact",
            "reference_name": contact.name,
            "subject": f"{person_label} created: {display_name}",
            "communication_type": "System",
            "content": json.dumps({
                "event_type": "contact_created",
                "person_label": person_label,
                "created_by": user.get("email") if user else "system",
                "timestamp": str(frappe.utils.now()),
                "source": "api"
            }),
            "sender": user.get("email") if user else "system",
            "sent_or_received": "Sent"  # Required for Communication validation
        })
        timeline_entry.insert()
        
        # Prepare response
        response_data = {
            "name": contact.name,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email_id": contact.email_id,
            "phone": contact.phone,
            "mobile_no": contact.mobile_no,
            "person_label": person_label
        }
        
        # Include custom fields in response if they were provided
        if data.model_extra:
            for key in data.model_extra:
                if hasattr(contact, key):
                    response_data[key] = getattr(contact, key)
        
        return {"data": response_data}
        
    except Exception as e:
        # Log error details for debugging (implementing agent: use logger if available)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contact creation failed: {str(e)}"
        )
```

### 3.2 File: `abstraction-layer/main.py`

Include the CRM router in the FastAPI app:

```python
# Add near other router imports
from routes.crm import router as crm_router

# Add near other app.include_router calls
app.include_router(crm_router)
```

### 3.3 Dependencies Expected in Environment

The implementing codebase must provide:
- `get_current_user`: Returns dict with user info (email)
- `get_frappe_client`: Returns initialized Frappe client (e.g., `frappeclient` wrapper or Frappe `get_doc` capability)
- Frappe DocTypes available:
  - `Contact` (native Frappe)
  - `Communication` (native Frappe, for timeline)
  - `SM Site Registry` (SM custom DocType for vocabulary config)

---

## 4. Data Contract

### Request Schema
```json
{
  "first_name": "string (optional)",
  "last_name": "string (optional but required if first_name missing)",
  "email_id": "string (optional, email format)",
  "phone": "string (optional)",
  "mobile_no": "string (optional)",
  "sm_[custom_field]": "any (optional, passed through to Frappe)"
}
```

### Response Schema (200 OK)
```json
{
  "data": {
    "name": "string",           // Frappe document ID (e.g., "CONTACT-00001")
    "first_name": "string",
    "last_name": "string",
    "email_id": "string|null",
    "phone": "string|null",
    "mobile_no": "string|null",
    "person_label": "string",   // Resolved vocabulary label (e.g., "Client")
    "[custom_fields]": "..."    // Any sm_* fields that were saved
  }
}
```

### Error Responses
- `400 Bad Request`: Validation failure (missing names)
- `401 Unauthorized`: Authentication failure (handled by `get_current_user`)
- `500 Internal Server Error`: Frappe API errors or unexpected exceptions

---

## 5. Testing Requirements

### Unit Tests
**File**: `abstraction-layer/tests/routes/test_crm_contact_create.py`

1. **Success Path**:
   - Mock frappe client to return Contact with name="TEST-001"
   - Mock SM Site Registry with `vocabulary_config: {"person": "Client"}`
   - POST valid data, assert 200
   - Assert response includes `name: "TEST-001"` and `person_label: "Client"`
   - Assert Communication was created with subject "Client created: ..."

2. **Default Vocabulary**:
   - Mock SM Site Registry not found
   - Assert response `person_label` is "Contact"
   - Assert Communication subject uses "Contact"

3. **Validation Failure**:
   - POST `{}` (empty JSON)
   - Assert 400 with detail containing "required"

4. **Custom Fields Passthrough**:
   - POST with `{"first_name": "Bob", "sm_date_of_birth": "1990-01-01"}`
   - Assert the custom field appears in the frappe.get_doc call and response

### Integration Test (Manual/CI)
```bash
# Prerequisites: Frappe bench running, abstraction layer running
curl -X POST http://localhost:8000/api/modules/crm/contact/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Alice", "last_name": "Smith", "email_id": "alice@example.com"}'

# Verify:
# 1. Response contains name (e.g., "Alice Smith")
# 2. Contact appears in Frappe Desk > CRM > Contacts
# 3. Communication entry exists linked to this Contact with subject "Contact created: Alice Smith" (or configured label)
```

---

## 6. Security & Permissions

- **Authentication**: Endpoint protected by standard `get_current_user` dependency (Bearer token or session).
- **Frappe Permissions**: The underlying Frappe user must have "Create" permission on `Contact` DocType and "Create" on `Communication` for timeline writing.
- **Data Isolation**: Contact creation respects Frappe's multi-site tenancy (site determined by `frappe.get_site_name()` from request context).
- **No SQL Injection**: All data passed via Frappe's `get_doc` API, not raw SQL.

---

## 7. Dependencies & Out of Scope

### In Scope
- Basic Contact creation with standard fields
- Vocabulary resolution for "person" label
- Timeline event writing (Communication DocType)

### Out of Scope (Future Stories)
- **CRM-011**: Real-time duplicate detection (fuzzy matching on create)
- **CRM-009**: Lead conversion workflow (this is direct Contact create, not conversion)
- **CRM-00X**: File uploads (image/photo attachment)
- **CRM-00X**: Bulk import/CSV ingestion
- **CRM-00X**: Contact update/delete endpoints

---

## 8. Implementation Notes

**Why Communication DocType for Timeline?**
Per research evaluation (Option A), Frappe's native `Communication` DocType is the immediate storage for activity timeline. It links to Contacts via `reference_doctype/name` and supports `communication_type="System"` for automated events. If volume becomes an issue, a future migration to a custom `SM CRM Activity` DocType (Option C) can occur without breaking the API contract.

**Vocabulary Storage:**
`SM Site Registry` is the configuration DocType for tenant-level settings. The `vocabulary_config` field is JSON to allow flexible vertical terminology without schema migrations. Example for behavioral health:
```json
{
  "person": "Client",
  "person_plural": "Clients",
  "lead": "Referral",
  "intake": "Intake"
}
```

**Custom Fields:**
The `extra = "allow"` Pydantic config permits vertical-specific fields (e.g., `sm_date_of_birth`, `sm_insurance_member_id`) to pass through to Frappe without explicit schema definition in the abstraction layer. This aligns with the "universal first, configure second" leg of the platform.

---

*Spec Version: 1.0*
*Spec Writer: Spark Mojo Build Factory*
*Authority: Platform Guardrails v1.0, CRM Technical Research*
```