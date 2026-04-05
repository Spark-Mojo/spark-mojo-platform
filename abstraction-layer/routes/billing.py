"""
Billing capability routes — Stedi claim submission and 277CA webhook.

Handles SM Claim submission to Stedi clearinghouse (DECISION-027, DECISION-011).
All data flows through Frappe REST API via token auth.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
