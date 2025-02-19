from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone


class EventLogManager(models.Manager):
    def log_event(self, user, event_type, content_object, details=None):
        """
        Creates a log event for the specified content object.

        Args:
            user (CradleUser): The user who performed the action.
            event_type (str): The type of event, must match one of EventType choices.
            content_object (models.Model): The object that the event is related to.
            details (dict, optional): Any additional details for the event.

        Returns:
            EventLog: The created EventLog instance.
        """
        content_type = ContentType.objects.get_for_model(content_object)

        return self.create(
            user=user,
            type=event_type,
            content_type=content_type,
            object_id=content_object.pk,
            content_object=content_object,
            details=details or {},
            timestamp=timezone.now(),
        )

    def filter_by_user(self, user):
        """Returns logs filtered by a specific user."""
        return self.filter(user=user)

    def filter_by_event_type(self, event_type):
        """Returns logs filtered by event type."""
        return self.filter(type=event_type)
