from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

from ..models import Note
from .utils import NotesTestCase


class CreateFleetingNoteTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.user.default_note_template = "Default note template"
        self.user.save(update_fields=["default_note_template"])
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}

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
        self.assertEqual(response.status_code, 200)
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
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["content"], note_content)
        self.assertTrue(response.json()["fleeting"])
        self.assertEqual(saved_note.content, note_content)
