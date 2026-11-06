"""link_files_task links files and their hashes to the note's entities, once."""

from unittest.mock import patch

from django.db import connection
from django.urls import reverse
from rest_framework.test import APIClient

from entries.enums import EntryType, RelationReason
from entries.models import Entry, EntryClass, Relation, calculate_acvec
from file_transfer.models import FileReference
from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..models import Note
from ..tasks import link_files_task
from .utils import NotesTestCase

MD5 = "d41d8cd98f00b204e9800998ecf8427e"


class LinkFilesTaskTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.case, _ = EntryClass.objects.get_or_create(subtype="case", defaults={"type": EntryType.ENTITY})
        self.md5, _ = EntryClass.objects.get_or_create(subtype="hash/md5", defaults={"type": EntryType.ARTIFACT})
        self.x = Entry.objects.create(name="x", entry_class=self.case)
        self.y = Entry.objects.create(name="y", entry_class=self.case)
        self.note = Note.objects.create(
            content="x", author=self.user, fleeting=False, access_vector=calculate_acvec([self.x, self.y])
        )
        self.note.entries.add(self.x, self.y)
        with patch("file_transfer.models.FileReference.process_file"):
            self.file = FileReference.objects.create(note=self.note, file_name="a.txt", md5_hash=MD5)

    def link(self):
        # The task's lock decorator closes DB connections afterwards, which would end the test transaction.
        with (
            patch("core.decorators.close_old_connections"),
            patch("entries.tasks.refresh_edges_materialized_view.apply_async"),
        ):
            link_files_task(self.note.id)

    def file_relations(self):
        return Relation.objects.filter(object_id=self.note.id, reason=RelationReason.NOTE)

    def test_links_file_and_hash_to_each_entity(self):
        self.link()

        hash_entry = Entry.objects.get(name=MD5, entry_class=self.md5)
        pairs = {(r.e1_id, r.e2_id) for r in self.file_relations()}
        expected = {(e.id, a.id) for e in (self.x, self.y) for a in (self.file.entry, hash_entry)}
        self.assertEqual(pairs, expected)
        self.assertFalse(self.file_relations().filter(virtual=True).exists())

    def test_rerun_replaces_instead_of_appending(self):
        self.link()
        self.link()
        self.link()

        self.assertEqual(self.file_relations().count(), 4)

    def test_deleting_file_drops_its_links(self):
        self.link()
        admin = CradleUser.objects.create_user(username="admin", password="admin", email="a@c.d", role=UserRoles.ADMIN)
        headers = {"HTTP_COOKIE": f"access_token={session_access_token(admin)}"}

        # Patches go outside the callback capture, which runs the on-commit relink as it exits.
        with (
            patch("notes.tasks.link_files_task.apply_async", side_effect=lambda args: self.link()),
            patch("file_transfer.models.FileReference.file"),
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = APIClient().delete(reverse("file_detail", kwargs={"file_id": self.file.id}), **headers)

        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(self.file_relations().exists())

    def test_file_does_not_make_note_entities_direct_neighbors(self):
        self.link()
        with connection.cursor() as cursor:
            cursor.execute("REFRESH MATERIALIZED VIEW edges;")
        client = APIClient()
        admin = CradleUser.objects.create_user(username="admin", password="admin", email="a@c.d", role=UserRoles.ADMIN)
        headers = {"HTTP_COOKIE": f"access_token={session_access_token(admin)}"}

        response = client.get(reverse("graph_neighbors_query"), {"src": self.x.id, "depth": 1}, **headers)

        ids = {entry["id"] for entry in response.json()["results"]}
        self.assertIn(self.file.entry.id, ids)
        self.assertNotIn(self.y.id, ids)
