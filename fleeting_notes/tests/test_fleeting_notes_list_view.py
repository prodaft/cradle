from django.test import TestCase

from fleeting_notes.models import FleetingNote
from fleeting_notes.serializers import FleetingNoteRetrieveSerializer
from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetFleetingNotesTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = CradleUser.objects.create_user(
            username="admin", password="password", is_staff=True
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def tearDown(self):
        # Clean up created objects
        FleetingNote.objects.all().delete()
        CradleUser.objects.all().delete()

    def test_get_fleeting_notes_authenticated_admin(self):
        FleetingNote.objects.create(content="Note1", user=self.admin_user)
        FleetingNote.objects.create(content="Note2", user=self.normal_user)
        notes = FleetingNote.objects.filter(user=self.admin_user)

        expected = FleetingNoteRetrieveSerializer(notes, many=True).data

        response = self.client.get(reverse("fleeting_notes_list"), **self.headers_admin)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, bytes_to_json(response.content))
        self.assertEqual(len(expected), 1)
        self.assertEqual(expected[0]["content"], "Note1")

    def test_get_fleeting_notes_authenticated_admin_empty_db(self):
        response = self.client.get(
            reverse("fleeting_notes_list"), **self.headers_normal
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content), [])

    def test_get_fleeting_notes_authenticated_not_admin(self):
        FleetingNote.objects.create(content="Note1", user=self.admin_user)
        FleetingNote.objects.create(content="Note2", user=self.normal_user)
        notes = FleetingNote.objects.filter(user=self.normal_user)

        expected = FleetingNoteRetrieveSerializer(notes, many=True).data

        response = self.client.get(
            reverse("fleeting_notes_list"), **self.headers_normal
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, bytes_to_json(response.content))
        self.assertEqual(len(expected), 1)
        self.assertEqual(expected[0]["content"], "Note2")

    def test_get_fleeting_notes_authenticated_not_admin_empty_db(self):
        response = self.client.get(
            reverse("fleeting_notes_list"), **self.headers_normal
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content), [])

    def test_get_fleeting_notes_not_authenticated(self):
        response = self.client.get(reverse("fleeting_notes_list"))

        self.assertEqual(response.status_code, 401)


class PostFleetingNotesTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = CradleUser.objects.create_user(
            username="admin", password="password", is_staff=True
        )
        self.normal_user = CradleUser.objects.create_user(
            username="user", password="password", is_staff=False
        )
        self.token_admin = str(AccessToken.for_user(self.admin_user))
        self.token_normal = str(AccessToken.for_user(self.normal_user))
        self.headers_admin = {"HTTP_AUTHORIZATION": f"Bearer {self.token_admin}"}
        self.headers_normal = {"HTTP_AUTHORIZATION": f"Bearer {self.token_normal}"}

    def tearDown(self):
        # Clean up created objects
        FleetingNote.objects.all().delete()
        CradleUser.objects.all().delete()

    def test_create_fleeting_note_admin(self):
        note_json = {"content": "Note1"}

        response_post = self.client.post(
            reverse("fleeting_notes_list"), note_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 200)
        self.assertEqual(note_json, bytes_to_json(response_post.content))

        self.assertEqual(FleetingNote.objects.count(), 1)
        self.assertEqual(FleetingNote.objects.get().content, "Note1")

    def test_create_fleeting_note_no_content_admin(self):
        note_json = {}
        expected_json = {"content": ["This field is required."]}

        response_post = self.client.post(
            reverse("fleeting_notes_list"), note_json, **self.headers_admin
        )
        self.assertEqual(response_post.status_code, 400)
        self.assertEqual(expected_json, bytes_to_json(response_post.content))

        self.assertEqual(FleetingNote.objects.count(), 0)

    def test_create_fleeting_note_not_authenticated(self):
        note_json = {"content": "Note1"}

        response_post = self.client.post(reverse("fleeting_notes_list"), note_json)
        self.assertEqual(response_post.status_code, 401)

        self.assertEqual(FleetingNote.objects.count(), 0)

    def test_create_fleeting_note_not_admin(self):
        note_json = {"content": "Note1"}

        response_post = self.client.post(
            reverse("fleeting_notes_list"), note_json, **self.headers_normal
        )
        self.assertEqual(response_post.status_code, 200)
        self.assertEqual(note_json, bytes_to_json(response_post.content))
