model: model-beta
test: 02-spec-writing
run: A
date: 2026-04-09

```markdown
# Story Spec: CRM-003 — Contact Create Endpoint (Abstraction Layer)

**Story ID:** CRM-003
**Title:** Contact create endpoint — abstraction layer
**Category:** BACKEND
**Size:** S
**Dependencies:** None (first backend story for CRM capability)
**Author:** Spec Writer hat, Spark Mojo Build Factory
**Date:** April 9, 2026

---

## 1. Purpose

This story builds the MAL (Mojo Abstraction Layer) endpoint that creates a new Contact record in Frappe. It is the first backend story for the CRM / Client Identity capability. React will call this endpoint to create contacts. React never calls Frappe directly.

**What this story delivers:**

1. A `POST /api/modules/crm/contact/create` FastAPI route
2. Creation of a native Frappe **Contact** document (ERPNext core DocType — not a custom SM DocType)
3. Vocabulary resolution: the word "person" resolves to the site's configured label (e.g., "Client" for behavioral health)
4. A CRM timeline event (Frappe Communication record) written on successful creation
5. A response containing the created Contact and its Frappe `name` (document ID)

**What this story does NOT deliver:**

- No React UI (frontend stories are separate)
- No custom fields on Contact (that is a provisioning story)
- No duplicate detection (separate story)
- No Lead conversion (separate story)
- No n8n workflows triggered by this endpoint
- No authentication middleware (caller authentication is assumed to already exist in the MAL; if it does not, this story adds a `TODO` comment and proceeds without it)

---

## 2. Platform Guardrails Compliance

| Guardrail | Compliance |
|-----------|------------|
| **React never calls Frappe directly** | ✅ This IS the abstraction layer endpoint React calls. |
| **Never modify core Frappe/ERPNext** | ✅ Uses native Contact DocType via Frappe API. No core modifications. |
| **SM DocTypes prefixed "SM "** | ✅ No new DocTypes created. Contact is native Frappe. |
| **No TypeScript** | ✅ Backend only. No frontend files. |
| **No hardcoded hex colors** | ✅ Backend only. No UI. |
| **Evaluation order: native → community → third-party → custom** | ✅ Contact is native Frappe. Communication is native Frappe. No custom DocTypes needed. |

### Spec Gate Answers

| Gate | Answer |
|------|--------|
| **Gate 1 — Workflow** | Contact creation is the first step in every person-related workflow on the platform. This story does not define a workflow itself — it provides the atomic operation that workflows depend on. |
| **Gate 2 — CRM Timeline** | ✅ This endpoint writes a CRM timeline event (Communication record) on every successful Contact creation. |
| **Gate 3 — Right Level** | ✅ Universal. Contact creation is not vertical-specific. Vocabulary resolution makes it render correctly for any vertical. |

---

## 3. Architecture

```
React CRM Mojo (future story)
    │
    ▼
POST /api/modules/crm/contact/create   ◄── THIS STORY
    │
    ├─► Frappe API: insert Contact document
    ├─► Frappe API: read vocabulary config from SM Site Registry
    └─► Frappe API: insert Communication document (timeline event)
    │
    ▼
JSON response → React
```

**Key architectural decisions:**

- **Contact is the native Frappe Contact DocType.** Per DECISION-013, Contact is the canonical person record. We do not create an SM Contact DocType.
- **Timeline events use Frappe's Communication DocType** with `communication_type = "Notification"` and a custom `sm_event_type` marker in the `content` field. This is the simplest approach that uses native Frappe. If Communication proves unsuitable for cross-system activity tracking in later stories, a dedicated SM CRM Activity DocType can be introduced without breaking this endpoint.
- **Vocabulary resolution** reads from a JSON field on SM Site Registry (if it exists) or returns hardcoded defaults. The abstraction layer resolves vocabulary and includes it in the response so React never needs to know the raw Frappe field names vs. display labels.

---

## 4. Endpoint Specification

### 4.1 Route

```
POST /api/modules/crm/contact/create
```

### 4.2 Request

**Content-Type:** `application/json`

**Body:**

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email_id": "jane.doe@example.com",
  "phone": "555-123-4567",
  "mobile_no": "555-987-6543",
  "company_name": "Acme Corp",
  "designation": "Manager"
}
```

