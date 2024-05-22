from django.test import TestCase
from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from notes.utils.entity_creation_task import EntityCreationTask


class EntityCreationTaskTest(TestCase):

    def setUp(self):
        self.saved_actor = Entity.objects.create(name="actor", type=EntityType.ACTOR)
        self.saved_case = Entity.objects.create(name="case", type=EntityType.CASE)

        self.saved_metadata = Entity.objects.create(
            name="Romania", type=EntityType.METADATA, subtype=EntitySubtype.COUNTRY
        )
        self.metadata = Entity(
            name="Romania", type=EntityType.METADATA, subtype=EntitySubtype.COUNTRY
        )

        self.saved_entry = Entity.objects.create(
            name="127.0.0.1", type=EntityType.ENTRY, subtype=EntitySubtype.IP
        )
        self.entry = Entity(
            name="127.0.0.1", type=EntityType.ENTRY, subtype=EntitySubtype.IP
        )

        self.referenced_entities = {}
        self.entity_types = ["actor", "case", "entry", "metadata"]
        for t in self.entity_types:
            self.referenced_entities[t] = set()
        self.referenced_entities["actor"] = {self.saved_actor}
        self.referenced_entities["case"] = {self.saved_case}

    def references_assertions(
        self, refs, actors=set(), cases=set(), entries=set(), metadata=set()
    ):
        self.assertEqual(refs["actor"], actors)
        self.assertEqual(refs["case"], cases)
        self.assertEqual(refs["entry"], entries)
        self.assertEqual(refs["metadata"], metadata)

    def test_retrieve_entities(self):
        self.referenced_entities["entry"] = {self.entry}
        self.referenced_entities["metadata"] = {self.metadata}

        returned_referenced_entities = EntityCreationTask().run(
            self.referenced_entities
        )

        self.references_assertions(
            returned_referenced_entities,
            actors={self.saved_actor},
            entries={self.saved_entry},
            cases={self.saved_case},
            metadata={self.saved_metadata},
        )

    def test_save_entities(self):
        new_entry = Entity(
            name="1234", type=EntityType.ENTRY, subtype=EntitySubtype.PASSWORD
        )
        # this actor should not be saved
        new_actor = Entity(name="other-actor", type=EntityType.ACTOR)

        self.referenced_entities["actor"] = {self.saved_actor, new_actor}
        self.referenced_entities["entry"] = {new_entry}

        returned_referenced_entities = EntityCreationTask().run(
            self.referenced_entities
        )

        newly_created_entry = Entity.objects.get(
            name=new_entry.name, type=new_entry.type, subtype=new_entry.subtype
        )

        self.references_assertions(
            returned_referenced_entities,
            actors={self.saved_actor, new_actor},
            entries={newly_created_entry},
            cases={self.saved_case},
        )

        # assert that the new actor is not saved
        self.assertFalse(
            Entity.objects.filter(name="other-actor", type=EntityType.ACTOR).exists()
        )
