from django.test import TestCase
from entities.models import Entity

from entities.enums import EntityType, EntitySubtype


class EntityManagerTest(TestCase):

    def setUp(self):
        self.cases = [
            Entity.objects.create(
                name=f"Case {i}", description=f"{i}", type=EntityType.CASE
            )
            for i in range(0, 4)
        ]
        self.entries = []
        self.entries.append(
            Entity.objects.create(
                name="Entry1",
                description="1",
                type=EntityType.ENTRY,
                subtype=EntitySubtype.USERNAME,
            )
        )
        self.entries.append(
            Entity.objects.create(
                name="EnTry2",
                description="2",
                type=EntityType.ENTRY,
                subtype=EntitySubtype.PASSWORD,
            )
        )
        self.entries.append(
            Entity.objects.create(
                name="Case",
                description="3",
                type=EntityType.ENTRY,
                subtype=EntitySubtype.PASSWORD,
            )
        )

    def test_get_filtered_entities_filters_by_name(self):
        initial_queryset = Entity.objects.all()
        result = list(
            Entity.objects.get_filtered_entities(
                initial_queryset, EntityType.values, EntitySubtype.values, "Ent"
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertTrue(result[i].name.startswith("Ent"))

    def test_get_filtered_entities_filters_by_entity_type(self):
        initial_queryset = Entity.objects.all()
        result = list(
            Entity.objects.get_filtered_entities(
                initial_queryset, ["case"], EntitySubtype.values, ""
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 4)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertEqual(result[i].type, EntityType.CASE)

    def test_get_filtered_entities_filters_by_entity_subtype(self):
        initial_queryset = Entity.objects.all()
        result = list(
            Entity.objects.get_filtered_entities(
                initial_queryset, ["entry"], ["username"], ""
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertEqual(result[i].subtype, EntitySubtype.USERNAME)

    def test_get_filtered_entites_mixed_filters(self):
        initial_queryset = Entity.objects.all()
        result = list(
            Entity.objects.get_filtered_entities(
                initial_queryset, ["entry"], EntitySubtype.values, "Ent"
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 1)
        for i in range(0, len(result)):
            with self.subTest("Correct name"):
                self.assertEqual(result[i].name, "Entry1")

    def test_get_filtered_entities_multiple_options(self):
        initial_queryset = Entity.objects.all()
        result = list(
            Entity.objects.get_filtered_entities(
                initial_queryset, ["entry", "case"], EntitySubtype.values, "Case"
            )
        )
        with self.subTest("Correct number of results"):
            self.assertEqual(len(result), 5)