**Field rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `first_name` | string | **Yes** | Non-empty, max 140 chars |
| `last_name` | string | No | Max 140 chars |
| `email_id` | string | No | Valid email format if provided |
| `phone` | string | No | Max 140 chars |
| `mobile_no` | string | No | Max 140 chars |
| `company_name` | string | No | Max 140 chars |
| `designation` | string | No | Max 140 chars |

> **Note for implementer:** The 140-char limit matches Frappe's default `Data` field length. If the codebase already has a shared validation utility, use it. If not, inline validation is fine for this story.

The endpoint accepts **only the fields listed above**. Any additional fields in the request body must be silently ignored (do not pass arbitrary keys through to Frappe). This is the allowlist pattern — it prevents callers from setting internal fields like `name`, `owner`, `creation`, or future custom `sm_*` fields that should only be set by provisioning or n8n workflows.

### 4.3 Response — Success

**Status:** `201 Created`

```json
{
  "data": {
    "name": "CONT-00001",
    "first_name": "Jane",
    "last_name": "Doe",
    "full_name": "Jane Doe",
    "email_id": "jane.doe@example.com",
    "phone": "555-123-4567",
    "mobile_no": "555-987-6543",
    "company_name": "Acme Corp",
    "designation": "Manager",
    "creation": "2026-04-09 14:30:00.000000"
  },
  "timeline_event": {
    "name": "COMM-00001",
    "event_type": "contact_created"
  },
  "vocabulary": {
    "person": "Client",
    "person_plural": "Clients"
  }
}
```

**Field notes:**

| Response field | Source |
|---------------|--------|
| `data.name` | Frappe's auto-generated document ID for the Contact. This is the primary key React uses for all subsequent operations on this contact. |
| `data.full_name` | Frappe computes this from `first_name` + `last_name`. Return whatever Frappe sets. |
| `data.creation` | Frappe's auto-generated creation timestamp. |
| `timeline_event.name` | Frappe's auto-generated document ID for the Communication record. |
| `timeline_event.event_type` | Always `"contact_created"` for this endpoint. |
| `vocabulary.person` | The resolved label for the "person" concept on this site. |
| `vocabulary.person_plural` | The resolved plural label. |

### 4.4 Response — Validation Error

**Status:** `400 Bad Request`

```json
{
  "error": "validation_error",
  "message": "first_name is required",
  "field": "first_name"
}
```

### 4.5 Response — Frappe Error

**Status:** `502 Bad Gateway`

```json
{
  "error": "upstream_error",
  "message": "Failed to create contact in Frappe",
  "detail": "<Frappe error message if available>"
}
```

> **Why 502?** The MAL is a gateway to Frappe. If Frappe fails, the MAL is reporting an upstream failure. Do not return Frappe's raw error response or stack trace to the caller.

---

## 5. Implementation Guide

### 5.1 File Location

Look at the existing codebase to determine where MAL routes live. Expected patterns (check in this order):

1. `abstraction-layer/routes/crm.py` — if CRM routes file already exists, add to it
2. `abstraction-layer/routes/` directory — if it exists, create `crm.py` there
3. `mal/routes/` — alternate naming convention
4. Root-level `main.py` or `app.py` — if routes are registered there, follow the existing pattern

If no route files exist yet, create `routes/crm.py` and register it in the FastAPI app's main file using `app.include_router(...)`.

**Router prefix:** `/api/modules/crm`

### 5.2 Pseudocode

