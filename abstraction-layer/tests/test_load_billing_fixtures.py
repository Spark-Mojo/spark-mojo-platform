"""Tests for the billing fixture loader script."""

import json
import os
import sys
import tempfile

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.load_billing_fixtures import build_session, load_fixtures, upsert_item


SAMPLE_RECORD = {
    "doctype": "Item",
    "item_code": "MOJO-ACCT-ACCESS",
    "item_name": "Account Billing - Access",
    "item_group": "Mojo: Account Billing",
    "stock_uom": "Nos",
    "is_stock_item": 0,
    "is_service_item": 1,
    "description": "Platform access billing item",
    "sm_mojo_id": "sm_account_billing",
    "sm_action_id": "access",
    "sm_billing_type": "Per-Seat (Staff)",
    "sm_included_units": 0,
    "sm_commission_eligible": 1,
    "sm_invoice_line_label": "Platform Access",
}


def _make_fixture_dir(records_list, subdir="ACCT-TEST"):
    """Create a temp stories dir with a billing-fixture.json."""
    tmpdir = tempfile.mkdtemp()
    story_dir = os.path.join(tmpdir, subdir)
    os.makedirs(story_dir)
    fixture_path = os.path.join(story_dir, "billing-fixture.json")
    with open(fixture_path, "w") as f:
        json.dump(records_list, f)
    return tmpdir


class TestMissingAuth:
    def test_missing_api_key(self, monkeypatch, capsys):
        monkeypatch.delenv("ADMIN_FRAPPE_API_KEY", raising=False)
        monkeypatch.delenv("ADMIN_FRAPPE_API_SECRET", raising=False)
        result = load_fixtures("/tmp/nonexistent", "admin.sparkmojo.com", False)
        assert result == 1

    def test_missing_api_secret(self, monkeypatch, capsys):
        monkeypatch.setenv("ADMIN_FRAPPE_API_KEY", "test-key")
        monkeypatch.delenv("ADMIN_FRAPPE_API_SECRET", raising=False)
        result = load_fixtures("/tmp/nonexistent", "admin.sparkmojo.com", False)
        assert result == 1


class TestDryRun:
    def test_dry_run_no_api_calls(self, monkeypatch, capsys):
        monkeypatch.setenv("ADMIN_FRAPPE_API_KEY", "test-key")
        monkeypatch.setenv("ADMIN_FRAPPE_API_SECRET", "test-secret")
        tmpdir = _make_fixture_dir([SAMPLE_RECORD])
        result = load_fixtures(tmpdir, "admin.sparkmojo.com", dry_run=True)
        assert result == 0
        captured = capsys.readouterr()
        assert "upserted 1 items" in captured.out

    def test_dry_run_multiple_records(self, monkeypatch, capsys):
        monkeypatch.setenv("ADMIN_FRAPPE_API_KEY", "test-key")
        monkeypatch.setenv("ADMIN_FRAPPE_API_SECRET", "test-secret")
        records = [
            {**SAMPLE_RECORD, "item_code": "MOJO-TEST-001"},
            {**SAMPLE_RECORD, "item_code": "MOJO-TEST-002"},
        ]
        tmpdir = _make_fixture_dir(records)
        result = load_fixtures(tmpdir, "admin.sparkmojo.com", dry_run=True)
        assert result == 0
        captured = capsys.readouterr()
        assert "upserted 2 items" in captured.out


class TestNoFixtures:
    def test_empty_dir(self, monkeypatch, capsys):
        monkeypatch.setenv("ADMIN_FRAPPE_API_KEY", "test-key")
        monkeypatch.setenv("ADMIN_FRAPPE_API_SECRET", "test-secret")
        tmpdir = tempfile.mkdtemp()
        result = load_fixtures(tmpdir, "admin.sparkmojo.com", False)
        assert result == 0
        captured = capsys.readouterr()
        assert "Processed 0 fixtures" in captured.out


class TestUpsertItem:
    def test_missing_item_code(self):
        result = upsert_item(None, {"doctype": "Item"}, dry_run=False, source_path="test.json")
        assert result == "failed"

    def test_dry_run_skips_api(self):
        result = upsert_item(None, SAMPLE_RECORD, dry_run=True, source_path="test.json")
        assert result == "dry_run"

    def test_create_new_item(self, monkeypatch):
        transport = httpx.MockTransport(lambda req: _mock_handler_create(req))
        client = httpx.Client(transport=transport, base_url="https://admin.sparkmojo.com")
        result = upsert_item(client, SAMPLE_RECORD, dry_run=False, source_path="test.json")
        assert result == "upserted"
        client.close()

    def test_update_existing_item(self, monkeypatch):
        transport = httpx.MockTransport(lambda req: _mock_handler_update(req))
        client = httpx.Client(transport=transport, base_url="https://admin.sparkmojo.com")
        result = upsert_item(client, SAMPLE_RECORD, dry_run=False, source_path="test.json")
        assert result == "upserted"
        client.close()

    def test_api_error_returns_failed(self):
        transport = httpx.MockTransport(lambda req: httpx.Response(500, json={"error": "server error"}))
        client = httpx.Client(transport=transport, base_url="https://admin.sparkmojo.com")
        result = upsert_item(client, SAMPLE_RECORD, dry_run=False, source_path="test.json")
        assert result == "failed"
        client.close()


class TestBadFixtureFiles:
    def test_invalid_json(self, monkeypatch, capsys):
        monkeypatch.setenv("ADMIN_FRAPPE_API_KEY", "test-key")
        monkeypatch.setenv("ADMIN_FRAPPE_API_SECRET", "test-secret")
        tmpdir = tempfile.mkdtemp()
        story_dir = os.path.join(tmpdir, "BAD-STORY")
        os.makedirs(story_dir)
        with open(os.path.join(story_dir, "billing-fixture.json"), "w") as f:
            f.write("{not valid json")
        result = load_fixtures(tmpdir, "admin.sparkmojo.com", dry_run=True)
        assert result == 1

    def test_not_array(self, monkeypatch, capsys):
        monkeypatch.setenv("ADMIN_FRAPPE_API_KEY", "test-key")
        monkeypatch.setenv("ADMIN_FRAPPE_API_SECRET", "test-secret")
        tmpdir = tempfile.mkdtemp()
        story_dir = os.path.join(tmpdir, "BAD-STORY")
        os.makedirs(story_dir)
        with open(os.path.join(story_dir, "billing-fixture.json"), "w") as f:
            json.dump({"not": "an array"}, f)
        result = load_fixtures(tmpdir, "admin.sparkmojo.com", dry_run=True)
        assert result == 1


class TestBuildSession:
    def test_builds_with_auth_header(self):
        client = build_session("admin.sparkmojo.com", "mykey", "mysecret")
        assert client.headers["authorization"] == "token mykey:mysecret"
        assert str(client.base_url) == "https://admin.sparkmojo.com"
        client.close()


def _mock_handler_create(request: httpx.Request) -> httpx.Response:
    if request.method == "GET":
        return httpx.Response(404, json={"exc_type": "DoesNotExistError"})
    if request.method == "POST":
        return httpx.Response(200, json={"data": {"name": "MOJO-ACCT-ACCESS"}})
    return httpx.Response(405)


def _mock_handler_update(request: httpx.Request) -> httpx.Response:
    if request.method == "GET":
        return httpx.Response(200, json={"data": {"name": "MOJO-ACCT-ACCESS"}})
    if request.method == "PUT":
        return httpx.Response(200, json={"data": {"name": "MOJO-ACCT-ACCESS"}})
    return httpx.Response(405)
