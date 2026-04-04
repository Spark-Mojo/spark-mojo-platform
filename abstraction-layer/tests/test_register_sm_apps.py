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
    # sm_connectors excluded — empty placeholder, not a real Frappe app yet
    assert len(DEFAULT_SM_APPS) == 2
    assert 'sm_widgets' in DEFAULT_SM_APPS
    assert 'sm_provisioning' in DEFAULT_SM_APPS


@pytest.fixture
def mock_frappe():
    """Mock frappe module for testing outside Frappe bench."""
    mock = MagicMock()
    mock.db.sql = MagicMock()
    mock.db.commit = MagicMock()
    mock.init = MagicMock()
    mock.connect = MagicMock()
    mock.destroy = MagicMock()
    mock.is_setup_complete = MagicMock(return_value=True)
    mock.generate_hash = MagicMock(return_value='abc1234567')
    with patch.dict('sys.modules', {'frappe': mock}):
        yield mock


def test_idempotent(mock_frappe):
    """Does not double-register apps that already exist."""
    # frappe.db.sql returns non-empty result when app exists
    mock_frappe.db.sql.return_value = [{'name': 'existing'}]

    from register_sm_apps import register_sm_apps
    registered, already_present = register_sm_apps('test.sparkmojo.com')

    assert len(registered) == 0
    assert len(already_present) == 2
    mock_frappe.db.commit.assert_called()


def test_registers_missing_apps(mock_frappe):
    """Registers apps that are not yet in tabInstalled Application."""
    def sql_side_effect(query, *args, **kwargs):
        if 'SELECT name FROM' in query and args and args[0] == 'sm_widgets':
            return []  # sm_widgets not registered
        if 'SELECT name FROM' in query:
            return [{'name': 'existing'}]  # others registered
        return None

    mock_frappe.db.sql.side_effect = sql_side_effect

    from register_sm_apps import register_sm_apps
    registered, already_present = register_sm_apps('test.sparkmojo.com')

    assert 'sm_widgets' in registered
    assert len(registered) == 1
    assert len(already_present) == 1


def test_custom_app_list(mock_frappe):
    """Custom app list is respected instead of defaults."""
    mock_frappe.db.sql.return_value = []  # nothing registered

    from register_sm_apps import register_sm_apps
    registered, already_present = register_sm_apps(
        'test.sparkmojo.com', apps=['sm_widgets']
    )

    assert registered == ['sm_widgets']
    assert len(already_present) == 0
