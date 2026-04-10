model: model-theta
test: 02-spec-writing
run: A
date: 2026-04-09

```markdown
# Story Spec: CRM-003 - Contact Create Endpoint - Abstraction Layer

**Story ID:** CRM-003  
**Title:** Contact create endpoint - abstraction layer  
**Category:** BACKEND  
**Size:** S  
**Dependencies:** None (first backend story)  
**Author:** Spec Writer  
**Date:** April 10, 2026  
**Status:** READY FOR IMPLEMENTATION

---

## 1. Context

CRM / Client Identity is a new capability being built on the Spark Mojo platform. The platform stack is:
- **Frappe/ERPNext backend** - Data persistence and native CRM functionality
- **FastAPI abstraction layer (MAL)** at `/api/modules/[capability]/[action]` - Business logic and API orchestration
- **React JSX frontend** - User interface

**Key Architectural Decisions:**
- The abstraction layer is the **ONLY** surface React calls. React never calls Frappe directly.
- All custom DocTypes are prefixed "SM " (e.g., `SM Site Registry`).
- No TypeScript in this implementation (Python + JSX only).
- No hardcoded hex colors in CSS (use `var(--sm-*)` CSS variables).

**Technical Research Reference:** This story is based on the CRM / Client Identity technical research (April 6, 2026) which recommends **Option A: Frappe CRM Native + Custom Fields + Abstraction Layer**. The research establishes:
- Frappe Contact DocType is the canonical person record (per DECISION-013)
- Custom fields are added at provisioning time per vertical template
- Vocabulary mapping allows "person" to resolve to site-specific labels (e.g., "Client" for behavioral health)
- Activity timeline uses Frappe's Communication DocType with `communication_type = "Other"`

**This Story:** Implements the foundational contact creation endpoint that will be called by the React CRM Mojo when creating new person records.

---

## 2. Acceptance Criteria

### 2.1 Functional Requirements

**AC-1: Endpoint Existence**  
A POST endpoint must exist at `/api/modules/crm/contact/create` that accepts JSON payloads and returns JSON responses.

**AC-2: Authentication**  
The endpoint must require Bearer token authentication via the existing abstraction layer auth system (`auth.py`).

**AC-3: Request Validation**  
The endpoint must validate the incoming request body against the Frappe Contact DocType's required fields:
- `first_name` (string, required)
- `last_name` (string, optional)
- `email_id` (string, optional, email format validation)
- `phone` (string, optional)
- `mobile_no` (string, optional)

Additional custom fields (prefixed `sm_*`) should be accepted but not required.

**AC-4: Vocabulary Resolution**  
Before creating the Contact, the endpoint must resolve the "person" concept to the site's configured label by:
1. Fetching vocabulary configuration from the SM Site Registry for the current tenant
2. Using the resolved label (e.g., "Client", "Patient", "Student") in the activity timeline message
3. If no vocabulary configuration exists, default to "Contact"

**AC-5: Contact Creation**  
The endpoint must create a Frappe Contact document using the validated data via the Frappe REST API client.

**AC-6: Activity Timeline Event**  
On successful Contact creation, the endpoint must write a CRM timeline event as a Frappe Communication record with:
- `reference_doctype`: "Contact"
- `reference_name`: The newly created Contact's `name` (Frappe document ID)
- `communication_type`: "Other"
- `communication_medium`: "System"
- `subject`: "[Vocabulary-Resolved Person Label] Created"
- `content`: "New [vocabulary-resolved label] record created via CRM Mojo"
- `sender`: The authenticated user's email/name
- `creation`: Current timestamp

**AC-7: Response Format**  
The endpoint must return a JSON response with:
- HTTP 201 status code on success
- `data` object containing the created Contact with all fields (including `name` - the Frappe document ID)
- `message`: "Contact created successfully"
- `activity_id`: The created Communication record's `name` (document ID)

**AC-8: Error Handling**  
The endpoint must handle and return appropriate error responses:
- HTTP 400 for validation errors with error details
- HTTP 401 for authentication failures
- HTTP 500 for server errors with a generic message (details logged server-side)

### 2.2 Non-Functional Requirements

**NF-1: Performance**  
The endpoint should respond within 500ms under normal load.

**NF-2: Security**  
- No SQL injection vulnerabilities (use Frappe's parameterized queries)
- Input sanitization for special characters in string fields
- No exposure of internal error details to clients

**NF-3: Logging**  
- Log successful contact creations with user ID and contact ID
- Log failed attempts with reason
- Use the existing abstraction layer logging system

---

## 3. Implementation Details

### 3.1 File Structure

```
abstraction-layer/
├── routes/
│   ├── __init__.py
│   ├── crm.py              # NEW: Create this file with the contact create endpoint
│   └── auth.py             # EXISTS: Authentication utilities
├── main.py                 # EXISTS: FastAPI app
├── requirements.txt        # EXISTS: Python dependencies
└── .env.example            # EXISTS: Environment variables
```

### 3.2 Code Implementation

**File: `abstraction-layer/routes/crm.py`**  
Create this new file with the following implementation:

```python
"""
CRM Abstraction Layer Routes
Provides CRM / Client Identity endpoints that wrap Frappe CRM functionality.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from auth import get_current_user, get_frappe_client

# Initialize router
router = APIRouter(prefix="/api/modules/crm", tags=["crm"])
logger = logging.getLogger(__name__)


# Pydantic models for request validation
class ContactCreateRequest(BaseModel):
    """Request model for contact creation."""
    first_name: str = Field(..., min_length=1, max_length=100, description="First name of the contact")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name of the contact")
    email_id: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    mobile_no: Optional[str] = Field(None, max_length=20, description="Mobile number")
    company_name: Optional[str] = Field(None, max_length=100, description="Company/organization name")
    status: Optional[str] = Field("Open", description="Contact status")
    
    # Allow any sm_* custom fields that might be passed
    class Config:
        extra = "allow"


class ContactCreateResponse(BaseModel):
    """Response model for contact creation."""
    data: Dict[str, Any]
    message: str
    activity_id: Optional[str] = None


@router.post("/contact/create", response_model=ContactCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_data: ContactCreateRequest,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """
    Create a new Contact record in Frappe CRM.
    
    This endpoint:
    1. Validates the request data
    2. Resolves vocabulary for "person" concept from site configuration
    3. Creates a Frappe Contact document
    4. Writes a CRM timeline event (Communication record)
    5. Returns the created contact with its Frappe document ID
    
    Args:
        contact_data: Contact creation data
        user: Authenticated user from token
        frappe: Frappe REST API client
        
    Returns:
        ContactCreateResponse with created contact data and activity ID
    """
    try:
        logger.info(f"Contact creation requested by user {user['email']}")
        
        # 1. Resolve vocabulary for "person" concept
        vocabulary = await _get_vocabulary(frappe)
        person_label = vocabulary.get("person", "Contact")
        
        # 2. Prepare contact data for Frappe
        # Extract known fields and preserve any sm_* custom fields
        contact_dict = contact_data.dict(exclude_unset=True)
        
        # 3. Create Contact in Frappe
        logger.debug(f"Creating contact with data: {contact_dict}")
        contact = frappe.new_doc("Contact")
        contact.update(contact_dict)
        contact.insert()
        
        # 4. Create CRM timeline event
        activity_id = await _create_contact_activity(
            frappe=frappe,
            contact_id=contact.name,
            person_label=person_label,
            user_email=user["email"],
            user_name=user.get("name", user["email"])
        )
        
        # 5. Log success and return response
        logger.info(f"Contact created successfully: {contact.name} by {user['email']}")
        
        return ContactCreateResponse(
            data=contact.__dict__,
            message=f"{person_label} created successfully",
            activity_id=activity_id
        )
