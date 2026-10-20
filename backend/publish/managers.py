"""Custom manager for PublishedReport model."""

from django.db import models
from django.db.models import QuerySet

from user.models import CradleUser


class PublishedReportManager(models.Manager):
    """Manager for PublishedReport providing user-scoped querysets."""

    def for_user(self, user: CradleUser) -> QuerySet:
        """Return reports belonging to the given user."""
        return self.filter(user=user)
