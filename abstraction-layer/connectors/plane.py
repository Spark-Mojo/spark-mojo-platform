"""
Plane connector stub.

Plane handles Tier 2 Advanced Project Management (sold separately, Phase 5+).
Each client gets a separate Plane instance on the HIPAA VPS, provisioned
during tenant onboarding. Connected via the same abstraction layer pattern
as EHR connectors.

The existing Spark Mojo VPS Plane instance is for internal agent coordination
only — NOT for client data (per DECISION-004).
"""

from typing import Any
from .base import BaseConnector


class PlaneConnector(BaseConnector):
    """
    Plane connector for Advanced Projects Mojo.
    Phase 5+ — separate Plane instance per client on HIPAA VPS.
    """

    async def handle(
        self,
        capability: str,
        action: str,
        method: str,
        body: dict | None,
        params: dict,
        user: dict,
    ) -> Any:
        # TODO: Route to tenant-specific Plane API instance
        # TODO: Normalize Plane data to SM canonical DocTypes
        return {
            "error": "Plane connector not yet implemented",
            "stub": True,
            "note": "Plane connector for Advanced Projects Mojo. Phase 5+.",
        }
