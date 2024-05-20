from django.db import models
from django.utils.translation import gettext_lazy as _


class AccessType(models.TextChoices):

    NONE = "none", _("No access")
    READ = "read", _("Read access")
    READ_WRITE = "read-write", _("Read-write access")
