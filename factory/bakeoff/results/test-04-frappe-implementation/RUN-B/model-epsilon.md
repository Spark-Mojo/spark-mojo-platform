model: model-epsilon
test: 04-frappe-implementation
run: B
date: 2026-04-09
"""
Billing capability routes — Stedi claim submission, 277CA webhook, eligibility, claim state transition.

Handles SM Claim submission to Stedi clearinghouse (DECISION-027, DECISION-011).
Eligibility checks via 270/271 (BILL-005).
Claim state transitions via sm_billing state machine controller (BILL-TRANSITION-001).
All data flows through Frappe REST API via token auth.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Query
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


def _frappe_headers(site_name: Optional[str] = None):
    headers = {
        "Authorization": f"token {FRAPPE_API_KEY}:{FRAPPE_API_SECRET}",
        "Content-Type": "application/json",
    }
    if site_name:
        headers["X-Frappe-Site-Name"] = site_name
    return headers


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


class ClaimTransitionRequest(BaseModel):
    new_state: str


class ClaimTransitionResponse(BaseModel):
    claim_id: str
    previous_state: str
    current_state: str
    valid_next_states: list[str]


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


async def _read_frappe_doc(doctype: str, name: str, site_name: Optional[str] = None) -> dict:
    """Read a single doc from Frappe. Returns dict or raises HTTPException."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers(site_name)) as client:
        resp = await client.get(f"/api/resource/{doctype}/{name}", timeout=15)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"{doctype} '{name}' not found")
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _update_frappe_doc(doctype: str, name: str, data: dict, site_name: Optional[str] = None) -> dict:
    """Update a doc in Frappe."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers(site_name)) as client:
        resp = await client.put(f"/api/resource/{doctype}/{name}", json=data, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _create_frappe_doc(doctype: str, data: dict, site_name: Optional[str] = None) -> dict:
    """Create a new doc in Frappe."""
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers(site_name)) as client:
        resp = await client.post(f"/api/resource/{doctype}", json=data, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _list_frappe_docs(doctype: str, filters: str = "", fields: str = "", limit: int = 20, offset: int = 0, site_name: Optional[str] = None) -> list:
    """List docs from Frappe with filters."""
    params = {"limit_page_length": limit, "limit_start": offset}
    if filters:
        params["filters"] = filters
    if fields:
        params["fields"] = fields
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers(site_name)) as client:
        resp = await client.get(f"/api/resource/{doctype}", params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", [])


def _get_valid_next_states(current_state: str) -> list[str]:
    """
    Get valid next states from VALID_TRANSITIONS for the given current state.
    
    VALID_TRANSITIONS is expected to be a dict mapping current_state -> list of valid next states.
    """
    return VALID_TRANSITIONS.get(current_state, [])


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
        coinsurance_percent=coinsurance_percent,
        mental_health_covered=mh_covered,
        mental_health_notes=mh_notes.strip() if mh_notes else None,
        raw_response=raw,
        checked_at=now_iso,
    )


# ---------------------------------------------------------------------------
# Eligibility endpoints
# ---------------------------------------------------------------------------

async def _do_eligibility_check(
    payer_name: str, provider_npi: str, provider_name: str,
    member_id: str, member_first_name: str, member_last_name: str,
    member_dob: str, service_type_code: str, date_of_service: str,
) -> EligibilityCheckResponse:
    """Shared logic for POST and GET eligibility check."""
    if not date_of_service:
        date_of_service = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Look up SM Payer by payer_name
    payers = await _list_frappe_docs(
        "SM Payer",
        filters=json.dumps([["payer_name", "=", payer_name]]),
        fields='["name","payer_name","stedi_trading_partner_id"]',
        limit=1,
    )
    if not payers:
        raise HTTPException(status_code=404, detail=f"Payer not found: {payer_name}")

    payer = payers[0]
    trading_partner_id = payer.get("stedi_trading_partner_id", "")
    if not trading_partner_id:
        raise HTTPException(
            status_code=422,
            detail=f"Payer {payer_name} has no Stedi trading partner ID configured",
        )

    try:
        raw_response = await check_eligibility(
            trading_partner_id=trading_partner_id,
            provider_npi=provider_npi,
            provider_name=provider_name,
            member_id=member_id,
            member_first_name=member_first_name,
            member_last_name=member_last_name,
            member_dob=member_dob,
            service_type_code=service_type_code,
            date_of_service=date_of_service,
        )
    except StediTimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc))
    except StediAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)

    return _parse_271_response(
        raw=raw_response,
        payer_name=payer_name,
        member_id=member_id,
        member_first_name=member_first_name,
        member_last_name=member_last_name,
        date_of_service=date_of_service,
    )


@router.post("/eligibility/check", response_model=EligibilityCheckResponse)
async def eligibility_check_post(req: EligibilityCheckRequest):
    """Check patient insurance eligibility via Stedi 270/271."""
    return await _do_eligibility_check(
        payer_name=req.payer_name,
        provider_npi=req.provider_npi,
        provider_name=req.provider_name,
        member_id=req.member_id,
        member_first_name=req.member_first_name,
        member_last_name=req.member_last_name,
        member_dob=req.member_dob,
        service_type_code=req.service_type_code,
        date_of_service=req.date_of_service,
    )


@router.get("/eligibility/check", response_model=EligibilityCheckResponse)
async def eligibility_check_get(
    payer_name: str = Query(...),
    provider_npi: str = Query(...),
    provider_name: str = Query(...),
    member_id: str = Query(...),
    member_first_name: str = Query(...),
    member_last_name: str = Query(...),
    member_dob: str = Query(...),
    service_type_code: str = Query("30"),
    date_of_service: str = Query(""),
):
    """Check patient insurance eligibility via query params."""
    return await _do_eligibility_check(
        payer_name=payer_name,
        provider_npi=provider_npi,
        provider_name=provider_name,
        member_first_name=member_first_name,
        member_last_name=member_last_name,
        member_dob=member_dob,
        service_type_code=service_type_code,
        date_of_service=date_of_service,
    )


# ---------------------------------------------------------------------------
# Claim State Transition endpoint (BILL-TRANSITION-001)
# ---------------------------------------------------------------------------

@router.post("/claim/{claim_id}/transition", response_model=ClaimTransitionResponse)
async def transition_claim_state(
    claim_id: str,
    req: ClaimTransitionRequest,
    x_frappe_site_name: Optional[str] = Header(None, alias="X-Frappe-Site-Name"),
):
    """
    Transition an SM Claim to a new state via the state machine controller.
    
    - Validates site_name header is present (422 if missing)
    - Validates new_state is provided in request body (400 if missing)
    - Checks claim exists (404 if not found)
    - Attempts state transition via sm_billing.state_machine.controller (409 if invalid)
    - Returns previous_state, current_state, and valid_next_states on success (200)
    """
    # 1. Validate site_name header
    if not x_frappe_site_name:
        raise HTTPException(
            status_code=422,
            detail={"error": "site_name header missing"},
        )

    # 2. Validate new_state in request body
    if not req.new_state:
        raise HTTPException(
            status_code=400,
            detail={"error": "new_state is required"},
        )

    # 3. Get current claim state (also validates claim exists)
    try:
        claim = await _read_frappe_doc("SM Claim", claim_id, site_name=x_frappe_site_name)
    except HTTPException as exc:
        if exc.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail={"error": "claim not found", "claim_id": claim_id},
            )
        raise

    previous_state = claim.get("canonical_state", "")

    # 4. Attempt state transition via controller
    try:
        transition_state(claim_id, req.new_state)
    except ValueError as exc:
        # Invalid transition - return 409 with valid transitions
        valid_transitions = _get_valid_next_states(previous_state)
        raise HTTPException(
            status_code=409,
            detail={
                "error": "invalid transition",
                "from_state": previous_state,
                "to_state": req.new_state,
                "valid_transitions": valid_transitions,
            },
        )

    # 5. Get updated claim to confirm new state
    updated_claim = await _read_frappe_doc("SM Claim", claim_id, site_name=x_frappe_site_name)
    current_state = updated_claim.get("canonical_state", "")

    # 6. Get valid next states for the new state
    valid_next_states = _get_valid_next_states(current_state)

    return ClaimTransitionResponse(
        claim_id=claim_id,
        previous_state=previous_state,
        current_state=current_state,
        valid_next_states=valid_next_states,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/claims/submit", response_model=ClaimSubmitResponse)
async def submit_claim(req: ClaimSubmitRequest):
    """Submit an SM Claim to Stedi for processing."""
    if not STEDI_API_KEY and not STEDI_SANDBOX:
        raise HTTPException(
            status_code=503,
            detail="STEDI_API_KEY not configured and STEDI_SANDBOX is not enabled",
        )

    # 1. Read SM Claim
    claim = await _read_frappe_doc("SM Claim", req.claim_name)
    claim_lines = claim.get("claim_lines", [])

    # 2. Validate state
    state = claim.get("canonical_state", "")
    if state not in ("draft", "validated", "Draft", "Validated", ""):
        return ClaimSubmitResponse(
            success=False,
            claim_name=req.claim_name,
            edit_status="error",
            errors=[f"Claim is in '{state}' state — only draft or validated claims can be submitted"],
        )

    # 3. Read SM Payer
    payer_name = claim.get("payer")
    if not payer_name:
        return ClaimSubmitResponse(
            success=False,
            claim_name=req.claim_name,
            edit_status="error",
            errors=["Claim has no payer linked"],
        )
    payer = await _read_frappe_doc("SM Payer", payer_name)

    # 4. Read SM Provider
    provider_name = claim.get("provider")
    if not provider_name:
        return ClaimSubmitResponse(
            success=False,
            claim_name=req.claim_name,
            edit_status="error",
            errors=["Claim has no provider linked"],
        )
    provider = await _read_frappe_doc("SM Provider", provider_name)

    # 5. Read billing provider if different
    billing_provider = None
    bp_name = claim.get("billing_provider")
    if bp_name and bp_name != provider_name:
        billing_provider = await _read_frappe_doc("SM Provider", bp_name)

    # 6. Build 837P payload
    payload = _build_837p_payload(claim, claim_lines, payer, provider, billing_provider)

    # 7. Submit to Stedi (or use mock)
    if STEDI_SANDBOX:
        stedi_response = MOCK_STEDI_RESPONSE.copy()
    else:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{STEDI_BASE_URL}/healthcare/claims",
                    json=payload,
                    headers={
                        **_stedi_headers(),
                        "Idempotency-Key": req.claim_name,
                    },
                    timeout=30,
                )
                resp.raise_for_status()
                stedi_response = resp.json()
        except httpx.HTTPStatusError as exc:
            try:
                error_body = exc.response.json()
            except Exception:
                error_body = {"message": exc.response.text}
            # Stedi rejection
            return ClaimSubmitResponse(
                success=False,
                claim_name=req.claim_name,
                edit_status="rejected",
                errors=error_body.get("errors", [str(error_body)]),
                warnings=error_body.get("warnings", []),
            )
        except Exception as exc:
            # Network error — do NOT update claim state
            return ClaimSubmitResponse(
                success=False,
                claim_name=req.claim_name,
                edit_status="error",
                errors=[f"Network error submitting to Stedi: {str(exc)}"],
            )

    # 8-9. Process Stedi response
    edit_status = stedi_response.get("editStatus", "")
    stedi_claim_id = stedi_response.get("transactionId")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    if edit_status == "accepted":
        await _update_frappe_doc("SM Claim", req.claim_name, {
            "stedi_claim_id": stedi_claim_id,
            "canonical_state": "submitted",
            "submission_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        })
        return ClaimSubmitResponse(
            success=True,
            claim_name=req.claim_name,
            stedi_claim_id=stedi_claim_id,
            edit_status="accepted",
            warnings=stedi_response.get("warnings", []),
            submitted_at=now_iso,
        )
    else:
        # Rejected — reset to draft
        await _update_frappe_doc("SM Claim", req.claim_name, {
            "canonical_state": "draft",
        })
        return ClaimSubmitResponse(
            success=False,
            claim_name=req.claim_name,
            stedi_claim_id=stedi_claim_id,
            edit_status="rejected",
            errors=stedi_response.get("errors", []),
            warnings=stedi_response.get("warnings", []),
        )


@router.get("/claims/{claim_name}/status", response_model=ClaimStatusResponse)
async def claim_status(claim_name: str):
    """Get current status and timeline for a claim."""
    claim = await _read_frappe_doc("SM Claim", claim_name)

    timeline = []
    if claim.get("creation"):
        timeline.append({"event": "created", "date": claim["creation"], "detail": "Claim created"})
    if claim.get("submission_date"):
        timeline.append({"event": "submitted", "date": claim["submission_date"], "detail": "Submitted to payer"})
    if claim.get("acknowledgment_date"):
        timeline.append({"event": "acknowledged", "date": claim["acknowledgment_date"], "detail": "Payer acknowledged"})
    if claim.get("adjudication_date"):
        timeline.append({"event": "adjudicated", "date": claim["adjudication_date"], "detail": "Adjudication complete"})

    denial = None
    if claim.get("canonical_state") == "denied":
        denial = {"reason": claim.get("notes", "")}

    return ClaimStatusResponse(
        claim_name=claim_name,
        canonical_state=claim.get("canonical_state", ""),
        stedi_claim_id=claim.get("stedi_claim_id"),
        submission_date=claim.get("submission_date"),
        paid_amount=claim.get("paid_amount"),
        patient_responsibility=claim.get("patient_responsibility"),
        denial=denial,
        timeline=timeline,
    )


@router.get("/era/{era_name}", response_model=ERADetailResponse)
async def get_era(era_name: str):
    """Get full ERA detail with child lines."""
    era = await _read_frappe_doc("SM ERA", era_name)
    lines = era.get("era_lines", [])
    return ERADetailResponse(
        name=era.get("name", era_name),
        stedi_transaction_id=era.get("stedi_transaction_id", ""),
        payer=era.get("payer"),
        era_date=era.get("era_date"),
        check_eft_number=era.get("check_eft_number"),
        total_paid_amount=float(era.get("total_paid_amount") or 0),
        total_claims=int(era.get("total_claims") or 0),
        matched_claims=int(era.get("matched_claims") or 0),
        unmatched_claims=int(era.get("unmatched_claims") or 0),
        processing_status=era.get("processing_status", ""),
        received_at=era.get("received_at"),
        processed_at=era.get("processed_at"),
        era_lines=[ERALineDetail(**{k: l.get(k, d) for k, d in [
            ("claim", None), ("patient_control_number", ""),
            ("cpt_code", None), ("charged_amount", 0),
            ("paid_amount", 0), ("adjustment_amount", 0),
            ("patient_responsibility", 0), ("carc_codes", None),
            ("rarc_codes", None), ("is_denied", 0), ("match_status", "unmatched"),
        ]}) for l in lines],
    )


@router.get("/denials", response_model=DenialListResponse)
async def list_denials(
    status: Optional[str] = None,
    payer: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
):
    """List SM Denial records with optional filters."""
    filters = []
    if status:
        filters.append(["canonical_state", "=", status])
    if payer:
        filters.append(["claim.payer", "=", payer])
    if date_from:
        filters.append(["denial_date", ">=", date_from])
    if date_to:
        filters.append(["denial_date", "<=", date_to])

    import json as _json
    filter_str = _json.dumps(filters) if filters else ""
    fields = '["name","claim","denial_date","carc_codes","denied_amount","canonical_state"]'

    denials = await _list_frappe_docs("SM Denial", filters=filter_str, fields=fields, limit=limit, offset=offset)
    return DenialListResponse(
        data=[DenialListItem(**d) for d in denials],
        total=len(denials),
    )


@router.get("/denials/{denial_name}", response_model=DenialDetailResponse)
async def get_denial(denial_name: str):
    """Get full denial detail."""
    denial = await _read_frappe_doc("SM Denial", denial_name)
    return DenialDetailResponse(
        name=denial.get("name", denial_name),
        claim=denial.get("claim"),
        era=denial.get("era"),
        denial_date=denial.get("denial_date"),
        carc_codes=denial.get("carc_codes"),
        rarc_codes=denial.get("rarc_codes"),
        denied_amount=float(denial.get("denied_amount") or 0),
        canonical_state=denial.get("canonical_state", ""),
        appeal_deadline=denial.get("appeal_deadline"),
        assigned_to=denial.get("assigned_to"),
        notes=denial.get("notes"),
    )


@webhook_router.post("/277")
async def stedi_277_webhook(request_body: dict):
    """
    Receive 277CA claim acknowledgment from Stedi.
    Updates SM Claim state based on acknowledgment category.
    """
    transaction_id = request_body.get("transactionId", "")
    transaction_set = request_body.get("x12", {}).get("transactionSetIdentifier", "")

    if transaction_set and transaction_set != "277":
        logger.warning("Received non-277 webhook: %s", transaction_set)
        return {"status": "ignored", "reason": "not a 277 transaction"}

    # Extract acknowledgment data
    # In production, would GET /healthcare/claim-acknowledgment/{transactionId}
    # For now, parse from webhook payload
    category_code = request_body.get("categoryCode", "")
    patient_control_number = request_body.get("patientControlNumber", "")

    if not patient_control_number:
        logger.warning("277 webhook missing patientControlNumber, txn=%s", transaction_id)
        return {"status": "ok", "matched": False}

    # Find SM Claim by patient_control_number
    try:
        async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
            resp = await client.get(
                "/api/resource/SM Claim",
                params={
                    "filters": f'[["patient_control_number","=","{patient_control_number}"]]',
                    "fields": '["name","canonical_state"]',
                    "limit_page_length": 1,
                },
                timeout=15,
            )
            resp.raise_for_status()
            claims = resp.json().get("data", [])
    except Exception as exc:
        logger.error("Failed to look up claim for 277 webhook: %s", exc)
        return {"status": "ok", "matched": False}

    if not claims:
        logger.warning("No SM Claim found for patient_control_number=%s", patient_control_number)
        return {"status": "ok", "matched": False}

    claim_name = claims[0]["name"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if category_code in ("A1", "A2"):
        update_data = {
            "canonical_state": "adjudicating",
            "acknowledgment_date": today,
        }
        if category_code == "A2":
            update_data["notes"] = request_body.get("statusReason", "Accepted with errors")
        await _update_frappe_doc("SM Claim", claim_name, update_data)
    elif category_code == "R3":
        await _update_frappe_doc("SM Claim", claim_name, {
            "canonical_state": "draft",
            "notes": f"Rejected: {request_body.get('statusReason', 'Unknown reason')}",
        })

    return {"status": "ok", "matched": True, "claim_name": claim_name, "category": category_code}


@webhook_router.post("/835")
async def stedi_835_webhook(request_body: dict):
    """
    Receive 835 ERA from Stedi. Creates SM ERA, matches to claims,
    auto-posts payments, detects denials, creates SM Tasks for unmatched lines.
    """
    # TODO: Move to background job for large ERAs (BILL-010)
    transaction_id = request_body.get("transactionId", "")
    transaction_set = request_body.get("x12", {}).get("transactionSetIdentifier", "")

    if transaction_set and transaction_set != "835":
        logger.warning("Received non-835 webhook: %s", transaction_set)
        return {"status": "ignored", "reason": "not an 835 transaction"}

    # 1. Fetch full 835 from Stedi
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{STEDI_BASE_URL}/healthcare/era/{transaction_id}",
            headers=_stedi_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        era_data = resp.json()

    now_utc = datetime.now(timezone.utc)

    # 2. Resolve payer by stedi_trading_partner_id
    payer_id = era_data.get("payerIdentifier", "")
    payer_name = None
    payer_appeal_window = None
    if payer_id:
        try:
            payers = await _list_frappe_docs(
                "SM Payer",
                filters=f'[["stedi_trading_partner_id","=","{payer_id}"]]',
                fields='["name","appeal_window_days"]',
                limit=1,
            )
            if payers:
                payer_name = payers[0]["name"]
                payer_appeal_window = payers[0].get("appeal_window_days")
        except Exception as exc:
            logger.warning("Failed to resolve payer for %s: %s", payer_id, exc)

    # 3. Process claim payments
    claim_payments = era_data.get("claimPayments", [])
    era_lines = []
    total_paid = 0.0
    matched_count = 0
    unmatched_count = 0

    for cp in claim_payments:
        pcn = cp.get("patientControlNumber", "")
        charged = float(cp.get("chargedAmount", 0))
        paid = float(cp.get("paidAmount", 0))
        patient_resp = float(cp.get("patientResponsibility", 0))

        # Extract adjustment info
        adjustments = cp.get("adjustments", [])
        total_adj = sum(float(a.get("amount", 0)) for a in adjustments)
        carc_list = [a.get("reasonCode", "") for a in adjustments if a.get("reasonCode")]
        carc_codes = ",".join(carc_list) if carc_list else ""
        group_codes = [a.get("groupCode", "") for a in adjustments]

        rarc_list = cp.get("remarkCodes", [])
        rarc_codes = ",".join(rarc_list) if rarc_list else ""

        # Extract CPT from first service line
        service_lines = cp.get("serviceLines", [])
        cpt_code = service_lines[0].get("procedureCode", "") if service_lines else ""

        # Denial detection: paid_amount == 0 AND non-PR group code
        non_pr_groups = {"CO", "OA", "PI"}
        is_denied = 1 if paid == 0 and any(g in non_pr_groups for g in group_codes) else 0

        # Match to SM Claim by patient_control_number
        claim_name = None
        match_status = "unmatched"
        try:
            claims = await _list_frappe_docs(
                "SM Claim",
                filters=f'[["patient_control_number","=","{pcn}"]]',
                fields='["name","canonical_state","claim_charge_amount","paid_amount","adjustment_amount","patient_responsibility","payer"]',
                limit=1,
            )
            if claims:
                claim_name = claims[0]["name"]
                match_status = "matched"
                matched_count += 1
            else:
                unmatched_count += 1
        except Exception as exc:
            logger.warning("Failed to match claim for PCN %s: %s", pcn, exc)
            unmatched_count += 1

        total_paid += paid

        era_lines.append({
            "claim": claim_name,
            "patient_control_number": pcn,
            "cpt_code": cpt_code,
            "charged_amount": charged,
            "paid_amount": paid,
            "adjustment_amount": total_adj,
            "patient_responsibility": patient_resp,
            "carc_codes": carc_codes,
            "rarc_codes": rarc_codes,
            "is_denied": is_denied,
            "match_status": match_status,
        })

    # 4. Create SM ERA with child era_lines
    era_doc = await _create_frappe_doc("SM ERA", {
        "doctype": "SM ERA",
        "stedi_transaction_id": transaction_id,
        "payer": payer_name,
        "era_date": era_data.get("paymentDate"),
        "check_eft_number": era_data.get("checkOrEftNumber", ""),
        "total_paid_amount": total_paid,
        "total_claims": len(claim_payments),
        "matched_claims": matched_count,
        "unmatched_claims": unmatched_count,
        "processing_status": "processing",
        "received_at": now_utc.strftime("%Y-%m-%d %H:%M:%S"),
        "raw_json": json.dumps(era_data),
        "era_lines": era_lines,
    })
    era_name = era_doc.get("name", "")
    era_date = era_data.get("paymentDate")

    # 5. Auto-post payments and create denials/tasks
    for line in era_lines:
        if line["match_status"] == "matched" and not line["is_denied"]:
            # Payment auto-posting
            try:
                claim = await _read_frappe_doc("SM Claim", line["claim"])
                existing_paid = float(claim.get("paid_amount") or 0)
                existing_adj = float(claim.get("adjustment_amount") or 0)
                existing_pr = float(claim.get("patient_responsibility") or 0)
                new_paid = existing_paid + line["paid_amount"]
                new_adj = existing_adj + line["adjustment_amount"]
                new_pr = existing_pr + line["patient_responsibility"]
                charge = float(claim.get("claim_charge_amount") or 0)

                net_expected = charge - new_adj
                if net_expected > 0 and new_paid >= net_expected:
                    new_state = "paid"
                elif new_paid > 0:
                    new_state = "partial_paid"
                else:
                    new_state = claim.get("canonical_state", "adjudicating")

                await _update_frappe_doc("SM Claim", line["claim"], {
                    "paid_amount": new_paid,
                    "adjustment_amount": new_adj,
                    "patient_responsibility": new_pr,
                    "adjudication_date": era_date,
                    "canonical_state": new_state,
                })
            except Exception as exc:
                logger.error("Failed to auto-post payment for %s: %s", line["claim"], exc)

        elif line["match_status"] == "matched" and line["is_denied"]:
            # Create SM Denial
            try:
                denial_data = {
                    "doctype": "SM Denial",
                    "claim": line["claim"],
                    "era": era_name,
                    "denial_date": era_date,
                    "carc_codes": line["carc_codes"],
                    "rarc_codes": line["rarc_codes"],
                    "denied_amount": line["charged_amount"] - line["paid_amount"],
                    "canonical_state": "new",
                }
                if payer_appeal_window and era_date:
                    deadline = datetime.strptime(era_date, "%Y-%m-%d") + timedelta(days=int(payer_appeal_window))
                    denial_data["appeal_deadline"] = deadline.strftime("%Y-%m-%d")
                await _create_frappe_doc("SM Denial", denial_data)

                # Also update claim state to denied
                await _update_frappe_doc("SM Claim", line["claim"], {
                    "canonical_state": "denied",
                    "adjudication_date": era_date,
                })
            except Exception as exc:
                logger.error("Failed to create SM Denial for %s: %s", line["claim"], exc)

        elif line["match_status"] == "unmatched":
            # Create SM Task for manual review
            try:
                await _create_frappe_doc("SM Task", {
                    "doctype": "SM Task",
                    "title": f"Unmatched ERA line: PCN {line['patient_control_number']}",
                    "description": (
                        f"ERA {era_name} contains a payment for PCN {line['patient_control_number']} "
                        f"that does not match any SM Claim. Manual review required."
                    ),
                    "canonical_state": "open",
                })
            except Exception as exc:
                logger.error("Failed to create SM Task for unmatched PCN %s: %s", line["patient_control_number"], exc)

    # 6. Update ERA processing status
    final_status = "posted" if unmatched_count == 0 else "partial_posted"
    try:
        await _update_frappe_doc("SM ERA", era_name, {
            "processing_status": final_status,
            "processed_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        })
    except Exception as exc:
        logger.error("Failed to update ERA status: %s", exc)

    return {
        "status": "ok",
        "era_name": era_name,
        "total_claims": len(claim_payments),
        "matched": matched_count,
        "unmatched": unmatched_count,
    }

"""
Tests for BILL-TRANSITION-001: Claim state transition endpoint.

