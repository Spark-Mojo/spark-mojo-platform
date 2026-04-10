"""Unit tests for SMClaim.transition_state() — runs outside Frappe bench."""

import os
import sys
import types
from datetime import datetime
from unittest import mock

import pytest

# Add the directory containing sm_claim.py to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Build a minimal frappe mock so sm_claim.py can be imported without the
# full Frappe framework.
# ---------------------------------------------------------------------------

frappe_mock = types.ModuleType("frappe")

# frappe.ValidationError
class _ValidationError(Exception):
    pass

frappe_mock.ValidationError = _ValidationError

# frappe.throw — raise the given exception class
def _throw(msg, exc=None):
    raise (exc or Exception)(msg)

frappe_mock.throw = _throw

# frappe.utils.now_datetime / today
frappe_utils = types.ModuleType("frappe.utils")
_FAKE_NOW = datetime(2026, 4, 6, 12, 0, 0)
frappe_utils.now_datetime = lambda: _FAKE_NOW
frappe_utils.today = lambda: "2026-04-06"
frappe_mock.utils = frappe_utils

# frappe.log_error / frappe.get_traceback / frappe.whitelist
frappe_mock.log_error = mock.MagicMock()
frappe_mock.get_traceback = lambda: "mock traceback"
frappe_mock.whitelist = lambda *args, **kwargs: (lambda fn: fn)

# frappe.get_doc — tracks all created docs
_created_docs = []
_last_state_log = {}

def _get_doc(data):
    _created_docs.append(data)
    _last_state_log.clear()
    _last_state_log.update(data)
    m = mock.MagicMock()
    m.insert = mock.MagicMock(return_value=m)
    return m

frappe_mock.get_doc = _get_doc

# frappe.model.document.Document — minimal base
frappe_model = types.ModuleType("frappe.model")
frappe_model_document = types.ModuleType("frappe.model.document")

class _Document:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

frappe_model_document.Document = _Document
frappe_model.document = frappe_model_document

# Register in sys.modules BEFORE importing sm_claim
sys.modules["frappe"] = frappe_mock
sys.modules["frappe.utils"] = frappe_utils
sys.modules["frappe.model"] = frappe_model
sys.modules["frappe.model.document"] = frappe_model_document

# Now import the module under test
from sm_claim import SMClaim, VALID_TRANSITIONS  # noqa: E402

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_claim(**overrides):
    """Return an SMClaim-like object with sensible defaults."""
    defaults = dict(
        name="CLM-2026-0001",
        canonical_state="draft",
        previous_state="",
        state_changed_at=None,
        state_changed_by="",
        paid_amount=0,
        adjustment_amount=0,
        patient_responsibility=0,
    )
    defaults.update(overrides)
    claim = SMClaim.__new__(SMClaim)
    for k, v in defaults.items():
        setattr(claim, k, v)
    return claim

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestTransitionState:
    """12 required test cases for BILL-010."""

    def test_valid_transition_draft_to_validated(self):
        claim = _make_claim()
        claim.transition_state("validated", changed_by="system", trigger_type="api")
        assert claim.canonical_state == "validated"
        assert claim.previous_state == "draft"
        assert claim.state_changed_by == "system"
        assert claim.state_changed_at == _FAKE_NOW
        assert _last_state_log["from_state"] == "draft"
        assert _last_state_log["to_state"] == "validated"
        assert _last_state_log["trigger_type"] == "api"

    def test_invalid_transition_draft_to_paid(self):
        claim = _make_claim()
        with pytest.raises(_ValidationError, match="draft -> paid is not permitted"):
            claim.transition_state("paid", changed_by="system", trigger_type="api")

    def test_unknown_to_state_banana(self):
        claim = _make_claim()
        with pytest.raises(_ValidationError, match="Unknown state: banana"):
            claim.transition_state("banana", changed_by="system", trigger_type="api")

    def test_unknown_current_state(self):
        claim = _make_claim(canonical_state="invented")
        with pytest.raises(_ValidationError, match="Unknown current state: invented"):
            claim.transition_state("draft", changed_by="system", trigger_type="api")

    def test_manual_without_reason_raises(self):
        claim = _make_claim()
        with pytest.raises(
            _ValidationError, match="reason is required for manual transitions"
        ):
            claim.transition_state(
                "validated", changed_by="user@test.com", trigger_type="manual"
            )

    def test_manual_with_reason_succeeds(self):
        claim = _make_claim()
        claim.transition_state(
            "pending_info",
            changed_by="user@test.com",
            trigger_type="manual",
            reason="correcting patient info",
        )
        assert claim.canonical_state == "pending_info"
        assert _last_state_log["reason"] == "correcting patient info"

    def test_financial_snapshot_captured(self):
        claim = _make_claim(
            paid_amount=100.00,
            adjustment_amount=10.00,
            patient_responsibility=5.00,
        )
        claim.transition_state("validated", changed_by="system", trigger_type="api")
        assert _last_state_log["paid_amount_at_change"] == 100.00
        assert _last_state_log["adjustment_amount_at_change"] == 10.00
        assert _last_state_log["patient_responsibility_at_change"] == 5.00

    def test_terminal_state_closed_blocked(self):
        claim = _make_claim(canonical_state="closed")
        with pytest.raises(
            _ValidationError, match="closed -> draft is not permitted"
        ):
            claim.transition_state("draft", changed_by="system", trigger_type="api")

    def test_terminal_state_voided_blocked(self):
        claim = _make_claim(canonical_state="voided")
        with pytest.raises(
            _ValidationError, match="voided -> draft is not permitted"
        ):
            claim.transition_state("draft", changed_by="system", trigger_type="api")

    def test_terminal_state_written_off_blocked(self):
        claim = _make_claim(canonical_state="written_off")
        with pytest.raises(
            _ValidationError, match="written_off -> draft is not permitted"
        ):
            claim.transition_state("draft", changed_by="system", trigger_type="api")

    def test_webhook_835_empty_reason_succeeds(self):
        claim = _make_claim(canonical_state="adjudicating")
        claim.transition_state(
            "paid", changed_by="webhook", trigger_type="webhook_835", reason=""
        )
        assert claim.canonical_state == "paid"

    def test_unknown_trigger_type_raises(self):
        claim = _make_claim()
        with pytest.raises(_ValidationError, match="Unknown trigger_type: fax"):
            claim.transition_state("validated", changed_by="system", trigger_type="fax")


