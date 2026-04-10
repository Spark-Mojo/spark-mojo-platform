"""Unit tests for appeal_letter_generator.py — runs outside Frappe bench."""

import json
import os
import sys
from unittest import mock

import pytest

# ---------------------------------------------------------------------------
# Ensure the sm_billing package is importable
# ---------------------------------------------------------------------------
_billing_root = os.path.join(os.path.dirname(__file__), "..", "..", "..")
sys.path.insert(0, _billing_root)


class TestGenerateAppealLetterHappyPath:
    """Test successful Bedrock letter generation."""

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", create=True)
    def test_successful_generation(self, mock_boto3):
        letter_text = (
            "Dear Aetna Claims Department,\n\n"
            "We are writing to appeal the denial of claim for patient services "
            "rendered on 2024-01-15. The services billed under CPT code 99213 "
            "were medically necessary and appropriately documented.\n\n"
            "The denial was issued under CARC code CO-45, indicating charges "
            "exceed the fee schedule. We respectfully disagree with this "
            "determination based on the following clinical evidence.\n\n"
            "The patient required an evaluation and management visit due to "
            "the complexity of their presenting condition. Documentation in "
            "the medical record supports the level of service billed.\n\n"
            "We request a full reconsideration of this claim. Please contact "
            "us at [CONTACT INFO] with any questions.\n\n"
            "Sincerely,\n[Provider Name]"
        )
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": letter_text}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

        result = generate_appeal_letter(
            carc_codes=["CO-45"],
            rarc_codes=["N-522"],
            payer_name="Aetna",
            cpt_codes=["99213"],
            service_date="2024-01-15",
            appeal_level=1,
            denial_reason_summary="Charges exceed fee schedule",
        )

        assert "Aetna" in result
        assert len(result) > 200
        assert result == letter_text

        mock_boto3.client.assert_called_once_with(
            "bedrock-runtime",
            region_name="us-east-1",
            aws_access_key_id="test-key",
            aws_secret_access_key="test-secret",
        )

        call_args = mock_client.invoke_model.call_args
        body = json.loads(call_args[1]["body"])
        assert body["max_tokens"] == 2048
        assert "CO-45" in body["messages"][0]["content"]
        assert "Aetna" in body["messages"][0]["content"]

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-west-2",
    })
    @mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", create=True)
    def test_level_2_appeal(self, mock_boto3):
        letter_text = "Level 2 appeal letter for BCBS regarding CPT 90834. " * 10
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": letter_text}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

        result = generate_appeal_letter(
            carc_codes=["CO-96"],
            rarc_codes=[],
            payer_name="BCBS",
            cpt_codes=["90834"],
            service_date="2024-02-20",
            appeal_level=2,
            denial_reason_summary="Not medically necessary",
        )

        assert len(result) > 50
        mock_boto3.client.assert_called_once_with(
            "bedrock-runtime",
            region_name="us-west-2",
            aws_access_key_id="test-key",
            aws_secret_access_key="test-secret",
        )


