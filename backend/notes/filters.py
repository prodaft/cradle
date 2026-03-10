"""Filters for note list and file list views."""

import django_filters

from .models import Note


class NoteFilter(django_filters.FilterSet):
    """Filter notes by content, timestamp, date, and author."""

    content = django_filters.CharFilter(lookup_expr="icontains", help_text="Filter by content (case-insensitive).")
    timestamp = django_filters.DateTimeFilter(help_text="Filter by exact timestamp.")
    timestamp_gte = django_filters.DateTimeFilter(
        field_name="timestamp",
        lookup_expr="gte",
        help_text="Filter by timestamp greater than or equal.",
    )
    timestamp_lte = django_filters.DateTimeFilter(
        field_name="timestamp",
        lookup_expr="lte",
        help_text="Filter by timestamp less than or equal.",
    )
    date = django_filters.DateFilter(
        field_name="timestamp",
        lookup_expr="date",
        help_text="Filter by date (YYYY-MM-DD).",
    )
    author__username = django_filters.CharFilter(
        lookup_expr="icontains",
        help_text="Filter by author username (case-insensitive).",
    )

    class Meta:
        model = Note
        fields = [
            "content",
            "timestamp",
            "timestamp_gte",
            "timestamp_lte",
            "date",
            "author",
            "editor",
        ]
