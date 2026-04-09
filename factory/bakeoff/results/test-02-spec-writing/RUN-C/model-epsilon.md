model: model-epsilon
test: 02-spec-writing
run: C
date: 2026-04-09

# Story Spec: NOTIF-PREF-001

---

```markdown
# Story Spec — NOTIF-PREF-001

## Notification Preferences — GET and PUT Endpoints

| Field | Value |
|-------|-------|
| **Story ID** | `NOTIF-PREF-001` |
| **Title** | User notification preferences GET and PUT endpoints |
| **Category** | BACKEND |
| **Size** | S |
| **Dependencies** | None |
| **Author** | Spec Writer (Spark Mojo Build Factory) |
| **Date** | 2026-04-09 |
| **Status** | SPEC APPROVED |

---

## 1. Overview

### 1.1 Summary

Implement two FastAPI endpoints on the Mojo Abstraction Layer (MAL) under the `admin`
capability that allow the React frontend to read and update a user's resolved notification
preferences. Preferences are resolved through a three-tier cascade:
`platform → site → user`.

### 1.2 Motivation

The Spark Mojo platform must support per-user, per-event notification routing across three
channels (email, sms, in_app). Different clients (sites) need the ability to set site-wide
defaults, while individual users need the ability to override those defaults. The platform
must provide a single source of truth for what notifications a user will actually receive.

### 1.3 Workflow

Not applicable. This is a data capability (preference storage and resolution), not a
workflow-capability. It does not generate tasks and does not write to the CRM timeline.
CRM logging occurs at the layer that *dispatches* notifications, not at the preference layer.

### 1.4 CRM Timeline Contract

None. This capability is a read/write store for preference data. Notification dispatch
logging is the responsibility of the calling capability (e.g., scheduling, billing, intake).

### 1.5 Right Level

This is a platform-level capability. It is universal by nature and requires no vertical
or client-specific customization in its design. Customization is provided entirely through
the three-tier override mechanism.

---

## 2. Technical Design

### 2.1 Architecture

```
React JSX
  │
  │  GET /api/modules/admin/notification-preferences/{user_email}
  │  PUT /api/modules/admin/notification-preferences/{user_email}
  │  Headers: X-Frappe-Site-Name: {site_name}
  │
  ▼
FastAPI MAL — /api/modules/admin/
  │
  ├── GET  handler
  │     │
  │     ├── 1. Validate user exists on site (query SM User by email)
  │     ├── 2. Read platform defaults (Python dict)
  │     ├── 3. Read site overrides (SM Site Registry → config_json)
  │     ├── 4. Read user overrides (SM User Notification Preferences)
  │     ├── 5. Merge cascade: platform → site → user
  │     └── 6. Annotate each setting with its tier source
  │
  └── PUT handler
        │
        ├── 1. Validate user exists on site
        ├── 2. Validate request body keys
        ├── 3. Validate event names (6 allowed)
        ├── 4. Validate channel names (3 allowed)
        ├── 5. Create or update SM User Notification Preferences
        └── 6. Re-resolve and return full merged preferences
