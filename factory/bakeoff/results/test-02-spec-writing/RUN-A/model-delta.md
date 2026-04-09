model: model-delta
test: 02-spec-writing
run: A
date: 2026-04-09

```markdown
# Story Spec: CRM-003
# Contact Create Endpoint — Abstraction Layer

**Story ID:** CRM-003
**Title:** Contact create endpoint — abstraction layer
**Category:** BACKEND
**Size:** S
**Sprint Priority:** First CRM backend story
**Dependencies:** None
**Capability:** CRM / Client Identity
**Target Layer:** Mojo Abstraction Layer (FastAPI)
**Frappe Target:** Native `Contact` DocType (ERPNext core — no custom DocType)

---

## Platform Gates (Mandatory — All Three Must Pass)

### Gate 1 — Workflow Answer
Contact creation is the intake entry point for the CRM identity workflow. No downstream
work is possible — no scheduling, no billing, no clinical documentation, no task
assignment — until a Contact record exists in Frappe. This endpoint creates that
foundational record. The workflow for this story is linear:
receive request → validate fields → resolve vocabulary → create Frappe Contact →
write timeline event → return result with document ID.

### Gate 2 — CRM Timeline Answer
This endpoint writes exactly one `Communication` record to the CRM timeline immediately
after the Frappe Contact is successfully inserted. The event uses the vocabulary-resolved
person label (e.g., subject = `"Client Created"` not `"Contact Created"`). This satisfies
the mandatory CRM timeline contract defined in Platform Guardrails Section 2, Gate 2.
Timeline write failure is **non-fatal**: if the Communication insert fails, the Contact
is kept and the API returns success with `meta.timeline_event_written: false`.

### Gate 3 — Right Level Answer
This capability is built at the universal level. The `Contact` DocType is native
Frappe/ERPNext (Evaluation Order Level 1 — no custom DocType needed). The abstraction
layer wraps Frappe's native insert. Vocabulary resolution elevates this from a
hardcoded label to a configurable concept, making the same endpoint serve any vertical
without code changes.

---

## Background and Context

This is the first backend story for CRM / Client Identity. It builds exactly one
endpoint. Future stories will add list, detail, update, lead CRUD, and React UI.

**Why an abstraction layer endpoint instead of React calling Frappe directly:**
Platform rule. React never calls Frappe. This endpoint is what the future Contact create
form calls. It is also what lead conversion and data import stories will call.

**Vocabulary resolution — why it matters here:**
The platform serves multiple verticals. Each vertical has a different word for "person":

| Vertical | Person label |
|----------|-------------|
| Behavioral health | Client |
| Hospitality | Guest |
| Legal | Client |
| Education | Student |
| Default (unconfigured) | Contact |

The vocabulary config lives in `SM Site Registry` for the current Frappe site as a
JSON blob under the key `vocabulary_config`. The `"person"` key in that JSON is what
this endpoint reads. The resolved label is used in the CRM timeline event and returned
in the response metadata so any future caller knows the correct label to display.

**What Frappe's Contact DocType provides:**
- `first_name`, `last_name` — top-level Data fields
- `email_ids` — child table (ContactEmail), stores email addresses
- `phone_nos` — child table (ContactPhone), stores phone numbers
- `company_name` — top-level Data field
- `status` — Select field, defaults to "Open"
- `name` — Frappe's auto-generated document ID (e.g., `CONT-00001`) — this is the
  system identifier used everywhere else in the platform

---

## What to Build

### Endpoint Definition

```
POST /api/modules/crm/contact/create
```

- **Auth:** Bearer token. Same auth dependency pattern as all other MAL routes.
- **Content-Type:** `application/json`

---

### Request Contract

All fields are strings. `first_name` and `last_name` are required. All others optional.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `first_name` | string | YES | Non-blank after `.strip()` |
| `last_name` | string | YES | Non-blank after `.strip()` |
| `email_id` | string | NO | Stored in `email_ids` child table |
| `phone` | string | NO | Stored in `phone_nos` child table |
| `mobile_no` | string | NO | Stored in `phone_nos` child table |
| `company_name` | string | NO | Stored on Contact directly |

Example minimal request:
```json
{
  "first_name": "Jane",
  "last_name": "Doe"
}
```

Example full request:
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email_id": "jane.doe@example.com",
  "mobile_no": "555-867-5309",
  "company_name": "Willow Counseling"
}
```

