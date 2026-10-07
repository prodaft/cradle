from datetime import datetime
from datetime import timezone as dt_timezone

from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from ..enums import NoteStatus
from ..models import Note
from .utils import NotesTestCase


class CreateFleetingNoteTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.user.default_note_template = "Default note template"
        self.user.save(update_fields=["default_note_template"])
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_COOKIE": f"access_token={self.user_token}"}

    def test_create_fleeting_note_not_authenticated(self):
        response = self.client.post(
            reverse("note_list"),
            {"content": "Quick thought"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_create_fleeting_note_defaults_content(self):
        response = self.client.post(
            reverse("note_list"),
            {},
            content_type="application/json",
            **self.headers,
        )

        saved_note = Note.objects.first()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["content"], "Default note template")
        self.assertTrue(response.json()["fleeting"])
        self.assertTrue(saved_note.fleeting)

    def test_create_fleeting_note_with_content(self):
        note_content = "Quick thought"
        response = self.client.post(
            reverse("note_list"),
            {"content": note_content},
            content_type="application/json",
            **self.headers,
        )

        saved_note = Note.objects.first()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["content"], note_content)
        self.assertTrue(response.json()["fleeting"])
        self.assertEqual(saved_note.content, note_content)


class NoteListStatusFilterTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_COOKIE": f"access_token={self.user_token}"}

    def test_list_notes_multiple_status_or(self):
        healthy = Note.objects.create(
            author=self.user,
            fleeting=False,
            content="h",
            status=NoteStatus.HEALTHY,
        )
        warning = Note.objects.create(
            author=self.user,
            fleeting=False,
            content="w",
            status=NoteStatus.WARNING,
        )
        Note.objects.create(
            author=self.user,
            fleeting=False,
            content="p",
            status=NoteStatus.PROCESSING,
        )

        url = reverse("note_list")
        response = self.client.get(
            url,
            {"status": ["healthy", "warning"]},
            **self.headers,
        )
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {str(healthy.id), str(warning.id)})

    def test_list_notes_multiple_status_with_empty_search_param(self):
        healthy = Note.objects.create(
            author=self.user,
            fleeting=False,
            content="healthy note",
            status=NoteStatus.HEALTHY,
        )
        processing = Note.objects.create(
            author=self.user,
            fleeting=False,
            content="processing note",
            status=NoteStatus.PROCESSING,
        )

        response = self.client.get(
            reverse("note_list"),
            {
                "status": ["finalized", "healthy"],
                "search": "",
                "content": "",
                "author": "",
            },
            **self.headers,
        )
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {str(healthy.id), str(processing.id)})

    def test_list_notes_multiple_status_with_search(self):
        matching = Note.objects.create(
            author=self.user,
            fleeting=False,
            content="alpha keyword here",
            status=NoteStatus.HEALTHY,
        )
        Note.objects.create(
            author=self.user,
            fleeting=False,
            content="no match",
            status=NoteStatus.HEALTHY,
        )
        Note.objects.create(
            author=self.user,
            fleeting=False,
            content="alpha elsewhere",
            status=NoteStatus.PROCESSING,
        )

        response = self.client.get(
            reverse("note_list"),
            {"status": ["healthy", "warning"], "search": "keyword"},
            **self.headers,
        )
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {str(matching.id)})

    def test_list_notes_single_status_backward_compatible(self):
        note = Note.objects.create(
            author=self.user,
            fleeting=False,
            content="only",
            status=NoteStatus.INVALID,
        )
        Note.objects.create(
            author=self.user,
            fleeting=False,
            content="other",
            status=NoteStatus.HEALTHY,
        )

        response = self.client.get(
            reverse("note_list"),
            {"status": "invalid"},
            **self.headers,
        )
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {str(note.id)})


class NoteListTimestampTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.headers = {"HTTP_COOKIE": f"access_token={AccessToken.for_user(self.user)}"}
        self.older = Note.objects.create(author=self.user, fleeting=False, content="older")
        self.newer = Note.objects.create(author=self.user, fleeting=False, content="newer")
        Note.objects.filter(id=self.older.id).update(timestamp=datetime(2026, 1, 1, tzinfo=dt_timezone.utc))
        Note.objects.filter(id=self.newer.id).update(timestamp=datetime(2026, 6, 1, tzinfo=dt_timezone.utc))

    def test_results_use_created_at_and_updated_at(self):
        response = self.client.get(reverse("note_list"), **self.headers)

        self.assertEqual(response.status_code, 200)
        row = response.json()["results"][0]
        for key in ("created_at", "updated_at", "status_changed_at", "linked_at"):
            self.assertIn(key, row)
        for key in ("timestamp", "edit_timestamp", "status_timestamp", "last_linked"):
            self.assertNotIn(key, row)

    def test_filter_by_created_at(self):
        response = self.client.get(reverse("note_list"), {"created_at_gte": "2026-03-01T00:00:00Z"}, **self.headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.json()["results"]], [str(self.newer.id)])

    def test_order_by_created_at(self):
        response = self.client.get(reverse("note_list"), {"order_by": "created_at"}, **self.headers)

        self.assertEqual(response.status_code, 200)
        ids = [row["id"] for row in response.json()["results"]]
        self.assertEqual(ids, [str(self.older.id), str(self.newer.id)])

    def test_order_by_old_field_name_is_rejected(self):
        response = self.client.get(reverse("note_list"), {"order_by": "-timestamp"}, **self.headers)

        self.assertEqual(response.status_code, 400)

    def test_filter_by_author_username(self):
        matching = self.client.get(reverse("note_list"), {"author": "use"}, **self.headers)
        other = self.client.get(reverse("note_list"), {"author": "nobody"}, **self.headers)

        self.assertEqual(len(matching.json()["results"]), 2)
        self.assertEqual(other.json()["results"], [])
