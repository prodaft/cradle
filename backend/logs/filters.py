"""Filters for event log list API."""

from django_filters import rest_framework as filters

from core.query_lang import And, Node, Not, Or, parse_search, to_q

from .enums import EventType
from .models import EventLog

EVENT_LOG_SEARCH_FIELDS = ("object_id", "content_type__model", "type")
EVENT_LOG_DETAILS_MIN_TERM_LENGTH = 4


def _shortest_term(node: Node) -> int:
    """Length of the shortest literal (``*`` excluded) among the query's terms."""
    if isinstance(node, (And, Or)):
        return min(_shortest_term(node.left), _shortest_term(node.right))
    if isinstance(node, Not):
        return _shortest_term(node.operand)
    return len(node.text.replace("*", "").strip())


class EventLogFilter(filters.FilterSet):
    """Filter event logs by type, user, date range, and content object."""

    type = filters.ChoiceFilter(
        choices=EventType.choices,
        help_text="Event type (create, edit, delete, fetch, login).",
    )
    user = filters.CharFilter(
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
            "Search object id, content type, event type and details. Supports AND/OR/NOT, "
            '-term, "phrases", =exact and * wildcards (case-insensitive). ``details`` is '
            f"only searched when every term has at least {EVENT_LOG_DETAILS_MIN_TERM_LENGTH} characters, "
            "to limit scan cost."
        ),
    )

    def filter_search(self, queryset, name, value):
        node = parse_search(value)
        if node is None:
            return queryset
        fields = EVENT_LOG_SEARCH_FIELDS
        if _shortest_term(node) >= EVENT_LOG_DETAILS_MIN_TERM_LENGTH:
            fields = (*EVENT_LOG_SEARCH_FIELDS, "details")
        return queryset.filter(to_q(node, fields))

    class Meta:
        model = EventLog
        fields = []
