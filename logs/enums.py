from django.db import models
from django.utils.translation import gettext_lazy as _


class EventType(models.TextChoices):
    CREATE = "create", _("Create")
    DELETE = "delete", _("Delete")
    EDIT = "edit", _("Edit")
    FETCH = "fetch", _("Fetch")
    LOGIN = "login", _("Login")
