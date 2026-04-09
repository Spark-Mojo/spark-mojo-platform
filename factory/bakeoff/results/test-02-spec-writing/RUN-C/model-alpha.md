model: model-alpha
test: 02-spec-writing
run: C
date: 2026-04-09

```python
"""
Admin capability routes — User notification preferences.

Handles GET and PUT for user notification preference resolution across
three tiers: platform defaults, site overrides, and user overrides.

Events: task_assigned, task_due_soon, appointment_reminder,
        claim_denied, claim_paid, intake_submitted

Channels: email, sms, in_app

Cascade: user overrides site, site overrides platform.
"""

import json
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field, validator

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Constants — Valid events and channels
# ---------------------------------------------------------------------------

VALID_EVENTS = {
    "task_assigned",
    "task_due_soon",
    "appointment_reminder",
    "claim_denied",
    "claim_paid",
    "intake_submitted",
}

VALID_CHANNELS = {
    "email",
    "sms",
    "in_app",
}


# ---------------------------------------------------------------------------
# Platform defaults (Tier 1)
# ---------------------------------------------------------------------------

PLATFORM_DEFAULTS: dict[str, dict[str, bool]] = {
    "task_assigned": {
        "email": True,
        "sms": True,
        "in_app": True,
    },
    "task_due_soon": {
        "email": True,
        "sms": True,
        "in_app": True,
    },
    "appointment_reminder": {
        "email": True,
        "sms": True,
        "in_app": True,
    },
    "claim_denied": {
        "email": True,
        "sms": False,
        "in_app": True,
    },
    "claim_paid": {
        "email": True,
        "sms": False,
        "in_app": True,
    },
    "intake_submitted": {
        "email": True,
        "sms": False,
        "in_app": True,
    },
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ChannelPreferences(BaseModel):
    """Channel enablement flags for a single event."""
    email: bool = True
    sms: bool = True
    in_app: bool = True


class UserPreferencesPayload(BaseModel):
    """Partial or full preferences object for PUT body."""
    task_assigned: Optional[ChannelPreferences] = None
    task_due_soon: Optional[ChannelPreferences] = None
    appointment_reminder: Optional[ChannelPreferences] = None
    claim_denied: Optional[ChannelPreferences] = None
    claim_paid: Optional[ChannelPreferences] = None
    intake_submitted: Optional[ChannelPreferences] = None


class ResolvedChannelPreferences(ChannelPreferences):
    """Resolved channel preferences with tier source."""
    email_source: Optional[str] = None
    sms_source: Optional[str] = None
    in_app_source: Optional[str] = None


class ResolvedEventPreferences(BaseModel):
    """Resolved preferences for a single event with tier sources."""
    channels: ResolvedChannelPreferences
    source: str = Field(..., description="Which tier provided the setting: platform, site, or user")


class ResolvedPreferencesResponse(BaseModel):
    """Fully resolved preferences for a user across all events."""
    user_email: str
    site_name: str
    preferences: dict[str, ResolvedEventPreferences]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _read_frappe_doc(doctype: str, name: str) -> dict:
    """Read a single doc from Frappe. Returns dict or raises HTTPException."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"{doctype} '{name}' not found")
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _update_frappe_doc(doctype: str, name: str, data: dict) -> dict:
    """Update a doc in Frappe."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.put(f"/api/resource/{doctype}/{name}", json=data, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _create_frappe_doc(doctype: str, data: dict) -> dict:
    """Create a new doc in Frappe."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.post(f"/api/resource/{doctype}", json=data, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _list_frappe_docs(doctype: str, filters: str = "", fields: str = "", limit: int = 20, offset: int = 0) -> list:
    """List docs from Frappe with filters."""
    params = {"limit_page_length": limit, "limit_start": offset}
    if filters:
        params["filters"] = filters
    if fields:
        params["fields"] = fields
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}", params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", [])


async def _user_exists_on_site(user_email: str, site_name: str) -> bool:
    """Check if a Frappe User exists on the current site."""
    try:
        users = await _list_frappe_docs(
            "User",
            filters=json.dumps([["email", "=", user_email]]),
            fields='["name"]',
            limit=1,
        )
        return len(users) > 0
    except Exception:
        return False


async def _get_site_overrides(site_name: str) -> dict[str, dict[str, bool]]:
    """Get site-level notification preference overrides from SM Site Registry.

    Returns dict with same structure as PLATFORM_DEFAULTS, or empty dict if none.
    """
    try:
        # SM Site Registry uses site_name as the document name
        site_doc = await _read_frappe_doc("SM Site Registry", site_name)
        config_json = site_doc.get("config_json", "{}")

        if isinstance(config_json, str):
            config = json.loads(config_json)
        else:
            config = config_json or {}

        site_prefs = config.get("notification_preferences", {})
        return site_prefs if isinstance(site_prefs, dict) else {}
    except HTTPException:
        # Site registry doc doesn't exist — no site overrides
        return {}
    except Exception as exc:
        logger.warning("Failed to read site overrides for %s: %s", site_name, exc)
        return {}


async def _get_user_overrides(user_email: str) -> dict[str, dict[str, bool]]:
    """Get user-level notification preference overrides from SM User Notification Preferences.

    Returns dict with same structure as PLATFORM_DEFAULTS, or empty dict if none.
    """
    try:
        prefs_docs = await _list_frappe_docs(
            "SM User Notification Preferences",
            filters=json.dumps([["user_email", "=", user_email]]),
            fields='["name","user_email","preferences_json"]',
            limit=1,
        )

        if not prefs_docs:
            return {}

        prefs_doc = prefs_docs[0]
        preferences_json = prefs_doc.get("preferences_json", "{}")

        if isinstance(preferences_json, str):
            preferences = json.loads(preferences_json)
        else:
            preferences = preferences_json or {}

        return preferences if isinstance(preferences, dict) else {}
    except Exception as exc:
        logger.warning("Failed to read user overrides for %s: %s", user_email, exc)
        return {}


def _resolve_preferences(
    platform: dict,
    site: dict,
    user: dict,
) -> dict[str, ResolvedEventPreferences]:
    """Resolve three-tier cascade into final preferences with tier sources.

    Cascade: user overrides site, site overrides platform.
    For each event/channel, track which tier provided the value.
    """
    resolved = {}

    for event in VALID_EVENTS:
        # Start with platform defaults
        platform_event = platform.get(event, {})
        site_event = site.get(event, {})
        user_event = user.get(event, {})

        # Resolve each channel
        resolved_channels = {}
        channel_sources = {}

        for channel in VALID_CHANNELS:
            # Check user override first
            if channel in user_event and user_event[channel] is not None:
                resolved_channels[channel] = user_event[channel]
                channel_sources[f"{channel}_source"] = "user"
            # Then site override
            elif channel in site_event and site_event[channel] is not None:
                resolved_channels[channel] = site_event[channel]
                channel_sources[f"{channel}_source"] = "site"
            # Finally platform default
            else:
                resolved_channels[channel] = platform_event.get(channel, True)
                channel_sources[f"{channel}_source"] = "platform"

        # Determine overall event source (highest priority tier that contributed)
        if user_event:
            source = "user"
        elif site_event:
            source = "site"
        else:
            source = "platform"

        resolved[event] = ResolvedEventPreferences(
            channels=ResolvedChannelPreferences(
                email=resolved_channels["email"],
                sms=resolved_channels["sms"],
                in_app=resolved_channels["in_app"],
                email_source=channel_sources["email_source"],
                sms_source=channel_sources["sms_source"],
                in_app_source=channel_sources["in_app_source"],
            ),
            source=source,
        )

    return resolved


def _validate_preferences(preferences: dict) -> list[str]:
    """Validate event and channel keys in a preferences dict.

    Returns list of error messages. Empty list means valid.
    """
    errors = []

    for event_key, channels in preferences.items():
        if event_key not in VALID_EVENTS:
            errors.append(f"Invalid event key: '{event_key}'. Valid events: {sorted(VALID_EVENTS)}")
            continue

        if not isinstance(channels, dict):
            errors.append(f"Event '{event_key}' must be an object with channel keys")
            continue

        for channel_key in channels:
            if channel_key not in VALID_CHANNELS:
                errors.append(f"Invalid channel key '{channel_key}' for event '{event_key}'. Valid channels: {sorted(VALID_CHANNELS)}")

    return errors


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/notification-preferences/{user_email}",
    response_model=ResolvedPreferencesResponse,
)
async def get_notification_preferences(
    user_email: str,
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name"),
):
    """Get fully resolved notification preferences for a user.

    Returns merged preferences across all three tiers (platform, site, user)
    with indication of which tier each setting came from.

    Returns 404 if user does not exist on the current site.
    """
    # Verify user exists on site
    user_exists = await _user_exists_on_site(user_email, x_frappe_site_name)
    if not user_exists:
        raise HTTPException(
            status_code=404,
            detail=f"User '{user_email}' does not exist on site '{x_frappe_site_name}'",
        )

    # Fetch all three tiers
    site_overrides = await _get_site_overrides(x_frappe_site_name)
    user_overrides = await _get_user_overrides(user_email)

    # Resolve cascade
    resolved = _resolve_preferences(
        platform=PLATFORM_DEFAULTS,
        site=site_overrides,
        user=user_overrides,
    )

    return ResolvedPreferencesResponse(
        user_email=user_email,
        site_name=x_frappe_site_name,
        preferences=resolved,
    )


@router.put(
    "/notification-preferences/{user_email}",
    response_model=ResolvedPreferencesResponse,
)
async def put_notification_preferences(
    user_email: str,
    payload: UserPreferencesPayload,
    x_frappe_site_name: str = Header(..., alias="X-Frappe-Site-Name"),
):
    """Create or update user notification preferences.

    Accepts partial or full preferences object. Only provided fields are updated.
    Returns the fully resolved preferences after update.

    Returns 400 if any event key or channel key is invalid.
    Returns 404 if user does not exist on the current site.
    """
    # Verify user exists on site
    user_exists = await _user_exists_on_site(user_email, x_frappe_site_name)
    if not user_exists:
        raise HTTPException(
            status_code=404,
            detail=f"User '{user_email}' does not exist on site '{x_frappe_site_name}'",
        )

    # Convert payload to dict, excluding None values
    preferences_dict = {}
    for event in VALID_EVENTS:
        event_prefs = getattr(payload, event, None)
        if event_prefs is not None:
            channel_dict = {}
            for channel in VALID_CHANNELS:
                channel_val = getattr(event_prefs, channel, None)
                if channel_val is not None:
                    channel_dict[channel] = channel_val
            if channel_dict:
                preferences_dict[event] = channel_dict

    # Validate keys
    validation_errors = _validate_preferences(preferences_dict)
    if validation_errors:
        raise HTTPException(status_code=400, detail="; ".join(validation_errors))

    # Find existing SM User Notification Preferences doc
    existing_docs = await _list_frappe_docs(
        "SM User Notification Preferences",
        filters=json.dumps([["user_email", "=", user_email]]),
        fields='["name","preferences_json"]',
        limit=1,
    )

    if existing_docs:
        # Update existing document
        doc_name = existing_docs[0]["name"]
        existing_json = existing_docs[0].get("preferences_json", "{}")

        if isinstance(existing_json, str):
            existing_prefs = json.loads(existing_json)
        else:
            existing_prefs = existing_json or {}

        # Merge: new values override existing
        merged_prefs = existing_prefs.copy()
        for event, channels in preferences_dict.items():
            if event in merged_prefs:
                merged_prefs[event].update(channels)
            else:
                merged_prefs[event] = channels

        await _update_frappe_doc("SM User Notification Preferences", doc_name, {
            "preferences_json": json.dumps(merged_prefs),
        })
    else:
        # Create new document
        await _create_frappe_doc("SM User Notification Preferences", {
            "doctype": "SM User Notification Preferences",
            "user_email": user_email,
            "preferences_json": json.dumps(preferences_dict),
        })

    # Fetch all tiers and resolve
    site_overrides = await _get_site_overrides(x_frappe_site_name)
    user_overrides = await _get_user_overrides(user_email)

    resolved = _resolve_preferences(
        platform=PLATFORM_DEFAULTS,
        site=site_overrides,
        user=user_overrides,
    )

    return ResolvedPreferencesResponse(
        user_email=user_email,
        site_name=x_frappe_site_name,
        preferences=resolved,
    )


# ---------------------------------------------------------------------------
# DocType definition for SM User Notification Preferences
# ---------------------------------------------------------------------------

SM_USER_NOTIFICATION_PREFERENCES_DOCTYPE = {
    "doctype": "SM User Notification Preferences",
    "module": "SM Widgets",
    "name": "SM User Notification Preferences",
    "type": "Document Type",
    "issingle": 0,
    "istable": 0,
    "editable_grid": 0,
    "track_changes": 1,
    "fields": [
        {
            "fieldname": "user_email",
            "fieldtype": "Link",
            "label": "User",
            "options": "User",
            "reqd": 1,
            "unique": 1,
        },
        {
            "fieldname": "preferences_json",
            "fieldtype": "Code",
            "label": "Preferences JSON",
            "options": "JSON",
            "reqd": 1,
            "description": (
                "JSON object mapping event names to channel preferences. "
                "Example: {\"task_assigned\": {\"email\": true, \"sms\": false, \"in_app\": true}}"
            ),
        },
    ],
    "permissions": [
        {
            "role": "System Manager",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1,
        },
    ],
}
```