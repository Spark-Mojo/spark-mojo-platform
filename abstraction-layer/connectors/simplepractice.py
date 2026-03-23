"""
SimplePractice connector stub.

SimplePractice has no clean API. Integration works via scheduled nightly
data exports parsed by n8n, normalized into SM canonical DocTypes in Frappe.

Read operations: Read from SM canonical DocTypes (same as frappe_native).
Write operations: Queue write-back via n8n workflow.

This connector is used for Erin / Willow Center (Instance 1).
"""

from typing import Any
from .base import BaseConnector


class SimplePracticeConnector(BaseConnector):
    """
    SP nightly sync. Read from SM canonical DocTypes.
    Write-backs queued via n8n.
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
        # TODO: For reads, delegate to frappe_native (data already synced by n8n)
        # TODO: For writes, queue an n8n webhook to write back to SimplePractice
        return {
            "error": "SimplePractice connector not yet implemented",
            "stub": True,
            "note": "SP nightly sync. Read from SM canonical DocTypes.",
        }
