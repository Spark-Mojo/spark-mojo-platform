model: model-epsilon
test: 02-spec-writing
run: A
date: 2026-04-09

Now I'll write the complete story spec file:

```markdown
# Story Spec — CRM-003

**Story ID:** CRM-003
**Title:** Contact create endpoint — abstraction layer
**Category:** BACKEND
**Size:** S
**Dependencies:** None (first backend story)
**Author:** Spec Writer (Story Factory)
**Created:** 2026-04-09
**Authority:** DECISION-013, DECISION-019, DECISION-020

---

## 1. Overview

This story implements the Contact create endpoint in the Mojo Abstraction Layer (MAL).
It is the first backend story in the CRM / Client Identity capability and the sole
surface that React may call to create a contact. React never calls Frappe directly.

**What this story does:**
- Exposes `POST /api/modules/crm/contact/create` in the FastAPI MAL
- Creates a Frappe Contact document (native ERPNext DocType) via the Frappe REST API
- Resolves the "person" vocabulary label from the site's configuration and returns it in the response
- Writes a CRM activity timeline event (Frappe Communication) on successful creation
- Returns the created contact including its Frappe document name

**What this story does NOT do:**
- It does NOT create a CRM Lead (CRM-002 handles that)
- It does NOT convert a Lead to Contact (that is a separate story)
- It does NOT create ERPNext Customer or Medplum Patient projections (n8n handles cross-system creation triggered by state transitions)
- It does NOT send notifications (that is handled by the Notification Infrastructure)
- It does NOT validate insurance, schedule appointments, or perform intake triage (those are downstream stories)

---

## 2. Workflow Gate

**What is the workflow?**

The Contact create endpoint is a single-step task within the broader **Client Identity
Management** workflow. The full workflow is:

```
[Inquiry / Referral] → CRM Lead (CRM-002) → Lead Conversion → Contact Created (this story)
    → ERPNext Customer projection (n8n, downstream) → Medplum Patient projection (n8n, downstream)
    → Scheduling eligibility → Intake → Ongoing care