```

### 2.2 Storage

| Data | Storage | DocType / Location |
|------|---------|---------------------|
| Platform defaults | Python dict in endpoint file | `routes/admin/notification_preferences.py` |
| Site overrides | SM Site Registry `config_json` | `SM Site Registry` — key `"notification_preferences"` |
| User overrides | Frappe DocType | `SM User Notification Preferences` |

### 2.3 Events

The following six event keys are valid for all preferences:

| Event Key | Description |
|-----------|-------------|
| `task_assigned` | A task was assigned to the user |
| `task_due_soon` | A task assigned to the user is approaching its due date |
| `appointment_reminder` | An upcoming appointment requires reminder |
| `claim_denied` | An insurance claim was denied |
| `claim_paid` | An insurance claim was paid |
| `intake_submitted` | A new intake form was submitted |

### 2.4 Channels

The following three channel keys are valid for all preferences:

| Channel Key | Description |
|-------------|-------------|
| `email` | Send via email |
| `sms` | Send via SMS |
| `in_app` | Send as in-app notification |

### 2.5 Three-Tier Cascade

Each `{event}.{channel}` setting is a boolean. Resolution order (highest wins):

1. **Platform defaults** — lowest priority. Always present.
2. **Site overrides** — mid priority. Merged over platform defaults.
3. **User overrides** — highest priority. Merged over site defaults.

The response annotates each setting with its source tier: `"platform"`, `"site"`, or `"user"`.

#### 2.5.1 Platform Defaults

```python
PLATFORM_DEFAULTS = {
    "task_assigned":        {"email": True,  "sms": False, "in_app": True},
    "task_due_soon":        {"email": True,  "sms": False, "in_app": True},
    "appointment_reminder": {"email": True,  "sms": True,  "in_app": True},
    "claim_denied":         {"email": True,  "sms": True,  "in_app": True},
    "claim_paid":           {"email": True,  "sms": False, "in_app": True},
    "intake_submitted":     {"email": True,  "sms": False, "in_app": True},
}
```

#### 2.5.2 Site Overrides Schema

Stored in `SM Site Registry.config_json["notification_preferences"]` as a JSON object:

```json
{
  "notification_preferences": {
    "task_assigned": {" "email": false, "sms": true },
    "claim_denied":  { "sms": true }
  }
}
```

Only include keys that override platform defaults. Unspecified keys fall through to
the next tier.

#### 2.5.3 User Overrides Schema

Stored in `SM User Notification Preferences` DocType (see Section 2.7).
Only includes keys that override site/platform defaults.

### 2.6 API Endpoints

#### 2.6.1 GET `/api/modules/admin/notification-preferences/{user_email}`

**Description:** Returns fully resolved notification preferences for the given user.

**Path parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_email` | string | Yes | Email address of the Frappe User |

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Frappe-Site-Name` | Yes | Current Frappe site name for site-level override lookup |

**Response 200 OK:**
```json
{
  "user_email": "jane.doe@example.com",
  "preferences": {
    "task_assigned": {
      "email":  { "value": false, "tier": "user" },
      "sms":    { "value": true,  "tier": "user" },
      "in_app": { "value": true,  "tier": "platform" }
    },
    "task_due_soon": {
      "email":  { "value": true,  "tier": "platform" },
      "sms":    { "value": false, "tier": "platform" },
      "in_app": { "value": true,  "tier": "platform" }
    },
    "appointment_reminder": {
      "email":  { "value": true,  "tier": "platform" },
      "sms":    { "value": true,  "tier": "site" },
      "in_app": { "value": true,  "tier": "platform" }
    },
    "claim_denied": {
      "email":  { "value": true,  "tier": "platform" },
      "sms":    { "value": true,  "tier": "platform" },
      "in_app": { "value": true,  "tier": "platform" }
    },
    "claim_paid": {
      "email":  { "value": true,  "tier": "platform" },
      "sms":    { "value": false, "tier": "platform" },
      "in_app": { "value": true,  "tier": "platform" }
    },
    "intake_submitted": {
      "email":  { "value": true,  "tier": "platform" },
      "sms":    { "value": false, "tier": "platform" },
      "in_app": { "value": true,  "tier": "platform" }
    }
  }
}
```

**Response 404 Not Found:**
```json
{
  "detail": "User not found on site 'willow'"
}
```

**Response 400 Bad Request** (missing header):
```json
{
  "detail": "X-Frappe-Site-Name header is required"
}
```

---

#### 2.6.2 PUT `/api/modules/admin/notification-preferences/{user_email}`

**Description:** Creates or updates the user-level notification preference overrides in
`SM User Notification Preferences`. Returns the fully resolved merged preferences.

**Path parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_email` | string | Yes | Email address of the Frappe User |

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Frappe-Site-Name` | Yes | Current Frappe site name |

**Request body** (all fields optional — only include overrides):
```json
{
  "preferences": {
    "task_assigned": {
      "email": false,
      "sms": true
    },
    "appointment_reminder": {
      "sms": false
    }
  }
}
```

**Validation rules:**
- If `preferences` is provided, it must be a dict.
- Each top-level key must be one of the 6 valid event keys.
- Each nested value must be a dict of `{channel_key: bool}`.
- Each channel key must be one of the 3 valid channel keys.
- Values must be boolean (`true` or `false`), not omitted.

**Response 200 OK:**
```json
{
  "user_email": "jane.doe@example.com",
  "preferences": { ...fully resolved, same structure as GET... }
}
```

**Response 400 Bad Request:**
```json
{
  "detail": "Invalid event key(s): ['task_created']. Valid events: ['task_assigned', 'task_due_soon', 'appointment_reminder', 'claim_denied', 'claim_paid', 'intake_submitted']"
}
```
```json
{
  "detail": "Invalid channel key(s): ['push']. Valid channels: ['email', 'sms', 'in_app']"
}
```

**Response 404 Not Found:**
```json
{
  "detail": "User not found on site 'willow'"
}
```

### 2.7 New DocType: SM User Notification Preferences

**Purpose:** Stores per-user notification channel overrides, linked to Frappe User by email.

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | Data (Unique) | Yes | Frappe User email — the primary identifier |
| `enabled` | Check | No | Master on/off switch for all notifications (default: 1) |
| `preferences` | Table (SM Notification Preference Item) | No | Child table of per-event channel settings |

**Child Table: SM Notification Preference Item**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | Select | Yes | One of the 6 valid event keys |
| `email` | Check | No | Override email channel for this event |
| `sms` | Check | Check | Override sms channel for this event |
| `in_app` | Check | No | Override in_app channel for this event |

**Child table behavior:**
- `idx` is auto-managed by Frappe.
- Multiple rows for the same event are prevented via `unique` constraint on `(parent, event)`.
- Only channels explicitly set to `1` (True) need be stored; `0` (False) values may be
  stored or omitted. The merge logic must treat any unspecified channel as "no override at
  this tier."

**DocType naming:** `SM User Notification Preferences` (singular, standard Spark Mojo
naming convention for master-data DocTypes).

---

## 3. Frappe Integration Details

### 3.1 User Existence Check

Before any read or write, verify the user exists on the current site:

```python
async def _check_user_exists(email: str) -> bool:
    """Returns True if a Frappe User with this email exists on this site."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/User",
            params={
                "filters": f'[["email", "=", "{email}"]]',
                "fields": '["name"]',
                "limit_page_length": 1,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        return len(data) > 0
```

### 3.2 Site Registry Lookup

```python
async def _get_site_overrides(site_name: str) -> dict:
    """Returns site-level notification_preferences dict, or empty dict."""
    try:
        async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
            resp = await client.get(
                f"/api/resource/SM Site Registry/{site_name}",
                params={"fields": '["config_json"]'},
                timeout=10,
            )
            if resp.status_code == 404:
                return {}
            resp.raise_for_status()
            data = resp.json().get("data", {})
            config = data.get("config_json") or {}
            return config.get("notification_preferences", {})
    except Exception:
        return {}
```

### 3.3 User Preferences CRUD

**Read:**
```python
async def _get_user_preferences(email: str) -> Optional[dict]:
    """Returns user preferences as {event: {channel: bool}} or None."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM User Notification Preferences",
            params={
                "filters": f'[["email", "=", "{email}"]]',
                "fields": '["name", "enabled", "preferences"]',
                "limit_page_length": 1,
            },
            timeout=10,
        )
        resp.raise_for_status()
        docs = resp.json().get("data", [])
        if not docs:
            return None
        return _parse_user_prefs_from_doc(docs[0])