class TestGenerateAppealLetterFallbacks:
    """Test error handling and fallback behavior."""

    def test_missing_aws_credentials(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            os.environ.pop("AWS_ACCESS_KEY_ID", None)
            os.environ.pop("AWS_SECRET_ACCESS_KEY", None)

            from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

            result = generate_appeal_letter(
                carc_codes=["CO-45"],
                rarc_codes=[],
                payer_name="Aetna",
                cpt_codes=["99213"],
                service_date="2024-01-15",
                appeal_level=1,
                denial_reason_summary="Charges exceed fee schedule",
            )

            assert result.startswith("[Appeal letter generation failed")
            assert "Charges exceed fee schedule" in result

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", create=True)
    def test_bedrock_api_timeout(self, mock_boto3):
        mock_client = mock.MagicMock()
        mock_client.invoke_model.side_effect = Exception("ReadTimeoutError")
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

        result = generate_appeal_letter(
            carc_codes=["CO-45"],
            rarc_codes=[],
            payer_name="Aetna",
            cpt_codes=["99213"],
            service_date="2024-01-15",
            appeal_level=1,
            denial_reason_summary="Fee schedule exceeded",
        )

        assert result.startswith("[Appeal letter generation failed")
        assert "Fee schedule exceeded" in result

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", create=True)
    def test_empty_response_from_bedrock(self, mock_boto3):
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": ""}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

        result = generate_appeal_letter(
            carc_codes=["CO-45"],
            rarc_codes=[],
            payer_name="Aetna",
            cpt_codes=["99213"],
            service_date="2024-01-15",
            appeal_level=1,
            denial_reason_summary="Some reason",
        )

        assert result.startswith("[Appeal letter generation failed")

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", create=True)
    def test_very_short_response(self, mock_boto3):
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": "Short."}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

        result = generate_appeal_letter(
            carc_codes=["CO-45"],
            rarc_codes=[],
            payer_name="Aetna",
            cpt_codes=["99213"],
            service_date="2024-01-15",
            appeal_level=1,
            denial_reason_summary="Some reason",
        )

        assert result.startswith("[Appeal letter generation failed")

    def test_missing_boto3(self):
        with mock.patch.dict(os.environ, {
            "AWS_ACCESS_KEY_ID": "test-key",
            "AWS_SECRET_ACCESS_KEY": "test-secret",
        }):
            with mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", None):
                from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

                result = generate_appeal_letter(
                    carc_codes=["CO-45"],
                    rarc_codes=[],
                    payer_name="Aetna",
                    cpt_codes=["99213"],
                    service_date="2024-01-15",
                    appeal_level=1,
                    denial_reason_summary="Some reason",
                )

                assert result.startswith("[Appeal letter generation failed")


class TestGenerateAppealLetterEdgeCases:
    """Test edge cases and input handling."""

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", create=True)
    def test_empty_inputs(self, mock_boto3):
        letter_text = "Generic appeal letter with minimal information. " * 10
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": letter_text}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

        result = generate_appeal_letter(
            carc_codes=[],
            rarc_codes=[],
            payer_name="",
            cpt_codes=[],
            service_date="",
            appeal_level=1,
            denial_reason_summary="",
        )

        assert len(result) > 50

        call_args = mock_client.invoke_model.call_args
        body = json.loads(call_args[1]["body"])
        assert "Unknown" in body["messages"][0]["content"]
        assert "None" in body["messages"][0]["content"]

    @mock.patch.dict(os.environ, {
        "AWS_ACCESS_KEY_ID": "test-key",
        "AWS_SECRET_ACCESS_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @mock.patch("sm_billing.sm_billing.appeal_letter_generator.boto3", create=True)
    def test_none_denial_reason(self, mock_boto3):
        letter_text = "Appeal letter for claim with unspecified denial. " * 10
        mock_body = mock.MagicMock()
        mock_body.read.return_value = json.dumps({
            "content": [{"text": letter_text}],
        }).encode()
        mock_client = mock.MagicMock()
        mock_client.invoke_model.return_value = {"body": mock_body}
        mock_boto3.client.return_value = mock_client

        from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

        result = generate_appeal_letter(
            carc_codes=["CO-45"],
            rarc_codes=[],
            payer_name="Aetna",
            cpt_codes=["99213"],
            service_date="2024-01-15",
            appeal_level=1,
            denial_reason_summary=None,
        )

        assert len(result) > 50

    def test_fallback_includes_denial_reason_when_none(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            os.environ.pop("AWS_ACCESS_KEY_ID", None)
            os.environ.pop("AWS_SECRET_ACCESS_KEY", None)

            from sm_billing.sm_billing.appeal_letter_generator import generate_appeal_letter

            result = generate_appeal_letter(
                carc_codes=[],
                rarc_codes=[],
                payer_name="",
                cpt_codes=[],
                service_date="",
                appeal_level=1,
                denial_reason_summary=None,
            )

            assert "Not specified" in result
