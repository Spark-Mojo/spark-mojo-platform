"""Unit tests for SMAppeal — runs outside Frappe bench."""

import os
import sys
import types
from datetime import date
from unittest import mock

import pytest

# ---------------------------------------------------------------------------
# Build a minimal frappe mock so sm_appeal.py can be imported without the
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
frappe_utils.now_datetime = lambda: "2026-04-10 12:00:00"
frappe_mock.utils = frappe_utils

# frappe.session
frappe_session = types.SimpleNamespace(user="Administrator")
frappe_mock.session = frappe_session

# frappe.log_error / frappe.get_traceback
frappe_mock.log_error = mock.MagicMock()
frappe_mock.get_traceback = lambda: "mock traceback"

# frappe.db
frappe_db = types.SimpleNamespace()
frappe_db.exists = mock.MagicMock(return_value=False)
frappe_db.set_value = mock.MagicMock()
frappe_db.commit = mock.MagicMock()
frappe_mock.db = frappe_db

# frappe.get_doc — capture created docs and allow mock control
_created_docs = []
_get_doc_side_effect = None


def _get_doc(data_or_doctype, name=None):
    global _get_doc_side_effect
    if _get_doc_side_effect:
        return _get_doc_side_effect(data_or_doctype, name)
    if isinstance(data_or_doctype, dict):
        _created_docs.append(data_or_doctype)
        m = mock.MagicMock()
        m.insert = mock.MagicMock(return_value=m)
        return m
    # Return a mock document for get_doc("DocType", name)
    m = mock.MagicMock()
    m.name = name
    return m


frappe_mock.get_doc = _get_doc

# frappe.model.document.Document
frappe_model = types.ModuleType("frappe.model")
frappe_model_document = types.ModuleType("frappe.model.document")


class _Document:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    def is_new(self):
        return not hasattr(self, "_saved") or self._saved is False


frappe_model_document.Document = _Document
frappe_model.document = frappe_model_document

# Save any pre-existing sys.modules entries so bench run-tests can find the
# real frappe after import. bench uses unittest.TestLoader (not pytest), so
# fixtures never fire — we must restore synchronously at module level.
_saved_modules = {
    k: sys.modules.get(k)
    for k in ["frappe", "frappe.utils", "frappe.model", "frappe.model.document"]
}

# Register in sys.modules BEFORE importing sm_appeal
sys.modules["frappe"] = frappe_mock
sys.modules["frappe.utils"] = frappe_utils
sys.modules["frappe.model"] = frappe_model
sys.modules["frappe.model.document"] = frappe_model_document

# Add the directory containing sm_appeal.py to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sm_appeal import SMAppeal  # noqa: E402

# Restore sys.modules immediately after importing SMAppeal.
#
# Why this works:
#   sm_appeal.py's module-level "import frappe" already bound the mock to the
#   sm_appeal module's own 'frappe' name at import time. That binding persists
#   regardless of what sys.modules["frappe"] points to afterwards — so every
#   SMAppeal method still calls through the mock, and all tests pass.
#
# Why this is necessary:
#   bench run-tests uses unittest.TestLoader to discover tests. It imports this
#   file (running all module-level code) then calls loadTestsFromModule(), which
#   returns zero unittest.TestCase instances. bench then calls
#   _cleanup_after_tests(), which triggers validate_doctype() ->
#   "from frappe import _, throw". Without restoration the mock is still in
#   sys.modules and that import fails:
#     ImportError: cannot import name '_' from 'frappe' (unknown location)
for _key, _val in _saved_modules.items():
    if _val is not None:
        sys.modules[_key] = _val
    else:
        sys.modules.pop(_key, None)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_appeal(**overrides):
    """Return an SMAppeal-like object with sensible defaults."""
    defaults = dict(
        name="APL-2026.04-.0001",
        claim="CLM-2026-0001",
        denial="DEN-2026.04-.0001",
        appeal_level="1",
        payer_deadline=date(2026, 7, 9),
        days_until_deadline=None,
        appeal_letter=None,
        supporting_docs=None,
        result="pending",
        result_date=None,
        result_notes=None,
        submitted_date=None,
        _saved=False,
    )
    defaults.update(overrides)
    appeal = SMAppeal.__new__(SMAppeal)
    for k, v in defaults.items():
        setattr(appeal, k, v)
    return appeal


