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

# frappe.utils.now_datetime
frappe_utils = types.ModuleType("frappe.utils")
_FAKE_NOW = datetime(2026, 4, 6, 12, 0, 0)
frappe_utils.now_datetime = lambda: _FAKE_NOW
frappe_mock.utils = frappe_utils

# frappe.get_doc — returns a mock doc whose .insert() we can inspect
_last_state_log = {}

def _get_doc(data):
    _last_state_log.clear()
    _last_state_log.update(data)
    m = mock.MagicMock()
    m.insert = mock.MagicMock()
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
