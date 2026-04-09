model: model-gamma
test: 02-spec-writing
run: C
date: 2026-04-09

```markdown
# Story Spec: NOTIF-PREF-001 — User Notification Preferences GET and PUT Endpoints

| Field | Value |
|-------|-------|
| **Story ID** | NOTIF-PREF-001 |
| **Title** | User notification preferences GET and PUT endpoints |
| **Category** | BACKEND |
| **Size** | S |
| **Dependencies** | None |
| **Spec Date** | 2026-04-09 |
| **Author** | Spec Writer (Spark Mojo Build Factory) |
| **Status** | DRAFT |

---

## 1. Summary

Implement the Mojo Abstraction Layer (MAL) endpoints that allow the React frontend to **read** and **write** per-user notification channel preferences. Each event-channel pair follows a three-tier cascade (platform → site → user). The GET endpoint returns the fully resolved preference matrix along with provenance (which tier each setting originated from). The PUT endpoint accepts a partial or full preference object, persists user-level overrides in a new `SM User Notification Preferences` DocType, and returns the resolved result.

> **Platform Guardrail Checklist** (Section 2: Mandatory Spec Gates):
>
> **Gate 1 — Workflow:** This capability supports the *notification routing workflow* — the platform's decision engine that selects which channels to use for which events per user. The preferences are configuration input, not a workflow themselves, but they gate every downstream notification task. Without preferences, the notification workflow has no direction.
>
> **Gate 2 — CRM Timeline:** User preference changes are logged to the CRM activity timeline for the target user. A PUT that creates or modifies preferences writes an activity record: `"User notification preferences updated by {actor}."`
>
> **Gate 3 — Right Level:** These endpoints are **universal** — every Spark Mojo vertical (behavioral health, dental, general SMB) uses the same event and channel taxonomy. They are not vertical-specific. No existing capability serves this need; this is a new, universal backend capability.

---

## 2. Domain Model

### 2.1 Events

| Event Key | Description |
|-----------|-------------|
| `task_assigned` | A task is assigned to this user |
| `task_due_soon` | A task assigned to this user is approaching its due date |
| `appointment_reminder` | Reminder for an upcoming appointment |
| `claim_denied` | A claim associated with this user's workload was denied |
| `claim_paid` | A claim associated with this user's workload was paid |
| `intake_submitted` | A new patient/member intake form was submitted |

### 2.2 Channels

| Channel Key | Description |
|-------------|-------------|
| `email` | Email notification |
| `sms` | SMS text notification |
| `in_app` | In-application bell/notification center alert |

### 2.3 Preference Value

Each event-channel cell holds a boolean:
- `true` — notifications for this event are **enabled** on this channel
- `false` — notifications for this event are **disabled** on this channel

### 2.4 Three-Tier Cascade Resolution

Resolved value for any `(event, channel)` pair follows priority order (highest wins):

| Priority | Tier | Source | Description |
|----------|------|--------|-------------|
| 3 (highest) | `user` | `SM User Notification Preferences` DocType | Per-user override |
| 2 | `site` | `SM Site Registry` → `config_json["notification_preferences"]` | Tenant-level override |
| 1 (lowest) | `platform` | Python dict hardcoded in endpoint module | Platform-wide defaults |

If a tier does not define a value for a specific `(event, channel)` pair, the resolver falls back to the next lower tier. If no tier defines it, the result is `false` (opt-out default).

---

## 3. New DocType: `SM User Notification Preferences`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | Data (autoname hash) | Auto | Frappe document name |
| `email` | Data (read-only) | Yes | Frappe User email — links to User |
| `user_link` | Link → `User` | Yes | Direct link to Frappe User doctype |
| `preferences` | JSON / Long Text | Yes | Serialized preference overrides (only user-defined deviations stored) |
| `modified_by` | Data | Auto | Frappe user who last modified |
| `modified` | Datetime | Auto | Last modified timestamp |

### 3.1 JSON Schema for `preferences` Field

Only explicitly set values are stored. Unset keys cascade to lower tiers.

```json
{
  "task_assigned": {
    "email": true,
    "sms": false
  },
  "claim_denied": {
    "in_app": true,
    "email": true,
    "sms": true
  }
}
```

An event key with no channel sub-keys, or an empty event object, is treated as "no override" for that event — fall through to site or platform.

### 3.2 DocType Creation Script

The DocType is created programmatically in `sm_widgets` via `patches/create_notification_preferences_doctype.py` (or equivalent setup hook). No Frappe core modifications.

---

## 4. API Specification

**Base path:** `/api/modules/admin/notification-preferences/{user_email}`

Both endpoints use the `X-Frappe-Site-Name` request header to resolve the current site. The MAL gateway or middleware sets this header from the authenticated context.

### 4.1 Platform Defaults

Defined as a Python constant in the endpoint module. All defaults are `true` (opt-in platform-wide) unless a security or noise-sensitivity concern dictates otherwise.

```python
PLATFORM_DEFAULTS: dict[str, dict[str, bool]] = {
    "task_assigned":     {"email": True,  "sms": False, "in_app": True},
    "task_due_soon":     {"email": True,  "sms": True,  "in_app": True},
    "appointment_reminder": {"email": True, "sms": True, "in_app": True},
    "claim_denied":      {"email": True,  "sms": False, "in_app": True},
    "claim_paid":        {"email": True,  "sms": False, "in_app": True},
    "intake_submitted":  {"email": True,  "sms": False, "in_app": True},
}
```

### 4.2 Validation Constants

```python
VALID_EVENTS = {
    "task_assigned", "task_due_soon", "appointment_reminder",
    "claim_denied", "claim_paid", "intake_submitted",
}
VALID_CHANNELS = {"email", "sms", "in_app"}
```

---

### 4.3 `GET` — Retrieve Resolved Preferences

**Route:** `GET /api/modules/admin/notification-preferences/{user_email}`

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Frappe-Site-Name` | Yes | Target site slug |
| `Authorization` | Yes | Token auth (handled by MAL middleware) |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `user_email` | string | Email address of the Frappe User |

