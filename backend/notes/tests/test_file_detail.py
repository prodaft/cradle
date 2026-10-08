import uuid

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from access.enums import AccessType
from access.models import Access
from entries.models import Entry
from file_transfer.models import FileReference
from user.models import CradleUser

from ..models import Note
from ..utils import calculate_acvec
from .utils import NotesTestCase

SHA256 = "a" * 64


class FileFixtures(NotesTestCase):
    """A file, a copy in another accessible note, and a copy in a note the user cannot read."""

    def setUp(self):
        super().setUp()
        self.case = Entry.objects.create(name="case-a", entry_class=self.entryclass1)
        self.secret_case = Entry.objects.create(name="case-b", entry_class=self.entryclass1)
        self.ip = Entry.objects.create(name="1.1.1.1", entry_class=self.entryclass_ip)
        self.actor = Entry.objects.create(name="apt", entry_class=self.entryclass2)

        self.note = Note.objects.create(author=self.user, fleeting=False, content="first", title="First")
        self.note.entries.add(self.case, self.ip)
        self.copy_note = Note.objects.create(author=self.user, fleeting=False, content="second", title="Second")
        self.copy_note.entries.add(self.case, self.actor)
        self.hidden_note = Note.objects.create(author=self.user, fleeting=False, content="hidden", title="Hidden")
        self.hidden_note.entries.add(self.secret_case)
        for note in (self.note, self.copy_note, self.hidden_note):
            note.access_vector = calculate_acvec(note.entries.all())
            note.save()

        self.file = self._file(self.note, "a.bin", SHA256)
        self._file(self.copy_note, "copy.bin", SHA256)
        self.hidden_copy = self._file(self.hidden_note, "hidden.bin", SHA256)

        self.other = CradleUser.objects.create_user(
            username="other", password="pass", email="o@c.d", is_active=True, email_confirmed=True
        )
        Access.objects.create(user_id=self.other.id, entity_id=self.case.id, access_type=AccessType.READ)
        self.headers = {"HTTP_COOKIE": f"access_token={AccessToken.for_user(self.other)}"}

    def _file(self, note, name, sha256):
        return FileReference.objects.create(
            note=note, file_name=name, minio_file_name=name, bucket_name="bucket", sha256_hash=sha256
        )


class FileDetailTest(FileFixtures):
    def _get(self, file_id):
        return self.client.get(reverse("note_file_detail", kwargs={"file_id": file_id}), **self.headers)

    def test_not_authenticated(self):
        response = self.client.get(reverse("note_file_detail", kwargs={"file_id": self.file.id}))
        self.assertEqual(response.status_code, 401)

    def test_unknown_file(self):
        self.assertEqual(self._get(uuid.uuid4()).status_code, 404)

    def test_file_in_inaccessible_note(self):
        self.assertEqual(self._get(self.hidden_copy.id).status_code, 404)

    def test_lists_entries_linked_through_accessible_copies(self):
        response = self._get(self.file.id)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["name"], "a.bin")
        self.assertEqual({e["name"] for e in data["entries"]}, {"case-a", "1.1.1.1", "apt"})

    def test_file_without_hash_only_uses_own_note(self):
        unhashed = self._file(self.copy_note, "nohash.bin", None)
        self._file(self.note, "nohash2.bin", None)

        data = self._get(unhashed.id).json()
        self.assertEqual({e["name"] for e in data["entries"]}, {"case-a", "apt"})


class NoteListFileFilterTest(FileFixtures):
    def _list(self, file_id):
        return self.client.get(reverse("note_list"), {"file": file_id}, **self.headers)

    def test_lists_accessible_notes_holding_copies(self):
        response = self._list(self.file.id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual({n["id"] for n in response.json()["results"]}, {str(self.note.id), str(self.copy_note.id)})

    def test_file_without_hash_only_matches_own_note(self):
        unhashed = self._file(self.copy_note, "nohash.bin", None)
        self._file(self.note, "nohash2.bin", None)

        self.assertEqual([n["id"] for n in self._list(unhashed.id).json()["results"]], [str(self.copy_note.id)])

    def test_unknown_file_matches_nothing(self):
        self.assertEqual(self._list(uuid.uuid4()).json()["results"], [])

    def test_invalid_file_id(self):
        self.assertEqual(self._list("not-a-uuid").status_code, 400)


class FileListTest(FileFixtures):
    def setUp(self):
        super().setUp()
        FileReference.objects.filter(file_name="a.bin").update(mimetype="application/pdf", file_size=10)
        FileReference.objects.filter(file_name="copy.bin").update(mimetype="image/png", file_size=20)

    def _list(self, **params):
        response = self.client.get(reverse("note_files"), params, **self.headers)
        self.assertEqual(response.status_code, 200)
        return response.json()["results"]

    def test_results_use_file_field_names(self):
        row = self._list(order_by="name")[0]

        self.assertEqual(
            (row["name"], row["mime_type"], row["size"], row["sha256"]), ("a.bin", "application/pdf", 10, SHA256)
        )
        for key in ("md5", "sha1"):
            self.assertIn(key, row)
        for key in ("file_name", "mimetype", "file_size", "md5_hash", "sha1_hash", "sha256_hash"):
            self.assertNotIn(key, row)

    def test_filter_by_mime_type(self):
        self.assertEqual([row["name"] for row in self._list(mime_type="image/*")], ["copy.bin"])

    def test_order_by_size(self):
        self.assertEqual([row["name"] for row in self._list(order_by="-size")], ["copy.bin", "a.bin"])
