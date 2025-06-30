import django_filters
from .models import Note


class NoteFilter(django_filters.FilterSet):
    content = django_filters.CharFilter(lookup_expr="icontains")
    publishable = django_filters.BooleanFilter()
    timestamp = django_filters.DateTimeFilter()
    timestamp_gte = django_filters.DateTimeFilter(
        field_name="timestamp", lookup_expr="gte"
    )
    timestamp_lte = django_filters.DateTimeFilter(
        field_name="timestamp", lookup_expr="lte"
    )
    date = django_filters.DateFilter(field_name="timestamp", lookup_expr="date")
    author__username = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Note
        fields = [
            "content",
            "publishable",
            "timestamp",
            "timestamp_gte",
            "timestamp_lte",
            "date",
            "author",
            "editor",
        ]
