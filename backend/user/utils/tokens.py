"""JWT session helpers: token expiry, auth cookies on requests and responses, and recording the requesting device."""

from datetime import datetime
from datetime import timezone as dt_timezone

from django.conf import settings
from rest_framework.request import Request
from rest_framework.throttling import BaseThrottle
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken


def token_expires_at(token) -> datetime:
    """When a JWT expires (its ``exp`` claim), as an aware UTC datetime."""
    return datetime.fromtimestamp(token["exp"], tz=dt_timezone.utc)


def _cookie_kwargs():
    """Return cookie options (httponly, secure, samesite, domain, path) from settings."""
    return dict(
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        domain=settings.JWT_COOKIE_DOMAIN,
        path=settings.JWT_COOKIE_PATH,
    )


def set_token_cookies(response, access, refresh):
    """Set HttpOnly JWT cookies on the response, each living as long as its token."""
    kwargs = _cookie_kwargs()
    lifetimes = settings.SIMPLE_JWT
    access_max_age = int(lifetimes["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max_age = int(lifetimes["REFRESH_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(settings.JWT_ACCESS_COOKIE_NAME, str(access), max_age=access_max_age, **kwargs)
    response.set_cookie(settings.JWT_REFRESH_COOKIE_NAME, str(refresh), max_age=refresh_max_age, **kwargs)
    return response


def clear_token_cookies(response):
    """Delete both JWT cookies from the browser."""
    kwargs = _cookie_kwargs()
    for name in (settings.JWT_ACCESS_COOKIE_NAME, settings.JWT_REFRESH_COOKIE_NAME):
        response.delete_cookie(name, path=kwargs["path"], domain=kwargs["domain"], samesite=kwargs["samesite"])
    return response


def current_refresh_jti(request: Request) -> str | None:
    """Return the jti of the refresh token cookie on ``request``, if valid."""
    refresh_cookie = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
    if not refresh_cookie:
        return None
    try:
        return RefreshToken(refresh_cookie).get("jti")
    except TokenError, InvalidToken:
        return None


def _client_ip(request: Request) -> str:
    """Client IP address, as rate limiting sees it (trusting ``TRUSTED_PROXY_COUNT`` proxies)."""
    return BaseThrottle().get_ident(request)


def _device_info(request: Request) -> str:
    """Browser/device description from the User-Agent header."""
    return request.META.get("HTTP_USER_AGENT", "Unknown")[:255]


def record_session(request: Request, user, refresh_token: RefreshToken) -> None:
    """Record the login session for ``refresh_token`` with the requesting device and IP address."""
    from ..models import UserSession  # models -> managers import token_expires_at from this module

    UserSession.objects.record(user, refresh_token, device_info=_device_info(request), ip_address=_client_ip(request))
