model: model-theta
test: 02-spec-writing
run: C
date: 2026-04-09

```markdown
# Story Spec: NOTIF-PREF-001 — User notification preferences GET and PUT endpoints

**Story ID:** NOTIF-PREF-001  
**Title:** User notification preferences GET and PUT endpoints  
**Category:** BACKEND  
**Size:** S  
**Dependencies:** None  
**Status:** Ready for development  
**Created:** 2026-04-10  
**Last Updated:** 2026-04-10  

## Overview

Implement user notification preferences endpoints with three-tier cascade resolution (platform defaults → site overrides → user overrides). The system controls which channels are used for which events, per user.

## Mandatory Spec Gates

### Gate 1: Workflow

**What is the workflow?**

This capability is a configuration management system, not a stateful workflow. The "workflow" is the three-tier cascade resolution logic:

1. **Platform defaults** → Hardcoded Python dict in the endpoint module
2. **Site overrides** → Stored in `SM Site Registry.config_json["notification_preferences"]`
3. **User overrides** → Stored in `SM User Notification Preferences` document

When a user views or updates their preferences, the system must merge these three tiers with proper precedence (user > site > platform) and track the source of each setting for transparency.

**Why this isn't a traditional workflow:** No state transitions, no tasks generated, no human/computer actors. This is pure configuration CRUD with hierarchical resolution.

### Gate 2: CRM Timeline

**What does this capability write to the CRM timeline?**

Nothing. This capability manages user notification preferences, which are system configuration settings, not customer interactions. The CRM timeline records interactions **between the business and its customers**, while notification preferences govern **system-to-user communications**.

**Rationale for not writing to CRM:** 
- User notification preferences are internal system configuration
- They do not represent customer interactions or business events
- They are not visible to or relevant for CRM activity tracking
- The CRM mandate applies to capabilities that touch customer records, not user settings

### Gate 3: Right Level

**Is this being built at the right level of specificity?**

Yes — this is a universal capability that applies to **any business** using Spark Mojo. Every business needs to control notification channels for system events. The three-tier cascade (platform → site → user) is the correct abstraction level:

- **Universal:** Platform defaults work for any vertical
- **Configurable:** Site overrides allow per-business customization  
- **Personalizable:** User overrides allow individual preference

**Why not vertical-specific:** Notification preferences are not unique to behavioral health, dental, or any specific vertical. All businesses need task assignments, appointment reminders, claim status updates, etc.

**Why not client-specific:** Site-level overrides in `SM Site Registry` provide client-specific configuration without custom code.

## Technical Design

### Architecture Context

- **Backend:** Frappe/ERPNext with custom DocTypes prefixed "SM "
- **Abstraction Layer:** FastAPI MAL at `/api/modules/[capability]/[action]`
- **Frontend:** React JSX calling MAL endpoints only (never Frappe directly)
- **Multi-tenancy:** One Frappe site per client (database-per-tenant)
- **Site resolution:** `X-Frappe-Site-Name` header determines current site

### Data Model

#### Platform Defaults (Hardcoded)
```python
PLATFORM_DEFAULTS = {
    "task_assigned": {"email": True, "sms": False, "in_app": True},
    "task_due_soon": {"email": True, "sms": True, "in_app": True},
    "appointment_reminder": {"email": True, "sms": True, "in_app": False},
    "claim_denied": {"email": True, "sms": False, "in_app": True},
    "claim_paid": {"email": True, "sms": False, "in_app": True},
    "intake_submitted": {"email": True, "sms": False, "in_app": True}
}
```

#### Site Overrides (SM Site Registry)
- Stored in `SM Site Registry.config_json["notification_preferences"]`
- Partial overrides allowed (only specify events/channels to change)
- JSON structure matches platform defaults format

#### User Overrides (SM User Notification Preferences)
- New DocType: `SM User Notification Preferences`
- Linked to Frappe User by `user_email` field (unique)
- Partial overrides allowed
- JSON structure matches platform defaults format

### Three-Tier Cascade Logic

1. Start with **platform defaults** as base
2. Apply **site overrides** (merge recursively, site values replace platform)
3. Apply **user overrides** (merge recursively, user values replace site/platform)
4. Track source tier for each final value: `"platform"`, `"site"`, or `"user"`

### Validation Rules

- **Events:** Must be one of: `task_assigned`, `task_due_soon`, `appointment_reminder`, `claim_denied`, `claim_paid`, `intake_submitted`
- **Channels:** Must be one of: `email`, `sms`, `in_app`
- **Values:** Must be boolean (`true`/`false`)

## API Specification

### Base Path
`/api/modules/admin/notification-preferences`

### Headers
- `X-Frappe-Site-Name`: Required for site resolution
- `Content-Type: application/json` (for PUT)

### GET `/api/modules/admin/notification-preferences/{user_email}`

**Description:** Returns fully resolved preferences for a user with source tier information.

**Parameters:**
- `user_email` (path): Email address of the Frappe User

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_email": "user@example.com",
    "preferences": {
      "task_assigned": {"email": true, "sms": false, "in_app": true},
      "task_due_soon": {"email": true, "sms": true, "in_app": true},
      "appointment_reminder": {"email": true, "sms": true, "in_app": false},
      "claim_denied": {"email": true, "sms": false, "in_app": true},
      "claim_paid": {"email": true, "sms": false, "in_app": true},
      "intake_submitted": {"email": true, "sms": false, "in_app": true}
    },
    "sources": {
      "task_assigned": {"email": "platform", "sms": "platform", "in_app": "user"},
      "task_due_soon": {"email": "site", "sms": "site", "in_app": "site"},
      "appointment_reminder": {"email": "platform", "sms": "platform", "in_app": "platform"},
      "claim_denied": {"email": "user", "sms": "user", "in_app": "user"},
      "claim_paid": {"email": "platform", "sms": "platform", "in_app": "platform"},
      "intake_submitted": {"email": "platform", "sms": "platform", "in_app": "platform"}
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: User does not exist on the current site
- `400 Bad Request`: Invalid site header or missing authentication
- `500 Internal Server Error`: Database or configuration error

### PUT `/api/modules/admin/notification-preferences/{user_email}`

**Description:** Creates or updates user notification preferences. Returns updated resolved preferences.

**Parameters:**
- `user_email` (path): Email address of the Frappe User

**Request Body:**
```json
{
  "preferences": {
    "task_assigned": {"email": false, "in_app": true},
    "claim_denied": {"sms": true}
  }
}
```
Partial updates allowed. Only specified events/channels are updated.

**Response (200):**
Same as GET response, with updated preferences and sources.

**Error Responses:**
- `404 Not Found`: User does not exist on the current site
- `400 Bad Request`: Invalid event key, channel key, or boolean value
- `400 Bad Request`: Invalid site header or missing authentication
- `500 Internal Server Error`: Database or configuration error

## Implementation Details

### New DocType: SM User Notification Preferences

**Fields:**
- `name` (Data): Auto-generated
- `user_email` (Link): Link to `User` doctype (unique)
- `preferences_json` (Long Text): JSON string of user overrides
- `created` (Datetime): Auto-set
- `modified` (Datetime): Auto-updated

**Indexes:**
- Unique index on `user_email`

**Permissions:**
- System Manager: Read, Write, Create, Delete
- All other roles: None (admin API only)

### Endpoint Module Structure

```python
# File: /home/frappe/frappe-bench/apps/mojo_abstraction_layer/mojo_abstraction_layer/notifications.py

