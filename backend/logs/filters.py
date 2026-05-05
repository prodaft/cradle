"""Filters for event log list API."""

from django.db.models import Q
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
    search = filters.CharFilter(
        method="filter_search",
        help_text=(
            "Case-insensitive match on object id, content type, or event type. "
            "``details`` is included only when the term has at least 4 characters (shorter terms skip JSON details to limit scan cost)."
        ),
    )

    def filter_search(self, queryset, name, value):
        if not value or not (term := value.strip()):
            return queryset
        q = Q(object_id__icontains=term) | Q(content_type__model__icontains=term) | Q(type__icontains=term)
        if len(term) >= 4:
            q |= Q(details__icontains=term)
        return queryset.filter(q)

    class Meta:
        model = EventLog
        fields = []