**Query Parameters:** None.

**Success Response (200):**

```json
{
  "email": "jane@clinic.com",
  "preferences": {
    "task_assigned": {
      "email": { "value": true, "source": "user" },
      "sms":   { "value": false, "source": "platform" },
      "in_app": { "value": true, "source": "site" }
    },
    "task_due_soon": {
      "email": { "value": true, "source": "user" },
      "sms":   { "value": true, "source": "user" },
      "in_app": { "value": true, "source": "platform" }
    },
    "appointment_reminder": {
      "email": { "value": true, "source": "platform" },
      "sms":   { "value": true, "source": "site" },
      "in_app": { "value": true, "source": "platform" }
    },
    "claim_denied": {
      "email": { "value": true, "source": "user" },
      "sms":   { "value": true, "source": "user" },
      "in_app": { "value": true, "source": "user" }
    },
    "claim_paid": {
      "email": { "value": true, "source": "platform" },
      "sms":   { "value": false, "source": "platform" },
      "in_app": { "value": true, "source": "platform" }
    },
    "intake_submitted": {
      "email": { "value": true, "source": "user" },
      "sms":   { "value": false, "source": "platform" },
      "in_app": { "value": true, "source": "user" }
    }
  }
}
```

**Error Responses:**

| Status Code | Condition | Body |
|-------------|-----------|------|
| `400` | Invalid or missing `X-Fragge-Site-Name` header | `{"error": "X-Frappe-Site-Name header is required"}` |
| `404` | User email does not exist as a Frappe `User` on the current site | `{"error": "User not found: jane@clinic.com"}` |
| `500` | Internal error (e.g. Frappe connection failure) | `{"error": "Internal server error"}` |

#### Resolution Algorithm (pseudocode)

```python
def resolve_preferences(user_overrides: dict, site_overrides: dict, platform_defaults: dict) -> dict:
    result = {}
    for event in VALID_EVENTS:
        event_obj = {}
        for channel in VALID_CHANNELS:
            if event in user_overrides and channel in user_overrides[event]:
                event_obj[channel] = {"value": user_overrides[event][channel], "source": "user"}
            elif event in site_overrides and channel in site_overrides[event]:
                event_obj[channel] = {"value": site_overrides[event][channel], "source": "site"}
            else:
                event_obj[channel] = {
                    "value": platform_defaults.get(event, {}).get(channel, False),
                    "source": "platform",
                }
        result[event] = event_obj
    return result
```

For any tier that is `None` or missing a key, that tier is treated as non-contributing for that key.

---

### 4.4 `PUT` — Create or Update User Preferences

**Route:** `PUT /api/modules/admin/notification-preferences/{user_email}`