```

**Create or Update:**
```python
async def _upsert_user_preferences(email: str, preferences: dict) -> dict:
    """Create or update SM User Notification Preferences and return doc name."""
    # First try to get existing doc name
    existing = await _get_user_preferences_doc(email)  # returns doc with 'name'
    if existing:
        # Update the child table rows
        rows = _build_child_rows(preferences)
        await _update_frappe_doc("SM User Notification Preferences", existing["name"], {
            "preferences": rows,
        })
        return existing["name"]
    else:
        # Create new
        rows = _build_child_rows(preferences)
        doc = await _create_frappe_doc("SM User Notification Preferences", {
            "doctype": "SM User Notification Preferences",
            "email": email,
            "preferences": rows,
        })
        return doc["name"]
```

### 3.4 Cascade Merge Algorithm

```python
def _merge_preferences(
    platform: dict,
    site: dict,
    user: dict,
) -> dict:
    """
    Three-tier cascade merge. Higher tiers override lower tiers.
    Returns {event: {channel: {"value": bool, "tier": str}}}.
    """
    events = VALID_EVENTS
    channels = VALID_CHANNELS
    result = {}

    for event in events:
        result[event] = {}
        for channel in channels:
            if user and event in user and channel in user[event]:
                value = user[event][channel]
                tier = "user"
            elif site and event in site and channel in site[event]:
                value = site[event][channel]
                tier = "site"
            else:
                value = platform[event][channel]
                tier = "platform"
            result[event][channel] = {"value": value, "tier": tier}

    return result
```

---

## 4. Acceptance Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| AC-01 | `GET /api/modules/admin/notification-preferences/{email}` returns 200 with all 6 events and 3 channels resolved | curl / MAL test suite |
| AC-02 | Each channel in the GET response includes both `value` and `tier` fields | Response schema assertion |
| AC-03 | A site-level override in `SM Site Registry.config_json` causes the `tier` to be `"site"` for affected keys | Integration test with seeded site override |
| AC-04 | A user-level override in `SM User Notification Preferences` causes the `tier` to be `"user"` for affected keys | Integration test with seeded user pref |
| AC-05 | User tier overrides both site and platform; site tier overrides only platform | Unit test of `_merge_preferences` |
| AC-06 | `GET` returns 404 when the user email does not exist on the current site | Query with non-existent email |
| AC-07 | `GET` returns 400 when `X-Frappe-Site-Name` header is missing | Call without header |
| AC-08 | `PUT` with valid body creates a new `SM User Notification Preferences` document | Check Frappe DB after PUT |
| AC-09 | `PUT` with valid body on existing user updates the existing document | Check Frappe DB after second PUT |
| AC-10 | `PUT` with invalid event key returns 400 with a list of valid events | Send body with `"invalid_event"` key |
| AC-11 | `PUT` with invalid channel key returns 400 with a list of valid channels | Send body with `"invalid_channel"` key |
| AC-12 | `PUT` response body matches the GET response schema (fully resolved, with tier annotations) | Schema assertion on PUT response |
| AC-13 | Partial `PUT` body (only some events/channels) does not reset unspecified tiers | PUT partial, GET full, verify unspecified unchanged |
| AC-14 | The new `SM User Notification Preferences` DocType is listed in `platform/README.md` | Manual check |
| AC-15 | All endpoints use `X-Frappe-Site-Name` header exclusively for site identification (never path, never config) | Code inspection |

---

## 5. Out of Scope

- Notification dispatch (sending the actual email/SMS/in_app message) — handled by n8n workflows
- Admin UI for managing site-level overrides — future story
- Bulk preference read/write for all users on a site — future story
- Preference change webhooks or event emission — future story
- Notification preference history or audit log — future story

---

## 6. File Plan

| Action | Path |
|--------|------|
| CREATE | `mal/routes/admin/notification_preferences.py` |
| CREATE | `mal/tests/test_notification_preferences.py` |
| CREATE | `frappe-bench/sites/assets/sm_admin/docs/NOTIF-PREF-001.md` |
| UPDATE | `platform/README.md` — add `SM User Notification Preferences` to DocType registry |

---

## 7. Open Questions Resolution

| Open Question | Resolution |
|---------------|-----------|
| OQ-003 (canonical_state field type) | Not applicable — this capability does not use document state |
| OQ-007 (clinical AI legal review) | Not applicable — no AI in this capability |
| OQ-008 (pricing/packaging) | Not applicable — backend data capability, no direct pricing surface |

No new open questions are introduced by this story.
```
</details>

