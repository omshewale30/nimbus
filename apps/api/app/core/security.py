"""Bearer-token validation via Microsoft Graph introspection.

The frontend acquires access tokens scoped to Microsoft Graph (`User.Read`),
not to this API. Such tokens are audienced for Graph and Microsoft does not
publish a stable, third-party-verifiable JWT format for them — access tokens
for a resource you don't own are meant to be treated as opaque. So rather
than decoding the token locally, we ask Microsoft Graph to vouch for it: a
200 from `GET /v1.0/me` using the token as a bearer credential proves the
token is genuine, and Graph's response gives us the caller's identity
directly.

`AUTH_MODE=disabled` (LOCAL/TEST ONLY) bypasses validation entirely and
returns a fake dev principal. It logs a warning on every request so it can
never be mistaken for a secure configuration.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import httpx

from app.core.config import Settings
from app.core.errors import UnauthorizedError, UpstreamServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)

_GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"
_GRAPH_TIMEOUT_SECONDS = 5.0


@dataclass
class Principal:
    """The authenticated caller, normalized from the Graph profile."""

    subject: str
    name: str
    email: str
    roles: list[str] = field(default_factory=list)
    groups: list[str] = field(default_factory=list)
    is_dev_principal: bool = False

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def in_group(self, group_id: str) -> bool:
        return bool(group_id) and group_id in self.groups


def _dev_principal() -> Principal:
    logger.warning(
        "AUTH_MODE=disabled: returning a FAKE development principal. "
        "This is UNSAFE and must never be used outside local development."
    )
    return Principal(
        subject="dev-user",
        name="Local Developer",
        email="dev@localhost",
        roles=["user", "admin"],
        groups=["local-dev-admins"],
        is_dev_principal=True,
    )


def _extract_principal(profile: dict) -> Principal:
    # Graph's /me response has no app-role or group-membership claims — those
    # require separate calls and scopes. See module docstring for the gap
    # this leaves in role/group-based authorization.
    return Principal(
        subject=profile.get("id", "unknown"),
        name=profile.get("displayName", ""),
        email=profile.get("mail") or profile.get("userPrincipalName", ""),
    )


def validate_token(token: str, settings: Settings) -> Principal:
    """Validate a bearer token and return the caller principal.

    Raises `UnauthorizedError` on any validation failure.
    """
    if settings.auth_disabled:
        return _dev_principal()

    if not settings.azure_tenant_id:
        raise UnauthorizedError("Auth is enabled but AZURE_TENANT_ID is not configured")

    if not token:
        raise UnauthorizedError("Missing bearer token")

    try:
        response = httpx.get(
            _GRAPH_ME_URL,
            headers={"Authorization": f"Bearer {token}"},
            timeout=_GRAPH_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        logger.warning("Microsoft Graph unreachable during token validation: %s", exc)
        raise UpstreamServiceError("Could not reach Microsoft Graph to verify token") from exc

    if response.status_code == 401:
        logger.info("Token validation failed: Microsoft Graph rejected the token")
        raise UnauthorizedError("Invalid or expired access token")
    if response.status_code != 200:
        logger.warning(
            "Microsoft Graph returned unexpected status %s during token validation",
            response.status_code,
        )
        raise UpstreamServiceError("Could not verify token with Microsoft Graph")

    return _extract_principal(response.json())
