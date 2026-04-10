model: model-zeta
test: 02-spec-writing
run: C
date: 2026-04-09
 ```markdown
# Story Spec: NOTIF-PREF-001 — User Notification Preferences Endpoints

**Story ID:** NOTIF-PREF-001  
**Title:** User notification preferences GET and PUT endpoints  
**Category:** BACKEND  
**Size:** S  
**Dependencies:** None  
**Capability:** Admin  
**Point of Contact:** Platform Team

---

## 1. Overview

Implement a three-tier configuration cascade for per-user notification preferences. The system supports six business events and three delivery channels. Tier precedence is: **User > Site > Platform**.

Endpoints expose fully-resolved preferences with provenance metadata indicating which tier supplied each value.

---

## 2. Acceptance Criteria

### 2.1 GET Endpoint
- **Given** a valid `user_email` that exists in the Frappe User table  
- **When** `GET /api/modules/admin/notification-preferences/{user_email}` is called with `X-Frappe-Site-Name` header  
- **Then** return HTTP 200 with fully merged preferences and per-channel tier sources  

- **Given** a `user_email` that does not exist in the site's User table  
- **When** the GET is invoked  
- **Then** return HTTP 404 with detail `"User {email} not found on this site"`

### 2.2 PUT Endpoint
- **Given** a valid request body containing partial or full preferences  
- **When** `PUT /api/modules/admin/notification-preferences/{user_email}` is called  
- **Then** create or update `SM User Notification Preferences` document, merge values into existing user config, and return HTTP 200 with resolved preferences (same schema as GET)

- **Given** a request body containing an invalid event key (e.g., `"task_deleted"`) or invalid channel key (e.g., `"push"`)  
- **When** the PUT is invoked  
- **Then** return HTTP 400 with detail `"Invalid event key: {key}"` or `"Invalid channel key: {key}"`

### 2.3 Resolution Logic
- Missing events/channels in site or user tiers fall back to the next tier down (site → platform, user → site → platform).
- Explicit `false` values in user tier override `true` values from site/platform tiers.
- Source tracking indicates `"platform"`, `"site"`, or `"user"` for each event-channel pair.

---

## 3. Data Model

### 3.1 New DocType: `SM User Notification Preferences`

**Module:** SM Admin  
**Naming:** Auto-increment (SM-UNP-#####)  
**Custom:** Yes  
**Fields:**

| Fieldname | Type | Options | Required | Default | Description |
|-----------|------|---------|----------|---------|-------------|
| user | Link | User | Yes | — | Link to Frappe User (email as name) |
| preferences | JSON | — | Yes | `{}` | User-specific overrides only |

**Indexes:** Index on `user` field.

**Permissions:** System Manager (read/write), User (read own only — future). For this story, endpoints run as admin context.

### 3.2 Site Registry Storage
Site-wide defaults are stored in existing `SM Site Registry` doctype under `config_json`:

```json
{
  "notification_preferences": {
    "task_assigned": {"email": true, "sms": false},
    "...": {}
  }
}
```

If the Site Registry doc or key is missing, treat site tier as empty.

### 3.3 Platform Defaults (Code Constants)
Stored as Python constants in the route file:

```python
VALID_EVENTS = {
    "task_assigned", "task_due_soon", "appointment_reminder", 
    "claim_denied", "claim_paid", "intake_submitted"
}

VALID_CHANNELS = {"email", "sms", "in_app"}

