model: model-alpha
test: 02-spec-writing
run: C
date: 2026-04-09

# Story Spec: NOTIF-PREF-001

## User Notification Preferences GET and PUT Endpoints

| Field | Value |
|-------|-------|
| **Story ID** | NOTIF-PREF-001 |
| **Title** | User notification preferences GET and PUT endpoints |
| **Category** | BACKEND |
| **Size** | S |
| **Dependencies** | None |
| **Status** | Ready for Build |

---

## 1. Overview

This story implements two MAL endpoints that allow reading and writing per-user notification preferences using a three-tier cascade resolution system. The system determines which notification channels (email, sms, in_app) are active for which events (task_assigned, task_due_soon, etc.) for any given user.

The three-tier cascade model ensures sensible defaults exist at every level while allowing granular override control:

```
Platform Defaults → Site Overrides → User Overrides → RESOLVED
     (code)            (Frappe)          (Frappe)       (output)
```

---

## 2. Acceptance Criteria

### AC-1: GET endpoint returns resolved preferences with tier provenance
**Given** a user with email `alice@example.com` exists on the current site
**When** `GET /api/modules/admin/notification-preferences/alice@example.com` is called with valid `X-Frappe-Site-Name` header
**Then** the response contains:
- A `preferences` object mapping each event to its enabled channels (fully resolved across all three tiers)
- A `sources` object mapping each event to the tier name that provided the final value (`"platform"`, `"site"`, or `"user"`)

### AC-2: GET returns 404 for non-existent user
**Given** no Frappe User with email `nobody@example.com` exists on the current site
**When** `GET /api/modules/admin/notification-preferences/nobody@example.com` is called
**Then** the response status is 404 with detail `"User not found: nobody@example.com"`

### AC-3: Three-tier cascade resolves correctly
**Given** the following configuration:
- Platform default for `task_assigned` is `{"email": true, "sms": true, "in_app": true}`
- Site override for `task_assigned` is `{"email": true, "sms": false, "in_app": true}`
- User override for `task_assigned` is `{"email": true, "sms": true}`
**When** GET is called for that user
**Then** `preferences.task_assigned` is `{"email": true, "sms": true, "in_app": true}` (user sms override wins)
**And** `sources.task_assigned` is `"user"` (because user tier provided the winning value)

### AC-4: PUT creates or updates user preferences document
**Given** no `SM User Notification Preferences` document exists for user `bob@example.com`
**When** `PUT /api/modules/admin/notification-preferences/bob@example.com` is called with body `{"task_assigned": {"email": true, "sms": false}}`
**Then** a new `SM User Notification Preferences` Frappe document is created linked to that user's email
**And** the response returns the fully resolved preferences (cascade applied)

### AC-5: PUT accepts partial updates
**Given** an existing user preference document with `task_assigned: {"email": true, "sms": true, "in_app": true}`
**When** PUT is called with body `{"task_assigned": {"sms": false}}`
**Then** only the `sms` channel for `task_assigned` is updated to `false`
**And** other channels for `task_assigned` remain `true`
**And** other events in the document remain unchanged

### AC-6: PUT rejects invalid event keys
**Given** a PUT request with body `{"invalid_event": {"email": true}}`
**When** the endpoint processes the request
**Then** the response status is 400 with detail `"Invalid event key: invalid_event"`

### AC-7: PUT rejects invalid channel keys
**Given** a PUT request with body `{"task_assigned": {"carrier_pigeon": true}}`
**When** the endpoint processes the request
**Then** the response status is 400 with detail `"Invalid channel key: carrier_pigeon"`

---

## 3. Data Model

