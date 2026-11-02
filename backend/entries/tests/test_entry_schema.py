from drf_spectacular.generators import SchemaGenerator

from knowledge_graph.serializers import EntryWithDepthSerializer

from ..models import Entry
from ..serializers import EntitySerializer, EntryResponseSerializer, EntrySerializer, EntrySerializerMinimal
from .utils import EntriesTestCase


class FlattenedEntrySchemaTest(EntriesTestCase):
    """The response schemas of entries with a flattened entry class list exactly the keys the API sends, in order."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.schemas = SchemaGenerator().get_schema(public=True)["components"]["schemas"]

    def test_schema_properties_match_output(self):
        artifact = Entry.objects.create(name="alice", entry_class=self.entryclass_username)
        artifact.depth = 1
        entity = Entry.objects.create(name="Case 1", entry_class=self.entryclass1)

        cases = {
            "EntrySerializerMinimal": EntrySerializerMinimal(artifact),
            "EntryResponse": EntryResponseSerializer(artifact),
            "Entry": EntrySerializer(artifact),
            "EntryWithDepth": EntryWithDepthSerializer(artifact),
            "Entity": EntitySerializer(entity),
        }
        for component, serializer in cases.items():
            with self.subTest(component):
                self.assertEqual(list(self.schemas[component]["properties"]), list(serializer.data))