PLATFORM_DEFAULTS = {
    "task_assigned": {"email": True, "sms": False, "in_app": True},
    "task_due_soon": {"email": True, "sms": True, "in_app": True},
    "appointment_reminder": {"email": True, "sms": True, "in_app": False},
    "claim_denied": {"email": True, "sms": False, "in_app": True},
    "claim_paid": {"email": True, "sms": False, "in_app": True},
    "intake_submitted": {"email": True, "sms": False, "in_app": True},
}
```

---

## 4. API Specification

Base Path: `/api/modules/admin`  
Header Required: `X-Frappe-Site-Name: {site_name}`

### 4.1 GET /notification-preferences/{user_email}

**Response Model:** `NotificationPreferencesResponse`

```json
{
  "user_email": "jane@example.com",
  "preferences": {
    "task_assigned": {
      "email": {"value": true, "source": "user"},
      "sms": {"value": false, "source": "platform"},
      "in_app": {"value": true, "source": "site"}
    },
    "task_due_soon": {
      "email": {"value": true, "source": "platform"},
      "sms": {"value": true, "source": "platform"},
      "in_app": {"value": true, "source": "platform"}
    }
    "...": {}
  },
  "resolved_at": "2026-04-08T14:30:00Z"
}
```

**Error Responses:**
- `404 Not Found`: User does not exist on site
- `400 Bad Request`: Malformed email or missing site header (handled by framework)

### 4.2 PUT /notification-preferences/{user_email}

**Request Model:** `NotificationPreferencesUpdate` (partial allowed)

```json
{
  "task_assigned": {"email": false},
  "appointment_reminder": {"sms": true, "in_app": true}
}
```

**Behavior:**
1. Validate all keys in payload against `VALID_EVENTS` and `VALID_CHANNELS`
2. Retrieve or create `SM User Notification Preferences` doc where `user = user_email`
3. Deep-merge payload into existing `preferences` JSON (add/update keys, preserve others)
4. Save document
5. Re-run resolution cascade against current site config
6. Return same payload as GET (200 OK)

**Error Responses:**
- `400 Bad Request`: Invalid event or channel key supplied
- `404 Not Found`: User does not exist on site
- `500 Internal Server Error`: Frappe write failure

---

## 5. Implementation Guide

Create file: `backend/routes/admin/notification_preferences.py`

### 5.1 Imports & Constants
```python
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

# Configuration constants
VALID_EVENTS = {
    "task_assigned", "task_due_soon", "appointment_reminder",
    "claim_denied", "claim_paid", "intake_submitted"
}
VALID_CHANNELS = {"email", "sms", "in_app"}

PLATFORM_DEFAULTS = {
    "task_assigned": {"email": True, "sms": False, "in_app": True},
    "task_due_soon": {"email": True, "sms": True, "in_app": True},
    "appointment_reminder": {"email": True, "sms": True, "in_app": False},
    "claim_denied": {"email": True, "sms": False, "in_app": True},
    "claim_paid": {"email": True, "sms": False, "in_app": True},
    "intake_submitted": {"email": True, "sms": False, "in_app": True},
}
```

### 5.2 Pydantic Models
```python
class ChannelConfig(BaseModel):
    value: bool
    source: str  # "platform", "site", "user"

class EventConfig(BaseModel):
    email: ChannelConfig
    sms: ChannelConfig
    in_app: ChannelConfig

class NotificationPreferencesResponse(BaseModel):
    user_email: str
    preferences: dict[str, EventConfig]  # keyed by event name
    resolved_at: str

class ChannelUpdate(BaseModel):
    email: Optional[bool] = None
    sms: Optional[bool] = None
    in_app: Optional[bool] = None

class NotificationPreferencesUpdate(BaseModel):
    task_assigned: Optional[ChannelUpdate] = None
    task_due_soon: Optional[ChannelUpdate] = None
    appointment_reminder: Optional[ChannelUpdate] = None
    claim_denied: Optional[ChannelUpdate] = None
    claim_paid: Optional[ChannelUpdate] = None
    intake_submitted: Optional[ChannelUpdate] = None
```

### 5.3 Helper Functions
```python
async def _user_exists(user_email: str, site_name: str) -> bool:
    """Check if user exists on the specified site."""
    from connectors.frappe_client import list_docs  # Reuse existing connector pattern
    users = await list_docs(
        site=site_name,
        doctype="User",
        filters=[["email", "=", user_email]],
        fields=["name"],
        limit=1
    )
    return len(users) > 0

