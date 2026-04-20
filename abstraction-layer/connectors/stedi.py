"""
Stedi clearinghouse connector — eligibility checks (270/271).

Handles real-time insurance eligibility verification via Stedi's
healthcare eligibility API. Used by billing routes.
"""

import os
import logging
from datetime import datetime, timezone

import httpx

from secrets_loader import SecretNotFoundError, read_secret

logger = logging.getLogger("abstraction-layer.stedi")


def _stedi_api_key() -> str:
    try:
        return read_secret("stedi_api_key")
    except SecretNotFoundError:
        return ""


STEDI_BASE_URL = "https://healthcare.us.stedi.com/2024-04-01"


class StediTimeoutError(Exception):
    """Raised when a Stedi API call exceeds the timeout."""
    pass


class StediAPIError(Exception):
    """Raised when Stedi returns a non-200 response."""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Stedi API error {status_code}: {detail}")


def _stedi_headers():
    return {
        "Authorization": f"Key {_stedi_api_key()}",
        "Content-Type": "application/json",
    }


async def check_eligibility(
    trading_partner_id: str,
    provider_npi: str,
    provider_name: str,
    member_id: str,
    member_first_name: str,
    member_last_name: str,
    member_dob: str,
    service_type_code: str = "30",
    date_of_service: str = "",
) -> dict:
    """
    Send a 270 eligibility inquiry to Stedi and return the 271 response.

    Raises:
        StediTimeoutError: if Stedi doesn't respond within 30s
        StediAPIError: if Stedi returns a non-200 status
    """
    if not date_of_service:
        date_of_service = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    payload = {
        "tradingPartnerServiceId": trading_partner_id,
        "provider": {
            "npi": provider_npi,
            "organizationName": provider_name,
        },
        "subscriber": {
            "memberId": member_id,
            "firstName": member_first_name,
            "lastName": member_last_name,
            "dateOfBirth": member_dob,
        },
        "encounter": {
            "serviceTypeCodes": [service_type_code],
            "dateOfService": date_of_service,
        },
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{STEDI_BASE_URL}/healthcare/eligibility/inquiries",
                json=payload,
                headers=_stedi_headers(),
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.TimeoutException:
        raise StediTimeoutError(
            f"Stedi eligibility check timed out after 30s for member {member_id}"
        )
    except httpx.HTTPStatusError as exc:
        try:
            error_body = exc.response.json()
            detail = str(error_body)
        except Exception:
            detail = exc.response.text or str(exc)
        raise StediAPIError(
            status_code=exc.response.status_code,
            detail=detail,
        )