---

### Processing Logic — Step by Step

**Step 1 — Validate input**

- Strip whitespace from `first_name` and `last_name`.
- If either is empty after strip, return HTTP 422 with a specific message identifying
  which field failed.

**Step 2 — Resolve vocabulary label**

- Call `_resolve_person_label(frappe)` (internal helper, defined below).
- This reads `SM Site Registry` for the current site's `vocabulary_config` JSON.
- Extracts the `"person"` key.
- Returns `"Contact"` as the default if the registry is missing, the doc is missing,
  the JSON is malformed, or the `"person"` key is absent.
- This call must not raise. Any failure silently returns the default.

**Step 3 — Create Frappe Contact document**

- Use the Frappe client (see "Notes for Implementing Agent" below — follow the exact
  pattern already used in existing routes).
- `frappe.new_doc("Contact")`
- Set `first_name`, `last_name`.
- If `email_id` provided: `contact.append("email_ids", {"email_id": value, "is_primary": 1})`
- If `phone` provided: `contact.append("phone_nos", {"phone": value, "is_primary_phone": 1})`
- If `mobile_no` provided: `contact.append("phone_nos", {"phone": value, "is_primary_mobile_no": 1})`
- If `company_name` provided: `contact.company_name = value`
- Call `contact.insert()`
- On any exception: log the full error internally, return HTTP 500 with the generic
  message `"Failed to create contact. Please try again."` Do not expose Frappe
  internals or stack traces to the caller.

**Step 4 — Write CRM timeline event**

- Call `_write_timeline_event(frappe, contact.name, first_name, last_name, person_label)`
  (internal helper, defined below).
- This is non-fatal. Capture return value (True / False).
- Do NOT raise if timeline write fails. Do NOT roll back the Contact.

**Step 5 — Return response**

- HTTP 200.
- `data` block: the created contact's fields.
- `meta` block: vocabulary label and timeline write status.

---

### CRM Timeline Event — Field Specification

After successful Contact insert, create one `Communication` document with these exact field values:

| Field | Value |
|-------|-------|
| `communication_type` | `"Other"` |
| `communication_medium` | `"Other"` |
| `subject` | `f"{person_label} Created"` |
| `content` | `f"New {person_label} record created: {first_name} {last_name}"` |
| `reference_doctype` | `"Contact"` |
| `reference_name` | contact's `name` (Frappe document ID from Step 3) |
| `sent_or_received` | `"Sent"` |
| `status` | `"Linked"` |

Use `comm.insert(ignore_permissions=True)`. The system is writing this event on behalf
of the operation, not the user; bypass Frappe's user-level permission checks for this
internal event record.

Setting `communication_type = "Other"` and `communication_medium = "Other"` explicitly
avoids Frappe's email-send path. This is how the platform writes internal activity
events to the Communication DocType without triggering email processing.

---

### Response Contract

**Success — HTTP 200:**

```json
{
  "data": {
    "name": "CONT-00001",
    "first_name": "Jane",
    "last_name": "Doe",
    "email_id": "jane.doe@example.com",
    "phone": null,
    "mobile_no": "555-867-5309",
    "company_name": "Willow Counseling",
    "status": "Open"
  },
  "meta": {
    "person_label": "Client",
    "timeline_event_written": true
  }
}
```

`data.name` is the Frappe document ID. This is the value all other platform capabilities
use to reference this Contact. It is not a human name — it is the system identifier.

Note: `email_id` in the response is the top-level Frappe field (auto-populated from the
`email_ids` child table after insert). Use `getattr(contact, "email_id", None)` to
retrieve it safely.

