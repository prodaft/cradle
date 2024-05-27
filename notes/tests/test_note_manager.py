from django.test import TestCase
from entities.models import Entity
from entities.enums import EntitySubtype, EntityType
from ..models import Note


class TestNoteManager(TestCase):
    def setUp(self):
        self.case = Entity.objects.create(
            name="Clearly not a case", type=EntityType.CASE
        )
        self.case1 = Entity.objects.create(
            name="Unreferenced case", type=EntityType.CASE
        )
        # init entities
        self.entities = [
            Entity.objects.create(
                name=f"Entity{i}", type=EntityType.ENTRY, subtype=EntitySubtype.IP
            )
            for i in range(0, 4)
        ]

        self.metadata = [
            Entity.objects.create(
                name=f"Metadata{i}",
                type=EntityType.METADATA,
                subtype=EntitySubtype.COUNTRY,
            )
            for i in range(0, 3)
        ]

        self.actor = Entity.objects.create(name="Actor", type=EntityType.ACTOR)

        self.note = Note.objects.create()
        self.note.entities.add(self.entities[0])
        self.note.entities.add(self.entities[1])
        self.note.entities.add(self.metadata[0])
        self.note.entities.add(self.metadata[1])

    def test_delete_unfiltered_entities(self):
        Note.objects.delete_unreferenced_entities()

        with self.subTest("Check unreferenced entries are deleted"):
            self.assertEqual(Entity.entries.count(), 2)
        with self.subTest("Check unreferenced metadata is deleted"):
            self.assertEqual(Entity.metadata.count(), 2)
        with self.subTest("Check cases are not deleted"):
            self.assertEqual(Entity.cases.count(), 2)
        with self.subTest("Check actors are not deleted"):
            self.assertEqual(Entity.actors.count(), 1)

        for i in range(2, 4):
            with self.assertRaises(Entity.DoesNotExist):
                Entity.objects.get(id=self.entities[i].id)

        with self.assertRaises(Entity.DoesNotExist):
            Entity.objects.get(id=self.metadata[2].id)
