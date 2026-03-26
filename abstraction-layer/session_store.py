"""
Simple in-memory session store for POC.
Replace with Redis or DB-backed sessions for production.
"""

import secrets
import time

# {token: {email, full_name, created_at}}
_sessions: dict[str, dict] = {}

SESSION_TTL = 86400  # 24 hours


def create_session(email: str, full_name: str) -> str:
    token = secrets.token_urlsafe(48)
    _sessions[token] = {
        "email": email,
        "full_name": full_name,
        "created_at": time.time(),
    }
    _cleanup()
    return token


def get_session(token: str) -> dict | None:
    session = _sessions.get(token)
    if not session:
        return None
    if time.time() - session["created_at"] > SESSION_TTL:
        del _sessions[token]
        return None
    return session


def delete_session(token: str):
    _sessions.pop(token, None)


def _cleanup():
    """Remove expired sessions."""
    now = time.time()
    expired = [k for k, v in _sessions.items() if now - v["created_at"] > SESSION_TTL]
    for k in expired:
        del _sessions[k]
