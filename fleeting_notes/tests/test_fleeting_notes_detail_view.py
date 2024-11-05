from fleeting_notes.models import FleetingNote
from fleeting_notes.tests.utils import FleetingNotesTestCase
from django.urls import reverse
from rest_framework.parsers import JSONParser
import io

import uuid


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetFleetingNoteByIdTest(FleetingNotesTestCase):
    def test_get_not_authenticated(self):
        response = self.client.get(reverse("fleeting_notes_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_fleeting_note_by_id_authenticated_admin(self):
        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_admin.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content)["content"], "Note1")
        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            self.note_admin.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(bytes_to_json(response.content)["id"], str(self.note_admin.pk))

    def test_get_fleeting_note_by_id_authenticated_admin_empty_db(self):
        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": uuid.uuid4()}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_get_fleeting_note_by_id_authenticated_not_admin(self):
        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_user.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            bytes_to_json(response.content)["content"],
            "[[actor:actor]] [[case:entity]]",
        )
        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            self.note_user.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(bytes_to_json(response.content)["id"], str(self.note_user.pk))

    def test_get_fleeting_note_by_id_authenticated_not_admin_not_own_note(self):
        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_admin.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_get_fleeting_note_by_id_authenticated_admin_not_own_note(self):
        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_user.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)


class PutFleetingNotesByIdTest(FleetingNotesTestCase):
    def test_put_not_authenticated(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": uuid.uuid4()})
        )

        self.assertEqual(response.status_code, 401)

    def test_put_fleeting_note_by_id_authenticated_admin(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_admin.pk}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(bytes_to_json(response.content)["content"], "New content")
        self.assertEqual(bytes_to_json(response.content)["id"], str(self.note_admin.pk))

        updated_note = FleetingNote.objects.get(pk=self.note_admin.pk)

        self.assertEqual(updated_note.content, "New content")
        self.assertTrue(updated_note.last_edited >= self.note_admin.last_edited)
        self.assertEqual(updated_note.user, self.admin_user)

        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            updated_note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_put_fleeting_note_by_id_authenticated_admin_empty_db(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": uuid.uuid4()}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_put_fleeting_note_by_id_authenticated_not_admin(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_user.pk}),
            {"content": "New content"},
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(bytes_to_json(response.content)["content"], "New content")
        self.assertEqual(bytes_to_json(response.content)["id"], str(self.note_user.pk))

        updated_note = FleetingNote.objects.get(pk=self.note_user.pk)

        self.assertEqual(updated_note.content, "New content")
        self.assertTrue(updated_note.last_edited >= self.note_user.last_edited)
        self.assertEqual(updated_note.user, self.normal_user)

        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            updated_note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_put_fleeting_note_by_id_authenticated_not_admin_not_own_note(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_admin.pk}),
            {"content": "New content"},
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_put_fleeting_note_by_id_authenticated_admin_not_own_note(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_user.pk}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_put_fleeting_note_by_id_invalid_content(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_user.pk}),
            {"content": ""},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 400)

    def test_put_fleeting_note_by_id_invalid_content_and_not_own_note(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_user.pk}),
            {"content": ""},
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 400)

    def test_put_fleeting_note_by_id_invalid_content_and_note_does_not_exist(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": uuid.uuid4()}),
            {"content": ""},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 400)


class DeleteFleetingNotesByIdTest(FleetingNotesTestCase):
    def test_delete_not_authenticated(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": uuid.uuid4()})
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_fleeting_note_by_id_authenticated_admin(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_admin.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(FleetingNote.objects.filter(pk=self.note_admin.pk).first())

    def test_delete_fleeting_note_by_id_authenticated_admin_note_does_not_exist(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": uuid.uuid4()}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_fleeting_note_by_id_authenticated_not_admin(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_admin.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_fleeting_note_by_id_authenticated_not_admin_not_own_note(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_admin.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_fleeting_note_by_id_authenticated_admin_not_own_note(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": self.note_user.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)
