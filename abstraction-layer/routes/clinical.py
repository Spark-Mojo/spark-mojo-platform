"""
Clinical capability routes — Patient and Appointment FHIR R4 resources.

All data flows through Medplum via the MedplumClient connector.
Tenant isolation enforced via project_id on every request (DECISION-028).
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from connectors.medplum_connector import MedplumClient, MedplumProjectScopeError

logger = logging.getLogger("abstraction-layer.clinical")

router = APIRouter(tags=["clinical"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")

_medplum = MedplumClient()


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class CreatePatientRequest(BaseModel):
    tenant_site: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    member_id: Optional[str] = None
    mrn: Optional[str] = None


class UpdatePatientRequest(BaseModel):
    tenant_site: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    member_id: Optional[str] = None
    mrn: Optional[str] = None


class PatientResponse(BaseModel):
    medplum_patient_id: str
    tenant_site: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    email: Optional[str] = None
    phone: Optional[str] = None
    member_id: Optional[str] = None
    mrn: Optional[str] = None
    created_at: str


class CreateAppointmentRequest(BaseModel):
    tenant_site: str
    medplum_patient_id: str
    appointment_date: str
    start_time: str
    end_time: str
    service_type: str
    clinician_name: Optional[str] = None
    clinician_npi: Optional[str] = None
    status: str = "booked"
    notes: Optional[str] = None


class UpdateAppointmentRequest(BaseModel):
    tenant_site: str
    status: Optional[str] = None
    notes: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class AppointmentResponse(BaseModel):
    medplum_appointment_id: str
    medplum_patient_id: str
    tenant_site: str
    appointment_date: str
    start_time: str
    end_time: str
    service_type: str
    clinician_name: Optional[str] = None
    clinician_npi: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _resolve_project_id(tenant_site: str) -> str:
    """Resolve a tenant_site to a Medplum project_id via Frappe."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(
            "/api/resource/SM Site Registry",
            params={
                "filters": f'[["site_name","=","{tenant_site}"]]',
                "fields": '["name","medplum_project_id"]',
                "limit_page_length": 1,
            },
            timeout=15,
        )
        resp.raise_for_status()
        sites = resp.json().get("data", [])

    if not sites:
        raise HTTPException(status_code=422, detail=f"Tenant not found: {tenant_site}")

    project_id = sites[0].get("medplum_project_id", "")
    if not project_id:
        raise HTTPException(
            status_code=422,
            detail=f"Tenant {tenant_site} has no Medplum project configured",
        )
    return project_id


def _build_fhir_patient(req) -> dict:
    """Build a FHIR R4 Patient resource from request data."""
    resource = {
        "resourceType": "Patient",
        "name": [{"family": req.last_name, "given": [req.first_name]}],
        "birthDate": req.date_of_birth,
        "gender": req.gender,
    }

    telecoms = []
    if req.email:
        telecoms.append({"system": "email", "value": req.email})
    if req.phone:
        telecoms.append({"system": "phone", "value": req.phone})
    if telecoms:
        resource["telecom"] = telecoms

    if req.address_line1:
        resource["address"] = [{
            "line": [req.address_line1],
            "city": req.address_city or "",
            "state": req.address_state or "",
            "postalCode": req.address_zip or "",
        }]

    identifiers = []
    if req.member_id:
        identifiers.append({"system": "member-id", "value": req.member_id})
    if req.mrn:
        identifiers.append({"system": "mrn", "value": req.mrn})
    if identifiers:
        resource["identifier"] = identifiers

    return resource


def _parse_patient_response(fhir: dict, tenant_site: str) -> PatientResponse:
    """Parse a FHIR Patient resource into PatientResponse."""
    names = fhir.get("name", [{}])
    name = names[0] if names else {}
    first_name = (name.get("given", [""])[0]) if name.get("given") else ""
    last_name = name.get("family", "")

    telecoms = fhir.get("telecom", [])
    email = next((t["value"] for t in telecoms if t.get("system") == "email"), None)
    phone = next((t["value"] for t in telecoms if t.get("system") == "phone"), None)

    identifiers = fhir.get("identifier", [])
    member_id = next((i["value"] for i in identifiers if i.get("system") == "member-id"), None)
    mrn = next((i["value"] for i in identifiers if i.get("system") == "mrn"), None)

    return PatientResponse(
        medplum_patient_id=fhir.get("id", ""),
        tenant_site=tenant_site,
        first_name=first_name,
        last_name=last_name,
        date_of_birth=fhir.get("birthDate", ""),
        gender=fhir.get("gender", ""),
        email=email,
        phone=phone,
        member_id=member_id,
        mrn=mrn,
        created_at=fhir.get("meta", {}).get("lastUpdated", datetime.now(timezone.utc).isoformat()),
    )


