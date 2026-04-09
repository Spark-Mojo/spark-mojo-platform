model: model-beta
test: 02-spec-writing
run: C
date: 2026-04-09

```markdown
# Story Spec: NOTIF-PREF-001

## User Notification Preferences — GET and PUT Endpoints

| Field         | Value                                                        |
|---------------|--------------------------------------------------------------|
| **Story ID**  | NOTIF-PREF-001                                               |
| **Title**     | User notification preferences GET and PUT endpoints          |
| **Category**  | Backend (FastAPI MAL)                                        |
| **Size**      | S                                                            |
| **Dependencies** | None                                                      |
| **Route prefix** | `/api/modules/admin/notification-preferences`             |
| **File**      | `modules/admin/notification_preferences.py`                  |
| **DocType**   | `SM User Notification Preferences`                           |

---

## 1. Objective

Expose two MAL endpoints that allow reading and writing per-user notification preferences. Preferences control which notification channels (email, SMS, in-app) are enabled for each platform event. A three-tier cascade (platform → site → user) determines the effective preference for every event/channel pair. The GET endpoint returns the fully resolved result with tier attribution. The PUT endpoint writes user-level overrides and returns the updated resolved result.

---

## 2. Spec Gates

| Gate | Answer |
|------|--------|
| **Gate 1 — Workflow** | No independent workflow. This is a settings CRUD surface consumed by the notification dispatch workflow (future). Preferences are read at dispatch time to determine channel routing. |
| **Gate 2 — CRM Timeline** | No CRM timeline write. Changing a preference is a settings action, not a customer interaction event. |
| **Gate 3 — Right Level** | Universal. Event keys are platform-defined. Any vertical or client uses the same preference schema. No vertical-specific logic. |

---

## 3. Domain Model

### 3.1 Events (Closed Enum)

```python
VALID_EVENTS = {
    "task_assigned",
    "task_due_soon",
    "appointment_reminder",
    "claim_denied",
    "claim_paid",
    "intake_submitted",
}
```

### 3.2 Channels (Closed Enum)

```python
VALID_CHANNELS = {"email", "sms", "in_app"}
```

### 3.3 Preference Shape

A **preferences object** is a dict keyed by event name. Each value is a dict keyed by channel name. Each channel value is a `bool`.

```json
{
  "task_assigned":          { "email": true,  "sms": false, "in_app": true },
  "task_due_soon":          { "email": true,  "sms": true,  "in_app": true },
  "appointment_reminder":   { "email": true,  "sms": true,  "in_app": true },
  "claim_denied":           { "email": true,  "sms": false, "in_app": true },
  "claim_paid":             { "email": true,  "sms": false, "in_app": true },
  "intake_submitted":       { "email": false, "sms": false, "in_app": true }
}
```

### 3.4 Platform Defaults

Hardcoded as a Python dict constant named `PLATFORM_DEFAULTS` at module level in the endpoint file. This is Tier 1 — the lowest-priority fallback. Every event/channel pair **must** be present.

```python
PLATFORM_DEFAULTS: dict[str, dict[str, bool]] = {
    "task_assigned":        {"email": True,  "sms": False, "in_app": True},
    "task_due_soon":        {"email": True,  "sms": True,  "in_app": True},
    "appointment_reminder": {"email": True,  "sms": True,  "in_app": True},
    "claim_denied":         {"email": True,  "sms": False, "in_app": True},
    "claim_paid":           {"email": True,  "sms": False, "in_app": True},
    "intake_submitted":     {"email": False, "sms": False, "in_app": True},
}
```

### 3.5 Site Overrides (Tier 2)

Read from the existing `SM Site Registry` DocType. The `config_json` field (type: Long Text / JSON) may contain a top-level key `"notification_preferences"` whose value is a **partial** preferences object. Missing events or channels are not overridden.

Example `config_json` fragment:

```json
{
  "notification_preferences": {
    "task_assigned": { "sms": true },
    "claim_denied":  { "sms": true, "email": false }
  },
  "other_config_key": "..."
}
```

The site is identified by the `X-Frappe-Site-Name` request header. The endpoint reads the `SM Site Registry` document whose `site_name` field equals that header value.

### 3.6 User Overrides (Tier 3) — New DocType

**DocType name:** `SM User Notification Preferences`

| Field             | Type       | Required | Description                                      |
|-------------------|------------|----------|--------------------------------------------------|
| `name`            | (auto)     | —        | Frappe auto-name                                 |
| `user_email`      | Data       | Yes      | Email address, linked logically to Frappe `User`  |
| `preferences_json`| Long Text  | Yes      | JSON string — partial or full preferences object  |

- **Naming rule:** `autoname` or `format_string`. There is exactly one document per `user_email` per site (enforced by Frappe site isolation — one site per tenant).
- **No child tables.** A single JSON field keeps the DocType trivial for a size-S story and avoids bench migrate complexity for future event additions.
- The `preferences_json` field stores only the user's explicit overrides, **not** the resolved/merged result.

---

## 4. Three-Tier Merge Logic

The merge function produces two outputs for each event/channel pair:

1. **`value`** — the effective boolean.
2. **`source`** — which tier it came from: `"platform"`, `"site"`, or `"user"`.

**Algorithm (per event, per channel):**

```
resolved_value  = PLATFORM_DEFAULTS[event][channel]
resolved_source = "platform"

