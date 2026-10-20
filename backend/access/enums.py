"""Access level choices for entity permissions."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class AccessType(models.TextChoices):
    """Permission levels for user access to entities."""

    NONE = "none", _("No access")
    READ = "read", _("Read access")
    READ_WRITE = "read-write", _("Read-write access")


ACCESS_RANK = {AccessType.NONE: 0, AccessType.READ: 1, AccessType.READ_WRITE: 2}


def highest_access(*access_types: str | None) -> AccessType:
    """Return the strongest of the given access types (NONE when none are given)."""
    best = AccessType.NONE
    for access_type in access_types:
        if access_type and ACCESS_RANK[AccessType(access_type)] > ACCESS_RANK[best]:
            best = AccessType(access_type)
    return best
