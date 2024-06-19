from .utils import KnowledgeGraphTestCase
from django.urls import reverse
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.parsers import JSONParser
import io
from entities.models import Entity
from entities.enums import EntityType
from access.enums import AccessType
from access.models import Access
from notes.models import Note

from collections import Counter


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetKnowledgeGraphTest(KnowledgeGraphTestCase):

    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}

        self.case2 = Entity.objects.create(name="2", type=EntityType.CASE)
        self.case1 = Entity.objects.create(name="1", type=EntityType.CASE)
        self.entry = Entity.objects.create(name="1", type=EntityType.ENTRY)

        self.note = Note.objects.create(content="")
        self.note.entities.set([self.case1, self.entry])

        self.access = Access.objects.create(
            user=self.user, case=self.case1, access_type=AccessType.READ_WRITE
        )

    def test_get_knowledge_graph_not_authenticated(self):
        response = self.client.get(reverse("knowledge_graph_list"))
        self.assertEqual(response.status_code, 401)

    def test_get_knowledge_graph_successful(self):
        response = self.client.get(reverse("knowledge_graph_list"), **self.headers)

        graph = bytes_to_json(response.content)
        expected_entities = [
            entity.id for entity in Entity.objects.exclude(id=self.case2.pk)
        ]
        entities = [entity["id"] for entity in graph["entities"]]
        expected_links = [(self.case1.id, self.entry.id)]

        with self.subTest("Test status code"):
            self.assertEqual(response.status_code, 200)
        with self.subTest("Test correct entities"):

            self.assertEqual(Counter(entities), Counter(expected_entities))
        with self.subTest("Test correct links"):
            self.assertLinksEqual(graph["links"], expected_links)