def _build_fhir_appointment(req: CreateAppointmentRequest) -> dict:
    """Build a FHIR R4 Appointment resource from request data."""
    resource = {
        "resourceType": "Appointment",
        "status": req.status,
        "start": f"{req.appointment_date}T{req.start_time}:00",
        "end": f"{req.appointment_date}T{req.end_time}:00",
        "serviceType": [{"text": req.service_type}],
        "participant": [
            {
                "actor": {"reference": f"Patient/{req.medplum_patient_id}"},
                "status": "accepted",
            }
        ],
    }

    if req.clinician_name or req.clinician_npi:
        practitioner = {"status": "accepted", "actor": {}}
        if req.clinician_name:
            practitioner["actor"]["display"] = req.clinician_name
        if req.clinician_npi:
            practitioner["actor"]["identifier"] = {"system": "npi", "value": req.clinician_npi}
        resource["participant"].append(practitioner)

    if req.notes:
        resource["comment"] = req.notes

    return resource


def _parse_appointment_response(fhir: dict, tenant_site: str) -> AppointmentResponse:
    """Parse a FHIR Appointment resource into AppointmentResponse."""
    start = fhir.get("start", "")
    end = fhir.get("end", "")
    appointment_date = start[:10] if start else ""
    start_time = start[11:16] if len(start) > 16 else ""
    end_time = end[11:16] if len(end) > 16 else ""

    service_types = fhir.get("serviceType", [])
    service_type = service_types[0].get("text", "") if service_types else ""

    participants = fhir.get("participant", [])
    patient_id = ""
    clinician_name = None
    clinician_npi = None
    for p in participants:
        ref = p.get("actor", {}).get("reference", "")
        if ref.startswith("Patient/"):
            patient_id = ref.replace("Patient/", "")
        else:
            clinician_name = p.get("actor", {}).get("display")
            npi_id = p.get("actor", {}).get("identifier", {})
            if npi_id.get("system") == "npi":
                clinician_npi = npi_id.get("value")

    return AppointmentResponse(
        medplum_appointment_id=fhir.get("id", ""),
        medplum_patient_id=patient_id,
        tenant_site=tenant_site,
        appointment_date=appointment_date,
        start_time=start_time,
        end_time=end_time,
        service_type=service_type,
        clinician_name=clinician_name,
        clinician_npi=clinician_npi,
        status=fhir.get("status", ""),
        notes=fhir.get("comment"),
        created_at=fhir.get("meta", {}).get("lastUpdated", datetime.now(timezone.utc).isoformat()),
    )


# ---------------------------------------------------------------------------
# Patient endpoints
# ---------------------------------------------------------------------------

@router.post("/patients", response_model=PatientResponse)
async def create_patient(req: CreatePatientRequest):
    """Create a FHIR Patient resource in the tenant's Medplum project."""
    project_id = await _resolve_project_id(req.tenant_site)
    fhir_patient = _build_fhir_patient(req)

    try:
        result = await _medplum.create_resource("Patient", fhir_patient, project_id)
    except MedplumProjectScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    return _parse_patient_response(result, req.tenant_site)


@router.get("/patients/{medplum_patient_id}", response_model=PatientResponse)
async def get_patient(medplum_patient_id: str, tenant_site: str = Query(...)):
    """Get a FHIR Patient resource by Medplum ID."""
    project_id = await _resolve_project_id(tenant_site)

    try:
        result = await _medplum.get_resource("Patient", medplum_patient_id, project_id)
    except MedplumProjectScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    return _parse_patient_response(result, tenant_site)


@router.get("/patients", response_model=list[PatientResponse])
async def search_patients(
    tenant_site: str = Query(...),
    name: Optional[str] = None,
    dob: Optional[str] = None,
    member_id: Optional[str] = None,
    mrn: Optional[str] = None,
):
    """Search patients within a tenant's Medplum project."""
    project_id = await _resolve_project_id(tenant_site)

    params = {}
    if name:
        params["name"] = name
    if dob:
        params["birthdate"] = dob
    if member_id:
        params["identifier"] = f"member-id|{member_id}"
    if mrn:
        params["identifier"] = f"mrn|{mrn}"

    try:
        bundle = await _medplum.search_resources("Patient", project_id, params=params)
    except MedplumProjectScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    entries = bundle.get("entry", [])
    return [_parse_patient_response(e.get("resource", {}), tenant_site) for e in entries]


