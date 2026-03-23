"""
Frappe Native connector — default backend for all capabilities.

Calls the Frappe REST API to read/write SM canonical DocTypes.
This is the default connector when no specific connector is configured
for a tenant + capability pair in SM Connector Config.
"""

import os
import httpx
from typing import Any

from .base import BaseConnector


FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")

# Maps capability names to their canonical SM DocTypes
CAPABILITY_DOCTYPE_MAP = {
    "onboarding": "SM Client",
    "appointments": "SM Appointment",
    "billing_ar": "SM Invoice",
    "tasks": "Task",  # ERPNext Task extended with SM custom fields
    "projects": "SM Project",
    "documents": "SM Document",
    "employees": "SM Employee",
    "desktop": "SM Mojo Definition",
    "analytics": None,  # Reporting queries, no single DocType
}


class FrappeNativeConnector(BaseConnector):
    """Routes requests to Frappe REST API for SM canonical DocTypes."""

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
        Route to Frappe REST API.

        Maps capability + action to Frappe resource endpoints:
          list    → GET /api/resource/{DocType}
          create  → POST /api/resource/{DocType}
          {id}    → GET/PUT/DELETE /api/resource/{DocType}/{id}
          search  → GET /api/resource/{DocType}?filters=[["name","like","%query%"]]
        """
        doctype = CAPABILITY_DOCTYPE_MAP.get(capability)
        if not doctype:
            # TODO: Fall back to dynamic lookup from SM Connector Config
            return {"error": f"Unknown capability: {capability}", "records": []}

        api_key = os.getenv("FRAPPE_API_KEY", "")
        headers = {
            "Authorization": f"token {api_key}" if api_key else "",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=headers) as client:
            if action == "list":
                frappe_params = {}
                if params.get("sort"):
                    frappe_params["order_by"] = params["sort"]
                if params.get("limit"):
                    frappe_params["limit_page_length"] = params["limit"]
                if params.get("offset"):
                    frappe_params["limit_start"] = params["offset"]
                if params.get("filters"):
                    frappe_params["filters"] = params["filters"]

                resp = await client.get(
                    f"/api/resource/{doctype}",
                    params=frappe_params,
                    timeout=15,
                )
                resp.raise_for_status()
                return resp.json().get("data", [])

            elif action == "create":
                resp = await client.post(
                    f"/api/resource/{doctype}",
                    json=body,
                    timeout=15,
                )
                resp.raise_for_status()
                return resp.json().get("data", {})

            elif action.startswith("search"):
                query = params.get("q", "")
                resp = await client.get(
                    f"/api/resource/{doctype}",
                    params={
                        "filters": f'[["name","like","%{query}%"]]',
                        "limit_page_length": params.get("limit", "20"),
                    },
                    timeout=15,
                )
                resp.raise_for_status()
                return resp.json().get("data", [])

            elif action == "sync":
                since = params.get("since", "")
                resp = await client.get(
                    f"/api/resource/{doctype}",
                    params={
                        "filters": f'[["modified",">=","{since}"]]' if since else "",
                        "limit_page_length": 0,
                    },
                    timeout=15,
                )
                resp.raise_for_status()
                return resp.json().get("data", [])

            else:
                # Treat action as a record ID
                record_id = action
                if method == "GET":
                    resp = await client.get(
                        f"/api/resource/{doctype}/{record_id}",
                        timeout=15,
                    )
                    resp.raise_for_status()
                    return resp.json().get("data", {})

                elif method == "PUT":
                    resp = await client.put(
                        f"/api/resource/{doctype}/{record_id}",
                        json=body,
                        timeout=15,
                    )
                    resp.raise_for_status()
                    return resp.json().get("data", {})

                elif method == "DELETE":
                    resp = await client.delete(
                        f"/api/resource/{doctype}/{record_id}",
                        timeout=15,
                    )
                    resp.raise_for_status()
                    return {"status": "deleted", "id": record_id}

        return {"error": f"Unhandled action: {action}"}