```python
# File: routes/crm.py (or wherever the codebase convention dictates)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional

# Import whatever auth and Frappe client utilities exist in the codebase.
# Look for patterns like:
#   from auth import get_current_user, get_frappe_client
#   from dependencies import FrappeClient
#   from utils.frappe import call_frappe
#
# If no auth dependency exists yet, add a TODO comment and proceed without it.
# If no Frappe client utility exists, use the `requests` library to call
# Frappe's REST API directly (see Section 5.3).

router = APIRouter(prefix="/api/modules/crm", tags=["crm"])


# --- Request model ---

class ContactCreateRequest(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email_id: Optional[str] = None  # Use EmailStr if pydantic[email] is installed
    phone: Optional[str] = None
    mobile_no: Optional[str] = None
    company_name: Optional[str] = None
    designation: Optional[str] = None


# --- Vocabulary resolution (internal helper) ---

def resolve_vocabulary(frappe_client) -> dict:
    """
    Read vocabulary config from SM Site Registry.
    Returns default labels if SM Site Registry is not found
    or has no vocabulary_config field.
    """
    defaults = {
        "person": "Contact",
        "person_plural": "Contacts",
    }

    try:
        # Attempt to read SM Site Registry for the current site.
        # The DocType is "SM Site Registry". The document name is the site name.
        # Look for a field called "vocabulary_config" containing a JSON string.
        #
        # HOW to get the site name depends on the codebase:
        #   - It may be in an env var (FRAPPE_SITE_NAME)
        #   - It may be derived from the request's Host header
        #   - It may be a config value
        # Check the existing codebase for the pattern. If unsure, try the
        # frappe_client to call:
        #   GET /api/method/frappe.client.get_list
        #     doctype=SM Site Registry&limit_page_length=1
        # and use the first result.

        site_registry = frappe_client.get_doc("SM Site Registry", site_name)
        if site_registry and site_registry.get("vocabulary_config"):
            import json
            vocab = json.loads(site_registry["vocabulary_config"])
            # Only override keys that exist in the vocab config
            defaults.update({
                "person": vocab.get("person", defaults["person"]),
                "person_plural": vocab.get("person_plural", defaults["person_plural"]),
            })
    except Exception:
        # SM Site Registry may not exist on this site yet.
        # That is fine — return defaults.
        pass

    return defaults


# --- Timeline event writer (internal helper) ---

def write_timeline_event(frappe_client, contact_name: str, contact_full_name: str, vocabulary: dict) -> dict:
    """
    Write a Communication record to serve as the CRM timeline event.
    Returns the created Communication's name and event_type.
    """
    person_label = vocabulary.get("person", "Contact")

    communication_data = {
        "doctype": "Communication",
        "communication_type": "Notification",
        "subject": f"{person_label} created: {contact_full_name}",
        "content": f"New {person_label.lower()} record created.",
        "reference_doctype": "Contact",
        "reference_name": contact_name,
        "communication_medium": "Other",
        "sent_or_received": "Sent",
    }

    comm = frappe_client.insert(communication_data)

    return {
        "name": comm.get("name"),
        "event_type": "contact_created",
    }


# --- Endpoint ---

@router.post("/contact/create", status_code=201)
async def create_contact(payload: ContactCreateRequest):
    """
    Create a new Frappe Contact document.

    1. Validate input (Pydantic handles most of this)
    2. Create Contact in Frappe
    3. Resolve vocabulary for the current site
    4. Write a CRM timeline event (Communication record)
    5. Return the created contact, timeline event, and vocabulary
    """

    # --- Get Frappe client ---
    # Use whatever pattern exists in the codebase.
    # This is a placeholder — replace with actual client acquisition.
    frappe_client = get_frappe_client()

    # --- Validate ---
    if not payload.first_name or not payload.first_name.strip():
        raise HTTPException(status_code=400, detail={
            "error": "validation_error",
            "message": "first_name is required and cannot be blank",
            "field": "first_name",
        })

    # Validate email format if provided
    if payload.email_id:
        import re
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", payload.email_id):
            raise HTTPException(status_code=400, detail={
                "error": "validation_error",
                "message": "email_id is not a valid email address",
                "field": "email_id",
        })

    # --- Build Contact document ---
    contact_data = {
        "doctype": "Contact",
        "first_name": payload.first_name.strip(),
    }

    # Add optional fields only if provided
    if payload.last_name:
        contact_data["last_name"] = payload.last_name.strip()
    if payload.email_id:
        # Frappe Contact stores emails in a child table "email_ids"
        # AND has a top-level "email_id" field that is the primary email.
        # Setting email_id directly may work, but the canonical way is
        # to add an entry to the email_ids child table.
        # Check how the existing codebase or Frappe version handles this.
        # 
        # OPTION A: Set top-level field (simpler, works on most Frappe versions)
        contact_data["email_id"] = payload.email_id.strip()
        #
        # OPTION B: Use child table (more correct for Frappe Contact)
        # contact_data["email_ids"] = [
        #     {"email_id": payload.email_id.strip(), "is_primary": 1}
        # ]
        #
        # Try Option A first. If Frappe rejects it, switch to Option B.
    if payload.phone:
        # Same pattern as email — Frappe Contact has a "phone_nos" child table
        # and a top-level "phone" field.
        contact_data["phone"] = payload.phone.strip()
        # Or: contact_data["phone_nos"] = [
        #     {"phone": payload.phone.strip(), "is_primary_phone": 1}
        # ]
    if payload.mobile_no:
        contact_data["mobile_no"] = payload.mobile_no.strip()
        # Or: contact_data["phone_nos"].append(
        #     {"phone": payload.mobile_no.strip(), "is_primary_mobile_no": 1}
        # )
    if payload.company_name:
        contact_data["company_name"] = payload.company_name.strip()
    if payload.designation:
        contact_data["designation"] = payload.designation.strip()

    # --- Create Contact in Frappe ---
    try:
        created_contact = frappe_client.insert(contact_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "error": "upstream_error",
            "message": "Failed to create contact in Frappe",
            "detail": str(e),
        })

    # --- Resolve vocabulary ---
    vocabulary = resolve_vocabulary(frappe_client)

    # --- Write timeline event ---
    contact_full_name = created_contact.get("full_name")
    if not contact_full_name:
        # Fallback: construct from first_name + last_name
        parts = [created_contact.get("first_name", "")]
        if created_contact.get("last_name"):
            parts.append(created_contact["last_name"])
        contact_full_name = " ".join(parts)

    try:
        timeline_event = write_timeline_event(
            frappe_client,
            contact_name=created_contact["name"],
            contact_full_name=contact_full_name,
            vocabulary=vocabulary,
        )
    except Exception:
        # Timeline event failure should NOT fail the contact creation.
        # The contact was already created successfully.
        # Log the error and return a null timeline_event.
        timeline_event = {"name": None, "event_type": "contact_created"}

    # --- Build response ---
    response_data = {
        "name": created_contact["name"],
        "first_name": created_contact.get("first_name"),
        "last_name": created_contact.get("last_name"),
        "full_name": contact_full_name,
        "email_id": created_contact.get("email_id"),
        "phone": created_contact.get("phone"),
        "mobile_no": created_contact.get("mobile_no"),
        "company_name": created_contact.get("company_name"),
        "designation": created_contact.get("designation"),
        "creation": created_contact.get("creation"),
    }

    return {
        "data": response_data,
        "timeline_event": timeline_event,
        "vocabulary": vocabulary,
    }
```