```

Contact creation is also a valid entry point for walk-in or direct-enrollment scenarios
where no Lead record is required. In those cases, React calls this endpoint directly.

**CRM Timeline contract:** Every contact creation writes exactly one Communication record
(type = "Other", subject = "Contact Created") to the activity timeline. This is the
mandatory CRM timeline write for this endpoint. No exceptions.

---

## 3. Functional Requirements

### 3.1 Endpoint

```
POST /api/modules/crm/contact/create
```

All React calls to this endpoint go through the MAL. The MAL calls Frappe.

### 3.2 Request

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

**Request Body (JSON):**

```json
{
  "first_name": "string (required)",
  "last_name": "string (required)",
  "email_id": "string (optional)",
  "phone": "string (optional)",
  "mobile_no": "string (optional)",
  "company_name": "string (optional)",
  "salutation": "string (optional, e.g. 'Mr', 'Ms', 'Dr')",
  "custom_fields": {
    "sm_date_of_birth": "YYYY-MM-DD (optional)",
    "sm_insurance_member_id": "string (optional)",
    "sm_payer": "string (optional, SM Payer name)",
    "sm_payer_plan_type": "string (optional)",
    "sm_referral_source": "string (optional, CRM Organization name)",
    "sm_referral_source_type": "string (optional)",
    "sm_preferred_pronouns": "string (optional)",
    "sm_communication_prefs": { ... } (optional, JSON object),
    "sm_hipaa_consent_date": "YYYY-MM-DD (optional)",
    "sm_treatment_consent_date": "YYYY-MM-DD (optional)",
    "sm_telehealth_consent_date": "YYYY-MM-DD (optional)"
  }
}
```

**Design note on `custom_fields`:** All SM-prefixed fields are passed under a
`custom_fields` wrapper. This is intentional. It separates standard Frappe Contact fields
from Spark Mojo extension fields, making the request schema self-documenting. The MAL
flattens these into the Frappe document before inserting.

**Required fields:** `first_name`, `last_name`. All others are optional.

**Field validation:**
- `email_id`: If provided, must be a valid email format. Malformed emails return HTTP 422.
- `sm_date_of_birth`: If provided, must be a valid date in the past.
- `sm_hipaa_consent_date`, `sm_treatment_consent_date`, `sm_telehealth_consent_date`:
  If provided, must be valid dates in the past or today.

### 3.3 Response

**Success (HTTP 201 Created):**

```json
{
  "success": true,
  "frappe_name": "CON-2026-00042",
  "person_label": "Client",
  "person_label_plural": "Clients",
  "data": {
    "name": "CON-2026-00042",
    "first_name": "Maria",
    "last_name": "Santos",
    "email_id": "maria@example.com",
    "phone": "+1 555-0123",
    "mobile_no": null,
    "company_name": null,
    "salutation": "Ms",
    "status": "Passive",
    "sm_date_of_birth": "1990-03-15",
    "sm_payer": null,
    "sm_consent_status": "Incomplete",
    "modified": "2026-04-09T13:20:00.000Z",
    "creation": "2026-04-09T13:20:00.000Z",
    "owner": "Administrator"
  }
}
```

**Duplicate detected (HTTP 409 Conflict):**

```json
{
  "success": false,
  "error": "duplicate_contact",
  "message": "A contact with this email or phone may already exist.",
  "duplicates": [
    {
      "name": "CON-2026-00001",
      "first_name": "Maria",
      "last_name": "Santos",
      "email_id": "maria@example.com",
      "phone": "+1 555-0123"
    }
  ]
}
```

**Validation error (HTTP 422):**

```json
{
  "success": false,
  "error": "validation_error",
  "details": [
    { "field": "first_name", "message": "first_name is required" },
    { "field": "sm_date_of_birth", "message": "Date must be in the past" }
  ]
}
```

**Authentication error (HTTP 401):**

```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Invalid or missing authentication token."
}
```

### 3.4 Vocabulary Resolution

The MAL resolves the "person" concept to the site's configured label. This value
is read from the `SM Site Registry` DocType (sm_provisioning app) on the current
Frappe site. The lookup is done server-side; React does not need to call a separate
vocabulary endpoint for this story.

**Resolution logic:**

1. Query `SM Site Registry` for the current site (`frappe.local.site`).
2. Read the `vocabulary_config` JSON field.
3. Extract `person` and `person_plural` values.
4. If the field is missing or the key is absent, fall back to `"Client"` / `"Clients"`.

The resolved labels are returned in the response body (`person_label`,
`person_label_plural`) so React can use them for UI rendering without a separate
API call.

**Site vocabulary examples:**

| Site / Vertical | `person` label | `person_plural` label |
|-----------------|----------------|-----------------------|
| Behavioral health (default) | Client | Clients |
| Hospitality | Guest | Guests |
| Legal | Client | Clients |
| Education | Student | Students |
| Missing config | Client (fallback) | Clients (fallback) |

### 3.5 CRM Timeline Event

On successful Contact creation, the MAL writes exactly one activity record to the
CRM timeline. This is done via the Frappe REST API immediately and synchronously within
the same request. The activity is written before the response is returned.

**Communication DocType fields used:**

| Field | Value |
|-------|-------|
| `communication_type` | `"Other"` |
| `subject` | `"Contact Created"` |
| `content` | `"Contact record created via Spark Mojo CRM."` |
| `reference_doctype` | `"Contact"` |
| `reference_name` | `<created contact frappe_name>` |
| `communication_medium` | `"Email"` (Frappe default, not changed) |

**Note on `communication_medium`:** Frappe Communication requires a value in this
field. "Email" is used as a neutral default. The field is not meaningful for system-initiated
activities and will not be surfaced in the React timeline UI. This is an existing Frappe
constraint, not a design choice.

### 3.6 Consent Status Computation (Server-Side Hook)

After the Contact is inserted, a Frappe server script hook (`on_contact_insert`) reads
the healthcare-specific consent date fields and computes `sm_consent_status`:

| Condition | `sm_consent_status` value |
|-----------|--------------------------|
| `sm_hipaa_consent_date` is set AND `sm_treatment_consent_date` is set | `"Complete"` |
| `sm_hipaa_consent_date` is set AND `sm_treatment_consent_date` is NOT set | `"Incomplete"` |
| Neither consent date is set (or site is not healthcare) | Leave field unchanged (default blank) |

The MAL does not set `sm_consent_status` directly. It is computed by the server script.
If the site is not configured for healthcare (no `sm_hipaa_consent_date` fields present),
the hook exits silently.

### 3.7 Duplicate Detection

Before inserting, the MAL checks for potential duplicates by querying the Contact
DocType for existing records matching any of:
- `email_id` (exact match, case-insensitive)
- `phone` (exact match)
- `mobile_no` (exact match)

If any match is found, the endpoint returns HTTP 409 Conflict with the duplicate
records. The caller (React) decides whether to proceed with creation or merge.

**Duplicate threshold:** Any single match (email OR phone OR mobile) triggers the
409 response. No fuzzy matching in this story. Fuzzy matching is CRM-011.

---

## 4. Data Model

### 4.1 Frappe DocTypes Used

| DocType | Role | Access |
|---------|------|--------|
| `Contact` | Canonical person record | Create via Frappe REST API |
| `Communication` | CRM activity timeline | Create via Frappe REST API |
| `SM Site Registry` | Tenant vocabulary config | Read via Frappe REST API |

### 4.2 SM Custom Fields Referenced

These fields are assumed to exist on the `Contact` DocType. They are added by
CRM-004 (custom fields provisioning). If a field does not exist (site not yet
provisioned for that vertical), the MAL logs a warning and skips that field.
It does NOT fail the request.

| Field | Type | Purpose |
|-------|------|---------|
| `sm_date_of_birth` | Date | Person date of birth |
| `sm_insurance_member_id` | Data | Insurance member ID |
| `sm_payer` | Link (SM Payer) | Insurance payer |
| `sm_payer_plan_type` | Select | Plan type |
| `sm_referral_source` | Link (CRM Organization) | Referral source |
| `sm_referral_source_type` | Select | Referral source category |
| `sm_preferred_pronouns` | Select | Pronoun preference |
| `sm_communication_prefs` | JSON | Communication preferences |
| `sm_hipaa_consent_date` | Date | HIPAA consent date |
| `sm_treatment_consent_date` | Date | Treatment consent date |
| `sm_telehealth_consent_date` | Date | Telehealth consent date |
| `sm_consent_status` | Select | Computed consent status |

### 4.3 Document Name Format

Frappe auto-generates Contact names in the format `CON-YYYY-NNNNNN`
(e.g., `CON-2026-00042`). The MAL returns this name as `frappe_name` in the
response. React uses this as the contact ID for all subsequent API calls.

---

## 5. Architecture

### 5.1 Call Flow

```
React CRM Mojo
    |
    | POST /api/modules/crm/contact/create
    | Authorization: Bearer <token>
    |
    v
