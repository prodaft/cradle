from django.test import TestCase

from fleeting_notes.models import FleetingNote
from user.models import CradleUser
from django.urls import reverse
from rest_framework.parsers import JSONParser
from rest_framework.test import APIClient
import io
from rest_framework_simplejwt.tokens import AccessToken


def bytes_to_json(data):
    return JSONParser().parse(io.BytesIO(data))


class GetFleetingNoteByIdTest(TestCase):
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

    def test_get_fleeting_note_by_id_authenticated_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)
        FleetingNote.objects.create(content="Note2", user=self.normal_user)

        response = self.client.get(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content)["content"], "Note1")

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


class PutFleetingNotesByIdTest(TestCase):
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

    def test_put_fleeting_note_by_id_authenticated_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(bytes_to_json(response.content)["content"], "New content")

    def test_put_fleeting_note_by_id_authenticated_admin_empty_db(self):
        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": 1}),
            {"content": "New content"},
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 404)

    def test_put_fleeting_note_by_id_authenticated_not_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.put(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            {"content": "New content"},
            **self.headers_normal,
        )

        self.assertEqual(response.status_code, 404)

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


class DeleteFleetingNotesByIdTest(TestCase):
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

    def test_delete_fleeting_note_by_id_authenticated_admin(self):
        note = FleetingNote.objects.create(content="Note1", user=self.admin_user)

        response = self.client.delete(
            reverse("fleeting_notes_detail", kwargs={"pk": note.pk}),
            **self.headers_admin,
        )

        self.assertEqual(response.status_code, 200)

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