if site_overrides has event AND site_overrides[event] has channel:
    resolved_value  = site_overrides[event][channel]
    resolved_source = "site"

if user_overrides has event AND user_overrides[event] has channel:
    resolved_value  = user_overrides[event][channel]
    resolved_source = "user"
```

This runs for every combination in `VALID_EVENTS × VALID_CHANNELS` (currently $6 \times 3 = 18$ pairs).

**Implementation:** A pure function with signature:

```python
def resolve_preferences(
    site_overrides: dict[str, dict[str, bool]],
    user_overrides: dict[str, dict[str, bool]],
) -> dict[str, dict[str, dict]]:
    """
    Returns:
        {
            "task_assigned": {
                "email": {"enabled": True, "source": "platform"},
                "sms":   {"enabled": True, "source": "site"},
                "in_app": {"enabled": False, "source": "user"},
            },
            ...
        }
    """
```

This function is stateless, testable in isolation, and does not perform I/O.

---

## 5. API Contract

### 5.1 GET `/api/modules/admin/notification-preferences/{user_email}`

**Purpose:** Return fully resolved notification preferences for the given user.

**Headers:**

| Header                | Required | Description                  |
|-----------------------|----------|------------------------------|
| `X-Frappe-Site-Name`  | Yes      | Identifies the tenant site   |

**Path parameters:**

| Param        | Type   | Description            |
|--------------|--------|------------------------|
| `user_email` | string | Email of the target user |

**Response `200 OK`:**

```json
{
  "user_email": "provider@example.com",
  "preferences": {
    "task_assigned": {
      "email":  { "enabled": true,  "source": "platform" },
      "sms":    { "enabled": true,  "source": "site" },
      "in_app": { "enabled": false, "source": "user" }
    },
    "task_due_soon": {
      "email":  { "enabled": true,  "source": "platform" },
      "sms":    { "enabled": true,  "source": "platform" },
      "in_app": { "enabled": true,  "source": "platform" }
    }
  }
}
```

All six events are always present. All three channels per event are always present.

**Response `404 Not Found`:**

Returned if the `user_email` does not correspond to a `User` document on the resolved Frappe site.

```json
{ "detail": "User 'unknown@example.com' not found on this site" }
```

**Behavior when no user override doc exists:** This is **not** a 404. The endpoint returns resolved preferences using only platform + site tiers. Every `source` value will be either `"platform"` or `"site"`.

### 5.2 PUT `/api/modules/admin/notification-preferences/{user_email}`

**Purpose:** Create or update user-level notification preference overrides.

**Headers:**

| Header                | Required | Description                  |
|-----------------------|----------|------------------------------|
| `X-Frappe-Site-Name`  | Yes      | Identifies the tenant site   |

**Path parameters:**

| Param        | Type   | Description            |
|--------------|--------|------------------------|
| `user_email` | string | Email of the target user |

**Request body:** A **partial or full** preferences object. Only the event/channel pairs included in the body are stored as user overrides. Omitted pairs are not affected.

```json
{
  "task_assigned": { "sms": true },
  "claim_denied":  { "email": false, "in_app": true }
}
```

**Merge behavior on PUT:** The incoming body is **merged into** any existing `preferences_json` on the `SM User Notification Preferences` document (not a full replace). This allows incremental updates. To remove a user override (revert to site/platform default), the client must explicitly set the value — there is no delete-key semantic in v1.

**Response `200 OK`:** Returns the same shape as the GET response — the fully resolved preferences after the update is applied. This lets the frontend immediately reflect the new state without a follow-up GET.

```json
{
  "user_email": "provider@example.com",
  "preferences": { "..." }
}
```

**Response `400 Bad Request`:** Returned if the request body contains any key not in `VALID_EVENTS` or any channel key not in `VALID_CHANNELS`.

```json
{ "detail": "Invalid event key: 'appointment_cancelled'. Valid events: task_assigned, task_due_soon, appointment_reminder, claim_denied, claim_paid, intake_submitted" }
```

```json
{ "detail": "Invalid channel key: 'push' in event 'task_assigned'. Valid channels: email, sms, in_app" }
```

**Response `404 Not Found`:** Same as GET — returned only if `user_email` does not exist as a `User` on the site.

---

## 6. Pydantic Models

```python
from pydantic import BaseModel