### 5.3 Frappe Client Patterns

The implementing agent must determine how the MAL talks to Frappe. Look for an existing Frappe client in the codebase. Common patterns:

**Pattern A: `FrappeClient` from `frappe-client` pip package**

```python
from frappeclient import FrappeClient

client = FrappeClient("http://localhost:8000", "api_key", "api_secret")
doc = client.insert({"doctype": "Contact", "first_name": "Jane"})
```

**Pattern B: Raw `requests` library**

```python
import requests

FRAPPE_URL = os.environ.get("FRAPPE_URL", "http://localhost:8000")
FRAPPE_API_KEY = os.environ.get("FRAPPE_API_KEY")
FRAPPE_API_SECRET = os.environ.get("FRAPPE_API_SECRET")

headers = {
    "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
    "Content-Type": "application/json",
}

# Create Contact
resp = requests.post(
    f"{FRAPPE_URL}/api/resource/Contact",
    json={"first_name": "Jane", "last_name": "Doe"},
    headers=headers,
)
resp.raise_for_status()
created = resp.json()["data"]

# Create Communication (timeline event)
resp = requests.post(
    f"{FRAPPE_URL}/api/resource/Communication",
    json={
        "communication_type": "Notification",
        "subject": "Client created: Jane Doe",
        "content": "New client record created.",
        "reference_doctype": "Contact",
        "reference_name": created["name"],
        "communication_medium": "Other",
        "sent_or_received": "Sent",
    },
    headers=headers,
)
resp.raise_for_status()
comm = resp.json()["data"]
```

**Pattern C: Dependency injection (if the codebase uses FastAPI `Depends`)**

```python
from fastapi import Depends

@router.post("/contact/create", status_code=201)
async def create_contact(
    payload: ContactCreateRequest,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    ...
```

**Use whichever pattern already exists in the codebase.** If none exists (this is the first MAL route), use Pattern B with environment variables, as it has zero external dependencies.

### 5.4 Frappe Contact Child Tables — Important Note