Tests the POST /api/modules/billing/claim/{claim_id}/transition endpoint.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_valid_transitions():
    """Standard VALID_TRANSITIONS mapping for testing."""
    return {
        "draft": ["ready_to_submit", "voided"],
        "ready_to_submit": ["submitted", "draft"],
        "submitted": ["acknowledged", "rejected", "draft"],
        "acknowledged": ["adjudicating", "denied"],
        "adjudicating": ["paid", "partial_paid", "denied"],
        "paid": ["written_off"],
        "partial_paid": ["paid", "written_off", "denied"],
        "denied": ["appeal", "written_off"],
        "written_off": [],
        "voided": [],
    }


@pytest.fixture
def sample_claim():
    """Sample SM Claim document structure."""
    return {
        "name": "CLM-001",
        "canonical_state": "draft",
        "patient_name": "John Doe",
        "patient_member_id": "MEM123",
        "claim_charge_amount": 150.00,
        "payer": "Aetna",
        "provider": "Dr. Smith",
    }


@pytest.fixture
def updated_claim_after_transition():
    """Claim document after successful transition to ready_to_submit."""
    return {
        "name": "CLM-001",
        "canonical_state": "ready_to_submit",
        "patient_name": "John Doe",
        "patient_member_id": "MEM123",
        "claim_charge_amount": 150.00,
        "payer": "Aetna",
        "provider": "Dr. Smith",
    }


