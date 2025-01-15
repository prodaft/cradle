import django_filters
from entries.models import Entry


class BaseStringFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class EntryFilter(django_filters.FilterSet):
    subtype = BaseStringFilter(field_name="entry_class__subtype", lookup_expr="in")
    name = django_filters.CharFilter(lookup_expr="icontains")
    referenced_in = django_filters.UUIDFilter(
        field_name="note__id", lookup_expr="exact"
    )

    class Meta:
        model = Entry
        fields = ["subtype", "name", "referenced_in"]
