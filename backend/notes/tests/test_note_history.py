import uuid

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from access.enums import AccessType
from access.models import Access
from entries.models import Entry
from logs.models import EventLog
from user.models import CradleUser

from ..models import Note
from .utils import NotesTestCase


class NoteHistoryTest(NotesTestCase):
    def setUp(self):
        super().setUp()

        self.other = CradleUser.objects.create_user(
            username="other", password="pass", email="b@c.d", is_active=True, email_confirmed=True
        )
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {AccessToken.for_user(self.user)}"}
        self.other_headers = {"HTTP_AUTHORIZATION": f"Bearer {AccessToken.for_user(self.other)}"}

        self.note = Note.objects.create(author=self.user, content="mine")
        self.note.log_create(self.user)
        self.note.log_edit(self.user)
        other_note = Note.objects.create(author=self.user, content="unrelated")
        other_note.log_create(self.user)

    def test_not_authenticated(self):
        response = self.client.get(reverse("note_history", kwargs={"note_id": self.note.id}))
        self.assertEqual(response.status_code, 401)

    def test_not_found(self):
        response = self.client.get(reverse("note_history", kwargs={"note_id": uuid.uuid4()}), **self.headers)
        self.assertEqual(response.status_code, 404)

    def test_no_read_access(self):
        response = self.client.get(reverse("note_history", kwargs={"note_id": self.note.id}), **self.other_headers)
        self.assertEqual(response.status_code, 404)

    def test_non_admin_reader_sees_only_this_note(self):
        self.assertFalse(self.user.is_cradle_admin)

        response = self.client.get(reverse("note_history", kwargs={"note_id": self.note.id}), **self.headers)

        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual({r["type"] for r in results}, {"create", "edit"})
        self.assertTrue(all(r["object_id"] == str(self.note.id) for r in results))

    def test_reader_of_linked_entity_sees_propagated_logs(self):
        entity = Entry.objects.create(name="Shared entity", entry_class=self.entryclass1)
        note = Note.objects.create(author=self.user, fleeting=False, content="shared")
        note.entries.add(entity)
        Access.objects.create(user_id=self.other.id, entity_id=entity.id, access_type=AccessType.READ)
        note.log_edit(self.user, "patch")
        # The edit was copied to the linked entity, which hides the source row on /logs/.
        self.assertTrue(EventLog.objects.filter(src_log__object_id=str(note.id), object_id=str(entity.id)).exists())

        response = self.client.get(reverse("note_history", kwargs={"note_id": note.id}), **self.other_headers)

        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual([(r["type"], r["details"]) for r in results], [("edit", "patch")])