### 3.1 SM User Notification Preferences (New DocType)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | Data (Auto-generated) | Yes | System-generated ID |
| `user_email` | Data | Yes | Email of the Frappe User this config belongs to. Must be unique. |
| `task_assigned` | JSON | No | Channel overrides for task_assigned event |
| `task_due_soon` | JSON | No | Channel overrides for task_due_soon event |
| `appointment_reminder` | JSON | No | Channel overrides for appointment_reminder event |
| `claim_denied` | JSON | No | Channel overrides for claim_denied event |
| `claim_paid` | JSON | No | Channel overrides for claim_paid event |
| `intake_submitted` | JSON | No | Channel overrides for intake_submitted event |

**DocType metadata:**
- Module: `SM Connectors` (or appropriate SM module)
- Naming Rule: Set by user (use `user_email` as name for direct lookup)
- Is Submittable: No
- Permissions: System Manager (full), Website User (none)

**JSON field format example:**
```json
{
  "email": true,
  "sms": false,
  "in_app": true
}
```

<details>
<summary>Frappe DocType JSON (for bench migration)</summary>

```json
{
  "doctype": "DocType",
  "name": "SM User Notification Preferences",
  "module": "SM Connectors",
  "custom": 1,
  "fields": [
    {
      "fieldname": "user_email",
      "fieldtype": "Data",
      "label": "User Email",
      "reqd": 1,
      "unique": 1
    },
    {
      "fieldname": "task_assigned",
      "fieldtype": "JSON",
      "label": "Task Assigned"
    },
    {
      "fieldname": "task_due_soon",
      "fieldtype": "JSON",
      "label": "Task Due Soon"
    },
    {
      "fieldname": "appointment_reminder",
      "fieldtype": "JSON",
      "label": "Appointment Reminder"
    },
    {
      "fieldname": "claim_denied",
      "fieldtype": "JSON",
      "label": "Claim Denied"
    },
    {
      "fieldname": "claim_paid",
      "fieldtype": "JSON",
      "label": "Claim Paid"
    },
    {
      "fieldname": "intake_submitted",
      "fieldtype": "JSON",
      "label": "Intake Submitted"
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
  ],
  "naming_rule": "Set by user"
}
```
</details>

### 3.2 SM Site Registry Integration

The existing `SM Site Registry` DocType must have a `config_json` field (or equivalent). This story reads from key `"notification_preferences"` within that JSON.

**Expected structure of `config_json.notification_preferences`:**
```json
{
  "task_assigned": {"email": true, "sms": false, "in_app": true},
  "appointment_reminder": {"email": true, "sms": true, "in_app": false}
}
```

If `config_json` is missing or `notification_preferences` key is absent, the site tier is treated as empty (no overrides).

---

## 4. Platform Defaults

Defined as a Python dict in the endpoint file. These are the base values that apply when neither site nor user has overridden a setting.

```python
PLATFORM_DEFAULTS = {
    "task_assigned": {"email": True, "sms": True, "in_app": True},
    "task_due_soon": {"email": True, "sms": True, "in_app": True},
    "appointment_reminder": {"email": True, "sms": True, "in_app": True},
    "claim_denied": {"email": True, "sms": False, "in_app": True},
    "claim_paid": {"email": True, "sms": False, "in_app": True},
    "intake_submitted": {"email": True, "sms": False, "in_app": True},
}
```

**Design note:** All channels default to `True` for operational events (task, appointment) and `False` for financial/administrative SMS channels (claims, intake) to reduce SMS cost exposure.

---

## 5. API Specification

### 5.1 GET /api/modules/admin/notification-preferences/{user_email}

**Purpose:** Retrieve fully resolved notification preferences for a specific user.

**Request:**

| Item | Value |
|------|-------|
| Method | `GET` |
| Path | `/api/modules/admin/notification-preferences/{user_email}` |
| Path Param | `user_email` — email address of the Frappe User |
| Header | `X-Frappe-Site-Name` — required, identifies the tenant site |

**Response (200 OK):**