# ---------------------------------------------------------------------------
# Test: Valid transition returns 200 with state details
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_valid_transition_returns_200_with_state_details(
    mock_valid_transitions, sample_claim, updated_claim_after_transition
):
    """
    Test that transitioning draft -> ready_to_submit returns 200
    with previous_state, current_state, and valid_next_states.
    """
    from abstraction_layer.routes.billing import transition_claim_state, ClaimTransitionRequest

    # Mock the controller's VALID_TRANSITIONS
    with patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", mock_valid_transitions):
        with patch("abstraction_layer.routes.billing._read_frappe_doc") as mock_read:
            # First call returns draft state, second call returns ready_to_submit
            mock_read.side_effect = [sample_claim, updated_claim_after_transition]

            with patch("abstraction_layer.routes.billing.transition_state") as mock_transition:
                mock_transition.return_value = None  # Success

                # Call the endpoint
                response = await transition_claim_state(
                    claim_id="CLM-001",
                    req=ClaimTransitionRequest(new_state="ready_to_submit"),
                    x_frappe_site_name="test-site",
                )

                # Verify response structure
                assert response.claim_id == "CLM-001"
                assert response.previous_state == "draft"
                assert response.current_state == "ready_to_submit"
                assert "submitted" in response.valid_next_states
                assert "draft" in response.valid_next_states

                # Verify controller was called correctly
                mock_transition.assert_called_once_with("CLM-001", "ready_to_submit")