async def _get_site_notification_config(site_name: str) -> dict:
    """Fetch site overrides from SM Site Registry."""
    from connectors.frappe_client import list_docs
    registries = await list_docs(
        site=site_name,
        doctype="SM Site Registry",
        filters=[["site_name", "=", site_name]],
        fields=["config_json"],
        limit=1
    )
    if not registries:
        return {}
    try:
        config = json.loads(registries[0].get("config_json", "{}"))
        return config.get("notification_preferences", {})
    except json.JSONDecodeError:
        logger.error("Invalid JSON in SM Site Registry for site %s", site_name)
        return {}

async def _get_user_prefs(site_name: str, user_email: str) -> dict:
    """Fetch user overrides from SM User Notification Preferences."""
    from connectors.frappe_client import list_docs
    prefs = await list_docs(
        site=site_name,
        doctype="SM User Notification Preferences",
        filters=[["user", "=", user_email]],
        fields=["preferences"],
        limit=1
    )
    if not prefs:
        return {}
    try:
        return json.loads(prefs[0].get("preferences", "{}"))
    except json.JSONDecodeError:
        return {}

async def _save_user_prefs(site_name: str, user_email: str, prefs: dict):
    """Create or update user preferences document."""
    from connectors.frappe_client import list_docs, create_doc, update_doc
    existing = await list_docs(
        site=site_name,
        doctype="SM User Notification Preferences",
        filters=[["user", "=", user_email]],
        fields=["name"],
        limit=1
    )
    payload = {"preferences": json.dumps(prefs)}
    if existing:
        await update_doc(
            site=site_name,
            doctype="SM User Notification Preferences",
            name=existing[0]["name"],
            data=payload
        )
    else:
        payload["user"] = user_email
        await create_doc(
            site=site_name,
            doctype="SM User Notification Preferences",
            data=payload
        )

def _resolve_preferences(site_config: dict, user_config: dict) -> dict:
    """
    Merge platform → site → user.
    Returns dict of event -> {channel -> {value, source}}
    """
    result = {}
    for event in VALID_EVENTS:
        event_result = {}
        for channel in VALID_CHANNELS:
            # Start with platform
            value = PLATFORM_DEFAULTS.get(event, {}).get(channel, False)
            source = "platform"
            
            # Site override
            if event in site_config and channel in site_config[event]:
                value = site_config[event][channel]
                source = "site"
            
            # User override
            if event in user_config and channel in user_config[event]:
                value = user_config[event][channel]
                source = "user"
            
            event_result[channel] = {"value": value, "source": source}
        result[event] = event_result
    return result

def _validate_update_payload(payload: NotificationPreferencesUpdate):
    """Validate that all keys in payload are valid events and channels."""
    payload_dict = payload.model_dump(exclude_unset=True)
    for event, channels in payload_dict.items():
        if event not in VALID_EVENTS:
            raise HTTPException(status_code=400, detail=f"Invalid event key: {event}")
        if channels:  # channels is a dict like {"email": false}
            for channel in channels.keys():
                if channel not in VALID_CHANNELS:
                    raise HTTPException(status_code=400, detail=f"Invalid channel key: {channel}")
```

### 5.4 Endpoints
```python
@router.get("/notification-preferences/{user_email}", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    user_email: str,
    x_frappe_site_name: Optional[str] = Header(None)
):
    """Get resolved notification preferences for a user."""
    if not x_frappe_site_name:
        raise HTTPException(status_code=400, detail="X-Frappe-Site-Name header required")
    
    if not await _user_exists(user_email, x_frappe_site_name):
        raise HTTPException(status_code=404, detail=f"User {user_email} not found on this site")
    
    site_config = await _get_site_notification_config(x_frappe_site_name)
    user_config = await _get_user_prefs(x_frappe_site_name, user_email)
    resolved = _resolve_preferences(site_config, user_config)
    
    return NotificationPreferencesResponse(
        user_email=user_email,
        preferences=resolved,
        resolved_at=datetime.now(timezone.utc).isoformat()
    )

