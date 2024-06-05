from entities.models import Entity
from entities.enums import EntityType
from notes.utils.entity_checker_task import EntityCheckerTask
from ..exceptions import EntitiesDoNotExistException
from .utils import NotesTestCase


class EntityCheckerTaskTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.saved_actor1 = Entity.objects.create(name="actor1", type=EntityType.ACTOR)
        self.actor1 = Entity(name="actor1", type=EntityType.ACTOR)
        self.saved_actor2 = Entity.objects.create(name="actor2", type=EntityType.ACTOR)
        self.actor2 = Entity(name="actor2", type=EntityType.ACTOR)
        self.other_actor = Entity(name="other actor", type=EntityType.ACTOR)

        self.saved_case1 = Entity.objects.create(name="case1", type=EntityType.CASE)
        self.case1 = Entity(name="case1", type=EntityType.CASE)
        self.saved_case2 = Entity.objects.create(name="case2", type=EntityType.CASE)
        self.case2 = Entity(name="case2", type=EntityType.CASE)
        self.other_case = Entity(name="other case", type=EntityType.CASE)

        self.referenced_entities = {}
        self.entity_types = ["actor", "case", "entry", "metadata"]
        for t in self.entity_types:
            self.referenced_entities[t] = set()

    def test_references_existing_cases_and_actors(self):
        self.referenced_entities["actor"] = {self.actor1, self.actor2}
        self.referenced_entities["case"] = {self.case1, self.case2}

        updated_referenced_entities = EntityCheckerTask().run(self.referenced_entities)

        with self.subTest(entity_type="actor"):
            self.assertEqual(
                updated_referenced_entities["actor"],
                {self.saved_actor1, self.saved_actor2},
            )
        with self.subTest(entity_type="case"):
            self.assertEqual(
                updated_referenced_entities["case"],
                {self.saved_case1, self.saved_case2},
            )

    def test_references_non_existing_cases(self):
        self.referenced_entities["actor"] = {self.actor1, self.actor2}
        self.referenced_entities["case"] = {self.case1, self.case2, self.other_case}

        self.assertRaises(
            EntitiesDoNotExistException,
            lambda: EntityCheckerTask().run(self.referenced_entities),
        )

    def test_references_non_existing_actors(self):
        self.referenced_entities["actor"] = {self.actor1, self.actor2, self.other_actor}
        self.referenced_entities["case"] = {self.case1}

        self.assertRaises(
            EntitiesDoNotExistException,
            lambda: EntityCheckerTask().run(self.referenced_entities),
        )

    def test_references_non_existing_both(self):
        self.referenced_entities["actor"] = {self.other_actor}
        self.referenced_entities["case"] = {self.other_case}

        self.assertRaises(
            EntitiesDoNotExistException,
            lambda: EntityCheckerTask().run(self.referenced_entities),
        )

    def test_references_no_actors_or_cases(self):
        self.referenced_entities["actor"] = {}
        self.referenced_entities["case"] = {}

        updated_referenced_entities = EntityCheckerTask().run(self.referenced_entities)

        with self.subTest(entity_type="actor"):
            self.assertEqual(updated_referenced_entities["actor"], set())
        with self.subTest(entity_type="case"):
            self.assertEqual(updated_referenced_entities["case"], set())
