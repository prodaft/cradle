from django.urls import reverse
from user.models import CradleUser
from access.models import Access
from access.enums import AccessType
from rest_framework_simplejwt.tokens import AccessToken
from ..models import Note
from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from .utils import NotesTestCase


class CreateNoteTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.saved_case = Entity.objects.create(name="case", type=EntityType.CASE)
        self.saved_actor = Entity.objects.create(name="actor", type=EntityType.ACTOR)

    def test_create_note_no_content(self):
        response = self.client.post(reverse("note_list"), {}, **self.headers)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "The note should not be empty.")

    def test_create_note_empty_content(self):
        response = self.client.post(
            reverse("note_list"), {"content": ""}, **self.headers
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "The note should not be empty.")

    def test_create_note_not_authenticated(self):
        Access.objects.create(
            user=self.user, case=self.saved_case, access_type=AccessType.READ_WRITE
        )
        response = self.client.post(
            reverse("note_list"),
            {"content": "Lorem ipsum [[actor:actor]] [[case:case]]"},
        )

        self.assertEqual(response.status_code, 401)

    def test_does_not_reference_enough_entities(self):
        response = self.client.post(
            reverse("note_list"), {"content": "Lorem ipsum"}, **self.headers
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Note does not reference at least one case and at least two entities.",
        )

    def test_references_entities_that_do_not_exist(self):
        response = self.client.post(
            reverse("note_list"),
            {"content": "Lorem ipsum [[actor:actor]] [[case:wrongcase]]"},
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"], "The referenced agents or cases do not exist."
        )

    def test_references_cases_user_has_no_access_to(self):
        response = self.client.post(
            reverse("note_list"),
            {"content": "Lorem ipsum [[actor:actor]] [[case:case]]"},
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"], "The referenced agents or cases do not exist."
        )

    def test_create_note_successfully(self):
        Access.objects.create(
            user=self.user, case=self.saved_case, access_type=AccessType.READ_WRITE
        )
        note_content = "Lorem ipsum [[actor:actor]] [[case:case]] [[ip:127.0.0.1]]"

        response = self.client.post(
            reverse("note_list"), {"content": note_content}, **self.headers
        )

        saved_note = Note.objects.first()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["content"], note_content)
        self.assertEqual(saved_note.content, note_content)
        self.assertIsNotNone(response.json()["timestamp"])

        referenced_entities = saved_note.entities.all()
        # this also checks that the ip entity has been successfully created
        saved_entry = Entity.objects.get(
            name="127.0.0.1", type=EntityType.ENTRY, subtype=EntitySubtype.IP
        )
        self.assertCountEqual(
            referenced_entities, [self.saved_case, self.saved_actor, saved_entry]
        )
