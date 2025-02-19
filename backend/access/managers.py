from entries.enums import EntryType
from django.db import models
from typing import Set
from .enums import AccessType
from user.models import CradleUser
from django.db.models import Q, F, FilteredRelation
from entries.models import Entry
from django.db.models import QuerySet

from uuid import UUID


class AccessManager(models.Manager):
    def inaccessible_entries(
        self, user: CradleUser, entries: QuerySet, access_types: Set[AccessType]
    ):
        """Checks whether a user has one of the specified access types
        to each of the entities in the set of entities. Assumes that AccessType.NONE
        is not given as an access type in the set. If the user is a superuser,
        the method returns true.

        Args:
            user: the user we perform the check on
            entities: the set of entities we perform the check on
            access_types: the set of access types

        Returns:
            True: if the user's access types for all entities are in access_types
            False: if there is an entity where the user has a different access type
            than those specified
        """

        if user.is_cradle_admin:
            return Entry.objects.none()

        entities = entries.filter(entry_class__type=EntryType.ENTITY)

        accessible = (
            self.get_queryset()
            .filter(
                user_id=user.pk,
                entity__in=entities,
                access_type__in=access_types,
            )
            .all()
            .values_list("entity", flat=True)
        )

        return entities.filter(~Q(pk__in=accessible))

    def has_access_to_entities(
        self, user: CradleUser, entities: Set[Entry], access_types: Set[AccessType]
    ) -> bool:
        """Checks whether a user has one of the specified access types
        to each of the entities in the set of entities. Assumes that AccessType.NONE
        is not given as an access type in the set. If the user is a superuser,
        the method returns true.

        Args:
            user: the user we perform the check on
            entities: the set of entities we perform the check on
            access_types: the set of access types

        Returns:
            True: if the user's access types for all entities are in access_types
            False: if there is an entity where the user has a different access type
            than those specified
        """

        if user.is_cradle_admin:
            return True

        accesses = self.get_queryset().filter(
            user_id=user.pk, entity__in=entities, access_type__in=access_types
        )
        return accesses.count() == len(entities)

    def get_accessible_entity_ids(self, user_id: UUID) -> models.QuerySet:
        """For a given user id, get a list of all entity ids which
        are accessible by the user. This method does not take into consideration
        the access privileges of the user. Hence, this method should not be used
        for admin users.

        Args:
            user_id: the id of the user.

        Returns:
            a QuerySet instance which gives all the entity ids to which the user
            id has READ or READ_WRITE access.
        """
        return (
            self.get_queryset()
            .filter(
                Q(user_id=user_id)
                & (
                    Q(access_type=AccessType.READ)
                    | Q(access_type=AccessType.READ_WRITE)
                )
            )
            .values("entity_id")
            .distinct()
        )

    def get_accesses(self, user_id: UUID) -> models.QuerySet:
        """Retrieves from the database the access_type of all
        entities for a given user id.

        Args:
            user_id: Id of the user whose access is to be updated.

        Returns:
            A QuerySet containing instances which are dictionaries.
            The dictionaries are as follows:
            {
                "id" : 2,
                "name" : "Entity 2",
                "access_type" : AccessType.NONE
            }
        """
        return (
            Entry.entities.annotate(
                access_type=FilteredRelation(
                    "access", condition=Q(access__user=user_id)
                )
            )  # left outer join
            .values("id", "name", "access_type__access_type")  # separate table
            .annotate(access_type=F("access_type__access_type"))  # rename obscure field
        )

    def get_users_with_access(self, entity_id: UUID) -> models.QuerySet:
        """Retrieves the ids of the users that can provide access for the given
        entity. Those users are the ones that have read-write access to the entity
        and the superusers.

        Args:
            entity_id: The id of the entity we perform the check for

        Returns:
            A QuerySet containing the ids of the users that are allowed to give
            access to the entity.
        """

        return (
            self.get_queryset()
            .filter(entity_id=entity_id, access_type=AccessType.READ_WRITE)
            .values_list("user_id", flat=True)
            .union(CradleUser.objects.filter(role="admin").values_list("id", flat=True))
        )

    def check_user_access(
        self, user: CradleUser, entity: Entry, access_type: AccessType
    ) -> bool:
        """Checks whether the user has an access access_type for the provided entity.
        The method should not be called when the user is a superuser or when
        access_type is NONE.

        Args:
            user: User whose access is checked
            entity: The entity for which the check is performed
            access_type: The access type for which the method checks

        Returns:
            True: If the user has access access_type for the entity
            False: If the user does not have access access_type for the entity.
        """

        assert not user.is_cradle_admin, "The user parameter should not be a superuser"
        assert (
            access_type != AccessType.NONE
        ), "The provided access type should not be NONE"

        return (
            self.get_queryset()
            .filter(user=user, entity=entity, access_type=access_type)
            .exists()
        )
