"""Filters for note list, file list and note history views."""

import django_filters

from logs.filters import EventLogFilter

from .models import Note


class NoteFilter(django_filters.FilterSet):
    """Filter notes by content, created_at, updated_at, date, author, and editor."""

    content = django_filters.CharFilter(lookup_expr="icontains", help_text="Filter by content (case-insensitive).")
    created_at = django_filters.DateTimeFilter(field_name="timestamp", help_text="Filter by exact creation time.")
    created_at_gte = django_filters.DateTimeFilter(
        field_name="timestamp",
        lookup_expr="gte",
        help_text="Filter by creation time greater than or equal.",
    )
    created_at_lte = django_filters.DateTimeFilter(
        field_name="timestamp",
        lookup_expr="lte",
        help_text="Filter by creation time less than or equal.",
    )
    updated_at_gte = django_filters.DateTimeFilter(
        field_name="edit_timestamp",
        lookup_expr="gte",
        help_text="Filter by last edit time greater than or equal.",
    )
    updated_at_lte = django_filters.DateTimeFilter(
        field_name="edit_timestamp",
        lookup_expr="lte",
        help_text="Filter by last edit time less than or equal.",
    )
    date = django_filters.DateFilter(
        field_name="timestamp",
        lookup_expr="date",
        help_text="Filter by date (YYYY-MM-DD).",
    )
    author = django_filters.CharFilter(
        field_name="author__username",
        lookup_expr="icontains",
        help_text="Filter by author username (case-insensitive).",
    )
    editor = django_filters.CharFilter(
        field_name="editor__username",
        lookup_expr="icontains",
        help_text="Filter by last editor username (case-insensitive).",
    )

    class Meta:
        model = Note
        fields = [
            "content",
            "created_at",
            "created_at_gte",
            "created_at_lte",
            "updated_at_gte",
            "updated_at_lte",
            "date",
            "author",
            "editor",
        ]


class NoteHistoryFilter(EventLogFilter):
    """EventLogFilter for a single note's history; the object is fixed by the URL."""

    content_type = None
    object_id = None
