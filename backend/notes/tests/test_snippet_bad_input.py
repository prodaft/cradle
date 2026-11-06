from django.urls import reverse
from rest_framework.test import APIClient

from user.models import CradleUser
from user.testing import session_access_token

from .utils import NotesTestCase


class SnippetRoutesTest(NotesTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.headers = {"HTTP_COOKIE": f"access_token={session_access_token(self.user)}"}

    def test_other_users_snippets_are_not_found(self):
        other = CradleUser.objects.create_user(username="other", password="pw", email="o@b.c")
        url = reverse("user_snippets", kwargs={"user_id": other.id})

        self.assertEqual(self.client.get(url, **self.headers).status_code, 404)
        self.assertEqual(
            self.client.post(url, {"name": "s", "content": "c"}, format="json", **self.headers).status_code, 404
        )

    def test_own_snippets_via_me(self):
        response = self.client.post(
            reverse("user_snippets_me"), {"name": "s", "content": "c"}, format="json", **self.headers
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(len(self.client.get(reverse("user_snippets_me"), **self.headers).json()), 1)

    def test_only_admins_create_system_snippets(self):
        url = reverse("snippets_system")
        self.assertEqual(self.client.get(url, **self.headers).status_code, 200)
        self.assertEqual(
            self.client.post(url, {"name": "s", "content": "c"}, format="json", **self.headers).status_code, 404
        )