# ---------------------------------------------------------------------------
# Test: Invalid transition returns 409 with valid options
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_invalid_transition_returns_409_with_valid_options(
    mock_valid_transitions, sample_claim
):
    """
    Test that transitioning draft -> paid returns 409
    with from_state, to_state, and valid_transitions list.
    """
    from fastapi import HTTPException
    from abstraction_layer.routes.billing import transition_claim_state, ClaimTransitionRequest

    with patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", mock_valid_transitions):
        with patch("abstraction_layer.routes.billing._read_frappe_doc") as mock_read:
            mock_read.return_value = sample_claim  # draft state

            with patch("abstraction_layer.routes.billing.transition_state") as mock_transition:
                # Controller raises ValueError for invalid transition
                mock_transition.side_effect = ValueError("Invalid transition from draft to paid")

                with pytest.raises(HTTPException) as exc_info:
                    await transition_claim_state(
                        claim_id="CLM-001",
                        req=ClaimTransitionRequest(new_state="paid"),
                        x_frappe_site_name="test-site",
                    )

                # Verify 409 response
                assert exc_info.value.status_code == 409
                detail = exc_info.value.detail
                assert detail["error"] == "invalid transition"
                assert detail["from_state"] == "draft"
                assert detail["to_state"] == "paid"
                assert "ready_to_submit" in detail["valid_transitions"]
                assert "voided" in detail["valid_transitions"]
                assert "paid" not in detail["valid_transitions"]


