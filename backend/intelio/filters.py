"""Filter sets for intelio list views."""

import django_filters

from core.query_lang import search_q

from .enums import DigestStatus
from .models.base import BaseDigest


class BaseDigestFilter(django_filters.FilterSet):
    """Filter set for BaseDigest model.

    Supports search by: title (boolean/wildcard query, see core.query_lang), user
    (username icontains), status (exact), creation date (exact or range).
    """

    title = django_filters.CharFilter(
        method="filter_title",
        help_text=(
            "Search query over the title. Supports AND/OR/NOT (or -term), "
            '"quoted phrases", =exact matches and * wildcards.'
        ),
    )
    user = django_filters.CharFilter(
        field_name="user__username", lookup_expr="icontains", help_text="Filter by the username of the digest's user"
    )
    status = django_filters.ChoiceFilter(choices=DigestStatus.choices, help_text="Filter by digest status")
    created_at = django_filters.DateTimeFilter(help_text="Filter by exact creation datetime")
    created_at_gte = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte", help_text="Filter by creation date >= value"
    )
    created_at_lte = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="lte", help_text="Filter by creation date <= value"
    )
    created_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date", help_text="Filter by creation date (YYYY-MM-DD)"
    )

    class Meta:
        model = BaseDigest
        fields = [
            "title",
            "user",
            "status",
            "created_at",
            "created_at_gte",
            "created_at_lte",
            "created_date",
        ]

    _TITLE_SEARCH_FIELDS = ("title",)

    def filter_title(self, queryset, name, value):
        """Boolean/wildcard search (core.query_lang) over the digest title."""
        q = search_q(value, self._TITLE_SEARCH_FIELDS, param=name)
        return queryset if q is None else queryset.filter(q)
