from django.test import TestCase
from entities.models import Entity
from notes.utils.count_references_task import CountReferencesTask
from ..exceptions import NotEnoughReferencesException


class CountReferencesTaskTest(TestCase):

    def setUp(self):
        self.actor_entity1 = Entity(name="actor1", type="actor")
        self.actor_entity2 = Entity(name="actor2", type="actor")
        self.case_entity1 = Entity(name="case1", type="case")
        self.case_entity2 = Entity(name="case2", type="case")

        self.referenced_entities = {}
        self.entity_types = ["actor", "case", "entry", "metadata"]
        for t in self.entity_types:
            self.referenced_entities[t] = set()

    def test_references_case_and_other_entity(self):
        self.referenced_entities["actor"] = {self.actor_entity1}
        self.referenced_entities["case"] = {self.case_entity1}

        new_referenced_entitites = CountReferencesTask().run(self.referenced_entities)
        self.assertEqual(self.referenced_entities, new_referenced_entitites)

    def test_references_multiple_cases(self):
        self.referenced_entities["case"] = {self.case_entity1, self.case_entity2}

        new_referenced_entitites = CountReferencesTask().run(self.referenced_entities)
        self.assertEqual(self.referenced_entities, new_referenced_entitites)

    def test_references_one_case(self):
        self.referenced_entities["case"] = {self.case_entity1}

        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask().run(self.referenced_entities),
        )

    def test_references_multiple_entities_no_case(self):
        self.referenced_entities["actor"] = {self.actor_entity1, self.actor_entity2}

        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask().run(self.referenced_entities),
        )

    def test_references_no_references(self):
        self.assertRaises(
            NotEnoughReferencesException,
            lambda: CountReferencesTask().run(self.referenced_entities),
        )