def _make_claim_doc(canonical_state="denied"):
    """Return a mock SM Claim document."""
    doc = mock.MagicMock()
    doc.name = "CLM-2026-0001"
    doc.canonical_state = canonical_state
    doc.transition_state = mock.MagicMock()
    doc.save = mock.MagicMock()
    return doc


def _make_denial_doc(appeal_deadline=None):
    """Return a mock SM Denial document."""
    doc = mock.MagicMock()
    doc.name = "DEN-2026.04-.0001"
    doc.appeal_deadline = appeal_deadline
    return doc


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSMAppealValidation:
    """Test validate() — level-2 requires lost level-1, past deadline warning."""

    def setup_method(self):
        frappe_db.exists.reset_mock()
        frappe_db.exists.return_value = False

    def test_level_1_validates_without_prior(self):
        appeal = _make_appeal(appeal_level="1")
        # Should not raise
        appeal.validate()

    def test_level_2_without_lost_level_1_raises(self):
        frappe_db.exists.return_value = False
        appeal = _make_appeal(appeal_level="2")
        with pytest.raises(_ValidationError, match="Level 2 appeal requires a lost level 1 appeal"):
            appeal.validate()

    def test_level_2_with_lost_level_1_passes(self):
        frappe_db.exists.return_value = True
        appeal = _make_appeal(appeal_level="2")
        # Should not raise
        appeal.validate()

    def test_past_deadline_warns_but_does_not_raise(self):
        appeal = _make_appeal(payer_deadline=date(2026, 4, 1))  # in the past
        # Should not raise
        appeal.validate()


class TestSMAppealBeforeInsert:
    """Test before_insert() — pull payer_deadline from SM Denial."""

    def test_pulls_deadline_from_denial(self):
        global _get_doc_side_effect
        denial_doc = _make_denial_doc(appeal_deadline=date(2026, 7, 9))
        _get_doc_side_effect = lambda dt, name: denial_doc if dt == "SM Denial" else mock.MagicMock()

        appeal = _make_appeal(payer_deadline=None)
        appeal.before_insert()
        assert appeal.payer_deadline == date(2026, 7, 9)

        _get_doc_side_effect = None

    def test_does_not_overwrite_existing_deadline(self):
        appeal = _make_appeal(payer_deadline=date(2026, 8, 1))
        appeal.before_insert()
        assert appeal.payer_deadline == date(2026, 8, 1)


