"""Access level choices for entity permissions."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class AccessType(models.TextChoices):
    """Permission levels for user access to entities."""

    NONE = "none", _("No access")
    READ = "read", _("Read access")
    READ_WRITE = "read-write", _("Read-write access")
