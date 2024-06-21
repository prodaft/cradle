from django.urls import reverse
from .utils import NotesTestCase
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.parsers import JSONParser
from ..models import Note
from entities.models import Entity
from entities.enums import EntityType
from access.models import Access
from access.enums import AccessType
import io
import uuid


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class NotePublishableListTest(NotesTestCase):

    def setUp(self):
        super().setUp()
        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}

        self.case1 = Entity.objects.create(name="1", type=EntityType.CASE)
        self.case2 = Entity.objects.create(name="2", type=EntityType.CASE)
        self.note1 = Note.objects.create(content="blabla")
        self.note1.entities.add(self.case2)

        self.note2 = Note.objects.create(content="bla", publishable=True)
        self.note2.entities.add(self.case1)

        self.note3 = Note.objects.create(content="blabla", publishable=True)
        self.note3.entities.add(self.case1)

        self.access = Access.objects.create(
            user=self.user, case=self.case1, access_type=AccessType.READ_WRITE
        )

    def test_get_note_publish_not_authenticated(self):
        response = self.client.get(reverse("note_publish_list"))
        self.assertEqual(response.status_code, 401)

    def test_get_note_publish_not_unique(self):
        uuid1 = uuid.uuid4()
        query_params = {"note_ids": [uuid1, uuid1, uuid.uuid4()]}
        response = self.client.get(
            reverse("note_publish_list"), query_params, **self.headers
        )
        self.assertEqual(response.status_code, 400)

    def test_get_note_publish_not_in_database(self):
        query_params = {"note_ids": [uuid.uuid4()]}
        response = self.client.get(
            reverse("note_publish_list"), query_params, **self.headers
        )
        self.assertEqual(response.status_code, 404)

    def test_get_note_publish_no_access(self):
        self.note1.publishable = True
        self.note1.save()
        query_params = {"note_ids": [self.note1.pk]}
        response = self.client.get(
            reverse("note_publish_list"), query_params, **self.headers
        )
        self.assertEqual(response.status_code, 404)

    def test_get_note_publish_not_publishable(self):
        self.access.access_type = AccessType.NONE
        self.access.save()
        query_params = {"note_ids": [self.note1.pk]}
        response = self.client.get(
            reverse("note_publish_list"), query_params, **self.headers
        )
        self.assertEqual(response.status_code, 403)

    def test_get_note_publish_success(self):
        self.access.access_type = AccessType.READ_WRITE
        self.access.save()
        query_params = {"note_ids": [self.note2.pk, self.note3.pk]}
        response = self.client.get(
            reverse("note_publish_list"), query_params, **self.headers
        )
        with self.subTest("Test response code"):
            self.assertEqual(response.status_code, 200)
        with self.subTest("Test correct note order"):
            report = bytes_to_json(response.content)
            self.assertEqual(report["notes"][0]["content"], self.note2.content)
            self.assertEqual(report["notes"][1]["content"], self.note3.content)
            self.assertEqual(len(report["notes"]), 2)
        with self.subTest("Test cases"):
            self.assertEqual(len(report["cases"]), 1)
            self.assertEqual(report["cases"][0]["id"], str(self.case1.pk))
