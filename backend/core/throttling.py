"""Rate limiting for API endpoints.

Provides AuthRateThrottle for authentication-related endpoints
to mitigate brute-force and abuse.
"""

from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Strict rate limit for authentication endpoints.

    Use on login, signup, password reset, OAuth, and similar endpoints.
    Rate limits are configured via REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['auth'].
    """

    scope = "auth"
