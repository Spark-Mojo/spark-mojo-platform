"""Tests for the sm_admin service account provisioning script."""

import sys
import os
from unittest.mock import MagicMock, patch

import pytest

# Add the scripts directory to sys.path so we can import the script
SCRIPTS_DIR = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "frappe-apps",
    "sm_provisioning",
    "scripts",
)
sys.path.insert(0, os.path.abspath(SCRIPTS_DIR))


def test_script_importable():
    """Script can be imported without error and exposes the expected interface."""
    from create_admin_service_account import (
        create_admin_service_account,
        generate_password,
    )

    assert callable(create_admin_service_account)
    assert callable(generate_password)


def test_generate_password_default_length():
    """generate_password() returns a 32-char alphanumeric string by default."""
    from create_admin_service_account import generate_password

    pwd = generate_password()
    assert len(pwd) == 32
    assert pwd.isalnum()


def test_generate_password_custom_length():
    """generate_password(length=N) returns exactly N characters."""
    from create_admin_service_account import generate_password

    for length in [8, 16, 64]:
        pwd = generate_password(length=length)
        assert len(pwd) == length
        assert pwd.isalnum()


def test_generate_password_uniqueness():
    """Two calls should produce different passwords (with overwhelming probability)."""
    from create_admin_service_account import generate_password

    passwords = {generate_password() for _ in range(10)}
    assert len(passwords) == 10


@patch.dict("sys.modules", {"frappe": MagicMock()})
def test_idempotent_when_role_and_user_exist():
    """When role and user both exist, no insert should be called."""
    import importlib

    frappe_mock = sys.modules["frappe"]
    frappe_mock.db.exists.return_value = True

    import create_admin_service_account as mod

    importlib.reload(mod)

    mod.create_admin_service_account("test.sparkmojo.com")

    frappe_mock.init.assert_called_once_with(site="test.sparkmojo.com")
    frappe_mock.connect.assert_called_once()
    frappe_mock.get_doc.assert_not_called()
    frappe_mock.destroy.assert_called_once()


@patch.dict("sys.modules", {"frappe": MagicMock()})
def test_creates_role_and_user_when_missing():
    """When neither role nor user exists, both should be created."""
    import importlib

    frappe_mock = sys.modules["frappe"]
    frappe_mock.db.exists.return_value = False

    mock_role = MagicMock()
    mock_user = MagicMock()
    frappe_mock.get_doc.side_effect = [mock_role, mock_user]

    import create_admin_service_account as mod

    importlib.reload(mod)

    mod.create_admin_service_account("test.sparkmojo.com")

    assert frappe_mock.get_doc.call_count == 2
    mock_role.insert.assert_called_once_with(ignore_permissions=True)
    mock_user.insert.assert_called_once_with(ignore_permissions=True)
    assert frappe_mock.db.commit.call_count == 2
    frappe_mock.destroy.assert_called_once()
