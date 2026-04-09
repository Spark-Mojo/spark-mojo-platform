model: model-zeta
test: 02-spec-writing
run: C
date: 2026-04-09

```python
"""
Notification Preferences capability routes — GET and PUT endpoints for user notification settings.

Handles three-tier cascade resolution (platform → site → user) for notification channels
per event type. Stores user overrides in SM User Notification Preferences DocType.
Site overrides stored in SM Site Registry config_json.

Story: NOTIF-PREF-001
Title: User notification preferences GET and PUT endpoints
Size: S
Dependencies: None
"""

import json
import logging
from typing import Optional, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException, Header, Path
from pydantic import BaseModel, Field, validator

logger = logging.getLogger("abstraction-layer.admin")

router = APIRouter(tags=["admin-notification-preferences"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

# ---------------------------------------------------------------------------
# Domain Constants & Platform Defaults
# ---------------------------------------------------------------------------

VALID_EVENTS = {
    "task_assigned",
    "task_due_soon",
    "appointment_reminder", 
    "claim_denied",
    "claim_paid",
    "intake_submitted"
}

VALID_CHANNELS = {
    "email",
    "sms",
    "in_app"
}

# Tier 1: Platform defaults — hardcoded fallback values
PLATFORM_DEFAULTS: Dict[str, Dict[str, bool]] = {
    "task_assigned": {"email": True, "sms": False, "in_app": True},
    "task_due_soon": {"email": True, "sms": True, "in_app": True},
    "appointment_reminder": {"email": True, "sms": True, "in_app": False},
    "claim_denied": {"email": True, "sms": False, "in_app": True},
    "claim_paid": {"email": True, "sms": False, "in_app": True},
    "intake_submitted": {"email": True, "sms": False, "in_app": True}
}


def _frappe_headers():
    """Standard Frappe REST API headers."""
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class EventPreferences(BaseModel):
    """Preferences for a single event type."""
    email: Optional[bool] = None
    sms: Optional[bool] = None
    in_app: Optional[bool] = None


class NotificationPreferencesMap(BaseModel):
    """Complete preferences payload for all events."""
    task_assigned: Optional[EventPreferences] = None
    task_due_soon: Optional[EventPreferences] = None
    appointment_reminder: Optional[EventPreferences] = None
    claim_denied: Optional[EventPreferences] = None
    claim_paid: Optional[EventPreferences] = None
    intake_submitted: Optional[EventPreferences] = None


class PreferenceSource(BaseModel):
    """Source attribution for a single channel."""
    email: str = "platform"  # "platform", "site", or "user"
    sms: str = "platform"
    in_app: str = "platform"


class NotificationPreferenceWithSource(BaseModel):
    """Event preferences paired with source attribution."""
    values: EventPreferences
    sources: PreferenceSource


class GetNotificationPreferencesResponse(BaseModel):
    """GET response with resolved preferences and tier provenance."""
    user_email: str
    resolved_preferences: NotificationPreferencesMap
    preference_sources: Dict[str, PreferenceSource]


class PutNotificationPreferencesRequest(BaseModel):
    """PUT request body for partial or full preferences update."""
    preferences: NotificationPreferencesMap

    @validator("preferences")
    def validate_event_keys(cls, v):
        """Ensure only valid event keys are provided."""
        if v is None:
            return v
        data = v.dict(exclude_unset=True)
        invalid_events = set(data.keys()) - VALID_EVENTS
        if invalid_events:
            raise ValueError(f"Invalid event keys: {invalid_events}")
        
        # Validate channels within each event
        for event_name, event_prefs in data.items():
            if event_prefs is None:
                continue
            pref_dict = event_prefs.dict(exclude_unset=True)
            invalid_channels = set(pref_dict.keys()) - VALID_CHANNELS
            if invalid_channels:
                raise ValueError(f"Invalid channel keys for {event_name}: {invalid_channels}")
        return v


class PutNotificationPreferencesResponse(BaseModel):
    """PUT response confirms update and returns resolved state."""
    user_email: str
    message: str
    resolved_preferences: NotificationPreferencesMap
    preference_sources: Dict[str, PreferenceSource]


# ---------------------------------------------------------------------------
# DocType Specifications (Reference)
# ---------------------------------------------------------------------------
"""
SM User Notification Preferences
--------------------------------
A new DocType to store user-level notification preference overrides (Tier 3).

Fields:
- user: Link -> User (mandatory, indexed)
- preferences: Code (JSON) - stores partial dict of event->channel->bool overrides
- standard Frappe fields: creation, modified, owner, etc.

Naming: Auto-increment or based on user.email + hash. Not user-facing.

Permissions:
- User can read/write own preferences
- System Manager can read/write all
- Administrator (bench) full access

SM Site Registry Extension
--------------------------
Uses existing DocType. Site-level overrides stored in:
config_json: {
    "notification_preferences": {
        "task_assigned": {"email": false, ...},
        ...
    }
}
"""


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

async def _check_user_exists(site_name: str, user_email: str) -> bool:
    """Verify user exists on the specified site."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        try:
            resp = await client.get(
                "/api/resource/User",
                params={
                    "filters": json.dumps([["email", "=", user_email]]),
                    "fields": json.dumps(["email"]),
                    "limit_page_length": 1
                },
                timeout=15,
                headers={"X-Frappe-Site-Name": site_name}
            )
            resp.raise_for_status()
            data = resp.json().get("data", [])
            return len(data) > 0
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return False
            raise


async def _get_site_preferences(site_name: str) -> Dict[str, Dict[str, bool]]:
    """Fetch Tier 2 (site) preferences from SM Site Registry config_json."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={
                "filters": json.dumps([["site_name", "=", site_name]]),
                "fields": json.dumps(["name", "config_json"]),
                "limit_page_length": 1
            },
            timeout=15,
            headers={"X-Frappe-Site-Name": site_name}
        )
        resp.raise_for_status()
        results = resp.json().get("data", [])
        
        if not results:
            return {}
        
        config_str = results[0].get("config_json", "{}")
        try:
            config = json.loads(config_str) if isinstance(config_str, str) else config_str
            site_prefs = config.get("notification_preferences", {})
            # Validate structure (ignore invalid keys, they don't hurt)
            return site_prefs
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Invalid config_json in SM Site Registry for site {site_name}")
            return {}


async def _get_user_preferences(site_name: str, user_email: str) -> Dict[str, Dict[str, bool]]:
    """Fetch Tier 3 (user) preferences from SM User Notification Preferences."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM User Notification Preferences",
            params={
                "filters": json.dumps([["user", "=", user_email]]),
                "fields": json.dumps(["name", "preferences"]),
                "limit_page_length": 1
            },
            timeout=15,
            headers={"X-Frappe-Site-Name": site_name}
        )
        resp.raise_for_status()
        results = resp.json().get("data", [])
        
        if not results:
            return {}
        
        pref_str = results[0].get("preferences", "{}")
        try:
            prefs = json.loads(pref_str) if isinstance(pref_str, str) else pref_str
            return prefs if isinstance(prefs, dict) else {}
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Invalid preferences JSON for user {user_email}")
            return {}


async def _update_user_preferences(
    site_name: str, 
    user_email: str, 
    preferences: Dict[str, Any]
) -> None:
    """Create or update SM User Notification Preferences document."""
    # First check if doc exists
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM User Notification Preferences",
            params={
                "filters": json.dumps([["user", "=", user_email]]),
                "fields": json.dumps(["name"]),
                "limit_page_length": 1
            },
            timeout=15,
            headers={"X-Frappe-Site-Name": site_name}
        )
        resp.raise_for_status()
        results = resp.json().get("data", [])
        
        pref_json = json.dumps(preferences)
        
        if results:
            # Update existing
            doc_name = results[0]["name"]
            update_resp = await client.put(
                f"/api/resource/SM User Notification Preferences/{doc_name}",
                json={"preferences": pref_json},
                timeout=15,
                headers={"X-Frappe-Site-Name": site_name}
            )
            update_resp.raise_for_status()
        else:
            # Create new
            create_resp = await client.post(
                "/api/resource/SM User Notification Preferences",
                json={
                    "user": user_email,
                    "preferences": pref_json
                },
                timeout=15,
                headers={"X-Frappe-Site-Name": site_name}
            )
            create_resp.raise_for_status()


def _resolve_preferences(
    site_prefs: Dict[str, Dict[str, bool]],
    user_prefs: Dict[str, Dict[str, bool]]
) -> tuple[Dict[str, Dict[str, bool]], Dict[str, Dict[str, str]]]:
    """
    Resolve three-tier cascade: Platform -> Site -> User.
    
    Returns tuple of (resolved_values, sources).
    """
    resolved: Dict[str, Dict[str, bool]] = {}
    sources: Dict[str, Dict[str, str]] = {}
    
    # Initialize with platform defaults
    for event in VALID_EVENTS:
        resolved[event] = {}
        sources[event] = {}
        for channel in VALID_CHANNELS:
            resolved[event][channel] = PLATFORM_DEFAULTS[event].get(channel, False)
            sources[event][channel] = "platform"
    
    # Overlay site preferences (Tier 2)
    for event, channels in site_prefs.items():
        if event not in VALID_EVENTS:
            continue
        if not isinstance(channels, dict):
            continue
        for channel, value in channels.items():
            if channel in VALID_CHANNELS and isinstance(value, bool):
                resolved[event][channel] = value
                sources[event][channel] = "site"
    
    # Overlay user preferences (Tier 3)
    for event, channels in user_prefs.items():
        if event not in VALID_EVENTS:
            continue
        if not isinstance(channels, dict):
            continue
        for channel, value in channels.items():
            if channel in VALID_CHANNELS and isinstance(value, bool):
                resolved[event][channel] = value
                sources[event][channel] = "user"
    
    return resolved, sources


def _build_response_models(
    resolved: Dict[str, Dict[str, bool]],
    sources: Dict[str, Dict[str, str]]
) -> tuple[NotificationPreferencesMap, Dict[str, PreferenceSource]]:
    """Convert raw dicts to Pydantic response models."""
    pref_map = {}
    source_map = {}
    
    for event in VALID_EVENTS:
        # Build EventPreferences
        pref_map[event] = EventPreferences(
            email=resolved[event].get("email"),
            sms=resolved[event].get("sms"),
            in_app=resolved[event].get("in_app")
        )
        # Build PreferenceSource
        source_map[event] = PreferenceSource(
            email=sources[event].get("email", "platform"),
            sms=sources[event].get("sms", "platform"),
            in_app=sources[event].get("in_app", "platform")
        )
    
    return NotificationPreferencesMap(**pref_map), source_map


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/notification-preferences/{user_email}",
    response_model=GetNotificationPreferencesResponse,
    summary="Get resolved notification preferences for a user"
)
async def get_notification_preferences(
    user_email: str = Path(..., description="Email address of the user"),
    x_frappe_site_name: str = Header(..., description="Target Frappe site name")
):
    """
    Returns fully resolved notification preferences for the specified user.
    
    Resolves the three-tier cascade:
    1. Platform defaults (hardcoded)
    2. Site overrides (from SM Site Registry)
    3. User overrides (from SM User Notification Preferences)
    
    Returns 404 if the user does not exist on the current site.
    Includes provenance metadata indicating which tier each setting originated from.
    """
    # Validate user exists
    user_exists = await _check_user_exists(x_frappe_site_name, user_email)
    if not user_exists:
        raise HTTPException(
            status_code=404,
            detail=f"User '{user_email}' not found on site '{x_frappe_site_name}'"
        )
    
    # Fetch tiers 2 and 3
    site_prefs = await _get_site_preferences(x_frappe_site_name)
    user_prefs = await _get_user_preferences(x_frappe_site_name, user_email)
    
    # Resolve cascade
    resolved, sources = _resolve_preferences(site_prefs, user_prefs)
    
    # Build response models
    pref_model, source_map = _build_response_models(resolved, sources)
    
    return GetNotificationPreferencesResponse(
        user_email=user_email,
        resolved_preferences=pref_model,
        preference_sources=source_map
    )


@router.put(
    "/notification-preferences/{user_email}",
    response_model=PutNotificationPreferencesResponse,
    summary="Update user notification preferences"
)
async def put_notification_preferences(
    request: PutNotificationPreferencesRequest,
    user_email: str = Path(..., description="Email address of the user"),
    x_frappe_site_name: str = Header(..., description="Target Frappe site name")
):
    """
    Creates or updates the SM User Notification Preferences document for the user.
    
    Accepts partial or full preferences object. Only provided event/channel combinations
    are updated; omitted keys retain their current values.
    
    Validates that all event keys and channel keys are within the allowed set.
    Returns 400 for invalid keys.
    
    After update, returns the fully resolved preferences (including tier provenance).
    """
    # Validate user exists
    user_exists = await _check_user_exists(x_frappe_site_name, user_email)
    if not user_exists:
        raise HTTPException(
            status_code=404,
            detail=f"User '{user_email}' not found on site '{x_frappe_site_name}'"
        )
    
    # Extract preferences from request (exclude_unset=False because we want to store
    # exactly what was sent, but we need to validate structure first)
    incoming = request.preferences.dict(exclude_none=True)
    
    # Additional validation: ensure no invalid keys made it through
    invalid_events = set(incoming.keys()) - VALID_EVENTS
    if invalid_events:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event keys: {invalid_events}"
        )
    
    for event_name, event_prefs in incoming.items():
        if event_prefs is None:
            continue
        invalid_channels = set(event_prefs.keys()) - VALID_CHANNELS
        if invalid_channels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid channel keys for {event_name}: {invalid_channels}"
            )
        # Validate values are boolean
        for ch, val in event_prefs.items():
            if not isinstance(val, bool):
                raise HTTPException(
                    status_code=400,
                    detail=f"Value for {event_name}.{ch} must be boolean, got {type(val)}"
                )
    
    # Fetch existing user prefs to merge (partial update behavior)
    existing_user_prefs = await _get_user_preferences(x_frappe_site_name, user_email)
    
    # Merge existing with incoming (incoming wins for provided keys)
    merged_user_prefs = existing_user_prefs.copy()
    for event_name, event_prefs in incoming.items():
        if event_name not in merged_user_prefs:
            merged_user_prefs[event_name] = {}
        merged_user_prefs[event_name].update(event_prefs)
    
    # Save to Frappe
    await _update_user_preferences(x_frappe_site_name, user_email, merged_user_prefs)
    
    # Re-resolve to get updated state with sources
    site_prefs = await _get_site_preferences(x_frappe_site_name)
    resolved, sources = _resolve_preferences(site_prefs, merged_user_prefs)
    pref_model, source_map = _build_response_models(res