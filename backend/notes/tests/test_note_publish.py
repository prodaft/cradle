from unittest.mock import patch

from django.contrib.contenttypes.models import ContentType
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from entries.enums import RelationReason
from entries.models import Entry, Relation
from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..enums import NoteStatus
from ..models import Note
from .utils import NotesTestCase


class NotePublishTest(NotesTestCase):
    def test_publish_locks_the_note_and_runs_once(self):
        self.user.role = UserRoles.ADMIN  # access to the linked entity
        self.user.save(update_fields=["role"])
        client = APIClient()
        headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}
        Entry.objects.create(name="c1", entry_class=self.entryclass1)
        note = Note.objects.create(author=self.user, content="[[case:c1]] [[ip:1.1.1.1]]", fleeting=True)
        url = reverse("note_publish", kwargs={"note_id": note.id})

        with self.captureOnCommitCallbacks(execute=False), CaptureQueriesContext(connection) as queries:
            first = client.post(url, **headers)
        # Read now: the captured list is a live view of the query log, which the next request clears.
        locked = any("FOR UPDATE" in q["sql"] for q in queries)
        second = client.post(url, **headers)

        self.assertEqual(first.status_code, 200, first.content)
        self.assertTrue(locked)
        self.assertEqual(second.status_code, 404)
        note.refresh_from_db()
        self.assertFalse(note.fleeting)


class NoteUnpublishTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}
        self.note = Note.objects.create(author=self.user, content="[[case:a]] [[case:b]]", status=NoteStatus.HEALTHY)
        a = Entry.objects.create(name="a", entry_class=self.entryclass1)
        b = Entry.objects.create(name="b", entry_class=self.entryclass1)
        self.note.entries.add(a, b)
        self.relation = Relation.objects.create(
            e1=a,
            e2=b,
            content_type=ContentType.objects.get_for_model(Note),
            object_id=self.note.id,
            reason=RelationReason.NOTE,
            access_vector=1,
        )
        self.url = reverse("note_unpublish", kwargs={"note_id": self.note.id})

    @patch("notes.views.note_view.refresh_edges_materialized_view")
    def test_unpublish_removes_the_note_from_the_graph(self, refresh):
        with self.captureOnCommitCallbacks(execute=True):
            first = self.client.post(self.url, **self.headers)
        second = self.client.post(self.url, **self.headers)

        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(second.status_code, 404)
        self.note.refresh_from_db()
        self.assertTrue(self.note.fleeting)
        self.assertEqual(self.note.status, NoteStatus.HEALTHY)
        self.assertFalse(self.note.entries.exists())
        self.assertFalse(Relation.objects.filter(pk=self.relation.pk).exists())
        refresh.apply_async.assert_called_once()

    def test_only_the_author_can_unpublish(self):
        other = CradleUser.objects.create_user(
            username="other", password="other", email="other@example.com", is_active=True, email_confirmed=True
        )
        other.role = UserRoles.ADMIN
        other.save(update_fields=["role"])
        headers = {"HTTP_COOKIE": f"access_token={session_access_token(other)}"}

        response = self.client.post(self.url, **headers)

        self.assertEqual(response.status_code, 404)
        self.note.refresh_from_db()
        self.assertFalse(self.note.fleeting)

    def test_cannot_unpublish_while_processing(self):
        self.note.write_status(NoteStatus.PROCESSING)

        response = self.client.post(self.url, **self.headers)

        self.assertEqual(response.status_code, 409)
        self.note.refresh_from_db()
        self.assertFalse(self.note.fleeting)
        self.assertTrue(Relation.objects.filter(pk=self.relation.pk).exists())