**Headers:**
| Header | Required | Description |
|-------|----------|-------------|
| `X-Frappe-Site-Name` | Yes | Target site slug |
| `Authorization` | Yes | Token auth (handled by MAL middleware) |

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `user_email` | string | Email address of the Frappe User |

**Request Body (partial or full preferences):**

```json
{
  "task_assigned": {
    "email": true,
    "sms": true
  },
  "claim_denied": {
    "in_app": true
  }
}
```

- Only explicitly provided `(event, channel)` pairs are written as user overrides.
- Omitted events/channels retain whatever lower-tier value they had — this is a **partial update**, not a full replacement.
- If a user provides `"claim_denied": {"sms": true}` but omits `email` and `in_app` for that event, previously stored overrides for `email` and `in_app` (if any) remain intact.
- To *remove* a user override (fall back to site or platform), the client can send the channel key mapped to `null` (or omit it entirely if the intent is to remove a previously-set override — see 4.4.1 below).

> **4.4.1 Null semantics:** Sending `{"task_assigned": {"sms": null}}` means "delete the user-level override for task_assigned/sms, cascade to the next tier." The endpoint stores no value for that key, so the resolver skips the `user` tier for that cell.

**Request Validation:**

Validate every key in the request body against `VALID_EVENTS` and `VALID_CHANNELS`. If any key is unrecognized, return `400` immediately — do not partially apply the request.

```json
{
  "error": "Invalid preference key: 'task_reminder' is not a recognized event. Valid events are: task_assigned, task_due_soon, appointment_reminder, claim_denied, claim_paid, intake_submitted"
}
```

Similarly for invalid channel keys:

```json
{
  "error": "Invalid channel key: 'push' is not a recognized channel. Valid channels are: email, sms, in_app"
}
```

**Success Workflow:**

1. Validate request body keys.
2. Verify the user exists in Frappe on the current site (same check as GET).
3. Read existing `SM User Notification Preferences` DocType for this user (if it exists).
4. Merge incoming partial overrides into existing stored preferences:
   - For each `(event, channel)` with a boolean value: set/overwrite in stored prefs.
   - For each `(event, channel)` with a `null` value: remove from stored prefs.
   - If an event object becomes empty after removals, remove the event key entirely.
5. If no DocType exists, create it. If it exists, update it.
6. Write a CRM activity log entry for the target user.
7. Re-resolve the full preference matrix (platform → site → user) and return it (same shape as GET 200 response).

**Success Response (200):**

Same shape as GET success response, reflecting the post-update resolved state.

**Error Responses:**

| Status Code | Condition | Body |
|-------------|-----------|------|
| `400` | Invalid event key, channel key, or value type (not bool/null) | `{"error": "..."}` |
| `404` | User email does not exist as a Frappe `User` on the current site | `{"error": "User not found: ..."}` |
| `400` | Request body is empty `{}` or not valid JSON | `{"error": "Request body must contain at least one preference key"}` |
| `500` | Internal error | `{"error": "Internal server error"}` |

---

## 5. Site Registry Integration

The site overrides are stored in the `SM Site Registry` DocType (or equivalent site config mechanism) as a JSON field `config_json`, under the key `"notification_preferences"`. Shape:

```json
{
  "notification_preferences": {
    "task_assigned": { "email": true, "sms": false },
    "claim_denied": { "sms": true }
  }
}
```

The endpoint reads this value via a helper that queries the site registry. If the key is absent or value is `null`, site overrides are treated as an empty dict `{}`.

> **Note:** This story does **not** implement PUT for site-level overrides. Only the user-level PUT is in scope. Site overrides are managed by platform administrators via a separate capability.

---

## 6. Implementation Details

### 6.1 File Location

```
mojo-abstraction-layer/
  billing/
    ...
  notifications/
    __init__.py
    notification_preferences.py    ← new file with GET and PUT routes
    preferences_models.py           ← new file with Pydantic models
  ...
  main.py                           ← router registration update
```

Alternatively, colocate under `admin/` if that is the existing pattern for admin-scoped endpoints. The MAL gateway routes `/api/modules/admin/*` to the appropriate router.

### 6.2 Pydantic Models

