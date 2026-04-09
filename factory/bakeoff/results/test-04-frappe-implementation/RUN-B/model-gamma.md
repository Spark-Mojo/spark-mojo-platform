model: model-gamma
test: 04-frappe-implementation
run: B
date: 2026-04-09

```python
"""
Billing capability routes — Stedi claim submission, 277CA webhook, eligibility,
and claim state transition.

Handles SM Claim submission to Stedi clearinghouse (DECISION-027, DECISION-011).
Eligibility checks via 270/271 (BILL-005).
Claim state transitions via SM state machine controller (BILL-TRANSITION-001).
All data flows through Frappe REST API via token auth.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from connectors.stedi import check_eligibility, StediTimeoutError, StediAPIError
from sm_billing.state_machine.controller import transition_state, VALID_TRANSITIONS

logger = logging.getLogger("abstraction-layer.billing")

router = APIRouter(tags=["billing"])
webhook_router = APIRouter(tags=["billing-webhooks"])

FRAPPE_URL = os.getenv("FRAPPE_URL", "http://localhost:8080")
FRAPPE_API_KEY = os.getenv("FRAPPE_API_KEY", "")
FRAPPE_API_SECRET = os.getenv("FRAPPE_API_SECRET", "")
STEDI_API_KEY = os.getenv("STEDI_API_KEY", "")
STEDI_SANDBOX = os.getenv("STEDI_SANDBOX", "false").lower() == "true"
STEDI_BASE_URL = "https://healthcare.us.stedi.com/2024-04-01"


def _frappe_headers():
    return {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }


def _stedi_headers():
    return {
        "Authorization": f"Key {STEDI_API_KEY}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ClaimSubmitRequest(BaseModel):
    claim_name: str
    validation_mode: str = "snip"


class ClaimSubmitResponse(BaseModel):
    success: bool
    claim_name: str
    stedi_claim_id: Optional[str] = None
    edit_status: str
    warnings: list[str] = []
    errors: list[str] = []
    submitted_at: Optional[str] = None


class ClaimStatusResponse(BaseModel):
    claim_name: str
    canonical_state: str
    stedi_claim_id: Optional[str] = None
    submission_date: Optional[str] = None
    paid_amount: Optional[float] = None
    patient_responsibility: Optional[float] = None
    denial: Optional[dict] = None
    timeline: list[dict] = []


class ERALineDetail(BaseModel):
    claim: Optional[str] = None
    patient_control_number: str
    cpt_code: Optional[str] = None
    charged_amount: float = 0
    paid_amount: float = 0
    adjustment_amount: float = 0
    patient_responsibility: float = 0
    carc_codes: Optional[str] = None
    rarc_codes: Optional[str] = None
    is_denied: int = 0
    match_status: str = "unmatched"


class ERADetailResponse(BaseModel):
    name: str
    stedi_transaction_id: str
    payer: Optional[str] = None
    era_date: Optional[str] = None
    check_eft_number: Optional[str] = None
    total_paid_amount: float = 0
    total_claims: int = 0
    matched_claims: int = 0
    unmatched_claims: int = 0
    processing_status: str = ""
    received_at: Optional[str] = None
    processed_at: Optional[str] = None
    era_lines: list[ERALineDetail] = []


class DenialListItem(BaseModel):
    name: str
    claim: Optional[str] = None
    denial_date: Optional[str] = None
    carc_codes: Optional[str] = None
    denied_amount: float = 0
    canonical_state: str = ""


class DenialListResponse(BaseModel):
    data: list[DenialListItem] = []
    total: int = 0


class DenialDetailResponse(BaseModel):
    name: str
    claim: Optional[str] = None
    era: Optional[str] = None
    denial_date: Optional[str] = None
    carc_codes: Optional[str] = None
    rarc_codes: Optional[str] = None
    denied_amount: float = 0
    canonical_state: str = ""
    appeal_deadline: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MOCK_STEDI_RESPONSE = {
    "transactionId": "TEST-TXN-001",
    "status": "accepted",
    "editStatus": "accepted",
    "errors": [],
    "warnings": [],
}

PLACE_OF_SERVICE_MAP = {
    "11": "11",
    "02": "02",
    "10": "10",
}


def _parse_comma_list(val: str) -> list[str]:
    """Split a comma-separated string into a trimmed list."""
    if not val:
        return []
    return [v.strip() for v in val.split(",") if v.strip()]


def _build_837p_payload(claim: dict, claim_lines: list, payer: dict, provider: dict, billing_provider: Optional[dict] = None) -> dict:
    """Construct Stedi 837P JSON from SM Claim + related records."""
    bp = billing_provider or provider
    service_lines = []
    for line in claim_lines:
        sl = {
            "lineNumber": line.get("line_number", 1),
            "procedureCode": line.get("cpt_code", ""),
            "chargeAmount": str(line.get("charge_amount", 0)),
            "units": str(line.get("units", 1)),
            "diagnosisCodes": _parse_comma_list(line.get("icd_codes", "")),
        }
        modifiers = _parse_comma_list(line.get("modifiers", ""))
        if modifiers:
            sl["modifiers"] = modifiers
        service_lines.append(sl)

    payload = {
        "tradingPartnerServiceId": payer.get("stedi_trading_partner_id", ""),
        "submitter": {
            "organizationName": bp.get("provider_name", ""),
            "taxId": bp.get("tax_id", ""),
        },
        "subscriber": {
            "memberId": claim.get("patient_member_id", ""),
            "firstName": claim.get("patient_name", "").split(" ")[0] if claim.get("patient_name") else "",
            "lastName": claim.get("patient_name", "").split(" ")[-1] if claim.get("patient_name") else "",
            "dateOfBirth": claim.get("patient_dob", ""),
        },
        "billing": {
            "npi": bp.get("npi", ""),
            "taxId": bp.get("tax_id", ""),
            "taxonomyCode": bp.get("taxonomy_code", ""),
            "organizationName": bp.get("provider_name", ""),
        },
        "claimInformation": {
            "patientControlNumber": claim.get("patient_control_number", claim.get("name", "")),
            "claimChargeAmount": str(claim.get("claim_charge_amount", 0)),
            "placeOfServiceCode": PLACE_OF_SERVICE_MAP.get(
                str(claim.get("place_of_service", "11")), "11"
            ),
            "dateOfService": claim.get("date_of_service", ""),
            "serviceLines": service_lines,
        },
    }

    if claim.get("prior_auth_number"):
        payload["claimInformation"]["priorAuthorizationNumber"] = claim["prior_auth_number"]

    return payload


async def _read_frappe_doc(doctype: str, name: str) -> dict:
    """Read a single doc from Frappe. Returns dict or raises HTTPException."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"{doctype} '{name}' not found")
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _update_frappe_doc(doctype: str, name: str, data: dict) -> dict:
    """Update a doc in Frappe."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.put(f"/api/resource/{doctype}/{name}", json=data, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _create_frappe_doc(doctype: str, data: dict) -> dict:
    """Create a new doc in Frappe."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.post(f"/api/resource/{doctype}", json=data, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _list_frappe_docs(doctype: str, filters: str = "", fields: str = "", limit: int = 20, offset: int = 0) -> list:
    """List docs from Frappe with filters."""
    params = {"limit_page_length": limit, "limit_start": offset}
    if filters:
        params["filters"] = filters
    if fields:
        params["fields"] = fields
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.get(f"/api/resource/{doctype}", params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", [])


# ---------------------------------------------------------------------------
# Eligibility models
# ---------------------------------------------------------------------------

class EligibilityCheckRequest(BaseModel):
    payer_name: str
    provider_npi: str
    provider_name: str
    member_id: str
    member_first_name: str
    member_last_name: str
    member_dob: str
    service_type_code: str = "30"
    date_of_service: str = ""


class EligibilityCheckResponse(BaseModel):
    is_eligible: bool
    coverage_status: str
    payer_name: str
    member_id: str
    member_name: str
    group_number: Optional[str] = None
    plan_name: Optional[str] = None
    plan_begin_date: Optional[str] = None
    plan_end_date: Optional[str] = None
    deductible_individual: Optional[float] = None
    deductible_met: Optional[float] = None
    deductible_remaining: Optional[float] = None
    out_of_pocket_individual: Optional[float] = None
    out_of_pocket_met: Optional[float] = None
    out_of_pocket_remaining: Optional[float] = None
    copay: Optional[float] = None
    coinsurance_percent: Optional[float] = None
    mental_health_covered: Optional[bool] = None
    mental_health_notes: Optional[str] = None
    raw_response: dict
    checked_at: str


def _parse_271_response(raw: dict, payer_name: str, member_id: str,
                         member_first_name: str, member_last_name: str,
                         date_of_service: str) -> EligibilityCheckResponse:
    """Parse a Stedi 271 response into a structured EligibilityCheckResponse."""
    now_iso = datetime.now(timezone.utc).isoformat()

    # Default values
    coverage_status = "unknown"
    is_eligible = False
    group_number = None
    plan_name = None
    plan_begin_date = None
    plan_end_date = None
    deductible_individual = None
    deductible_met = None
    deductible_remaining = None
    oop_individual = None
    oop_met = None
    oop_remaining = None
    copay = None
    coinsurance_percent = None
    mh_covered = None
    mh_notes = None

    try:
        # Parse plan status from benefits
        benefits = raw.get("benefits", [])
        plan_info = raw.get("planInformation", {})
        subscriber_info = raw.get("subscriber", {})

        # Plan-level info
        group_number = subscriber_info.get("groupNumber") or plan_info.get("groupNumber")
        plan_name = plan_info.get("planName")

        for b in benefits:
            info_type = b.get("benefitInformationType", "")
            service_types = b.get("serviceTypeCodes", [])
            time_qualifier = b.get("timePeriodQualifier", "")
            amount = b.get("benefitAmount")
            percent = b.get("benefitPercent")
            coverage_level = b.get("coverageLevelCode", "")

            # Active plan determination
            if info_type == "1":  # Active Coverage
                coverage_status = "active"
                if b.get("planBeginDate"):
                    plan_begin_date = b["planBeginDate"]
                if b.get("planEndDate"):
                    plan_end_date = b["planEndDate"]
            elif info_type == "6":  # Inactive
                coverage_status = "inactive"

            # Individual deductible (coverage level IND)
            if info_type == "C" and coverage_level in ("IND", ""):
                if time_qualifier in ("23", "24", "29", ""):  # Calendar/plan year
                    if amount is not None:
                        deductible_individual = float(amount)
            if info_type == "C" and b.get("inPlanNetworkIndicator") == "Y":
                if amount is not None:
                    deductible_individual = float(amount)

            # Deductible met/remaining
            if info_type == "G" and coverage_level in ("IND", ""):
                if amount is not None:
                    deductible_met = float(amount)
            if info_type == "J" and coverage_level in ("IND", ""):
                if amount is not None:
                    deductible_remaining = float(amount)

            # Out of pocket
            if info_type == "G" and "out_of_pocket" in b.get("benefitDescription", "").lower():
                if amount is not None:
                    oop_met = float(amount)
            if info_type == "F":  # Out of pocket maximum
                if coverage_level in ("IND", ""):
                    if amount is not None:
                        oop_individual = float(amount)
            if info_type == "J" and "out_of_pocket" in b.get("benefitDescription", "").lower():
                if amount is not None:
                    oop_remaining = float(amount)

            # Copay
            if info_type == "B" and amount is not None:
                if "30" in service_types or not service_types:
                    copay = float(amount)

            # Coinsurance
            if info_type == "A" and percent is not None:
                if "30" in service_types or not service_types:
                    coinsurance_percent = float(percent)

            # Mental health specific
            if "30" in service_types:
                if info_type == "1":
                    mh_covered = True
                elif info_type == "6":
                    mh_covered = False
                if b.get("additionalInformation"):
                    mh_notes = (mh_notes or "") + b["additionalInformation"] + " "

        # Determine eligibility from coverage status and plan dates
        if coverage_status == "active":
            is_eligible = True
            # Check if date_of_service falls within plan dates
            if plan_end_date and date_of_service:
                try:
                    end = datetime.strptime(plan_end_date, "%Y-%m-%d")
                    dos = datetime.strptime(date_of_service, "%Y-%m-%d")
                    if dos > end:
                        is_eligible = False
                except ValueError:
                    pass

    except Exception:
        # Parse failure on any field — log but don't raise
        pass

    return EligibilityCheckResponse(
        is_eligible=is_eligible,
        coverage_status=coverage_status,
        payer_name=payer_name,
        member_id=member_id,
        member_name=f"{member_first_name} {member_last_name}",
        group_number=group_number,
        plan_name=plan_name,
        plan_begin_date=plan_begin_date,
        plan_end_date=plan_end_date,
        deductible_individual=deductible_individual,
        deductible_met=deductible_met,
        deductible_remaining=deductible_remaining,
        out_of_pocket_individual=oop_individual,
        out_of_pocket_met=oop_met,
        out_of_pocket_remaining=oop_remaining,
        copay=copay,