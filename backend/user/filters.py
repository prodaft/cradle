"""Filters for user list API."""

import django_filters

from core.query_lang import search_q

from .models import CradleUser, UserRoles

USER_SEARCH_FIELDS = ("username", "email", "role")


class UserFilter(django_filters.FilterSet):
    """Filter users by role and a free-text search over username, email and role."""

    search = django_filters.CharFilter(
        method="filter_search",
        help_text=(
            'Search username, email or role. Supports AND/OR/NOT, -term, "phrases", '
            "=exact and * wildcards (case-insensitive)."
        ),
    )
    role = django_filters.ChoiceFilter(
        choices=UserRoles.choices,
        help_text="Filter by role (admin, manager, author).",
    )

    class Meta:
        model = CradleUser
        fields = []

    def filter_search(self, queryset, name, value):
        """Apply the query-language search over username, email and role."""
        q = search_q(value, USER_SEARCH_FIELDS)
        return queryset if q is None else queryset.filter(q)
