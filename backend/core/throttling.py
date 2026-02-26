"""Rate limiting for API endpoints."""

from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Strict rate limit for authentication endpoints (login, signup, password reset, OAuth)."""

    scope = "auth"
