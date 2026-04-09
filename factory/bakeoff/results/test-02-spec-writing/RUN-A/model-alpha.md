model: model-alpha
test: 02-spec-writing
run: A
date: 2026-04-09

# Story Spec: CRM-003

## Metadata

*   **Story ID:** CRM-003
*   **Title:** Contact create endpoint - abstraction layer
*   **Category:** BACKEND
*   **Size:** S
*   **Dependencies:** None (first backend story)
*   **Context:** CRM Client Identity is a new capability. This is the first backend story to establish the abstraction layer route for creating a person record in the CRM.

---

## Objective

Implement the FastAPI abstraction layer route that allows the React frontend to create a new person record in the CRM. This route must create the native Frappe `Contact` document, resolve the site-specific vocabulary for the "person" concept (e.g., "Client"), log the creation event to the CRM timeline, and return the created record with its canonical Frappe `name` (document ID).

This story enforces the architectural guardrail that **React never calls Frappe directly** and establishes the pattern for vocabulary resolution and timeline logging.

---

## Acceptance Criteria

```gherkin
Feature: Contact Creation via Abstraction Layer

Scenario: Successful creation of a new Contact via MAL
  Given a valid POST request to "/api/modules/crm/contact/create"
  And the payload contains "first_name" and "last_name"
  When the request is processed
  Then a new Frappe "Contact" document is created with the provided data
  And the response status is 200 OK
  And the response body contains the created contact data including the Frappe "name" (document ID)

Scenario: Vocabulary resolution for the "person" concept
  Given the site has a configured vocabulary in "SM Site Registry" where "person" maps to "Client"
  When a new contact is created via the endpoint
  Then the abstraction layer resolves the label "Client" for the concept "person"
  And the response payload includes a "vocabulary" object containing {"person": "Client"}
  And the CRM timeline event content uses the resolved label "Client created"

Scenario: CRM timeline event creation
  When a new Contact is successfully created
  Then a Frappe "Communication" document is created
  And the Communication document has "reference_doctype" set to "Contact"
  And the Communication document has "reference_name" set to the new Contact's ID
  And the Communication document has "communication_type" set to "Comment"
  And the Communication document "content" is "{resolved_person_label} created"

Scenario: Fallback vocabulary when site config is missing
  Given the site does not have a "SM Site Registry" or vocabulary config
  When a new contact is created
  Then the abstraction layer falls back to the default vocabulary {"person": "Contact"}
  And the timeline event reads "Contact created"
```

---

## Technical Implementation

### 1. Endpoint Definition

**File:** `abstraction-layer/routes/crm.py`

*   **Method:** `POST`
*   **Path:** `/api/modules/crm/contact/create`
*   **Auth:** Bearer token (standard MAL auth dependency)

### 2. Vocabulary Resolution Logic

The route must determine the correct label for the "person" concept to use in the timeline event and to return to the frontend for dynamic rendering.

*   **Source:** Query the `SM Site Registry` DocType (part of `sm_provisioning`) for the `vocabulary_config` JSON field.
*   **Key:** Look for the key `"person"`.
*   **Fallback:** If the registry entry or key is missing, default to `"Contact"`.
*   **Storage (Future):** This logic should eventually be refactored into a shared vocabulary service once more concepts are introduced, but for this story, inline resolution is acceptable.

### 3. Frappe Document Creation

*   **DocType:** `Contact` (Native ERPNext/Frappe DocType).
*   **Mapping:** Map the JSON payload fields to Contact fields.
    *   `first_name` -> `first_name`
    *   `last_name` -> `last_name`
    *   `email_id` -> `email_id`
    *   `phone` -> `phone`
    *   `mobile_no` -> `mobile_no`
*   **Insert:** Use `frappe.get_doc({...}).insert()` within the `frappe` client context provided by the MAL dependency.

### 4. Timeline Event Creation

Upon successful insertion of the `Contact` document, create a `Communication` record to log the event in the CRM timeline.

*   **DocType:** `Communication`
*   **Fields:**
    *   `communication_type`: `"Comment"`
    *   `subject`: `"Record Creation"`
    *   `content`: `f"{person_label} created"` (where `person_label` is the resolved vocabulary).
    *   `reference_doctype`: `"Contact"`
    *   `reference_name`: `contact.name` (The ID of the newly created contact).
    *   `sent_or_received`: `"Sent"` (Internal log).

### 5. Response Payload

Return the created document data and the resolved vocabulary.

```json
{
  "data": {
    "name": "CONTACT-001",
    "first_name": "John",
    "last_name": "Doe",
    "email_id": "john@example.com",
    "phone": null
  },
  "vocabulary": {
    "person": "Client"
  }
}
```

---

## Code Snippets

**`abstraction-layer/routes/crm.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, get_frappe_client
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/modules/crm", tags=["crm"])

class ContactCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email_id: Optional[str] = None
    phone: Optional[str] = None
    mobile_no: Optional[str] = None

@router.post("/contact/create")
async def create_contact(
    data: ContactCreateRequest,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """Create a new contact with vocabulary resolution and timeline event."""
    
    # 1. Vocabulary Resolution
    person_label = "Contact" # Default fallback
    try:
        site_name = frappe.get_site_name()
        vocab_json = frappe.db.get_value("SM Site Registry", site_name, "vocabulary_config")
        if vocab_json:
            import json
            vocab = json.loads(vocab_json)
            person_label = vocab.get("person", "Contact")
    except Exception:
        pass # Ignore errors, use fallback

    # 2. Create Contact Document
    try:
        contact = frappe.get_doc({
            "doctype": "Contact",
            "first_name": data.first_name,
            "last_name": data.last_name,
            "email_id": data.email_id,
            "phone": data.phone,
            "mobile_no": data.mobile_no,
        })
        contact.insert()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Write Timeline Event (Communication)
    try:
        frappe.get_doc({
            "doctype": "Communication",
            "communication_type": "Comment",
            "subject": "Record Creation",
            "content": f"{person_label} created",
            "reference_doctype": "Contact",
            "reference_name": contact.name,
            "sent_or_received": "Sent"
        }).insert()
    except Exception as e:
        # Log error but don't fail the request if timeline write fails
        print(f"Failed to write timeline event: {e}")

    # 4. Return Response
    return {
        "data": contact.as_dict(),
        "vocabulary": {
            "person": person_label
        }
    }
```

---

## Guardrails Compliance

*   **React calls MAL only:** Compliant. Endpoint is at `/api/modules/crm/contact/create`.
*   **Native DocType:** Compliant. Uses Frappe `Contact` (not SM Contact).
*   **No TypeScript:** Compliant. Implementation is Python (FastAPI).
*   **Timeline Event:** Compliant. Uses Frappe `Communication` DocType to establish the unified activity timeline required by Platform Guardrails Leg 2.
*   **n8n Boundary:** Compliant. Timeline event is written synchronously as part of the internal state change (creation). No external systems called in the hot path.
*   **Evaluation Order:** Compliant. Uses native Frappe `Contact` (Level 1) and `Communication` (Level 1).

---

## Open Questions / Assumptions

*   **Assumption:** The `SM Site Registry` DocType exists in the `sm_provisioning` app and has a `vocabulary_config` field. If it does not exist yet, the code must handle the `does not exist` error gracefully and fall back to the default vocabulary.
*   **Assumption:** The MAL dependency `get_frappe_client` provides a context manager that allows `frappe.get_doc()` and `frappe.db.get_value()` to execute against the correct tenant site.