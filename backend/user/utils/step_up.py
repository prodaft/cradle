"""Step-up authentication for sensitive account actions."""

from typing import Any

from rest_framework.request import Request

from ..authentication import APIKeyAuthentication
from ..exceptions import CurrentPasswordIncorrectException
from ..models import CradleUser
from ..serializers import StepUpSerializer


def require_step_up(
    request: Request,
    user: CradleUser,
    password: str | None,
) -> None:
    """Validate the user's password for a self-service sensitive action.

    Skipped for accounts without a password and for requests actually authenticated by an API key (scripts cannot
    answer a password prompt). The ``Api-Key`` header alone is not enough: a cookie session could send a fake one.
    """
    if isinstance(request.successful_authenticator, APIKeyAuthentication) or not user.has_usable_password():
        return
    if not password:
        raise CurrentPasswordIncorrectException(detail="Your password is required to confirm this action.")
    if not user.check_password(password):
        raise CurrentPasswordIncorrectException(detail="The current password is incorrect.")


def validate_step_up(
    request: Request,
    user: CradleUser,
    data: Any,
    *,
    is_self: bool = True,
) -> None:
    """Parse step-up credentials from the request body and validate when required."""
    if not is_self:
        return
    serializer = StepUpSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    require_step_up(request, user, serializer.validated_data.get("password") or None)