class ChannelPreference(BaseModel):
    enabled: bool
    source: str  # "platform" | "site" | "user"


class EventPreferences(BaseModel):
    email: ChannelPreference
    sms: ChannelPreference
    in_app: ChannelPreference


class NotificationPreferencesResponse(BaseModel):
    user_email: str
    preferences: dict[str, EventPreferences]
    # Keys are event names; all 6 events always present
```

The PUT request body is **not** a Pydantic model with strict fields — it is accepted as a `dict[str, dict[str, bool]]` and validated manually against `VALID_EVENTS` and `VALID_CHANNELS` so that partial payloads are natural. Use `request_body: dict` in the FastAPI signature with manual validation.

---

## 7. Endpoint Implementation Logic

### 7.1 GET Flow

```
1. Extract site_name from X-Frappe-Site-Name header.
2. Verify user exists: GET /api/resource/User/{user_email} on Frappe.
   → 404 from Frappe → return 404 to caller.
3. Load site overrides:
   a. GET /api/resource/SM Site Registry with filter [["site_name","=","{site_name}"]]
   b. Parse config_json → extract "notification_preferences" key (default: {})
4. Load user overrides:
   a. GET /api/resource/SM User Notification Preferences
      with filter [["user_email","=","{user_email}"]]
   b. If found, parse preferences_json (default: {})
   c. If not found, user_overrides = {}
5. Call resolve_preferences(site_overrides, user_overrides).
6. Return NotificationPreferencesResponse.
```

### 7.2 PUT Flow

```
1. Extract site_name from X-Frappe-Site-Name header.
2. Validate request body:
   a. For each key in body: reject if not in VALID_EVENTS → 400.
   b. For each channel key under each event: reject if not in VALID_CHANNELS → 400.
   c. For each channel value: reject if not a bool → 400.
3. Verify user exists: GET /api/resource/User/{user_email} on Frappe.
   → 404 from Frappe → return 404 to caller.
4. Load existing SM User Notification Preferences doc (if any).
   a. If exists: deep-merge incoming body into existing preferences_json.
      Update via PUT /api/resource/SM User Notification Preferences/{name}.
   b. If not exists: create via POST /api/resource/SM User Notification Preferences
      with user_email and preferences_json = json.dumps(body).
5. Load site overrides (same as GET step 3).
6. Call resolve_preferences(site_overrides, merged_user_overrides).
7. Return NotificationPreferencesResponse.
```

### 7.3 Deep Merge Helper

```python
def _deep_merge_preferences(
    existing: dict[str, dict[str, bool]],
    incoming: dict[str, dict[str, bool]],
) -> dict[str, dict[str, bool]]:
    """Merge incoming overrides into existing. Incoming wins on conflict."""
    merged = {event: dict(channels) for event, channels in existing.items()}
    for event, channels in incoming.items():
        if event not in merged:
            merged[event] = {}
        merged[event].update(channels)
    return merged
