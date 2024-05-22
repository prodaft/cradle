from django.urls import reverse
from django.test import TestCase
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.parsers import JSONParser
from ..models import Note
from entities.models import Entity
from entities.enums import EntityType, EntitySubtype
from user.models import Access
from user.enums import AccessType
import io


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class CreateNoteTest(TestCase):

    def setUp(self):
        self.user = CradleUser.objects.create_user(username="user", password="user")
        self.user_token = str(AccessToken.for_user(self.user))
        self.not_owner = CradleUser.objects.create_user(
            username="not_owner", password="pass"
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
        self.notes.append(Note.objects.create(author=self.user))
        self.notes.append(Note.objects.create(author=self.user))
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

    def test_delete_note_not_authenticated(self):
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": self.notes[0].id})
        )

        self.assertEquals(response.status_code, 401)

    def test_delete_note_not_owner(self):
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": self.notes[0].id}),
            **self.not_owner_headers,
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_note_not_found(self):
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": self.notes[1].id + 1}),
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_note_successful(self):
        note_id = self.notes[0].id
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": self.notes[0].id}), **self.headers
        )

        self.assertEqual(response.status_code, 200)
        with self.assertRaises(Note.DoesNotExist):
            Note.objects.get(id=note_id)
        with self.assertRaises(Entity.DoesNotExist):
            Entity.objects.get(id=self.entities[1].id)

    def test_delete_note_keeps_cases(self):
        note_id = self.notes[1].id
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": note_id}), **self.headers
        )

        with self.subTest("Check response code is correct"):
            self.assertEqual(response.status_code, 200)

        with self.assertRaises(Note.DoesNotExist):
            Note.objects.get(id=note_id)
        with self.subTest("Check case does not get deleted"):
            self.assertEqual(Entity.objects.get(id=self.case.id).id, self.case.id)

    def test_delete_note_no_access(self):
        case1 = Entity.objects.create(name="this is a case", type=EntityType.CASE)
        self.notes[1].entities.add(case1)
        note_id = self.notes[1].id
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": note_id}), **self.headers
        )

        with self.subTest("Check response code is correct"):
            self.assertEqual(response.status_code, 404)