class TestSMAppealAfterInsert:
    """Test after_insert() — state transition + workboard task creation."""

    def setup_method(self):
        global _get_doc_side_effect
        _created_docs.clear()
        frappe_mock.log_error.reset_mock()
        _get_doc_side_effect = None

    def test_happy_path_transitions_claim_and_creates_task(self):
        global _get_doc_side_effect
        claim_doc = _make_claim_doc(canonical_state="denied")

        def side_effect(data_or_doctype, name=None):
            if data_or_doctype == "SM Claim":
                return claim_doc
            if isinstance(data_or_doctype, dict):
                _created_docs.append(data_or_doctype)
                m = mock.MagicMock()
                m.insert = mock.MagicMock(return_value=m)
                return m
            return mock.MagicMock()

        _get_doc_side_effect = side_effect

        appeal = _make_appeal()
        appeal.after_insert()

        # Verify claim transition
        claim_doc.transition_state.assert_called_once_with(
            to_state="in_appeal",
            changed_by="Administrator",
            trigger_type="api",
            reason="Appeal created by Administrator at level 1",
        )
        claim_doc.save.assert_called_once_with(ignore_permissions=True)

        # Verify task creation
        task_docs = [d for d in _created_docs if d.get("doctype") == "SM Task"]
        assert len(task_docs) == 1
        task = task_docs[0]
        assert task["title"] == "Submit appeal for claim: CLM-2026-0001"
        assert task["task_type"] == "appeal_submission"
        assert task["task_mode"] == "active"
        assert task["source_system"] == "Healthcare Billing Mojo"
        assert task["source_object_id"] == "APL-2026.04-.0001"
        assert task["assigned_role"] == "Billing Coordinator"
        assert task["due_at"] == date(2026, 7, 9)
        assert task["executor_type"] == "Human"
        assert task["priority"] == "Normal"  # 90 days away

        _get_doc_side_effect = None

    def test_non_denied_claim_raises(self):
        global _get_doc_side_effect
        claim_doc = _make_claim_doc(canonical_state="adjudicating")

        def side_effect(data_or_doctype, name=None):
            if data_or_doctype == "SM Claim":
                return claim_doc
            return mock.MagicMock()

        _get_doc_side_effect = side_effect

        appeal = _make_appeal()
        with pytest.raises(_ValidationError, match="Cannot create appeal - claim is not in denied state"):
            appeal.after_insert()

        _get_doc_side_effect = None

    def test_task_priority_high_within_14_days(self):
        global _get_doc_side_effect
        claim_doc = _make_claim_doc(canonical_state="denied")

        def side_effect(data_or_doctype, name=None):
            if data_or_doctype == "SM Claim":
                return claim_doc
            if isinstance(data_or_doctype, dict):
                _created_docs.append(data_or_doctype)
                m = mock.MagicMock()
                m.insert = mock.MagicMock(return_value=m)
                return m
            return mock.MagicMock()

        _get_doc_side_effect = side_effect

        appeal = _make_appeal(payer_deadline=date(2026, 4, 20))  # 10 days away
        appeal.after_insert()

        task_docs = [d for d in _created_docs if d.get("doctype") == "SM Task"]
        assert task_docs[0]["priority"] == "High"

        _get_doc_side_effect = None

    def test_task_creation_failure_logged_not_raised(self):
        global _get_doc_side_effect
        claim_doc = _make_claim_doc(canonical_state="denied")

        call_count = [0]

        def side_effect(data_or_doctype, name=None):
            if data_or_doctype == "SM Claim":
                return claim_doc
            if isinstance(data_or_doctype, dict):
                call_count[0] += 1
                raise Exception("SM Task creation failed")
            return mock.MagicMock()

        _get_doc_side_effect = side_effect

        appeal = _make_appeal()
        # Should not raise — task creation failure is caught
        appeal.after_insert()
        frappe_mock.log_error.assert_called_once()

        _get_doc_side_effect = None


class TestSMAppealOnload:
    """Test onload() — computes days_until_deadline."""

    def test_computes_days_until_deadline(self):
        appeal = _make_appeal(payer_deadline=date(2026, 7, 9))
        appeal.onload()
        # 2026-07-09 - 2026-04-10 = 90 days
        assert appeal.days_until_deadline == 90

    def test_negative_days_for_past_deadline(self):
        appeal = _make_appeal(payer_deadline=date(2026, 4, 1))
        appeal.onload()
        # 2026-04-01 - 2026-04-10 = -9 days
        assert appeal.days_until_deadline == -9

    def test_no_deadline_skips(self):
        appeal = _make_appeal(payer_deadline=None)
        appeal.onload()
        # days_until_deadline should remain unchanged
        assert appeal.days_until_deadline is None


class TestSMAppealLevel2Success:
    """Test level-2 appeal with lost level-1 — full after_insert path."""

    def setup_method(self):
        global _get_doc_side_effect
        _created_docs.clear()
        frappe_mock.log_error.reset_mock()
        _get_doc_side_effect = None

    def test_level_2_with_lost_level_1_creates_task(self):
        global _get_doc_side_effect
        frappe_db.exists.return_value = True
        claim_doc = _make_claim_doc(canonical_state="denied")

        def side_effect(data_or_doctype, name=None):
            if data_or_doctype == "SM Claim":
                return claim_doc
            if isinstance(data_or_doctype, dict):
                _created_docs.append(data_or_doctype)
                m = mock.MagicMock()
                m.insert = mock.MagicMock(return_value=m)
                return m
            return mock.MagicMock()

        _get_doc_side_effect = side_effect

        appeal = _make_appeal(appeal_level="2")
        appeal.validate()  # Should pass with lost level-1 existing
        appeal.after_insert()

        # Verify task created
        task_docs = [d for d in _created_docs if d.get("doctype") == "SM Task"]
        assert len(task_docs) == 1
        assert task_docs[0]["task_type"] == "appeal_submission"

        claim_doc.transition_state.assert_called_once()

        _get_doc_side_effect = None
        frappe_db.exists.return_value = False