Frappe's Contact DocType stores emails and phone numbers in child tables (`Contact Email` and `Contact Phone`), not just as top-level fields. The top-level `email_id`, `phone`, and `mobile_no` are **derived/primary** fields.

**When creating via the Frappe REST API (`POST /api/resource/Contact`):**

- Setting `email_id` at the top level may or may not auto-create the child table row, depending on the Frappe version.
- The safest approach is to include both:

```json
{
  "doctype": "Contact",
  "first_name": "Jane",
  "email_ids": [
    {"email_id": "jane@example.com", "is_primary": 1}
  ],
  "phone_nos": [
    {"phone": "555-123-4567", "is_primary_phone": 1}
  ]
}
```

**Test this on the actual Frappe instance.** If the simpler top-level-only approach works, use it. If Frappe returns an error or silently drops the email/phone, switch to the child table approach.

---

## 6. Vocabulary Resolution — Detail

### 6.1 What It Is

"Vocabulary resolution" means the MAL translates platform-generic concepts into site-specific display labels. The concept `"person"` might display as:

| Vertical | `person` resolves to | `person_plural` resolves to |
|----------|---------------------|-----------------------------|
| Behavioral health | Client | Clients |
| Dental | Patient | Patients |
| Legal | Client | Clients |
| Music education | Student | Students |
| Hospitality | Guest | Guests |
| Default (no config) | Contact | Contacts |

### 6.2 Where the Config Lives

The vocabulary config is stored on the **SM Site Registry** DocType (which is part of `sm_provisioning` and should already exist in the codebase). The field is `vocabulary_config`, a JSON string:

```json
{
  "person": "Client",
  "person_plural": "Clients",
  "lead": "Referral",
  "lead_plural": "Referrals"
}
```

### 6.3 How This Endpoint Uses It

1. After creating the Contact, the endpoint reads `SM Site Registry` for the current site.
2. It parses `vocabulary_config` to get the `person` and `person_plural` labels.
3. It uses the `person` label in the timeline event subject (e.g., "Client created: Jane Doe" instead of "Contact created: Jane Doe").
4. It returns the vocabulary in the response so React can use the correct labels in success messages, toasts, etc.

### 6.4 Fallback Behavior

If SM Site Registry does not exist, or has no `vocabulary_config` field, or the field is empty, or the JSON is malformed: **use defaults** (`"Contact"` / `"Contacts"`). Do not error. Vocabulary is a progressive enhancement, not a hard dependency.

### 6.5 How to Read SM Site Registry

The document name in SM Site Registry is typically the Frappe site name. To find it:

```python
# Option 1: Get site name from environment
site_name = os.environ.get("FRAPPE_SITE_NAME", "")

# Option 2: List all SM Site Registry docs (there should be one per site)
registries = frappe_client.get_list("SM Site Registry", limit_page_length=1)
if registries:
    site_name = registries[0]["name"]
```

If neither works, return defaults. Do not block contact creation on vocabulary lookup failure.

---

## 7. CRM Timeline Event — Detail

### 7.1 Why

Platform guardrail (Leg 2): *"Every capability that touches a customer record has a mandatory contract to write that event to the CRM activity timeline."* Contact creation touches a customer record. Therefore it writes a timeline event.

### 7.2 What Gets Written

A **Frappe Communication** document:

| Field | Value |
|-------|-------|
| `doctype` | `Communication` |
| `communication_type` | `Notification` |
| `subject` | `"{person_label} created: {full_name}"` — e.g., `"Client created: Jane Doe"` |
| `content` | `"New {person_label_lower} record created."` — e.g., `"New client record created."` |
| `reference_doctype` | `Contact` |
| `reference_name` | The `name` of the just-created Contact |
| `communication_medium` | `Other` |
| `sent_or_received` | `Sent` |

### 7.3 Failure Handling

If the Communication record fails to create (e.g., Frappe error, permission issue):

- **Do NOT fail the entire request.** The Contact was already created successfully.
- Return `timeline_event.name` as `null` in the response.
- Log the error (use whatever logging the codebase provides — `print()` is acceptable for this story size if no structured logging exists).

---

## 8. Error Handling Summary

