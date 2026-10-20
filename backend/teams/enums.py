"""Choices for team membership roles."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class TeamRole(models.TextChoices):
    """Role of a user within a team."""

    LEAD = "lead", _("Lead")
    MEMBER = "member", _("Member")
