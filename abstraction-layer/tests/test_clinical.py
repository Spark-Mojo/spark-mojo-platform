"""
Tests for clinical routes — Patient and Appointment FHIR R4 (STORY-018).

Patches _resolve_project_id and MedplumClient methods directly.
"""

import os
import sys
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ---------------------------------------------------------------------------
# Mock FHIR resources
# ---------------------------------------------------------------------------

MOCK_FHIR_PATIENT = {
    "resourceType": "Patient",
    "id": "patient-abc-123",
    "name": [{"family": "Doe", "given": ["Jane"]}],
    "birthDate": "1990-01-15",
    "gender": "female",
    "telecom": [
        {"system": "email", "value": "jane@example.com"},
        {"system": "phone", "value": "555-0100"},
    ],
    "identifier": [
        {"system": "member-id", "value": "MEM-001"},
        {"system": "mrn", "value": "MRN-001"},
    ],
    "meta": {"lastUpdated": "2026-04-06T00:00:00Z"},
}

MOCK_FHIR_APPOINTMENT = {
    "resourceType": "Appointment",
    "id": "appt-xyz-789",
    "status": "booked",
    "start": "2026-04-10T09:00:00",
    "end": "2026-04-10T10:00:00",
    "serviceType": [{"text": "individual therapy"}],
    "participant": [
        {"actor": {"reference": "Patient/patient-abc-123"}, "status": "accepted"},
        {"actor": {"display": "Dr. Smith", "identifier": {"system": "npi", "value": "1234567890"}}, "status": "accepted"},
    ],
    "comment": "Initial intake session",
    "meta": {"lastUpdated": "2026-04-06T00:00:00Z"},
}

MOCK_PATIENT_BUNDLE = {
    "resourceType": "Bundle",
    "entry": [{"resource": MOCK_FHIR_PATIENT}],
}

