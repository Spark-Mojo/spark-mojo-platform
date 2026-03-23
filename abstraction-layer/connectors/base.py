"""
Base connector interface.

All connectors implement this interface. The abstraction layer calls
handle() and the connector routes to the appropriate backend.
"""

from abc import ABC, abstractmethod
from typing import Any


class BaseConnector(ABC):
    """Base class for all backend connectors."""

    @abstractmethod
    async def handle(
        self,
        capability: str,
        action: str,
        method: str,
        body: dict | None,
        params: dict,
        user: dict,
    ) -> Any:
        """
        Handle a request for a capability/action pair.

        Args:
            capability: The canonical capability name (e.g., "onboarding", "billing_ar")
            action: The action within the capability (e.g., "list", "create", "update/123")
            method: HTTP method (GET, POST, PUT, DELETE)
            body: Request body (for POST/PUT)
            params: Query parameters
            user: Authenticated user dict (email, roles, tenant_id)

        Returns:
            Response data to be wrapped in {"data": result} by the router.
        """
        ...