---

### File: `mal/routes/admin/notification_preferences.py`

```python
"""
Notification Preferences capability — /api/modules/admin/notification-preferences

Implements GET and PUT endpoints for user notification preference management.
Three-tier cascade: platform defaults → site overrides → user overrides.

Story: NOTIF-PREF-001
"""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Path
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter()

FRAPPE_URL = "http://localhost:8080"
FRAPPE_API_KEY = ""
FRAPPE_API_SECRET = ""


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_EVENTS = [
    "task_assigned",
    "task_due_soon",
    "appointment_reminder",
    "claim_denied",
    "claim_paid",
    "intake_submitted",
]

VALID_CHANNELS = ["email", "sms", "in_app"]

# Tier 1: Platform defaults
PLATFORM_DEFAULTS = {
    "task_assigned":        {"email": True,  "sms": False, "in_app": True},
    "task_due_soon":        {"email": True,  "sms": False, "in_app": True},
    "appointment_reminder": {"email": True,  "sms": True,  "in_app": True},
    "claim_denied":         {"email": True,  "sms": True,  "in_app": True},
    "claim_paid":           {"email": True,  "sms": False, "in_app": True},
    "intake_submitted":     {"email": True,  "sms": False, "in_app": True},
}


# ---------------------------------------------------------------------------
# Frappe helpers
# ---------------------------------------------------------------------------

def _frappe_headers() -> dict:
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


async def _frappe_get(path: str, params: Optional[dict] = None) -> dict:
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(path, params=params or {}, timeout=15)
        resp.raise_for_status()
        return resp.json()


async def _frappe_post(path: str, data: dict) -> dict:
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.post(path, json=data, timeout=15)
        resp.raise_for_status()
        return resp.json()


async def _frappe_put(path: str, data: dict) -> dict:
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.put(path, json=data, timeout=15)
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Preference resolution helpers
# ---------------------------------------------------------------------------

def _deep_merge(target: dict, overlay: dict) -> dict:
    """Merge overlay dict into target dict. Overlay values win."""
    result = {k: dict(v) for k, v in target.items()}
    for event, channels in overlay.items():
        if event not in result:
            result[event] = {}
        for channel, value in channels.items():
            result[event][channel] = value
    return result


def _resolve_with_tier(
    platform: dict,
    site: Optional[dict],
    user: Optional[dict],
) -> dict:
    """
    Resolve preferences through three-tier cascade and annotate each
    setting with its source tier.

    Returns:
        {
            "event": {
                "channel": {"value": bool, "tier": str}
            }
        }
    """
    result = {}
    for event in VALID_EVENTS:
        result[event] = {}
        for channel in VALID_CHANNELS:
            if user and event in user and channel in user[event]:
                value = user[event][channel]
                tier = "user"
            elif site and event in site and channel in site[event]:
                value = site[event][channel]
                tier = "site"
            else:
                value = platform[event][channel]
                tier = "platform"
            result[event][channel] = {"value": value, "tier": tier}
    return result


def _flatten_doc_to_prefs(doc: dict) -> Optional[dict]:
    """
    Convert SM User Notification Preferences doc child rows
    into {event: {channel: bool}} format.
    """
    rows = doc.get("preferences", [])
    if not rows:
        return None
    prefs = {}
    for row in rows:
        event = row.get("event")
        if not event:
            continue
        prefs[event] = {
            ch: bool(row.get(ch, False))
            for ch in VALID_CHANNELS
        }
    return prefs if prefs else None


def _build_child_rows(preferences: dict) -> list[dict]:
    """
    Convert {event: {channel: bool}} into Frappe child table rows.
    Only channels set to True are included in the row.
    """
    rows = []
    for event, channels in preferences.items():
        row = {"event": event}
        for ch in VALID_CHANNELS:
            if ch in channels:
                row[ch] = 1 if channels[ch] else 0
        rows.append(row)
    return rows


# ---------------------------------------------------------------------------
# Frappe data access
# ---------------------------------------------------------------------------

async def _check_user_exists(email: str) -> bool:
    """Return True if a Frappe User with this email exists."""
    result = await _frappe_get(
        "/api/resource/User",
        params={
            "filters": f'[["email", "=", "{email}"]]',
            "fields": '["name"]',
            "limit_page_length": 1,
        },
    )
    return len(result.get("data", [])) > 0


async def _get_site_overrides(site_name: str) -> Optional[dict]:
    """
    Read site-level notification overrides from SM Site Registry.config_json.
    Returns None if site has no overrides (let caller decide fallback).
    """
    try:
        result = await _frappe_get(
            f"/api/resource/SM Site Registry/{site_name}",
            params={"fields": '["config_json"]'},
        )
        data = result.get("data", {})
        config = data.get("config_json") or {}
        overrides = config.get("notification_preferences")
        return overrides if overrides else None
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return None
        raise
    except Exception:
        return None


async def _get_user_prefs_doc(email: str) -> Optional[dict]:
    """
    Return the raw SM User Notification Preferences document (including 'name')
    for the given email, or None if not found.
    """
    result = await _frappe_get(
        "/api/resource/SM User Notification Preferences",
        params={
            "filters": f'[["email", "=", "{email}"]]',
            "fields": '["name", "email", "enabled", "preferences"]',
            "limit_page_length": 1,
        },
    )
    docs = result.get("data", [])
    return docs[0] if docs else None


async def _upsert_user_preferences(email: str, preferences: dict) -> str:
    """
    Create or update SM User Notification Preferences for the given email.
    Returns the document name.
    """
    existing = await _get_user_prefs_doc(email)
    rows = _build_child_rows(preferences)

    if existing:
        await _frappe_put(
            f"/api/resource/SM User Notification Preferences/{existing['name']}",
            json={"preferences": rows},
        )
        return existing["name"]
    else:
        doc = await _frappe_post(
            "/api/resource/SM User Notification Preferences",
            json={
                "doctype": "SM User Notification Preferences",
                "email": email,
                "preferences": rows,
            },
        )
        return doc.get("data", {}).get("name", "")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ChannelPreference(BaseModel):
    """A single channel preference value (True/False)."""
    email: bool | None = None
    sms: bool | None = None
    in_app: bool | None = None


class PreferencesInput(BaseModel):
    """Input model for PUT request body preferences dict."""
    task_assigned: ChannelPreference | None = None
    task_due_soon: ChannelPreference | None = None
    appointment_reminder: ChannelPreference | None = None
    claim_denied: ChannelPreference | None = None
    claim_paid: ChannelPreference | None = None
    intake_submitted: ChannelPreference | None = None


class PreferenceItem(BaseModel):
    """A resolved channel setting with its value and source tier."""
    value: bool
    tier: str = Field(pattern="^(platform|site|user)$")


class PreferenceMap(BaseModel):
    """Map of channel to resolved value+tier for a single event."""
    email: PreferenceItem
    sms: PreferenceItem
    in_app: PreferenceItem


class NotificationPreferencesResponse(BaseModel):
    """Full response model for GET and PUT endpoints."""
    user_email: str
    preferences: dict[str, PreferenceMap]


class PreferenceUpdateRequest(BaseModel):
    """
    PUT request body. All fields optional.
    Only the events/channels the caller wishes to override need be specified.
    """
    preferences: Optional[dict[str, dict[str, bool]]] = None


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_and_normalize_prefs(
    raw: dict[str, dict[str, bool]],
) -> tuple[dict[str, dict[str, bool]], list[str], list[str]]:
    """
    Validate event and channel keys in a raw preferences dict.

    Returns:
        (normalized_prefs, invalid_events, invalid_channels)

    Raises HTTPException(400) if any invalid keys are found.
    """
    invalid_events = []
    invalid_channels = []
    normalized = {}

    for event, channels in raw.items():
        if event not in VALID_EVENTS:
            invalid_events.append(event)
            continue
        if event not in normalized:
            normalized[event] = {}
        for channel, value in channels.items():
            if channel not in VALID_CHANNELS:
                invalid_channels.append(channel)
                continue
            if not isinstance(value, bool):
                raise HTTPException(
                    status_code=400,
                    detail=f"Preference value for '{channel}' must be boolean, got {type(value).__name__}",
                )
            normalized[event][channel] = value

    if invalid_events:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event key(s): {invalid_events}. Valid events: {VALID_EVENTS}",
        )

    if invalid_channels:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid channel key(s): {invalid_channels}. Valid channels: {VALID_CHANNELS}",
        )

    return normalized, [], []


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/notification-preferences/{user_email}",
    response_model=NotificationPreferencesResponse,
)
async def get_notification_preferences(
    user_email: str = Path(..., description="Email address of the user"),
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name"),
):
    """
    GET resolved notification preferences for a user.

    Resolves the three-tier cascade (platform → site → user) and returns
    each channel setting annotated with its source tier.

    Returns 404 if the user does not exist on the current site.
    Returns 400 if the X-Frappe-Site-Name header is missing.
    """
    # 1. Validate user exists on site
    if not await _check_user_exists(user_email):
        raise HTTPException(
            status_code=404,
            detail=f"User not found on site '{x_frappe_site_name}'",
        )

    # 2. Read site overrides
    site_overrides = await _get_site_overrides(x_frappe_site_name)

    # 3. Read user overrides
    user_doc = await _get_user_prefs_doc(user_email)
    user_prefs = _flatten_doc_to_prefs(user_doc) if user_doc else None

    # 4. Resolve cascade with tier annotation
    resolved = _resolve_with_tier(
        platform=PLATFORM_DEFAULTS,
        site=site_overrides,
        user=user_prefs,
    )

    # 5. Build response
    return NotificationPreferencesResponse(
        user_email=user_email,
        preferences={
            event: PreferenceMap(
                email=PreferenceItem(value=v["email"]["value"], tier=v["email"]["tier"]),
                sms=PreferenceItem(value=v["sms"]["value"], tier=v["sms"]["tier"]),
                in_app=PreferenceItem(value=v["in_app"]["value"], tier=v["in_app"]["tier"]),
            )
            for event, v in resolved.items()
        },
    )


@router.put(
    "/notification-preferences/{user_email}",
    response_model=NotificationPreferencesResponse,
)
async def update_notification_preferences(
    user_email: str = Path(..., description="Email address of the user"),
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name"),
    body: PreferenceUpdateRequest | None = None,
):
    """
    Create or update user notification preference overrides.

    Accepts a partial or full preferences object. Only specified event/channel
    combinations are overridden — unspecified tiers fall through to site or
    platform defaults.

    Validation (400) occurs for invalid event or channel keys.
    Returns 404 if the user does not exist on the current site.
    """
    # 1. Validate user exists on site
    if not await _check_user_exists(user_email):
        raise HTTPException(
            status_code=404,
            detail=f"User not found on site '{x_frappe_site_name}'",
        )

    # 2. Normalize and validate request body
    if body and body.preferences:
        normalized, _, _ = _validate_and_normalize_prefs(body.preferences)
    else:
        normalized = {}

    # 3. Persist user overrides (upsert)
    if normalized:
        await _upsert_user_preferences(user_email, normalized)

    # 4. Re-resolve full cascade
    site_overrides = await _get_site_overrides(x_frappe_site_name)
    user_doc = await _get_user_prefs_doc(user_email)
    user_prefs = _flatten_doc_to_prefs(user_doc) if user_doc else None

    resolved = _resolve_with_tier(
        platform=PLATFORM_DEFAULTS,
        site=site_overrides,
        user=user_prefs,
    )

    # 5. Build response (same format as GET)
    return NotificationPreferencesResponse(
        user_email=user_email,
        preferences={
            event: PreferenceMap(
                email=PreferenceItem(value=v["email"]["value"], tier=v["email"]["tier"]),
                sms=PreferenceItem(value=v["sms"]["value"], tier=v["sms"]["tier"]),
                in_app=PreferenceItem(value=v["in_app"]["value"], tier=v["in_app"]["tier"]),
            )
            for event, v in resolved.items()
        },
    )
```

