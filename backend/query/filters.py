import django_filters
from django.db.models import Q
from entries.models import Entry


class BaseStringFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class EntryFilter(django_filters.FilterSet):
    type = django_filters.CharFilter(
        field_name="entry_class__type", lookup_expr="exact"
    )
    # Accept multiple values via repeated params: ?subtype=a&subtype=b
    subtype = django_filters.CharFilter(method="filter_subtype")
    # Accept multiple values via repeated params: ?name=a&name=b
    name = django_filters.CharFilter(method="filter_name")
    # Accept multiple values via repeated params: ?name_exact=a&name_exact=b
    name_exact = django_filters.CharFilter(method="filter_name_exact")
    referenced_in = django_filters.UUIDFilter(
        field_name="notes__id", lookup_expr="exact"
    )

    class Meta:
        model = Entry
        fields = ["type", "subtype", "name", "name_exact", "referenced_in"]

    def _getlist(self, param_name: str, value):
        # Prefer repeated query params; fall back to single value
        req = getattr(self, "request", None)
        if req is not None:
            vals = req.query_params.getlist(param_name)
            if vals:
                return [v for v in vals if v]
        if value:
            if isinstance(value, list):
                return [v for v in value if v]
            return [value]
        return []

    def filter_name(self, queryset, name, value):
        values = self._getlist("name", value)
        if not values:
            return queryset
        q = Q()
        for v in values:
            q |= Q(name__icontains=v)
        return queryset.filter(q)

    def filter_name_exact(self, queryset, name, value):
        values = self._getlist("name_exact", value)
        if not values:
            return queryset
        return queryset.filter(name__in=values)

    def filter_subtype(self, queryset, name, value):
        values = self._getlist("subtype", value)
        if not values:
            return queryset
        return queryset.filter(entry_class__subtype__in=values)
