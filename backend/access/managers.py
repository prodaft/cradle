"""Custom manager for Access model: permission checks and entity/user access queries.

A user's access to an entity is the strongest of their direct ``Access`` grant and the
``TeamAccess`` grants of every team they belong to. Public entities are readable by everyone.
"""

from uuid import UUID

from django.apps import apps
from django.db import models
from django.db.models import Case, F, FilteredRelation, IntegerField, OuterRef, Q, QuerySet, Subquery, Value, When

from core.query_lang import search_q
from entries.enums import EntryType
from entries.models import Entry
from user.models import CradleUser

from .enums import ACCESS_RANK, AccessType, highest_access


def _team_access_model():
    return apps.get_model("teams", "TeamAccess")


def _best_team_access(user_id) -> Subquery:
    """Subquery (for an entity queryset) of the user's strongest team access, or NULL."""
    rank = Case(
        *(When(access_type=access_type, then=Value(r)) for access_type, r in ACCESS_RANK.items()),
        output_field=IntegerField(),
    )
    return Subquery(
        _team_access_model()
        .objects.filter(entity_id=OuterRef("pk"), team__memberships__user_id=user_id)
        .annotate(rank=rank)
        .order_by("-rank")
        .values("access_type")[:1]
    )


class AccessManager(models.Manager):
    """Manager for Access with methods for permission checks and access lookups."""

    def granted_entity_ids(self, user_id: UUID, access_types: set[AccessType]) -> QuerySet:
        """Ids of entities granted to the user with one of ``access_types``, directly or via a team.

        Ignores public visibility and admin privileges.
        """
        direct = self.get_queryset().filter(user_id=user_id, access_type__in=access_types).values("entity_id")
        via_team = (
            _team_access_model()
            .objects.filter(team__memberships__user_id=user_id, access_type__in=access_types)
            .values("entity_id")
        )
        return Entry.entities.filter(Q(id__in=direct) | Q(id__in=via_team)).values("id")

    def inaccessible_entries(self, user: CradleUser, entries: QuerySet, access_types: set[AccessType]) -> QuerySet:
        """Returns entries (entities) the user cannot access with any of the given access types.

        Assumes AccessType.NONE is not in access_types. Admins get empty result.

        Args:
            user: User we perform the check on.
            entries: Queryset of entries to check (entities are filtered from this).
            access_types: The access types to consider (e.g. READ, READ_WRITE).

        Returns:
            QuerySet of entity entries the user cannot access.
        """
        if user.is_cradle_admin:
            return Entry.entities.none()

        entities = entries.filter(entry_class__type=EntryType.ENTITY)
        accessible_q = Q(id__in=self.granted_entity_ids(user.pk, access_types))
        if AccessType.READ in access_types:
            accessible_q |= Q(is_public=True)
        return entities.exclude(accessible_q)

    def has_access_to_entities(self, user: CradleUser, entities: set[Entry], access_types: set[AccessType]) -> bool:
        """Checks whether a user has one of the specified access types to each entity.

        Assumes AccessType.NONE is not in access_types. If the user is a superuser,
        returns True.

        Args:
            user: User we perform the check on.
            entities: Set of entities we perform the check on.
            access_types: Set of access types.

        Returns:
            True if the user's access types for all entities are in access_types;
            False if any entity has a different access type.
        """
        if user.is_cradle_admin:
            return True

        needed = {e.pk for e in entities if not (AccessType.READ in access_types and e.is_public)}
        if not needed:
            return True

        granted = self.granted_entity_ids(user.pk, access_types).filter(id__in=needed)
        return granted.count() == len(needed)

    def effective_access_type(self, user: CradleUser, entity: Entry) -> AccessType:
        """The strongest access ``user`` has to ``entity`` from any source."""
        if user.is_cradle_admin:
            return AccessType.READ_WRITE

        direct = self.get_queryset().filter(user=user, entity=entity).values_list("access_type", flat=True)
        via_team = (
            _team_access_model()
            .objects.filter(entity=entity, team__memberships__user=user)
            .values_list("access_type", flat=True)
        )
        public = AccessType.READ if entity.is_public else None
        return highest_access(*direct, *via_team, public)

    def get_accessible_entity_ids(self, user_id: UUID) -> QuerySet:
        """For a given user id, get entity ids accessible by the user.

        Does not consider admin privileges; do not use for admin users.

        Args:
            user_id: ID of the user.

        Returns:
            QuerySet of entity ids to which the user has READ or READ_WRITE access.
        """
        granted = self.granted_entity_ids(user_id, {AccessType.READ, AccessType.READ_WRITE})
        return Entry.entities.filter(Q(id__in=granted) | Q(is_public=True)).values_list("pk", flat=True)

    def get_accesses(self, user_id: UUID, search: str | None = None) -> QuerySet:
        """Retrieves access_type of all entities for a given user id.

        Args:
            user_id: ID of the user whose access is to be retrieved.
            search: Optional query (AND/OR/NOT, -term, "phrases", =exact, * wildcards) over
                entity name and description, or exact match on entity id when ``search`` is
                numeric.

        Returns:
            QuerySet of dicts with keys: id, name, access_type (direct grant), team_access_type
            (strongest grant through a team), description, is_public.
        """
        qs = (
            Entry.entities.annotate(access_type=FilteredRelation("access", condition=Q(access__user=user_id)))
            .values("id", "name", "access_type__access_type", "description", "is_public")  # separate table
            .annotate(
                access_type=F("access_type__access_type"),  # rename obscure field
                team_access_type=_best_team_access(user_id),
            )
            .order_by("name")
        )
        q = search_q(search, ["name", "description"])
        if q is not None:
            term = (search or "").strip()
            if term.isdigit():
                try:
                    q |= Q(id=int(term))
                except ValueError, OverflowError:
                    pass
            qs = qs.filter(q)
        return qs