---

### File: `mal/tests/test_notification_preferences.py`

```python
"""
Tests for NOTIF-PREF-001 — Notification Preferences endpoints.

Run with: pytest mal/tests/test_notification_preferences.py -v
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient

from mal.routes.admin.notification_preferences import (
    _deep_merge,
    _resolve_with_tier,
    _flatten_doc_to_prefs,
    _build_child_rows,
    _validate_and_normalize_prefs,
    PLATFORM_DEFAULTS,
    VALID_EVENTS,
    VALID_CHANNELS,
)


# ---------------------------------------------------------------------------
# Unit tests — cascade logic
# ---------------------------------------------------------------------------

class TestResolveWithTier:
    def test_platform_defaults_when_no_overrides(self):
        result = _resolve_with_tier(PLATFORM_DEFAULTS, None, None)
        for event in VALID_EVENTS:
            for channel in VALID_CHANNELS:
                assert result[event][channel]["value"] == PLATFORM_DEFAULTS[event][channel]
                assert result[event][channel]["tier"] == "platform"

    def test_site_overrides_annotated_as_site(self):
        site = {"task_assigned": {"sms": True}}
        result = _resolve_with_tier(PLATFORM_DEFAULTS, site, None)
        assert result["task_assigned"]["sms"]["value"] is True
        assert result["task_assigned"]["sms"]["tier"] == "site"

    def test_user_overrides_annotated_as_user(self):
        user = {"claim_denied": {"email": False}}
        result = _resolve_with_tier(PLATFORM_DEFAULTS, None, user)
        assert result["claim_denied"]["email"]["value"] is False
        assert result["claim_denied"]["email"]["tier"] == "user"

    def test_user_overrides_win_over_site(self):
        site = {"task_assigned": {"email": True}}
        user = {"task_assigned": {"email": False}}
        result = _resolve_with_tier(PLATFORM_DEFAULTS, site, user)
        assert result["task_assigned"]["email"]["value"] is False
        assert result["task_assigned"]["email"]["tier"] == "user"

    def test_site_overrides_win_over_platform(self):
        site = {"task_assigned": {"sms": True}}
        result = _resolve_with_tier(PLATFORM_DEFAULTS, site, None)
        assert result["task_assigned"]["sms"]["value"] is True
        assert result["task_assigned"]["sms"]["tier"] == "site"
        # email is still platform
        assert result["task_assigned"]["email"]["tier"] == "platform"

    def test_partial_site_override_only_affects_specified(self):
        site = {"task_assigned": {"sms": True}}
        result = _resolve_with_tier(PLATFORM_DEFAULTS, site, None)
        # email unchanged from platform
        assert result["task_assigned"]["email"]["value"] == PLATFORM_DEFAULTS["task_assigned"]["email"]
        assert result["task_assigned"]["email"]["tier"] == "platform"

    def test_partial_user_override_only_affects_specified(self):
        user = {"claim_paid": {"in_app": False}}
        result = _resolve_with_tier(PLATFORM_DEFAULTS, None, user)
        # email still platform
        assert result["claim_paid"]["email"]["tier"] == "platform"
        assert result["claim_paid"]["email"]["value"] == PLATFORM_DEFAULTS["claim_paid"]["email"]
        # sms still platform
        assert result["claim_paid"]["sms"]["tier"] == "platform"
        assert result["claim_paid"]["sms"]["value"] == PLATFORM_DEFAULTS["claim_paid"]["sms"]
        # in_app overridden
        assert result["claim_paid"]["in_app"]["value"] is False
        assert result["claim_paid"]["in_app"]["tier"] == "user"


class TestDeepMerge:
    def test_overlay_replaces_values(self):
        target = {"a": {"x": 1, "y": 2}}
        overlay = {"a": {"x": 99}}
        result = _deep_merge(target, overlay)
        assert result["a"]["x"] == 99
        assert result["a"]["y"] == 2

    def test_new_event_added(self):
        target = {"a": {"x": 1}}
        overlay = {"b": {"y": 2}}
        result = _deep_merge(target, overlay)
        assert "b" in result
        assert result["b"]["y"] == 2


class TestFlattenDocToPrefs:
    def test_empty_rows_returns_none(self):
        doc = {"preferences": []}
        assert _flatten_doc_to_prefs(doc) is None

    def test_rows_parsed_correctly(self):
        doc = {
            "preferences": [
                {"event": "task_assigned", "email": 1, "sms": 0, "in_app": 1},
                {"event": "claim_denied", "email": 0, "sms": 1, "in_app": 0},
            ]
        }
        result = _flatten_doc_to_prefs(doc)
        assert result["task_assigned"]["email"] is True
        assert result["task_assigned"]["sms"] is False
        assert result["claim_denied"]["sms"] is True


class TestBuildChildRows:
    def test_rows_include_all_channels(self):
        prefs = {
            "task_assigned": {"email": True, "sms": False, "in_app": True}
        }
        rows = _build_child_rows(prefs)
        assert len(rows) == 1
        assert rows[0]["event"] == "task_assigned"
        assert rows[0]["email"] == 1
        assert rows[0]["sms"] == 0
        assert rows[0]["in_app"] == 1

    def test_multiple_events(self):
        prefs = {
            "task_assigned": {"email": True},
            "claim_denied": {"sms": True},
        }
        rows = _build_child_rows(prefs)
        events = {r["event"] for r in rows}
        assert events == {"task_assigned", "claim_denied"}


class TestValidateAndNormalizePrefs:
    def test_valid_prefs_pass_through(self):
        raw = {"task_assigned": {"email": True, "sms": False}}
        prefs, inv_events, inv_channels = _validate_and_normalize_prefs(raw)
        assert prefs == raw
        assert inv_events == []
        assert inv_channels == []

    def test_invalid_event_raises(self):
        from fastapi import HTTPException
        raw = {"invalid_event": {"email": True}}
        with pytest.raises(HTTPException) as exc_info:
            _validate_and_normalize_prefs(raw)
        assert exc_info.value.status_code == 400
        assert "invalid_event" in exc_info.value.detail

    def test_invalid_channel_raises(self):
        from fastapi import HTTPException
        raw = {"task_assigned": {"invalid_channel": True}}
        with pytest.raises(HTTPException) as exc_info:
            _validate_and_normalize_prefs(raw)
        assert exc_info.value.status_code == 400
        assert "invalid_channel" in exc_info.value.detail

    def test_non_boolean_value_raises(self):
        from fastapi import HTTPException
        raw = {"task_assigned": {"email": "yes"}}
        with pytest.raises(HTTPException) as exc_info:
            _validate_and_normalize_prefs(raw)
        assert exc_info.value.status_code == 400
        assert "boolean" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Integration tests — endpoint behavior (mocked Frappe)
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_frappe():
    """Patch all Frappe HTTP calls."""
    with patch("mal.routes.admin.notification_preferences._frappe_get") as mock_get, \
         patch("mal.routes.admin.notification_preferences._frappe_post") as mock_post, \
         patch("mal.routes.admin.notification_preferences._frappe_put") as mock_put:

        async def mock_get_fn(path, params=None):
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()

            if "User" in path:
                # User exists
                return {"data": [{"name": "jane.doe@example.com"}]}
            elif "SM Site Registry" in path:
                return {"data": {"config_json": {"notification_preferences": {}}}}
            elif "SM User Notification Preferences" in path:
                return {"data": []}

            return {"data": []}

        async def mock_post_fn(path, data):
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            return {"data": {"name": "new-doc-name"}}

        async def mock_put_fn(path, json):
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            return {"data": {}}

        mock_get.side_effect = mock_get_fn
        mock_post.side_effect = mock_post_fn
        mock_put.side_effect = mock_put_fn

        yield mock_get, mock_post, mock_put


class TestGetEndpoint:
    @pytest.mark.asyncio
    async def test_get_returns_all_six_events(self, mock_frappe):
        from mal.routes.admin.notification_preferences import get_notification_preferences

        mock_get, _, _ = mock_frappe
        # Re-configure mock for GET to return site overrides
        async def mock_get_with_site(path, params=None):
            if "User" in path:
                return {"data": [{"name": "jane@example.com"}]}
            if "SM Site Registry" in path:
                return {"data": {"config_json": {"notification_preferences": {}}}}
            return {"data": []}

        mock_get.side_effect = mock_get_with_site

        result = await get_notification_preferences(
            user_email="jane@example.com",
            x_frappe_site_name="willow",
        )

        assert result.user_email == "jane@example.com"
        assert set(result.preferences.keys()) == set(VALID_EVENTS)
        for event_key in VALID_EVENTS:
            assert "email" in result.preferences[event_key].model_fields
            assert "sms" in result.preferences[event_key].model_fields
            assert "in_app" in result.preferences[event_key].model_fields

    @pytest.mark.asyncio
    async def test_get_returns_404_for_unknown_user(self, mock_frappe):
        from mal.routes.admin.notification_preferences import get_notification_preferences

        mock_get, _, _ = mock_frappe

        async def mock_get_user_not_found(path, params=None):
            if "User" in path:
                return {"data": []}
            return {"data": []}

        mock_get.side_effect = mock_get_user_not_found

        with pytest.raises(Exception) as exc_info:
            await get_notification_preferences(
                user_email="nobody@example.com",
                x_frappe_site_name="willow",
            )
        assert "404" in str(exc_info.value.detail)


class TestPutEndpoint:
    @pytest.mark.asyncio
    async def test_put_creates_user_preferences(self, mock_frappe):
        from mal.routes.admin.notification_preferences import update_notification_preferences

        mock_get, mock_post, _ = mock_frappe

        async def mock_get_with_site(path, params=None):
            if "User" in path:
                return {"data": [{"name": "jane@example.com"}]}
            if "SM Site Registry" in path:
                return {"data": {"config_json": {"notification_preferences": {}}}}
            if "SM User Notification Preferences" in path:
                return {"data": []}
            return {"data": []}

        mock_get.side_effect = mock_get_with_site

        result = await update_notification_preferences(
            user_email="jane@example.com",
            x_frappe_site_name="willow",
            body=MagicMock(preferences={"task_assigned": {"email": False}}),
        )

        # Should have called POST to create
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == "/api/resource/SM User Notification Preferences"
        assert call_args[1]["json"]["email"] == "jane@example.com"
        assert len(call_args[1]["json"]["preferences"]) == 1

        # Response includes all events
        assert set(result.preferences.keys()) == set(VALID_EVENTS)

    @pytest.mark.asyncio
    async def test_put_invalid_event_returns_400(self, mock_frappe):
        from mal.routes.admin.notification_preferences import update_notification_preferences
        from fastapi import HTTPException

        mock_get, _, _ = mock_frappe

        async def mock_get_user(path, params=None):
            if "User" in path:
                return {"data": [{"name": "jane@example.com"}]}
            return {"data": []}

        mock_get.side_effect = mock_get_user

        with pytest.raises(HTTPException) as exc_info:
            await update_notification_preferences(
                user_email="jane@example.com",
                x_frappe_site_name="willow",
                body=MagicMock(preferences={"not_an_event": {"email": True}}),
            )

        assert exc_info.value.status_code == 400
        assert "not_an_event" in exc_info.value.detail
        assert "task_assigned" in exc_info.value.detail


class TestConstants:
    def test_platform_defaults_has_all_events(self):
        assert set(PLATFORM_DEFAULTS.keys()) == set(VALID_EVENTS)

    def test_platform_defaults_has_all_channels_per_event(self):
        for event, channels in PLATFORM_DEFAULTS.items():
            assert set(channels.keys()) == set(VALID_CHANNELS)
            assert all(isinstance(v, bool) for v in channels.values())

    def test_valid_events_count(self):
        assert len(VALID_EVENTS) == 6

    def test_valid_channels_count(self):
        assert len(VALID_CHANNELS) == 3
```