class TestOnDenied:
    """Test _on_denied() post-transition hook — creates SM Denial record."""

    def setup_method(self):
        _created_docs.clear()
        frappe_mock.log_error.reset_mock()

    def test_denied_transition_creates_sm_denial(self):
        claim = _make_claim(canonical_state="adjudicating")
        metadata = {
            "carc_codes": "CO-45",
            "rarc_codes": "N-100",
            "denial_reason_summary": "Charges exceed fee schedule",
        }
        claim.transition_state(
            "denied",
            changed_by="webhook",
            trigger_type="webhook_835",
            metadata=metadata,
        )
        assert claim.canonical_state == "denied"
        denial_docs = [d for d in _created_docs if d.get("doctype") == "SM Denial"]
        assert len(denial_docs) == 1
        denial = denial_docs[0]
        assert denial["claim"] == "CLM-2026-0001"
        assert denial["denial_reason_summary"] == "Charges exceed fee schedule"
        assert denial["ai_category"] == "pending"
        assert len(denial["carc_codes"]) == 1
        assert denial["carc_codes"][0]["carc_code"] == "CO-45"
        assert len(denial["rarc_codes"]) == 1
        assert denial["rarc_codes"][0]["rarc_code"] == "N-100"

    def test_denied_transition_multiple_carc_codes(self):
        claim = _make_claim(canonical_state="adjudicating")
        metadata = {"carc_codes": "CO-45, PR-1, OA-23"}
        claim.transition_state(
            "denied",
            changed_by="webhook",
            trigger_type="webhook_835",
            metadata=metadata,
        )
        denial_docs = [d for d in _created_docs if d.get("doctype") == "SM Denial"]
        assert len(denial_docs[0]["carc_codes"]) == 3

    def test_denied_transition_no_carc_codes_uses_unknown(self):
        claim = _make_claim(canonical_state="adjudicating")
        claim.transition_state(
            "denied",
            changed_by="webhook",
            trigger_type="webhook_835",
            metadata={},
        )
        denial_docs = [d for d in _created_docs if d.get("doctype") == "SM Denial"]
        assert denial_docs[0]["carc_codes"][0]["carc_code"] == "UNKNOWN"

    def test_denied_transition_no_metadata_uses_defaults(self):
        claim = _make_claim(canonical_state="adjudicating")
        claim.transition_state(
            "denied",
            changed_by="webhook",
            trigger_type="webhook_835",
        )
        denial_docs = [d for d in _created_docs if d.get("doctype") == "SM Denial"]
        assert len(denial_docs) == 1
        assert denial_docs[0]["carc_codes"][0]["carc_code"] == "UNKNOWN"
        assert "Denial reason:" in denial_docs[0]["denial_reason_summary"]

    def test_denied_transition_failure_logged_not_raised(self):
        """SM Denial creation failure should be logged, not crash the transition."""
        original_get_doc = frappe_mock.get_doc
        call_count = [0]

        def _failing_get_doc(data):
            call_count[0] += 1
            # Let the state log creation succeed (first call), fail on SM Denial (second call)
            if data.get("doctype") == "SM Denial":
                raise Exception("DB error")
            return original_get_doc(data)

        frappe_mock.get_doc = _failing_get_doc

        claim = _make_claim(canonical_state="adjudicating")
        # Should not raise despite SM Denial creation failing
        claim.transition_state(
            "denied",
            changed_by="webhook",
            trigger_type="webhook_835",
        )
        assert claim.canonical_state == "denied"
        frappe_mock.log_error.assert_called_once()

        frappe_mock.get_doc = original_get_doc

    def test_non_denied_transition_does_not_create_denial(self):
        claim = _make_claim(canonical_state="adjudicating")
        claim.transition_state(
            "paid",
            changed_by="webhook",
            trigger_type="webhook_835",
        )
        denial_docs = [d for d in _created_docs if d.get("doctype") == "SM Denial"]
        assert len(denial_docs) == 0