**Validation error — HTTP 422:**

```json
{
  "detail": "first_name is required and may not be blank."
}
```

**Server error — HTTP 500:**

```json
{
  "detail": "Failed to create contact. Please try again."
}
```

---

## Files to Create / Modify

### FILE 1 — CREATE: `abstraction-layer/routes/crm.py`

New file. Contains only the create contact endpoint. Future CRM stories append to
this file.

```python
"""
CRM Abstraction Layer Routes
Capability: CRM / Client Identity

Story CRM-003: Contact create endpoint (this file's initial content).
Future stories append their sections below the CRM-003 section.

Route prefix: /api/modules/crm
All routes require Bearer token authentication.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

# Use the same import paths as the existing route files in this codebase.
# Look at any existing route file (e.g., billing routes) to find the exact
# module path for get_current_user and get_frappe_client.
from auth import get_current_user, get_frappe_client

logger = logging.getLogger("crm")

router = APIRouter(prefix="/api/modules/crm", tags=["crm"])


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class ContactCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email_id: Optional[str] = None
    phone: Optional[str] = None
    mobile_no: Optional[str] = None
    company_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------

def _resolve_person_label(frappe) -> str:
    """
    Read the per-site vocabulary config from SM Site Registry.
    Extract the 'person' key and return its value.

    Returns "Contact" as the default on any failure:
      - SM Site Registry doc not found
      - vocabulary_config field missing or null
      - JSON parse error
      - 'person' key absent from the JSON

    This function must never raise. All exceptions are swallowed and the
    default is returned.
    """
    DEFAULT_LABEL = "Contact"
    try:
        # Get the current site name. Adjust to the actual pattern used in
        # this codebase — check how existing routes get the site name.
        # Common patterns: frappe.local.site, frappe.get_site_name(),
        # a value injected via the frappe client dependency.
        site_name = frappe.local.site

        registry = frappe.get_doc("SM Site Registry", site_name)
        if registry and getattr(registry, "vocabulary_config", None):
            vocab = json.loads(registry.vocabulary_config)
            return vocab.get("person", DEFAULT_LABEL)
    except Exception as exc:
        logger.warning(
            "Vocabulary resolution failed — using default label '%s'. Reason: %s",
            DEFAULT_LABEL,
            exc,
        )
    return DEFAULT_LABEL


def _write_timeline_event(
    frappe,
    contact_name: str,
    first_name: str,
    last_name: str,
    person_label: str,
) -> bool:
    """
    Write a CRM timeline event (Communication record) for the newly created Contact.

    Non-fatal: returns True on success, False on failure.
    The caller must NOT roll back the Contact creation if this returns False.

    Uses communication_type="Other" and communication_medium="Other" to avoid
    triggering Frappe's email-send path. This is the platform pattern for writing
    internal activity events to the Communication DocType.
    """
    try:
        comm = frappe.new_doc("Communication")
        comm.communication_type = "Other"
        comm.communication_medium = "Other"
        comm.subject = f"{person_label} Created"
        comm.content = (
            f"New {person_label} record created: {first_name} {last_name}"
        )
        comm.reference_doctype = "Contact"
        comm.reference_name = contact_name
        comm.sent_or_received = "Sent"
        comm.status = "Linked"
        comm.insert(ignore_permissions=True)
        return True
    except Exception as exc:
        logger.error(
            "CRM timeline write failed for Contact '%s': %s",
            contact_name,
            exc,
        )
        return False


# ---------------------------------------------------------------------------
# CRM-003: Contact Create
# ---------------------------------------------------------------------------

@router.post("/contact/create")
async def create_contact(
    payload: ContactCreateRequest,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """
    Create a new Frappe Contact document.

    Steps:
      1. Validate first_name and last_name (non-blank after strip).
      2. Resolve the site's vocabulary label for 'person'.
      3. Create a native Frappe Contact document with provided fields.
      4. Write a CRM timeline event (non-fatal).
      5. Return the created contact with its Frappe document ID (name).

    Returns:
      200 OK  — contact created; data.name is the Frappe document ID.
      422     — validation failure (first_name or last_name invalid).
      500     — Frappe insert failed (generic message, full error logged).
    """

    # ------------------------------------------------------------------
    # Step 1 — Validate
    # ------------------------------------------------------------------
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()

    if not first_name:
        raise HTTPException(
            status_code=422,
            detail="first_name is required and may not be blank.",
        )
    if not last_name:
        raise HTTPException(
            status_code=422,
            detail="last_name is required and may not be blank.",
        )

    # ------------------------------------------------------------------
    # Step 2 — Resolve vocabulary
    # ------------------------------------------------------------------
    person_label = _resolve_person_label(frappe)

    # ------------------------------------------------------------------
    # Step 3 — Create Frappe Contact
    # ------------------------------------------------------------------
    try:
        contact = frappe.new_doc("Contact")
        contact.first_name = first_name
        contact.last_name = last_name

        if payload.email_id and payload.email_id.strip():
            contact.append("email_ids", {
                "email_id": payload.email_id.strip(),
                "is_primary": 1,
            })

        if payload.phone and payload.phone.strip():
            contact.append("phone_nos", {
                "phone": payload.phone.strip(),
                "is_primary_phone": 1,
            })

        if payload.mobile_no and payload.mobile_no.strip():
            contact.append("phone_nos", {
                "phone": payload.mobile_no.strip(),
                "is_primary_mobile_no": 1,
            })

        if payload.company_name and payload.company_name.strip():
            contact.company_name = payload.company_name.strip()

        contact.insert()

    except Exception as exc:
        logger.error("Contact creation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to create contact. Please try again.",
        )

    # ------------------------------------------------------------------
    # Step 4 — Write CRM timeline event (non-fatal)
    # ------------------------------------------------------------------
    timeline_written = _write_timeline_event(
        frappe,
        contact_name=contact.name,
        first_name=first_name,
        last_name=last_name,
        person_label=person_label,
    )

    # ------------------------------------------------------------------
    # Step 5 — Return
    # ------------------------------------------------------------------
    return {
        "data": {
            "name": contact.name,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email_id": getattr(contact, "email_id", None),
            "phone": getattr(contact, "phone", None),
            "mobile_no": getattr(contact, "mobile_no", None),
            "company_name": getattr(contact, "company_name", None),
            "status": getattr(contact, "status", None),
        },
        "meta": {
            "person_label": person_label,
            "timeline_event_written": timeline_written,
        },
    }
```