| Scenario | HTTP Status | Error Code | Behavior |
|----------|-------------|------------|----------|
| `first_name` missing or blank | 400 | `validation_error` | Reject before calling Frappe |
| `email_id` format invalid | 400 | `validation_error` | Reject before calling Frappe |
| Frappe refuses to create Contact | 502 | `upstream_error` | Return Frappe error message (sanitized— no stack traces) |
| Frappe is unreachable | 502 | `upstream_error` | Return connection error message |
| Vocabulary lookup fails | — | — | Silently use defaults. No error returned. |
| Timeline event creation fails | — | — | Return `timeline_event.name: null`. Contact still returned as successful. |

---

## 9. Acceptance Criteria

Each criterion is independently testable. The story is done when all pass.

### AC-1: Successful contact creation

**Given** a valid POST to `/api/modules/crm/contact/create` with `{"first_name": "Jane", "last_name": "Doe", "email_id": "jane@example.com"}`
**When** the request is processed
**Then** a Contact document exists in Frappe with `first_name = "Jane"`, `last_name = "Doe"`, and `email_id = "jane@example.com"`
**And** the response status is `201`
**And** `response.data.name` is a non-empty string (the Frappe document ID)
**And** `response.data.first_name` is `"Jane"`
**And** `response.data.creation` is a valid timestamp

### AC-2: Minimal contact (first_name only)

**Given** a POST with `{"first_name": "Jane"}`
**When** the request is processed
**Then** a Contact document exists in Frappe with `first_name = "Jane"`
**And** the response status is `201`
**And** `response.data.name` is a non-empty string

### AC-3: Validation — missing first_name

**Given** a POST with `{"last_name": "Doe"}` (no `first_name`)
**When** the request is processed
**Then** no Contact is created in Frappe
**And** the response status is `400`
**And** `response.error` is `"validation_error"`

### AC-4: Validation — blank first_name

**Given** a POST with `{"first_name": "   "}` (whitespace only)
**When** the request is processed
**Then** no Contact is created in Frappe
**And** the response status is `400`

### AC-5: Timeline event written

**Given** a successful contact creation
**When** the Contact is created
**Then** a Communication document exists in Frappe with:
  - `reference_doctype = "Contact"`
  - `reference_name = <the created contact's name>`
  - `communication_type = "Notification"`
  - `subject` containing the contact's full name
**And** `response.timeline_event.name` is a non-empty string
**And** `response.timeline_event.event_type` is `"contact_created"`

### AC-6: Vocabulary in response

**Given** a successful contact creation
**When** SM Site Registry exists with `vocabulary_config = '{"person": "Client", "person_plural": "Clients"}'`
**Then** `response.vocabulary.person` is `"Client"`
**And** `response.vocabulary.person_plural` is `"Clients"`
**And** the Communication `subject` contains `"Client created"` (not `"Contact created"`)

### AC-7: Vocabulary defaults

**Given** a successful contact creation
**When** SM Site Registry does not exist or has no `vocabulary_config`
**Then** `response.vocabulary.person` is `"Contact"`
**And** `response.vocabulary.person_plural` is `"Contacts"`

### AC-8: Unknown fields ignored

**Given** a POST with `{"first_name": "Jane", "name": "HACKED-ID", "owner": "hacker@evil.com", "sm_medplum_patient_id": "fake-id"}`
**When** the request is processed
**Then** the Contact is created with Frappe's auto-generated `name` (not `"HACKED-ID"`)
**And** internal/custom fields are not set from the request body

### AC-9: Frappe error handling

**Given** Frappe is unreachable or returns an error
**When** the contact creation request is processed
**Then** the response status is `502`
**And** `response.error` is `"upstream_error"`
**And** no raw Frappe stack trace is exposed in the response

### AC-10: Timeline failure does not block response

**Given** a valid contact creation request
**When** the Contact is created successfully but the Communication insert fails
**Then** the response status is still `201`
**And** `response.data.name` is present (contact was created)
**And** `response.timeline_event.name` is `null`

---

## 10. Testing

### 10.1 Manual Testing (Required)

Test against the running Frappe instance (poc-dev or local):