MOCK_APPOINTMENT_BUNDLE = {
    "resourceType": "Bundle",
    "entry": [{"resource": MOCK_FHIR_APPOINTMENT}],
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    os.environ["FRAPPE_URL"] = "http://localhost:8080"
    os.environ["FRAPPE_API_KEY"] = "test"
    os.environ["FRAPPE_API_SECRET"] = "test"
    os.environ["MEDPLUM_BASE_URL"] = "http://localhost:8103"
    os.environ["MEDPLUM_CLIENT_ID"] = "test-client"
    os.environ["MEDPLUM_CLIENT_SECRET"] = "test-secret"
    os.environ.setdefault("DEV_MODE", "true")

    import importlib
    import routes.clinical
    importlib.reload(routes.clinical)

    from main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


PROJECT_ID = "project-tenant-a"


# ---------------------------------------------------------------------------
# Patient tests
# ---------------------------------------------------------------------------

class TestPatientEndpoints:

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_create_patient(self, mock_resolve, mock_medplum, client):
        """Create patient returns PatientResponse with medplum_patient_id."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.create_resource = AsyncMock(return_value=MOCK_FHIR_PATIENT)

        resp = client.post("/api/modules/clinical/patients", json={
            "tenant_site": "poc-dev.sparkmojo.com",
            "first_name": "Jane",
            "last_name": "Doe",
            "date_of_birth": "1990-01-15",
            "gender": "female",
            "email": "jane@example.com",
            "phone": "555-0100",
            "member_id": "MEM-001",
            "mrn": "MRN-001",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["medplum_patient_id"] == "patient-abc-123"
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Doe"
        assert data["email"] == "jane@example.com"
        assert data["member_id"] == "MEM-001"
        assert data["tenant_site"] == "poc-dev.sparkmojo.com"

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_get_patient(self, mock_resolve, mock_medplum, client):
        """Get patient by Medplum ID."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.get_resource = AsyncMock(return_value=MOCK_FHIR_PATIENT)

        resp = client.get(
            "/api/modules/clinical/patients/patient-abc-123",
            params={"tenant_site": "poc-dev.sparkmojo.com"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["medplum_patient_id"] == "patient-abc-123"
        assert data["last_name"] == "Doe"

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_search_patients(self, mock_resolve, mock_medplum, client):
        """Search patients returns list."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.search_resources = AsyncMock(return_value=MOCK_PATIENT_BUNDLE)

        resp = client.get(
            "/api/modules/clinical/patients",
            params={"tenant_site": "poc-dev.sparkmojo.com", "name": "Doe"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["last_name"] == "Doe"

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_update_patient(self, mock_resolve, mock_medplum, client):
        """Update patient demographics."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.get_resource = AsyncMock(return_value=MOCK_FHIR_PATIENT.copy())
        updated = {**MOCK_FHIR_PATIENT, "name": [{"family": "Smith", "given": ["Jane"]}]}
        mock_medplum.update_resource = AsyncMock(return_value=updated)

        resp = client.put("/api/modules/clinical/patients/patient-abc-123", json={
            "tenant_site": "poc-dev.sparkmojo.com",
            "last_name": "Smith",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["last_name"] == "Smith"

    def test_tenant_not_found(self, client):
        """Invalid tenant_site returns 422."""
        with patch("routes.clinical._resolve_project_id", new_callable=AsyncMock) as mock_resolve:
            from fastapi import HTTPException
            mock_resolve.side_effect = HTTPException(status_code=422, detail="Tenant not found: invalid")

            resp = client.get(
                "/api/modules/clinical/patients",
                params={"tenant_site": "invalid"},
            )
            assert resp.status_code == 422

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_medplum_api_error(self, mock_resolve, mock_medplum, client):
        """Medplum API error propagates status code."""
        import httpx
        from unittest.mock import MagicMock
        mock_resolve.return_value = PROJECT_ID
        error_resp = MagicMock()
        error_resp.status_code = 500
        error_resp.text = "Internal Server Error"
        mock_medplum.create_resource = AsyncMock(
            side_effect=httpx.HTTPStatusError("500", request=MagicMock(), response=error_resp)
        )

        resp = client.post("/api/modules/clinical/patients", json={
            "tenant_site": "poc-dev.sparkmojo.com",
            "first_name": "Jane",
            "last_name": "Doe",
            "date_of_birth": "1990-01-15",
            "gender": "female",
        })
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# Appointment tests
# ---------------------------------------------------------------------------

class TestAppointmentEndpoints:

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_create_appointment(self, mock_resolve, mock_medplum, client):
        """Create appointment returns AppointmentResponse."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.create_resource = AsyncMock(return_value=MOCK_FHIR_APPOINTMENT)

        resp = client.post("/api/modules/clinical/appointments", json={
            "tenant_site": "poc-dev.sparkmojo.com",
            "medplum_patient_id": "patient-abc-123",
            "appointment_date": "2026-04-10",
            "start_time": "09:00",
            "end_time": "10:00",
            "service_type": "individual therapy",
            "clinician_name": "Dr. Smith",
            "clinician_npi": "1234567890",
            "notes": "Initial intake session",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["medplum_appointment_id"] == "appt-xyz-789"
        assert data["medplum_patient_id"] == "patient-abc-123"
        assert data["status"] == "booked"
        assert data["service_type"] == "individual therapy"
        assert data["clinician_name"] == "Dr. Smith"

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_get_appointment(self, mock_resolve, mock_medplum, client):
        """Get appointment by Medplum ID."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.get_resource = AsyncMock(return_value=MOCK_FHIR_APPOINTMENT)

        resp = client.get(
            "/api/modules/clinical/appointments/appt-xyz-789",
            params={"tenant_site": "poc-dev.sparkmojo.com"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["medplum_appointment_id"] == "appt-xyz-789"
        assert data["appointment_date"] == "2026-04-10"

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_list_appointments_by_patient(self, mock_resolve, mock_medplum, client):
        """List appointments filtered by patient_id."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.search_resources = AsyncMock(return_value=MOCK_APPOINTMENT_BUNDLE)

        resp = client.get(
            "/api/modules/clinical/appointments",
            params={"tenant_site": "poc-dev.sparkmojo.com", "patient_id": "patient-abc-123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["medplum_patient_id"] == "patient-abc-123"

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_update_appointment(self, mock_resolve, mock_medplum, client):
        """Update appointment status and notes."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.get_resource = AsyncMock(return_value=MOCK_FHIR_APPOINTMENT.copy())
        updated = {**MOCK_FHIR_APPOINTMENT, "status": "cancelled", "comment": "Patient cancelled"}
        mock_medplum.update_resource = AsyncMock(return_value=updated)

        resp = client.put("/api/modules/clinical/appointments/appt-xyz-789", json={
            "tenant_site": "poc-dev.sparkmojo.com",
            "status": "cancelled",
            "notes": "Patient cancelled",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "cancelled"
        assert data["notes"] == "Patient cancelled"

    @patch("routes.clinical._medplum")
    @patch("routes.clinical._resolve_project_id", new_callable=AsyncMock)
    def test_cross_tenant_isolation(self, mock_resolve, mock_medplum, client):
        """Verify project_id is passed to every Medplum call."""
        mock_resolve.return_value = PROJECT_ID
        mock_medplum.get_resource = AsyncMock(return_value=MOCK_FHIR_PATIENT)

        client.get(
            "/api/modules/clinical/patients/patient-abc-123",
            params={"tenant_site": "poc-dev.sparkmojo.com"},
        )

        mock_medplum.get_resource.assert_called_once_with(
            "Patient", "patient-abc-123", PROJECT_ID
        )
