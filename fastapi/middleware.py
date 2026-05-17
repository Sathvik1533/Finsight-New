"""
FinSight FastAPI — Internal Secret Middleware
Validates the X-Internal-Secret header on every request.
This prevents unauthorized callers from triggering AI pipeline runs.

NOTE: Full implementation is active here.
The /health endpoint is excluded so Railway can check it without credentials.
"""
import secrets
import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

EXCLUDED_PATHS: set[str] = {
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class InternalSecretMiddleware(BaseHTTPMiddleware):
    """
    Validates X-Internal-Secret header on every non-excluded request.
    Uses secrets.compare_digest() to prevent timing attacks.
    A timing attack could allow an attacker to guess the secret
    character-by-character based on response time differences.
    compare_digest() takes constant time regardless of how much matches.
    """

    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        provided_secret = request.headers.get("X-Internal-Secret", "")
        expected_secret = os.environ["FASTAPI_SECRET_KEY"]

        # Both must be non-empty before comparison
        if not provided_secret or not secrets.compare_digest(
            provided_secret.encode("utf-8"),
            expected_secret.encode("utf-8"),
        ):
            raise HTTPException(status_code=401, detail="Unauthorized")

        return await call_next(request)
