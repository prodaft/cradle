"""Entry filters for query endpoints."""

import django_filters
from django.db.models import Q

from entries.models import Entry
from notes.models import Note


class EntryFilter(django_filters.FilterSet):
    """FilterSet for Entry list query (type, subtype, name, search, referenced_in)."""

    type = django_filters.CharFilter(
        field_name="entry_class__type", lookup_expr="exact", help_text="Filter by entry class type (exact match)"
    )
    subtype = django_filters.CharFilter(
        method="filter_subtype",
        help_text="Filter by entry class subtype (repeat for multiple: ?subtype=a&subtype=b)",
    )
    name = django_filters.CharFilter(
        method="filter_name",
        help_text="Filter by entry name, case-insensitive contains (repeat for multiple: ?name=a&name=b)",
    )
    name_exact = django_filters.CharFilter(
        method="filter_name_exact",
        help_text="Filter by exact entry name (repeat for multiple: ?name_exact=a&name_exact=b)",
    )
    referenced_in = django_filters.UUIDFilter(
        method="filter_referenced_in",
        help_text="Filter by UUID of notes that reference this entry",
    )
    search = django_filters.CharFilter(
        method="filter_search",
        help_text="Search across name, subtype, and description (OR)",
    )

    class Meta:
        model = Entry
        fields = ["type", "subtype", "name", "name_exact", "referenced_in", "search"]

    _MAX_LIST_PARAM_LENGTH = 100

    def _getlist(self, param_name: str, value):
        """Get list from repeated query params or single value; capped at _MAX_LIST_PARAM_LENGTH."""
        req = getattr(self, "request", None)
        if req is not None:
            vals = req.query_params.getlist(param_name)
            if vals:
                return [v for v in vals if v][: self._MAX_LIST_PARAM_LENGTH]
        if value:
            if isinstance(value, list):
                return [v for v in value if v][: self._MAX_LIST_PARAM_LENGTH]
            return [value]
        return []

    def filter_name(self, queryset, name, value):
        """Filter by name (icontains, OR across multiple values)."""
        values = self._getlist("name", value)
        if not values:
            return queryset
        q = Q()
        for v in values:
            q |= Q(name__icontains=v)
        return queryset.filter(q)

    def filter_name_exact(self, queryset, name, value):
        """Filter by exact name (in list)."""
        values = self._getlist("name_exact", value)
        if not values:
            return queryset
        return queryset.filter(name__in=values)

    def filter_subtype(self, queryset, name, value):
        """Filter by entry class subtype (in list)."""
        values = self._getlist("subtype", value)
        if not values:
            return queryset
        return queryset.filter(entry_class__subtype__in=values)

    def filter_referenced_in(self, queryset, name, value):
        """Filter by note ID; only notes the user has access to."""
        if not value:
            return queryset
        req = getattr(self, "request", None)
        if req is None or not getattr(req, "user", None):
            return queryset.none()
        accessible_note_ids = Note.objects.get_accessible_notes(req.user).filter(id=value).values_list("id", flat=True)
        return queryset.filter(notes__id__in=accessible_note_ids)

    def filter_search(self, queryset, name, value):
        """Search across name, subtype, description (OR)."""
        if not value or not value.strip():
            return queryset
        term = value.strip()
        return queryset.filter(
            Q(name__icontains=term) | Q(entry_class__subtype__icontains=term) | Q(description__icontains=term)
        )
