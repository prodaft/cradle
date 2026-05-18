"""Filters for entry class list API."""

import django_filters
from django.db.models import Q

from .models import EntryClass


class EntryClassFilter(django_filters.FilterSet):
    """Filter entry classes by subtype or description."""

    search = django_filters.CharFilter(
        method="filter_search",
        help_text="Filter by subtype or description (case-insensitive substring)",
    )

    class Meta:
        model = EntryClass
        fields = []

    def filter_search(self, queryset, name, value):
        """Filter by subtype or description (OR)."""
        if not value or not value.strip():
            return queryset
        term = value.strip()
        return queryset.filter(Q(subtype__icontains=term) | Q(description__icontains=term))
