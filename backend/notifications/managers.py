"""Notification queryset: unread filter shared by the list, the unread count and the serializers."""

from django.db.models import Q
from model_utils.managers import InheritanceManager, InheritanceQuerySet

UNREAD = Q(is_unread=True) | Q(is_marked_unread=True)


class NotificationQuerySet(InheritanceQuerySet):
    def unread(self):
        """Return notifications that show as unread (never read, or manually marked unread)."""
        return self.filter(UNREAD)


NotificationManager = InheritanceManager.from_queryset(NotificationQuerySet)
