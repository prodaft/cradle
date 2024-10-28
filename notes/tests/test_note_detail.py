from django.urls import reverse
from user.models import CradleUser
from unittest.mock import patch
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.parsers import JSONParser
from ..models import Note, ArchivedNote
from entries.models import Entry
from entries.enums import EntryType, EntrySubtype
from access.models import Access
from access.enums import AccessType
import io
from .utils import NotesTestCase
import uuid


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetNoteTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.user = CradleUser.objects.create_user(
            username="user", password="user", email="alabala@gmail.com"
        )
        self.user_token = str(AccessToken.for_user(self.user))
        self.not_owner = CradleUser.objects.create_user(
            username="not_owner", password="pass", email="b@c.d"
        )
        self.not_owner_token = AccessToken.for_user(self.not_owner)
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}
        self.not_owner_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.not_owner_token}"
        }

    def test_get_note_not_authenticated(self):
        response = self.client.get(
            reverse("note_detail", kwargs={"note_id": uuid.uuid4()}),
        )

        with self.subTest("Check correct response code."):
            self.assertEqual(response.status_code, 401)

    @patch("notes.models.Note.objects.get")
    def test_get_note_not_in_database(self, mock_get):
        mock_get.side_effect = Note.DoesNotExist

        response = self.client.get(
            reverse("note_detail", kwargs={"note_id": uuid.uuid4()}),
            **self.headers,
        )

        with self.subTest("Check correct response code."):
            self.assertEqual(response.status_code, 404)

    @patch("notes.models.Note.objects.get")
    @patch("access.models.Access.objects.has_access_to_entities")
    def test_get_note_no_access(self, mock_access, mock_get):
        uuid1 = uuid.uuid4()
        note = Note(uuid1)
        mock_get.return_value = note
        mock_access.return_value = False
        response = self.client.get(
            reverse("note_detail", kwargs={"note_id": uuid1}), **self.headers
        )

        with self.subTest("Check correct response code."):
            self.assertEqual(response.status_code, 404)

    @patch("notes.models.Note.objects.get")
    @patch("access.models.Access.objects.has_access_to_entities")
    def test_get_note_successful(self, mock_access, mock_get):
        uuid1 = uuid.uuid4()
        note = Note(id=uuid1)
        mock_get.return_value = note
        mock_access.return_value = True
        response = self.client.get(
            reverse("note_detail", kwargs={"note_id": uuid1}), **self.headers
        )

        with self.subTest("Check correct response code."):
            self.assertEqual(response.status_code, 200)

        with self.subTest("Correct note"):
            self.assertEqual(bytes_to_json(response.content)["id"], str(uuid1))


class DeleteNoteTest(NotesTestCase):

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
        self.entity = Entry.objects.create(
            name="Clearly not an entity", type=EntryType.ENTITY
        )
        # init entries
        self.entries = [
            Entry.objects.create(
                name=f"Entry{i}", type=EntryType.ARTIFACT, subtype=EntrySubtype.IP
            )
            for i in range(0, 4)
        ]

        self.notes = []
        self.notes.append(Note.objects.create())
        self.notes.append(Note.objects.create())
        self.notes[0].entries.add(self.entries[0])
        self.notes[0].entries.add(self.entries[1])
        self.notes[1].entries.add(self.entries[0])
        self.notes[1].entries.add(self.entries[2])
        self.notes[1].entries.add(self.entity)
        Access.objects.create(
            user_id=self.user.id,
            entity_id=self.entity.id,
            access_type=AccessType.READ_WRITE,
        )

    def test_delete_note_not_authenticated(self):
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": self.notes[0].id})
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_note_not_found(self):
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": uuid.uuid4()}),
            **self.headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_note_successful(self):
        note_id = self.notes[0].id
        archive_count = ArchivedNote.objects.count()
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": self.notes[0].id}), **self.headers
        )

        self.assertEqual(response.status_code, 200)
        with self.assertRaises(Note.DoesNotExist):
            Note.objects.get(id=note_id)
        with self.assertRaises(Entry.DoesNotExist):
            Entry.objects.get(id=self.entries[1].id)
        with self.subTest("Check archive count"):
            self.assertEqual(ArchivedNote.objects.count(), archive_count + 1)

    def test_delete_note_keeps_entities(self):
        note_id = self.notes[1].id
        archive_count = ArchivedNote.objects.count()
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": note_id}), **self.headers
        )

        with self.subTest("Check response code is correct"):
            self.assertEqual(response.status_code, 200)

        with self.assertRaises(Note.DoesNotExist):
            Note.objects.get(id=note_id)
        with self.subTest("Check entity does not get deleted"):
            self.assertEqual(Entry.objects.get(id=self.entity.id).id, self.entity.id)
        with self.subTest("Check archive count"):
            self.assertEqual(ArchivedNote.objects.count(), archive_count + 1)

    def test_delete_note_no_access(self):
        entity1 = Entry.objects.create(name="this is an entity", type=EntryType.ENTITY)
        self.notes[1].entries.add(entity1)
        note_id = self.notes[1].id
        response = self.client.delete(
            reverse("note_detail", kwargs={"note_id": note_id}), **self.headers
        )

        with self.subTest("Check response code is correct"):
            self.assertEqual(response.status_code, 403)
