"""Unit tests for denial_classifier.py — runs outside Frappe bench."""

import json
import os
import sys
import types
from io import BytesIO
from unittest import mock

import pytest

# ---------------------------------------------------------------------------
# Ensure the sm_billing package is importable
# ---------------------------------------------------------------------------
_billing_root = os.path.join(os.path.dirname(__file__), "..", "..", "..")
sys.path.insert(0, _billing_root)


# ---------------------------------------------------------------------------
# Tests for classify_denial
# ---------------------------------------------------------------------------

class TestClassifyDenialHappyPath:
    """Test successful Bedrock classification."""

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_successful_classification(self, mock_boto3):
        bedrock_response = {
            "ai_category": "appealable",
            "ai_appealable": True,
            "ai_action": "Appeal with clinical documentation showing medical necessity",
            "ai_confidence": 0.85,
        }
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": json.dumps(bedrock_response)}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial(
            carc_codes=["CO-45"],
            rarc_codes=["N-522"],
            payer_name="Aetna",
            cpt_codes=["99213"],
        )

        assert result["ai_category"] == "appealable"
        assert result["ai_appealable"] is True
        assert "clinical documentation" in result["ai_action"]
        assert result["ai_confidence"] == 0.85

        # Verify boto3 client was created correctly
        mock_boto3.client.assert_called_once_with(
            "bedrock-runtime",
            region_name="us-east-1",
            aws_access_key_id="test-key",
            aws_secret_access_key="test-secret",
        )

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_correctable_classification(self, mock_boto3):
        bedrock_response = {
            "ai_category": "correctable",
            "ai_appealable": False,
            "ai_action": "Resubmit with correct modifier",
            "ai_confidence": 0.92,
        }
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": json.dumps(bedrock_response)}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial(["CO-4"], [], "BCBS", ["99214"])
        assert result["ai_category"] == "correctable"
        assert result["ai_appealable"] is False
        assert result["ai_confidence"] == 0.92

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_terminal_classification(self, mock_boto3):
        bedrock_response = {
            "ai_category": "terminal",
            "ai_appealable": False,
            "ai_action": "Write off - service not covered under plan",
            "ai_confidence": 0.95,
        }
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": json.dumps(bedrock_response)}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial(["CO-96"], [], "UHC", ["90834"])
        assert result["ai_category"] == "terminal"
        assert result["ai_confidence"] == 0.95


class TestClassifyDenialFallbacks:
    """Test error handling and fallback behavior."""

    def test_missing_aws_credentials(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            # Remove any AWS keys
            os.environ.pop("AWS_ACCESS_KEY_ID", None)
            os.environ.pop("AWS_SECRET_ACCESS_KEY", None)

            from sm_billing.sm_billing.denial_classifier import classify_denial

            result = classify_denial(["CO-45"], [], "Aetna", ["99213"])
            assert result["ai_category"] == "pending"
            assert result["ai_appealable"] is False
            assert result["ai_action"] == "Classification failed - manual review required"
            assert result["ai_confidence"] == 0.0

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_bedrock_api_timeout(self, mock_boto3):
        mock_client = mock.MagicMock()
        mock_client.invoke_model.side_effect = Exception("ReadTimeoutError")
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial(["CO-45"], [], "Aetna", ["99213"])
        assert result["ai_category"] == "pending"
        assert result["ai_action"] == "Classification failed - manual review required"
        assert result["ai_confidence"] == 0.0

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_unparseable_json_response(self, mock_boto3):
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": "I cannot classify this denial because..."}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial(["CO-45"], [], "Aetna", ["99213"])
        assert result["ai_category"] == "pending"
        assert result["ai_confidence"] == 0.0

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_invalid_category_in_response(self, mock_boto3):
        bedrock_response = {
            "ai_category": "invalid_category",
            "ai_appealable": True,
            "ai_action": "Some action",
            "ai_confidence": 0.5,
        }
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": json.dumps(bedrock_response)}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial(["CO-45"], [], "Aetna", ["99213"])
        assert result["ai_category"] == "pending"
        assert result["ai_confidence"] == 0.0


class TestClassifyDenialEdgeCases:
    """Test edge cases and input handling."""

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_empty_input_lists(self, mock_boto3):
        bedrock_response = {
            "ai_category": "terminal",
            "ai_appealable": False,
            "ai_action": "Insufficient information for classification",
            "ai_confidence": 0.3,
        }
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": json.dumps(bedrock_response)}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial([], [], "", [])
        assert result["ai_category"] == "terminal"

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.denial_classifier.boto3", create=True)
    def test_confidence_clamped_to_range(self, mock_boto3):
        bedrock_response = {
            "ai_category": "appealable",
            "ai_appealable": True,
            "ai_action": "Appeal this",
            "ai_confidence": 1.5,
        }
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": json.dumps(bedrock_response)}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.denial_classifier import classify_denial

        result = classify_denial(["CO-45"], [], "Aetna", ["99213"])
        assert result["ai_confidence"] == 1.0


class TestValidateResult:
    """Test the _validate_result function directly."""

    def test_valid_result(self):
        from sm_billing.sm_billing.denial_classifier import _validate_result

        result = _validate_result({
            "ai_category": "correctable",
            "ai_appealable": False,
            "ai_action": "Fix the code",
            "ai_confidence": 0.8,
        })
        assert result["ai_category"] == "correctable"
        assert result["ai_confidence"] == 0.8

    def test_missing_action_gets_default(self):
        from sm_billing.sm_billing.denial_classifier import _validate_result

        result = _validate_result({
            "ai_category": "appealable",
            "ai_appealable": True,
            "ai_action": "",
            "ai_confidence": 0.7,
        })
        assert result["ai_action"] == "Manual review required"

    def test_non_numeric_confidence(self):
        from sm_billing.sm_billing.denial_classifier import _validate_result

        result = _validate_result({
            "ai_category": "terminal",
            "ai_appealable": False,
            "ai_action": "Write off",
            "ai_confidence": "not a number",
        })
        assert result["ai_confidence"] == 0.0
