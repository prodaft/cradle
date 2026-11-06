"""Look up a user by the id in a URL, as seen by the requesting user."""

from uuid import UUID

from ..exceptions import UserNotFoundException
from ..models import CradleUser


def resolve_visible_user(initiator: CradleUser, user_id: str | UUID) -> CradleUser:
    """Return ``initiator`` for "me", else the user with ``user_id``.

    Users the initiator may not view are reported as not found, so the response does not reveal that they exist.
    """
    if user_id == "me":
        return initiator
    user = CradleUser.objects.filter(id=user_id).first()
    if user is None or not initiator.can_view(user):
        raise UserNotFoundException(detail="That user could not be found.")
    return user
