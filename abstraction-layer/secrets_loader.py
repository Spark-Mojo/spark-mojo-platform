import os
from pathlib import Path


class SecretNotFoundError(RuntimeError):
    pass


def read_secret(name: str) -> str:
    """Read a secret by name.

    Production: reads from $SECRETS_DIR/<name> (mounted by Docker Compose).
    Dev/test: falls back to the uppercase env var of the same name.
    """
    secrets_dir = os.environ.get("SECRETS_DIR")
    if secrets_dir:
        path = Path(secrets_dir) / name
        if path.exists():
            return path.read_text().rstrip("\n")
        raise SecretNotFoundError(f"{name} not found in {secrets_dir}")

    env_val = os.environ.get(name.upper())
    if env_val is not None:
        return env_val

    raise SecretNotFoundError(
        f"{name} not found: SECRETS_DIR unset and ${name.upper()} unset"
    )
