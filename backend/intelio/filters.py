"""Filter sets for intelio list views."""

import django_filters

from .enums import DigestStatus
from .models.base import BaseDigest


class BaseDigestFilter(django_filters.FilterSet):
    """Filter set for BaseDigest model.

    Supports search by: title (icontains), author (username icontains),
    status (exact), creation date (exact or range).
    """

    title = django_filters.CharFilter(lookup_expr="icontains", help_text="Filter by title (partial match)")
    author = django_filters.CharFilter(
        field_name="user__username", lookup_expr="icontains", help_text="Filter by author username"
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
            "author",
            "status",
            "created_at",
            "created_at_gte",
            "created_at_lte",
            "created_date",
        ]