FastAPI MAL (mal/abstraction_layer/routes/crm.py)
    |
    +-- get_current_user()     [auth dependency]
    +-- get_frappe_client()    [Frappe REST client dependency]
    |
    +-- Validate request body
    +-- Check for duplicates (email, phone, mobile)
    |
    |   [If duplicates found]
    |       RETURN HTTP 409 Conflict + duplicate records
    |
    |   [If no duplicates]
    |
    +-- Read vocabulary from SM Site Registry
    +-- Flatten custom_fields into contact data
    |
    +-- POST to Frappe REST API: POST /api/resource/Contact
    |       Creates Contact document in Frappe
    |
    +-- POST to Frappe REST API: POST /api/resource/Communication
    |       Writes CRM timeline event
    |
    |   [Frappe server script: on_contact_insert]
    |       Computes sm_consent_status from consent dates
    |       Saves Contact with updated sm_consent_status
    |
    +-- GET to Frappe REST API: GET /api/resource/Contact/<frappe_name>
    |       Fetches the complete contact record (including computed fields)
    |
    +-- RETURN HTTP 201 Created
            {
              "success": true,
              "frappe_name": "CON-2026-00042",
              "person_label": "Client",
              "person_label_plural": "Clients",
              "data": { ... full contact record ... }
            }
```

### 5.2 Where Each Responsibility Lives

| Responsibility | Where | Why |
|---------------|-------|-----|
| Authentication | `get_current_user` dependency | MAL-wide, consistent |
| Frappe communication | `get_frappe_client` dependency | MAL-wide, consistent |
| Request validation | MAL route handler | FastAPI Pydantic model |
| Duplicate detection | MAL route handler | Must happen before Frappe insert |
| Vocabulary resolution | MAL route handler + SM Site Registry | Tenant-specific, read at request time |
| Contact creation | Frappe REST API | Frappe owns the document |
| Timeline write | MAL route handler + Frappe REST API | CRM contract (Leg 2 of platform) |
| Consent status computation | Frappe server script hook | Must run in Frappe context after insert |
| Response formatting | MAL route handler | MAL controls the contract with React |

### 5.3 Frappe Server Script Hook

File: `frappe-apps/sm_widgets/sm_widgets/crm_hooks.py`

```python
import frappe