```python
from typing import Optional
from pydantic import BaseModel


class PreferenceCell(BaseModel):
    value: bool
    source: str  # "platform" | "site" | "user"


class PreferenceEvent(BaseModel):
    email: Optional[PreferenceCell] = None
    sms: Optional[PreferenceCell] = None
    in_app: Optional[PreferenceCell] = None


class NotificationPreferencesResponse(BaseModel):
    email: str
    preferences: dict[str, dict[str, PreferenceCell]]


class PreferenceUpdateCell(BaseModel):
    email: Optional[bool] = None
    sms: Optional[bool] = None
    in_app: Optional[bool] = None


class NotificationPreferencesUpdateRequest(BaseModel):
    # Allow partial; keys validated manually to provide clear error messages
    model_config = {"extra": "forbid"}
```

> **Design note:** Using `extra: "forbid"` on the top-level model ensures invalid event keys are caught by Pydantic. However, we implement manual validation for richer error messages (listing valid keys in the error string).

### 6.3 Helper Functions

| Function | Purpose |
|----------|---------|
| `_resolve_site_preferences(site_name: str) -> dict` | Read `config_json["notification_preferences"]` from the site registry DocType. Returns `{}` on error or missing key. |
| `_resolve_user_preferences(user_email: str) -> dict` | Read the `preferences` JSON field from `SM User Notification Preferences` for the user. Returns `{}` if DocType does not exist. |
| `_resolve_all(user_email: str, site_name: str) -> dict` | Merge user, site, and platform tiers. Returns the full response body. |
| `_validate_preference_body(body: dict) -> tuple[bool, str]` | Validates all keys against VALID_EVENTS and VALID_CHANNELS. Returns `(True, "")` on success or `(False, error_message)` on failure. |

### 6.4 Frappe User Existence Check

The endpoint must verify that the email corresponds to an existing `User` DocType on the current site. This uses the same `_read_frappe_doc` or `_list_frappe_docs` helper pattern as the billing module:

```python
await _read_frappe_doc("User", user_email)
```

A `404` from Frappe for the `User` DocType maps to `404` for this endpoint.

### 6.5 CRM Timeline Activity

On a successful PUT, the endpoint creates an activity log entry for the target user. Using the platform's standard CRM activity contract:

```python
def _log_preference_change(user_email: str, changes: dict, actor_email: str):
    """Write a CRM activity record for this user's preference change."""
    # Example activity entry — uses the platform's Activity Log mechanism
    # This writes to the unified CRM timeline per Leg 2 of Platform Guardrails.
    pass
```

The exact DocType for activity logging is the standard `SM Activity Log` (or platform equivalent). The entry text: `"Notification preferences updated by {actor_email}."` The `changes` dict captures what was modified for audit purposes.

### 6.6 Error Handling

- Frappe HTTP errors (`4xx`, `5xx`) are caught and translated to appropriate MAL `HTTPException` status codes.
- `httpx.TimeoutException` → `504 Gateway Timeout`
- `httpx.ConnectError` → `503 Service Unavailable`
- Unexpected Python exceptions → `500 Internal Server Error` with generic message (no stack trace leaked to client).
- All errors are logged with `logger.error()` or `logger.warning()` at appropriate levels.

---

## 7. Test Specifications

### 7.1 GET Endpoint Tests

| # | Test Name | Setup | Input | Expected |
|---|-----------|-------|-------|----------|
| G-01 | Platform defaults only | No site overrides, no user overrides for `jane@test.com` | `GET /api/modules/admin/notification-preferences/jane@test.com` | 200. All 6 events × 3 channels with `"source": "platform"`, values match PLATFORM_DEFAULTS. |
| G-02 | Site overrides applied | Site registry has `{"task_assigned": {"email": false}}`, no user overrides | Same GET | 200. `task_assigned.email` = `{value: false, source: "site"}`. All others from platform. |
| G-03 | User overrides applied | User doc has `{"task_assigned": {"email": true}}` | Same GET | 200. `task_assigned.email` = `{value: true, source: "user"}`. |
| G-04 | Three-tier cascade | Platform: `email=true`, Site: `email=false`, User: (not set) | Same GET | 200. `email` = `{value: false, source: "site"}`. |
| G-05 | Three-tier cascade with user override | Platform: `email=true`, Site: `email=false`, User: `email=true` | Same GET | 200. `email` = `{value: true, source: "user"}`. |
| G-06 | User not found | No Frappe User with `nonexistent@test.com` | GET for `nonexistent@test.com` | 404 with error message. |
| G-07 | Missing site header | No `X-Frappe-Site-Name` header | GET for any user | 400 with error message. |
| G-08 | Partial site overrides | Site only defines `claim_denied.sms = true`, user has nothing | GET | 200. Only `task_denied.sms` is from `"site"`, all others from `"platform"`. |

