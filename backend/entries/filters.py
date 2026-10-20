"""Filters for entry class list API."""

import django_filters

from core.query_lang import search_q

from .models import EntryClass


class EntryClassFilter(django_filters.FilterSet):
    """Filter entry classes by subtype or description."""

    search = django_filters.CharFilter(
        method="filter_search",
        help_text=(
            "Search subtype and description. Supports AND/OR/NOT (or -term), "
            '"quoted phrases", =exact matches and * wildcards.'
        ),
    )

    class Meta:
        model = EntryClass
        fields = []

    _SEARCH_FIELDS = ("subtype", "description")

    def filter_search(self, queryset, name, value):
        """Boolean/wildcard search (core.query_lang) across subtype and description."""
        q = search_q(value, self._SEARCH_FIELDS)
        return queryset if q is None else queryset.filter(q)