def on_contact_insert(doc, method):
    """Compute sm_consent_status after Contact is inserted.
    
    Healthcare verticals only. Silent no-op for other verticals.
    """
    hipaa = getattr(doc, "sm_hipaa_consent_date", None)
    treatment = getattr(doc, "sm_treatment_consent_date", None)
    
    if hipaa and treatment:
        doc.sm_consent_status = "Complete"
    elif hipaa:
        doc.sm_consent_status = "Incomplete"
    else:
        # Non-healthcare site or no consent dates provided
        return
    
    doc.save(ignore_permissions=True)
    frappe.db.commit()
```

Registration: Add to `sm_widgets/hooks.py`:

```python
doc_events = {
    "Contact": {
        "after_insert": "sm_widgets.crm_hooks.on_contact_insert",
    }
}
```

### 5.4 MAL Route Implementation

File: `mal/abstraction_layer/routes/crm.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from .auth import get_current_user, get_frappe_client
from .dependencies import FrappeClient

router = APIRouter(prefix="/api/modules/crm", tags=["crm"])

# ─── Request Models ────────────────────────────────────────────────────────────

class ContactCustomFields(BaseModel):
    sm_date_of_birth: Optional[str] = None
    sm_insurance_member_id: Optional[str] = None
    sm_payer: Optional[str] = None
    sm_payer_plan_type: Optional[str] = None
    sm_referral_source: Optional[str] = None
    sm_referral_source_type: Optional[str] = None
    sm_preferred_pronouns: Optional[str] = None
    sm_communication_prefs: Optional[dict] = None
    sm_hipaa_consent_date: Optional[str] = None
    sm_treatment_consent_date: Optional[str] = None
    sm_telehealth_consent_date: Optional[str] = None

    class Config:
        extra = "allow"  # Allow unknown fields; skip them if not provisioned


