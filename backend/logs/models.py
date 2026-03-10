"""Event logging models for tracking user actions on content objects."""

import uuid
from typing import Optional, Union

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models.fields.reverse_related import ManyToOneRel, OneToOneRel

from .enums import EventType


class EventLog(models.Model):
    """Records user actions (create, edit, delete, fetch) on arbitrary content objects.

    Uses ContentType for generic relations so any model can be logged. Logs can
    propagate to linked LoggableModelMixin instances.
    """

    id: models.UUIDField = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the log entry.",
    )
    timestamp: models.DateTimeField = models.DateTimeField(
        auto_now_add=True,
        help_text="When the event was recorded.",
    )
    type: models.CharField = models.CharField(
        choices=EventType.choices,
        null=False,
        help_text="Kind of event (create, edit, delete, fetch, login).",
    )
    user: models.ForeignKey = models.ForeignKey(
        "user.CradleUser",
        on_delete=models.CASCADE,
        related_name="event_logs",
        help_text="User who performed the action.",
    )
    details: Optional[str] = models.CharField(
        blank=True,
        null=True,
        help_text="Optional JSON-serialized extra context for the event.",
    )
    src_log: Optional[models.ForeignKey] = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="propagated_logs",
        help_text="Log that triggered this event, for propagated entries.",
    )
    content_type: models.ForeignKey = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text="Type of the content object this log refers to.",
    )
    object_id: models.CharField = models.CharField(
        help_text="Primary key of the content object.",
    )
    content_object: Union[models.Model, None] = GenericForeignKey("content_type", "object_id")

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "event log"
        verbose_name_plural = "event logs"

    def __str__(self) -> str:
        return f'<"{self.type}" object [{self.content_type}]({self.object_id}) by {self.user} on {self.timestamp}>'

    def propagate(self, obj) -> "EventLog":
        """Create a propagated log entry for a related object, linked via src_log."""
        return EventLog.objects.create(
            user=self.user,
            content_object=obj,
            type=EventType.EDIT,
            src_log=self,
            details=self.details,
        )


class LoggableModelMixin:
    """Mixin for models that support event logging and propagation to related objects.

    Provides log_create, log_edit, log_delete, log_fetch. Edit/create/delete logs
    propagate to linked LoggableModelMixin instances; fetch logs do not.
    """

    def _linked_loggables(self):
        """Yield related model instances that use LoggableModelMixin."""
        for field in self._meta.get_fields():
            if isinstance(field, (models.ForeignKey, models.OneToOneField)):
                related_instance = getattr(self, field.name, None)
                if isinstance(related_instance, LoggableModelMixin):
                    yield related_instance

            elif isinstance(field, models.ManyToManyField):
                related_manager = getattr(self, field.name)
                if issubclass(field.related_model, LoggableModelMixin):
                    for related_instance in related_manager.all():
                        yield related_instance

            elif isinstance(field, (ManyToOneRel, OneToOneRel)):
                if issubclass(field.related_model, LoggableModelMixin):
                    related_manager = getattr(self, field.get_accessor_name())
                    for related_instance in related_manager.all():
                        yield related_instance

    def _propagate_log(self, log: EventLog) -> None:
        """Propagate a log to all linked loggable instances."""
        for i in self._linked_loggables():
            i.propagate_from(log)

    def propagate_from(self, log: EventLog) -> None:
        """Create and save a propagated log for this instance from the given log."""
        log.propagate(self)

    def _save_log(self, log: EventLog) -> EventLog:
        """Save the log and propagate it to linked instances."""
        log.save()
        self._propagate_log(log)
        return log

    def log_create(self, user, details=None) -> EventLog:
        """Record a create event for this instance and propagate to linked objects."""
        return self._save_log(EventLog(user=user, content_object=self, type=EventType.CREATE, details=details))

    def log_delete(self, user, details=None) -> EventLog:
        """Record a delete event for this instance and propagate to linked objects."""
        return self._save_log(EventLog(user=user, content_object=self, type=EventType.DELETE, details=details))

    def log_edit(self, user, details=None) -> EventLog:
        """Record an edit event for this instance and propagate to linked objects."""
        return self._save_log(EventLog(user=user, content_object=self, type=EventType.EDIT, details=details))

    def log_fetch(self, user, details=None) -> EventLog:
        """Record a fetch event for this instance. Fetch events are not propagated."""
        return EventLog.objects.create(user=user, content_object=self, type=EventType.FETCH, details=details)

    def __repr__(self):
        return f"<{self.__class__.__name__}:{self.pk}>"
