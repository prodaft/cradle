from django.db import models
from typing import Set
from .enums import AccessType
from user.models import CradleUser
from django.db.models import Q, F, FilteredRelation
from entities.models import Entity


class AccessManager(models.Manager):
    def has_access_to_cases(
        self, user: CradleUser, cases: Set[Entity], access_types: Set[AccessType]
    ) -> bool:
        """Checks whether a user has one of the specified access types
        to each of the cases in the set of cases. Assumes that AccessType.NONE
        is not given as an access type in the set. If the user is a superuser,
        the method returns true.

        Args:
            user: the user we perform the check on
            cases: the set of cases we perform the check on
            access_types: the set of access types

        Returns:
            True: if the user's access types for all cases are in access_types
            False: if there is a case where the user has a different access type
            than those specified
        """

        if user.is_superuser:
            return True

        accesses = self.get_queryset().filter(
            user_id=user.pk, case__in=cases, access_type__in=access_types
        )
        return accesses.count() == len(cases)

    def get_accessible_case_ids(self, user_id: int) -> models.QuerySet:
        """For a given user id, get a list of all case ids which
        are accessible by the user. This method does not take into consideration
        the access privileges of the user. Hence, this method should not be used
        for admin users.

        Args:
            user_id: the id of the user.

        Returns:
            a QuerySet instance which gives all the case ids to which the user
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
            .values("case_id")
            .distinct()
        )

    def get_accesses(self, user_id: int) -> models.QuerySet:
        """Retrieves from the database the access_type of all cases for a given user id.

        Args:
            user_id: Id of the user whose access is to be updated.

        Returns:
            A QuerySet containing instances which are dictionaries.
            The dictionaries are as follows:
            {
                "id" : 2,
                "name" : "Case 2",
                "access_type" : AccessType.NONE
            }
        """
        return (
            Entity.cases.annotate(
                access_type=FilteredRelation(
                    "access", condition=Q(access__user=user_id)
                )
            )  # left outer join
            .values("id", "name", "access_type__access_type")  # separate table
            .annotate(access_type=F("access_type__access_type"))  # rename obscure field
        )

    def get_users_with_access(self, case_id: int) -> models.QuerySet:
        """Retrieves the ids of the users that can provide access for the given
        case. Those users are the ones that have read-write access to the case
        and the superusers.

        Args:
            case_id: The id of the case we perform the check for

        Returns:
            A QuerySet containing the ids of the users that are allowed to give
            access to the case.
        """

        return (
            self.get_queryset()
            .filter(case_id=case_id, access_type=AccessType.READ_WRITE)
            .values_list("user_id", flat=True)
            .union(
                CradleUser.objects.filter(is_superuser=True).values_list(
                    "id", flat=True
                )
            )
        )

    def check_user_access(
        self, user: CradleUser, case: Entity, access_type: AccessType
    ) -> bool:
        """Checks whether the user has an access access_type for the provided case.
        The method should not be called when the user is a superuser or when
        access_type is NONE.

        Args:
            user: User whose access is checked
            case: The case for which the check is performed
            access_type: The access type for which the method checks

        Returns:
            True: If the user has access access_type for the case
            False: If the user does not have access access_type for the case.
        """

        assert not user.is_superuser, "The user parameter should not be a superuser"
        assert (
            access_type != AccessType.NONE
        ), "The provided access type should not be NONE"

        return (
            self.get_queryset()
            .filter(user=user, case=case, access_type=access_type)
            .exists()
        )
