"""AI denial classification via AWS Bedrock (Claude Sonnet).

Classifies SM Denial records by CARC/RARC codes and returns category,
appealability, recommended action, and confidence score.
"""

import json
import logging
import os

try:
    import boto3
except ImportError:
    boto3 = None

logger = logging.getLogger(__name__)

FALLBACK_RESULT = {
    "ai_category": "pending",
    "ai_appealable": False,
    "ai_action": "Classification failed - manual review required",
    "ai_confidence": 0.0,
}

VALID_CATEGORIES = {"correctable", "appealable", "terminal"}

MODEL_ID = "anthropic.claude-sonnet-4-20250514"

CLASSIFICATION_PROMPT = """\
You are a medical billing denial classifier. Given the following denial information, classify it.

CARC Codes: {carc_codes}
RARC Codes: {rarc_codes}
Payer: {payer_name}
CPT Codes: {cpt_codes}

Respond with ONLY a JSON object using this exact schema:
{{
  "ai_category": "correctable|appealable|terminal",
  "ai_appealable": true or false,
  "ai_action": "<one sentence recommended action>",
  "ai_confidence": <float between 0.0 and 1.0>
}}

Rules:
- "correctable" means the denial can be fixed by correcting billing errors (wrong codes, missing modifiers, etc.)
- "appealable" means the denial should be appealed with clinical documentation
- "terminal" means the denial is final and unlikely to be overturned
- ai_appealable should be true for "appealable" category, and may be true for "correctable" if an appeal is also viable
- ai_confidence should reflect how certain you are in the classification

Respond with ONLY the JSON object, no other text."""


def classify_denial(carc_codes, rarc_codes, payer_name, cpt_codes):
    """Classify a denial using AWS Bedrock.

    Args:
        carc_codes: List of CARC code strings (e.g. ["CO-45"])
        rarc_codes: List of RARC code strings
        payer_name: Name of the payer
        cpt_codes: List of CPT code strings

    Returns:
        dict with keys: ai_category, ai_appealable, ai_action, ai_confidence
        Never raises — returns FALLBACK_RESULT on any error.
    """
    try:
        aws_key = os.environ.get("AWS_ACCESS_KEY_ID")
        aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
        aws_region = os.environ.get("AWS_REGION", "us-east-1")

        if not aws_key or not aws_secret:
            logger.warning("Missing AWS credentials for denial classification")
            return dict(FALLBACK_RESULT)

        if boto3 is None:
            logger.warning("boto3 not installed - cannot classify denial")
            return dict(FALLBACK_RESULT)

        client = boto3.client(
            "bedrock-runtime",
            region_name=aws_region,
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
        )

        prompt = CLASSIFICATION_PROMPT.format(
            carc_codes=", ".join(carc_codes) if carc_codes else "None",
            rarc_codes=", ".join(rarc_codes) if rarc_codes else "None",
            payer_name=payer_name or "Unknown",
            cpt_codes=", ".join(cpt_codes) if cpt_codes else "None",
        )

        response = client.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 256,
                "messages": [{"role": "user", "content": prompt}],
            }),
        )

        response_body = json.loads(response["body"].read())
        content_text = response_body["content"][0]["text"]
        result = json.loads(content_text)

        return _validate_result(result)

    except Exception as e:
        logger.warning("Denial classification failed: %s", str(e))
        return dict(FALLBACK_RESULT)


def _validate_result(result):
    """Validate and normalize the Bedrock response."""
    category = result.get("ai_category", "")
    if category not in VALID_CATEGORIES:
        logger.warning("Invalid ai_category from Bedrock: %s", category)
        return dict(FALLBACK_RESULT)

    confidence = result.get("ai_confidence", 0.0)
    try:
        confidence = float(confidence)
        confidence = max(0.0, min(1.0, confidence))
    except (TypeError, ValueError):
        confidence = 0.0

    action = result.get("ai_action", "")
    if not isinstance(action, str) or not action.strip():
        action = "Manual review required"

    appealable = bool(result.get("ai_appealable", False))

    return {
        "ai_category": category,
        "ai_appealable": appealable,
        "ai_action": action.strip(),
        "ai_confidence": confidence,
    }