```json
{
  "user_email": "alice@example.com",
  "preferences": {
    "task_assigned": {"email": true, "sms": true, "in_app": true},
    "task_due_soon": {"email": true, "sms": true, "in_app": true},
    "appointment_reminder": {"email": true, "sms": false, "in_app": true},
    "claim_denied": {"email": true, "sms": false, "in_app": true},
    "claim_paid": {"email": true, "sms": false, "in_app": true},
    "intake_submitted": {"email": true, "sms": false, "in_app": true}
  },
  "sources": {
    "task_assigned": "user",
    "task_due_soon": "platform",
    "appointment_reminder": "site",
    "claim_denied": "platform",
    "claim_paid": "platform",
    "intake_submitted": "platform"
  }
}
```

**Response (404 Not Found):**

```json
{
  "detail": "User not found: nobody@example.com"
}
```

**Response (400 Bad Request):**

```json
{
  "detail": "Missing X-Frappe-Site-Name header"
}
```

**Cascade Resolution Logic:**

```
For each event in VALID_EVENTS:
    For each channel in VALID_CHANNELS:
        resolved_value = PLATFORM_DEFAULTS[event][channel]
        source = "platform"
        
        if event in site_overrides and channel in site_overrides[event]:
            resolved_value = site_overrides[event][channel]
            source = "site"
        
        if event in user_overrides and channel in user_overrides[event]:
            resolved_value = user_overrides[event][channel]
            source = "user"
        
        preferences[event][channel] = resolved_value
        sources[event] = source  // Only if user-tier provided ANY channel override for this event
```

**Source tracking clarification:**
- `sources[event]` reflects the tier that provided the **most recent override** for that event
- If a user overrides even a single channel within an event, the source is `"user"`
- If only the site overrides exist, the source is `"site"`
- If neither site nor user overrides exist, the source is `"platform"`

---

### 5.2 PUT /api/modules/admin/notification-preferences/{user_email}

**Purpose:** Create or update user-level notification preference overrides.

**Request:**

| Item | Value |
|------|-------|
| Method | `PUT` |
| Path | `/api/modules/admin/notification-preferences/{user_email}` |
| Path Param | `user_email` — email address of the Frappe User |
| Header | `X-Frappe-Site-Name` — required |
| Header | `Content-Type` — `application/json` |

**Request Body (partial or full):**

```json
{
  "task_assigned": {"sms": false},
  "appointment_reminder": {"email": true, "sms": true, "in_app": true}
}
```

The body may contain any subset of events and any subset of channels per event. Omitted fields in the request are not modified in the existing document.

**Response (200 OK):**

Returns the same structure as GET (fully resolved preferences with sources), reflecting the updated state.

```json
{
  "user_email": "alice@example.com",
  "preferences": {
    "task_assigned": {"email": true, "sms": false, "in_app": true},
    "task_due_soon": {"email": true, "sms": true, "in_app": true},
    "appointment_reminder": {"email": true, "sms": true, "in_app": true},
    "claim_denied": {"email": true, "sms": false, "in_app": true},
    "claim_paid": {"email": true, "sms": false, "in_app": true},
    "intake_submitted": {"email": true, "sms": false, "in_app": true}
  },
  "sources": {
    "task_assigned": "user",
    "task_due_soon": "platform",
    "appointment_reminder": "user",
    "claim_denied": "platform",
    "claim_paid": "platform",
    "intake_submitted": "platform"
  }
}
```

**Response (400 Bad Request):**

```json
{
  "detail": "Invalid event key: invalid_event_name"
}
```

```json
{
  "detail": "Invalid channel key: telegram"
}
```

**Response (404 Not Found):**

```json
{
  "detail": "User not found: nobody@example.com"
}
```

**PUT Processing Logic:**

1. Validate `X-Frappe-Site-Name` header exists
2. Validate user exists on the site (return 404 if not)
3. Validate all event keys in request body are in `VALID_EVENTS`
4. Validate all channel keys in request body are in `VALID_CHANNELS`
5. Load existing `SM User Notification Preferences` document (or create new if not found)
6. Merge request body into existing document fields (partial update semantics)
7. Save updated document to Frappe
8. Return fully resolved preferences (cascade applied) with sources

