import django_filters
from .models import Note


class NoteFilter(django_filters.FilterSet):
    content = django_filters.CharFilter(lookup_expr="icontains")
    publishable = django_filters.BooleanFilter()
    timestamp = django_filters.DateTimeFilter()
    author__username = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Note
        fields = ["content", "publishable", "timestamp", "author", "editor"]
