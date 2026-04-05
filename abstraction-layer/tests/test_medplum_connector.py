"""
Tests for the Medplum FHIR connector.

Covers project_id enforcement (DECISION-028), CRUD operations,
token refresh on 401, is_configured property, and admin project creation.
"""

import os

import httpx
import pytest
import respx

from connectors.medplum_connector import MedplumClient, MedplumProjectScopeError

FAKE_BASE = "https://medplum.example.com"
TOKEN_URL = f"{FAKE_BASE}/oauth2/token"
TOKEN_RESPONSE = {"access_token": "tok-123", "expires_in": 3600}


@pytest.fixture()
def env(monkeypatch):
    monkeypatch.setenv("MEDPLUM_BASE_URL", FAKE_BASE)
    monkeypatch.setenv("MEDPLUM_CLIENT_ID", "cid")
    monkeypatch.setenv("MEDPLUM_CLIENT_SECRET", "csec")


@pytest.fixture()
def client(env):
    return MedplumClient()


# ── project_id enforcement (DECISION-028) ──────────────────────────────


@pytest.mark.asyncio
async def test_get_resource_requires_project_id(client):
    with pytest.raises(MedplumProjectScopeError):
        await client.get_resource("Patient", "p-1", project_id=None)


@pytest.mark.asyncio
async def test_get_resource_requires_project_id_empty_string(client):
    with pytest.raises(MedplumProjectScopeError):
        await client.get_resource("Patient", "p-1", project_id="")


@pytest.mark.asyncio
async def test_create_resource_requires_project_id(client):
    with pytest.raises(MedplumProjectScopeError):
        await client.create_resource("Patient", {"name": "test"}, project_id=None)


@pytest.mark.asyncio
async def test_update_resource_requires_project_id(client):
    with pytest.raises(MedplumProjectScopeError):
        await client.update_resource("Patient", "p-1", {"name": "x"}, project_id=None)


@pytest.mark.asyncio
async def test_search_resources_requires_project_id(client):
    with pytest.raises(MedplumProjectScopeError):
        await client.search_resources("Patient", project_id=None)


# ── successful CRUD operations ─────────────────────────────────────────


@pytest.mark.asyncio
@respx.mock
async def test_get_resource_success(client):
    respx.post(TOKEN_URL).mock(return_value=httpx.Response(200, json=TOKEN_RESPONSE))
    patient = {"resourceType": "Patient", "id": "p-1"}
    route = respx.get(f"{FAKE_BASE}/fhir/R4/Patient/p-1").mock(
        return_value=httpx.Response(200, json=patient)
    )

    result = await client.get_resource("Patient", "p-1", project_id="proj-abc")

    assert result == patient
    assert route.calls.last.request.headers["X-Medplum-Project"] == "proj-abc"


@pytest.mark.asyncio
@respx.mock
async def test_create_resource_success(client):
    respx.post(TOKEN_URL).mock(return_value=httpx.Response(200, json=TOKEN_RESPONSE))
    created = {"resourceType": "Patient", "id": "p-new"}
    route = respx.post(f"{FAKE_BASE}/fhir/R4/Patient").mock(
        return_value=httpx.Response(201, json=created)
    )

    result = await client.create_resource(
        "Patient", {"resourceType": "Patient"}, project_id="proj-abc"
    )

    assert result == created
    assert route.calls.last.request.headers["X-Medplum-Project"] == "proj-abc"


@pytest.mark.asyncio
@respx.mock
async def test_update_resource_success(client):
    respx.post(TOKEN_URL).mock(return_value=httpx.Response(200, json=TOKEN_RESPONSE))
    updated = {"resourceType": "Patient", "id": "p-1", "active": True}
    route = respx.put(f"{FAKE_BASE}/fhir/R4/Patient/p-1").mock(
        return_value=httpx.Response(200, json=updated)
    )

    result = await client.update_resource(
        "Patient", "p-1", {"active": True}, project_id="proj-abc"
    )

    assert result == updated
    assert route.calls.last.request.headers["X-Medplum-Project"] == "proj-abc"