---

## 6. Constants and Validation

```python
VALID_EVENTS = frozenset({
    "task_assigned",
    "task_due_soon",
    "appointment_reminder",
    "claim_denied",
    "claim_paid",
    "intake_submitted",
})

VALID_CHANNELS = frozenset({
    "email",
    "sms",
    "in_app",
})
```

**Validation is strict:**
- Any event key not in `VALID_EVENTS` results in 400
- Any channel key not in `VALID_CHANNELS` results in 400
- Channel values must be boolean (`true`/`false`)

---

## 7. Implementation Reference

<details>
<summary>Endpoint implementation skeleton</summary>

```python
"""
Admin capability routes — Notification preferences management.
Handles GET and PUT for per-user notification preference overrides.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic BaseModel

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

VALID_EVENTS = frozenset({
    "task_assigned",
    "task_due_soon",
    "appointment_reminder",
    "claim_denied",
    "claim_paid",
    "intake_submitted",
})

VALID_CHANNELS = frozenset({
    "email",
    "sms",
    "in_app",
})

PLATFORM_DEFAULTS = {
    "task_assigned": {"email": True, "sms": True, "in_app": True},
    "task_due_soon": {"email": True, "sms": True, "in_app": True},
    "appointment_reminder": {"email": True, "sms": True, "in_app": True},
    "claim_denied": {"email": True, "sms": False, "in_app": True},
    "claim_paid": {"email": True, "sms": False, "in_app": True},
    "intake_submitted": {"email": True, "sms": False, "in_app": True},
}


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


async def _verify_user_exists(user_email: str, site_name: str) -> bool:
    """Check if Frappe User exists on the given site."""
    async with httpx.AsyncClient(
        base_url=FRAPPE_URL,
        headers={**_frappe_headers(), "X-Frappe-Site-Name": site_name}
    ) as client:
        resp = await client.get(
            "/api/resource/User",
            params={
                "filters": json.dumps([["email", "=", user_email]]),
                "fields": '["name"]',
                "limit_page_length": 1,
            },
            timeout=15,
        )
        if resp.status_code != 200:
            return False
        users = resp.json().get("data", [])
        return len(users) > 0


async def _get_site_overrides(site_name: str) -> dict:
    """Read notification_preferences from SM Site Registry config_json."""
    async with httpx.AsyncClient(
        base_url=FRAPPE_URL,
        headers={**_frappe_headers(), "X-Frappe-Site-Name": site_name}
    ) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={"limit_page_length": 1, "fields": '["config_json"]'},
            timeout=15,
        )
        if resp.status_code != 200:
            return {}
        sites = resp.json().get("data", [])
        if not sites:
            return {}
        config_json_str = sites[0].get("config_json", "{}")
        try:
            config = json.loads(config_json_str)
            return config.get("notification_preferences", {})
        except (json.JSONDecodeError, TypeError):
            return {}


async def _get_user_overrides(user_email: str, site_name: str) -> dict:
    """Read user-level overrides from SM User Notification Preferences."""
    async with httpx.AsyncClient(
        base_url=FRAPPE_URL,
        headers={**_frappe_headers(), "X-Frappe-Site-Name": site_name}
    ) as client:
        resp = await client.get(
            f"/api/resource/SM User Notification Preferences/{user_email}",
            timeout=15,
        )
        if resp.status_code == 404:
            return {}
        resp.raise_for_status()
        doc = resp.json().get("data", {})
        overrides = {}
        for event in VALID_EVENTS:
            event_json = doc.get(event)
            if event_json:
                try:
                    overrides[event] = json.loads(event_json) if isinstance(event_json, str) else event_json
                except (json.JSONDecodeError, TypeError):
                    pass
        return overrides


async def _save_user_overrides(user_email: str, site_name: str, data: dict) -> dict:
    """Create or update SM User Notification Preferences document."""
    async with httpx.AsyncClient(
        base_url=FRAPPE_URL,
        headers={**_frappe_headers(), "X-Frappe-Site-Name": site_name}
    ) as client:
        # Try to read existing
        resp = await client.get(
            f"/api/resource/SM User Notification Preferences/{user_email}",
            timeout=15,
        )
        if resp.status_code == 404:
            # Create new
            create_data = {"doctype": "SM User Notification Preferences", "user_email": user_email, **data}
            resp = await client.post(
                "/api/resource/SM User Notification Preferences",
                json=create_data,
                timeout=15,
            )
        else:
            # Update existing
            resp = await client.put(
                f"/api/resource/SM User Notification Preferences/{user_email}",
                json=data,
                timeout=15,
            )
        resp.raise_for_status()
        return resp.json().get("data", {})


def _resolve_preferences(site_overrides: dict, user_overrides: dict) -> tuple[dict, dict]:
    """Apply three-tier cascade and determine source provenance."""
    preferences = {}
    sources = {}
    
    for event in VALID_EVENTS:
        preferences[event] = {}
        event_source = "platform"
        
        for channel in VALID_CHANNELS:
            # Start with platform default
            value = PLATFORM_DEFAULTS.get(event, {}).get(channel, False)
            
            # Apply site override if present
            if event in site_overrides and channel in site_overrides[event]:
                value = site_overrides[event][channel]
                event_source = "site"
            
            # Apply user override if present
            if event in user_overrides and channel in user_overrides[event]:
                value = user_overrides[event][channel]
                event_source = "user"
            
            preferences[event][channel] = value
        
        sources[event] = event_source
    
    return preferences, sources


class NotificationPreferencesPutRequest(BaseModel):
    task_assigned: Optional[dict] = None
    task_due_soon: Optional[dict] = None
    appointment_reminder: Optional[dict] = None
    claim_denied: Optional[dict] = None
    claim_paid: Optional[dict] = None
    intake_submitted: Optional[dict] = None


@router.get("/notification-preferences/{user_email}")
async def get_notification_preferences(
    user_email: str,
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name"),
):
    """Get fully resolved notification preferences for a user."""
    # Verify user exists
    if not await _verify_user_exists(user_email, x_frappe_site_name):
        raise HTTPException(status_code=404, detail=f"User not found: {user_email}")
    
    site_overrides = await _get_site_overrides(x_frappe_site_name)
    user_overrides = await _get_user_overrides(user_email, x_frappe_site_name)
    
    preferences, sources = _resolve_preferences(site_overrides, user_overrides)
    
    return {
        "user_email": user_email,
        "preferences": preferences,
        "sources": sources,
    }


@router.put("/notification-preferences/{user_email}")
async def put_notification_preferences(
    user_email: str,
    body: NotificationPreferencesPutRequest,
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name"),
):
    """Create or update user notification preference overrides."""
    # Verify user exists
    if not await _verify_user_exists(user_email, x_frappe_site_name):
        raise HTTPException(status_code=404, detail=f"User not found: {user_email}")
    
    # Validate request body
    update_data = {}
    for event, channels in body.dict(exclude_none=True).items():
        if event not in VALID_EVENTS:
            raise HTTPException(status_code=400, detail=f"Invalid event key: {event}")
        if not isinstance(channels, dict):
            raise HTTPException(status_code=400, detail=f"Value for {event} must be a dict")
        for channel, value in channels.items():
            if channel not in VALID_CHANNELS:
                raise HTTPException(status_code=400, detail=f"Invalid channel key: {channel}")
            if not isinstance(value, bool):
                raise HTTPException(status_code=400, detail=f"Channel value must be boolean: {channel}")
        update_data[event] = json.dumps(channels)
    
    # Save to Frappe
    await _save_user_overrides(user_email, x_frappe_site_name, update_data)
    
    # Return resolved preferences
    site_overrides = await _get_site_overrides(x_frappe_site_name)
    user_overrides = await _get_user_overrides(user_email, x_frappe_site_name)
    
    preferences, sources = _resolve_preferences(site_overrides, user_overrides)
    
    return {
        "user_email": user_email,
        "preferences": preferences,
        "sources": sources,
    }
```
</details>

