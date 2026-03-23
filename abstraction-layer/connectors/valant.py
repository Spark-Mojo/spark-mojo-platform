"""
Valant connector stub.

Valant claims API Management on their website but third-party reviews
contradict this. Plan around nightly export as the safe integration path.
Investigate API access as upside.

This connector is used for Kate / Artemis Counseling (Instance 2).
"""

from typing import Any
from .base import BaseConnector


class ValantConnector(BaseConnector):
    """
    Valant connector. TBD Phase 4.
    Plan around nightly export. API access unconfirmed.
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
        # TODO: Similar pattern to SimplePractice — nightly export via n8n
        # TODO: Investigate Valant API Management for potential direct integration
        return {
            "error": "Valant connector not yet implemented",
            "stub": True,
            "note": "Valant connector. TBD Phase 4.",
        }