---

### FILE 2 — MODIFY: `abstraction-layer/main.py`

Find the section where other routers are registered (the `app.include_router(...)` calls).
Add the CRM router alongside them. Do not change anything else in this file.

```python
# Add this import alongside the existing router imports at the top of main.py:
from routes.crm import router as crm_router

# Add this include alongside the existing app.include_router() calls:
app.include_router(crm_router)
```

---

## Acceptance Criteria

The story is complete when **all** of the following are true and verified:

**AC-1 Endpoint is reachable:**
`POST /api/modules/crm/contact/create` with a valid token and valid body
returns HTTP 200.

**AC-2 Contact exists in Frappe after create:**
After the call, log into Frappe Desk on poc-dev → CRM → Contacts and find the
created record. The contact's `name` field in Frappe matches `response.data.name`.

**AC-3 Frappe document ID is returned:**
`response.data.name` is non-null, non-empty, and is a valid Frappe document ID
(e.g., `CONT-00001`). It is not the person's human name.

**AC-4 first_name blank returns 422:**
POST with `{"first_name": "   ", "last_name": "Doe"}` → HTTP 422, message
references `first_name`.

**AC-5 first_name missing returns 422:**
POST with `{"last_name": "Doe"}` → HTTP 422, message references `first_name`.

**AC-6 last_name blank returns 422:**
POST with `{"first_name": "Jane", "last_name": ""}` → HTTP 422, message
references `last_name`.

