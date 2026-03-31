"""Tests for register_sm_apps.py provisioning script."""
import sys
import os
from unittest.mock import MagicMock, patch, call

import pytest

# Add scripts directory to path for import
sys.path.insert(0, os.path.join(
    os.path.dirname(__file__), '..', '..', 'frappe-apps', 'sm_provisioning', 'scripts'
))


def test_importable():
    """Script is importable and has correct interface."""
    from register_sm_apps import register_sm_apps, DEFAULT_SM_APPS
    assert callable(register_sm_apps)
    assert len(DEFAULT_SM_APPS) == 3
    assert 'sm_widgets' in DEFAULT_SM_APPS
    assert 'sm_connectors' in DEFAULT_SM_APPS
    assert 'sm_provisioning' in DEFAULT_SM_APPS


@pytest.fixture
def mock_frappe():
    """Mock frappe module for testing outside Frappe bench."""
    mock = MagicMock()
    mock.db.exists = MagicMock()
    mock.db.commit = MagicMock()
    mock.init = MagicMock()
    mock.connect = MagicMock()
    mock.destroy = MagicMock()
    mock.get_doc = MagicMock()
    with patch.dict('sys.modules', {'frappe': mock}):
        yield mock


def test_idempotent(mock_frappe):
    """Does not double-register apps that already exist."""
    mock_frappe.db.exists.return_value = True

    from register_sm_apps import register_sm_apps
    registered, already_present = register_sm_apps('test.sparkmojo.com')

    assert len(registered) == 0
    assert len(already_present) == 3
    mock_frappe.get_doc.assert_not_called()
    mock_frappe.db.commit.assert_called_once()


def test_registers_missing_apps(mock_frappe):
    """Registers apps that are not yet in tabInstalled Application."""
    def exists_side_effect(doctype, name):
        return name != 'sm_widgets'

    mock_frappe.db.exists.side_effect = exists_side_effect
    mock_doc = MagicMock()
    mock_frappe.get_doc.return_value = mock_doc

    from register_sm_apps import register_sm_apps
    registered, already_present = register_sm_apps('test.sparkmojo.com')

    assert 'sm_widgets' in registered
    assert len(registered) == 1
    assert len(already_present) == 2
    mock_frappe.get_doc.assert_called_once()
    mock_doc.insert.assert_called_once_with(ignore_permissions=True)


def test_custom_app_list(mock_frappe):
    """Custom app list is respected instead of defaults."""
    mock_frappe.db.exists.return_value = False
    mock_doc = MagicMock()
    mock_frappe.get_doc.return_value = mock_doc

    from register_sm_apps import register_sm_apps
    registered, already_present = register_sm_apps(
        'test.sparkmojo.com', apps=['sm_widgets']
    )

    assert registered == ['sm_widgets']
    assert len(already_present) == 0
    assert mock_frappe.get_doc.call_count == 1
