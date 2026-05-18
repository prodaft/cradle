"""Event type choices for EventLog."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class EventType(models.TextChoices):
    """Types of user actions that can be recorded in event logs."""

    CREATE = "create", _("Create")
    DELETE = "delete", _("Delete")
    EDIT = "edit", _("Edit")
    FETCH = "fetch", _("Fetch")
    LOGIN = "login", _("Login")
