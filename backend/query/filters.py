import django_filters
from entries.models import Entry


class BaseStringFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class EntryFilter(django_filters.FilterSet):
    type = django_filters.CharFilter(
        field_name="entry_class__type", lookup_expr="exact"
    )
    subtype = BaseStringFilter(field_name="entry_class__subtype", lookup_expr="in")
    name = django_filters.CharFilter(lookup_expr="icontains")
    name_exact = django_filters.CharFilter(method="filter_name_exact")
    referenced_in = django_filters.UUIDFilter(
        field_name="notes__id", lookup_expr="exact"
    )

    class Meta:
        model = Entry
        fields = ["type", "subtype", "name", "name_exact", "referenced_in"]

    def filter_name_exact(self, queryset, name, value):
        if value:
            return queryset.filter(name=value.strip())
        return queryset
