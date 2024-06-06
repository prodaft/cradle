from fleeting_notes.models import FleetingNote
from fleeting_notes.tests.utils import FleetingNotesTestCase
from django.urls import reverse
from rest_framework.parsers import JSONParser
import io


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetFleetingNoteByIdTest(FleetingNotesTestCase):

    def test_get_not_authenticated(self):
        response = self.client.get(reverse("fleeting_notes_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_fleeting_note_by_id_authenticated_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)
        FleetingNote.objects.create(content="Note2", user=self.normal_user)

        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content)["content"], "Note1")
        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(bytes_to_json(response.content)["id"], note.pk)

    def test_get_fleeting_note_by_id_authenticated_admin_empty_db(self):
        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": 1}), **self.headers_admin
        )

        self.assertEqual(response.status_code, 404)

    def test_get_fleeting_note_by_id_authenticated_not_admin(self):
        FleetingNote.objects.create(content="Note1", user=self.admin_user)
        note = FleetingNote.objects.create(content="Note2", user=self.normal_user)

        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content)["content"], "Note2")
        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(bytes_to_json(response.content)["id"], note.pk)

    def test_get_fleeting_note_by_id_authenticated_not_admin_not_own_note(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)
        FleetingNote.objects.create(content="Note2", user=self.normal_user)

        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_get_fleeting_note_by_id_authenticated_admin_not_own_note(self):
        note = FleetingNote.objects.create(content="Note1", user=self.normal_user)
        FleetingNote.objects.create(content="Note2", user=self.admin_user)

        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)


class PutFleetingNotesByIdTest(FleetingNotesTestCase):

    def test_put_not_authenticated(self):
        response = self.client.put(reverse("fleeting_notes_detail", kwargs={"pk": 1}))

        self.assertEqual(response.status_code, 401)

    def test_put_fleeting_note_by_id_authenticated_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(bytes_to_json(response.content)["content"], "New content")
        self.assertNotEqual(
            bytes_to_json(response.content)["last_edited"],
            note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(bytes_to_json(response.content)["id"], note.pk)

        updated_note = FleetingNote.objects.get(pk=note.pk)

        self.assertEqual(updated_note.content, "New content")
        self.assertNotEqual(updated_note.last_edited, note.last_edited)
        self.assertEqual(updated_note.user, self.admin_user)

        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            updated_note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_put_fleeting_note_by_id_authenticated_admin_empty_db(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": 1}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_put_fleeting_note_by_id_authenticated_not_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.normal_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": "New content"},
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(bytes_to_json(response.content)["content"], "New content")
        self.assertNotEqual(
            bytes_to_json(response.content)["last_edited"],
            note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(bytes_to_json(response.content)["id"], note.pk)

        updated_note = FleetingNote.objects.get(pk=note.pk)

        self.assertEqual(updated_note.content, "New content")
        self.assertNotEqual(updated_note.last_edited, note.last_edited)
        self.assertEqual(updated_note.user, self.normal_user)

        self.assertEqual(
            bytes_to_json(response.content)["last_edited"],
            updated_note.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )

    def test_put_fleeting_note_by_id_authenticated_not_admin_not_own_note(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": "New content"},
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_put_fleeting_note_by_id_authenticated_admin_not_own_note(self):
        note = FleetingNote.objects.create(content="Note1", user=self.normal_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_put_fleeting_note_by_id_invalid_content(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": ""},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 400)

    def test_put_fleeting_note_by_id_invalid_content_and_not_own_note(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": ""},
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 400)

    def test_put_fleeting_note_by_id_invalid_content_and_note_does_not_exist(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": 1}),
            {"content": ""},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 400)


class DeleteFleetingNotesByIdTest(FleetingNotesTestCase):

    def test_delete_not_authenticated(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": 1})
        )

        self.assertEqual(response.status_code, 401)

    def test_delete_fleeting_note_by_id_authenticated_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        self.assertEqual(FleetingNote.objects.count(), 1)

        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(FleetingNote.objects.count(), 0)

    def test_delete_fleeting_note_by_id_authenticated_admin_empty_db(self):
        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": 1}), **self.headers_admin
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_fleeting_note_by_id_authenticated_not_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_fleeting_note_by_id_authenticated_not_admin_not_own_note(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_fleeting_note_by_id_authenticated_admin_not_own_note(self):
        note = FleetingNote.objects.create(content="Note1", user=self.normal_user)

        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)
