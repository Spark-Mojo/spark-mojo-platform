"""Tests for the secrets_loader helper (SEC-001)."""

import pytest

from secrets_loader import SecretNotFoundError, read_secret


@pytest.fixture(autouse=True)
def _clear_secret_env(monkeypatch):
    monkeypatch.delenv("SECRETS_DIR", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)


def test_reads_from_secrets_dir_and_strips_trailing_newline(monkeypatch, tmp_path):
    (tmp_path / "google_client_secret").write_text("abc\n")
    monkeypatch.setenv("SECRETS_DIR", str(tmp_path))

    assert read_secret("google_client_secret") == "abc"


def test_raises_when_secrets_dir_set_but_file_missing(monkeypatch, tmp_path):
    monkeypatch.setenv("SECRETS_DIR", str(tmp_path))

    with pytest.raises(SecretNotFoundError) as exc_info:
        read_secret("google_client_secret")

    assert "google_client_secret" in str(exc_info.value)


def test_falls_back_to_uppercase_env_var_when_secrets_dir_unset(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "xyz")

    assert read_secret("google_client_secret") == "xyz"


def test_raises_when_neither_secrets_dir_nor_env_var_set():
    with pytest.raises(SecretNotFoundError):
        read_secret("google_client_secret")