@router.put("/notification-preferences/{user_email}", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    user_email: str,
    update: NotificationPreferencesUpdate,
    x_frappe_site_name: Optional[str] = Header(None)
):
    """Update user notification preferences."""
    if not x_frappe_site_name:
        raise HTTPException(status_code=400, detail="X-Frappe-Site-Name header required")
    
    if not await _user_exists(user_email, x_frappe_site_name):
        raise HTTPException(status_code=404, detail=f"User {user_email} not found on this site")
    
    _validate_update_payload(update)
    
    # Merge into existing user prefs
    current_prefs = await _get_user_prefs(x_frappe_site_name, user_email)
    update_dict = update.model_dump(exclude_unset=True)
    
    for event, channels in update_dict.items():
        if channels:
            if event not in current_prefs:
                current_prefs[event] = {}
            for ch, val in channels.items():
                if val is not None:
                    current_prefs[event][ch] = val
    
    await _save_user_prefs(x_frappe_site_name, user_email, current_prefs)
    
    # Return resolved view
    site_config = await _get_site_notification_config(x_frappe_site_name)
    resolved = _resolve_preferences(site_config, current_prefs)
    
    return NotificationPreferencesResponse(
        user_email=user_email,
        preferences=resolved,
        resolved_at=datetime.now(timezone.utc).isoformat()
    )
```

---

## 6. Fixtures & Migration

### 6.1 DocType Export
Export `SM User Notification Preferences` as fixture in `sm_admin` app:

**File:** `sm_admin/fixtures/custom_doctype.json` (append)
```json
{
  "doctype": "DocType",
  "name": "SM User Notification Preferences",
  "module": "SM Admin",
  "custom": 1,
  "autoname": "SM-UNP-.#####",
  "naming_rule": "Autoincrement",
  "fields": [
    {
      "fieldname": "user",
      "fieldtype": "Link",
      "options": "User",
      "label": "User",
      "reqd": 1,
      "unique": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "preferences",
      "fieldtype": "JSON",
      "label": "Preferences JSON",
      "reqd": 1,
      "default": "{}"
    }
  ],
  "permissions": [
    {
      "role": "System Manager",
      "read": 1,
      "write": 1,
      "create": 1,
      "delete": 1
    }
  ]
}
```

### 6.2 Post-Migration
Run `bench migrate` to create table.

---

## 7. Testing Instructions

### 7.1 Unit Tests (backend)
Test file: `backend/tests/test_notification_preferences.py`

**Test Cases:**
1. **Resolution Cascade**: Verify that user `false` overrides site `true`, site `true` overrides platform `false`
2. **Source Tracking**: Assert response metadata accurately reports `"platform"`, `"site"`, or `"user"`
3. **Partial PUT**: Send only `{"task_assigned": {"email": false}}` and verify other events unchanged
4. **Invalid Keys**: Assert 400 for unknown event `"claim_rejected"` and unknown channel `"push"`
5. **User Not Found**: Assert 404 for non-existent user email
6. **Missing Site Header**: Assert 400 when `X-Frappe-Site-Name` absent

### 7.2 Integration Tests
1. Create user in Frappe, set site config via SM Site Registry, verify GET returns merged values
2. Update user prefs via PUT, verify database persistence in `SM User Notification Preferences`
3. Delete user prefs document, verify GET returns platform defaults only

---

## 8. Security & Compliance

- **Data Isolation**: Documents are created per-site (Frappe multi-site isolation). The `X-Frappe-Site-Name` header determines the site context for all Frappe reads/writes.
- **PII**: Stores only email (Link to User) and boolean preferences. No PHI.
- **Admin Scope**: Endpoints currently assume admin caller (consistent with `/api/modules/admin/` path). Future stories will implement user-scoped endpoints at `/api/modules/me/notification-preferences`.

---

## 9. Open Questions / Notes

- **Caching**: Site config is fetched on every request. If Site Registry grows large, consider caching site notification config in Redis with 5-min TTL (future optimization).
- **Frontend Contract**: React components should treat the `value` field as the single source of truth for UI toggles, and use `source` for informational "inherited from X" labels.
- **Event Expansion**: When adding new events, update `VALID_EVENTS` constant and `PLATFORM_DEFAULTS`. Existing user docs will gracefully handle missing keys via fallback logic.

---

**End of Spec**
```