import json
from typing import Dict, Any, Optional
import frappe
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, validator

router = APIRouter(prefix="/notification-preferences", tags=["notifications"])

# Platform defaults (hardcoded)
PLATFORM_DEFAULTS = {
    # ... as defined above
}

class NotificationPreferences(BaseModel):
    email: bool
    sms: bool
    in_app: bool

class UserPreferencesRequest(BaseModel):
    preferences: Dict[str, Dict[str, bool]]
    
    @validator('preferences')
    def validate_preferences(cls, v):
        valid_events = {"task_assigned", "task_due_soon", "appointment_reminder", 
                       "claim_denied", "claim_paid", "intake_submitted"}
        valid_channels = {"email", "sms", "in_app"}
        
        for event, channels in v.items():
            if event not in valid_events:
                raise ValueError(f"Invalid event: {event}")
            for channel, value in channels.items():
                if channel not in valid_channels:
                    raise ValueError(f"Invalid channel: {channel}")
                if not isinstance(value, bool):
                    raise ValueError(f"Value for {event}.{channel} must be boolean")
        return v

def get_site_overrides(site_name: str) -> Dict[str, Any]:
    """Get site-level notification preferences from SM Site Registry."""
    # Use frappe.local.site = site_name to switch sites
    pass

def get_user_overrides(user_email: str) -> Dict[str, Any]:
    """Get user-level notification preferences from SM User Notification Preferences."""
    pass

