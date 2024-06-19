from django.urls import reverse
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.parsers import JSONParser
from ..models import Note
from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from access.models import Access
from access.enums import AccessType
import io
from .utils import NotesTestCase


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class NotePublishableDetailTest(NotesTestCase):

    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.not_owner = CradleUser.objects.create_user(
            username="not_owner", password="pass", email="b@c.d"
        )
        self.not_owner_token = str(AccessToken.for_user(self.not_owner))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.not_owner_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.not_owner_token}"
        }

        self.init_database()

    def init_database(self):
        self.case = Entity.objects.create(
            name="Clearly not a case", type=EntityType.CASE
        )
        # init entities
        self.entities = [
            Entity.objects.create(
                name=f"Entity{i}", type=EntityType.ENTRY, subtype=EntitySubtype.IP
            )
            for i in range(0, 4)
        ]

        self.notes = []
        self.notes.append(Note.objects.create())
        self.notes.append(Note.objects.create())
        self.notes[0].entities.add(self.entities[0])
        self.notes[0].entities.add(self.entities[1])
        self.notes[1].entities.add(self.entities[0])
        self.notes[1].entities.add(self.entities[2])
        self.notes[1].entities.add(self.case)
        Access.objects.create(
            user_id=self.user.id,
            case_id=self.case.id,
            access_type=AccessType.READ_WRITE,
        )

    def test_update_note_publishable_not_authenticated(self):
        response = self.client.put(
            reverse("note_publish_detail", kwargs={"note_id": self.notes[0].id})
        )

        self.assertEqual(response.status_code, 401)

    def test_update_note_publishable_not_found(self):
        response = self.client.put(
            reverse("note_publish_detail", kwargs={"note_id": self.notes[1].id + 1}),
            {"publishable": "true"},
            content_type="application/json",
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_update_note_publishable_successful(self):
        note_id = self.notes[0].id
        response = self.client.put(
            reverse("note_publish_detail", kwargs={"note_id": self.notes[0].id}),
            {"publishable": "true"},
            content_type="application/json",
            **self.headers,
        )

        with self.subTest("Check response code is correct."):
            self.assertEqual(response.status_code, 200)

        with self.subTest("Test publishable status was updated"):
            self.assertEqual(Note.objects.get(id=note_id).publishable, True)

    def test_update_note_publishable_invalid_body(self):
        note_id = self.notes[1].id
        response = self.client.put(
            reverse("note_publish_detail", kwargs={"note_id": note_id}),
            {"publishable": "blabla"},
            content_type="application/json",
            **self.headers,
        )

        with self.subTest("Check response code is correct."):
            self.assertEqual(response.status_code, 400)

    def test_update_note_publishable_empty_body(self):
        note_id = self.notes[1].id
        response = self.client.put(
            reverse("note_publish_detail", kwargs={"note_id": note_id}),
            content_type="application/json",
            **self.headers,
        )

        with self.subTest("Check response code is correct."):
            self.assertEqual(response.status_code, 400)

    def test_delete_note_no_access(self):
        case1 = Entity.objects.create(name="this is a case", type=EntityType.CASE)
        self.notes[1].entities.add(case1)
        note_id = self.notes[1].id
        response = self.client.put(
            reverse("note_publish_detail", kwargs={"note_id": note_id}),
            {"publishable": "true"},
            content_type="application/json",
            **self.headers,
        )

        with self.subTest("Check response code is correct"):
            self.assertEqual(response.status_code, 403)
