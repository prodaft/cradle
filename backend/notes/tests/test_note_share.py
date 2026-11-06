from django.urls import reverse
from rest_framework.test import APIClient

from entries.models import Entry
from notifications.models import NoteSharedNotification
from user.models import CradleUser, UserRoles
from user.testing import session_access_token

from ..models import Note, NoteShare
from .utils import NotesTestCase


def _headers(user):
    return {"HTTP_COOKIE": f"access_token={session_access_token(user)}"}


class NoteShareTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.other = CradleUser.objects.create_user(
            username="other", password="other", email="other@example.com", is_active=True, email_confirmed=True
        )
        self.note = Note.objects.create(author=self.user, content="draft", title="Draft", fleeting=True)

    def share(self, user, access_type, as_user=None):
        return self.client.put(
            reverse("note_share_detail", kwargs={"note_id": self.note.id, "user_id": user.id}),
            {"access_type": access_type},
            format="json",
            **_headers(as_user or self.user),
        )

    def test_shared_user_can_read_but_not_write(self):
        self.assertFalse(Note.objects.accessible(self.other).filter(id=self.note.id).exists())

        response = self.share(self.other, "read")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(Note.objects.accessible(self.other).filter(id=self.note.id).exists())
        self.assertTrue(self.note.has_read_access(self.other))
        self.assertFalse(self.note.has_write_access(self.other))
        detail = self.client.get(reverse("note_detail", kwargs={"note_id": self.note.id}), **_headers(self.other))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["permission"], "read")
        self.assertEqual(NoteSharedNotification.objects.filter(user=self.other, note=self.note).count(), 1)

    def test_read_write_share_can_edit_but_not_delete(self):
        self.share(self.other, "read-write")

        self.assertTrue(self.note.has_write_access(self.other))
        url = reverse("note_detail", kwargs={"note_id": self.note.id})
        edited = self.client.patch(url, {"content": "edited"}, format="json", **_headers(self.other))
        deleted = self.client.delete(url, **_headers(self.other))

        self.assertEqual(edited.status_code, 200, edited.content)
        self.assertEqual(deleted.status_code, 403)
        self.assertTrue(Note.objects.filter(id=self.note.id).exists())

    def test_changing_access_notifies_once_per_change(self):
        self.share(self.other, "read")
        self.share(self.other, "read")
        self.share(self.other, "read-write")

        self.assertEqual(NoteShare.objects.get(note=self.note, user=self.other).access_type, "read-write")
        self.assertEqual(NoteSharedNotification.objects.filter(user=self.other).count(), 2)

    def test_none_stops_sharing(self):
        self.share(self.other, "read")
        response = self.share(self.other, "none")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(NoteShare.objects.filter(note=self.note).exists())
        self.assertFalse(self.note.has_read_access(self.other))

    def test_only_the_author_can_share(self):
        third = CradleUser.objects.create_user(
            username="third", password="third", email="third@example.com", is_active=True, email_confirmed=True
        )
        self.share(self.other, "read-write")

        response = self.share(third, "read", as_user=self.other)
        listing = self.client.get(reverse("note_share_list", kwargs={"note_id": self.note.id}), **_headers(self.other))

        self.assertEqual(response.status_code, 403)
        self.assertEqual(listing.status_code, 403)
        self.assertFalse(self.note.has_read_access(third))

    def test_strangers_get_not_found(self):
        response = self.client.get(reverse("note_share_list", kwargs={"note_id": self.note.id}), **_headers(self.other))
        self.assertEqual(response.status_code, 404)

    def test_published_notes_cannot_be_shared(self):
        self.note.fleeting = False
        self.note.save()

        response = self.share(self.other, "read")

        self.assertEqual(response.status_code, 409)

    def test_publish_removes_shares(self):
        self.user.role = UserRoles.ADMIN  # access to the linked entity
        self.user.save(update_fields=["role"])
        Entry.objects.create(name="c1", entry_class=self.entryclass1)
        self.note.content = "[[case:c1]] [[ip:1.1.1.1]]"
        self.note.save()
        self.share(self.other, "read")

        with self.captureOnCommitCallbacks(execute=False):
            response = self.client.post(
                reverse("note_publish", kwargs={"note_id": self.note.id}), **_headers(self.user)
            )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(NoteShare.objects.filter(note=self.note).exists())

    def test_candidates_exclude_author_and_shared_users(self):
        third = CradleUser.objects.create_user(
            username="third", password="third", email="third@example.com", is_active=True, email_confirmed=True
        )
        self.share(self.other, "read")

        response = self.client.get(
            reverse("note_share_candidates", kwargs={"note_id": self.note.id}), **_headers(self.user)
        )
        shares = self.client.get(reverse("note_share_list", kwargs={"note_id": self.note.id}), **_headers(self.user))

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual([u["username"] for u in response.json()["results"]], [third.username])
        self.assertEqual([(s["user"]["username"], s["access_type"]) for s in shares.json()], [("other", "read")])
