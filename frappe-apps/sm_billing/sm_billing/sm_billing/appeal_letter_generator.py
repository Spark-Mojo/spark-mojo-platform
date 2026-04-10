"""AI appeal letter generation via AWS Bedrock (Claude Sonnet).

Generates a draft appeal letter for SM Appeal records based on denial
information, CARC/RARC codes, and claim details.
"""

import json
import logging
import os

try:
    import boto3
except ImportError:
    boto3 = None

logger = logging.getLogger(__name__)

MODEL_ID = "anthropic.claude-sonnet-4-20250514"

LETTER_PROMPT = """\
You are a medical billing specialist writing an insurance appeal letter. \
Write a professional, compliant appeal letter using the following information.

Payer: {payer_name}
Service Date: {service_date}
CPT Codes: {cpt_codes}
CARC Codes: {carc_codes}
RARC Codes: {rarc_codes}
Appeal Level: {appeal_level}
Denial Reason: {denial_reason_summary}

The letter must include:
1. Opening paragraph stating the purpose of the appeal and identifying the claim
2. Clinical necessity argument explaining why the services were medically necessary
3. Regulatory or contractual basis where applicable (reference relevant guidelines)
4. Closing paragraph requesting reconsideration with contact information placeholder [CONTACT INFO]

Write the letter in a professional tone suitable for submission to the payer. \
Do not include any JSON or metadata — return only the letter text."""


def generate_appeal_letter(
    carc_codes,
    rarc_codes,
    payer_name,
    cpt_codes,
    service_date,
    appeal_level,
    denial_reason_summary,
):
    """Generate an appeal letter using AWS Bedrock.

    Args:
        carc_codes: List of CARC code strings (e.g. ["CO-45"])
        rarc_codes: List of RARC code strings
        payer_name: Name of the payer
        cpt_codes: List of CPT code strings
        service_date: Date of service string
        appeal_level: Integer appeal level (1 or 2)
        denial_reason_summary: Summary of the denial reason

    Returns:
        str: The generated letter text.
        Never raises — returns fallback string on any error.
    """
    fallback = (
        f"[Appeal letter generation failed - please draft manually. "
        f"Denial reason: {denial_reason_summary or 'Not specified'}]"
    )

    try:
        aws_key = os.environ.get("AWS_ACCESS_KEY_ID")
        aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
        aws_region = os.environ.get("AWS_REGION", "us-east-1")

        if not aws_key or not aws_secret:
            logger.warning("Missing AWS credentials for appeal letter generation")
            return fallback

        if boto3 is None:
            logger.warning("boto3 not installed - cannot generate appeal letter")
            return fallback

        client = boto3.client(
            "bedrock-runtime",
            region_name=aws_region,
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
        )

        prompt = LETTER_PROMPT.format(
            payer_name=payer_name or "Unknown",
            service_date=service_date or "Unknown",
            cpt_codes=", ".join(cpt_codes) if cpt_codes else "None",
            carc_codes=", ".join(carc_codes) if carc_codes else "None",
            rarc_codes=", ".join(rarc_codes) if rarc_codes else "None",
            appeal_level=appeal_level or 1,
            denial_reason_summary=denial_reason_summary or "Not specified",
        )

        response = client.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            }),
        )

        response_body = json.loads(response["body"].read())
        letter_text = response_body["content"][0]["text"]

        if not letter_text or len(letter_text.strip()) < 50:
            logger.warning("Bedrock returned empty or very short appeal letter")
            return fallback

        return letter_text.strip()

    except Exception as e:
        logger.warning("Appeal letter generation failed: %s", str(e))
        return fallback