```

---

## 8. Frappe DocType Definition

Create the DocType via the Frappe site. No bench migrate is required for JSON-field-only DocTypes beyond the initial creation.

**SM User Notification Preferences:**

| Property       | Value                               |
|----------------|-------------------------------------|
| Module         | SM Widgets (or applicable SM module) |
| Is Submittable | No                                  |
| Is Child Table | No                                  |
| Track Changes  | No                                  |

| Field Name         | Label                    | Type      | Mandatory | Unique | Description                        |
|--------------------|--------------------------|-----------|-----------|--------|------------------------------------|
| `user_email`       | User Email               | Data      | Yes       | Yes    | Maps to Frappe `User.name` (email) |
| `preferences_json` | Preferences JSON         | Long Text | Yes       | No     | Stores partial override object     |

---

## 9. Error Handling

| Condition | HTTP Status | Detail Message |
|-----------|-------------|----------------|
| `X-Frappe-Site-Name` header missing | 400 | `"Missing required header: X-Frappe-Site-Name"` |
| `user_email` not found as Frappe `User` | 404 | `"User '{user_email}' not found on this site"` |
| Invalid event key in PUT body | 400 | `"Invalid event key: '{key}'. Valid events: ..."` |
| Invalid channel key in PUT body | 400 | `"Invalid channel key: '{key}' in event '{event}'. Valid channels: ..."` |
| Channel value is not a bool in PUT body | 400 | `"Channel value for '{event}.{channel}' must be a boolean"` |
| SM Site Registry not found for site | *(not an error)* | Site overrides default to `{}`. Site registry may not have notification prefs configured. |
| Frappe API unreachable | 502 | `"Backend service unavailable"` |

---

## 10. Acceptance Criteria

### AC-1: GET returns fully resolved preferences
**Given** a user exists on the site  
**When** GET `/api/modules/admin/notification-preferences/{user_email}` is called  
**Then** the response contains all 6 events, each with all 3 channels, each with `enabled` (bool) and `source` (string).

### AC-2: Three-tier merge — platform only
**Given** no site overrides and no user overrides exist  
**When** GET is called  
**Then** every `source` is `"platform"` and every `enabled` matches `PLATFORM_DEFAULTS`.

### AC-3: Three-tier merge — site overrides platform
**Given** the SM Site Registry `config_json` sets `task_assigned.sms = true`  
**And** no user override exists for `task_assigned.sms`  
**When** GET is called  
**Then** `task_assigned.sms.enabled` is `true` and `task_assigned.sms.source` is `"site"`.

### AC-4: Three-tier merge — user overrides site
**Given** the site sets `task_assigned.sms = true`  
**And** the user override sets `task_assigned.sms = false`  
**When** GET is called  
**Then** `task_assigned.sms.enabled` is `false` and `task_assigned.sms.source` is `"user"`.

### AC-5: GET with no user override doc returns 200 (not 404)
**Given** a user exists but has no `SM User Notification Preferences` document  
**When** GET is called  
**Then** response is `200` with resolved preferences (platform + site tiers only).

### AC-6: GET with nonexistent user returns 404
**Given** the email does not match any `User` on the site  
**When** GET is called  
**Then** response is `404`.

### AC-7: PUT creates user override document
**Given** no `SM User Notification Preferences` doc exists for the user  
**When** PUT is called with `{"task_assigned": {"sms": true}}`  
**Then** a new `SM User Notification Preferences` doc is created with `preferences_json` containing that override  
**And** the response shows `task_assigned.sms.source` as `"user"`.

### AC-8: PUT merges into existing overrides
**Given** user already has override `{"task_assigned": {"sms": true}}`  
**When** PUT is called with `{"task_assigned": {"email": false}}`  
**Then** the stored `preferences_json` is `{"task_assigned": {"sms": true, "email": false}}`  
**And** the response reflects both overrides with `source: "user"`.

### AC-9: PUT rejects invalid event key
**When** PUT is called with `{"appointment_cancelled": {"email": true}}`  
**Then** response is `400` with detail naming the invalid key.

### AC-10: PUT rejects invalid channel key
**When** PUT is called with `{"task_assigned": {"push": true}}`  
**Then** response is `400` with detail naming the invalid channel.

### AC-11: PUT rejects non-boolean channel values
**When** PUT is called with `{"task_assigned": {"email": "yes"}}`  
**Then** response is `400`.

### AC-12: PUT returns resolved preferences
**When** PUT succeeds  
**Then** the response body matches the GET response shape — full resolution across all three tiers.

---

## 11. Test Plan

| # | Test | Type | Notes |
|---|------|------|-------|
| T-1 | `resolve_preferences` with empty site + empty user returns platform defaults, all sources `"platform"` | Unit | Pure function, no I/O |
| T-2 | `resolve_preferences` with site overrides for 2 event/channel pairs | Unit | Verify only those 2 show `"site"` |
| T-3 | `resolve_preferences` with user overriding a site-overridden pair | Unit | User wins, source is `"user"` |
| T-4 | `_deep_merge_preferences` merges without clobbering existing keys | Unit | |
| T-5 | Validation rejects unknown event key | Unit | |
| T-6 | Validation rejects unknown channel key | Unit | |
| T-7 | Validation rejects non-bool value | Unit | |
| T-8 | GET returns 404 for nonexistent user | Integration | Mock Frappe returning 404 for User |
| T-9 | GET returns 200 with platform-only resolution when no overrides exist | Integration | Mock Frappe returning empty SM Site Registry / no user pref doc |
| T-10 | PUT creates doc, second PUT merges into it | Integration | Two sequential calls, verify stored JSON |
| T-11 | PUT returns 400 and does not write on invalid body | Integration | Verify no Frappe write call made |

---

## 12. Implementation Notes

### 12.1 Router Registration

```python
router = APIRouter(prefix="/notification-preferences", tags=["admin"])
```

This router is mounted under the `admin` module so the final paths are:
- `GET /api/modules/admin/notification-preferences/{user_email}`
- `PUT /api/modules/admin/notification-preferences/{user_email}`

### 12.2 Frappe Interaction Pattern

Follow the same `httpx.AsyncClient` pattern used in `billing.py`:
- Use `_frappe_headers()` with `FRAPPE_API_KEY` / `FRAPPE_API_SECRET` env vars.
- Use `FRAPPE_URL` base URL.
- Set `timeout=15` on all Frappe calls.
- The `X-Frappe-Site-Name` header from the incoming request must be forwarded to all Frappe API calls so that Frappe resolves to the correct tenant site.

### 12.3 Site Override Loading

```python
async def _load_site_overrides(site_name: str) -> dict:
    """Load notification_preferences from SM Site Registry config_json."""
    sites = await _list_frappe_docs(
        "SM Site Registry",
        filters=json.dumps([["site_name", "=", site_name]]),
        fields='["name","config_json"]',
        limit=1,
    )
    if not sites:
        return {}
    config_json = sites[0].get("config_json", "")
    if not config_json:
        return {}
    try:
        config = json.loads(config_json)
        return config.get("notification_preferences", {})
    except (json.JSONDecodeError, TypeError):
        return {}
