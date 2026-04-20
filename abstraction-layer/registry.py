"""
Connector Registry and Site Registry.

ConnectorRegistry: Reads from SM Connector Config DocType in Frappe to determine
which backend handles each capability for each client. Default: frappe_native.

SiteRegistry: Reads from SM Site Registry DocType on admin.sparkmojo.com to
resolve subdomain → frappe_url + frappe_site. Cached with 5-min TTL.
"""

import json
import logging
import os
import time

import httpx

from connectors.base import BaseConnector
from connectors import frappe_native, simplepractice, valant, plane
from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.registry")


def _read_secret_or_empty(name: str) -> str:
    try:
        return read_secret(name)
    except SecretNotFoundError:
        return ""

# Map of connector names to their implementations
CONNECTOR_MAP = {
    "frappe_native": frappe_native.FrappeNativeConnector,
    "simplepractice": simplepractice.SimplePracticeConnector,
    "valant": valant.ValantConnector,
    "plane": plane.PlaneConnector,
}


class SiteRegistry:
    """
    Resolves subdomain → frappe_url + frappe_site by querying the
    SM Site Registry DocType on the admin Frappe site.
    Falls back to SITE_REGISTRY env var if admin site is unreachable.
    Cache TTL: 300 seconds (5 minutes).
    """

    CACHE_TTL = 300  # seconds

    def __init__(self):
        self._sites: dict[str, dict] = {}
        self._last_loaded: float = 0.0
        self._admin_url = os.getenv("ADMIN_FRAPPE_URL", "")
        self._admin_api_key = _read_secret_or_empty("admin_api_key")
        self._admin_api_secret = _read_secret_or_empty("admin_api_secret")

    async def load(self):
        """Load registry from SM Site Registry DocType, falling back to env var."""
        loaded = await self._load_from_doctype()
        if not loaded:
            loaded = self._load_from_env_var()
        if not loaded:
            raise RuntimeError(
                "SiteRegistry: no sites loaded from DocType or SITE_REGISTRY env var"
            )

    async def _load_from_doctype(self) -> bool:
        """Query admin site for active SM Site Registry records."""
        if not self._admin_url:
            logger.warning("ADMIN_FRAPPE_URL not set, skipping DocType load")
            return False
        try:
            headers = {}
            if self._admin_api_key and self._admin_api_secret:
                headers["Authorization"] = (
                    f"token {self._admin_api_key}:{self._admin_api_secret}"
                )
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self._admin_url}/api/resource/SM Site Registry",
                    params={
                        "filters": json.dumps([["is_active", "=", 1]]),
                        "fields": json.dumps(["*"]),
                        "limit_page_length": 0,
                    },
                    headers=headers,
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json().get("data", [])
                sites = {}
                for record in data:
                    subdomain = record.get("site_subdomain", "")
                    if subdomain:
                        sites[subdomain] = {
                            "frappe_url": record.get("frappe_url", ""),
                            "frappe_site": record.get("frappe_site", ""),
                            "site_type": record.get("site_type", ""),
                            "display_name": record.get("display_name", ""),
                            "capability_routing": record.get(
                                "capability_routing_json", ""
                            ),
                        }
                self._sites = sites
                self._last_loaded = time.time()
                logger.info(
                    "SiteRegistry: loaded %d active sites from DocType", len(sites)
                )
                return True
        except Exception as exc:
            logger.warning("SiteRegistry: failed to load from DocType: %s", exc)
            return False

    def _load_from_env_var(self) -> bool:
        """Parse SITE_REGISTRY env var as JSON fallback."""
        env_val = os.getenv("SITE_REGISTRY", "")
        if not env_val:
            return False
        try:
            parsed = json.loads(env_val)
            sites = {}
            if isinstance(parsed, dict):
                # Format: {"subdomain": {"frappe_url": ..., "frappe_site": ...}, ...}
                for subdomain, config in parsed.items():
                    if isinstance(config, dict):
                        sites[subdomain] = {
                            "frappe_url": config.get("frappe_url", ""),
                            "frappe_site": config.get("frappe_site", ""),
                            "site_type": config.get("site_type", ""),
                            "display_name": config.get("display_name", ""),
                            "capability_routing": config.get(
                                "capability_routing_json", ""
                            ),
                        }
            self._sites = sites
            self._last_loaded = time.time()
            logger.warning(
                "SiteRegistry: loaded %d sites from SITE_REGISTRY env var (fallback)",
                len(sites),
            )
            return bool(sites)
        except (json.JSONDecodeError, TypeError) as exc:
            logger.error("SiteRegistry: failed to parse SITE_REGISTRY env var: %s", exc)
            return False

    def is_stale(self) -> bool:
        """Check if the cache TTL has expired."""
        return (time.time() - self._last_loaded) > self.CACHE_TTL

    def lookup(self, subdomain: str) -> dict | None:
        """Look up a site by subdomain. Returns site config dict or None."""
        return self._sites.get(subdomain)

    @property
    def site_count(self) -> int:
        return len(self._sites)

    @property
    def sites(self) -> dict[str, dict]:
        return dict(self._sites)

    async def refresh(self):
        """Force reload from DocType (or env var fallback)."""
        self._sites = {}
        self._last_loaded = 0.0
        await self.load()


class ConnectorRegistry:
    """
    Resolves the correct connector for a given tenant + capability pair.
    In production, reads SM Connector Config from Frappe.
    Currently returns frappe_native for all capabilities.
    """

    def __init__(self):
        # TODO: On startup, cache SM Connector Config from Frappe
        # Structure: { tenant_id: { capability: connector_name } }
        self._config: dict[str, dict[str, str]] = {}
        self._instances: dict[str, BaseConnector] = {}

    def get_connector(self, tenant_id: str, capability: str) -> BaseConnector:
        """
        Get the connector instance for a tenant + capability.
        Falls back to frappe_native if no specific config exists.
        """
        tenant_config = self._config.get(tenant_id, {})
        connector_name = tenant_config.get(capability, "frappe_native")

        if connector_name not in self._instances:
            connector_cls = CONNECTOR_MAP.get(connector_name)
            if not connector_cls:
                connector_cls = frappe_native.FrappeNativeConnector
            self._instances[connector_name] = connector_cls()

        return self._instances[connector_name]

    async def refresh_config(self):
        """
        Reload SM Connector Config from Frappe.
        Called periodically or on config change webhook.
        """
        # TODO: GET /api/resource/SM Connector Config?limit_page_length=0
        # Parse and populate self._config
        pass
