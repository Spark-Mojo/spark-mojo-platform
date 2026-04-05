"""
Medplum FHIR connector with project-level tenant isolation.

DECISION-028: Every FHIR data method MUST validate project_id as its
first operation.  A missing or empty project_id raises
MedplumProjectScopeError immediately — this is a non-negotiable HIPAA
requirement that prevents cross-tenant data leakage.
"""

import os
import time

import httpx


class MedplumProjectScopeError(Exception):
    """Raised when a FHIR data method is called without a valid project_id."""


class MedplumClient:
    """Async Medplum FHIR client with mandatory project-scoped requests."""

    def __init__(self):
        self.base_url = os.getenv("MEDPLUM_BASE_URL", "").rstrip("/")
        self.client_id = os.getenv("MEDPLUM_CLIENT_ID", "")
        self.client_secret = os.getenv("MEDPLUM_CLIENT_SECRET", "")
        self._access_token = None
        self._token_expires_at = 0.0
        self._http = httpx.AsyncClient()

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url)

    def _validate_project_id(self, method_name: str, project_id):
        if not project_id:
            raise MedplumProjectScopeError(
                f"{method_name} requires a non-empty project_id (DECISION-028)"
            )

    async def _ensure_token(self):
        if self._access_token and time.time() < (self._token_expires_at - 300):
            return
        resp = await self._http.post(
            f"{self.base_url}/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        self._access_token = data["access_token"]
        self._token_expires_at = time.time() + data.get("expires_in", 3600)

    async def _request(self, method, path, project_id=None, json_body=None, params=None):
        await self._ensure_token()
        headers = {"Authorization": f"Bearer {self._access_token}"}
        if project_id:
            headers["X-Medplum-Project"] = project_id
        url = f"{self.base_url}{path}"

        resp = await self._http.request(
            method, url, headers=headers, json=json_body, params=params
        )

        if resp.status_code == 401:
            self._access_token = None
            await self._ensure_token()
            headers["Authorization"] = f"Bearer {self._access_token}"
            resp = await self._http.request(
                method, url, headers=headers, json=json_body, params=params
            )

        resp.raise_for_status()
        return resp.json()

    async def get_resource(self, resource_type, resource_id, project_id):
        self._validate_project_id("get_resource", project_id)
        return await self._request(
            "GET", f"/fhir/R4/{resource_type}/{resource_id}", project_id=project_id
        )

    async def create_resource(self, resource_type, resource, project_id):
        self._validate_project_id("create_resource", project_id)
        return await self._request(
            "POST", f"/fhir/R4/{resource_type}", project_id=project_id, json_body=resource
        )

    async def update_resource(self, resource_type, resource_id, resource, project_id):
        self._validate_project_id("update_resource", project_id)
        return await self._request(
            "PUT",
            f"/fhir/R4/{resource_type}/{resource_id}",
            project_id=project_id,
            json_body=resource,
        )

    async def search_resources(self, resource_type, project_id, params=None):
        self._validate_project_id("search_resources", project_id)
        return await self._request(
            "GET", f"/fhir/R4/{resource_type}", project_id=project_id, params=params
        )

    async def create_project(self, project_name):
        return await self._request(
            "POST", "/admin/projects", json_body={"name": project_name}
        )

    async def create_client_application(self, project_id: str, app_name: str) -> dict:
        """Create a ClientApplication within a Medplum Project.

        Returns dict with keys: id, secret, clientId.
        The caller is responsible for handling the secret securely.
        """
        return await self._request(
            "POST",
            f"/admin/projects/{project_id}/client",
            json_body={"name": app_name},
        )

    async def close(self):
        await self._http.aclose()