### 7.2 PUT Endpoint Tests

| # | Test Name | Setup | Input | Expected |
|---|-----------|-------|-------|----------|
| P-01 | Create new user preferences | No existing `SM User Notification Preferences` for `jane@test.com` | `PUT {"task_assigned": {"email": false}}` | 200. DocType created with `{"task_assigned": {"email": false}}`. Response shows resolved prefs. |
| P-02 | Update existing preferences | User doc exists with `{"task_assigned": {"email": true}}` | `PUT {"task_assigned": {"sms": true}}` | 200. DocType now has both `email: true` and `sms: true` under `task_assigned`. |
| P-03 | Remove user override with null | User doc has `{"task_assigned": {"email": false}}` | `PUT {"task_assigned": {"email": null}}` | 200. `email` key removed from `task_assigned` in user doc. Resolved value falls back to site or platform with correct source. |
| P-04 | Invalid event key | — | `PUT {"invalid_event": {"email": true}}` | 400 with descriptive error. No changes persisted. |
| P-05 | Invalid channel key | — | `PUT {"task_assigned": {"push": true}}` | 400 with descriptive error. No changes persisted. |
| P-06 | Invalid value type (not bool or null) | — | `PUT {"task_assigned": {"email": "yes"}}` | 400 with descriptive error. |
| P-07 | Empty body | — | `PUT {}` | 400: "Request body must contain at least one preference key". |
| P-08 | User not found | No Frappe User `nonexistent@test.com` | `PUT {...}` | 404. |
| P-09 | Full preference object | — | `PUT` with all 6 events × 3 channels specified | 200. All user overrides created/updated. All sources = `"user"`. |
| P-10 | CRM activity log written | — | `PUT {"task_assigned": {"email": true}}` | 200. An activity log entry exists for the user with the change details. |

---

## 8. Security Considerations

- This endpoint is under the `/api/modules/admin/` path, implying admin-level access control. The MAL gateway must enforce that the requesting user has appropriate role permissions (e.g., `System Manager` or `Notification Admin`). Authorization is handled by MAL middleware, **not** by this endpoint function. The endpoint assumes the caller is authorized.
- The endpoint operates on the site identified by `X-Frappe-Site-Name`. It must not leak data across sites.
- User email in the path is PII but is required for routing. No additional PII beyond the email and preference booleans is returned or stored.

---

## 9. Deployment Notes

- No database migrations required beyond creating the `SM User Notification Preferences` DocType.
- The `PLATFORM_DEFAULTS` dict is in code — changing it requires a code deploy and affects all sites simultaneously (it is the lowest-priority tier, so sites and users are unaffected unless they explicitly fall through to it).
- Site overrides require `SM Site Registry` `config_json` access. This is a read-only operation for this story.

---

## 10. Open Questions for This Story

None. This story is fully resolvable with the information provided.

---

## 11. Acceptance Criteria Checklist

- [ ] `GET /api/modules/admin/notification-preferences/{user_email}` returns 200 with all 6 events × 3 channels, each with `value` (bool) and `source` string.
- [ ] `GET` returns 404 when user does not exist on the site.
- [ ] `GET` correctly merges platform defaults, site registry overrides, and user DocType overrides with proper tier provenance.
- [ ] `PUT /api/modules/admin/notification-preferences/{user_email}` creates `SM User Notification Preferences` DocType if it doesn't exist.
- [ ] `PUT` updates existing DocType, merging partial overrides (preserving unstated keys).
- [ ] `PUT` supports `null` values to remove user-level overrides (cascade to site/platform).
- [ ] `PUT` validates all incoming keys against the valid events and channels sets.
- [ ] `PUT` returns 400 for invalid keys or value types with descriptive error messages.
- [ ] `PUT` returns 404 for non-existent user.
- [ ] Both endpoints respect the `X-Frappe-Site-Name` header.
- [ ] Both endpoints call Frappe via the MAL pattern (`_read_frappe_doc`, `_create_frappe_doc`, `_update_frappe_doc`).
- [ ] React never calls Frappe directly — only through these MAL endpoints.
- [ ] All custom DocTypes are prefixed `SM `.
- [ ] PUT success writes a CRM timeline activity log entry for the target user.
- [ ] No hardcoded secrets in endpoint code (Platform Guardrail §4 #13).
- [ ] Error responses use generic messages (no stack traces leaked).
- [ ] All tests (G-01 through G-08, P-01 through P-10) pass.
```