**AC-7 Timeline event is written:**
After a successful create, a `Communication` record exists in Frappe where
`reference_doctype = "Contact"` and `reference_name` equals the created
contact's `name`. The `subject` field contains the word `"Created"`.

**AC-8 Vocabulary label appears in timeline event:**
When `SM Site Registry` for the current site has `vocabulary_config`
containing `{"person": "Client"}`, the Communication `subject` is `"Client Created"`
and `response.meta.person_label` is `"Client"`.

**AC-9 Missing vocabulary config uses default:**
When `SM Site Registry` does not exist or has no `vocabulary_config`, the
request succeeds, the Contact is created, and `response.meta.person_label`
is `"Contact"`.

**AC-10 Timeline failure is non-fatal:**
If the Communication insert is forced to fail (e.g., temporarily modify
`_write_timeline_event` to raise), the Contact is still created, the API
returns HTTP 200, and `response.meta.timeline_event_written` is `false`.

**AC-11 Auth is enforced:**
A request with no Authorization header returns HTTP 401 (or the platform's
standard unauthenticated error — match what existing routes return).

**AC-12 Route appears in API docs:**
The route appears in the FastAPI OpenAPI docs at `/docs` under the `crm` tag.

---

## Test Instructions

### Test 1 — Happy path, minimal fields

```bash
curl -X POST https://poc-dev.sparkmojo.com/api/modules/crm/contact/create \
  -H "Authorization: Bearer {valid_token}" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Test", "last_name": "CRM003"}'
```

**Verify:**
- HTTP 200
- `data.name` is a non-empty string like `CONT-00001`
- `meta.timeline_event_written` is `true`
- `meta.person_label` is a non-empty string

Then open Frappe Desk → CRM → Contacts. Confirm "Test CRM003" appears.

### Test 2 — Happy path, all fields

```bash
curl -X POST https://poc-dev.sparkmojo.com/api/modules/crm/contact/create \
  -H "Authorization: Bearer {valid_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email_id": "jane.doe@test.example.com",
    "mobile_no": "555-555-5555",
    "company_name": "Test Organization"
  }'
```

**Verify:**
- HTTP 200
- `data.email_id` is `"jane.doe@test.example.com"` (or in the email_ids child table)
- In Frappe Desk → find Jane Doe → Activities tab → see `"Client Created"` or
  `"Contact Created"` event

### Test 3 — Validation: missing first_name

```bash
curl -X POST https://poc-dev.sparkmojo.com/api/modules/crm/contact/create \
  -H "Authorization: Bearer {valid_token}" \
  -H "Content-Type: application/json" \
  -d '{"last_name": "Only"}'
```

**Verify:** HTTP 422, message references `first_name`.

### Test 4 — Validation: blank last_name

```bash
curl -X POST https://poc-dev.sparkmojo.com/api/modules/crm/contact/create \
  -H "Authorization: Bearer {valid_token}" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Jane", "last_name": "   "}'
```

**Verify:** HTTP 422, message references `last_name`.

### Test 5 — Unauthenticated request

```bash
curl -X POST https://poc-dev.sparkmojo.com/api/modules/crm/contact/create \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Ghost", "last_name": "User"}'
```

