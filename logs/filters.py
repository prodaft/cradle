from django_filters import rest_framework as filters
from .models import EventLog


class EventLogFilter(filters.FilterSet):
    type = filters.CharFilter(
        field_name="type", lookup_expr="iexact"
    )  # Case-insensitive search on event type
    username = filters.CharFilter(field_name="user__username")  # Filter by user ID
    start_date = filters.DateTimeFilter(
        field_name="timestamp", lookup_expr="gte"
    )  # Filter by start timestamp
    end_date = filters.DateTimeFilter(
        field_name="timestamp", lookup_expr="lte"
    )  # Filter by end timestamp
    content_type = filters.CharFilter(
        field_name="content_type__model", lookup_expr="iexact"
    )  # Filter by content type model
    object_id = filters.CharFilter(field_name="object_id")  # Filter by object ID

    class Meta:
        model = EventLog
        fields = ["type", "user", "start_date", "end_date", "content_type", "object_id"]