---

## 8. Error Handling Summary

| Scenario | HTTP Status | Detail Message |
|----------|-------------|----------------|
| Missing `X-Frappe-Site-Name` header | 400 | `"Missing X-Frappe-Site-Name header"` |
| User not found on site | 404 | `"User not found: {user_email}"` |
| Invalid event key in request body | 400 | `"Invalid event key: {key}"` |
| Invalid channel key in request body | 400 | `"Invalid channel key: {key}"` |
| Channel value not boolean | 400 | `"Channel value must be boolean: {key}"` |
| Frappe API error | 502 | Propagated from Frappe response |

---

## 9. Testing Notes

<details>
<summary>Test scenarios</summary>

### GET Endpoint Tests

1. **Full cascade with all three tiers:** Create platform default, site override, user override. Verify user wins.
2. **Site-only override:** No user doc exists. Verify site overrides platform for specified events.
3. **No overrides:** Neither site nor user doc. Verify platform defaults returned.
4. **404 for invalid user:** Request non-existent user. Verify 404.
5. **Missing header:** Omit X-Frappe-Site-Name. Verify 400.

### PUT Endpoint Tests

1. **Create new user preferences:** PUT for user with no existing doc. Verify document created.
2. **Partial update:** PUT with one event's channel. Verify other events/channels unchanged.
3. **Full update:** PUT with all events. Verify all fields updated.
4. **Invalid event key:** PUT with `"fake_event": {...}`. Verify 400.
5. **Invalid channel key:** PUT with `"task_assigned": {"fax": true}`. Verify 400.
6. **Boolean validation:** PUT with `"task_assigned": {"sms": "yes"}`. Verify 400.
7. **404 for invalid user:** PUT for non-existent user. Verify 404.

