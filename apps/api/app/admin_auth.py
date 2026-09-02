"""Admin access via a single shared key — no login/account system.

The admin key is a secret configured on the API (``ADMIN_KEY`` env var) and
entered once by the operator in the client, which stores it in
``sessionStorage`` and sends it back as the ``X-Admin-Key`` header on every
admin request.
"""

import hmac
import os

from fastapi import Header, HTTPException, status


def _configured_key() -> str:
    return os.getenv("ADMIN_KEY", "")


def require_admin_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> str:
    configured = _configured_key()
    if not configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin access is not configured on this server (ADMIN_KEY is unset).",
        )
    if not x_admin_key or not hmac.compare_digest(x_admin_key, configured):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")
    return x_admin_key


def check_admin_key(candidate: str) -> bool:
    configured = _configured_key()
    return bool(configured) and hmac.compare_digest(candidate, configured)
