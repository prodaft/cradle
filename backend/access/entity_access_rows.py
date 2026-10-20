"""Build the in-memory user/access rows for an entity (used by the paginated entity access list)."""

from __future__ import annotations

from uuid import UUID

from django.db.models import Q

from core.query_lang import parse_search, to_q
from entries.exceptions import EntityNotFoundException
from entries.models import Entry
from teams.models import TeamAccess
from user.models import CradleUser, UserRoles

from .enums import AccessType, highest_access
from .models import Access


def _team_grants_by_user(entity: Entry) -> dict:
    """Map user id -> list of ``{id, name, access_type}`` for the teams giving them access to ``entity``."""
    grants: dict = {}
    rows = TeamAccess.objects.filter(entity=entity).values(
        "team_id", "team__name", "access_type", "team__memberships__user_id"
    )
    for row in rows.order_by("team__name"):
        if row["team__memberships__user_id"] is None:
            continue
        grants.setdefault(row["team__memberships__user_id"], []).append(
            {"id": row["team_id"], "name": row["team__name"], "access_type": row["access_type"]}
        )
    return grants


def build_entity_access_user_rows(entity_id: int, search: str | None) -> list[dict]:
    """Return sorted rows for the entity access UI: direct grant, team grants and effective access per user."""
    try:
        entity = Entry.entities.get(pk=entity_id)
    except Entry.DoesNotExist as exc:
        raise EntityNotFoundException(detail="That entity could not be found.") from exc

    accesses = Access.objects.filter(Q(entity=entity) & ~Q(user__role=UserRoles.ADMIN)).select_related("user")

    none_users = CradleUser.objects.non_admins().exclude(id__in=accesses.values_list("user_id", flat=True))

    node = parse_search(search)
    if node is not None:
        try:
            search_uuid = UUID((search or "").strip())
        except ValueError, TypeError:
            search_uuid = None
        search_filter = to_q(node, ["user__username"])
        if search_uuid is not None:
            search_filter |= Q(user__id=search_uuid)
        accesses = accesses.filter(search_filter)
        none_search_filter = to_q(node, ["username"])
        if search_uuid is not None:
            none_search_filter |= Q(id=search_uuid)
        none_users = none_users.filter(none_search_filter)

    team_grants = _team_grants_by_user(entity)
    public = AccessType.READ if entity.is_public else None

    def row(user: CradleUser, direct: str) -> dict:
        teams = team_grants.get(user.id, [])
        team_access = highest_access(*(t["access_type"] for t in teams))
        return {
            "user": user,
            "access_type": direct,
            "team_access_type": team_access,
            "effective_access_type": highest_access(direct, team_access, public),
            "teams": teams,
        }

    combined = [row(access.user, access.access_type) for access in accesses] + [
        row(user, AccessType.NONE) for user in none_users
    ]
    return sorted(combined, key=lambda r: (r["user"].username or "").lower())