@router.put("/patients/{medplum_patient_id}", response_model=PatientResponse)
async def update_patient(medplum_patient_id: str, req: UpdatePatientRequest):
    """Update an existing FHIR Patient resource."""
    project_id = await _resolve_project_id(req.tenant_site)

    try:
        existing = await _medplum.get_resource("Patient", medplum_patient_id, project_id)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    # Merge updates into existing resource
    if req.first_name or req.last_name:
        names = existing.get("name", [{}])
        name = names[0] if names else {}
        if req.first_name:
            name["given"] = [req.first_name]
        if req.last_name:
            name["family"] = req.last_name
        existing["name"] = [name]
    if req.date_of_birth:
        existing["birthDate"] = req.date_of_birth
    if req.gender:
        existing["gender"] = req.gender

    telecoms = existing.get("telecom", [])
    if req.email is not None:
        telecoms = [t for t in telecoms if t.get("system") != "email"]
        if req.email:
            telecoms.append({"system": "email", "value": req.email})
        existing["telecom"] = telecoms
    if req.phone is not None:
        telecoms = [t for t in telecoms if t.get("system") != "phone"]
        if req.phone:
            telecoms.append({"system": "phone", "value": req.phone})
        existing["telecom"] = telecoms

    identifiers = existing.get("identifier", [])
    if req.member_id is not None:
        identifiers = [i for i in identifiers if i.get("system") != "member-id"]
        if req.member_id:
            identifiers.append({"system": "member-id", "value": req.member_id})
        existing["identifier"] = identifiers
    if req.mrn is not None:
        identifiers = [i for i in identifiers if i.get("system") != "mrn"]
        if req.mrn:
            identifiers.append({"system": "mrn", "value": req.mrn})
        existing["identifier"] = identifiers

    try:
        result = await _medplum.update_resource("Patient", medplum_patient_id, existing, project_id)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    return _parse_patient_response(result, req.tenant_site)


# ---------------------------------------------------------------------------
# Appointment endpoints
# ---------------------------------------------------------------------------

@router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(req: CreateAppointmentRequest):
    """Create a FHIR Appointment resource in the tenant's Medplum project."""
    project_id = await _resolve_project_id(req.tenant_site)
    fhir_appt = _build_fhir_appointment(req)

    try:
        result = await _medplum.create_resource("Appointment", fhir_appt, project_id)
    except MedplumProjectScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    return _parse_appointment_response(result, req.tenant_site)


@router.get("/appointments/{medplum_appointment_id}", response_model=AppointmentResponse)
async def get_appointment(medplum_appointment_id: str, tenant_site: str = Query(...)):
    """Get a FHIR Appointment resource by Medplum ID."""
    project_id = await _resolve_project_id(tenant_site)

    try:
        result = await _medplum.get_resource("Appointment", medplum_appointment_id, project_id)
    except MedplumProjectScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    return _parse_appointment_response(result, tenant_site)


@router.get("/appointments", response_model=list[AppointmentResponse])
async def list_appointments(
    tenant_site: str = Query(...),
    patient_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    clinician_npi: Optional[str] = None,
):
    """List appointments within a tenant's Medplum project."""
    project_id = await _resolve_project_id(tenant_site)

    params = {}
    if patient_id:
        params["patient"] = f"Patient/{patient_id}"
    if date_from:
        params["date"] = f"ge{date_from}"
    if date_to:
        params["date"] = f"le{date_to}"
    if status:
        params["status"] = status
    if clinician_npi:
        params["practitioner.identifier"] = f"npi|{clinician_npi}"

    try:
        bundle = await _medplum.search_resources("Appointment", project_id, params=params)
    except MedplumProjectScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    entries = bundle.get("entry", [])
    return [_parse_appointment_response(e.get("resource", {}), tenant_site) for e in entries]


@router.put("/appointments/{medplum_appointment_id}", response_model=AppointmentResponse)
async def update_appointment(medplum_appointment_id: str, req: UpdateAppointmentRequest):
    """Update an existing FHIR Appointment resource."""
    project_id = await _resolve_project_id(req.tenant_site)

    try:
        existing = await _medplum.get_resource("Appointment", medplum_appointment_id, project_id)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    if req.status:
        existing["status"] = req.status
    if req.notes is not None:
        existing["comment"] = req.notes
    if req.start_time:
        date = existing.get("start", "")[:10]
        existing["start"] = f"{date}T{req.start_time}:00"
    if req.end_time:
        date = existing.get("end", "")[:10]
        existing["end"] = f"{date}T{req.end_time}:00"

    try:
        result = await _medplum.update_resource("Appointment", medplum_appointment_id, existing, project_id)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc))

    return _parse_appointment_response(result, req.tenant_site)