### Integration Tests

1. **PUT then GET:** Update preferences, then GET and verify consistency.
2. **Site config change:** Update site config, GET for user without user override, verify site tier active.
3. **Multiple users isolation:** PUT for user A, GET for user B. Verify no cross-contamination.
</details>

---

## 10. Out of Scope

- **Bulk operations:** No batch GET/PUT for multiple users
- **Channel delivery configuration:** This story only controls which channels are *enabled* per event, not the delivery configuration (email templates, SMS provider settings, etc.)
- **Site-level PUT:** Site overrides are managed directly in SM Site Registry, not through this endpoint
- **Platform default modification:** Platform defaults require code deployment, not API mutation
- **Notification dispatching:** This story does not send notifications; it only manages preference storage
- **Frontend UI:** No React component in this story; that is NOTIF-PREF-002

---

## 11. Open Questions

None. This story is fully specified.

---

## 12. Platform Guardrails Checklist

| Guardrail | Status | Notes |
|-----------|--------|-------|
| React never calls Frappe directly | ✅ | Endpoints are on MAL (`/api/modules/admin/...`) |
| SM DocType prefix | ✅ | New DocType: `SM User Notification Preferences` |
| No TypeScript | ✅ | Backend story only; no frontend files |
| No hardcoded hex colors | ✅ | N/A for backend |
| n8n not in hot path | ✅ | Direct Frappe API calls only |
| Frappe manages internal state | ✅ | MAL reads/writes Frappe documents |
| Evaluation order considered | ✅ | No existing Frappe feature provides this; custom build is appropriate |

---

*Story spec authored for Spark Mojo build factory. Self-contained. No external dependencies beyond platform stack.*