```

### 12.4 Non-Goals (Out of Scope)

- **No authentication/authorization in this story.** Auth middleware is tracked by ADMIN-001, which is a prerequisite for production but not a dependency for this story's implementation.
- **No notification dispatch.** This story only manages preferences. A future story will read these preferences at dispatch time.
- **No frontend.** React components to manage preferences are a separate story.
- **No n8n integration.** Preferences are read synchronously at dispatch time from the MAL; n8n is not involved.
- **No audit log for preference changes.** Could be added later; not required at size S.

### 12.5 Future Extensibility

Adding a new event or channel requires:
1. Add the value to `VALID_EVENTS` or `VALID_CHANNELS`.
2. Add the default to `PLATFORM_DEFAULTS`.
3. No database migration — `preferences_json` is schemaless.

---

## 13. File Inventory

| File | Action | Purpose |
|------|--------|---------|
| `modules/admin/notification_preferences.py` | **Create** | FastAPI router with GET/PUT endpoints, merge logic, validation |
| `SM User Notification Preferences` (DocType) | **Create** | Frappe DocType via site — 2 fields (`user_email`, `preferences_json`) |
| `tests/test_notification_preferences.py` | **Create** | Unit tests for merge/validation; integration tests for endpoints |

---

*Spec written: April 9, 2026. Story NOTIF-PREF-001. Self-contained — no external document dependencies.*
```