# ---------------------------------------------------------------------------
# Test: Claim not found returns 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_claim_not_found_returns_404(mock_valid_transitions):
    """
    Test that requesting a transition for a non-existent claim returns 404.
    """
    from fastapi import HTTPException
    from abstraction_layer.routes.billing import transition_claim_state, ClaimTransitionRequest

    with patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", mock_valid_transitions):
        with patch("abstraction_layer.routes.billing._read_frappe_doc") as mock_read:
            mock_read.side_effect = HTTPException(status_code=404, detail="SM Claim not found")

            with pytest.raises(HTTPException) as exc_info:
                await transition_claim_state(
                    claim_id="NONEXISTENT",
                    req=ClaimTransitionRequest(new_state="submitted"),
                    x_frappe_site_name="test-site",
                )

            # Verify 404 response
            assert exc_info.value.status_code == 404
            detail = exc_info.value.detail
            assert detail["error"] == "claim not found"
            assert detail["claim_id"] == "NONEXISTENT"


# ---------------------------------------------------------------------------
# Test: Missing new_state returns 400
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_new_state_returns_400():
    """
    Test that a request body without new_state returns 400.
    """
    from fastapi import HTTPException
    from pydantic import ValidationError
    from abstraction_layer.routes.billing import ClaimTransitionRequest, transition_claim_state

    # Test with empty/new_state=None
    with pytest.raises(ValidationError):
        req = ClaimTransitionRequest(new_state=None)

    # Also test the endpoint behavior with empty string
    from abstraction_layer.routes.billing import transition_claim_state

    with patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", {}):
        with pytest.raises(HTTPException) as exc_info:
            await transition_claim_state(
                claim_id="CLM-001",
                req=ClaimTransitionRequest(new_state=""),
                x_frappe_site_name="test-site",
            )

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["error"] == "new_state is required"


