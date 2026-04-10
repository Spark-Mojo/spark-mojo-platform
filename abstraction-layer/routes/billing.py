"""
Billing capability routes — Stedi claim submission, 277CA webhook, eligibility.

Handles SM Claim submission to Stedi clearinghouse (DECISION-027, DECISION-011).
Eligibility checks via 270/271 (BILL-005).
All data flows through Frappe REST API via token auth.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from connectors.stedi import check_eligibility, StediTimeoutError, StediAPIError

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
        member_id=member_id,
        member_first_name=member_first_name,
        member_last_name=member_last_name,
        member_dob=member_dob,
        service_type_code=service_type_code,
        date_of_service=date_of_service,
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


# ---------------------------------------------------------------------------
# BILL-015: Denial Worklist Endpoint
# ---------------------------------------------------------------------------

@router.get("/denials/worklist")
async def denial_worklist(
    site: str = Query(..., description="Frappe site name for tenant isolation"),
    payer: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_watching: bool = True,
):
    """
    Denial worklist — workboard-backed billing lens per DECISION-029.
    Queries SM Tasks filtered to billing denial work, enriches with SM Denial data.
    Also surfaces claims in pipeline states as watching-mode visibility items.
    """
    # Step 1: Query SM Tasks for denial review
    task_filters = [
        ["source_system", "=", "Healthcare Billing Mojo"],
        ["task_type", "=", "denial_review"],
        ["canonical_state", "not in", ["Completed", "Canceled"]],
    ]
    task_fields = '["name","task_mode","source_object_id","canonical_state"]'
    tasks = await _list_frappe_docs(
        "SM Task", filters=json.dumps(task_filters), fields=task_fields, limit=200
    )

    # Step 2: Enrich each task with SM Denial data
    today = datetime.now().date()
    denial_items = []
    for task in tasks:
        denial_name = task.get("source_object_id", "")
        if not denial_name:
            continue
        try:
            denial = await _read_frappe_doc("SM Denial", denial_name)
        except Exception:
            continue

        denial_date = denial.get("denial_date")
        appeal_deadline = denial.get("appeal_deadline")

        # Apply optional filters
        if date_from and denial_date and denial_date < date_from:
            continue
        if date_to and denial_date and denial_date > date_to:
            continue

        # Get payer name from linked claim
        payer_name = None
        if denial.get("claim"):
            try:
                claim = await _read_frappe_doc("SM Claim", denial["claim"])
                payer_name = claim.get("payer")
            except Exception:
                pass

        if payer and payer_name != payer:
            continue

        # Compute days until deadline
        days_until_deadline = None
        if appeal_deadline:
            try:
                dl = datetime.strptime(appeal_deadline, "%Y-%m-%d").date()
                days_until_deadline = (dl - today).days
            except (ValueError, TypeError):
                pass

        # Extract CARC codes as list of strings
        carc_rows = denial.get("carc_codes", [])
        carc_list = []
        if isinstance(carc_rows, list):
            carc_list = [r.get("carc_code", "") for r in carc_rows if r.get("carc_code")]
        elif isinstance(carc_rows, str):
            carc_list = _parse_comma_list(carc_rows)

        ai_category = denial.get("ai_category", "pending") or "pending"

        denial_items.append({
            "task_id": task.get("name"),
            "task_mode": task.get("task_mode", "active"),
            "denial_name": denial_name,
            "claim": denial.get("claim"),
            "denial_date": denial_date,
            "appeal_deadline": appeal_deadline,
            "days_until_deadline": days_until_deadline,
            "carc_codes": carc_list,
            "denial_reason_summary": denial.get("denial_reason_summary"),
            "ai_category": ai_category,
            "ai_appealable": denial.get("ai_appealable", 0),
            "ai_action": denial.get("ai_action"),
            "ai_confidence": denial.get("ai_confidence"),
            "payer_name": payer_name,
            "_sort_key": days_until_deadline if days_until_deadline is not None else 9999,
        })

    # Step 5: Group by ai_category, sort by appeal_deadline ascending (past-deadline first)
    categories = {"correctable": [], "appealable": [], "terminal": [], "pending": []}
    for item in denial_items:
        cat = item["ai_category"] if item["ai_category"] in categories else "pending"
        categories[cat].append(item)
    for cat in categories:
        categories[cat].sort(key=lambda x: x["_sort_key"])
        for item in categories[cat]:
            del item["_sort_key"]

    # Step 3: Pipeline claims (watching mode)
    pipeline = {"submitted": [], "adjudicating": []}
    if include_watching:
        for pipe_state in ["submitted", "adjudicating"]:
            pipe_filters = [["canonical_state", "=", pipe_state]]
            pipe_fields = '["name","canonical_state","payer","date_of_service","state_changed_at"]'
            pipe_claims = await _list_frappe_docs(
                "SM Claim", filters=json.dumps(pipe_filters), fields=pipe_fields, limit=200
            )
            for pc in pipe_claims:
                if payer and pc.get("payer") != payer:
                    continue
                days_in_state = None
                if pc.get("state_changed_at"):
                    try:
                        changed = datetime.strptime(pc["state_changed_at"], "%Y-%m-%d %H:%M:%S")
                        days_in_state = (datetime.now() - changed).days
                    except (ValueError, TypeError):
                        pass
                pipeline[pipe_state].append({
                    "claim": pc.get("name"),
                    "canonical_state": pipe_state,
                    "payer_name": pc.get("payer"),
                    "date_of_service": pc.get("date_of_service"),
                    "days_in_state": days_in_state,
                })

    totals = {
        "correctable": len(categories["correctable"]),
        "appealable": len(categories["appealable"]),
        "terminal": len(categories["terminal"]),
        "pending": len(categories["pending"]),
        "pipeline_submitted": len(pipeline["submitted"]),
        "pipeline_adjudicating": len(pipeline["adjudicating"]),
        "total_action_required": len(denial_items),
    }

    return {
        "action_required": categories,
        "pipeline": pipeline,
        "totals": totals,
    }


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


# ---------------------------------------------------------------------------
# STC category code labels for 277CA
# ---------------------------------------------------------------------------

STC_LABELS = {
    "A1": "accepted by payer",
    "A2": "accepted with errors",
    "A0": "claim forwarded",
    "R3": "rejected",
    "A3": "rejected — request not supported",
    "E0": "payer error — manual review required",
    "A4": "not found — manual review required",
}

# STC codes that trigger adjudicating transition
STC_ADJUDICATING = {"A1", "A2", "A0"}
# STC codes that trigger rejected transition
STC_REJECTED = {"R3", "A3"}
# STC codes that require manual review (no transition)
STC_MANUAL_REVIEW = {"E0", "A4"}


async def _transition_claim_state(
    claim_name: str,
    to_state: str,
    trigger_reference: str,
    reason: str,
    trigger_type: str = "webhook_277ca",
    paid_amount_at_change: Optional[float] = None,
    adjustment_amount_at_change: Optional[float] = None,
    patient_responsibility_at_change: Optional[float] = None,
) -> dict:
    """Call the Frappe whitelisted transition_state API."""
    payload = {
        "claim_name": claim_name,
        "to_state": to_state,
        "trigger_type": trigger_type,
        "reason": reason,
        "trigger_reference": trigger_reference,
        "changed_by": "System",
    }
    if paid_amount_at_change is not None:
        payload["paid_amount_at_change"] = paid_amount_at_change
    if adjustment_amount_at_change is not None:
        payload["adjustment_amount_at_change"] = adjustment_amount_at_change
    if patient_responsibility_at_change is not None:
        payload["patient_responsibility_at_change"] = patient_responsibility_at_change
    async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
        resp = await client.post(
            "/api/method/sm_billing.sm_billing.sm_billing.doctype.sm_claim.sm_claim.api_transition_state",
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json().get("message", {})


@webhook_router.post("/277ca")
async def stedi_277ca_webhook(request_body: dict):
    """
    Receive 277CA claim acknowledgment from Stedi.
    Parses STC category code and transitions SM Claim state via transition_state().
    Always returns HTTP 200 — Stedi must not retry.
    """
    transaction_id = request_body.get("stedi_transaction_id", "") or request_body.get("transactionId", "")
    claim_control_number = (
        request_body.get("claim_control_number", "")
        or request_body.get("patientControlNumber", "")
    )
    stc_category = (
        request_body.get("stc_category", "")
        or request_body.get("categoryCode", "")
    )

    if not claim_control_number:
        logger.warning("277CA webhook missing claim_control_number, txn=%s", transaction_id)
        return {"status": "warning", "detail": "missing claim_control_number"}

    # Look up SM Claim by patient_control_number (claim control number)
    try:
        async with httpx.AsyncClient(base_url=FRAPPE_URL, headers=_frappe_headers()) as client:
            resp = await client.get(
                "/api/resource/SM Claim",
                params={
                    "filters": json.dumps([["patient_control_number", "=", claim_control_number]]),
                    "fields": json.dumps(["name", "canonical_state"]),
                    "limit_page_length": 1,
                },
                timeout=15,
            )
            resp.raise_for_status()
            claims = resp.json().get("data", [])
    except Exception as exc:
        logger.error("277CA webhook: failed to look up claim: %s", exc)
        return {"status": "warning", "detail": f"claim lookup failed: {exc}"}

    if not claims:
        logger.warning("277CA webhook: no claim found for control_number=%s", claim_control_number)
        return {"status": "warning", "detail": f"claim not found: {claim_control_number}"}

    claim = claims[0]
    claim_name = claim["name"]
    current_state = claim.get("canonical_state", "")

    # Claim must be in submitted state for 277CA transitions
    if current_state != "submitted":
        return {"status": "warning", "detail": "claim not in submitted state"}

    label = STC_LABELS.get(stc_category, f"unknown STC: {stc_category}")
    reason = f"{stc_category}: {label}"

    # Manual review codes — log but don't transition
    if stc_category in STC_MANUAL_REVIEW:
        logger.error("277CA webhook: %s for claim %s — manual review required", stc_category, claim_name)
        return {"status": "warning", "detail": f"{stc_category} {label}"}

    # Determine target state
    if stc_category in STC_ADJUDICATING:
        to_state = "adjudicating"
    elif stc_category in STC_REJECTED:
        to_state = "rejected"
    else:
        logger.warning("277CA webhook: unrecognized STC category %s for claim %s", stc_category, claim_name)
        return {"status": "warning", "detail": f"unrecognized STC category: {stc_category}"}

    # Execute transition via Frappe whitelisted API
    try:
        await _transition_claim_state(
            claim_name=claim_name,
            to_state=to_state,
            trigger_reference=transaction_id,
            reason=reason,
        )
    except Exception as exc:
        logger.error("277CA webhook: transition failed for claim %s: %s", claim_name, exc)
        return {"status": "warning", "detail": f"transition failed: {exc}"}

    return {"status": "ok", "claim": claim_name, "new_state": to_state}


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
    check_eft = era_data.get("checkOrEftNumber", transaction_id)
    for line in era_lines:
        if line["match_status"] == "matched" and not line["is_denied"]:
            # Payment auto-posting with state machine integration (BILL-012)
            try:
                claim = await _read_frappe_doc("SM Claim", line["claim"])
                current_state = claim.get("canonical_state", "")
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
                    reason = "835 ERA: full payment posted"
                elif new_paid > 0:
                    new_state = "partial_paid"
                    reason = "835 ERA: partial payment posted"
                else:
                    new_state = current_state
                    reason = "835 ERA: zero payment posted"

                # Always post payment amounts to the claim
                await _update_frappe_doc("SM Claim", line["claim"], {
                    "paid_amount": new_paid,
                    "adjustment_amount": new_adj,
                    "patient_responsibility": new_pr,
                    "adjudication_date": era_date,
                })

                # Only transition state if claim is in adjudicating
                if current_state == "adjudicating" and new_state != current_state:
                    try:
                        await _transition_claim_state(
                            claim_name=line["claim"],
                            to_state=new_state,
                            trigger_reference=check_eft,
                            reason=reason,
                            trigger_type="webhook_835",
                            paid_amount_at_change=line["paid_amount"],
                            adjustment_amount_at_change=line["adjustment_amount"],
                            patient_responsibility_at_change=line["patient_responsibility"],
                        )
                    except Exception as te:
                        logger.error("835 ERA: transition failed for %s: %s", line["claim"], te)
                elif current_state != "adjudicating":
                    logger.warning(
                        "835 ERA: claim %s in state '%s', not adjudicating — payment posted, no transition",
                        line["claim"], current_state,
                    )
            except Exception as exc:
                logger.error("Failed to auto-post payment for %s: %s", line["claim"], exc)

        elif line["match_status"] == "matched" and line["is_denied"]:
            # Create SM Denial with state machine integration (BILL-012)
            try:
                current_state = None
                try:
                    claim_doc = await _read_frappe_doc("SM Claim", line["claim"])
                    current_state = claim_doc.get("canonical_state", "")
                except Exception:
                    pass

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

                # Transition claim state via state machine
                if current_state == "adjudicating":
                    try:
                        await _transition_claim_state(
                            claim_name=line["claim"],
                            to_state="denied",
                            trigger_reference=check_eft,
                            reason="835 ERA: denied — CARC " + (line["carc_codes"] or "unknown"),
                            trigger_type="webhook_835",
                            paid_amount_at_change=0.0,
                            adjustment_amount_at_change=line["adjustment_amount"],
                            patient_responsibility_at_change=0.0,
                        )
                    except Exception as te:
                        logger.error("835 ERA: transition to denied failed for %s: %s", line["claim"], te)
                elif current_state and current_state != "adjudicating":
                    logger.warning(
                        "835 ERA: claim %s in state '%s', not adjudicating — denial created, no transition",
                        line["claim"], current_state,
                    )
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


# ---------------------------------------------------------------------------
# BILL-018: Appeal Outcome Endpoints
# ---------------------------------------------------------------------------

class AppealWonRequest(BaseModel):
    appeal_id: str
    result_notes: Optional[str] = None


class AppealLostRequest(BaseModel):
    appeal_id: str
    result_notes: Optional[str] = None


class WriteOffRequest(BaseModel):
    claim_id: str
    reason_code: str
    approved_by: str
    write_off_amount: float


class EscalateRequest(BaseModel):
    appeal_id: str


async def _complete_task_by_source(source_object_id: str):
    """Complete an open SM Task linked to a source object via the tasks API."""
    try:
        tasks = await _list_frappe_docs(
            "SM Task",
            filters=json.dumps([
                ["source_object_id", "=", source_object_id],
                ["source_system", "=", "Healthcare Billing Mojo"],
                ["canonical_state", "not in", ["Completed", "Canceled"]],
            ]),
            fields='["name"]',
            limit=10,
        )
        for task in tasks:
            try:
                await _update_frappe_doc("SM Task", task["name"], {
                    "canonical_state": "Completed",
                })
            except Exception as exc:
                logger.warning("Failed to complete task %s: %s", task["name"], exc)
    except Exception as exc:
        logger.warning("Failed to find tasks for %s: %s", source_object_id, exc)


async def _complete_all_billing_tasks_for_claim(claim_name: str):
    """Complete all open billing tasks linked to a claim."""
    try:
        tasks = await _list_frappe_docs(
            "SM Task",
            filters=json.dumps([
                ["source_system", "=", "Healthcare Billing Mojo"],
                ["canonical_state", "not in", ["Completed", "Canceled"]],
            ]),
            fields='["name","source_object_id"]',
            limit=200,
        )
        for task in tasks:
            # Check if task's source object links to this claim
            src = task.get("source_object_id", "")
            if not src:
                continue
            # Try loading as SM Denial or SM Appeal to check claim linkage
            try:
                denial = await _read_frappe_doc("SM Denial", src)
                if denial.get("claim") == claim_name:
                    await _update_frappe_doc("SM Task", task["name"], {
                        "canonical_state": "Completed",
                    })
                    continue
            except Exception:
                pass
            try:
                appeal = await _read_frappe_doc("SM Appeal", src)
                if appeal.get("claim") == claim_name:
                    await _update_frappe_doc("SM Task", task["name"], {
                        "canonical_state": "Completed",
                    })
            except Exception:
                pass
    except Exception as exc:
        logger.warning("Failed to complete billing tasks for claim %s: %s", claim_name, exc)


@router.post("/appeals/won")
async def appeal_won(req: AppealWonRequest):
    """Record appeal won — transitions claim to adjudicating."""
    appeal = await _read_frappe_doc("SM Appeal", req.appeal_id)
    if appeal.get("result") != "pending":
        raise HTTPException(status_code=400, detail="Appeal result is not pending")

    claim_name = appeal.get("claim")
    claim = await _read_frappe_doc("SM Claim", claim_name)
    if claim.get("canonical_state") != "in_appeal":
        raise HTTPException(status_code=400, detail="Claim is not in in_appeal state")

    # Update SM Appeal
    update_data = {
        "result": "won",
        "result_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    if req.result_notes:
        update_data["result_notes"] = req.result_notes
    await _update_frappe_doc("SM Appeal", req.appeal_id, update_data)

    # Transition claim: in_appeal → adjudicating
    await _transition_claim_state(
        claim_name=claim_name,
        to_state="adjudicating",
        trigger_reference=req.appeal_id,
        reason=f"Appeal won at level {appeal.get('appeal_level', 1)}",
        trigger_type="api",
    )

    # Complete appeal task
    await _complete_task_by_source(req.appeal_id)

    updated_appeal = await _read_frappe_doc("SM Appeal", req.appeal_id)
    updated_claim = await _read_frappe_doc("SM Claim", claim_name)

    return {
        "appeal": updated_appeal,
        "claim_state": updated_claim.get("canonical_state"),
    }


@router.post("/appeals/lost")
async def appeal_lost(req: AppealLostRequest):
    """Record appeal lost — transitions claim back to denied, creates decision task."""
    appeal = await _read_frappe_doc("SM Appeal", req.appeal_id)
    if appeal.get("result") != "pending":
        raise HTTPException(status_code=400, detail="Appeal result is not pending")

    claim_name = appeal.get("claim")
    claim = await _read_frappe_doc("SM Claim", claim_name)
    if claim.get("canonical_state") != "in_appeal":
        raise HTTPException(status_code=400, detail="Claim is not in in_appeal state")

    # Update SM Appeal
    update_data = {
        "result": "lost",
        "result_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    if req.result_notes:
        update_data["result_notes"] = req.result_notes
    await _update_frappe_doc("SM Appeal", req.appeal_id, update_data)

    # Transition claim: in_appeal → denied
    await _transition_claim_state(
        claim_name=claim_name,
        to_state="denied",
        trigger_reference=req.appeal_id,
        reason=f"Appeal lost at level {appeal.get('appeal_level', 1)}",
        trigger_type="api",
    )

    # Create new decision task
    try:
        await _create_frappe_doc("SM Task", {
            "doctype": "SM Task",
            "title": f"Decide next step: level 2 appeal or write-off for claim {claim_name}",
            "task_type": "appeal_decision",
            "task_mode": "active",
            "source_system": "Healthcare Billing Mojo",
            "source_object_id": req.appeal_id,
            "assigned_role": "Billing Coordinator",
            "priority": "Normal",
            "canonical_state": "Open",
        })
    except Exception as exc:
        logger.error("Failed to create appeal_decision task: %s", exc)

    # Complete original appeal task
    await _complete_task_by_source(req.appeal_id)

    updated_appeal = await _read_frappe_doc("SM Appeal", req.appeal_id)
    updated_claim = await _read_frappe_doc("SM Claim", claim_name)

    return {
        "appeal": updated_appeal,
        "claim_state": updated_claim.get("canonical_state"),
    }


@router.post("/appeals/write_off")
async def appeal_write_off(req: WriteOffRequest):
    """Write off a denied claim — requires supervisor approval."""
    claim = await _read_frappe_doc("SM Claim", req.claim_id)
    if claim.get("canonical_state") != "denied":
        raise HTTPException(status_code=400, detail="Claim is not in denied state")

    # Verify supervisor role
    try:
        user = await _read_frappe_doc("User", req.approved_by)
        roles = [r.get("role", "") for r in user.get("roles", [])]
        if "Billing Supervisor" not in roles:
            raise HTTPException(
                status_code=403,
                detail={"error": "write_off_requires_supervisor_approval"},
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=403,
            detail={"error": "write_off_requires_supervisor_approval"},
        )

    # Update claim with write-off info
    await _update_frappe_doc("SM Claim", req.claim_id, {
        "write_off_amount": req.write_off_amount,
        "write_off_approved_by": req.approved_by,
    })

    # Transition to written_off
    await _transition_claim_state(
        claim_name=req.claim_id,
        to_state="written_off",
        trigger_reference=req.approved_by,
        reason=f"Write-off approved by {req.approved_by}: {req.reason_code}",
        trigger_type="api",
    )

    # Complete all open billing tasks for this claim
    await _complete_all_billing_tasks_for_claim(req.claim_id)

    updated_claim = await _read_frappe_doc("SM Claim", req.claim_id)
    return {"claim": updated_claim}


@router.post("/appeals/escalate")
async def appeal_escalate(req: EscalateRequest):
    """Escalate a lost level-1 appeal to level 2."""
    appeal = await _read_frappe_doc("SM Appeal", req.appeal_id)
    if appeal.get("result") != "lost":
        raise HTTPException(status_code=400, detail="Appeal result is not lost")
    if appeal.get("appeal_level", 1) != 1:
        raise HTTPException(status_code=400, detail="Only level-1 appeals can be escalated")

    denial_name = appeal.get("denial")
    claim_name = appeal.get("claim")

    # Check no level-2 appeal already exists
    existing = await _list_frappe_docs(
        "SM Appeal",
        filters=json.dumps([
            ["denial", "=", denial_name],
            ["appeal_level", "=", 2],
        ]),
        fields='["name"]',
        limit=1,
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": "level_2_appeal_already_exists"},
        )

    # Calculate payer_deadline for level 2
    original_deadline = appeal.get("payer_deadline", "")
    new_deadline = ""
    if original_deadline:
        try:
            dl = datetime.strptime(original_deadline, "%Y-%m-%d")
            new_deadline = (dl + timedelta(days=30)).strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            pass

    # Create level-2 appeal — after_insert hook handles transition + task + letter
    new_appeal = await _create_frappe_doc("SM Appeal", {
        "doctype": "SM Appeal",
        "claim": claim_name,
        "denial": denial_name,
        "appeal_level": 2,
        "payer_deadline": new_deadline,
        "result": "pending",
    })

    return {"appeal": new_appeal}


# ---------------------------------------------------------------------------
# BILL-019: AR Summary
# ---------------------------------------------------------------------------

ALL_CLAIM_STATES = [
    "draft", "pending_info", "pending_auth", "validated", "held",
    "submitted", "rejected", "adjudicating", "paid", "partial_paid",
    "denied", "in_appeal", "appeal_won", "appeal_lost",
    "pending_secondary", "patient_balance", "written_off", "closed", "voided",
]


@router.get("/ar/summary")
async def ar_summary(
    site: str = Query(..., description="Frappe site name for tenant isolation"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    filters = []
    if date_from:
        filters.append(["date_of_service", ">=", date_from])
    if date_to:
        filters.append(["date_of_service", "<=", date_to])

    fields = '["name","canonical_state","claim_charge_amount","paid_amount","patient_responsibility"]'
    claims = await _list_frappe_docs(
        "SM Claim",
        filters=json.dumps(filters) if filters else "",
        fields=fields,
        limit=0,
    )

    by_state = {s: {"count": 0, "billed": 0.0} for s in ALL_CLAIM_STATES}

    total_claims = 0
    total_billed = 0.0
    total_paid = 0.0
    total_denied = 0.0
    total_in_appeal = 0.0
    total_patient_balance = 0.0
    total_written_off = 0.0

    for claim in claims:
        state = claim.get("canonical_state", "draft")
        billed = float(claim.get("claim_charge_amount") or 0)
        paid = float(claim.get("paid_amount") or 0)

        total_claims += 1
        total_billed += billed
        total_paid += paid

        if state in by_state:
            by_state[state]["count"] += 1
            by_state[state]["billed"] += billed

        if state == "denied":
            total_denied += billed
        elif state == "in_appeal":
            total_in_appeal += billed
        elif state == "patient_balance":
            total_patient_balance += billed
        elif state == "written_off":
            total_written_off += billed

    total_outstanding = round(total_billed - total_paid - total_written_off, 2)

    for s in by_state:
        by_state[s]["billed"] = round(by_state[s]["billed"], 2)

    return {
        "summary": {
            "total_claims": total_claims,
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "total_denied": round(total_denied, 2),
            "total_in_appeal": round(total_in_appeal, 2),
            "total_patient_balance": round(total_patient_balance, 2),
            "total_written_off": round(total_written_off, 2),
            "total_outstanding": total_outstanding,
        },
        "by_state": by_state,
        "as_of": datetime.now(timezone.utc).isoformat(),
    }