**Verify:** HTTP 401 (or the platform's standard auth error).

### Test 6 — Verify Communication record in Frappe

After Test 1 or Test 2, log into Frappe Desk and run this in the console
(or check via the Communication DocType list):

```
frappe.get_list("Communication", filters={
    "reference_doctype": "Contact",
    "reference_name": "{name from test response}"
}, fields=["name", "subject", "content", "communication_type"])
```

**Verify:**
- One record exists
- `subject` contains `"Created"`
- `communication_type` is `"Other"`

---

## Out of Scope for This Story

The following are explicitly **not** part of CRM-003. Do not implement them.

- Contact list endpoint (`GET /api/modules/crm/contacts/list`)
- Contact detail endpoint (`GET /api/modules/crm/contact/{id}`)
- Contact update endpoint
- Lead CRUD endpoints
- Organization CRUD endpoints
- Global search endpoint
- Vocabulary endpoint (GET — vocabulary resolution here is internal to the create flow only)
- Custom fields on Contact (`sm_date_of_birth`, `sm_payer`, etc.) — provisioning story
- Duplicate detection on create
- React UI of any kind
- n8n workflows (ERPNext Customer creation, Medplum Patient creation)
- Role-based field permissions beyond the bearer token auth
- Any modification to Frappe core files
- Any modification to the ERPNext Contact DocType definition

---

## Notes for Implementing Agent

**1. Read an existing route before writing any code.**
Open any existing route file in `abstraction-layer/routes/` (billing, tasks, any
capability). Understand exactly how `get_current_user` and `get_frappe_client` are
imported and injected. Copy that pattern exactly. Do not invent a new pattern.

**2. `frappe.local.site` is illustrative.**
The code above uses `frappe.local.site` to get the current site name. The actual
method depends on how the Frappe client is initialized in this codebase. It might be
`frappe.get_site_name()`, a value stored on the injected client object, or something
else. Look at existing routes to find the correct method. If no existing route reads
the site name, look at the provisioning or billing route for how they read
site-specific config.

**3. Contact email and phone are child tables in Frappe.**
The `email_ids` and `phone_nos` child table approach shown is the canonical Frappe
pattern for Frappe v14+. However, if the existing codebase sets `contact.email_id =
value` directly (as seen in the Technical Research document's `convert_lead` example),
match that approach instead — the existing pattern has been validated against poc-dev.
If unsure, test both in a Frappe console on poc-dev and use whichever successfully
saves the email to the Contact record.

**4. The FrappeClient pattern (REST vs. Python API).**
If the MAL calls Frappe via the Python API directly (same bench environment), the
`frappe.new_doc()` / `contact.insert()` patterns work as shown. If the MAL calls
Frappe via HTTP (the `frappeclient` library or similar), those calls translate to
REST API calls. Look at existing routes — this determines the entire calling style.

**5. SM Site Registry may not be seeded on poc-dev yet.**
The vocabulary resolver is written to fail gracefully. If no SM Site Registry record
exists for the current site, `_resolve_person_label` returns `"Contact"`. This is
correct behavior. Do not fail the request because the registry is missing. The resolver's
`try/except` handles this.

**6. Communication DocType minimum required fields.**
If Frappe validation rejects the Communication insert because of missing required
fields not listed in this spec, add the minimum additional fields needed to pass
validation. Do not add `communication_date` or `sender` unless Frappe requires them.
Inspect the Communication DocType definition in Frappe Desk → Customize Form →
Communication if needed.

**7. `data.name` in the response is the Frappe document ID, not a human name.**
`contact.name` in Frappe is the auto-generated system identifier (e.g., `CONT-00001`).
This is a well-established Frappe convention. The response key is `name` to match
Frappe's convention. The human name fields are `first_name` and `last_name`.

**8. Do not implement retry logic for the timeline write.**
If `_write_timeline_event` returns False, log and return the response. No retries,
no re-raise, no rollback.

**9. `getattr(contact, field, None)` in the response.**
After `contact.insert()`, some top-level display fields on the Contact object (like
`email_id`, `phone`) may or may not be populated depending on how Frappe hydrates the
doc. Using `getattr(..., None)` as shown is safe. If these fields are consistently
null in practice, they can be read back with an explicit `frappe.get_doc("Contact",
contact.name)` call after insert — but try the simpler approach first.

**10. This file will grow.**
Future CRM stories add their routes to `abstraction-layer/routes/crm.py`. Leave the
section comment structure in place (`# --- CRM-003: Contact Create ---`) so future
stories can follow the same pattern.

---

*Spec authored: April 9, 2026. Story CRM-003. Implements the first CRM backend
endpoint. All downstream CRM stories (contact list, detail, update, React UI,
lead conversion) depend on this endpoint being correctly implemented and tested.*
```