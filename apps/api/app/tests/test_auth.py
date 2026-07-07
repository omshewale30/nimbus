"""Auth utility tests that need no network / signing keys."""
import httpx
import pytest
from pydantic import ValidationError

from app.core.config import AuthMode, Settings
from app.core.errors import ForbiddenError, UnauthorizedError, UpstreamServiceError
from app.core.security import Principal, _extract_principal, _GRAPH_ME_URL, validate_token
from app.services.identity.current_user import require_admin


def test_disabled_mode_returns_dev_admin_principal():
    settings = Settings(auth_mode=AuthMode.disabled)
    principal = validate_token("", settings)
    assert principal.is_dev_principal is True
    assert principal.has_role("admin")


def test_extract_principal_maps_graph_profile():
    principal = _extract_principal(
        {
            "id": "abc-123",
            "displayName": "Ada Lovelace",
            "mail": "ada@contoso.com",
        }
    )
    assert principal.subject == "abc-123"
    assert principal.name == "Ada Lovelace"
    assert principal.email == "ada@contoso.com"


def test_extract_principal_falls_back_to_upn_when_mail_missing():
    principal = _extract_principal(
        {"id": "abc-123", "displayName": "Ada", "userPrincipalName": "ada@contoso.com"}
    )
    assert principal.email == "ada@contoso.com"


def test_enabled_mode_without_tenant_is_unauthorized():
    settings = Settings(auth_mode=AuthMode.entra, azure_tenant_id="")
    with pytest.raises(UnauthorizedError):
        validate_token("some.token", settings)


def test_enabled_mode_accepts_token_graph_confirms(monkeypatch):
    settings = Settings(auth_mode=AuthMode.entra, azure_tenant_id="tenant-1")

    def fake_get(url, *, headers, timeout):
        assert url == _GRAPH_ME_URL
        assert headers["Authorization"] == "Bearer good-token"
        return httpx.Response(200, json={"id": "u1", "displayName": "U", "mail": "u@x.com"})

    monkeypatch.setattr(httpx, "get", fake_get)
    principal = validate_token("good-token", settings)
    assert principal.subject == "u1"
    assert principal.email == "u@x.com"


def test_enabled_mode_rejects_token_graph_rejects(monkeypatch):
    settings = Settings(auth_mode=AuthMode.entra, azure_tenant_id="tenant-1")
    monkeypatch.setattr(httpx, "get", lambda *a, **k: httpx.Response(401))
    with pytest.raises(UnauthorizedError):
        validate_token("bad-token", settings)


def test_enabled_mode_surfaces_graph_outage(monkeypatch):
    settings = Settings(auth_mode=AuthMode.entra, azure_tenant_id="tenant-1")

    def fake_get(*a, **k):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(httpx, "get", fake_get)
    with pytest.raises(UpstreamServiceError):
        validate_token("some-token", settings)


def test_disabled_mode_rejected_outside_local_or_test_env():
    with pytest.raises(ValidationError):
        Settings(auth_mode=AuthMode.disabled, environment="prod")


def test_wildcard_cors_rejected_outside_local_or_test_env():
    with pytest.raises(ValidationError):
        Settings(auth_mode=AuthMode.entra, environment="prod", cors_allow_origins="*")


def test_require_admin_rejects_non_admin():
    non_admin = Principal(subject="u1", name="U", email="u@x", roles=["user"], groups=[])
    settings = Settings(admin_group_id="admins")
    with pytest.raises(ForbiddenError):
        require_admin(non_admin, settings)


def test_require_admin_allows_group_member():
    member = Principal(subject="u2", name="U2", email="u2@x", roles=[], groups=["admins"])
    settings = Settings(admin_group_id="admins")
    assert require_admin(member, settings) is member
