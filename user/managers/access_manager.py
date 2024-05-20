from django.db import models
from typing import Set
from ..enums import AccessType
from ..models.cradle_user_model import CradleUser


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
