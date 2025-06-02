from notes.models import Note
from django.urls import reverse
from rest_framework.parsers import JSONParser
import io
from .utils import FleetingNotesTestCase


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetFleetingNotesTest(FleetingNotesTestCase):
    def test_delete_user_cascades_fleeting_notes(self):
        self.assertEqual(Note.objects.fleeting().count(), 2)
        self.normal_user.delete()
        self.assertEqual(Note.objects.fleeting().count(), 1)
        self.assertIsNone(Note.objects.fleeting().filter(id=self.note_user.id).first())

    def test_get_not_authenticated(self):
        response = self.client.get(reverse("fleeting_notes_list"))

        self.assertEqual(response.status_code, 401)

    def test_get_only_owned_fleeting_notes_authenticated_admin(self):
        response = self.client.get(reverse("fleeting_notes_list"), **self.headers_admin)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content)[0]["content"], "Note1")
        self.assertEqual(
            bytes_to_json(response.content)[0]["last_edited"],
            self.note_admin.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(len(bytes_to_json(response.content)), 1)

    def test_get_only_owned_fleeting_notes_authenticated_not_admin(self):
        response = self.client.get(
            reverse("fleeting_notes_list"), **self.headers_normal
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            bytes_to_json(response.content)[0]["content"],
            "[[actor:actor]] [[case:entity]]",
        )
        self.assertEqual(
            bytes_to_json(response.content)[0]["last_edited"],
            self.note_user.last_edited.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        )
        self.assertEqual(len(bytes_to_json(response.content)), 1)

    def test_get_fleeting_notes_not_authenticated(self):
        response = self.client.get(reverse("fleeting_notes_list"))

        self.assertEqual(response.status_code, 401)


class PostFleetingNotesTest(FleetingNotesTestCase):
    def test_post_not_authenticated(self):
        response_post = self.client.post(
            reverse("fleeting_notes_list"), {"content": "Note1"}
        )

        self.assertEqual(response_post.status_code, 401)

    def test_create_fleeting_note_admin(self):
        note_json = {"content": "RequestNote1"}

        response_post = self.client.post(
            reverse("fleeting_notes_list"), note_json, **self.headers_admin
        )

        self.assertEqual(response_post.status_code, 200)

        self.assertEqual(
            note_json["content"], bytes_to_json(response_post.content)["content"]
        )
        self.assertIsNotNone(bytes_to_json(response_post.content)["id"])
        self.assertIsNotNone(bytes_to_json(response_post.content)["last_edited"])

        saved_note = Note.objects.fleeting().get(
            id=bytes_to_json(response_post.content)["id"]
        )
        self.assertEqual(note_json["content"], saved_note.content)
        self.assertEqual(self.admin_user, saved_note.user)
        self.assertIsNotNone(saved_note.last_edited)

    def test_create_fleeting_note_no_content_admin(self):
        note_json = {}

        prev_notes_count = Note.objects.fleeting().count()

        response_post = self.client.post(
            reverse("fleeting_notes_list"), note_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 400)

        self.assertEqual(Note.objects.fleeting().count(), prev_notes_count)

    def test_create_fleeting_note_empty_content_admin(self):
        response_post = self.client.post(
            reverse("fleeting_notes_list"), {"content": ""}, **self.headers_admin
        )

        self.assertEqual(response_post.status_code, 400)

    def test_create_fleeting_note_not_authenticated(self):
        note_json = {"content": "Note1"}

        prev_notes_count = Note.objects.fleeting().count()

        response_post = self.client.post(reverse("fleeting_notes_list"), note_json)
        self.assertEqual(response_post.status_code, 401)

        self.assertEqual(Note.objects.fleeting().count(), prev_notes_count)

    def test_create_fleeting_note_not_admin(self):
        note_json = {"content": "RequestNote1"}

        response_post = self.client.post(
            reverse("fleeting_notes_list"), note_json, **self.headers_normal
        )

        self.assertEqual(response_post.status_code, 200)

        self.assertEqual(
            note_json["content"], bytes_to_json(response_post.content)["content"]
        )
        self.assertIsNotNone(bytes_to_json(response_post.content)["id"])
        self.assertIsNotNone(bytes_to_json(response_post.content)["last_edited"])

        saved_note = Note.objects.fleeting().get(
            id=bytes_to_json(response_post.content)["id"]
        )
        self.assertEqual(note_json["content"], saved_note.content)
        self.assertEqual(self.normal_user, saved_note.user)
        self.assertIsNotNone(saved_note.last_edited)