def resolve_preferences(
    platform: Dict[str, Any],
    site: Dict[str, Any],
    user: Dict[str, Any]
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """Merge three tiers and track sources."""
    pass

@router.get("/{user_email}")
async def get_notification_preferences(
    user_email: str,
    x_frappe_site_name: Optional[str] = Header(None, alias="X-Frappe-Site-Name")
):
    """GET endpoint implementation."""
    pass

@router.put("/{user_email}")
async def put_notification_preferences(
    user_email: str,
    request: UserPreferencesRequest,
    x_frappe_site_name: Optional[str] = Header(None, alias="X-Frappe-Site-Name")
):
    """PUT endpoint implementation."""
    pass
```

### Site Resolution Logic

```python
def validate_and_set_site(site_header: str) -> None:
    """Set frappe.local.site and validate site exists."""
    if not site_header:
        raise HTTPException(status_code=400, detail="X-Frappe-Site-Name header required")
    
    # Validate site exists
    sites = frappe.get_sites()
    if site_header not in sites:
        raise HTTPException(status_code=400, detail=f"Site '{site_header}' not found")
    
    frappe.local.site = site_header
    frappe.init(site=site_header)
```

### Preference Merging Algorithm

```python
def deep_merge(base: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively merge overrides into base."""
    result = base.copy()
    for key, value in overrides.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result

def resolve_with_sources(
    platform: Dict[str, Any],
    site: Dict[str, Any],
    user: Dict[str, Any]
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """Return (merged_preferences, sources_dict)."""
    # Start with platform defaults
    merged = platform.copy()
    sources = {}
    
    # Initialize sources dict with all platform defaults
    for event in platform:
        sources[event] = {}
        for channel in platform[event]:
            sources[event][channel] = "platform"
    
    # Apply site overrides
    if site:
        for event, channels in site.items():
            if event not in merged:
                merged[event] = {}
            if event not in sources:
                sources[event] = {}
                
            for channel, value in channels.items():
                merged[event][channel] = value
                sources[event][channel] = "site"
    
    # Apply user overrides
    if user:
        for event, channels in user.items():
            if event not in merged:
                merged[event] = {}
            if event not in sources:
                sources[event] = {}
                
            for channel, value in channels.items():
                merged[event][channel] = value
                sources[event][channel] = "user"
    
    return merged, sources
```

## Testing Requirements

### Unit Tests
1. **Preference merging**: Verify three-tier cascade works correctly
2. **Source tracking**: Verify each value reports correct tier source
3. **Validation**: Reject invalid events, channels, non-boolean values
4. **Partial updates**: PUT with partial object only updates specified fields
5. **Site isolation**: Preferences from one site don't leak to another

### Integration Tests
1. **GET endpoint**: Returns 404 for non-existent user
2. **GET endpoint**: Returns resolved preferences for existing user
3. **PUT endpoint**: Creates new document for new user
4. **PUT endpoint**: Updates existing document for existing user
5. **PUT endpoint**: Validates request body
6. **Site header**: Requires X-Frappe-Site-Name header

### Test Data
```python
# Test platform defaults
PLATFORM_DEFAULTS = {
    "task_assigned": {"email": True, "sms": False, "in_app": True},
    "task_due_soon": {"email": True, "sms": True, "in_app": True}
}

# Test site overrides  
SITE_OVERRIDES = {
    "task_assigned": {"sms": True},  # Enable SMS for task_assigned
    "new_event": {"email": True}     # Should be ignored (invalid event)
}

# Test user overrides
USER_OVERRIDES = {
    "task_assigned": {"email": False},  # Disable email for task_assigned
    "task_due_soon": {"sms": False}     # Disable SMS for task_due_soon
}

# Expected result after merging:
RESOLVED = {
    "task_assigned": {"email": False, "sms": True, "in_app": True},
    "task_due_soon": {"email": True, "sms": False, "in_app": True}
}

SOURCES = {
    "task_assigned": {"email": "user", "sms": "site", "in_app": "platform"},
    "task_due_soon": {"email": "platform", "sms": "user", "in_app": "platform"}
}
```

## Deployment Checklist

- [ ] Create `SM User Notification Preferences` DocType in Frappe
- [ ] Implement endpoint module in Mojo Abstraction Layer
- [ ] Add endpoint to MAL router configuration
- [ ] Write unit tests for merging logic
- [ ] Write integration tests for endpoints
- [ ] Document API in Swagger/OpenAPI
- [ ] Add to admin UI (separate story)

## Open Questions

None. All requirements are clear from the story description.

## Related Stories

- **NOTIF-PREF-002**: Admin UI for managing notification preferences
- **NOTIF-PREF-003**: Notification delivery engine (email/SMS/in-app)
- **NOTIF-PREF-004**: Event trigger system (hooks into workflow state changes)

## References

- Platform Guardrails document (highest authority)
- Frappe DocType documentation
- FastAPI MAL pattern from billing routes example
- n8n automation patterns for notification delivery (future story)

---

*This spec is self-contained and ready for implementation. All platform rules are respected, including the React→MAL pattern, SM DocType prefix, and three-tier cascade requirement.*
```