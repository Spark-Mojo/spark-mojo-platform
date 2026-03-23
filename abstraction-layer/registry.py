"""
Connector Registry.

Reads from SM Connector Config DocType in Frappe to determine which backend
handles each capability for each client. Default: frappe_native for everything.
"""

from connectors.base import BaseConnector
from connectors import frappe_native, simplepractice, valant, plane


# Map of connector names to their implementations
CONNECTOR_MAP = {
    "frappe_native": frappe_native.FrappeNativeConnector,
    "simplepractice": simplepractice.SimplePracticeConnector,
    "valant": valant.ValantConnector,
    "plane": plane.PlaneConnector,
}


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