# ---------------------------------------------------------------------------
# Test: Missing site header returns 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_site_header_returns_422():
    """
    Test that a request without X-Frappe-Site-Name header returns 422.
    """
    from fastapi import HTTPException
    from abstraction_layer.routes.billing import transition_claim_state, ClaimTransitionRequest

    with pytest.raises(HTTPException) as exc_info:
        await transition_claim_state(
            claim_id="CLM-001",
            req=ClaimTransitionRequest(new_state="submitted"),
            x_frappe_site_name=None,  # Missing header
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail["error"] == "site_name header missing"


# ---------------------------------------------------------------------------
# Test: Transition logs state change
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_transition_logs_state_change(
    mock_valid_transitions, sample_claim, updated_claim_after_transition
):
    """
    Test that a valid transition creates an SM Claim State Log entry.
    """
    from abstraction_layer.routes.billing import transition_claim_state, ClaimTransitionRequest

    mock_state_log_created = None

    with patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", mock_valid_transitions):
        with patch("abstraction_layer.routes.billing._read_frappe_doc") as mock_read:
            mock_read.side_effect = [sample_claim, updated_claim_after_transition]

            with patch("abstraction_layer.routes.billing.transition_state") as mock_transition:
                mock_transition.return_value = None

                with patch("abstraction_layer.routes.billing._create_frappe_doc") as mock_create:
                    async def capture_create(doctype, data, **kwargs):
                        nonlocal mock_state_log_created
                        if doctype == "SM Claim State Log":
                            mock_state_log_created = data
                        return {"name": "LOG-001"}

                    mock_create.side_effect = capture_create

                    response = await transition_claim_state(
                        claim_id="CLM-001",
                        req=ClaimTransitionRequest(new_state="ready_to_submit"),
                        x_frappe_site_name="test-site",
                    )

                    # Verify state log was created
                    assert mock_state_log_created is not None
                    assert mock_state_log_created["claim"] == "CLM-001"
                    assert mock_state_log_created["previous_state"] == "draft"
                    assert mock_state_log_created["new_state"] == "ready_to_submit"
                    assert mock_state_log_created["doctype"] == "SM Claim State Log"


# ---------------------------------------------------------------------------
# Test: Helper function _get_valid_next_states
# ---------------------------------------------------------------------------

def test_get_valid_next_states(mock_valid_transitions):
    """Test the _get_valid_next_states helper function."""
    from abstraction_layer.routes.billing import _get_valid_next_states

    with patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", mock_valid_transitions):
        # Test known state
        result = _get_valid_next_states("draft")
        assert result == ["ready_to_submit", "voided"]

        # Test state with empty transitions
        result = _get_valid_next_states("written_off")
        assert result == []

        # Test unknown state
        result = _get_valid_next_states("unknown_state")
        assert result == []


# ---------------------------------------------------------------------------
# Test: Site name passed to Frappe calls
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_site_name_passed_to_frappe_calls(
    mock_valid_transitions, sample_claim, updated_claim_after_transition
):
    """
    Test that the X-Frappe-Site-Name header value is passed to Frappe API calls.
    """
    from abstraction_layer.routes.billing import transition_claim_state, ClaimTransitionRequest

    expected_site_name = "my-clinic-site"

    with patch("abstraction_layer.routes.billing.VALID_TRANSITIONS", mock_valid_transitions):
        with patch("abstraction_layer.routes.billing._read_frappe_doc") as mock_read:
            mock_read.side_effect = [sample_claim, updated_claim_after_transition]

            with patch("abstraction_layer.routes.billing.transition_state"):
                await transition_claim_state(
                    claim_id="CLM-001",
                    req=ClaimTransitionRequest(new_state="ready_to_submit"),
                    x_frappe_site_name=expected_site_name,
                )

                # Verify site_name was passed to Frappe calls
                assert mock_read.call_count == 2
                for call in mock_read.call_args_list:
                    _, kwargs = call
                    assert kwargs.get("site_name") == expected_site_name