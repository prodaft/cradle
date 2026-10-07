"""Custom manager for Access model: permission checks and entity/user access queries."""

from uuid import UUID

from django.db import models
from django.db.models import F, FilteredRelation, Q, QuerySet

from core.query_lang import search_q
from entries.enums import EntryType
from entries.models import Entry
from user.models import CradleUser

from .enums import AccessType


class AccessManager(models.Manager):
    """Manager for Access with methods for permission checks and access lookups."""

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
        accessible_q = Q(access__user_id=user.pk, access__access_type__in=access_types)
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

        count = 0
        if AccessType.READ in access_types:
            q = Q(
                user_id=user.pk,
                entity__in=[e for e in entities if not e.is_public],
                access_type__in=access_types,
            )
            count = len([e for e in entities if e.is_public])
        else:
            q = Q(user_id=user.pk, entity__in=entities, access_type__in=access_types)

        accesses = self.get_queryset().filter(q).distinct().values("id")
        count += accesses.count()

        return count == len(entities)

    def get_accessible_entity_ids(self, user_id: UUID) -> QuerySet:
        """For a given user id, get entity ids accessible by the user.

        Does not consider admin privileges; do not use for admin users.

        Args:
            user_id: ID of the user.

        Returns:
            QuerySet of entity ids to which the user has READ or READ_WRITE access.
        """
        ids = set(
            self.get_queryset()
            .filter(Q(user_id=user_id) & (Q(access_type=AccessType.READ) | Q(access_type=AccessType.READ_WRITE)))
            .values_list("entity_id", flat=True)
        )

        ids = ids | set(Entry.entities.filter(is_public=True).values_list("id", flat=True))

        return Entry.entities.filter(pk__in=ids).values_list("pk", flat=True)

    def get_accesses(self, user_id: UUID, search: str | None = None) -> QuerySet:
        """Retrieves access_type of all entities for a given user id.

        Args:
            user_id: ID of the user whose access is to be retrieved.
            search: Optional query (AND/OR/NOT, -term, "phrases", =exact, * wildcards) over
                entity name and description, or exact match on entity id when ``search`` is
                numeric.

        Returns:
            QuerySet of dicts with keys: id, name, access_type, description.
        """
        qs = (
            Entry.entities.annotate(
                access_type=FilteredRelation("access", condition=Q(access__user=user_id))
            )  # left outer join
            .values("id", "name", "access_type__access_type", "description")  # separate table
            .annotate(access_type=F("access_type__access_type"))  # rename obscure field
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