```bash
# AC-1: Full contact
curl -X POST http://localhost:8100/api/modules/crm/contact/create \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Jane", "last_name": "Doe", "email_id": "jane@example.com", "phone": "555-1234"}'

# Verify: 201 response with name, full_name, creation
# Verify: Contact exists in Frappe (check Frappe Desk or API)
# Verify: Communication exists in Frappe linked to the Contact

# AC-2: Minimal
curl -X POST http://localhost:8100/api/modules/crm/contact/create \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Solo"}'

# Verify: 201 response

# AC-3: Missing first_name
curl -X POST http://localhost:8100/api/modules/crm/contact/create \
  -H "Content-Type: application/json" \
  -d '{"last_name": "Orphan"}'

# Verify: 400 response with validation_error

# AC-8: Unknown fields
curl -X POST http://localhost:8100/api/modules/crm/contact/create \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Sneaky", "name": "I-CHOOSE-MY-OWN-ID", "owner": "hacker"}'

# Verify: 201 response, name is NOT "I-CHOOSE-MY-OWN-ID"
```

> **Note on port:** `8100` is a placeholder. Use whatever port the MAL runs on in your environment. Check `docker-compose.yml`, `.env`, or the FastAPI startup command.

### 10.2 Automated Tests (If Test Infrastructure Exists)

If the codebase has a test directory with `pytest` configured, add a test file. If no test infrastructure exists, skip automated tests for this S-sized story — manual curl verification is sufficient.

```python
# tests/test_crm_contact_create.py (only if test infra exists)

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

# Import the FastAPI app — adjust import path to match codebase
# from main import app
# client = TestClient(app)


def test_create_contact_success(client, mock_frappe):
    mock_frappe.insert.return_value = {
        "name": "CONT-00001",
        "first_name": "Jane",
        "last_name": "Doe",
        "full_name": "Jane Doe",
        "email_id": "jane@example.com",
        "creation": "2026-04-09 14:30:00",
    }

    resp = client.post("/api/modules/crm/contact/create", json={
        "first_name": "Jane",
        "last_name": "Doe",
        "email_id": "jane@example.com",
    })

    assert resp.status_code == 201
    data = resp.json()
    assert data["data"]["name"] == "CONT-00001"
    assert data["data"]["first_name"] == "Jane"
    assert data["timeline_event"]["event_type"] == "contact_created"
    assert "vocabulary" in data


def test_create_contact_missing_first_name(client):
    resp = client.post("/api/modules/crm/contact/create", json={
        "last_name": "Orphan",
    })
    assert resp.status_code == 422 or resp.status_code == 400


def test_create_contact_blank_first_name(client):
    resp = client.post("/api/modules/crm/contact/create", json={
        "first_name": "   ",
    })
    assert resp.status_code == 400
```

---

## 11. Out of Scope (Explicit)

These items are **not** part of this story. They are documented here so the implementing agent does not build them.

| Item | Why excluded | Where it lives |
|------|-------------|----------------|
| Authentication / authorization | Assumed to exist or be a separate story. If it doesn't exist, add a `# TODO: add auth dependency` comment. | Separate story (likely ADMIN-001 or an auth middleware story) |
| Custom `sm_*` fields on Contact | Custom fields are added at provisioning, not at contact creation time. This endpoint only sets native Contact fields. | CRM-004 (provisioning story) |
| Duplicate detection | Separate capability per research doc. | CRM-011 |
| Lead creation or conversion | Different endpoint, different story. | CRM-002 |
| React UI | Frontend is a separate story category. | CRM-006+ |
| n8n webhook triggers | n8n watches Frappe events natively. This endpoint does not call n8n. | CRM-009, CRM-010 |
| Bulk contact creation | Not in scope. One contact per request. | Future story if needed |
| Contact update / delete | Different endpoints. | Future CRM stories |

---

## 12. Definition of Done

- [ ] `POST /api/modules/crm/contact/create` returns `201` with a valid Contact for a well-formed request
- [ ] Frappe Contact document is verifiable in Frappe Desk after creation
- [ ] Communication (timeline event) document is verifiable in Frappe Desk after creation
- [ ] Vocabulary is resolved from SM Site Registry when available, defaults used when not
- [ ] Timeline event subject uses the resolved vocabulary label (not hardcoded "Contact")
- [ ] Missing `first_name` returns `400`
- [ ] Frappe failure returns `502` (no raw stack traces)
- [ ] Timeline event failure does not block the `201` response
- [ ] Unknown/internal fields in the request body are ignored
- [ ] All acceptance criteria (AC-1 through AC-10) verified via manual curl commands
- [ ] Code follows existing codebase conventions (file location, import style, error handling patterns)

---

*End of story spec. The implementing agent should read this file and the existing codebase. No other documents are required.*
```