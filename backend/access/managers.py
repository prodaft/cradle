"""Custom manager for Access model: permission checks and entity/user access queries."""

from uuid import UUID

from django.db import models
from django.db.models import F, FilteredRelation, Q, QuerySet

from entries.enums import EntryType
from entries.models import Entry
from user.models import CradleUser, UserRoles

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

    def user_has_entity_access(self, user_id: UUID, entity_id: int) -> bool:
        """Check if user has access to entity (read or read_write).

        Do not use for admin users - check is_cradle_admin first.

        Args:
            user_id: UUID of the user.
            entity_id: ID of the entity.

        Returns:
            True if the user has READ or READ_WRITE access; False otherwise.
        """
        if (
            self.get_queryset()
            .filter(
                user_id=user_id,
                entity_id=entity_id,
                access_type__in=[AccessType.READ, AccessType.READ_WRITE],
            )
            .exists()
        ):
            return True
        return Entry.entities.filter(pk=entity_id, is_public=True).exists()

    def get_accesses(self, user_id: UUID) -> QuerySet:
        """Retrieves access_type of all entities for a given user id.

        Args:
            user_id: ID of the user whose access is to be retrieved.

        Returns:
            QuerySet of dicts with keys: id, name, access_type, description.
        """
        return (
            Entry.entities.annotate(
                access_type=FilteredRelation("access", condition=Q(access__user=user_id))
            )  # left outer join
            .values("id", "name", "access_type__access_type", "description")  # separate table
            .annotate(access_type=F("access_type__access_type"))  # rename obscure field
            .order_by("name")
        )

    def get_users_with_access(self, entity_id: int) -> QuerySet:
        """Retrieves user ids that can grant access for the given entity.

        Includes users with read-write access and superusers.

        Args:
            entity_id: ID of the entity to check.

        Returns:
            A QuerySet containing the ids of the users that are allowed to give
            access to the entity.
        """
        return (
            self.get_queryset()
            .filter(entity_id=entity_id, access_type=AccessType.READ_WRITE)
            .values_list("user_id", flat=True)
            .union(CradleUser.objects.filter(role=UserRoles.ADMIN).values_list("id", flat=True))
        )

    def check_user_access(self, user: CradleUser, entity: Entry, access_type: AccessType) -> bool:
        """Checks whether the user has the given access_type for the entity.

        Do not call when the user is a superuser or access_type is NONE.

        Args:
            user: User whose access is checked.
            entity: The entity for which the check is performed.
            access_type: The access type for which the method checks.

        Returns:
            True if the user has the given access_type for the entity; False otherwise.
        """
        assert not user.is_cradle_admin, "The user parameter should not be a superuser"
        assert access_type != AccessType.NONE, "The provided access type should not be NONE"

        return self.get_queryset().filter(user=user, entity=entity, access_type=access_type).exists()
