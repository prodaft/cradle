"""Build the in-memory user/access rows for an entity (shared by paginated list and NDJSON stream)."""

from __future__ import annotations

from uuid import UUID

from django.db.models import Q

from entries.exceptions import EntityNotFoundException
from entries.models import Entry
from user.models import CradleUser, UserRoles

from .enums import AccessType
from .models import Access


def build_entity_access_user_rows(entity_id: int, search: str | None) -> list[dict]:
    """Return sorted rows ``{user, access_type}`` for entity access UI (matches paginated list)."""
    try:
        entity = Entry.entities.get(pk=entity_id)
    except Entry.DoesNotExist as exc:
        raise EntityNotFoundException(detail="That entity could not be found.") from exc

    accesses = Access.objects.filter(Q(entity=entity) & ~Q(user__role=UserRoles.ADMIN)).select_related("user")

    none_users = CradleUser.objects.filter(
        ~Q(id__in=accesses.values_list("user_id", flat=True)) & ~Q(role=UserRoles.ADMIN)
    )

    if search:
        try:
            search_uuid = UUID(search)
        except ValueError, TypeError:
            search_uuid = None
        search_filter = Q(user__username__icontains=search)
        if search_uuid is not None:
            search_filter |= Q(user__id=search_uuid)
        accesses = accesses.filter(search_filter)
        none_search_filter = Q(username__icontains=search)
        if search_uuid is not None:
            none_search_filter |= Q(id=search_uuid)
        none_users = none_users.filter(none_search_filter)

    combined = [{"user": access.user, "access_type": access.access_type} for access in accesses] + [
        {"user": user, "access_type": AccessType.NONE} for user in none_users
    ]
    return sorted(combined, key=lambda row: (row["user"].username or "").lower())
