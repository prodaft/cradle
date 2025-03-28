```py
from entries.models import Entry,Relation
from core.pagination import LazyPaginator
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from django.db.models import F, ExpressionWrapper, Value
from core.fields import BitStringField
from user.models import CradleUser
from rest_framework import serializers
import time

fieldtype = BitStringField(max_length=2048, null=False, default=1, varying=False)
user = CradleUser.objects.get(username='dmytro')

rels = Relation.objects.annotate(
                combined_access=ExpressionWrapper(
                    F("access_vector").bitor(Value(user.access_vector)),
                    output_field=fieldtype,
                )
            ).filter(
                combined_access=Value(user.access_vector)
            )


print(user.access_vector_inv)
rels = Relation.objects.extra(
    where=["(access_vector & %s) = %s"],
    params=[user.access_vector_inv, fieldtype.get_prep_value(0)],
)


rels = rels.order_by('src_entry_id', 'dst_entry_id', 'created_at').distinct('src_entry_id', 'dst_entry_id')

rels = rels.filter(
    src_entry__id__lt=F("dst_entry__id")
)

rels.order_by("-created_at")

rels = rels.select_related("src_entry", "dst_entry")



class EntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ['id', 'name', "entry_class_id"]

class RelationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Relation
        fields = ['id', 'src_entry', 'dst_entry', 'created_at']

class RelationListWithEntriesSerializer(serializers.Serializer):
    relations = RelationSerializer(many=True)
    entries = serializers.SerializerMethodField()

    def get_entries(self, obj):
        entry_ids = set()
        for relation in obj["relations"]:
            entry_ids.add(relation.src_entry_id)
            entry_ids.add(relation.dst_entry_id)

        entries = Entry.objects.filter(id__in=entry_ids)
        return EntrySerializer(entries, many=True).data



b = True
c = 1
total = rels.count()
print(total)

while b:
    s =  time.time()
    factory = APIRequestFactory()
    request = factory.get('/fake-url/', {'page': c})
    drf_request = Request(request)

    paginator = LazyPaginator(page_size=1000)

    pr = paginator.paginate_queryset(rels, drf_request)

    data = RelationListWithEntriesSerializer({'relations': pr}).data
    pp = paginator.get_paginated_response(data).data
    b = pp["has_next"]
    e = time.time()
    print(total, c * len(pp["results"]["relations"]), len(pp["results"]["entries"]), e-s)
    c += 1
```