@pytest.mark.asyncio
@respx.mock
async def test_search_resources_success(client):
    respx.post(TOKEN_URL).mock(return_value=httpx.Response(200, json=TOKEN_RESPONSE))
    bundle = {"resourceType": "Bundle", "entry": []}
    route = respx.get(f"{FAKE_BASE}/fhir/R4/Patient").mock(
        return_value=httpx.Response(200, json=bundle)
    )

    result = await client.search_resources(
        "Patient", project_id="proj-abc", params={"name": "Jane"}
    )

    assert result == bundle
    assert route.calls.last.request.headers["X-Medplum-Project"] == "proj-abc"
    assert "name=Jane" in str(route.calls.last.request.url)


# ── token refresh on 401 ──────────────────────────────────────────────


@pytest.mark.asyncio
@respx.mock
async def test_token_refresh_on_401(client):
    token_route = respx.post(TOKEN_URL).mock(
        return_value=httpx.Response(200, json=TOKEN_RESPONSE)
    )
    patient = {"resourceType": "Patient", "id": "p-1"}
    respx.get(f"{FAKE_BASE}/fhir/R4/Patient/p-1").mock(
        side_effect=[
            httpx.Response(401, json={"error": "expired"}),
            httpx.Response(200, json=patient),
        ]
    )

    result = await client.get_resource("Patient", "p-1", project_id="proj-abc")

    assert result == patient
    assert token_route.call_count == 2  # initial + refresh


# ── is_configured property ─────────────────────────────────────────────


def test_is_configured_true(env):
    client = MedplumClient()
    assert client.is_configured is True


def test_is_configured_false(monkeypatch):
    monkeypatch.delenv("MEDPLUM_BASE_URL", raising=False)
    monkeypatch.delenv("MEDPLUM_CLIENT_ID", raising=False)
    monkeypatch.delenv("MEDPLUM_CLIENT_SECRET", raising=False)
    client = MedplumClient()
    assert client.is_configured is False


# ── admin project creation ─────────────────────────────────────────────


@pytest.mark.asyncio
@respx.mock
async def test_create_project(client):
    respx.post(TOKEN_URL).mock(return_value=httpx.Response(200, json=TOKEN_RESPONSE))
    project = {"id": "proj-new", "name": "Willow Center"}
    respx.post(f"{FAKE_BASE}/admin/projects").mock(
        return_value=httpx.Response(201, json=project)
    )

    result = await client.create_project("Willow Center")

    assert result == project


# ── admin client application creation ─────────────────────────────────


@pytest.mark.asyncio
@respx.mock
async def test_create_client_application_success(client):
    respx.post(TOKEN_URL).mock(return_value=httpx.Response(200, json=TOKEN_RESPONSE))
    app_response = {"id": "app-uuid-123", "secret": "secret-value-xyz", "clientId": "app-uuid-123"}
    route = respx.post(f"{FAKE_BASE}/admin/projects/proj-abc/client").mock(
        return_value=httpx.Response(201, json=app_response)
    )

    result = await client.create_client_application("proj-abc", "test-app")

    assert result == app_response
    assert result["id"] == "app-uuid-123"
    assert result["secret"] == "secret-value-xyz"
    # Admin endpoint should NOT have X-Medplum-Project header
    assert "X-Medplum-Project" not in route.calls.last.request.headers


@pytest.mark.asyncio
@respx.mock
async def test_create_client_application_failure(client):
    respx.post(TOKEN_URL).mock(return_value=httpx.Response(200, json=TOKEN_RESPONSE))
    respx.post(f"{FAKE_BASE}/admin/projects/proj-abc/client").mock(
        return_value=httpx.Response(500, json={"error": "Internal Server Error"})
    )

    with pytest.raises(httpx.HTTPStatusError):
        await client.create_client_application("proj-abc", "test-app")
