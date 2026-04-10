"""Unit tests for SMDenial — runs outside Frappe bench."""

import os
import sys
import types
from datetime import date, timedelta
from unittest import mock

import pytest

# ---------------------------------------------------------------------------
# Build a minimal frappe mock so sm_denial.py can be imported without the
# full Frappe framework.
# ---------------------------------------------------------------------------

frappe_mock = types.ModuleType("frappe")


class _ValidationError(Exception):
    pass


frappe_mock.ValidationError = _ValidationError


def _throw(msg, exc=None):
    raise (exc or Exception)(msg)


frappe_mock.throw = _throw

# frappe.utils
frappe_utils = types.ModuleType("frappe.utils")
frappe_utils.getdate = lambda d: d if isinstance(d, date) else date.fromisoformat(str(d))
frappe_utils.today = lambda: "2026-04-10"
frappe_mock.utils = frappe_utils

# frappe.log_error / frappe.get_traceback
frappe_mock.log_error = mock.MagicMock()
frappe_mock.get_traceback = lambda: "mock traceback"

# frappe.get_doc — capture the last created doc
_created_docs = []


def _get_doc(data):
    _created_docs.append(data)
    m = mock.MagicMock()
    m.insert = mock.MagicMock(return_value=m)
    return m


frappe_mock.get_doc = _get_doc

# frappe.model.document.Document
frappe_model = types.ModuleType("frappe.model")
frappe_model_document = types.ModuleType("frappe.model.document")


class _Document:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


frappe_model_document.Document = _Document
frappe_model.document = frappe_model_document

# Register in sys.modules BEFORE importing sm_denial
sys.modules["frappe"] = frappe_mock
sys.modules["frappe.utils"] = frappe_utils
sys.modules["frappe.model"] = frappe_model
sys.modules["frappe.model.document"] = frappe_model_document

# Add the directory containing sm_denial.py to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sm_denial import SMDenial, APPEAL_WINDOW_DAYS  # noqa: E402


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_denial(**overrides):
    """Return an SMDenial-like object with sensible defaults."""
    defaults = dict(
        name="DEN-2026.04-.0001",
        claim="CLM-2026-0001",
        denial_date=date(2026, 4, 10),
        carc_codes=[{"carc_code": "CO-45", "carc_description": ""}],
        rarc_codes=[],
        denial_reason_summary="Denial reason: CO-45",
        appeal_deadline=None,
        ai_category="pending",
        ai_appealable=0,
        ai_action="",
        ai_confidence=0.0,
    )
    defaults.update(overrides)
    denial = SMDenial.__new__(SMDenial)
    for k, v in defaults.items():
        setattr(denial, k, v)
    return denial


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSMDenialValidation:
    """Test validate() — requires at least one CARC code."""

    def test_validate_with_carc_codes_passes(self):
        denial = _make_denial()
        # Should not raise
        denial.validate()

    def test_validate_empty_carc_codes_raises(self):
        denial = _make_denial(carc_codes=[])
        with pytest.raises(_ValidationError, match="At least one CARC code"):
            denial.validate()

    def test_validate_none_carc_codes_raises(self):
        denial = _make_denial(carc_codes=None)
        with pytest.raises(_ValidationError, match="At least one CARC code"):
            denial.validate()


class TestSMDenialAppealDeadline:
    """Test before_save() — appeal_deadline = denial_date + 90 days."""

    def test_appeal_deadline_computed(self):
        denial = _make_denial(denial_date=date(2026, 4, 10))
        denial.before_save()
        expected = date(2026, 4, 10) + timedelta(days=90)
        assert denial.appeal_deadline == expected
        # Acceptance criteria: 2026-04-10 + 90 days = 2026-07-09
        assert denial.appeal_deadline == date(2026, 7, 9)

    def test_appeal_deadline_with_different_date(self):
        denial = _make_denial(denial_date=date(2026, 1, 1))
        denial.before_save()
        assert denial.appeal_deadline == date(2026, 4, 1)

    def test_appeal_deadline_no_denial_date_skips(self):
        denial = _make_denial(denial_date=None)
        denial.before_save()
        assert denial.appeal_deadline is None

    def test_appeal_window_constant_is_90(self):
        assert APPEAL_WINDOW_DAYS == 90


class TestSMDenialWorkboardTask:
    """Test after_insert() / _create_workboard_task() — creates SM Task."""

    def setup_method(self):
        _created_docs.clear()
        frappe_mock.log_error.reset_mock()

    def test_workboard_task_created_on_insert(self):
        denial = _make_denial(
            appeal_deadline=date(2026, 7, 9),
        )
        denial.after_insert()

        # Find the SM Task creation call
        task_docs = [d for d in _created_docs if d.get("doctype") == "SM Task"]
        assert len(task_docs) == 1
        task = task_docs[0]
        assert task["title"] == "Review denied claim: CLM-2026-0001"
        assert task["task_type"] == "denial_review"
        assert task["task_mode"] == "watching"
        assert task["source_system"] == "Healthcare Billing Mojo"
        assert task["source_object_id"] == "DEN-2026.04-.0001"
        assert task["assigned_role"] == "Billing Coordinator"
        assert task["due_at"] == date(2026, 7, 9)
        assert task["executor_type"] == "Human"

    def test_task_priority_high_within_14_days(self):
        # appeal_deadline < 14 days from today (2026-04-10)
        denial = _make_denial(
            appeal_deadline=date(2026, 4, 20),  # 10 days away
        )
        denial.after_insert()
        task_docs = [d for d in _created_docs if d.get("doctype") == "SM Task"]
        assert task_docs[0]["priority"] == "High"

    def test_task_priority_normal_beyond_14_days(self):
        denial = _make_denial(
            appeal_deadline=date(2026, 7, 9),  # 90 days away
        )
        denial.after_insert()
        task_docs = [d for d in _created_docs if d.get("doctype") == "SM Task"]
        assert task_docs[0]["priority"] == "Normal"

    def test_task_creation_failure_logged_not_raised(self):
        # Simulate get_doc raising an exception
        original_get_doc = frappe_mock.get_doc
        frappe_mock.get_doc = mock.MagicMock(side_effect=Exception("SM Task not found"))

        denial = _make_denial(appeal_deadline=date(2026, 7, 9))
        # Should not raise
        denial.after_insert()
        # Should log the error
        frappe_mock.log_error.assert_called_once()

        frappe_mock.get_doc = original_get_doc
