from django.db import models
from typing import Set
from ..enums import AccessType
from ..models.cradle_user_model import CradleUser

from django.db.models import Q
from entities.models import Entity


class AccessManager(models.Manager):
    def has_access_to_cases(self, user: CradleUser, case_ids: Set[int]) -> bool:
        """Checks whether a user has read-write access to a list of cases.

        Args:
            user: the user we perform the check on
            case_ids: the list of cases we perform the check on

        Returns:
            True iff the user has read-write access to all of the specified cases.
        """

        if user.is_superuser:
            return True

        accesses = self.get_queryset().filter(
            user_id=user.id, case_id__in=case_ids, access_type=AccessType.READ_WRITE
        )
        return accesses.count() == len(case_ids)

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

    def has_access_to_case(self, user: CradleUser, case: Entity) -> bool:
        """Check if the user has access to the case

        Args:
            user: The user whose access is being checked.
            case: The case whose access is being checked.

        Returns:
            bool: True if the user has access to the case, False otherwise.
        """

        if user.is_superuser:
            return True

        try:
            access = self.get_queryset().get(user=user, case=case)
        except models.ObjectDoesNotExist:
            return False

        return access.access_type in [AccessType.READ_WRITE, AccessType.READ]