class CreateContactRequest(BaseModel):
    first_name: str = Field(..., min_length=1, description="First name (required)")
    last_name: str = Field(..., min_length=1, description="Last name (required)")
    email_id: Optional[str] = None
    phone: Optional[str] = None
    mobile_no: Optional[str] = None
    company_name: Optional[str] = None
    salutation: Optional[str] = None
    custom_fields: Optional[ContactCustomFields] = None

    @field_validator("email_id")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower()

    @field_validator("sm_date_of_birth", "sm_hipaa_consent_date",
                     "sm_treatment_consent_date", "sm_telehealth_consent_date")
    @classmethod
    def validate_date_not_future(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        from datetime import date
        try:
            parsed = date.fromisoformat(v)
            if parsed > date.today():
                raise ValueError("Date must not be in the future")
        except ValueError:
            raise ValueError(f"Invalid date format: {v}. Use YYYY-MM-DD.")
        return v

    class Config:
        extra = "forbid"


# ─── Helper Functions ──────────────────────────────────────────────────────────

def _get_person_vocabulary(frappe: FrappeClient) -> tuple[str, str]:
    """Resolve person label from SM Site Registry.
    
    Returns (person_label, person_label_plural).
    Falls back to 'Client' / 'Clients' if not configured.
    """
    defaults = ("Client", "Clients")
    
    try:
        site_doc = frappe.get_doc("SM Site Registry", frappe.site_name)
        vocab_raw = getattr(site_doc, "vocabulary_config", None)
        if not vocab_raw:
            return defaults
        
        import json
        vocab = json.loads(vocab_raw)
        person = vocab.get("person", defaults[0])
        person_plural = vocab.get("person_plural", defaults[1])
        return person, person_plural
    except Exception:
        # SM Site Registry not found or not configured — use defaults
        return defaults


def _check_duplicates(
    frappe: FrappeClient,
    email_id: Optional[str],
    phone: Optional[str],
    mobile_no: Optional[str],
) -> list[dict]:
    """Check for existing contacts with matching email, phone, or mobile."""
    or_filters = []
    
    if email_id:
        or_filters.append(["email_id", "=", email_id.lower()])
    if phone:
        or_filters.append(["phone", "=", phone])
    if mobile_no:
        or_filters.append(["mobile_no", "=", mobile_no])
    
    if not or_filters:
        return []
    
    try:
        return frappe.get_list(
            "Contact",
            or_filters=or_filters,
            fields=["name", "first_name", "last_name", "email_id", "phone", "mobile_no"],
            limit_page_length=10,
        )
    except Exception:
        return []  # If Frappe returns an error, proceed without duplicate check


def _write_timeline_event(
    frappe: FrappeClient,
    contact_name: str,
) -> None:
    """Write a CRM activity timeline event (Communication) for contact creation."""
    frappe.insert(
        "Communication",
        {
            "communication_type": "Other",
            "subject": "Contact Created",
            "content": "Contact record created via Spark Mojo CRM.",
            "reference_doctype": "Contact",
            "reference_name": contact_name,
        },
    )


# ─── Route ──────────────────────────────────────────────────────────────────────

@router.post(
    "/contact/create",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Contact",
    description="Creates a Frappe Contact document, writes a CRM timeline event, "
                "and returns the created contact with vocabulary labels.",
)
async def create_contact(
    data: CreateContactRequest,
    user: dict = Depends(get_current_user),
    frappe: FrappeClient = Depends(get_frappe_client),
) -> dict:
    """Create a new Contact in Frappe CRM.
    
    This endpoint:
    1. Validates the request body
    2. Checks for duplicate contacts (email, phone, mobile)
    3. Creates the Contact document in Frappe
    4. Writes a CRM timeline event (Communication)
    5. Returns the created contact with its Frappe name and vocabulary labels
    """
    # Step 1: Check for duplicates
    duplicates = _check_duplicates(
        frappe,
        email_id=data.email_id,
        phone=data.phone,
        mobile_no=data.mobile_no,
    )
    
    if duplicates:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "success": False,
                "error": "duplicate_contact",
                "message": "A contact with this email or phone may already exist.",
                "duplicates": duplicates,
            },
        )
    
    # Step 2: Resolve vocabulary
    person_label, person_label_plural = _get_person_vocabulary(frappe)
    
    # Step 3: Build contact document payload
    contact_payload = {
        "first_name": data.first_name,
        "last_name": data.last_name,
    }
    
    if data.email_id:
        contact_payload["email_id"] = data.email_id
    if data.phone:
        contact_payload["phone"] = data.phone
    if data.mobile_no:
        contact_payload["mobile_no"] = data.mobile_no
    if data.company_name:
        contact_payload["company_name"] = data.company_name
    if data.salutation:
        contact_payload["salutation"] = data.salutation
    
    # Step 4: Add custom fields (only those that are set and provisioned)
    if data.custom_fields:
        cf = data.custom_fields.model_dump(exclude_none=True)
        for field_name, field_value in cf.items():
            # Only include fields that have a value
            if field_value is not None:
                contact_payload[field_name] = field_value
    
    # Step 5: Create Contact in Frappe
    created = frappe.insert("Contact", contact_payload)
    frappe_name = created["name"]
    
    # Step 6: Write CRM timeline event
    try:
        _write_timeline_event(frappe, frappe_name)
    except Exception as e:
        # Timeline write failure is logged but does NOT fail the request.
        # The contact was created successfully. Timeline can be backfilled.
        import logging
        logging.warning(f"[CRM-003] Failed to write timeline event for {frappe_name}: {e}")
    
    # Step 7: Fetch complete contact record (includes computed fields from hook)
    try:
        complete_contact = frappe.get_doc("Contact", frappe_name)
    except Exception:
        # Fallback: return what Frappe returned on insert
        complete_contact = created
    
    return {
        "success": True,
        "frappe_name": frappe_name,
        "person_label": person_label,
        "person_label_plural": person_label_plural,
        "data": complete_contact,
    }
