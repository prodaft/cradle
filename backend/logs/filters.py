"""Filters for event log list API."""

from django_filters import rest_framework as filters

from .enums import EventType
from .models import EventLog


class EventLogFilter(filters.FilterSet):
    """Filter event logs by type, user, date range, and content object."""

    type = filters.ChoiceFilter(
        choices=EventType.choices,
        help_text="Event type (create, edit, delete, fetch, login).",
    )
    username = filters.CharFilter(
        field_name="user__username",
        help_text="Filter by username.",
    )
    start_date = filters.DateTimeFilter(
        field_name="timestamp",
        lookup_expr="gte",
        help_text="Events on or after this datetime.",
    )
    end_date = filters.DateTimeFilter(
        field_name="timestamp",
        lookup_expr="lte",
        help_text="Events on or before this datetime.",
    )
    content_type = filters.CharFilter(
        field_name="content_type__model",
        lookup_expr="iexact",
        help_text="Content type model name (e.g. note, entry).",
    )
    object_id = filters.CharFilter(
        field_name="object_id",
        help_text="ID of the content object.",
    )

    class Meta:
        model = EventLog
        fields = []
