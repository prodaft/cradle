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