```

### 5.5 Frappe REST API Calls Made

| Action | Method | Endpoint |
|--------|--------|----------|
| Create Contact | `POST` | `/api/resource/Contact` |
| Write timeline | `POST` | `/api/resource/Communication` |
| Fetch complete record | `GET` | `/api/resource/Contact/{name}` |
| Read vocabulary | `GET` | `/api/resource/SM Site Registry/{site_name}` |
| Check duplicates | `GET` | `/api/resource/Contact` (with `or_filters`) |

---

## 6. Acceptance Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| AC-1 | `POST /api/modules/crm/contact/create` with valid `first_name` and `last_name` returns HTTP 201 and the created contact with `frappe_name` | Integration test |
| AC-2 | The returned contact is findable by `frappe_name` in Frappe Desk | Manual verification |
| AC-3 | A Communication record exists for the created contact with `subject = "Contact Created"` and `reference_doctype = "Contact"` | Frappe DB query |
| AC-4 | The response includes `person_label` and `person_label_plural` resolved from SM Site Registry (or defaults) | Integration test with mocked / real site |
| AC-5 | Missing `first_name` or `last_name` returns HTTP 422 with field-level error details | Integration test |
| AC-6 | An existing contact with matching `email_id` returns HTTP 409 with the duplicate record in `duplicates` | Integration test |
| AC-7 | An existing contact with matching `phone` returns HTTP 409 | Integration test |
| AC-8 | An existing contact with matching `mobile_no` returns HTTP 409 | Integration test |
| AC-9 | A request with a future `sm_date_of_birth` returns HTTP 422 | Integration test |
| AC-10 | A malformed `email_id` returns HTTP 422 | Integration test |
| AC-11 | An unauthenticated request returns HTTP 401 | Integration test |
| AC-12 | `sm_custom_fields` are passed through to Frappe Contact | Frappe DB verification |
| AC-13 | On a healthcare-configured site, `sm_consent_status` is computed to "Complete" when both HIPAA and treatment consent dates are set | Frappe DB verification after insert |
| AC-14 | Timeline write failure does NOT cause the request to return an error | Mock timeline API failure |
| AC-15 | Custom fields not yet provisioned on the site are silently skipped without failing the request | Integration test on minimal site |

---

## 7. Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid JSON body | HTTP 400 Bad Request |
| Missing required fields | HTTP 422 Unprocessable Entity |
| Malformed email | HTTP 422 Unprocessable Entity |
| Future date in date fields | HTTP 422 Unprocessable Entity |
| Duplicate found | HTTP 409 Conflict with duplicate records |
| Frappe REST API unavailable | HTTP 503 Service Unavailable |
| Frappe returns an error on Contact insert | HTTP 502 Bad Gateway with error message |
| SM Site Registry not found | Use vocabulary defaults, do not fail |
| Custom field not provisioned | Skip field, do not fail |

---

## 8. File Changes

| File | Action | Notes |
|------|--------|-------|
| `mal/abstraction_layer/routes/crm.py` | Create | Route handler and models |
| `mal/abstraction_layer/routes/__init__.py` | Update | Register `crm` router if not already registered |
| `frappe-apps/sm_widgets/sm_widgets/crm_hooks.py` | Create | `on_contact_insert` server script hook |
| `frappe-apps/sm_widgets/hooks.py` | Update | Register `doc_events` for Contact `after_insert` |

---

## 9. Open Questions (This Story)

| # | Question | Impact | Recommendation |
|---|---------|--------|----------------|
| OQ-CRM003-1 | Should the timeline event content include who created the contact (user name from the auth token)? | The Communication record currently has no sender field for system-initiated creates. Adding it would improve auditability. | **Do it.** Update the Communication content to: `"Contact record created via Spark Mojo CRM by {user_email}."` The `sender` field can be set to the user's email. |
| OQ-CRM003-2 | Should the endpoint also create an SM CRM Extension DocType record alongside Contact? | Research recommends Option A (no new DocTypes initially). Adding Extension creation here would make this story larger than Size S. | **No.** CRM-003 is the minimal viable MAL entry point. SM CRM Extension creation is a later story if needed. |
| OQ-CRM003-3 | Should vocabulary be cached? Resolving from SM Site Registry on every request adds latency. | Small payload, changes rarely. Caching adds complexity. | **No caching in this story.** Evaluate caching when latency profiling shows it matters. |

---

## 10. Definition of Done

- [ ] All 15 acceptance criteria pass (automated integration tests)
- [ ] Route registered in MAL router
- [ ] `frappe_name` is returned in response
- [ ] Timeline event is verifiable in Frappe DB
- [ ] Server script hook registered and verified in Frappe
- [ ] Duplicate detection returns HTTP 409 with correct payload
- [ ] Vocabulary defaults are verified for unconfigured sites
- [ ] No hardcoded colors (not applicable — backend only)
- [ ] No TypeScript (not applicable — backend only)
- [ ] Files follow existing MAL project structure and conventions

---

*Spec factory hat: Read this file and the existing codebase. Implement only what is described here.
If the existing codebase contradicts this spec, write BLOCKED-CRM-003.md and stop.*
```