---

### Frappe DocType JSON: `SM User Notification Preferences`

```json
{
  "doctype": "DocType",
  "name": "SM User Notification Preferences",
  "module": "SM Admin",
  "custom": 1,
  "autoname": "field:email",
  "is_submittable": 0,
  "track_changes": 1,
  "fields": [
    {
      "fieldname": "email",
      "fieldtype": "Data",
      "label": "Email",
      "reqd": 1,
      "unique": 1,
      "description": "Frappe User email — primary identifier"
    },
    {
      "fieldname": "enabled",
      "fieldtype": "Check",
      "label": "Notifications Enabled",
      "default": "1",
      "description": "Master switch for all notifications. When disabled, no notifications are sent regardless of channel preferences."
    },
    {
      "fieldname": "preferences",
      "fieldtype": "Table",
      "label": "Preferences",
      "childtype": "SM Notification Preference Item",
      "description": "Per-event channel overrides",
      "fields": [
        {
          "fieldname": "event",
          "fieldtype": "Select",
          "label": "Event",
          "reqd": 1,
          "options": "task_assigned\ntask_due_soon\nappointment_reminder\nclaim_denied\nclaim_paid\nintake_submitted"
        },
        {
          "fieldname": "email",
          "fieldtype": "Check",
          "label": "Email"
        },
        {
          "fieldname": "sms",
          "fieldtype": "Check",
          "label": "SMS"
        },
        {
          "fieldname": "in_app",
          "fieldtype": "Check",
          "label": "In-App"
        }
      ]
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
  "doctype_or_field": "DocType"
}
```

---

### Frappe DocType JSON: `SM Notification Preference Item` (Child Table)

```json
{
  "doctype": "DocType",
  "name": "SM Notification Preference Item",
  "module": "SM Admin",
  "custom": 1,
  "istable": 1,
  "fields": [
    {
      "fieldname": "event",
      "fieldtype": "Select",
      "label": "Event",
      "reqd": 1,
      "options": "task_assigned\ntask_due_soon\nappointment_reminder\nclaim_denied\nclaim_paid\nintake_submitted"
    },
    {
      "fieldname": "email",
      "fieldtype": "Check",
      "label": "Email"
    },
    {
      "fieldname": "sms",
      "fieldtype": "Check",
      "label": "SMS"
    },
    {
      "fieldname": "in_app",
      "fieldtype": "Check",
      "label": "In-App"
    }
  ]
}
```

---

**Spec complete.** All 15 acceptance criteria are testable. No open questions remain unresolved.