from django.urls import reverse
from django.test import TestCase
from user.models import CradleUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.parsers import JSONParser
from ..models import Note
import io


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class CreateNoteTest(TestCase):

    def setUp(self):
        self.user = CradleUser.objects.create_user(username="user", password="user")
        self.user_token = str(AccessToken.for_user(self.user))
        self.headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user_token}"}

        self.note_content = "Lorem ipsum dolor sit amet."

    def test_create_note_successfully(self):
        response = self.client.post(
            reverse("note_list"), {"content": self.note_content}, **self.headers
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["content"], self.note_content)
        self.assertEqual(Note.objects.first().content, self.note_content)
        self.assertIsNotNone(response.json()["timestamp"])

    def test_create_note_no_content(self):
        response = self.client.post(reverse("note_list"), {}, **self.headers)

        self.assertEqual(response.status_code, 400)

    def test_create_note_not_authenticated(self):
        response = self.client.post(
            reverse("note_list"), {"content": self.note_content}
        )

        self.assertEqual(response.status_code, 401)
