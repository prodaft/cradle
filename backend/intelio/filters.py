import django_filters
from .models.base import BaseDigest


class BaseDigestFilter(django_filters.FilterSet):
    """
    Filter set for BaseDigest model supporting search by:
    - title (case-insensitive partial match)
    - author (by username, case-insensitive partial match)
    - creation date (exact date or date range)
    """

    title = django_filters.CharFilter(lookup_expr="icontains")
    author = django_filters.CharFilter(
        field_name="user__username", lookup_expr="icontains"
    )
    created_at = django_filters.DateTimeFilter()
    created_at_gte = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="gte"
    )
    created_at_lte = django_filters.DateTimeFilter(
        field_name="created_at", lookup_expr="lte"
    )
    created_date = django_filters.DateFilter(
        field_name="created_at", lookup_expr="date"
    )

    class Meta:
        model = BaseDigest
        fields = [
            "title",
            "author",
            "created_at",
            "created_at_gte",
            "created_at_lte",
            "created_date",
        ]
