"""Filters for user list API."""

import django_filters
from django.db.models import Q

from .models import CradleUser


class UserFilter(django_filters.FilterSet):
    """Filter users by search (username, email, role)."""

    search = django_filters.CharFilter(
        method="filter_search",
        help_text="Filter by username, email or role (case-insensitive substring)",
    )

    class Meta:
        model = CradleUser
        fields = []

    def filter_search(self, queryset, name, value):
        """Filter by username, email, or role (OR)."""
        if not value or not value.strip():
            return queryset
        term = value.strip()
        return queryset.filter(Q(username__icontains=term) | Q(email__icontains=term) | Q(role__icontains=term))
